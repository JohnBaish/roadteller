"""Riskreckoner data test: match STATS19 injury collisions to DfT road stretches,
with stretches rebuilt along OS Open Roads where possible.

Usage: python3 -I match.py <dl folder> <ONS district code> <label> <out.json>
"""
import sys, json, csv, heapq, math, statistics
from collections import defaultdict
import shapefile
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree

DL, CODE, LABEL, OUT = sys.argv[1:5]
YEARS = range(2021, 2026)
SNAP = 500        # metres: furthest a collision may be from a stretch of its road
JUNCTION = 60     # metres: within this of the nearest stretch's end, with another stretch as close -> half and half
TOLERANCE = 0.20  # a rebuilt stretch's length must be within 20% of DfT's own length

# ---- collisions in the area -------------------------------------------------
cols = []
with open(f'{DL}/collision.csv', newline='') as f:
    for r in csv.DictReader(f):
        if r['local_authority_ons_district'] != CODE:
            continue
        try:
            e, n = float(r['location_easting_osgr']), float(r['location_northing_osgr'])
        except ValueError:
            continue
        cls = int(r['first_road_class']); num = r['first_road_number']
        road = None
        if cls in (1, 2, 3) and num not in ('0', '-1', ''):
            road = ('M' if cls == 1 else 'A') + num + ('(M)' if cls == 2 else '')
        cols.append(dict(id=r['collision_index'], e=e, n=n, road=road, cls=cls,
                         sev=int(r['collision_severity']), rural=r['urban_or_rural_area'] == '2',
                         adj_serious=float(r['collision_adjusted_severity_serious'] or 0)))
minx = min(c['e'] for c in cols) - 5000; maxx = max(c['e'] for c in cols) + 5000
miny = min(c['n'] for c in cols) - 5000; maxy = max(c['n'] for c in cols) + 5000

# ---- traffic: AADF by count point and year -----------------------------------
aadf = defaultdict(dict); length_km = {}; cp_la = {}; cp_road = {}
with open(f'{DL}/aadf/dft_traffic_counts_aadf.csv', newline='') as f:
    for r in csv.DictReader(f):
        y = int(r['year'])
        if y not in YEARS:
            continue
        cp = int(r['count_point_id'])
        if r['all_motor_vehicles'] in ('', 'NA'): continue
        aadf[cp][y] = (float(r['all_motor_vehicles']), r['estimation_method'])
        if r['link_length_km'] not in ('', 'NA'):
            length_km[cp] = float(r['link_length_km'])
        cp_la[cp] = r['local_authority_name']; cp_road[cp] = r['road_name']

# ---- DfT stretches (straight lines) in the box -----------------------------
mr = shapefile.Reader(f'{DL}/mrdb/MRDB_2025_published2')
stretches = []
for sr in mr.iterShapeRecords():
    pts = sr.shape.points
    if not pts:
        continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    if max(xs) < minx or min(xs) > maxx or max(ys) < miny or min(ys) > maxy:
        continue
    cp = int(sr.record['CP_Number'])
    stretches.append(dict(cp=cp, road=sr.record['RoadNumber'], straight=LineString(pts)))

# ---- OS Open Roads, links of numbered roads in the box ----------------------
osr = shapefile.Reader(f'{DL}/or/data/SU_RoadLink')
links = defaultdict(list)    # road number -> [(start, end, length, geom)]
idx = {f.name: i - 1 for i, f in enumerate(osr.fields)}
for sr in osr.iterShapeRecords(fields=['roadNumber', 'startNode', 'endNode', 'length']):
    rn = sr.record['roadNumber'] or '-'
    b = sr.shape.bbox
    if b[2] < minx or b[0] > maxx or b[3] < miny or b[1] > maxy:
        continue
    links[rn].append((sr.record['startNode'], sr.record['endNode'], float(sr.record['length']), sr.shape.points))

import os
FALLBACK = os.environ.get('RR_FALLBACK') == '1'
ALL = [(a, b, ln, pts, rn) for rn, LL in links.items() for a, b, ln, pts in LL]

def rebuild(st):
    if FALLBACK:
        r = rebuild_strict(st)
        return r if r is not None else rebuild_loose(st)
    return rebuild_strict(st)

