// The map of shaded squares (SPEC §8.1; options page https://claude.ai/artifact/6dG7NzpN2bcy8L2GVcd8jp, John's choices of
// November 10th 2026): counts only, for the latest five years. A circle: 250-metre squares, see-through, over every road,
// with the A-roads and motorways in white on top. A council area: one-kilometre squares inside its outline (empty squares
// faint), the motorways, A-roads and B-roads over them, and each square's count written in it where there's room.
// Everything is drawn on the page from Ordnance Survey's open data; a square's count shows when it's pointed at or tapped.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPlaces } from './PlaceBox.tsx';
import { useWidth } from './charts.tsx';
import { loadCouncilMaps, loadIndex, loadRoads, type CouncilMap, type RoadFile, type SquareFile } from '../lib/data.ts';
import { toBritishGrid } from '../lib/grid.ts';
import { useTapAway } from '../lib/tapAway.ts';
import { fmt, Word } from '../lib/words.ts';

type Cell = { x: number; y: number; n: number };
export type MapInput =
  | { kind: 'circle'; e: number; n: number; r: number; files: SquareFile[]; where: string; years: string }
  | { kind: 'council'; code: string; where: string; years: string };

/** Council areas more than this many kilometres across get five-kilometre squares. */
export const BIG_COUNCIL_KM = 100;
const LIGHT = ['#d18b61', '#bb6c40', '#a0532a', '#7c3c1b', '#552610'];
const DARK = ['#9a5532', '#b9693b', '#d6824f', '#eba477', '#fbd2b4'];

/** Shading steps from the place's own busiest square, each about the same factor bigger than the one before (busiest^(1/5));
 * where the busiest square has five or fewer, each count is its own step from the lightest (the floor). */
export function stepsFor(max: number): [number, number][] {
  if (max <= 5) return Array.from({ length: max }, (_, i) => [i + 1, i + 1]);
  const out: [number, number][] = [];
  let lo = 1;
  for (const i of [1, 2, 3, 4]) {
    const e = Math.round(Math.pow(max, i / 5));
    if (e >= lo) {
      out.push([lo, e]);
      lo = e + 1;
    }
  }
  out.push([lo, max]);
  return out;
}
export const stepText = ([lo, hi]: [number, number]) => (lo === hi ? `${lo}` : `${lo} to ${hi}`);

function useDark() {
  const q = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const read = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && !!q?.matches);
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const on = () => setDark(read());
    q?.addEventListener('change', on);
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      q?.removeEventListener('change', on);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return dark;
}

const decode = (l: number[], ox: number, oy: number) => {
  const pts: [number, number][] = [[ox + l[0], oy + l[1]]];
  for (let i = 2; i < l.length; i += 2) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + l[i], y + l[i + 1]]);
  }
  return pts;
};

function inRing([x, y]: [number, number], pts: [number, number][]) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// The squares of the road files (20 km for every road, 50 km for main roads) that a box touches.
const squaresOf = (b: [number, number, number, number], have: Set<string>, size: number) => {
  const out: string[] = [];
  for (let sx = Math.floor(b[0] / size); sx <= Math.floor(b[2] / size); sx++)
    for (let sy = Math.floor(b[1] / size); sy <= Math.floor(b[3] / size); sy++) if (have.has(`${sx}-${sy}`)) out.push(`${sx}-${sy}`);
  return out;
};

type Drawn = {
  size: number; bbox: [number, number, number, number]; cells: Cell[]; total: number; possible: number;
  roads: { k: string; pts: [number, number][]; no?: string }[];
  outline: [number, number][][] | null; circle: { e: number; n: number; r: number } | null;
  places: { name: string; big: boolean; x: number; y: number }[];
};

