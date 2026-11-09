"""Files the page loads to count a circle on the device.

python3 -I build/tiles.py <DL> <WORK> <data folder>    (RT_SQUARE=25000 for 25 km squares)

Great Britain is cut into squares of the OS grid (50 km by default); the page
loads only the squares its circle touches, so the site learns no more than
roughly which part of the country is being looked at. For each square:

  <sx>-<sy>.json      the latest five years and 2000 onwards, plus the stretches
    recent: columns, one value per collision, sorted by easting: easting (10 m
            steps from the square's corner, as differences from the one before),
            northing, year (0 = the first of the five), hour, day (0 Monday …
            6 Sunday), kind (0 minor, 1 A-road, 2 motorway), killed, seriously
            hurt (recorded), adjusted serious × 100, then people hurt walking,
            cycling, on motorcycles, in cars, other
    history: for each year from 2000 to the year before the five,
            [year, 100 m cells (as differences of easting × 1000 + northing),
            collisions in each cell]
    stretches: A-road and motorway stretches crossing the square
  <sx>-<sy>-old.json  the same history for 1979 to 1999, loaded only when asked
"""
import sys, json, time, pickle, os, gzip
from collections import defaultdict
import numpy as np
import pandas as pd
import shapely
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *

DL, WORK, OUT = sys.argv[1:4]
SQ = 50000
t0 = time.time()
def log(*a): print(f'[{time.time() - t0:6.0f}s]', *a, flush=True)

col = pd.read_csv(f'{DL}/collision-all.csv', low_memory=False,
                  usecols=['collision_index', 'collision_year', 'location_easting_osgr', 'location_northing_osgr'])
