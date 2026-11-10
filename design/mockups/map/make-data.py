"""Real figures for the stage 5 map options (design only): collisions 2021 to 2025 in 250 m squares within a mile of
the middle of RG14, and in 1 km squares in West Berkshire, with the roads, the boundary and place names to draw them on.
python3 -I design/mockups/map/make-data.py DL design/mockups/map/map-data.json"""
import csv, json, math, sys
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, Point, box, LineString
from shapely.ops import unary_union

DL, OUT = sys.argv[1], sys.argv[2]
REPO = __file__.rsplit('/design/', 1)[0]
to_bng = Transformer.from_crs(4326, 27700, always_xy=True)

lat, lon, *_ = json.load(open(f'{REPO}/data/os/outcodes.json'))['outcodes']['RG14']
cx, cy = to_bng.transform(lon, lat)
R = 1609.344

bl = shapefile.Reader(f'{DL}/bl/Data/GB/district_borough_unitary_region.shp')
names = [f[0] for f in bl.fields[1:]]
wb = None
for sr in bl.iterShapeRecords():
    rec = dict(zip(names, sr.record))
    if rec.get('CODE') == 'E06000037':
        wb = shape(sr.shape.__geo_interface__)
assert wb is not None
wb_s = wb.simplify(25)

circle = Point(cx, cy).buffer(R, 128)
cpts, wpts = [], []
with open(f'{DL}/collision.csv', newline='') as f:
    for r in csv.DictReader(f):
        if not 2021 <= int(r['collision_year']) <= 2025: continue
        try: x, y = float(r['location_easting_osgr']), float(r['location_northing_osgr'])
        except ValueError: continue
        if (x - cx) ** 2 + (y - cy) ** 2 <= R * R: cpts.append((x, y))
        if wb.bounds[0] <= x <= wb.bounds[2] and wb.bounds[1] <= y <= wb.bounds[3] and wb.contains(Point(x, y)): wpts.append((x, y))

def cells(pts, size, clip):
    out = {}
    for x, y in pts:
        k = (int(x // size), int(y // size)); out[k] = out.get(k, 0) + 1
    res = []
    for (i, j), n in out.items():
        sq = box(i * size, j * size, (i + 1) * size, (j + 1) * size)
        whole = clip.contains(sq)
        mid = sq.centroid if whole else sq.intersection(clip).representative_point()
        res.append({'x': i * size, 'y': j * size, 'n': n, 'whole': whole, 'mx': round(mid.x), 'my': round(mid.y)})
    return res

def all_cells(size, clip):  # every square touching the area, for the empty grid
    x0, y0, x1, y1 = clip.bounds; out = []
    for i in range(int(x0 // size), int(x1 // size) + 1):
        for j in range(int(y0 // size), int(y1 // size) + 1):
            if clip.intersects(box(i * size, j * size, (i + 1) * size, (j + 1) * size)): out.append([i * size, j * size])
    return out

def ring(g):
    gs = getattr(g, 'geoms', [g])
    return [[[round(x), round(y)] for x, y in p.exterior.coords] for p in gs]

def roads(bbox, classes, tol):
    r = shapefile.Reader(f'{DL}/or/data/SU_RoadLink.shp')
    fn = [f[0] for f in r.fields[1:]]
    ci, ni, mi = fn.index('class'), fn.index('roadNumber'), fn.index('name1')
    bx = box(*bbox); out = []
    for i, shp in enumerate(r.iterShapes()):
        b = shp.bbox
        if b[2] < bbox[0] or b[0] > bbox[2] or b[3] < bbox[1] or b[1] > bbox[3]: continue
        rec = r.record(i); k = rec[ci]
        kind = 'm' if k == 'Motorway' else 'a' if k == 'A Road' else 'b' if k == 'B Road' else 'minor'
        if kind not in classes: continue
        ln = LineString(shp.points).intersection(bx)
        if ln.is_empty: continue
        for part in getattr(ln, 'geoms', [ln]):
            if part.geom_type != 'LineString': continue
            part = part.simplify(tol)
            out.append({'k': kind, 'no': rec[ni], 'pts': [[round(x), round(y)] for x, y in part.coords]})
    return out

pl = json.load(open(f'{REPO}/data/os/places.json'))['places']
def places(clip, kinds):
    out = []
    for p in pl:
        if p[5] not in kinds: continue
        x, y = to_bng.transform(p[4], p[3])
        if clip.contains(Point(x, y)): out.append({'name': p[0], 'kind': p[5], 'x': round(x), 'y': round(y)})
    return out

pad = 150
cb = (cx - R - pad, cy - R - pad, cx + R + pad, cy + R + pad)
data = {
    'circle': {'label': 'within a mile of the middle of RG14 (Newbury)', 'cx': round(cx), 'cy': round(cy), 'r': R, 'n': len(cpts), 'size': 250,
               'cells': cells(cpts, 250, circle), 'grid': all_cells(250, circle), 'bbox': [round(v) for v in cb],
               'roads': roads(cb, {'m', 'a', 'b', 'minor'}, 3), 'places': places(Point(cx, cy).buffer(R * 0.93), {'t', 's', 'v'})},
    'council': {'label': 'West Berkshire', 'n': len(wpts), 'size': 1000, 'outline': ring(wb_s),
                'cells': cells(wpts, 1000, wb), 'grid': all_cells(1000, wb), 'bbox': [round(v) for v in wb.bounds],
                'roads': roads(wb.bounds, {'m', 'a', 'b'}, 25), 'places': places(wb, {'t', 'c', 'v'})},
}
json.dump(data, open(OUT, 'w'), separators=(',', ':'))
for k, v in data.items():
    ns = sorted(c['n'] for c in v['cells'])
    print(k, 'collisions', v['n'], 'squares with any', len(ns), 'of', len(v['grid']), 'max', ns[-1], 'median', ns[len(ns) // 2], 'roads', len(v['roads']), 'places', len(v['places']))
