// A road line written as text by build/roads.py: each number zigzagged and written five bits to a character.
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

