// The charts from the agreed design (option B, design/mockups/options.src.html), as SVG drawn to the card's width, so they
// can also be turned into pictures (src/lib/shareImage.ts). Colours come from the page's tokens: this place terracotta, the
// region olive, Great Britain grey (dashed for lines).
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { fmt } from '../lib/words.ts';

/** The width of an element, kept up to date. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.floor(el.getBoundingClientRect().width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
export function ticks(max: number) {
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  let st = p;
  for (const m of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5]) {
    if (max / (m * p) <= 6) {
      st = m * p;
      break;
    }
  }
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += st) out.push(Math.round(v * 100) / 100);
  return out;
}

const Svg = ({ w, h, children, label, svgRef }: { w: number; h: number; children: ReactNode; label: string; svgRef?: RefObject<SVGSVGElement | null> }) => (
  <svg ref={svgRef} className="chart" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label}>
    {children}
  </svg>
);

const FILL = { me: 'var(--color-accent)', reg: 'var(--color-accent-2)', gb: 'var(--color-neutral-400)' } as const;
export type BarRow = { t: string; v: number; cls: keyof typeof FILL; me?: boolean };

/** Labelled horizontal bars (allowing for the mix of roads) */
export function Bars({ rows, w, max, unit, label, svgRef }: { rows: BarRow[]; w: number; max: number; unit: (v: number) => string; label: string; svgRef?: RefObject<SVGSVGElement | null> }) {
  const lab = w < 500 ? 112 : 160, val = 48, rh = 28, h = rows.length * rh + 4, bw = w - lab - val - 12;
  return (
    <Svg w={w} h={h} label={label} svgRef={svgRef}>
      {rows.map((r, i) => {
        const y = i * rh + 4;
        return (
          <g key={r.t}>
            <text className={r.me ? 'lbl' : 'txt'} x={0} y={y + 14}>{r.t}</text>
            <rect x={lab} y={y + 2} width={Math.max(2, (bw * Math.min(r.v, max)) / max)} height={15} rx={4} style={{ fill: FILL[r.cls] }} />
            <text className="lbl" x={w} y={y + 14} textAnchor="end">{unit(r.v)}</text>
          </g>
        );
      })}
    </Svg>
  );
}

/** Two bars for each row: this place and Great Britain (who was hurt) */
export function PairBars({ rows, w, meName, label, svgRef }: { rows: { t: string; a: number; b: number }[]; w: number; meName: string; label: string; svgRef?: RefObject<SVGSVGElement | null> }) {
  const lab = w < 600 ? 152 : 170, val = 44, rh = 44, top = 26, h = rows.length * rh + top, bw = w - lab - val - 12;
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
  const gx = 30 + meName.length * 6.6;
  return (
    <Svg w={w} h={h} label={label} svgRef={svgRef}>
      <rect x={0} y={4} width={14} height={10} rx={3} style={{ fill: FILL.me }} />
      <text className="key" x={20} y={13}>{meName}</text>
      <rect x={gx} y={4} width={14} height={10} rx={3} style={{ fill: FILL.gb }} />
      <text className="key" x={gx + 20} y={13}>Great Britain</text>
      {rows.map((r, i) => {
        const y = top + i * rh;
        return (
          <g key={r.t}>
            <text className="txt" x={0} y={y + 20}>{r.t}</text>
            <rect x={lab} y={y + 4} width={Math.max(2, (bw * r.a) / max)} height={14} rx={4} style={{ fill: FILL.me }} />
            <text className="lbl" x={w} y={y + 15} textAnchor="end">{r.a}%</text>
            <rect x={lab} y={y + 21} width={Math.max(2, (bw * r.b) / max)} height={10} rx={3} style={{ fill: FILL.gb }} />
            <text className="key" x={w} y={y + 31} textAnchor="end">{r.b}%</text>
          </g>
        );
      })}
    </Svg>
  );
}

