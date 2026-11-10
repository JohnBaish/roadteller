// Where to put road numbers on the map of shaded squares (John, November 10th 2026). The road files hold each road in
// short pieces between junctions, so a long road's number used to land on whichever piece came first. Now each numbered
// road's pieces are joined end to end first; the number goes in the middle of its longest stretch on the map (inside
// the circle or the council area), and once more for every further `spacing` pixels of that stretch, so a long road is
// named where you'd look for it. Pure functions, so `npm run check` can test them.

type Pt = [number, number];
export type RoadLine = { pts: Pt[]; no?: string };
export type Spot = { no: string; at: Pt; tries: Pt[] }; // the best place first, then nearby places along the road
const key = (p: Pt) => `${Math.round(p[0])},${Math.round(p[1])}`;
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Join one road's pieces where their ends meet (to the metre), giving the longest lines it can. */
export function joinPieces(pieces: Pt[][]): Pt[][] {
  const left = pieces.filter((p) => p.length > 1).map((p) => [...p]);
  const used = new Set<number>();
  const ends = new Map<string, number[]>();
  left.forEach((p, i) => {
    for (const k of [key(p[0]), key(p[p.length - 1])]) ends.set(k, [...(ends.get(k) ?? []), i]);
  });
  const take = (at: Pt): Pt[] | null => {
    for (const i of ends.get(key(at)) ?? []) {
      if (used.has(i)) continue;
      used.add(i);
      const p = left[i];
      return key(p[0]) === key(at) ? p : [...p].reverse();
    }
    return null;
  };
  const out: Pt[][] = [];
  left.forEach((p, i) => {
    if (used.has(i)) return;
    used.add(i);
    let line = [...p];
    for (let next = take(line[line.length - 1]); next; next = take(line[line.length - 1])) line = line.concat(next.slice(1));
    for (let prev = take(line[0]); prev; prev = take(line[0])) line = [...prev].reverse().concat(line.slice(1));
    out.push(line);
  });
  return out;
}

/** A point a given distance along a line. */
function along(line: Pt[], d: number): Pt {
  for (let i = 1; i < line.length; i++) {
    const s = dist(line[i - 1], line[i]);
    if (d <= s) {
      const t = s ? d / s : 0;
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
    }
    d -= s;
  }
  return line[line.length - 1];
}

/**
 * Places for road numbers, longest roads first. `inside` says whether a point is on the shaded part of the map,
 * `perPx` how many metres one pixel covers, `spacing` the pixels between labels of the same road.
 */
export function roadSpots(roads: RoadLine[], inside: (p: Pt) => boolean, perPx: number, spacing = 300): Spot[][] {
  const byNo = new Map<string, Pt[][]>();
  for (const r of roads) if (r.no) byNo.set(r.no, [...(byNo.get(r.no) ?? []), r.pts]);
  const roadsOut: { len: number; spots: Spot[] }[] = [];
  for (const [no, pieces] of byNo) {
    // the stretches of this road that lie on the shaded part, each as its own line
    const runs: Pt[][] = [];
    for (const line of joinPieces(pieces)) {
      // where a piece crosses the edge, find the crossing (halving the gap 20 times), so a stretch ends at the edge itself
      const edge = (a: Pt, b: Pt): Pt => {
        let lo = a, hi = b;
        for (let i = 0; i < 20; i++) {
          const m: Pt = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
          if (inside(m) === inside(a)) lo = m;
          else hi = m;
        }
        return lo;
      };
      let run: Pt[] = [];
      line.forEach((p, i) => {
        const inP = inside(p);
        if (i && inP !== inside(line[i - 1])) {
          const x = edge(line[i - 1], p);
          if (inP) run = [x];
          else {
            run.push(x);
            if (run.length > 1) runs.push(run);
            run = [];
          }
        }
        if (inP) run.push(p);
      });
      if (run.length > 1) runs.push(run);
    }
    const lens = runs.map((r) => r.slice(1).reduce((s, p, i) => s + dist(r[i], p), 0));
    const total = lens.reduce((s, l) => s + l, 0);
    if (!total) continue;
    const order = runs.map((_, i) => i).sort((a, b) => lens[b] - lens[a]);
    const spots: Spot[] = [];
    order.forEach((i, rank) => {
      const px = lens[i] / perPx;
      // the longest stretch always gets one; any stretch gets one more for each further `spacing` pixels
      const n = Math.floor(px / spacing) + (rank === 0 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        const mid = ((j + 0.5) / n) * lens[i];
        const step = Math.min(lens[i] / (2 * n), 60 * perPx);
        // if the middle is taken, nearby places along the stretch, then anywhere along its share of the stretch
        const near = [0.4, -0.4, 0.8, -0.8].map((f) => mid + f * step);
        const share = [0.1, 0.25, 0.4].flatMap((f) => [mid + f * (lens[i] / n), mid - f * (lens[i] / n)]);
        const tries = [...near, ...share].map((d) => along(runs[i], Math.max(0, Math.min(lens[i], d))));
        spots.push({ no, at: along(runs[i], mid), tries });
      }
    });
    // last resort for the first label: anywhere along the road's stretches on the map, every twentieth of each, nearest first
    if (spots.length) {
      const first = spots[0].at;
      const anywhere = runs.flatMap((r, i) => Array.from({ length: 19 }, (_, j) => along(r, ((j + 1) / 20) * lens[i])));
      spots[0].tries.push(...anywhere.sort((a, b) => dist(a, first) - dist(b, first)));
    }
    roadsOut.push({ len: total, spots });
  }
  return roadsOut.sort((a, b) => b.len - a.len).map((r) => r.spots);
}
