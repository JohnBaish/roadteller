// What the visitor chose, as kept in the address after "#" (browsers never send that part, and the visit statistics drop
// it) and on this device as the last choice (SPEC §1.6):
//   #RG4-7HN  a full postcode      #RG4  a postcode district      #@Caversham  a place (#@Newport, Isle of Wight)
//   #council/E06000037  a council area
// A circle's size follows a slash: /half or /two (one mile, the default, has none).
import { decodeDistrict } from './postcodes.ts';
import { findPlace, placeAt, placeLabel, type NamedPlace, type PlaceIndex } from './places.ts';
import { loadPostcodeArea, type PageIndex } from './data.ts';
import type { Radius } from './circle.ts';

export type Place =
  | { kind: 'postcode'; outcode: string; inward?: string }
  | { kind: 'place'; place: string; at?: string };
export type Target = { kind: 'council'; code: string } | { kind: 'circle'; where: Place; radius: Radius };

export function readHash(raw: string): Target | null {
  const h = decodeURIComponent(raw.replace(/^#/, '')).trim();
  const council = /^council\/([ESW]\d{8})$/i.exec(h);
  if (council) return { kind: 'council', code: council[1].toUpperCase() };
  const m = /^(.*?)(?:\/(half|two))?$/.exec(h);
  const where = m ? readPlace(m[1]) : null;
  return where ? { kind: 'circle', where, radius: (m?.[2] as Radius | undefined) ?? 'one' } : null;
}

function readPlace(h: string): Place | null {
  if (h.startsWith('@') && h.length > 1) {
    const [place, at] = h.slice(1).split('~');
    return { kind: 'place', place, ...(at ? { at } : {}) };
  }
  const m = /^([A-Z]{1,2}\d[A-Z\d]?)(?:-(\d[A-Z]{2}))?$/.exec(h.toUpperCase());
  return m ? { kind: 'postcode', outcode: m[1], ...(m[2] ? { inward: m[2] } : {}) } : null;
}

export const placeHash = (w: Place) =>
  w.kind === 'postcode' ? `${w.outcode}${w.inward ? `-${w.inward}` : ''}` : `@${w.place}${w.at ? `~${w.at}` : ''}`;
export const hashOf = (t: Target) =>
  t.kind === 'council' ? `council/${t.code}` : `${placeHash(t.where)}${t.radius === 'one' ? '' : `/${t.radius}`}`;
export const placeOf = (p: NamedPlace): Place => {
  const at = placeAt(p);
  return { kind: 'place', place: placeLabel(p), ...(at ? { at } : {}) };
};

// A typed postcode: "RG4 7HN", "rg47hn", "RG4". The first half alone gives the district's middle.
export type PostcodeRead = { ok: true; outcode: string; inward?: string } | { ok: false; problem: 'empty' | 'notPostcode' | 'northernIreland' | 'notFound' };
export function readPostcode(typed: string, outcodes: PageIndex['outcodes']): PostcodeRead {
  const t = typed.toUpperCase().replace(/\s+/g, '');
  if (!t) return { ok: false, problem: 'empty' };
  const m = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})?$/.exec(t);
  if (!m) return { ok: false, problem: 'notPostcode' };
  if (m[1].startsWith('BT')) return { ok: false, problem: 'northernIreland' };
  if (!outcodes[m[1]]) return { ok: false, problem: 'notFound' };
  return { ok: true, outcode: m[1], ...(m[2] ? { inward: m[2] } : {}) };
}
// Draft wording (Claude, November 9th 2026), for John.
export const POSTCODE_PROBLEMS: Record<Exclude<PostcodeRead, { ok: true }>['problem'], (t: string) => string> = {
  empty: () => 'Please type a postcode or a place, such as RG1 8FR or Newbury.',
  notPostcode: (t) => `“${t.trim()}” doesn’t look like a postcode. Try one like RG1 or RG1 8FR.`,
  northernIreland: () => 'Roadteller covers Great Britain. The police in Northern Ireland publish their own figures.',
  // Only the first half is named, as that's what wasn't found (fresh look 2.3).
  notFound: (t) => {
    const c = t.toUpperCase().replace(/\s+/g, '');
    const m = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})?$/.exec(c);
    return `We can’t find the postcode district “${m ? m[1] : t.trim().toUpperCase()}”. Check it and try again.`;
  },
};

// Where a chosen place is: its position, how to name it, its council area, and a note when a full postcode wasn't found.
export type Located = { lat: number; lon: number; label: string; council: string | null; note?: string };
export async function locate(w: Place, ix: PageIndex, places: () => Promise<PlaceIndex | null>): Promise<Located | null> {
  if (w.kind === 'place') {
    const p = await places();
    const f = p ? findPlace(p, w.place, w.at) : null;
    if (!f || !f.ok) return null;
    return { lat: f.place.lat, lon: f.place.lon, label: placeLabel(f.place), council: ix.codes[f.place.council] ?? null };
  }
  const d = ix.outcodes[w.outcode];
  if (!d) return null;
  const [lat, lon, town, ci] = d;
  const district = { lat, lon, label: `${w.outcode} (${town})`, council: ix.codes[ci] ?? null };
  if (!w.inward) return district;
  const area = /^[A-Z]+/.exec(w.outcode)![0];
  const file = await loadPostcodeArea(area);
  const pos = file.districts[w.outcode] ? decodeDistrict(file.districts[w.outcode]).get(w.inward) : undefined;
  if (!pos) return { ...district, note: `We couldn’t find ${w.outcode} ${w.inward} (it may be new, or mistyped), so the circle is round the middle of ${w.outcode}.` };
  const exception = file.council[w.outcode]?.[w.inward];
  return { lat: pos[0], lon: pos[1], label: `${w.outcode} ${w.inward}`, council: exception !== undefined ? ix.codes[exception] : district.council };
}
