"""Roads to draw maps on (SPEC §8.1, the map of shaded squares), from OS Open Roads:

- local/<sx>-<sy>.json: every road in each 10 km square of the OS grid, for circles (drawn under the squares, with the
  A-roads and motorways in white on top), simplified to 4 metres;
- main/<sx>-<sy>.json: motorways, A-roads and B-roads in each 50 km square, for council areas, simplified to 25 metres.

Each file: {"sq": [sx, sy], "size": metres, "k": "mabn...", "l": ["...", ...]}, one letter per line
(m motorway, a A-road, b B-road, n other). Each line is text: the start in whole metres from the square's corner, then
steps in metres, each number zigzagged (0, -1, 1, -2 ... as 0, 1, 2, 3 ...) and written five bits to a character, low
bits first, characters from CODE: the first 32 carry on to the next character, the last 32 end the number. This is
about half the size of a list of numbers. Private and service roads (OS's "Restricted Local Access Road" and
"Secondary Access Road": driveways, tracks, car parks) are left out of the local layer to keep the files small.
Lines are cut at the square's edge. Road numbers for labels: "no": {line index: "A4"} for motorways and A-roads.

python3 -I build/roads.py DL data
"""
import glob, json, os, sys
import shapefile
from shapely.geometry import LineString, box

DL, OUT = sys.argv[1], sys.argv[2]
KIND = {'Motorway': 'm', 'A Road': 'a', 'B Road': 'b'}
LAYERS = {'local': (10_000, 4, 'mabn'), 'main': (50_000, 25, 'mab')}
LEFT_OUT = {'Restricted Local Access Road', 'Secondary Access Road'}
# 64 characters with no quote or backslash, so JSON needn't escape them (also in src/components/SquaresMap.tsx).
CODE = ''.join(chr(c) for c in range(35, 127) if chr(c) != '\\')[:64]


def text(nums):
    out = []
    for d in nums:
        z = d * 2 if d >= 0 else -d * 2 - 1
        while z >= 32:
            out.append(CODE[z & 31])
            z >>= 5
        out.append(CODE[32 + z])
    return ''.join(out)


def encode(coords, ox, oy):
    pts = [(round(x - ox), round(y - oy)) for x, y in coords]
    out = [pts[0][0], pts[0][1]]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        if (bx, by) != (ax, ay):
            out += [bx - ax, by - ay]
    return text(out) if len(out) >= 4 else None


tiles = {name: {} for name in LAYERS}
files = sorted(glob.glob(f'{DL}/or-all/data/*_RoadLink.shp'))
for path in files:
    r = shapefile.Reader(path, encodingErrors='replace')
    names = [f[0] for f in r.fields[1:]]
    ci, ni, fi = names.index('class'), names.index('roadNumber'), names.index('function')
    for shp, rec in zip(r.iterShapes(), r.iterRecords()):
        k = KIND.get(rec[ci], 'n')
        if rec[fi] in LEFT_OUT:
            continue
        line = LineString(shp.points)
        x0, y0, x1, y1 = line.bounds
        for name, (size, tol, kinds) in LAYERS.items():
            if k not in kinds:
                continue
            simple = line.simplify(tol)
            for sx in range(int(x0 // size), int(x1 // size) + 1):
                for sy in range(int(y0 // size), int(y1 // size) + 1):
                    sq = box(sx * size, sy * size, (sx + 1) * size, (sy + 1) * size)
                    part = simple if sq.contains(simple) else simple.intersection(sq)
                    for p in getattr(part, 'geoms', [part]):
                        if p.is_empty or p.geom_type != 'LineString':
                            continue
                        enc = encode(p.coords, sx * size, sy * size)
                        if not enc:
                            continue
                        t = tiles[name].setdefault((sx, sy), {'k': [], 'l': [], 'no': {}})
                        if k in 'ma' and rec[ni]:
                            t['no'][len(t['l'])] = rec[ni]
                        t['k'].append(k)
                        t['l'].append(enc)
    print(os.path.basename(path), {n: len(t) for n, t in tiles.items()}, flush=True)

for name, (size, _, _) in LAYERS.items():
    folder = f'{OUT}/roads-{name}'
    os.makedirs(folder, exist_ok=True)
    for f in glob.glob(f'{folder}/*.json'):
        os.remove(f)
    total = 0
    for (sx, sy), t in tiles[name].items():
        doc = {'sq': [sx, sy], 'size': size, 'k': ''.join(t['k']), 'l': t['l'], 'no': t['no']}
        p = f'{folder}/{sx}-{sy}.json'
        with open(p, 'w') as fh:
            json.dump(doc, fh, separators=(',', ':'))
        total += os.path.getsize(p)
    print(name, len(tiles[name]), 'files', round(total / 1e6, 1), 'MB')
