// Counting a circle on the device (SPEC §7, §9): the collisions within half a mile, a mile or two miles of a point, from
// the 50 km squares it touches (build/tiles.py). Nothing about the point leaves the page; only the squares' files are fetched.
import type { OldFile, SquareFile, Stretch } from './data.ts';

export const RADII = { half: 804.672, one: 1609.344, two: 3218.688 } as const;
export type Radius = keyof typeof RADII;
export const USERS = ['walking', 'cycling', 'motorcycle', 'car', 'other'] as const;

// The squares a circle touches, by name ("8-3"), among those that have any collisions.
export function squaresFor(e: number, n: number, r: number, size: number, have: Set<string>): string[] {
  const out: string[] = [];
  for (let sx = Math.floor((e - r) / size); sx <= Math.floor((e + r) / size); sx++)
    for (let sy = Math.floor((n - r) / size); sy <= Math.floor((n + r) / size); sy++) if (have.has(`${sx}-${sy}`)) out.push(`${sx}-${sy}`);
  return out;
}

export type CircleCount = {
  years: Record<number, number>; // collisions a year
  n: number; hurt: number; killed: number; fatal: number; ksi: number; ksiAdjusted: number;
  kinds: { minor: number; a: number; motorway: number };
  who: Record<string, number>; hours: number[]; days: number[];
  byYear: Record<number, { n: number; hurt: number; killed: number }>;
};

const inside = (x: number, y: number, e: number, n: number, r2: number) => (x - e) ** 2 + (y - n) ** 2 <= r2;

// Count the circle in the squares' files. `old` (1989 to 1999) is optional, loaded only for the long view.
export function count(e: number, n: number, r: number, files: SquareFile[], first: number, olds: OldFile[] = []): CircleCount {
  const r2 = r * r;
  const c: CircleCount = {
    years: {}, n: 0, hurt: 0, killed: 0, fatal: 0, ksi: 0, ksiAdjusted: 0, kinds: { minor: 0, a: 0, motorway: 0 },
    who: Object.fromEntries(USERS.map((u) => [u, 0])), hours: Array(24).fill(0), days: Array(7).fill(0), byYear: {},
  };
  const add = (y: number, k: number) => (c.years[y] = (c.years[y] ?? 0) + k);
  for (const f of [...files, ...olds]) {
    const ox = f.sq[0] * f.size, oy = f.sq[1] * f.size;
    for (const [year, deltas, counts] of f.history) {
      let key = 0;
      for (let i = 0; i < deltas.length; i++) {
        key += deltas[i];
        const x = ox + Math.floor(key / 1000) * 100 + 50, y = oy + (key % 1000) * 100 + 50; // the 100 m cell's middle
        if (inside(x, y, e, n, r2)) add(year, counts[i]);
      }
    }
  }
  for (const f of files) {
    const ox = f.sq[0] * f.size, oy = f.sq[1] * f.size;
    const [de, nn, yr, hr, dy, kind, killed, serious, adj, ...who] = f.recent;
    let ee = 0;
    for (let i = 0; i < (de?.length ?? 0); i++) {
      ee += de[i];
      if (!inside(ox + ee * 10, oy + nn[i] * 10, e, n, r2)) continue;
      const year = first + yr[i];
      add(year, 1);
      c.n++;
      const hurt = USERS.reduce((s, _, j) => s + who[j][i], 0);
      USERS.forEach((u, j) => (c.who[u] += who[j][i]));
      c.hurt += hurt;
      c.killed += killed[i];
      if (killed[i] > 0) c.fatal++;
      if (killed[i] > 0 || serious[i]) c.ksi++;
      c.ksiAdjusted += killed[i] > 0 ? 1 : adj[i] / 100;
      c.kinds[kind[i] === 2 ? 'motorway' : kind[i] === 1 ? 'a' : 'minor']++;
      if (hr[i] >= 0) c.hours[hr[i]]++;
      if (dy[i] >= 0) c.days[dy[i]]++;
      const b = (c.byYear[year] ??= { n: 0, hurt: 0, killed: 0 });
      b.n++;
      b.hurt += hurt;
      b.killed += killed[i];
    }
  }
  return c;
}

// The A-road and motorway stretches crossing the circle, with how much of each lies inside (straight-line, in 25 m steps),
// once each even where they cross several squares.
export function stretchesIn(e: number, n: number, r: number, files: SquareFile[]): (Stretch & { insideKm: number })[] {
  const seen = new Map<number, Stretch & { insideKm: number }>();
  const r2 = r * r;
  for (const f of files)
    for (const s of f.stretches) {
      if (seen.has(s.cp)) continue;
      let x = s.line[0], y = s.line[1], inM = 0;
      for (let i = 2; i < s.line.length; i += 2) {
        const nx = x + s.line[i], ny = y + s.line[i + 1];
        const len = Math.hypot(nx - x, ny - y), steps = Math.max(1, Math.ceil(len / 25));
        for (let k = 0; k < steps; k++) {
          const t = (k + 0.5) / steps;
          if (inside(x + (nx - x) * t, y + (ny - y) * t, e, n, r2)) inM += len / steps;
        }
        x = nx;
        y = ny;
      }
      if (inM > 0) seen.set(s.cp, { ...s, insideKm: inM / 1000 });
    }
  return [...seen.values()].sort((a, b) => b.insideKm - a.insideKm);
}
