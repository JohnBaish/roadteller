"""Which council area each postcode, postcode district and place is in.

python3 -I build/lookup.py <DL> <data folder>

The page needs this to offer "See all of …" beside a circle, without a boundary
file. Written as data/councils-of.json:
  districts: {"RG4": index, …}         the council most of a district's postcodes are in
  postcodes: {"RG4": {"7HN": index}}   postcodes in a different council from their district's
  places:    [index, …]                one per row of data/os/places.json
  codes:     ["E06000037", …]          what each index means
"""
import sys, json, glob, os
from collections import Counter, defaultdict
import numpy as np
from pyproj import Transformer
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *

DL, OUT = sys.argv[1:3]
C = Councils(DL)
to_grid = Transformer.from_crs('EPSG:4326', 'EPSG:27700', always_xy=True)
STEP = 1e4

def decode(s):
    start, _, rest = s.partition('|')
    lat, lon = map(int, start.split(','))
    out = []
    for part in rest.split(';') if rest else []:
        inward = part[:3]
        d_lat, d_lon = map(int, part[3:].split(','))
        lat += d_lat; lon += d_lon
        out.append((inward, lat / STEP, lon / STEP))
    return out

rows = []    # (district, inward, lat, lon)
for path in sorted(glob.glob(f'{OUT}/os/postcodes/*.json')):
    for district, s in json.load(open(path)).items():
        for inward, lat, lon in decode(s):
            rows.append((district, inward, lat, lon))
lat = np.array([r[2] for r in rows]); lon = np.array([r[3] for r in rows])
x, y = to_grid.transform(lon, lat)
codes = C.assign(x, y)
by_district = defaultdict(Counter)
for (district, inward, _, _), c in zip(rows, codes):
    if c: by_district[district][c] += 1
usual = {d: cnt.most_common(1)[0][0] for d, cnt in by_district.items()}
# districts with no placed postcode (rare): their middle
outcodes = json.load(open(f'{OUT}/os/outcodes.json'))['outcodes']
for d, v in outcodes.items():
    if d not in usual:
        la, lo = (v[0], v[1]) if isinstance(v, list) else (v['lat'], v['lon'])
        ex, ny = to_grid.transform(lo, la)
        c = C.assign([ex], [ny])[0]
        if c: usual[d] = c
code_list = sorted(set(usual.values()) | set(c for c in codes if c))
ix = {c: i for i, c in enumerate(code_list)}
exceptions = defaultdict(dict)
for (district, inward, _, _), c in zip(rows, codes):
    if c and usual.get(district) != c:
        exceptions[district][inward] = ix[c]
places = json.load(open(f'{OUT}/os/places.json'))['places']
px, py = to_grid.transform(np.array([p[4] for p in places]), np.array([p[3] for p in places]))
pc = C.assign(px, py)
out = dict(note=__doc__.strip().splitlines()[0], codes=code_list,
           districts={d: ix[c] for d, c in sorted(usual.items())},
           postcodes={d: v for d, v in sorted(exceptions.items())},
           places=[ix[c] if c else -1 for c in pc])
dump(out, f'{OUT}/councils-of.json')
n_ex = sum(len(v) for v in exceptions.values())
print(f'{len(rows):,} postcodes, {len(usual):,} districts, {n_ex:,} postcodes outside their district\'s council, '
      f'{sum(1 for c in pc if not c)} places unplaced, {os.path.getsize(f"{OUT}/councils-of.json") // 1024} KB')