export function SquaresMap({ input }: { input: MapInput }) {
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const ix = await loadIndex();
      const placesP = getPlaces();
      if (input.kind === 'circle') {
        const { e, n, r } = input;
        const size = 250, pad = 150, r2 = r * r;
        const bbox: [number, number, number, number] = [e - r - pad, n - r - pad, e + r + pad, n + r + pad];
        const counts = new Map<string, number>();
        for (const f of input.files) {
          const ox = f.sq[0] * f.size, oy = f.sq[1] * f.size;
          const [de, nn, yr] = f.recent;
          let ee = 0;
          for (let i = 0; i < (de?.length ?? 0); i++) {
            ee += de[i];
            const x = ox + ee * 10, y = oy + nn[i] * 10;
            if ((x - e) ** 2 + (y - n) ** 2 > r2 || yr[i] < 0) continue;
            const key = `${Math.floor(x / size)},${Math.floor(y / size)}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
        const cells = [...counts].map(([k, c]) => {
          const [i, j] = k.split(',').map(Number);
          return { x: i * size, y: j * size, n: c };
        });
        let possible = 0;
        for (let i = Math.floor((e - r) / size); i <= Math.floor((e + r) / size); i++)
          for (let j = Math.floor((n - r) / size); j <= Math.floor((n + r) / size); j++) {
            const nx = Math.max(i * size, Math.min(e, (i + 1) * size)), ny = Math.max(j * size, Math.min(n, (j + 1) * size));
            if ((nx - e) ** 2 + (ny - n) ** 2 < r2) possible++;
          }
        const groups = await Promise.all(squaresOf(bbox, new Set(ix.roadSquares.local), 20000).map((s) => loadRoads('local', s)));
        const roads = roadsIn(groups.flat(), bbox);
        const places = await placesIn(placesP, bbox, (x, y) => (x - e) ** 2 + (y - n) ** 2 < (r * 0.93) ** 2, false);
        if (live) setDrawn({ size, bbox, cells, total: cells.reduce((s, c) => s + c.n, 0), possible, roads, outline: null, circle: { e, n, r }, places });
      } else {
        const group = ix.councilMapGroup[input.code];
        const m: CouncilMap | undefined = group ? (await loadCouncilMaps(group))[input.code] : undefined;
        if (!m) throw new Error('no map');
        const outline = m.outline.map((l) => decode(l, 0, 0));
        // one-kilometre squares, or five-kilometre squares for the very largest council areas, where one-kilometre
        // squares would be dots (Highland, about 200 km across: 2 pixels wide on a computer)
        const size = Math.max(m.bbox[2] - m.bbox[0], m.bbox[3] - m.bbox[1]) > BIG_COUNCIL_KM * 1000 ? 5000 : 1000;
        const sum = new Map<string, number>();
        for (const [cx, cy, c] of m.cells) {
          const key = `${Math.floor((cx * 1000) / size)},${Math.floor((cy * 1000) / size)}`;
          sum.set(key, (sum.get(key) ?? 0) + c);
        }
        const cells = [...sum].map(([key, c]) => {
          const [i, j] = key.split(',').map(Number);
          return { x: i * size, y: j * size, n: c };
        });
        let possible = 0;
        for (let i = Math.floor(m.bbox[0] / size); i <= Math.floor(m.bbox[2] / size); i++)
          for (let j = Math.floor(m.bbox[1] / size); j <= Math.floor(m.bbox[3] / size); j++)
            if (outline.some((ring) => inRing([i * size + size / 2, j * size + size / 2], ring))) possible++;
        const groups = await Promise.all(squaresOf(m.bbox, new Set(ix.roadSquares.main), 50000).map((s) => loadRoads('main', s)));
        const roads = roadsIn(groups.flat(), m.bbox);
        const places = await placesIn(placesP, m.bbox, (x, y) => outline.some((ring) => inRing([x, y], ring)), true);
        if (live) setDrawn({ size, bbox: m.bbox, cells, total: cells.reduce((s, c) => s + c.n, 0), possible, roads, outline, circle: null, places });
      }
    })().catch(() => live && setProblem(true));
    return () => {
      live = false;
    };
  }, [input]);

  if (problem) return <p className="muted">Sorry, the map couldn’t be loaded. Check your connection and try again.</p>;
  if (!drawn) return <p className="muted">Drawing the map…</p>;
  return <MapDrawing d={drawn} input={input} />;
}

function roadsIn(files: RoadFile[], b: [number, number, number, number]) {
  const out: Drawn['roads'] = [];
  for (const f of files) {
    const ox = f.sq[0] * f.size, oy = f.sq[1] * f.size;
    if (ox > b[2] || oy > b[3] || ox + f.size < b[0] || oy + f.size < b[1]) continue;
    f.l.forEach((l, i) => {
      const pts = decode(l, ox, oy);
      if (pts.every(([x, y]) => x < b[0] || x > b[2] || y < b[1] || y > b[3])) return;
      out.push({ k: f.k[i], pts, no: f.no[i] });
    });
  }
  return out;
}

async function placesIn(p: ReturnType<typeof getPlaces>, b: [number, number, number, number], inside: (x: number, y: number) => boolean, council: boolean) {
  const ix = await p.catch(() => null);
  if (!ix) return [];
  const out: Drawn['places'] = [];
  for (const pl of ix.all) {
    if (council ? pl.kind !== 'c' && pl.kind !== 't' && pl.kind !== 'v' : pl.kind === 'c') continue;
    const { easting: x, northing: y } = toBritishGrid(pl.lat, pl.lon);
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3] || !inside(x, y)) continue;
    out.push({ name: pl.name, big: pl.kind === 'c' || pl.kind === 't', x, y });
  }
  // towns first; among villages, those nearest the busiest parts are as good a guess as any, so keep the list order
  return out.sort((a, c) => Number(c.big) - Number(a.big));
}

function MapDrawing({ d, input }: { d: Drawn; input: MapInput }) {
  const [box, w] = useWidth<HTMLDivElement>();
  const dark = useDark();
  const [on, setOn] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const clear = useCallback(() => setOn(null), []);
  useTapAway(on !== null, wrap, clear);
  const isCircle = input.kind === 'circle';
  const P = dark ? DARK : LIGHT;
  const max = Math.max(0, ...d.cells.map((c) => c.n));
  const steps = stepsFor(max);
  const shade = (n: number) => {
    const i = steps.findIndex(([lo, hi]) => n >= lo && n <= hi);
    return P[i + (max <= 5 ? 0 : 5 - steps.length)];
  };
  const mw = Math.min(isCircle ? 600 : 900, w);
  const [x0, y0, x1, y1] = d.bbox;
  const k = mw / (x1 - x0), h = Math.round((y1 - y0) * k);
  const X = (x: number) => (x - x0) * k, Y = (y: number) => (y1 - y) * k;
  const path = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
  const sz = d.size * k;
  const narrow = w < 560;
  const busiest = useMemo(() => [...d.cells].sort((a, b) => b.n - a.n)[0], [d]);

  const hidden = useMemo(() => new Set<number>(), []);
  const labels = useMemo(() => {
    if (!mw) return [];
    // places first, then road numbers; a label overlapping one already placed, or off the map, is moved above or below, else left out
    const boxes: number[][] = [], out: { t: string; x: number; y: number; cls: string }[] = [];
    const fits = (x0_: number, y0_: number, wd: number, ht: number) => {
      for (const dy of [0, -ht - 2, ht + 4]) {
        const x = Math.max(wd / 2 + 3, Math.min(mw - wd / 2 - 3, x0_)), y = y0_ + dy;
        const b = [x - wd / 2 - 3, y - ht - 2, x + wd / 2 + 3, y + 3];
        if (b[1] < 0 || b[3] > h || Math.abs(x - x0_) > wd) continue;
        if (boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
        boxes.push(b);
        return [x, y];
      }
      return null;
    };
    const tw = (t: string, px: number) => t.length * px * 0.56;
    if (d.circle) fits(X(d.circle.e), Y(d.circle.n) + 4, 8, 8);
    let villages = 0;
    const place = (p: Drawn['places'][number]) => {
      const px = p.big ? 13.5 : 12;
      const at = fits(X(p.x), Y(p.y), tw(p.name, px), px);
      if (at) {
        out.push({ t: p.name, x: at[0], y: at[1], cls: p.big ? 'place t' : 'place' });
        if (!p.big) villages++;
      }
    };
    for (const p of d.places) if (p.big) place(p);
    const towns = boxes.length;
    hidden.clear();
    if (!isCircle && sz >= 20)
      d.cells.forEach((c, i) => {
        const b = [X(c.x) + 2, Y(c.y + d.size) + sz / 2 - 7, X(c.x) + sz - 2, Y(c.y + d.size) + sz / 2 + 6];
        if (boxes.slice(0, towns).some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) hidden.add(i);
        else boxes.push(b);
      });
    for (const p of d.places) {
      if (p.big) continue;
      if (!p.big && !isCircle && villages >= (narrow ? 3 : 6)) continue;
      if (!p.big && isCircle && narrow) continue;
      place(p);
    }
    const seen = new Set<string>();
    // the longest roads' numbers first, at most eight on a computer and five on a phone
    const longest = [...d.roads].filter((r) => r.no).sort((a, b) => b.pts.length - a.pts.length);
    for (const r of longest) {
      if (seen.size >= (narrow ? 5 : 8)) break;
      if (!r.no || seen.has(r.no) || r.pts.length < 2) continue;
      for (const m of [r.pts[Math.floor(r.pts.length / 2)], r.pts[0], r.pts[r.pts.length - 1]]) {
        const inside = d.circle ? Math.hypot(m[0] - d.circle.e, m[1] - d.circle.n) < d.circle.r * 0.85 : d.outline!.some((ring) => inRing(m, ring));
        if (!inside) continue;
        const at = fits(X(m[0]), Y(m[1]) + 4, tw(r.no, 10), 10);
        if (at) {
          seen.add(r.no);
          out.push({ t: r.no, x: at[0], y: at[1], cls: 'rno' });
          break;
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, mw, h, narrow]);

  const clipId = `clip-${isCircle ? 'c' : 'k'}`;
  const clip = d.circle ? <circle cx={X(d.circle.e)} cy={Y(d.circle.n)} r={d.circle.r * k} /> : d.outline!.map((r, i) => <path key={i} d={`${path(r)}Z`} />);
  const edge = d.circle ? <circle className="edge" cx={X(d.circle.e)} cy={Y(d.circle.n)} r={d.circle.r * k} /> : d.outline!.map((r, i) => <path key={i} className="edge" d={`${path(r)}Z`} />);
  const byKind = (kinds: string) => d.roads.filter((r) => kinds.includes(r.k)).map((r) => path(r.pts)).join('');
  const unit = isCircle ? '250-metre' : d.size === 5000 ? 'five-kilometre' : 'one-kilometre';
  const cell = on !== null ? d.cells[on] : null;
  const numbers = !isCircle && sz >= 20;

  let grid: string | null = null;
  if (!isCircle && mw && sz >= 6) {
    const parts: string[] = [];
    for (let i = Math.floor(x0 / d.size); i <= Math.floor(x1 / d.size); i++) parts.push(`M${X(i * d.size).toFixed(1)} 0V${h}`);
    for (let j = Math.floor(y0 / d.size); j <= Math.floor(y1 / d.size) + 1; j++) parts.push(`M0 ${Y(j * d.size).toFixed(1)}H${mw}`);
    grid = parts.join('');
  }

  return (
    <div ref={box}>
      <h3>Where they happened</h3>
      <p>
        {d.total === 0
          ? `There were no injury collisions ${input.where} from ${input.years}.`
          : `The ${fmt(d.total)} injury collision${d.total === 1 ? '' : 's'} ${input.where}, from ${input.years}, in ${unit} squares. ${Word(d.cells.length)} of the ${fmt(d.possible)} squares had at least one; the busiest had ${fmt(busiest.n)}.`}
      </p>
      {mw > 0 && d.total > 0 && (
        <>
          <div className="mapwrap" ref={wrap} style={{ width: mw }}>
            <svg className="map" viewBox={`0 0 ${mw} ${h}`} width={mw} height={h} role="img" aria-label={`Injury collisions in each ${unit} square`}>
              <defs>
                <clipPath id={clipId}>{clip}</clipPath>
              </defs>
              {isCircle && (
                <>
                  <path className="road r-minor" d={byKind('n')} />
                  <path className="road r-b" d={byKind('b')} />
                </>
              )}
              <g clipPath={`url(#${clipId})`}>
                {grid && <path className="grid0" d={grid} />}
                {d.cells.map((c, i) => (
                  <rect
                    key={i}
                    className={`cell${on === i ? ' on' : ''}`}
                    x={X(c.x)}
                    y={Y(c.y + d.size)}
                    width={sz}
                    height={sz}
                    fill={shade(c.n)}
                    fillOpacity={isCircle ? 0.82 : 1}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setOn(i)}
                    onPointerLeave={(e) => e.pointerType === 'mouse' && setOn(null)}
                    onClick={() => setOn(i)}
                  />
                ))}
                {!isCircle && <path className="road r-over" d={byKind('mab')} />}
              </g>
              {isCircle && (
                <>
                  <path className="road w-case" d={byKind('ma')} />
                  <path className="road w-a" d={byKind('a')} />
                  <path className="road w-m" d={byKind('m')} />
                </>
              )}
              {edge}
              {d.circle && <circle className="mid" cx={X(d.circle.e)} cy={Y(d.circle.n)} r={4} />}
              {numbers &&
                d.cells.map((c, i) => {
                  const b = steps.findIndex(([lo, hi]) => c.n >= lo && c.n <= hi) + (max <= 5 ? 0 : 5 - steps.length);
                  const inside = d.outline!.some((ring) => inRing([c.x + d.size / 2, c.y + d.size / 2], ring));
                  if (!inside || hidden.has(i)) return null;
                  return (
                    <text key={i} className={`num${(dark ? b < 3 : b >= 2) ? '' : ' dk'}`} x={X(c.x + d.size / 2)} y={Y(c.y + d.size / 2) + 4}>
                      {c.n}
                    </text>
                  );
                })}
              {labels.map((l, i) => (
                <text key={i} className={l.cls} x={l.x} y={l.y} textAnchor="middle">
                  {l.t}
                </text>
              ))}
            </svg>
            {cell && (
              <div className="map-tip" style={{ left: Math.max(0, Math.min(mw - 220, X(cell.x + d.size / 2) - 110)), top: Y(cell.y + d.size) > 70 ? Y(cell.y + d.size) - 62 : Y(cell.y) + 8 }}>
                <b>{cell.n === 1 ? 'One injury collision' : `${Word(cell.n)} injury collisions`}</b>
                <br />
                in this {unit} square
              </div>
            )}
          </div>
          <div className="legend map-key">
            <span>Injury collisions in each square:</span>
            {steps.map((s) => (
              <span key={s[0]}>
                <i style={{ background: shade(s[0]) }} />
                {stepText(s)}
              </span>
            ))}
          </div>
          <p className="note">{matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Point at'} a square for its count.</p>
        </>
      )}
    </div>
  );
}
