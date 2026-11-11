// Wording rules for figures (HOUSE-STYLE §15, and John's choices on option B, November 9th 2026).
const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
export const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
/** one to nine in words, 10 and up as digits */
export const word = (n: number) => (Number.isInteger(n) && n >= 0 && n < 10 ? W[n] : fmt(n));
export const Word = (n: number) => {
  const w = word(n);
  return w[0].toUpperCase() + w.slice(1);
};
export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
export const cap1 = (t: string) => t[0].toUpperCase() + t.slice(1);

/** "14.0 million miles": a rate (collisions per 100 million vehicle miles) as the miles driven for each collision.
 * Less than a million, to the nearest 10,000: "260,000 miles" (John, fresh look 3.5). */
export const perMiles = (rate: number) => {
  const m = 100 / rate;
  return m < 0.95 ? `${fmt(Math.max(1, Math.round(m * 100)) * 10000)} miles` : `${m.toFixed(1)} million miles`;
};

/** A council area's name in a sentence ("the Isles of Scilly"), at the start of one ("The Isles of Scilly"), and with
 * "'s" ("St Helens’", John, fresh look 3.2). */
export const named = (f: { name?: string; the?: boolean }) => `${f.the ? 'the ' : ''}${f.name ?? ''}`;
export const Named = (f: { name?: string; the?: boolean }) => cap1(named(f));
export const poss = (f: { name?: string; the?: boolean }) => {
  const n = named(f);
  return n.endsWith('s') ? `${n}’` : `${n}’s`;
};
/** "person" or "people" */
export const people = (n: number) => (n === 1 ? 'person' : 'people');

/** The nearest of a quarter, a third, half … three times, for a ratio */
export function shareWords(r: number): string {
  const opts: [number, string][] = [
    [0.25, 'about a quarter of'], [1 / 3, 'about a third of'], [0.5, 'about half'], [2 / 3, 'about two thirds of'],
    [0.75, 'about three quarters of'], [1, 'about the same as'], [1.25, 'about a quarter more than'],
    [1.5, 'about half as much again as'], [2, 'about twice'], [3, 'about three times'],
  ];
  // From about three and a half times, the number itself: "about 17 times" (John, fresh look 3.1).
  if (r >= 3.5) return `about ${word(Math.round(r))} times`;
  return [...opts].sort((a, b) => Math.abs(Math.log(a[0] / r)) - Math.abs(Math.log(b[0] / r)))[0][1];
}

/** John's comparison wording (round 3): "About a third of … (37%)", "9% lower than …", "44% higher than …", "About twice … (204%)" */
export function compareText(r: number, what: string): string {
  const p = Math.round(r * 100);
  if (r >= 1.95) return `${cap1(shareWords(r))} ${what} (${p}%)`;
  if (r >= 1.05) return `${p - 100}% higher than ${what}`;
  if (r > 0.95) return `About the same as ${what} (${p}%)`;
  // Below, the same as above down to 70% (John, November 10th 2026): "9% lower than …"; less than that, words.
  if (r >= 0.695) return `${100 - p}% lower than ${what}`;
  return `${cap1(shareWords(r))} ${what} (${p}%)`;
}

/** "5pm to 6pm", "midnight to 1am" */
export function hourText(h: number): string {
  const f = (x: number) => (x === 0 ? 'midnight' : x === 12 ? 'midday' : `${x % 12}${x < 12 ? 'am' : 'pm'}`);
  return `${f(h)} to ${f((h + 1) % 24)}`;
}
export const fall = (a: number, b: number) => Math.round(100 * (1 - b / a));
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const USER_WORDS: Record<string, string> = { car: 'in cars', walking: 'walking', cycling: 'cycling', motorcycle: 'on motorcycles', other: 'others' };
