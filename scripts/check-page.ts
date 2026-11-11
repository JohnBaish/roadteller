// Checks on the page's rules, run with the real data: `npm run check`.
import { readFileSync, existsSync } from 'node:fs';
import { count, RADII, squaresFor, stretchesIn } from '../src/lib/circle.ts';
import { unpack, unpackSquare } from '../src/lib/packed.ts';
import { compareText, named, perMiles, poss } from '../src/lib/words.ts';
import { COUNCIL_NAMES } from './councilNames.ts';
import { joinPieces, roadSpots } from '../src/lib/mapLabels.ts';
import { toBritishGrid } from '../src/lib/grid.ts';
import type { OldFile, SquareFile } from '../src/lib/data.ts';

let passed = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, detail: unknown = '') => (ok ? passed++ : fails.push(`${name}: ${JSON.stringify(detail)}`));

const ix = JSON.parse(readFileSync('data/squares/index.json', 'utf8')) as { size: number; squares: Record<string, number[]> };
const have = new Set(Object.keys(ix.squares));
const outcodes = JSON.parse(readFileSync('data/os/outcodes.json', 'utf8')).outcodes as Record<string, [number, number, string]>;
const areas = JSON.parse(readFileSync('data/areas.json', 'utf8'));
const FIRST = areas.five[0] as number;
const load = (n: string) => unpackSquare(JSON.parse(readFileSync(`data/squares/${n}.json`, 'utf8')) as SquareFile);
const loadOld = (n: string) => (existsSync(`data/squares/${n}-old.json`) ? unpackSquare(JSON.parse(readFileSync(`data/squares/${n}-old.json`, 'utf8')) as OldFile) : null);

function circle(lat: number, lon: number, r: number, old = false) {
  const { easting: e, northing: n } = toBritishGrid(lat, lon);
  const names = squaresFor(e, n, r, ix.size, have);
  const files = names.map(load);
  const olds = old ? names.map(loadOld).filter((x): x is OldFile => !!x) : [];
  return { e, n, names, c: count(e, n, r, files, FIRST, olds), s: stretchesIn(e, n, r, files) };
}

// RG14 (Newbury), one mile: the agreed mock-up had 129 collisions in 2021 to 2025 and 126 in 2016 to 2020, from the middle
// of RG14 as Hindcaster gives it (OS Open Names); this middle (Refueller's, the same source, as latitude and longitude) is
// a few metres away, so a collision or two either way is allowed.
const [la, lo] = outcodes.RG14;
const rg = circle(la, lo, RADII.one);
check('RG14: one square', rg.names.length === 1, rg.names);
check('RG14: about 129 collisions, 2021 to 2025', Math.abs(rg.c.n - 129) <= 3, rg.c.n);
const prev = [2016, 2017, 2018, 2019, 2020].reduce((s, y) => s + (rg.c.years[y] ?? 0), 0);
check('RG14: about 126 in 2016 to 2020', Math.abs(prev - 126) <= 3, prev);
check('RG14: people hurt add up', Object.values(rg.c.who).reduce((a, b) => a + b, 0) === rg.c.hurt);
check('RG14: kinds add up', rg.c.kinds.a + rg.c.kinds.motorway + rg.c.kinds.minor === rg.c.n);
check('RG14: the A4 from the A339 crosses it', rg.s.some((s) => s.cp === 78260), rg.s.map((s) => s.cp));
check('RG14: no counts before 2000 without the long view', Object.keys(rg.c.years).every((y) => +y >= 2000));
const rgOld = circle(la, lo, RADII.one, true);
check('RG14: long view from 1989', Math.min(...Object.keys(rgOld.c.years).map(Number)) === 1989, Object.keys(rgOld.c.years)[0]);
// A circle's counts, all of Great Britain's squares added: within a hair of Great Britain's own placed totals
const two = circle(la, lo, RADII.two);
check('two miles holds more than one', two.c.n > rg.c.n, [two.c.n, rg.c.n]);
// The whole of the City of London: within 2 miles of Bank, more than a thousand collisions
const city = circle(51.5134, -0.0890, RADII.two);
check('central London: more than 1,000 collisions within two miles of Bank', city.c.n > 1000, city.c.n);