def rebuild_loose(st):
    """Ends snapped to the same-number road up to 2.5km away; path may use other roads at 4x cost."""
    same = links.get(st['road'])
    if not same:
        return None
    nodexy_same = {}
    for a, b, ln, pts in same:
        nodexy_same[a] = pts[0]; nodexy_same[b] = pts[-1]
    (x0, y0), (x1, y1) = st['straight'].coords[0], st['straight'].coords[-1]
    def near(x, y):
        k = min(nodexy_same, key=lambda k: (nodexy_same[k][0]-x)**2 + (nodexy_same[k][1]-y)**2)
        return k, math.dist(nodexy_same[k], (x, y))
    s, ds = near(x0, y0); t, dt = near(x1, y1)
    if ds > 2500 or dt > 2500 or s == t:
        return None
    lo = st['straight'].bounds
    graph = defaultdict(list)
    for a, b, ln, pts, rn in ALL:
        if pts[0][0] < lo[0]-3000 or pts[0][0] > lo[2]+3000 or pts[0][1] < lo[1]-3000 or pts[0][1] > lo[3]+3000:
            continue
        w = ln if rn == st['road'] else ln * 4
        graph[a].append((b, w, ln, pts)); graph[b].append((a, w, ln, pts[::-1]))
    dist = {s: 0}; real = {s: 0}; prev = {}; pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t: break
        if d > dist[u]: continue
        for v, w, ln, pts in graph[u]:
            nd = d + w
            if nd < dist.get(v, 1e18):
                dist[v] = nd; real[v] = real[u] + ln; prev[v] = (u, pts); heapq.heappush(pq, (nd, v))
    if t not in dist: return None
    coords = []; v = t
    while v != s:
        u, pts = prev[v]; coords = list(pts) + coords[1:]; v = u
    return LineString(coords), real[t]

def rebuild_strict(st):
    """Shortest path along links carrying the same number, between the nodes nearest
    each end of DfT's straight line. Returns (geom, length_m) or None."""
    L = links.get(st['road'])
    if not L:
        return None
    graph = defaultdict(list); nodexy = {}
    for a, b, ln, pts in L:
        graph[a].append((b, ln, pts)); graph[b].append((a, ln, pts[::-1]))
        nodexy[a] = pts[0]; nodexy[b] = pts[-1]
    (x0, y0), (x1, y1) = st['straight'].coords[0], st['straight'].coords[-1]
    def near(x, y):
        k = min(nodexy, key=lambda k: (nodexy[k][0]-x)**2 + (nodexy[k][1]-y)**2)
        return k, math.dist(nodexy[k], (x, y))
    s, ds = near(x0, y0); t, dt = near(x1, y1)
    if ds > 300 or dt > 300 or s == t:
        return None
    dist = {s: 0}; prev = {}; pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t:
            break
        if d > dist[u]:
            continue
        for v, ln, pts in graph[u]:
            nd = d + ln
            if nd < dist.get(v, 1e18):
                dist[v] = nd; prev[v] = (u, pts); heapq.heappush(pq, (nd, v))
    if t not in dist:
        return None
    coords = []; v = t
    while v != s:
        u, pts = prev[v]; coords = list(pts) + coords[1:]; v = u
    return LineString(coords), dist[t]

stats = dict(stretches=0, rebuilt=0, kept_straight=0, kept_reasons=defaultdict(int))
for st in stretches:
    km = length_km.get(st['cp'])
    st['dft_m'] = km * 1000 if km else st['straight'].length
    st['geom'] = st['straight']; st['rebuilt'] = False
    res = rebuild(st)
    if res is None:
        st['why'] = 'no path'
    else:
        g, ln = res
        if abs(ln - st['dft_m']) <= TOLERANCE * st['dft_m']:
            st['geom'] = g; st['rebuilt'] = True; st['why'] = ''
        else:
            st['why'] = 'length differs'
    st['ratio_straight'] = st['straight'].length / st['dft_m'] if st['dft_m'] else None

# vehicle miles (millions) over the five years, DfT's link length
for st in stretches:
    yrs = aadf.get(st['cp'], {})
    km = length_km.get(st['cp'])
    st['mvm'] = sum(v[0] * 365 * km * 0.621371 for v in yrs.values()) / 1e6 if km else 0
    st['years'] = len(yrs)
    st['counted'] = sum(1 for v in yrs.values() if v[1] == 'Counted')

# ---- matching -----------------------------------------------------------------
by_road = defaultdict(list)
for i, st in enumerate(stretches):
    by_road[st['road']].append(i)

