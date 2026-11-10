// A circle (SPEC §7, the agreed option B, round 5): counted on the device from the 50 km squares it touches. A circle has no
// traffic figure of its own, so its big figure is a count; beside it, its council area's rate. Wording is John's where he gave
// it; the rest, draft.
import { ViewHead } from './ViewHead.tsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lines, useWidth, YearBars, type Series } from './charts.tsx';
import { ShareButton } from './ShareButton.tsx';
import { When, Who, whoSentence } from './CouncilView.tsx';
import { getPlaces } from './PlaceBox.tsx';
import { count, RADII, squaresFor, stretchesIn, type CircleCount, type Radius } from '../lib/circle.ts';
import { loadAreas, loadOld, loadSquare, type AreasFile, type PageIndex, type SquareFile, type Stretch } from '../lib/data.ts';
import { SquaresMap, type MapInput } from './SquaresMap.tsx';
import { toBritishGrid } from '../lib/grid.ts';
import { useTapAway } from '../lib/tapAway.ts';
import { hashOf, locate, type Located, type Target } from '../lib/where.ts';
import { cap1, compareText, fall, fmt, perMiles, word } from '../lib/words.ts';

type CircleTarget = Extract<Target, { kind: 'circle' }>;
type Result = { c: CircleCount; s: (Stretch & { insideKm: number })[]; long: boolean; files: SquareFile[]; e: number; n: number };
const RADIUS_WORDS: Record<Radius, string> = { half: 'half a mile', one: 'a mile', two: 'two miles' };
const RADIUS_BUTTONS: [Radius, string][] = [['half', 'Half a mile'], ['one', 'One mile'], ['two', 'Two miles']];
const lower1 = (t: string) => t[0].toLowerCase() + t.slice(1);

export function CircleView({ index, target, onChange }: { index: PageIndex; target: CircleTarget; onChange: () => void }) {
  const [where, setWhere] = useState<Located | null | 'none'>(null);
  const [areas, setAreas] = useState<AreasFile | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [long, setLong] = useState(false);
  const [problem, setProblem] = useState('');
  const r = RADII[target.radius];
  useEffect(() => {
    let live = true;
    locate(target.where, index, getPlaces).then(
      (w) => live && setWhere(w ?? 'none'),
      () => live && setProblem('Sorry, the postcodes couldn’t be loaded. Check your connection and try again.'),
    );
    loadAreas().then((a) => live && setAreas(a), () => live && setProblem('Sorry, the figures couldn’t be loaded. Check your connection and try again.'));
    return () => {
      live = false;
    };
  }, [index, target.where]);
  useEffect(() => {
    if (!where || where === 'none') return;
    let live = true;
    const { easting: e, northing: n } = toBritishGrid(where.lat, where.lon);
    const names = squaresFor(e, n, r, index.squareSize, new Set(index.squares));
    Promise.all([Promise.all(names.map(loadSquare)), long ? Promise.all(names.map(loadOld)) : Promise.resolve([])]).then(
      ([files, olds]) => live && setResult({ c: count(e, n, r, files, index.five[0], olds), s: stretchesIn(e, n, r, files), long, files, e, n }),
      () => live && setProblem('Sorry, the collisions couldn’t be loaded. Check your connection and try again.'),
    );
    return () => {
      live = false;
    };
  }, [where, r, long, index]);

  if (problem) return <p className="problem" role="alert">{problem}</p>;
  if (where === 'none') return <p className="problem" role="alert">We can’t find that place. Try a postcode.</p>;
  if (!where || !areas || !result || result.long !== long) return <p className="muted">Counting…</p>;
  return <Circle index={index} target={target} where={where} areas={areas} result={result} onLong={setLong} onChange={onChange} />;
}

