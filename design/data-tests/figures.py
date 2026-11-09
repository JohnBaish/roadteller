"""Real figures for the Roadteller mock-ups. python3 -I figures.py <dl> <match json> <out.json>"""
import sys, json, csv, math
from collections import defaultdict, Counter
import pandas as pd, numpy as np

DL, MATCH, OUT = sys.argv[1:4]
CE, CN = 447187, 166972            # middle of RG14 (Newbury), OS Open Names via Hindcaster
R = 1609.344                        # one mile
LA = 'E06000037'                    # West Berkshire
out = {}

# ---- one pass over 1979-2025 -------------------------------------------------
use = ['collision_index', 'collision_year', 'location_easting_osgr', 'location_northing_osgr',
       'collision_severity', 'local_authority_highway', 'collision_adjusted_severity_serious',
       'urban_or_rural_area', 'first_road_class']
circle_year = Counter(); circle_ksi = Counter(); la_year = defaultdict(Counter)
la_ksi_adj = defaultdict(float); la_urban = defaultdict(Counter)
rounded = Counter(); gb_year = Counter(); gb_round = Counter()
for ch in pd.read_csv(f'{DL}/collision-all.csv', usecols=use, chunksize=500000, low_memory=False):
    ch = ch[ch.location_easting_osgr.notna()]
    e = pd.to_numeric(ch.location_easting_osgr, errors='coerce'); n = pd.to_numeric(ch.location_northing_osgr, errors='coerce')
    d = np.hypot(e - CE, n - CN)
    inc = ch[d <= R]
    for y, s, ee, nn in zip(inc.collision_year, inc.collision_severity, e[d <= R], n[d <= R]):
        circle_year[int(y)] += 1
        if s in (1, 2): circle_ksi[int(y)] += 1
        if ee % 100 == 0 and nn % 100 == 0: rounded[int(y)] += 1
    for y, c in ch.groupby('collision_year').size().items(): gb_year[int(y)] += int(c)
    rr = ch[(e % 100 == 0) & (n % 100 == 0)]
    for y, c in rr.groupby('collision_year').size().items(): gb_round[int(y)] += int(c)
    g = ch.groupby(['local_authority_highway', 'collision_year']).size()
    for (la, y), c in g.items(): la_year[la][int(y)] += int(c)
    rec = ch[ch.collision_year >= 2021]
    adj = pd.to_numeric(rec.collision_adjusted_severity_serious, errors='coerce').fillna(0)
    ksi = np.where(rec.collision_severity == 1, 1.0, adj)
    for la, k in pd.Series(ksi, index=rec.index).groupby(rec.local_authority_highway).sum().items(): la_ksi_adj[la] += float(k)
    for la, u, c in rec.groupby(['local_authority_highway', 'urban_or_rural_area']).size().reset_index().values:
        la_urban[la][int(u)] += int(c)
out['circle_year'] = dict(sorted(circle_year.items()))
out['circle_ksi_year'] = dict(sorted(circle_ksi.items()))
out['circle_rounded_year'] = dict(sorted(rounded.items()))

# ---- traffic: highway authorities, all roads ---------------------------------
lat = defaultdict(dict); la_name = {}; la_len = {}
with open(f'{DL}/local_authority_traffic.csv', newline='') as f:
    for r in csv.DictReader(f):
        y = int(r['year']); la_name[r['local_authority_code']] = r['local_authority_name']
        lat[r['local_authority_code']][y] = float(r['all_motor_vehicles']) / 1.0  # vehicle miles a year
        if y == 2025: la_len[r['local_authority_code']] = float(r['link_length_miles'])
region_of = {}; major = defaultdict(lambda: defaultdict(float)); cp_pos = defaultdict(list)
with open(f'{DL}/aadf/dft_traffic_counts_aadf.csv', newline='') as f:
    for r in csv.DictReader(f):
        region_of[r['local_authority_code']] = r['region_name']
        if int(r['year']) == 2025 and r['all_motor_vehicles'] not in ('', 'NA') and r['link_length_miles'] not in ('', 'NA'):
            vm = float(r['all_motor_vehicles']) * 365 * float(r['link_length_miles'])
            major[r['local_authority_code']][r['road_category']] += vm
            cp_pos[r['local_authority_code']].append((float(r['easting']), float(r['northing'])))

def rate(la, years):
    c = sum(la_year[la].get(y, 0) for y in years); vm = sum(lat[la].get(y, 0) for y in years)
    return (c, vm / 1e6, c / (vm / 1e6) if vm else None)
Y5 = range(2021, 2026)
las = [la for la in la_name if la in la_year and all(y in lat[la] for y in Y5)]
table = {}
for la in las:
    c, mvm, rt = rate(la, Y5)
    tot25 = lat[la][2025]
    mj = major[la]
    table[la] = dict(name=la_name[la], region=region_of.get(la), n=c, mvm=round(mvm), rate=round(rt * 100, 1),  # per 100 million vehicle miles
                     ksi_adj=round(la_ksi_adj[la]), ksi_rate=round(la_ksi_adj[la] / mvm * 100, 2),
                     motorway_share=round(sum(v for k, v in mj.items() if k.endswith('M')) / tot25, 3),
                     minor_share=round(max(0, 1 - sum(mj.values()) / tot25), 3),
                     density=round(tot25 / la_len[la] / 365) if la_len.get(la) else None,   # vehicles a day per mile of road
                     urban_share=round(la_urban[la][1] / max(1, sum(la_urban[la].values())), 3))
