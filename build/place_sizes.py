"""How big each place is, as the number of postcodes nearer to it than to any other place (John, November 10th 2026).

OS Open Names gives no sizes, so a council area's map named the first villages in the alphabet. This counts, for every
postcode in Great Britain (data/os/postcodes), the nearest city, town, suburb or village (data/os/places.json), and
writes data/place-sizes.json: one number per place, in the same order as places.json. The map then names the biggest.

    python3 -I build/place_sizes.py data
"""
import json, math, os, sys
from collections import defaultdict

DATA = sys.argv[1] if len(sys.argv) > 1 else 'data'
places = json.load(open(f'{DATA}/os/places.json'))['places']
CELL = 2000  # metres; each postcode looks in its own cell and the eight round it, then wider if none are there


def xy(lat, lon):  # metres on a flat map good enough for "nearest" within a few kilometres
    return lon * 111320 * math.cos(math.radians(lat)), lat * 110574


grid = defaultdict(list)
pts = []
for i, p in enumerate(places):
    x, y = xy(p[3], p[4])
    pts.append((x, y))
    grid[(int(x // CELL), int(y // CELL))].append(i)

sizes = [0] * len(places)
seen = 0
for name in sorted(n for n in os.listdir(f'{DATA}/os/postcodes') if n.endswith('.json')):
    for s in json.load(open(f'{DATA}/os/postcodes/{name}')).values():
        start, _, rest = s.partition('|')
        lat, lon = (int(v) for v in start.split(','))
        for part in rest.split(';') if rest else []:
            dl, dn = part[3:].split(',')
            lat += int(dl)
            lon += int(dn)
            x, y = xy(lat / 1e4, lon / 1e4)
            cx, cy = int(x // CELL), int(y // CELL)
            best, bd = -1, 1e18
            for ring in (1, 3):
                for gx in range(cx - ring, cx + ring + 1):
                    for gy in range(cy - ring, cy + ring + 1):
                        for i in grid.get((gx, gy), ()):
                            d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2
                            if d < bd:
                                best, bd = i, d
                if best >= 0:
                    break
            if best >= 0:
                sizes[best] += 1
            seen += 1

with open(f'{DATA}/place-sizes.json', 'w') as f:
    json.dump({'note': 'Postcodes nearer to each place than to any other, in the order of data/os/places.json (build/place_sizes.py).',
               'postcodes': seen, 'sizes': sizes}, f, separators=(',', ':'))
print(seen, 'postcodes;', sum(1 for s in sizes if s), 'places with any')
