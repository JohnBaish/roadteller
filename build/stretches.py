"""Rebuild DfT's stretches along the real road, and match collisions to them.

python3 -I build/stretches.py <DL> <WORK>

Writes WORK/stretches.pkl (every stretch with its geometry, traffic and matched
collisions over the latest five years) and WORK/stretches-report.json.
Rules as agreed in SPEC §4: nearest stretch of the same road within 500 m; half to
each within 60 m of an end with another stretch within 60 m more; stretches rebuilt
from OS Open Roads, kept only within 20% of DfT's length.
"""
import sys, json, time, glob, heapq, math, pickle
from collections import defaultdict, Counter
import numpy as np
import pandas as pd
import shapely
import shapefile
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *

DL, WORK = sys.argv[1:3]
SNAP, JUNCTION, TOLERANCE = 500, 60, 0.20
STRICT_SNAP, LOOSE_SNAP, LOOSE_PAD, LOOSE_COST = 300, 2500, 3000, 4
t0 = time.time()
def log(*a): print(f'[{time.time() - t0:6.0f}s]', *a, flush=True)
FILES = sorted(glob.glob(f'{DL}/or-all/data/*_RoadLink.shp'))

# ---- DfT stretches and their traffic ------------------------------------------------
mr = shapefile.Reader(f'{DL}/mrdb/MRDB_2025_published2')
st = []
for sr in mr.iterShapeRecords():
    if sr.shape.points:
        st.append(dict(cp=int(sr.record['CP_Number']), road=sr.record['RoadNumber'],
                       straight=np.array(sr.shape.points)))
a = pd.read_csv(f'{DL}/aadf/dft_traffic_counts_aadf.csv', low_memory=False,
                usecols=['count_point_id', 'year', 'local_authority_code', 'road_name', 'road_category',
                         'start_junction_road_name', 'end_junction_road_name', 'link_length_km',
                         'all_motor_vehicles', 'estimation_method'])
a = a[a.year.isin(FIVE)].copy()
a['all_motor_vehicles'] = pd.to_numeric(a.all_motor_vehicles, errors='coerce')
a['link_length_km'] = pd.to_numeric(a.link_length_km, errors='coerce')
a = a.dropna(subset=['all_motor_vehicles', 'link_length_km'])
a['mvm'] = a.all_motor_vehicles * 365 * a.link_length_km * MILES_PER_KM / 1e6
g = a.sort_values('year').groupby('count_point_id')
traffic = g.agg(mvm=('mvm', 'sum'), years=('year', 'nunique'),
                counted=('estimation_method', lambda s: int((s == 'Counted').sum())),
                km=('link_length_km', 'last'), start=('start_junction_road_name', 'last'),
                end=('end_junction_road_name', 'last'), dft_council=('local_authority_code', 'last'))
for s in st:
    t = traffic.loc[s['cp']] if s['cp'] in traffic.index else None
    s['mvm'] = float(t.mvm) if t is not None else 0.0
    s['years'] = int(t.years) if t is not None else 0
    s['counted'] = int(t.counted) if t is not None else 0
    s['dft_m'] = float(t.km) * 1000 if t is not None else float(shapely.length(shapely.linestrings(s['straight'])))
    s['start'] = None if t is None or pd.isna(t.start) else str(t.start)
    s['end'] = None if t is None or pd.isna(t.end) else str(t.end)
    s['dft_council'] = None if t is None else RECODE.get(t.dft_council, t.dft_council)
log('stretches', len(st), 'with traffic', sum(1 for s in st if s['years']))

# ---- OS Open Roads: numbered A-road and motorway links --------------------------------
wanted = set(s['road'] for s in st)
links = defaultdict(list)          # road number -> [(start, end, length, points)]
n_links = 0
for p in FILES:
    rd = shapefile.Reader(p[:-4])
    for sr in rd.iterShapeRecords(fields=['roadNumber', 'startNode', 'endNode', 'length']):
        n_links += 1
        rn = sr.record['roadNumber']
        if rn in wanted:
            links[rn].append((sr.record['startNode'], sr.record['endNode'], float(sr.record['length']),
                              np.array(sr.shape.points)))
