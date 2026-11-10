// The page's data (scripts/pageData.ts): types, and loading each file once per visit.

export type PageIndex = {
  latest: number;
  five: number[];
  first: number;
  codes: string[]; // council codes, by the index used in outcodes, places and postcode files
  councils: [string, string, string][]; // code, name, region code; by name
  regions: Record<string, string>;
  outcodes: Record<string, [number, number, string, number]>; // latitude, longitude, main place, council index
  files: { areas: string; squares: string; places: string; postcodes: string; roads: { local: string; main: string }; councilMaps: string };
  squareSize: number;
  squares: string[];
  roadSquares: { local: string[]; main: string[] };
  councilMapGroup: Record<string, string>; // council code → the file its map is in (one per region, Scotland and Wales)
};

// One area's figures (build/areas.py): trend[year] = [all collisions, A-road and motorway collisions, million vehicle miles]
export type Five = {
  all: number; minor: number; prev_all: number; n: number; hurt: number; killed: number;
  ksi_recorded: number; ksi_adjusted: number;
  kinds: Record<'motorway' | 'a', { n: number; mvm: number }>;
  am: number; am_mvm: number; rate: number | null; expected: number; ratio: number | null;
  who: Record<string, number>; hours: number[]; days: number[];
};
export type AreaFigures = { name?: string; region?: string; trend: Record<string, number[]>; five: Five; roads?: { road: string; n: number; mvm: number; stretches: number; rate: number | null }[] };
export type AreasFile = { latest: number; five: number[]; prev_five: number[]; gb: AreaFigures & { kind_rate: Record<string, number> }; regions: Record<string, AreaFigures>; councils: Record<string, AreaFigures> };

export type Stretch = { cp: number; road: string; start: string | null; end: string | null; km: number; n: number; mvm: number; rate: number | null; rebuilt: boolean; line: number[] };
export type SquareFile = { sq: [number, number]; size: number; recent: number[][]; history: [number, number[], number[]][]; stretches: Stretch[] };
export type OldFile = { sq: [number, number]; size: number; history: [number, number[], number[]][] };
export type PostcodeFile = { districts: Record<string, string>; council: Record<string, Record<string, number>> };

const cache = new Map<string, Promise<unknown>>();
export function json<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }).catch((e) => {
        cache.delete(url); // try again next time
        throw e;
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

export const loadIndex = () => json<PageIndex>('/data/index.json');
export const loadAreas = async () => json<AreasFile>(`/data/${(await loadIndex()).files.areas}`);
export const loadSquare = async (name: string) => json<SquareFile>(`/data/${(await loadIndex()).files.squares}/${name}.json`);
export const loadOld = async (name: string) => json<OldFile>(`/data/${(await loadIndex()).files.squares}/${name}-old.json`);
export const loadPostcodeArea = async (area: string) => json<PostcodeFile>(`/data/${(await loadIndex()).files.postcodes}/${encodeURIComponent(area)}.json`);

// The map of shaded squares (SPEC §8.1, build/roads.py and build/areas.py).
// A road file: one letter per line (m motorway, a A-road, b B-road, n other) and each line's start and steps in metres
// from the square's corner; "no" gives motorways' and A-roads' numbers by line.
export type RoadFile = { sq: [number, number]; size: number; k: string; l: number[][]; no: Record<string, string> };
// A council area's outline (start and steps in metres, one list per part) and its collisions in the latest five years by
// one-kilometre square: [easting / 1000, northing / 1000, count].
export type CouncilMap = { code: string; bbox: [number, number, number, number]; outline: number[][]; cells: [number, number, number][] };
export const loadRoads = async (layer: 'local' | 'main', name: string) => {
  const ix = await loadIndex();
  return json<RoadFile[]>(`/data/${ix.files.roads[layer]}/${name}.json`);
};
export const loadCouncilMaps = async (group: string) => json<Record<string, CouncilMap>>(`/data/${(await loadIndex()).files.councilMaps}/${group}.json`);
