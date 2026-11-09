"""More figures: road-mix expectation, lookalikes, West Berkshire detail.
python3 -I figures2.py <dl> <figs.json> <westberks match json> <out.json>"""
import sys, json, csv, math
from collections import defaultdict
import pandas as pd, numpy as np

DL, FIGS, MATCH, OUT = sys.argv[1:5]
figs = json.load(open(FIGS))
Y5 = range(2021, 2026)
LA = 'E06000037'

# vehicle miles by kind of road, highway authority, 2021-2025
total = defaultdict(float); name = {}
with open(f'{DL}/local_authority_traffic.csv', newline='') as f:
    for r in csv.DictReader(f):
        if int(r['year']) in Y5:
            total[r['local_authority_code']] += float(r['all_motor_vehicles']); name[r['local_authority_code']] = r['local_authority_name']
kind_vm = defaultdict(lambda: defaultdict(float))
with open(f'{DL}/aadf/dft_traffic_counts_aadf.csv', newline='') as f:
    for r in csv.DictReader(f):
        if int(r['year']) not in Y5 or r['road_category'] not in ('TM', 'PM', 'TA', 'PA'):
            continue
        if r['all_motor_vehicles'] in ('', 'NA') or r['link_length_miles'] in ('', 'NA'):
            continue
        k = 'motorway' if r['road_category'].endswith('M') else 'a'
        kind_vm[r['local_authority_code']][k] += float(r['all_motor_vehicles']) * 365 * float(r['link_length_miles'])
for la in total:
    kind_vm[la]['minor'] = max(0.0, total[la] - kind_vm[la]['motorway'] - kind_vm[la]['a'])

col = pd.read_csv(f'{DL}/collision.csv', usecols=['collision_index', 'collision_year', 'local_authority_highway', 'first_road_class',
                                                   'collision_severity', 'collision_adjusted_severity_serious', 'time', 'day_of_week',
                                                   'urban_or_rural_area'], low_memory=False)
col['kind'] = np.select([col.first_road_class.isin([1, 2]), col.first_road_class == 3], ['motorway', 'a'], 'minor')
n_kind = col.groupby(['local_authority_highway', 'kind']).size().unstack(fill_value=0)
las = [la for la in figs['las'] if la in n_kind.index]
gb = {k: n_kind.loc[las, k].sum() / (sum(kind_vm[la][k] for la in las) / 1e8) for k in ('motorway', 'a', 'minor')}
out = dict(gb_kind_rate={k: round(v, 1) for k, v in gb.items()})
exp = {}
for la in las:
    e = sum(kind_vm[la][k] / 1e8 * gb[k] for k in gb)
    a = int(n_kind.loc[la].sum())
    exp[la] = dict(name=name.get(la, figs['las'][la]['name']), actual=a, expected=round(e), ratio=round(a / e, 2),
                   share={k: round(kind_vm[la][k] / total[la], 3) for k in gb},
                   rate=figs['las'][la]['rate'], ksi_rate=figs['las'][la]['ksi_rate'], region=figs['las'][la]['region'],
                   kind_rate={k: round(n_kind.loc[la, k] / (kind_vm[la][k] / 1e8), 1) if kind_vm[la][k] > 1e7 else None for k in gb},
                   urban=figs['las'][la]['urban_share'], density=figs['las'][la]['density'])
out['exp'] = exp
# lookalikes on corrected shares
keys = lambda la: [exp[la]['share']['motorway'], exp[la]['share']['minor'], exp[la]['urban'], math.log(exp[la]['density'] or 1)]
M = np.array([keys(la) for la in las]); mu, sd = M.mean(0), M.std(0)
z = {la: (np.array(keys(la)) - mu) / sd for la in las}
out['sim_lookalike'] = [la for la in sorted(z, key=lambda la: np.linalg.norm(z[la] - z[LA])) if la != LA][:6]
out['sim_nearest'] = figs['sim_nearest']
out['rank_ratio'] = sorted(las, key=lambda la: -exp[la]['ratio']).index(LA) + 1
out['n_las'] = len(las)
# region totals with expectation
reg = defaultdict(lambda: [0, 0.0])
for la in las:
    reg[exp[la]['region']][0] += exp[la]['actual']; reg[exp[la]['region']][1] += exp[la]['expected']
out['region_ratio'] = {k: round(v[0] / v[1], 2) for k, v in reg.items()}

# West Berkshire detail, 2021-2025
w = col[col.local_authority_highway == LA].copy()
cas = pd.read_csv(f'{DL}/casualty.csv', usecols=['collision_index', 'casualty_type', 'casualty_severity', 'collision_year'], low_memory=False)
wc = cas[cas.collision_index.isin(w.collision_index)]
def group(t):
    return {0: 'walking', 1: 'cycling', 9: 'car'}.get(t, 'motorcycle' if t in (2, 3, 4, 5, 23, 97) else 'other')
adj = pd.to_numeric(w.collision_adjusted_severity_serious, errors='coerce').fillna(0)
w['hour'] = w.time.str.slice(0, 2).astype(int)
out['wb'] = dict(n=len(w), casualties=len(wc), killed=int((wc.casualty_severity == 1).sum()),
                 ksi_recorded=int(w.collision_severity.isin([1, 2]).sum()),
                 ksi_adjusted=round(float(np.where(w.collision_severity == 1, 1, adj).sum())),
                 by_year=w.collision_year.value_counts().sort_index().to_dict(),
                 users=wc.casualty_type.map(group).value_counts().to_dict(),
                 hours=w.hour.value_counts().sort_index().to_dict(),
                 days=w.day_of_week.value_counts().sort_index().to_dict(),
                 kind=w.kind.value_counts().to_dict(), rural=int((w.urban_or_rural_area == 2).sum()))
m = json.load(open(MATCH))
out['wb_roads'] = [dict(road=r['road'], n=r['n'], rate=round(r['rate'] * 100, 1) if r['rate'] else None) for r in m['roads']]
out['wb_stretches'] = [dict(road=r['road'], cp=r['cp'], km=r['dft_km'], n=r['n_geom'], mvm=r['mvm'],
                            rate=round(r['rate_geom'] * 100, 1) if r['rate_geom'] else None) for r in m['rows'] if r['la'] == 'West Berkshire']
json.dump(out, open(OUT, 'w'), indent=1, default=lambda o: int(o) if isinstance(o, np.integer) else float(o))
print('gb kind rates', out['gb_kind_rate'])
for la in [LA] + out['sim_nearest'] + out['sim_lookalike']:
    e = exp[la]; print(e['name'], e['actual'], e['expected'], e['ratio'], e['rate'], e['share'], e['kind_rate'])
print('rank by ratio', out['rank_ratio'], 'of', out['n_las'], 'SE', out['region_ratio'].get('South East'))
print(out['wb'])