log('links read', n_links, 'numbered kept', sum(len(v) for v in links.values()))

def dijkstra(graph, s, t):
    dist = {s: 0.0}; real = {s: 0.0}; prev = {}; pq = [(0.0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t: break
        if d > dist[u]: continue
        for v, w, ln, pts in graph[u]:
            nd = d + w
            if nd < dist.get(v, 1e18):
                dist[v] = nd; real[v] = real[u] + ln; prev[v] = (u, pts); heapq.heappush(pq, (nd, v))
    if t not in dist: return None
    parts = []; v = t
    while v != s:
        u, pts = prev[v]; parts.append(pts); v = u
    parts.reverse()
    coords = np.vstack([parts[0]] + [q[1:] for q in parts[1:]])
    return coords, real[t]

road_graph = {}
def road_nodes(rn):
    if rn not in road_graph:
        graph = defaultdict(list); xy = {}
        for a_, b_, ln, pts in links[rn]:
            graph[a_].append((b_, ln, ln, pts)); graph[b_].append((a_, ln, ln, pts[::-1]))
            xy[a_] = pts[0]; xy[b_] = pts[-1]
        keys = list(xy); arr = np.array([xy[k] for k in keys]) if keys else np.zeros((0, 2))
        road_graph[rn] = (graph, keys, arr)
    return road_graph[rn]

def nearest(keys, arr, x, y):
    d = (arr[:, 0] - x) ** 2 + (arr[:, 1] - y) ** 2
    i = int(np.argmin(d)); return keys[i], math.sqrt(d[i])

def strict(s):
    if not links.get(s['road']): return None
    graph, keys, arr = road_nodes(s['road'])
    (x0, y0), (x1, y1) = s['straight'][0], s['straight'][-1]
    a_, da = nearest(keys, arr, x0, y0); b_, db = nearest(keys, arr, x1, y1)
    if da > STRICT_SNAP or db > STRICT_SNAP or a_ == b_: return None
    return dijkstra(graph, a_, b_)

stats = Counter()
for i, s in enumerate(st):
    res = strict(s)
    s['geom'] = s['straight']; s['rebuilt'] = False; s['why'] = 'no path'
    if res is not None:
        g_, ln = res
        if abs(ln - s['dft_m']) <= TOLERANCE * s['dft_m']:
            s['geom'] = g_; s['rebuilt'] = 'strict'; s['why'] = ''
        else:
            s['why'] = 'length differs'
    stats['strict_' + (s['rebuilt'] or s['why'])] += 1
log('strict', dict(stats))

# ---- looser rebuild for the rest: every link near a failed stretch --------------------
todo = [s for s in st if not s['rebuilt']]
boxes = np.array([[s['straight'][:, 0].min() - LOOSE_PAD, s['straight'][:, 1].min() - LOOSE_PAD,
                   s['straight'][:, 0].max() + LOOSE_PAD, s['straight'][:, 1].max() + LOOSE_PAD] for s in todo])
btree = shapely.STRtree(shapely.box(boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]))
near_links = defaultdict(list)     # failed stretch index -> links
for p in FILES:
    rd = shapefile.Reader(p[:-4])
    for sr in rd.iterShapeRecords(fields=['roadNumber', 'startNode', 'endNode', 'length']):
        b = sr.shape.bbox
        hits = btree.query(shapely.box(*b))
        if len(hits) == 0: continue
        item = (sr.record['startNode'], sr.record['endNode'], float(sr.record['length']),
                np.array(sr.shape.points), sr.record['roadNumber'])
        for h in hits:
            near_links[int(h)].append(item)
log('links near failed stretches', sum(len(v) for v in near_links.values()))

for j, s in enumerate(todo):
    L = near_links.get(j, [])
    same = [x for x in L if x[4] == s['road']]
    if not same: continue
    xy = {}
    for a_, b_, ln, pts, rn in same:
        xy[a_] = pts[0]; xy[b_] = pts[-1]
    keys = list(xy); arr = np.array([xy[k] for k in keys])
    (x0, y0), (x1, y1) = s['straight'][0], s['straight'][-1]
    a_, da = nearest(keys, arr, x0, y0); b_, db = nearest(keys, arr, x1, y1)
    if da > LOOSE_SNAP or db > LOOSE_SNAP or a_ == b_: continue
    graph = defaultdict(list)
    for p_, q_, ln, pts, rn in L:
        w = ln if rn == s['road'] else ln * LOOSE_COST
        graph[p_].append((q_, w, ln, pts)); graph[q_].append((p_, w, ln, pts[::-1]))
    res = dijkstra(graph, a_, b_)
    if res is None: continue
    g_, ln = res
    if abs(ln - s['dft_m']) <= TOLERANCE * s['dft_m']:
        s['geom'] = g_; s['rebuilt'] = 'loose'; s['why'] = ''
    else:
        s['why'] = 'length differs'
stats = Counter(s['rebuilt'] or s['why'] for s in st)
log('rebuilt', dict(stats))

# ---- matching the latest five years ------------------------------------------------------
col = pd.read_csv(f'{DL}/collision.csv', low_memory=False,
                  usecols=['collision_index', 'collision_year', 'location_easting_osgr', 'location_northing_osgr',
                           'first_road_class', 'first_road_number'])
col = col[col.collision_year.isin(FIVE)].copy()
col['e'] = pd.to_numeric(col.location_easting_osgr, errors='coerce')
col['n'] = pd.to_numeric(col.location_northing_osgr, errors='coerce')
col['road'] = [road_name(c, n) for c, n in zip(col.first_road_class, col.first_road_number)]
num = col[col.road.notna() & col.e.notna()]
by_road = defaultdict(list)
for i, s in enumerate(st):
    by_road[s['road']].append(i)
geoms = shapely.linestrings([s['geom'] for s in st]) if False else [shapely.LineString(s['geom']) for s in st]
geoms = np.array(geoms, dtype=object)
lengths = shapely.length(geoms)
match = {}    # collision_index -> (kind, [stretch indices], distance)
for road, grp in num.groupby('road'):
    cand = np.array(by_road.get(road, []))
    if not len(cand):
        for cid in grp.collision_index: match[cid] = ('no stretch', [], None)
        continue
    pts = shapely.points(grp.e.values, grp.n.values)
    d = shapely.distance(pts[:, None], geoms[cand][None, :])
    order = np.argsort(d, axis=1)
    for k, cid in enumerate(grp.collision_index.values):
        i0 = order[k, 0]; d0 = d[k, i0]
        if d0 > SNAP:
            match[cid] = ('unmatched', [], float(d0)); continue
        s0 = cand[i0]
        if len(cand) > 1:
            i1 = order[k, 1]; d1 = d[k, i1]
            along = shapely.line_locate_point(geoms[s0], pts[k])
            if d1 <= d0 + JUNCTION and min(along, lengths[s0] - along) <= JUNCTION:
                match[cid] = ('junction', [s0, cand[i1]], float(d0)); continue
        match[cid] = ('one', [s0], float(d0))
log('matched', Counter(v[0] for v in match.values()))
for s in st: s['n'] = 0.0
for kind, ids, d in match.values():
    for i in ids: st[i]['n'] += 1 / len(ids)
dists = [v[2] for v in match.values() if v[0] in ('one', 'junction')]
report = dict(stretches=len(st), rebuilt=dict(stats), links=n_links,
              matching=dict(Counter(v[0] for v in match.values())),
              median_m=round(float(np.median(dists)), 1), minor=int(col.road.isna().sum()),
              no_position=int(col.e.isna().sum()))
pickle.dump(dict(stretches=st, match={k: (v[0], [int(i) for i in v[1]]) for k, v in match.items()}),
            open(f'{WORK}/stretches.pkl', 'wb'))
json.dump(report, open(f'{WORK}/stretches-report.json', 'w'), indent=1)
print(json.dumps(report, indent=1))