col['e'] = pd.to_numeric(col.location_easting_osgr, errors='coerce')
col['n'] = pd.to_numeric(col.location_northing_osgr, errors='coerce')
col = col.dropna(subset=['e', 'n'])
col = col[(col.e > 0) & (col.n > 0)]
col['sx'] = (col.e // SQ).astype(int); col['sy'] = (col.n // SQ).astype(int)
col['ue'] = ((col.e - col.sx * SQ) / 10).round().astype(int)
col['un'] = ((col.n - col.sy * SQ) / 10).round().astype(int)
log('collisions with a position', len(col))

c5 = pd.read_csv(f'{DL}/collision.csv', low_memory=False,
                 usecols=['collision_index', 'collision_year', 'collision_severity', 'day_of_week', 'time',
                          'first_road_class', 'collision_adjusted_severity_serious'])
c5 = c5[c5.collision_year.isin(FIVE)]
cas = pd.read_csv(f'{DL}/casualty.csv', low_memory=False,
                  usecols=['collision_index', 'collision_year', 'casualty_type', 'casualty_severity'])
cas = cas[cas.collision_year.isin(FIVE)]
cas['group'] = cas.casualty_type.map(user_group)
who = cas.pivot_table(index='collision_index', columns='group', values='casualty_severity', aggfunc='size', fill_value=0)
for gname in USER_GROUPS:
    if gname not in who: who[gname] = 0
killed = cas[cas.casualty_severity == 1].groupby('collision_index').size()
c5 = c5.set_index('collision_index')
c5['killed'] = killed.reindex(c5.index).fillna(0).astype(int)
c5 = c5.join(who[USER_GROUPS]).fillna({g: 0 for g in USER_GROUPS})
c5['hour'] = pd.to_numeric(c5.time.astype(str).str.slice(0, 2), errors='coerce').fillna(-1).astype(int)
c5['day'] = c5.day_of_week.map({2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 1: 6}).fillna(-1).astype(int)
c5['kind'] = np.where(c5.first_road_class.isin([1, 2]), 2, np.where(c5.first_road_class == 3, 1, 0))
c5['serious'] = (c5.collision_severity == 2).astype(int)
adj = pd.to_numeric(c5.collision_adjusted_severity_serious, errors='coerce').fillna(0)
c5['adj'] = np.where(c5.collision_severity == 1, 0, (adj * 100).round()).astype(int)
log('five-year detail', len(c5))

S = pickle.load(open(f'{WORK}/stretches.pkl', 'rb'))['stretches']
sq_stretch = defaultdict(list)
for i, s in enumerate(S):
    g = shapely.simplify(shapely.LineString(s['geom']), 10)
    x0, y0, x1, y1 = g.bounds
    for sx in range(int(x0 // SQ), int(x1 // SQ) + 1):
        for sy in range(int(y0 // SQ), int(y1 // SQ) + 1):
            if g.intersects(shapely.box(sx * SQ, sy * SQ, (sx + 1) * SQ, (sy + 1) * SQ)):
                sq_stretch[(sx, sy)].append(i)
    s['simple'] = np.round(np.array(g.coords)).astype(int)

def stretch_row(s):
    c = s['simple']; flat = [int(c[0, 0]), int(c[0, 1])]
    for k in range(1, len(c)):
        flat += [int(c[k, 0] - c[k - 1, 0]), int(c[k, 1] - c[k - 1, 1])]
    return dict(cp=s['cp'], road=s['road'], start=s['start'], end=s['end'], km=r(s['dft_m'] / 1000, 2),
                n=r(s['n'], 1), mvm=r(s['mvm'], 1),
                rate=r(s['n'] / (s['mvm'] / 100), 4) if s['mvm'] and s['n'] >= 10 else None,
                rebuilt=bool(s['rebuilt']), line=flat)

SQ_ENV = int(os.environ.get('RT_SQUARE', SQ))
SQ = SQ_ENV

def cells(df):
    """Collisions → for each year, 100 m cells and how many collisions in each."""
    out = []
    for y, g in df.groupby('collision_year', sort=True):
        key = ((g.e - g.sx * SQ) // 100).astype(int) * 1000 + ((g.n - g.sy * SQ) // 100).astype(int)
        vc = key.value_counts().sort_index()
        k = vc.index.values; c = vc.values
        out.append([int(y), np.diff(k, prepend=0).tolist(), [int(x) for x in c]])
    return out

def recent_cols(rec):
    R = rec[['ue', 'un', 'collision_year', 'hour', 'day', 'kind', 'killed', 'serious', 'adj'] + USER_GROUPS].values.astype(int)
    if not len(R): return []
    R = R[np.lexsort((R[:, 1], R[:, 0]))]
    cols = [np.diff(R[:, 0], prepend=0)] + [R[:, i] for i in range(1, R.shape[1])]
    cols[2] = cols[2] - FIVE[0]
    return [c.tolist() for c in cols]

col['sx'] = (col.e // SQ).astype(int); col['sy'] = (col.n // SQ).astype(int)
col['ue'] = ((col.e - col.sx * SQ) / 10).round().astype(int)
col['un'] = ((col.n - col.sy * SQ) / 10).round().astype(int)
sq_stretch = defaultdict(list)
for i, s in enumerate(S):
    g = shapely.LineString(s['simple'])
    x0, y0, x1, y1 = g.bounds
    for sx in range(int(x0 // SQ), int(x1 // SQ) + 1):
        for sy in range(int(y0 // SQ), int(y1 // SQ) + 1):
            if g.intersects(shapely.box(sx * SQ, sy * SQ, (sx + 1) * SQ, (sy + 1) * SQ)):
                sq_stretch[(sx, sy)].append(i)

import shutil
shutil.rmtree(f'{OUT}/squares', ignore_errors=True)
os.makedirs(f'{OUT}/squares', exist_ok=True)
index = {}; total = 0
def write(obj, path):
    dump(obj, path)
    return len(gzip.compress(open(path, 'rb').read(), 9))
for (sx, sy), grp in col.groupby(['sx', 'sy']):
    name = f'{sx}-{sy}'
    rec = grp[grp.collision_year.isin(FIVE)].join(c5, on='collision_index', rsuffix='_5', how='inner')
    main = dict(sq=[sx, sy], size=SQ, recent=recent_cols(rec),
                history=cells(grp[(grp.collision_year >= RATE_FROM) & (grp.collision_year < FIVE[0])]),
                stretches=[stretch_row(S[i]) for i in sq_stretch.get((sx, sy), [])])
    old = dict(sq=[sx, sy], size=SQ, history=cells(grp[grp.collision_year < RATE_FROM]))
    a_ = write(main, f'{OUT}/squares/{name}.json'); b_ = write(old, f'{OUT}/squares/{name}-old.json')
    total += a_ + b_
    index[name] = [int(len(grp)), round(a_ / 1024), round(b_ / 1024)]
dump(dict(size=SQ, latest=LATEST, five=FIVE, squares=index), f'{OUT}/squares/index.json')
sizes = sorted(v[1] for v in index.values())
print(json.dumps(dict(square_m=SQ, squares=len(index), gzip_mb=round(total / 2**20, 1),
                      largest_kb=sizes[-6:], median_kb=sizes[len(sizes) // 2]), indent=1))
