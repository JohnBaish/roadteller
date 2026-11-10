// A council area (SPEC §6, the agreed option B, round 5). Its rate covers A-roads and motorways only (DfT's minor-road traffic
// is only estimated); the counts (people hurt, who, when) cover all roads. Wording is John's where he gave it; the rest, draft.
import { ViewHead } from './ViewHead.tsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bars, DayBars, HourBars, Lines, PairBars, useWidth, type Series } from './charts.tsx';
import { ShareButton } from './ShareButton.tsx';
import { SquaresMap, type MapInput } from './SquaresMap.tsx';
import { loadAreas, type AreaFigures, type AreasFile } from '../lib/data.ts';
import { useTapAway } from '../lib/tapAway.ts';
import { cap1, compareText, DAY_NAMES, fall, fmt, hourText, pct, perMiles, shareWords, word, USER_WORDS } from '../lib/words.ts';

const USERS = ['car', 'walking', 'cycling', 'motorcycle', 'other'] as const;
const yearsText = (five: number[]) => `${five[0]} to ${five[five.length - 1]} inclusive`;

/** "West Berkshire's A-roads and motorways", or just "A-roads" where there's no motorway */
const roadsOf = (f: AreaFigures) => (f.five.kinds.motorway.mvm > 0 ? 'A-roads and motorways' : 'A-roads');

/** The road user whose share differs most from Great Britain's. */
export function whoSentence(who: Record<string, number>, hurt: number, gb: AreaFigures) {
  const tot = hurt || 1, gtot = gb.five.hurt || 1;
  const share = (k: string) => pct(who[k] ?? 0, tot), g = (k: string) => pct(gb.five.who[k] ?? 0, gtot);
  const best = (['car', 'walking', 'cycling', 'motorcycle'] as const).slice().sort((x, y) => Math.abs(share(y) - g(y)) - Math.abs(share(x) - g(x)))[0];
  return `${share(best)}% of the people hurt were ${USER_WORDS[best]}, against ${g(best)}% across Great Britain.`;
}

export function CouncilView({ code, onChange }: { code: string; onChange: () => void }) {
  const [areas, setAreas] = useState<AreasFile | null>(null);
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    loadAreas().then(setAreas, () => setProblem(true));
  }, []);
  if (problem) return <p className="problem" role="alert">Sorry, the figures couldn’t be loaded. Check your connection and try again.</p>;
  if (!areas) return <p className="muted">Loading…</p>;
  const f = areas.councils[code];
  if (!f) return <p className="problem" role="alert">There’s no council area with that code.</p>;
  return <Council areas={areas} f={f} code={code} onChange={onChange} />;
}