// Road lines are written as text by build/roads.py; this string is what it writes for these numbers.
check('road text read back', JSON.stringify(unpack("7.4[=8PCDEcb#D$DADBD3AD2AD#'4J")) === JSON.stringify([402106, 7005, 0, -1, 1, -16, 15, 16, -17, 31, -32, 1000, -1000, 123456]), unpack("7.4[=8PCDEcb#D$DADBD3AD2AD#'4J"));
const rl = JSON.parse(readFileSync('data/roads-local/47-16.json', 'utf8'));
check('circle files hold text', typeof JSON.parse(readFileSync('data/squares/8-3.json', 'utf8')).recent[0] === 'string');
check('road files hold text', typeof rl.l[0] === 'string' && unpack(rl.l[0]).length % 2 === 0, rl.l[0]);

// Comparison wording (John, November 10th 2026): exact "lower than" from 70% to 95%, as above Great Britain's rate.
const cmp = [0.912, 0.7, 0.69, 0.96, 1.44, 0.37].map((r) => compareText(r, 'x'));
check('comparison wording', JSON.stringify(cmp) === JSON.stringify(['9% lower than x', '30% lower than x', 'About two thirds of x (69%)', 'About the same as x (96%)', '44% higher than x', 'About a third of x (37%)']), cmp);
// Road numbers on the map (John, November 10th 2026): pieces joined end to end, the label in the middle of the longest
// stretch on the map, and one more for each further 300 pixels.
const joined = joinPieces([[[0, 0], [100, 0]], [[300, 0], [200, 0]], [[100, 0], [200, 0]], [[0, 500], [50, 500]]]);
check('road pieces joined', joined.length === 2 && joined[0].length === 4 && joined[0][0][0] === 0 && joined[0][3][0] === 300, joined);
const spots = roadSpots([{ pts: [[0, 0], [1000, 0]], no: 'A1' }, { pts: [[1000, 0], [3000, 0]], no: 'A1' }, { pts: [[0, 50], [400, 50]], no: 'B2' }, { pts: [[0, 90], [100, 90]] }], (p) => p[0] <= 2600, 5);
check('road labels', spots.length === 2 && spots[0].length === 2 && spots[0].every((sp) => sp.no === 'A1') && Math.round(spots[0][0].at[0]) === 650 && spots[1][0].no === 'B2', spots.map((r) => r.map((sp) => [sp.no, Math.round(sp.at[0])])));
// Fresh look, November 11th 2026: wording of rates and council names
check('3.1: 17 times', compareText(16.52, 'the Great Britain rate') === 'About 17 times the Great Britain rate (1652%)', compareText(16.52, 'the Great Britain rate'));
check('3.1: three times still in words', compareText(2.7, 'x') === 'About three times x (270%)', compareText(2.7, 'x'));
check('3.5: less than a million miles', perMiles(100 / 0.26) === '260,000 miles' && perMiles(100 / 14.04) === '14.0 million miles', [perMiles(100 / 0.26), perMiles(100 / 14.04)]);
check('3.2: names', poss({ name: 'Isles of Scilly', the: true }) === 'the Isles of Scilly’s' && poss({ name: 'St Helens' }) === 'St Helens’' && poss({ name: 'Bristol' }) === 'Bristol’s' && named({ name: 'City of London', the: true }) === 'the City of London');
{
  const areas = JSON.parse(readFileSync('data/areas.json', 'utf8')) as { councils: Record<string, unknown> };
  const lost = Object.keys(COUNCIL_NAMES).filter((c) => !areas.councils[c]);
  check('3.2: every renamed council exists', lost.length === 0, lost);
}
console.log(`${passed} passed, ${fails.length} failed`);
for (const f of fails) console.log('  FAIL', f);
console.log('RG14 one mile:', rg.c.n, 'collisions,', rg.c.hurt, 'hurt,', rg.c.killed, 'killed; 2016 to 2020:', prev, '; squares', rg.names);
process.exit(fails.length ? 1 : 0);
