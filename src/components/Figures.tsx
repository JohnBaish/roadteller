// Stage 2's plain figures (PLAN.md): enough to see that choosing a place finds the right council area and circle, and that
// the counts come out as the build and the mock-ups say. Stages 3 and 4 replace these lists with the agreed design.
import { useEffect, useState } from 'react';
import { getPlaces } from './PlaceBox.tsx';
import { count, RADII, squaresFor, stretchesIn, USERS, type CircleCount, type Radius } from '../lib/circle.ts';
import { loadAreas, loadOld, loadSquare, type AreaFigures, type AreasFile, type PageIndex, type Stretch } from '../lib/data.ts';
import { toBritishGrid } from '../lib/grid.ts';
import { hashOf, locate, type Located, type Target } from '../lib/where.ts';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
const per = (rate: number | null | undefined) => (rate ? `one for every ${(100 / rate).toFixed(1)} million miles` : 'too few to say');
const RADIUS_WORDS: Record<Radius, string> = { half: 'half a mile', one: 'a mile', two: 'two miles' };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Years({ years, from, to }: { years: Record<string | number, number>; from: number; to: number }) {
  const rows = [];
  for (let y = from; y <= to; y++) rows.push(`${y}: ${fmt(years[y] ?? 0)}`);
  return <p className="mono plain-years">{rows.join(' · ')}</p>;
}

export function CircleFigures({ index, target }: { index: PageIndex; target: Extract<Target, { kind: 'circle' }> }) {
  const [where, setWhere] = useState<Located | null | 'none'>(null);
  const [result, setResult] = useState<{ c: CircleCount; s: (Stretch & { insideKm: number })[]; squares: string[]; long: boolean } | null>(null);
  const [long, setLong] = useState(false);
  const [problem, setProblem] = useState('');
  const r = RADII[target.radius];
  useEffect(() => {
    let live = true;
    locate(target.where, index, getPlaces).then(
      (w) => live && setWhere(w ?? 'none'),
      () => live && setProblem('Sorry, the postcodes couldn’t be loaded. Check your connection and try again.'),
    );
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
      ([files, olds]) => live && setResult({ c: count(e, n, r, files, index.five[0], olds), s: stretchesIn(e, n, r, files), squares: names, long }),
      () => live && setProblem('Sorry, the collisions couldn’t be loaded. Check your connection and try again.'),
    );
    return () => {
      live = false;
    };
  }, [where, r, long, index]);

  if (problem) return <p className="problem" role="alert">{problem}</p>;
  if (where === 'none') return <p className="problem" role="alert">We can’t find that place. Try a postcode.</p>;
  if (!where || !result) return <p className="muted">Counting…</p>;
  const c = result.c;
  const prev = [0, 1, 2, 3, 4].reduce((s, i) => s + (c.years[index.five[0] - 5 + i] ?? 0), 0);
  const council = where.council ? index.councils.find(([code]) => code === where.council) : null;
  return (
    <section className="plain">
      <h3>Within {RADIUS_WORDS[target.radius]} of {where.label}</h3>
      {where.note && <p className="notes">{where.note}</p>}
      <p className="radius-btns">
        {(['half', 'one', 'two'] as Radius[]).map((k) => (
          <a key={k} className={`btn ${k === target.radius ? 'btn-primary' : 'btn-secondary'}`} href={`#${hashOf({ ...target, radius: k })}`} aria-current={k === target.radius ? 'true' : undefined}>
            {k === 'half' ? 'Half a mile' : k === 'one' ? 'One mile' : 'Two miles'}
          </a>
        ))}
      </p>
      {council && (
        <p>
          <a href={`#council/${council[0]}`}>See all of {council[1]}</a>
        </p>
      )}
      <dl className="plain-list">
        <dt>Injury collisions, {index.five[0]} to {index.latest} inclusive</dt>
        <dd>{fmt(c.n)}</dd>
        <dt>People hurt</dt>
        <dd>
          {fmt(c.hurt)}, {fmt(c.killed)} of them fatally
        </dd>
        <dt>Killed or seriously injured (collisions: recorded; adjusted)</dt>
        <dd>
          {fmt(c.ksi)}; {c.ksiAdjusted.toFixed(1)}
        </dd>
        <dt>Previous five years ({index.five[0] - 5} to {index.five[0] - 1})</dt>
        <dd>{fmt(prev)}</dd>
        <dt>On motorways, A-roads, minor roads</dt>
        <dd>
          {fmt(c.kinds.motorway)}, {fmt(c.kinds.a)}, {fmt(c.kinds.minor)}
        </dd>
        <dt>People hurt by road user</dt>
        <dd>{USERS.map((u) => `${u} ${fmt(c.who[u])}`).join(', ')}</dd>
        <dt>Busiest hour; days of the week</dt>
        <dd>
          {c.hours.indexOf(Math.max(...c.hours))}:00 ({fmt(Math.max(...c.hours))}); {DAYS.map((d, i) => `${d.slice(0, 3)} ${c.days[i]}`).join(', ')}
        </dd>
      </dl>
      <h4>Collisions a year</h4>
      <Years years={c.years} from={result.long ? index.first : 2000} to={index.latest} />
      {!result.long && (
        <button type="button" className="btn btn-secondary" disabled={long} onClick={() => setLong(true)}>
          Show {index.first} to 1999 too
        </button>
      )}
      <h4>A-road and motorway stretches through the circle</h4>
      {result.s.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <ul className="plain-ul">
          {result.s.map((s) => (
            <li key={s.cp}>
              {s.road}, {s.start ?? '?'} to {s.end ?? '?'}: {s.insideKm.toFixed(1)} of {s.km.toFixed(1)} km inside; {fmt(s.n)} collisions on the whole stretch, {per(s.rate)}
            </li>
          ))}
        </ul>
      )}
      <p className="notes">Squares loaded: {result.squares.join(', ')}.</p>
    </section>
  );
}