out['las'] = table
gb_c = sum(t['n'] for t in table.values()); gb_m = sum(t['mvm'] for t in table.values())
gb_k = sum(la_ksi_adj[la] for la in table)
out['gb'] = dict(n=gb_c, mvm=gb_m, rate=round(gb_c / gb_m * 100, 1), ksi_rate=round(gb_k / gb_m * 100, 2))
reg = defaultdict(lambda: [0, 0, 0.0])
for la, t in table.items():
    reg[t['region']][0] += t['n']; reg[t['region']][1] += t['mvm']; reg[t['region']][2] += la_ksi_adj[la]
out['regions'] = {k: dict(n=v[0], rate=round(v[0] / v[1] * 100, 1), ksi_rate=round(v[2] / v[1] * 100, 2)) for k, v in reg.items()}
out['rank'] = sorted(table, key=lambda la: -table[la]['rate']).index(LA) + 1
out['count_las'] = len(table)

# long trend for the council area: counts from 1979, rates from 1993 (traffic file) - shown from 2000
out['la_trend'] = {y: dict(n=la_year[LA].get(y, 0), rate=round(la_year[LA].get(y, 0) / (lat[LA][y] / 1e6) * 100, 1) if y in lat[LA] else None) for y in range(1979, 2026)}
gby = {}
for y in range(1993, 2026):
    m = sum(lat[la].get(y, 0) for la in lat) / 1e6
    gby[y] = dict(n=gb_year[y], rate=round(gb_year[y] / m * 100, 1))
out['gb_rounded_share'] = {y: round(gb_round[y] / gb_year[y], 3) for y in sorted(gb_year)}
out['gb_year'] = dict(sorted(gb_year.items()))
out['gb_trend'] = gby

# ---- similar places ------------------------------------------------------------
cent = {la: (np.mean([p[0] for p in cp_pos[la]]), np.mean([p[1] for p in cp_pos[la]])) for la in table if cp_pos[la]}
me = cent[LA]
out['sim_nearest'] = [la for la in sorted(cent, key=lambda la: math.dist(cent[la], me)) if la != LA][:6]
# lookalikes: traffic mix and density, standardised
keys = ['motorway_share', 'minor_share', 'urban_share']
arr = {la: [table[la][k] for k in keys] + [math.log(table[la]['density'] or 1)] for la in table}
M = np.array(list(arr.values())); mu = M.mean(0); sd = M.std(0)
z = {la: (np.array(v) - mu) / sd for la, v in arr.items()}
out['sim_lookalike'] = [la for la in sorted(z, key=lambda la: np.linalg.norm(z[la] - z[LA])) if la != LA][:6]

# ---- the circle, 2021-2025 ------------------------------------------------------
col = pd.read_csv(f'{DL}/collision.csv', low_memory=False)
col['d'] = np.hypot(pd.to_numeric(col.location_easting_osgr, errors='coerce') - CE, pd.to_numeric(col.location_northing_osgr, errors='coerce') - CN)
cc = col[col.d <= R].copy()
cas = pd.read_csv(f'{DL}/casualty.csv', low_memory=False)
cs = cas[cas.collision_index.isin(cc.collision_index)]
def group(t):
    if t == 0: return 'walking'
    if t == 1: return 'cycling'
    if t in (2, 3, 4, 5, 23, 97): return 'motorcycle'
    if t == 9: return 'car'
    return 'other'
cs_g = cs.casualty_type.map(group).value_counts().to_dict()
gb_cs = cas.casualty_type.map(group).value_counts(normalize=True).round(3).to_dict()
adj = pd.to_numeric(cc.collision_adjusted_severity_serious, errors='coerce').fillna(0)
cc['hour'] = cc.time.str.slice(0, 2).astype(int)
out['circle'] = dict(n=len(cc), casualties=len(cs), killed=int((cs.casualty_severity == 1).sum()),
                     ksi_recorded=int(cc.collision_severity.isin([1, 2]).sum()),
                     ksi_adjusted=round(float(np.where(cc.collision_severity == 1, 1, adj).sum())),
                     by_year=cc.collision_year.value_counts().sort_index().to_dict(),
                     users=cs_g, gb_users=gb_cs,
                     hours=cc.hour.value_counts().sort_index().to_dict(),
                     days=cc.day_of_week.value_counts().sort_index().to_dict(),
                     minor=int((~cc.first_road_class.isin([1, 2, 3])).sum()))
# per-year circle by user group, for single-year view
out['circle']['users_by_year'] = {int(y): g.casualty_type.map(group).value_counts().to_dict()
                                  for y, g in cs.merge(cc[['collision_index']], on='collision_index').groupby('collision_year')}
# roads through the circle from the matching test (whole stretches)
m = json.load(open(MATCH))
import shapefile
from shapely.geometry import LineString, Point
mr = shapefile.Reader(f'{DL}/mrdb/MRDB_2025_published2')
near = set()
for sr in mr.iterShapeRecords():
    if LineString(sr.shape.points).distance(Point(CE, CN)) <= R: near.add(int(sr.record['CP_Number']))
out['circle_roads'] = [r for r in m['rows'] if r['cp'] in near]
json.dump(out, open(OUT, 'w'), indent=1, default=lambda o: int(o) if isinstance(o, np.integer) else float(o))
print(json.dumps({k: v for k, v in out.items() if k not in ('las', 'la_trend', 'gb_trend')}, indent=1, default=str)[:6000])