function Council({ areas, f, code, onChange }: { areas: AreasFile; f: AreaFigures; code: string; onChange: () => void }) {
  const gb = areas.gb, region = areas.regions[f.region!];
  const v = f.five, name = f.name!, five = areas.five, latest = five[five.length - 1];
  const sub = `${name}, ${yearsText(five)}`;
  const mapInput = useMemo<MapInput>(() => ({ kind: 'council', code, where: `in ${name}`, years: yearsText(five) }), [code, name, five]);
  const [full, fw] = useWidth<HTMLDivElement>();
  const [half, hw] = useWidth<HTMLDivElement>();
  const roads = roadsOf(f);
  // A rate only where at least 10 collisions lie behind it (SPEC §13, question 1).
  const rate = v.am >= 10 ? v.rate : null;

  // the big figure
  const hero = (
    <div className="card">
      <div className="b-hero">
        <div>
          {rate ? (
            <>
              <p className="big-lead">
                One injury collision <span className="small">for every</span>
              </p>
              <p className="big">{perMiles(rate)}</p>
              <p className="muted hero-sub">driven on {name}’s {roads}</p>
              <p className="hero-compare">
                <b>{compareText(rate / gb.five.rate!, 'the Great Britain rate for A-roads and motorways')}</b>
              </p>
            </>
          ) : (
            <p className="big-lead">Too few collisions on {name}’s {roads} to give a fair rate</p>
          )}
          <p className="hero-text">
            From {yearsText(five)}, police recorded {fmt(v.all)} collisions in {name} in which someone was hurt. {fmt(v.hurt)} people were injured, {word(v.killed)} of them fatally, and{' '}
            {fmt(v.ksi_recorded)} collisions were serious or fatal. This compares to {fmt(v.prev_all)} in the previous five years.
          </p>
        </div>
        <div className="pair">
          <div>
            <b>Great Britain</b>
            <br />
            one for every {perMiles(gb.five.rate!)}
          </div>
          {region?.five.rate && (
            <div>
              <b>{region.name}</b>
              <br />
              one for every {perMiles(region.five.rate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ViewHead kicker={`Injury collisions, ${yearsText(five)}`} title={name} onChange={onChange} bar={name} />
      {hero}
      <div className="stack">
        <div className="card" ref={full}>
          {rate && <Mix f={f} areas={areas} w={fw} sub={`${roadsOf(f)}, ${yearsText(five)}`} />}
          {!rate && <p className="muted">There were {word(v.am)} collisions on {name}’s {roads} in five years, too few to compare fairly.</p>}
        </div>
        <Trend f={f} gb={gb} w={fw} latest={latest} />
        <div className="grid2">
          <div className="card" ref={half}>
            <h3>Who was hurt</h3>
            <p>{whoSentence(v.who, v.hurt, gb)}</p>
            <Who who={v.who} hurt={v.hurt} gb={gb} w={hw} name={name} sub={sub} />
          </div>
          <div className="card">
            <When hours={v.hours} days={v.days} w={hw} sub={sub} />
          </div>
        </div>
        <div className="card">
          <SquaresMap input={mapInput} />
        </div>
        <div className="card">
          <Roads f={f} gb={gb} narrow={fw > 0 && fw < 560} />
        </div>
      </div>
    </>
  );
}

function Mix({ f, areas, w, sub }: { f: AreaFigures; areas: AreasFile; w: number; sub: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const v = f.five, gb = areas.gb, region = areas.regions[f.region!];
  const kinds = (['motorway', 'a'] as const).filter((k) => v.kinds[k].mvm > 0);
  const rows = [
    { t: f.name!, v: v.ratio ?? 0, cls: 'me' as const, me: true },
    ...(region?.five.ratio ? [{ t: region.name!, v: region.five.ratio, cls: 'reg' as const }] : []),
    { t: 'Great Britain', v: 1, cls: 'gb' as const },
  ];
  const max = Math.max(1.5, ...rows.map((r) => r.v * 1.1));
  return (
    <>
      <h3>Allowing for the mix of roads</h3>
      <p>
        Taking the mix of roads for {f.name}’s {roadsOf(f)}, and applying the national average for those kinds of roads to {f.name}’s own traffic, would give {fmt(v.expected)} injury collisions in five
        years. There were {fmt(v.am)}:{' '}
        <b>
          {shareWords(v.ratio!)} ({pct(v.am, v.expected)}%)
        </b>
        .
      </p>
      {w > 0 && <Bars rows={rows} w={w - 0} max={max} unit={(x) => `${Math.round(x * 100)}%`} label="Collisions against what national averages would give" svgRef={svg} />}
      <ShareButton svg={svg} title="Allowing for the mix of roads" sub={`Injury collisions against what national averages would give, ${sub}`} file="roadteller-mix.png" />
      <p className="note">100% means exactly as many as national averages would give for that mix of roads.</p>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Kind of road</th>
              <th className="r">Share of traffic</th>
              <th className="r">Collisions</th>
              <th className="r">At Great Britain’s rate</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
              <tr key={k}>
                <td>{k === 'motorway' ? 'Motorways' : 'A-roads'}</td>
                <td className="r num">{pct(v.kinds[k].mvm, v.am_mvm)}%</td>
                <td className="r num">{fmt(v.kinds[k].n)}</td>
                <td className="r num">{fmt((v.kinds[k].mvm / 100) * gb.kind_rate[k])}</td>
              </tr>
            ))}
            <tr>
              <td>
                <b>{cap1(roadsOf(f))}</b>
              </td>
              <td className="r num">100%</td>
              <td className="r num">
                <b>{fmt(v.am)}</b>
              </td>
              <td className="r num">
                <b>{fmt(v.expected)}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">Minor roads are left out: their traffic is only estimated.</p>
    </>
  );
}

function Trend({ f, gb, w, latest }: { f: AreaFigures; gb: AreaFigures; w: number; latest: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const clear = useCallback(() => setSel(null), []);
  useTapAway(sel !== null, box, clear);
  const rate = (a: AreaFigures, y: number) => {
    const r = a.trend[y];
    return r && r[2] > 0 ? (100 * r[1]) / r[2] : null;
  };
  const years = Object.keys(f.trend).map(Number).filter((y) => y >= 2000 && rate(f, y) !== null && rate(gb, y) !== null);
  // Year-by-year rates need at least 10 collisions in every year, like every other rate.
  const fewest = Math.min(...Object.entries(f.trend).filter(([y]) => +y >= 2000).map(([, r]) => r[1]));
  if (years.length < 2 || fewest < 10)
    return (
      <div className="card">
        <h3>Better or worse than before?</h3>
        <p className="muted">Too few collisions on {f.name}’s A-roads in some years to compare fairly year by year.</p>
      </div>
    );
  const pts = years.map((y) => [y, rate(f, y)!] as [number, number]);
  const gbp = years.map((y) => [y, rate(gb, y)!] as [number, number]);
  const idx = (p: [number, number][]) => p.map(([y, v]) => [y, (100 * v) / p[0][1]] as [number, number]);
  const ser: Series[] = [
    { pts: idx(gbp), cls: 'gb', dash: true, end: 'GB' },
    { pts: idx(pts), cls: 'me', end: f.name!.length > 12 ? 'Here' : f.name! },
  ];
  const max = Math.max(120, ...ser.flatMap((s) => s.pts.map((p) => p[1] * 1.05)));
  const shown = sel ?? latest;
  const row = f.trend[shown], g = gb.trend[shown];
  const fallBy = (a: number, b: number) => (b <= a ? `fallen by ${fall(a, b)}%` : `risen by ${-fall(a, b)}%`);
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return (
    <div className="card">
      <h3>Better or worse than before?</h3>
      <p>
        Since {years[0]}, collisions per mile driven on A-roads and motorways have {fallBy(pts[0][1], pts[pts.length - 1][1])} in {f.name} and{' '}
        {(pts[pts.length - 1][1] <= pts[0][1]) === (gbp[gbp.length - 1][1] <= gbp[0][1]) ? fallBy(gbp[0][1], gbp[gbp.length - 1][1]).replace(/^\S+ /, '') : fallBy(gbp[0][1], gbp[gbp.length - 1][1])} across Great
        Britain. Both lines start at 100 in {years[0]}.
      </p>
      <div className="trend-chart" ref={box}>{w > 0 && <Lines series={ser} w={w} max={max} label="Collisions per mile driven since 2000" selected={sel} onSelect={setSel} svgRef={svg} />}</div>
      <div className="legend">
        <span>
          <i className="l k-me" />
          {f.name}
        </span>
        <span>
          <i className="l d k-gb" />
          Great Britain
        </span>
        <span>Rate in {years[0]} = 100</span>
      </div>
      {/* The year's figures and the share button on one row on a computer (John, November 10th 2026). */}
      <div className="year-row">
        <p className="year-line">
          <b>{shown}:</b> {fmt(row[1])} injury collisions on A-roads and motorways
          {row[2] > 0 && row[1] > 0 ? `, one for every ${perMiles((100 * row[1]) / row[2])} driven` : ''} (Great Britain: one for every {perMiles((100 * g[1]) / g[2])}).
        </p>
        <ShareButton svg={svg} title="Better or worse than before?" sub={`Injury collisions per mile driven on A-roads and motorways, ${f.name} and Great Britain, ${years[0]} = 100`} file="roadteller-trend.png" />
      </div>
      <p className="note">
        {touch ? 'Tap' : 'Click'} a year on the chart for its own figures; {touch ? 'tap' : 'click'} anywhere else to clear it.
      </p>
    </div>
  );
}

export function Who({ who, hurt, gb, w, name, sub }: { who: Record<string, number>; hurt: number; gb: AreaFigures; w: number; name: string; sub: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const tot = hurt || 1, gtot = gb.five.hurt || 1;
  const rows = USERS.map((k) => ({ t: k === 'other' ? 'Others' : `People ${USER_WORDS[k]}`, a: pct(who[k] ?? 0, tot), b: pct(gb.five.who[k] ?? 0, gtot) }));
  return (
    <>
      {w > 0 && <PairBars rows={rows} w={w} meName={name.length > 22 ? 'Here' : name} label="People hurt by road user, against Great Britain" svgRef={svg} />}
      <ShareButton svg={svg} title="Who was hurt" sub={sub} file="roadteller-who.png" />
    </>
  );
}

export function When({ hours, days, w, sub }: { hours: number[]; days: number[]; w: number; sub: string }) {
  const hs = useRef<SVGSVGElement>(null), ds = useRef<SVGSVGElement>(null);
  const bh = hours.indexOf(Math.max(...hours));
  const most = days.indexOf(Math.max(...days)), least = days.indexOf(Math.min(...days));
  return (
    <>
      <h3>When</h3>
      <p>
        The busiest hour was {hourText(bh)}, with {word(hours[bh])} collision{hours[bh] === 1 ? '' : 's'} in five years.
      </p>
      {w > 0 && <HourBars hours={hours} w={w} label="Collisions by hour of the day" svgRef={hs} />}
      <p className="when-days">
        {days[most] === days[least] ? 'Collisions were spread evenly over the days of the week.' : <>{DAY_NAMES[most]}s had the most collisions ({word(days[most])}) and {DAY_NAMES[least]}s the fewest ({days[least] === 0 ? 'none' : word(days[least])}).</>}
      </p>
      {w > 0 && <DayBars days={days} w={w} label="Collisions by day of the week" svgRef={ds} />}
      {/* One button for both charts (John, November 10th 2026). */}
      <ShareButton
        svg={[
          { svg: hs, caption: 'By hour of the day' },
          { svg: ds, caption: 'By day of the week' },
        ]}
        title="When injury collisions happened"
        sub={sub}
        file="roadteller-when.png"
      />
    </>
  );
}

function Roads({ f, gb, narrow }: { f: AreaFigures; gb: AreasFile['gb']; narrow: boolean }) {
  const rows = f.roads ?? [];
  const rated = rows.filter((r) => r.rate);
  const gbRate = (road: string) => (road.startsWith('M') || road.includes('(M)') ? gb.kind_rate.motorway : gb.kind_rate.a);
  const most = rated.length ? rated.reduce((a, b) => (b.rate! > a.rate! ? b : a)) : null;
  const fewest = rated.length > 1 ? rated.reduce((a, b) => (b.rate! < a.rate! ? b : a)) : null;
  const one = (rate: number | null) => (rate ? `${perMiles(rate)}` : 'Too few to say');
  return (
    <>
      <h3>Which roads</h3>
      {most && (
        <p>
          Of the main roads, the {most.road} had the most collisions for its traffic.
          {fewest && fewest !== most && ` The ${fewest.road} had the fewest${fewest.road.startsWith('M') ? ', as motorways usually do' : ''}.`}
        </p>
      )}
      {narrow ? (
        <div className="road-cards">
          {rows.map((r) => (
            <div className="road-card" key={r.road}>
              <b>{r.road}</b>
              <dl>
                <dt>Collisions</dt>
                <dd>{fmt(r.n)}</dd>
                <dt>One for every</dt>
                <dd>{one(r.rate)}</dd>
                <dt>Great Britain rate</dt>
                <dd>{perMiles(gbRate(r.road))}</dd>
              </dl>
            </div>
          ))}
          <div className="road-card">
            <b>Minor roads</b>
            <dl>
              <dt>Collisions</dt>
              <dd>{fmt(f.five.minor)}</dd>
              <dt>One for every</dt>
              <dd>Rates not available</dd>
            </dl>
          </div>
        </div>
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Road</th>
                <th className="r">Collisions</th>
                <th className="r">One for every</th>
                <th className="r">Great Britain rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.road}>
                  <td>{r.road}</td>
                  <td className="r num">{fmt(r.n)}</td>
                  <td className="r num">{one(r.rate)}</td>
                  <td className="r num">{perMiles(gbRate(r.road))}</td>
                </tr>
              ))}
              <tr>
                <td>Minor roads</td>
                <td className="r num">{fmt(f.five.minor)}</td>
                <td className="r">Rates not available</td>
                <td className="r">Rates not available</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="note">These are the main roads’ stretches in {f.name}, measured between junctions. Collisions at a junction between two stretches count half to each.</p>
    </>
  );
}