def match(c, key):
    if not c['road']:
        return ('minor', [], None)
    cand = by_road.get(c['road'], [])
    p = Point(c['e'], c['n'])
    ds = sorted((stretches[i][key].distance(p), i) for i in cand)
    if not ds or ds[0][0] > SNAP:
        return ('unmatched', [], ds[0][0] if ds else None)
    g = stretches[ds[0][1]][key]
    along = g.project(p)
    if len(ds) > 1 and ds[1][0] <= ds[0][0] + JUNCTION and min(along, g.length - along) <= JUNCTION:
        return ('junction', [ds[0][1], ds[1][1]], ds[0][0])
    return ('one', [ds[0][1]], ds[0][0])

out = dict(label=LABEL, code=CODE, collisions=len(cols))
for key in ('straight', 'geom'):
    tally = defaultdict(int); dists = []; per = defaultdict(float)
    for c in cols:
        kind, ids, d = match(c, key)
        tally[kind] += 1
        if d is not None and kind != 'unmatched':
            dists.append(d)
        for i in ids:
            per[i] += 1 / len(ids)
        c['m_' + key] = (kind, ids)
    out[key] = dict(tally=dict(tally), median_m=round(statistics.median(dists), 1) if dists else None)
    for i, st in enumerate(stretches):
        st['n_' + key] = per.get(i, 0)

# stretches touching the area: those with a matched collision or a count point in the area
la_name = {'E06000037': 'West Berkshire', 'E06000038': 'Reading'}.get(CODE)
area = [st for i, st in enumerate(stretches) if st['n_geom'] > 0 or st['n_straight'] > 0 or cp_la.get(st['cp']) == la_name]
moved = 0; on_roads = 0
for c in cols:
    a, b = c['m_straight'], c['m_geom']
    if a[0] in ('one', 'junction') or b[0] in ('one', 'junction'):
        on_roads += 1
        if set(a[1]) != set(b[1]):
            moved += 1
out['moved'] = moved; out['on_numbered'] = on_roads
out['stretches'] = len(area)
out['rebuilt'] = sum(st['rebuilt'] for st in area)
out['kept'] = {}
for st in area:
    if not st['rebuilt']:
        out['kept'][st['why']] = out['kept'].get(st['why'], 0) + 1
rows = []
for st in area:
    rows.append(dict(cp=st['cp'], road=st['road'], la=cp_la.get(st['cp']),
                     from_=None, dft_km=round(st['dft_m'] / 1000, 2),
                     straight_km=round(st['straight'].length / 1000, 2),
                     rebuilt=st['rebuilt'], why=st['why'], mvm=round(st['mvm'], 1),
                     counted_years=st['counted'],
                     n_straight=st['n_straight'], n_geom=st['n_geom'],
                     rate_straight=round(st['n_straight'] / st['mvm'], 3) if st['mvm'] and st['n_straight'] >= 10 else None,
                     rate_geom=round(st['n_geom'] / st['mvm'], 3) if st['mvm'] and st['n_geom'] >= 10 else None))
out['rows'] = sorted(rows, key=lambda r: -r['n_geom'])
ten = [r for r in rows if r['n_geom'] >= 10 or r['n_straight'] >= 10]
out['ten_plus'] = len(ten)
out['big_change'] = [r for r in ten if r['rate_straight'] and r['rate_geom'] and abs(r['rate_geom'] - r['rate_straight']) / r['rate_straight'] > 0.2]
out['crossed_threshold'] = [r for r in ten if (r['rate_straight'] is None) != (r['rate_geom'] is None)]
out['rural_share'] = round(sum(c['rural'] for c in cols) / len(cols), 3)
out['minor'] = sum(1 for c in cols if not c['road'])
# whole-road rates, rebuilt matching
road_tot = defaultdict(lambda: [0.0, 0.0])
for st in area:
    road_tot[st['road']][0] += st['n_geom']; road_tot[st['road']][1] += st['mvm']
out['roads'] = sorted([dict(road=k, n=round(v[0], 1), mvm=round(v[1], 1),
                            rate=round(v[0] / v[1], 3) if v[1] and v[0] >= 10 else None)
                       for k, v in road_tot.items()], key=lambda r: -(r['rate'] or 0))
json.dump(out, open(OUT, 'w'), indent=1, default=str)
print(json.dumps({k: v for k, v in out.items() if k not in ('rows',)}, indent=1, default=str))