function Circle({ index, target, where, areas, result, onLong, onChange }: { index: PageIndex; target: CircleTarget; where: Located; areas: AreasFile; result: Result; onLong: (long: boolean) => void; onChange: () => void }) {
  const c = result.c, gb = areas.gb, five = index.five;
  const middle = !(target.where.kind === 'postcode' && target.where.inward && !where.note);
  const within = `Within ${RADIUS_WORDS[target.radius]} of ${middle ? 'the middle of ' : ''}${where.label}`;
  const yearsText = `${five[0]} to ${five[five.length - 1]} inclusive`;
  const prev = [1, 2, 3, 4, 5].reduce((s, i) => s + (c.years[five[0] - i] ?? 0), 0);
  const council = where.council ? areas.councils[where.council] : null;
  const crate = council && council.five.am >= 10 ? council.five.rate : null;
  const [full, fw] = useWidth<HTMLDivElement>();
  const [half, hw] = useWidth<HTMLDivElement>();
  const sub = `${within}, ${yearsText}`;
  const mapInput = useMemo<MapInput>(() => ({ kind: 'circle', e: result.e, n: result.n, r: RADII[target.radius], files: result.files, where: lower1(within), years: yearsText }), [result, target.radius, within, yearsText]);
  const short = target.where.kind === 'postcode' ? (target.where.inward ? `${target.where.outcode} ${target.where.inward}` : target.where.outcode) : where.label.split(',')[0];

  const chips = (
    <span className="chips" role="group" aria-label="Size of the circle">
      {RADIUS_BUTTONS.map(([k, t]) => (
        <a key={k} className="chip" href={`#${hashOf({ ...target, radius: k })}`} aria-current={k === target.radius ? 'true' : undefined}>
          {t}
        </a>
      ))}
    </span>
  );

  return (
    <>
      <ViewHead
        kicker={`Injury collisions, ${yearsText}`}
        sub="In a circle around"
        title={where.label}
        note={where.note}
        onChange={onChange}
        bar={short}
        barMore={{ label: RADIUS_BUTTONS.find(([k]) => k === target.radius)![1], options: chips }}
      >
        <div className="radius-row" data-noprint>
          {chips}
          {council && <a href={`#council/${where.council}`}>See all of {council.name}</a>}
        </div>
      </ViewHead>
      <div className="card" ref={full}>
        <div className="b-hero">
          <div>
            <p className="big-lead">{within}</p>
            <p className="big">
              {c.n === 0 ? 'No injury collisions' : `${fmt(c.n)} injury collision${c.n === 1 ? '' : 's'}`}
            </p>
            <p className="muted">from {yearsText}</p>
            {c.n > 0 && (
              <p className="hero-people">
                <b>
                  {fmt(c.hurt)} {c.hurt === 1 ? 'person' : 'people'} hurt{c.killed ? `, ${word(c.killed)} of them fatally` : ''}
                </b>
              </p>
            )}
            <p className="hero-text">{prev === 0 && c.n === 0 ? 'There were none in the previous five years either.' : `This compares to ${prev === 0 ? 'none' : fmt(prev)} in the previous five years.`}</p>
          </div>
          {council && (
            <div className="pair">
              <div>
                <b>{council.name} as a whole</b>
                <br />
                {crate ? (
                  <>
                    one injury collision for every {perMiles(crate)} driven on its {council.five.kinds.motorway.mvm > 0 ? 'A-roads and motorways' : 'A-roads'},{' '}
                    {lower1(compareText(crate / gb.five.rate!, 'the Great Britain rate'))}
                  </>
                ) : (
                  'too few collisions on its main roads to give a fair rate'
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {c.n > 0 && (
        <div className="stack">
          <Trend c={c} gb={areas} w={fw} within={within} short={short} long={result.long} first={index.first} latest={index.latest} onLong={onLong} />
          <div className="grid2">
            <div className="card" ref={half}>
              <h3>Who was hurt</h3>
              <p>{whoSentence(c.who, c.hurt, gb)}</p>
              <Who who={c.who} hurt={c.hurt} gb={gb} w={hw} name={short} sub={sub} />
            </div>
            <div className="card">
              <When hours={c.hours} days={c.days} w={hw} sub={sub} />
            </div>
          </div>
          <div className="card">
            <SquaresMap input={mapInput} />
          </div>
          <div className="card">
            <Roads c={c} s={result.s} gb={areas.gb} radius={target.radius} narrow={fw > 0 && fw < 560} />
          </div>
        </div>
      )}
    </>
  );
}

function Trend({ c, gb, w, within, short, long, first, latest, onLong }: {
  c: CircleCount; gb: AreasFile; w: number; within: string; short: string; long: boolean; first: number; latest: number; onLong: (long: boolean) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const clear = useCallback(() => setSel(null), []);
  useTapAway(sel !== null, box, clear);
  const from = long ? first : 2000;
  const years: number[] = [];
  for (let y = from; y <= latest; y++) years.push(y);
  const n = (y: number) => c.years[y] ?? 0;
  const g = (y: number) => gb.gb.trend[y]?.[0] ?? 0;
  // An index needs a fair starting point: at least 10 collisions in the first year, like every rate (SPEC §13, question 1).
  const indexed = n(from) >= 10;
  const shown = sel ?? latest;
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const down = (a: number, b: number) => (b <= a ? `down by ${fall(a, b)}%` : `up by ${-fall(a, b)}%`);
  const fell = (a: number, b: number) => (b <= a ? `fell by ${fall(a, b)}%` : `rose by ${-fall(a, b)}%`);
  const ser: Series[] = indexed
    ? [
        { pts: years.map((y) => [y, (100 * g(y)) / g(from)] as [number, number]), cls: 'gb', dash: true, end: 'GB' },
        { pts: years.map((y) => [y, (100 * n(y)) / n(from)] as [number, number]), cls: 'me', end: short.length > 10 ? 'Here' : short },
      ]
    : [];
  const max = Math.max(120, ...ser.flatMap((s) => s.pts.map((p) => p[1] * 1.05)));
  const label = `Injury collisions a year ${within.toLowerCase()}`;
  return (
    <div className="card" ref={box}>
      <h3>Better or worse than before?</h3>
      <p>
        There {n(from) === 1 ? 'was' : 'were'} {n(from) === 0 ? 'no' : word(n(from))} collision{n(from) === 1 ? '' : 's'} here in {from} and {n(latest) === 0 ? 'none' : word(n(latest))} in {latest}
        {n(from) > 0 ? `, ${down(n(from), n(latest))}` : ''}. Across Great Britain they {fell(g(from), g(latest))}.{indexed ? ` Both lines start at 100 in ${from}.` : ''}
      </p>
      <div className="trend-chart">
        {w > 0 &&
          (indexed ? (
            <Lines series={ser} w={w} max={max} label={label} selected={sel} onSelect={setSel} svgRef={svg} />
          ) : (
            <YearBars years={years.map((y) => [y, n(y)])} w={w} label={label} selected={sel ?? latest} onSelect={setSel} svgRef={svg} />
          ))}
      </div>
      {indexed ? (
        <div className="legend">
          <span>
            <i className="l k-me" />
            {cap1(within.replace(/^Within /, ''))}
          </span>
          <span>
            <i className="l d k-gb" />
            Great Britain
          </span>
          <span>Collisions in {from} = 100</span>
        </div>
      ) : (
        <p className="note">Too few collisions here in {from} for a fair comparison with Great Britain, so these are the yearly counts.</p>
      )}
      <p className="year-line">
        <b>{shown}:</b> {n(shown) === 0 ? 'no' : word(n(shown))} injury collision{n(shown) === 1 ? '' : 's'} {lower1(within)}
        {shown > first ? `, against ${n(shown - 1) === 0 ? 'none' : word(n(shown - 1))} the year before` : ''}.
      </p>
      <p className="note">
        {touch ? 'Tap' : 'Click'} a year on the chart for its own figures; {touch ? 'tap' : 'click'} anywhere else to clear it.
      </p>
      <ShareButton
        svg={svg}
        title="Better or worse than before?"
        sub={indexed ? `Injury collisions ${lower1(within)} and across Great Britain, ${from} = 100` : `Injury collisions a year ${lower1(within)}`}
        file="roadteller-trend.png"
      />
      {/* Below the share button, and back again once pressed (John, November 10th 2026). */}
      <p className="trend-range" data-noprint>
        <button type="button" className="btn btn-secondary" onClick={() => onLong(!long)}>
          {long ? 'Show from 2000' : `Show from ${first}`}
        </button>
      </p>
    </div>
  );
}

function Roads({ c, s, gb, radius, narrow }: { c: CircleCount; s: (Stretch & { insideKm: number })[]; gb: AreasFile['gb']; radius: Radius; narrow: boolean }) {
  const isM = (road: string) => road.startsWith('M') || road.includes('(M)');
  const kindRate = (road: string) => (isM(road) ? gb.kind_rate.motorway : gb.kind_rate.a);
  const kindName = (road: string) => (isM(road) ? 'Great Britain’s motorways' : 'Great Britain’s A-roads');
  // DfT spells some junction names in capitals ("PINCHINGTON LANE"); road numbers keep theirs.
  const tidy = (t: string) => t.replace(/\b[A-Z][A-Z']{3,}\b/g, (w) => (/\d/.test(w) ? w : w[0] + w.slice(1).toLowerCase()));
  const name = (x: Stretch) => tidy(x.start && x.end ? `${x.start} to ${x.end}` : x.start || x.end || '');
  const [all, setAll] = useState(false);
  const sorted = [...s].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  const rows = all ? sorted : sorted.slice(0, 10);
  const top = rows.find((x) => x.rate);
  const main = c.kinds.a + c.kinds.motorway;
  const circleWords = radius === 'half' ? 'half-mile' : radius === 'two' ? 'two-mile' : 'one-mile';
  return (
    <>
      <h3>Main roads through the circle</h3>
      <p>
        {cap1(word(main))} of the {fmt(c.n)} collisions in the circle were on A-roads{c.kinds.motorway ? ' and motorways' : ''} and {word(c.kinds.minor)} on minor roads.
        {top && (
          <>
            {' '}
            Of the stretches that pass through it, the {top.road} {name(top) ? `from ${name(top)} ` : ''}had the most collisions for its traffic: one for every {perMiles(top.rate!)} driven,{' '}
            {lower1(compareText(top.rate! / kindRate(top.road), `the rate for ${kindName(top.road)}`))}.
          </>
        )}
      </p>
      {rows.length === 0 ? (
        <p className="muted">No A-roads or motorways pass through the circle.</p>
      ) : narrow ? (
        <div className="road-cards">
          {rows.map((r) => (
            <div className="road-card" key={r.cp}>
              <b>{r.road}</b> {name(r)}
              <dl>
                <dt>One for every</dt>
                <dd>{r.rate ? perMiles(r.rate) : 'Too few to say'}</dd>
                {r.rate && (
                  <>
                    <dt>Against {isM(r.road) ? 'motorways' : 'A-roads'}</dt>
                    <dd>{compareText(r.rate / kindRate(r.road), `${kindName(r.road)}`)}</dd>
                  </>
                )}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Stretch</th>
                <th className="r">One for every</th>
                <th>Against Great Britain’s A-roads or motorways</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cp}>
                  <td>
                    <b>{r.road}</b> {name(r)}
                  </td>
                  <td className="r num">{r.rate ? perMiles(r.rate) : <span className="muted">Too few to say</span>}</td>
                  <td>{r.rate ? compareText(r.rate / kindRate(r.road), kindName(r.road)) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sorted.length > 10 && !all && (
        <p data-noprint>
          <button type="button" className="btn btn-secondary" onClick={() => setAll(true)}>
            Show all {fmt(sorted.length)} stretches
          </button>
        </p>
      )}
      <p className="note">
        Traffic is counted between junctions, so some collisions are included which are outside the {circleWords} circle. Collisions at a junction between two stretches count half to each.
      </p>
    </>
  );
}
