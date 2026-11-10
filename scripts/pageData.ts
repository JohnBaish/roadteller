// The page's data files, made from data/ before every build and dev start, into public/data (not kept in git).
// Every visitor loads the same files whatever they choose, and the files a circle needs are by 50 km square, so the
// website learns no more than roughly which part of the country is being looked at (SPEC §9.2).
//   index.json                 council areas, regions, postcode districts (middle, place, council) and the file names below
//   areas-<v>.json             every council area's, region's and Great Britain's figures (data/areas.json)
//   squares-<v>/<sx>-<sy>.json the collisions for circles (data/squares, build/tiles.py)
//   places-<v>.json            place names (data/os/places.json) with each place's council area added
//   postcodes-<v>/<area>.json  every postcode's position (data/os/postcodes) and those outside their district's council area
//   roads-local-<v>/<sx>-<sy>.json  every road in one 50 km square, as its 10 km pieces (data/roads-local, build/roads.py)
//   roads-main-<v>/<sx>-<sy>.json   motorways, A-roads and B-roads in one 50 km square (data/roads-main)
//   council-maps-<v>/<group>.json   council areas' outlines and squares (data/council-maps), one file per English region,
//                                   Scotland and Wales, so choosing a council area tells the website no more than its region
// <v> is a short fingerprint of the data, so a browser never mixes old and new files.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const SOURCES = ['data/areas.json', 'data/squares/index.json', 'data/os/places.json', 'data/os/outcodes.json', 'data/councils-of.json'];

type CouncilsOf = { codes: string[]; districts: Record<string, number>; postcodes: Record<string, Record<string, number>>; places: number[] };
type Areas = {
  latest: number;
  five: number[];
  gb: { trend: Record<string, number[]> };
  regions: Record<string, { name: string }>;
  councils: Record<string, { name: string; region: string }>;
};

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const fingerprint = (...paths: string[]) => {
  const h = createHash('sha1');
  for (const p of paths) h.update(readFileSync(p));
  return h.digest('hex').slice(0, 10);
};

export function writePageData(root: string) {
  const d = (p: string) => join(root, 'data', p);
  const out = join(root, 'public', 'data');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const areas = read<Areas>(d('areas.json'));
  const of = read<CouncilsOf>(d('councils-of.json'));
  const outcodes = read<{ outcodes: Record<string, [number, number, string]> }>(d('os/outcodes.json')).outcodes;
  const squares = read<{ size: number; squares: Record<string, number[]> }>(d('squares/index.json'));

  const vAreas = fingerprint(d('areas.json'));
  writeFileSync(join(out, `areas-${vAreas}.json`), readFileSync(d('areas.json')));
  const vSquares = fingerprint(d('squares/index.json'));
  cpSync(d('squares'), join(out, `squares-${vSquares}`), { recursive: true });

  const vPlaces = fingerprint(d('os/places.json'), d('councils-of.json'));
  const places = read<{ credit: string; made: string; places: unknown[][] }>(d('os/places.json'));
  places.places = places.places.map((row, i) => [...row, of.places[i]]);
  writeFileSync(join(out, `places-${vPlaces}.json`), JSON.stringify(places));

  const vPost = fingerprint(d('councils-of.json'), ...readdirSync(d('os/postcodes')).filter((f) => f.endsWith('.json')).map((f) => d(`os/postcodes/${f}`)));
  mkdirSync(join(out, `postcodes-${vPost}`));
  for (const f of readdirSync(d('os/postcodes'))) {
    if (!f.endsWith('.json')) continue;
    const districts = read<Record<string, string>>(d(`os/postcodes/${f}`));
    const council: Record<string, Record<string, number>> = {};
    for (const district of Object.keys(districts)) if (of.postcodes[district]) council[district] = of.postcodes[district];
    writeFileSync(join(out, `postcodes-${vPost}`, f), JSON.stringify({ districts, council }));
  }

  // roads, grouped by 50 km square like the collisions
  const roadSquares: Record<'local' | 'main', string[]> = { local: [], main: [] };
  const roadFiles: Record<'local' | 'main', string> = { local: '', main: '' };
  for (const layer of ['local', 'main'] as const) {
    const src = d(`roads-${layer}`);
    const names = readdirSync(src).filter((f) => f.endsWith('.json')).sort();
    const v = fingerprint(...names.map((f) => join(src, f)));
    const folder = `roads-${layer}-${v}`;
    mkdirSync(join(out, folder));
    const groups = new Map<string, string[]>();
    for (const f of names) {
      const [sx, sy] = f.replace('.json', '').split('-').map(Number);
      const per = layer === 'local' ? 5 : 1; // 10 km pieces in a 50 km square
      const key = `${Math.floor(sx / per)}-${Math.floor(sy / per)}`;
      groups.set(key, [...(groups.get(key) ?? []), readFileSync(join(src, f), 'utf8')]);
    }
    for (const [key, parts] of groups) writeFileSync(join(out, folder, `${key}.json`), `[${parts.join(',')}]`);
    roadSquares[layer] = [...groups.keys()];
    roadFiles[layer] = folder;
  }
  // council maps, one file per region (England), Scotland and Wales
  const cm = d('council-maps');
  const cmNames = readdirSync(cm).filter((f) => f.endsWith('.json')).sort();
  const vMaps = fingerprint(...cmNames.map((f) => join(cm, f)));
  const mapsFolder = `council-maps-${vMaps}`;
  mkdirSync(join(out, mapsFolder));
  const groupOf = (code: string) => (code[0] === 'S' ? 'scotland' : code[0] === 'W' ? 'wales' : (areas.councils[code]?.region ?? 'other'));
  const mapGroups = new Map<string, string[]>();
  const councilMapGroup: Record<string, string> = {};
  for (const f of cmNames) {
    const code = f.replace('.json', '');
    const g = groupOf(code);
    councilMapGroup[code] = g;
    mapGroups.set(g, [...(mapGroups.get(g) ?? []), `${JSON.stringify(code)}:${readFileSync(join(cm, f), 'utf8')}`]);
  }
  for (const [g, parts] of mapGroups) writeFileSync(join(out, mapsFolder, `${g}.json`), `{${parts.join(',')}}`);

  const index = {
    latest: areas.latest,
    five: areas.five,
    first: Math.min(...Object.keys(areas.gb.trend).map(Number)),
    codes: of.codes,
    councils: Object.entries(areas.councils)
      .map(([code, c]) => [code, c.name, c.region])
      .sort((a, b) => a[1].localeCompare(b[1], 'en-GB')),
    regions: Object.fromEntries(Object.entries(areas.regions).map(([code, r]) => [code, r.name])),
    outcodes: Object.fromEntries(Object.entries(outcodes).map(([k, [lat, lon, place]]) => [k, [lat, lon, place, of.districts[k] ?? -1]])),
    files: { areas: `areas-${vAreas}.json`, squares: `squares-${vSquares}`, places: `places-${vPlaces}.json`, postcodes: `postcodes-${vPost}`, roads: roadFiles, councilMaps: mapsFolder },
    squareSize: squares.size,
    squares: Object.keys(squares.squares),
    roadSquares,
    councilMapGroup,
  };
  writeFileSync(join(out, 'index.json'), JSON.stringify(index));
  return index;
}

if (process.argv[1]?.endsWith('pageData.ts')) {
  const ix = writePageData(process.cwd());
  console.log(`page data: ${ix.councils.length} council areas, ${Object.keys(ix.outcodes).length} postcode districts, ${ix.squares.length} squares`);
}