function FiveList({ f, gb }: { f: AreaFigures; gb: AreasFile['gb'] }) {
  const v = f.five;
  return (
    <dl className="plain-list">
      <dt>A-roads and motorways</dt>
      <dd>
        {fmt(v.am)} collisions over {fmt(v.am_mvm)} million miles: {per(v.rate)} (Great Britain {per(gb.five.rate)})
      </dd>
      <dt>Allowing for the mix of roads</dt>
      <dd>
        national averages would give {fmt(v.expected)}; there were {fmt(v.am)} ({v.ratio ? Math.round(v.ratio * 100) : '–'}%)
      </dd>
      <dt>All injury collisions; previous five years</dt>
      <dd>
        {fmt(v.all)}; {fmt(v.prev_all)}
      </dd>
      <dt>People hurt</dt>
      <dd>
        {fmt(v.hurt)}, {fmt(v.killed)} of them fatally
      </dd>
      <dt>People hurt by road user</dt>
      <dd>{USERS.map((u) => `${u} ${fmt(v.who[u])}`).join(', ')}</dd>
    </dl>
  );
}

export function CouncilFigures({ index, code }: { index: PageIndex; code: string }) {
  const [areas, setAreas] = useState<AreasFile | null>(null);
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    loadAreas().then(setAreas, () => setProblem(true));
  }, []);
  if (problem) return <p className="problem" role="alert">Sorry, the figures couldn’t be loaded. Check your connection and try again.</p>;
  if (!areas) return <p className="muted">Loading…</p>;
  const f = areas.councils[code];
  if (!f) return <p className="problem" role="alert">There’s no council area with that code.</p>;
  const region = areas.regions[f.region!];
  const trend = Object.fromEntries(Object.entries(f.trend).map(([y, row]) => [y, row[0]]));
  return (
    <section className="plain">
      <h3>{f.name}</h3>
      <p className="muted">
        {index.regions[f.region!]}, {index.five[0]} to {index.latest} inclusive
      </p>
      <FiveList f={f} gb={areas.gb} />
      <h4>Which roads</h4>
      <ul className="plain-ul">
        {(f.roads ?? []).map((r) => (
          <li key={r.road}>
            {r.road}: {fmt(r.n)} collisions, {per(r.rate)}
          </li>
        ))}
        <li>Minor roads: {fmt(f.five.minor)} collisions, rates not available</li>
      </ul>
      <h4>Collisions a year, all roads</h4>
      <Years years={trend} from={index.first} to={index.latest} />
      <h4>{region.name}</h4>
      <FiveList f={region} gb={areas.gb} />
    </section>
  );
}
