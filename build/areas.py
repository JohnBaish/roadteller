"""Council areas, regions and Great Britain: counts, traffic and rates.

python3 -I build/areas.py <DL> <WORK> <data folder>

Every collision with a position, and every DfT count point, is placed in today's
council area (highway authority) by where it is, so trends back to 1979 (counts)
and 2000 (rates) use today's boundaries throughout. Writes data/areas.json and a
report in WORK/areas-report.json.
"""
import sys, json, time
from collections import defaultdict, Counter
import numpy as np
import pandas as pd
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *

DL, WORK, OUT = sys.argv[1:4]
t0 = time.time()
def log(*a): print(f'[{time.time() - t0:6.0f}s]', *a, flush=True)

C = Councils(DL); log('councils', len(C.codes))
report = {}

# ---- traffic ------------------------------------------------------------------
a = pd.read_csv(f'{DL}/aadf/dft_traffic_counts_aadf.csv', low_memory=False,
                usecols=['count_point_id', 'year', 'local_authority_code', 'local_authority_name',
                         'road_category', 'easting', 'northing', 'link_length_km', 'all_motor_vehicles'])
a = a[a.road_category.isin(['TM', 'PM', 'TA', 'PA'])].copy()
a['all_motor_vehicles'] = pd.to_numeric(a.all_motor_vehicles, errors='coerce')
a['link_length_km'] = pd.to_numeric(a.link_length_km, errors='coerce')
a = a.dropna(subset=['all_motor_vehicles', 'link_length_km'])
a['kind'] = np.where(a.road_category.str.endswith('M'), 'motorway', 'a')
a['mvm'] = a.all_motor_vehicles * 365 * a.link_length_km * MILES_PER_KM / 1e6   # million vehicle miles
a['council'] = C.assign(a.easting, a.northing)
a['dft_code'] = a.local_authority_code.replace(RECODE)
names = dict(zip(a[a.year == LATEST].dft_code, a[a.year == LATEST].local_authority_name))
y25 = a[a.year == LATEST]
report['count_points_other_council'] = int((y25.council != y25.dft_code).sum())
report['count_points_no_council'] = int((a.council == '').sum())
log('traffic rows', len(a))

# ---- collisions ---------------------------------------------------------------
col = pd.read_csv(f'{DL}/collision-all.csv', low_memory=False,
                  usecols=['collision_index', 'collision_year', 'location_easting_osgr', 'location_northing_osgr',
                           'local_authority_highway', 'first_road_class'])
col['e'] = pd.to_numeric(col.location_easting_osgr, errors='coerce')
col['n'] = pd.to_numeric(col.location_northing_osgr, errors='coerce')
col['council'] = C.assign(col.e, col.n)
known = set(C.codes)
no_pos = col.council == ''
fallback = no_pos & col.local_authority_highway.isin(known)
col.loc[fallback, 'council'] = col.loc[fallback, 'local_authority_highway']
col['kind'] = np.where(col.first_road_class.isin([1, 2]), 'motorway', np.where(col.first_road_class == 3, 'a', 'minor'))
report['collisions'] = int(len(col))
report['collisions_no_position'] = int(no_pos.sum())
report['collisions_placed_by_police_code'] = int(fallback.sum())
report['collisions_no_council'] = int((col.council == '').sum())
recent = col[col.collision_year.isin(FIVE)]
report['recent_police_code_differs'] = int((recent.council != recent.local_authority_highway).sum())
report['recent'] = int(len(recent))
log('collisions', len(col))

# ---- the latest five years in detail ---------------------------------------------
c5 = pd.read_csv(f'{DL}/collision.csv', low_memory=False,
                 usecols=['collision_index', 'collision_year', 'collision_severity', 'day_of_week', 'time',
                          'collision_adjusted_severity_serious'])
c5 = c5[c5.collision_year.isin(FIVE)].merge(col[['collision_index', 'council', 'kind']], on='collision_index', how='left')
c5['adj'] = np.where(c5.collision_severity == 1, 1.0,
                     pd.to_numeric(c5.collision_adjusted_severity_serious, errors='coerce').fillna(0))
c5['hour'] = pd.to_numeric(c5.time.astype(str).str.slice(0, 2), errors='coerce')
cas = pd.read_csv(f'{DL}/casualty.csv', low_memory=False,
                  usecols=['collision_index', 'collision_year', 'casualty_type', 'casualty_severity'])
cas = cas[cas.collision_year.isin(FIVE)].merge(col[['collision_index', 'council']], on='collision_index', how='left')
cas['group'] = cas.casualty_type.map(user_group)
report['casualty_type_unknown'] = int((cas.casualty_type < 0).sum())
log('five-year detail', len(c5), len(cas))

DAYS = [2, 3, 4, 5, 6, 7, 1]   # STATS19: 1 Sunday … 7 Saturday; shown Monday first
region_of = C.region
col['region'] = col.council.map(region_of).fillna('')
a['region'] = a.council.map(region_of).fillna('')
c5['region'] = c5.council.map(region_of).fillna('')
cas['region'] = cas.council.map(region_of).fillna('')
col['gb'] = 'gb'; a['gb'] = 'gb'; c5['gb'] = 'gb'; cas['gb'] = 'gb'

