// Lists of whole numbers written as text by build/roads.py and build/common.py (pack_square): each number zigzagged and written five bits to a character.
const CODE = '#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abc';
const VALUE = new Map([...CODE].map((c, i) => [c, i]));
export const unpack = (t: string) => {
  const nums: number[] = [];
  let z = 0, shift = 0;
  for (const c of t) {
    const v = VALUE.get(c)!;
    if (v < 32) { z += v * 2 ** shift; shift += 5; continue; }
    z += (v - 32) * 2 ** shift;
    nums.push(z % 2 ? -(z + 1) / 2 : z / 2);
    z = 0; shift = 0;
  }
  return nums;
};


// A circle file's lists come as text (build/tiles.py); turn them back into numbers. Older files hold plain lists.
type Packed = { recent: (number[] | string)[]; history: [number, number[] | string, number[] | string][]; stretches?: { line: number[] | string }[] };
const nums = (v: number[] | string) => (typeof v === 'string' ? unpack(v) : v);
export function unpackSquare<T>(f: T): T {
  const p = f as unknown as Packed;
  if (p.recent) p.recent = p.recent.map(nums);
  p.history = p.history.map(([y, k, c]) => [y, nums(k), nums(c)]);
  for (const s of p.stretches ?? []) s.line = nums(s.line);
  return f;
}
