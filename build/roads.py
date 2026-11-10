"""Roads to draw maps on (SPEC §8.1, the map of shaded squares), from OS Open Roads:

- local/<sx>-<sy>.json: every road in each 10 km square of the OS grid, for circles (drawn under the squares, with the
  A-roads and motorways in white on top), simplified to 4 metres;
- main/<sx>-<sy>.json: motorways, A-roads and B-roads in each 50 km square, for council areas, simplified to 25 metres.

Each file: {"sq": [sx, sy], "size": metres, "k": "mabn...", "l": [[x0, y0, dx, dy, ...], ...]}, one letter per line
(m motorway, a A-road, b B-road, n other), positions in whole metres from the square's corner, then steps in metres.
Lines are cut at the square's edge. Road numbers for labels: "no": {line index: "A4"} for motorways and A-roads.

python3 -I build/roads.py DL data
"""
import glob, json, os, sys
import shapefile
from shapely.geometry import LineString, box

DL, OUT = sys.argv[1], sys.argv[2]
KIND = {'Motorway': 'm', 'A Road': 'a', 'B Road': 'b'}
LAYERS = {'local': (10_000, 4, 'mabn'), 'main': (50_000, 25, 'mab')}


def encode(coords, ox, oy):
    pts = [(round(x - ox), round(y - oy)) for x, y in coords]
    out = [pts[0][0], pts[0][1]]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        if (bx, by) != (ax, ay):
            out += [bx - ax, by - ay]
    return out if len(out) >= 4 else None


tiles = {name: {} for name in LAYERS}
files = sorted(glob.glob(f'{DL}/or-all/data/*_RoadLink.shp'))
for path in files:
    r = shapefile.Reader(path, encodingErrors='replace')
    names = [f[0] for f in r.fields[1:]]
    ci, ni = names.index('class'), names.index('roadNumber')
    for shp, rec in zip(r.iterShapes(), r.iterRecords()):
        k = KIND.get(rec[ci], 'n')
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