const hourLabel = (i: number) => (i === 0 ? 'midnight' : i === 12 ? 'midday' : `${i % 12}${i < 12 ? 'am' : 'pm'}`);
/** Collisions by hour of the day; the busiest hour full colour */
export function HourBars({ hours, w, label, svgRef }: { hours: number[]; w: number; label: string; svgRef?: RefObject<SVGSVGElement | null> }) {
  const h = 120, padB = 20, padT = 8, max = Math.max(1, ...hours), bw = w / 24;
  const Y = (v: number) => padT + (h - padT - padB) * (1 - v / max);
  return (
    <Svg w={w} h={h} label={label} svgRef={svgRef}>
      {hours.map((v, i) => (
        <rect key={i} className={`bar me${v === max ? '' : ' soft'}`} x={i * bw + 1} y={Y(v)} width={Math.max(1, bw - 2)} height={Y(0) - Y(v)} />
      ))}
      {[0, 6, 12, 18].map((i) => (
        <text key={i} x={i * bw + 2} y={h - 4}>{hourLabel(i)}</text>
      ))}
    </Svg>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Collisions by day of the week, Monday first */
export function DayBars({ days, w, label, svgRef }: { days: number[]; w: number; label: string; svgRef?: RefObject<SVGSVGElement | null> }) {
  const h = 120, padB = 20, padT = 16, max = Math.max(1, ...days), bw = w / 7;
  const Y = (v: number) => padT + (h - padT - padB) * (1 - v / max);
  return (
    <Svg w={w} h={h} label={label} svgRef={svgRef}>
      {days.map((v, i) => {
        const x = i * bw + bw * 0.15, bwi = bw * 0.7;
        return (
          <g key={i}>
            <rect className={`bar me${v === max ? '' : ' soft'}`} x={x} y={Y(v)} width={bwi} height={Y(0) - Y(v)} />
            <text x={x + bwi / 2} y={h - 4} textAnchor="middle">{DAYS[i]}</text>
            <text className="lbl" x={x + bwi / 2} y={Y(v) - 4} textAnchor="middle">{fmt(v)}</text>
          </g>
        );
      })}
    </Svg>
  );
}

export type Series = { pts: [number, number][]; cls: 'me' | 'gb' | 'reg'; dash?: boolean; end: string };
/** Lines over the years, with each year a button (click, tap or Enter) that marks it */
export function Lines({ series, w, max: maxIn, label, selected, onSelect, svgRef }: {
  series: Series[]; w: number; max?: number; label: string; selected: number | null; onSelect?: (y: number) => void; svgRef?: RefObject<SVGSVGElement | null>;
}) {
  const h = 190, padL = 34, padR = 52, padB = 22, padT = 12;
  const xs = series.flatMap((s) => s.pts.map((p) => p[0]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const max = maxIn ?? niceMax(Math.max(...series.flatMap((s) => s.pts.map((p) => p[1]))));
  const X = (v: number) => padL + ((w - padL - padR) * (v - x0)) / Math.max(1, x1 - x0);
  const Y = (v: number) => padT + (h - padT - padB) * (1 - v / max);
  const ends = series.map((s) => ({ y: Y(s.pts[s.pts.length - 1][1]), t: s.end })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  const me = series.find((s) => s.cls === 'me') ?? series[0];
  const step = me.pts.length > 1 ? X(me.pts[1][0]) - X(me.pts[0][0]) : 20;
  const yearsShown: number[] = [];
  for (let yr = Math.ceil(x0 / 5) * 5; yr <= x1; yr += 5) yearsShown.push(yr);
  return (
    <Svg w={w} h={h} label={label} svgRef={svgRef}>
      {ticks(max).map((t) => (
        <g key={t}>
          <line className="grid" x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} />
          <text x={padL - 6} y={Y(t) + 4} textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
      {yearsShown.map((yr) => (
        <text key={yr} x={X(yr)} y={h - 6} textAnchor="middle">{yr}</text>
      ))}
      {series.map((s) => {
        const last = s.pts[s.pts.length - 1];
        return (
          <g key={s.end}>
            <path className={`line ${s.cls}${s.dash ? ' dash' : ''}`} d={s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('')} />
            <circle className={s.cls} cx={X(last[0])} cy={Y(last[1])} r={3.5} />
          </g>
        );
      })}
      {ends.map((e) => (
        <text key={e.t} className="lbl" x={w - padR + 7} y={e.y + 4}>{e.t}</text>
      ))}
      {me.pts.map(([y, v]) => (
        <g key={y}>
          {y === selected && (
            <>
              <line className="grid" x1={X(y)} x2={X(y)} y1={padT} y2={h - padB} style={{ stroke: 'var(--color-accent)' }} />
              <circle className="me ring" cx={X(y)} cy={Y(v)} r={6} />
            </>
          )}
          {onSelect && (
            <rect
              className="hit"
              data-noshare
              tabIndex={0}
              role="button"
              aria-label={String(y)}
              aria-pressed={y === selected}
              x={X(y) - step / 2}
              y={padT}
              width={step}
              height={h - padT - padB}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(y)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(y);
                }
              }}
            />
          )}
        </g>
      ))}
    </Svg>
  );
}