def table(df, key, cols):
    """counts of rows by key and cols → {key: {col value: count}}"""
    t = df.groupby([key] + cols).size()
    out = defaultdict(dict)
    for idx, v in t.items():
        out[idx[0]][idx[1:] if len(idx) > 2 else idx[1]] = int(v)
    return out

def build(key):
    """Figures for every area at one level: key is 'council', 'region' or 'gb'."""
    years = table(col, key, ['collision_year'])
    am_years = table(col[col.kind != 'minor'], key, ['collision_year'])
    kinds5 = table(col[col.collision_year.isin(FIVE)], key, ['kind'])
    prev = col[col.collision_year.isin(PREV_FIVE)].groupby(key).size()
    tyear = a.groupby([key, 'year']).mvm.sum()
    tkind = a[a.year.isin(FIVE)].groupby([key, 'kind']).mvm.sum()
    hours = table(c5, key, ['hour']); days = table(c5, key, ['day_of_week'])
    ksi = c5[c5.collision_severity.isin([1, 2])].groupby(key).size()
    adj = c5.groupby(key).adj.sum(); n5 = c5.groupby(key).size()
    who = table(cas, key, ['group']); hurt = cas.groupby(key).size()
    killed = cas[cas.casualty_severity == 1].groupby(key).size()
    out = {}
    for k in sorted(set(years) - {''}):
        trend = {}
        for y in range(FIRST_YEAR, LATEST + 1):
            row = [years[k].get(y, 0)]
            if y >= RATE_FROM:
                row += [am_years.get(k, {}).get(y, 0), r(tyear.get((k, y), 0.0), 1)]
            trend[y] = row
        kinds = {kk: dict(n=kinds5.get(k, {}).get(kk, 0), mvm=r(tkind.get((k, kk), 0.0), 1)) for kk in ('motorway', 'a')}
        out[k] = dict(trend=trend, five=dict(
            all=sum(kinds5.get(k, {}).values()), minor=kinds5.get(k, {}).get('minor', 0), kinds=kinds,
            prev_all=int(prev.get(k, 0)), n=int(n5.get(k, 0)), hurt=int(hurt.get(k, 0)),
            killed=int(killed.get(k, 0)), ksi_recorded=int(ksi.get(k, 0)), ksi_adjusted=r(adj.get(k, 0.0), 1),
            who={g: who.get(k, {}).get(g, 0) for g in USER_GROUPS},
            hours=[hours.get(k, {}).get(h, 0) for h in range(24)],
            days=[days.get(k, {}).get(d, 0) for d in DAYS]))
    return out

gb = build('gb')['gb']
gbk = {k: v['n'] / (v['mvm'] / 100) for k, v in gb['five']['kinds'].items()}

def finish(f):
    k = f['five']['kinds']
    n = sum(v['n'] for v in k.values()); mvm = sum(v['mvm'] for v in k.values())
    exp = sum(v['mvm'] / 100 * gbk[kk] for kk, v in k.items())
    f['five'].update(am=n, am_mvm=r(mvm, 1), rate=r(n / (mvm / 100), 4) if mvm else None,
                     expected=r(exp, 1), ratio=r(n / exp, 4) if exp else None)
    return f

gb = finish(gb); gb['kind_rate'] = {k: r(v, 4) for k, v in gbk.items()}
councils = {k: finish(v) for k, v in build('council').items()}
for code, c in councils.items():
    c['name'] = names.get(code) or C.bl_names[list(C.codes).index(code)]
    c['region'] = C.region[code]
regions = {k: finish(v) for k, v in build('region').items()}
for code, rg in regions.items():
    rg['name'] = REGION_NAMES[code]
log('figures done')

# each council's roads: stretches whose count point DfT places in that council
import pickle, os
if os.path.exists(f'{WORK}/stretches.pkl'):
    S = pickle.load(open(f'{WORK}/stretches.pkl', 'rb'))['stretches']
    roads = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0, 0]))
    for s_ in S:
        k = s_['dft_council']
        if k in councils:
            t = roads[k][s_['road']]; t[0] += s_['n']; t[1] += s_['mvm']; t[2] += 1
    def sortkey(r_): return (r_['road'][0] != 'M', int(''.join(ch for ch in r_['road'][1:] if ch.isdigit()) or 0), r_['road'])
    for k, rs in roads.items():
        councils[k]['roads'] = sorted([dict(road=rd, n=r(v[0], 1), mvm=r(v[1], 1), stretches=v[2],
                                            rate=r(v[0] / (v[1] / 100), 4) if v[1] and v[0] >= 10 else None)
                                       for rd, v in rs.items()], key=sortkey)
    log('roads added')

report['councils_without_dft_name'] = [c for c in C.codes if c not in names]
dump(dict(latest=LATEST, five=FIVE, prev_five=PREV_FIVE, gb=gb, regions=regions, councils=councils),
     f'{OUT}/areas.json')
json.dump(report, open(f'{WORK}/areas-report.json', 'w'), indent=1)
print(json.dumps(report, indent=1))
wb = councils['E06000037']['five']
print('West Berkshire', {k: wb[k] for k in ('all', 'am', 'am_mvm', 'rate', 'expected', 'ratio', 'prev_all', 'n', 'hurt', 'killed')})
