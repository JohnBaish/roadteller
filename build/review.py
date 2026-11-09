"""A review list for John: what the build could and couldn't do.

python3 -I build/review.py <data folder> <WORK> <out.md>
"""
import sys, json, pickle
from collections import Counter, defaultdict
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *

OUT, WORK, MD = sys.argv[1:4]
A = json.load(open(f'{OUT}/areas.json'))
S = pickle.load(open(f'{WORK}/stretches.pkl', 'rb'))
SR = json.load(open(f'{WORK}/stretches-report.json'))
AR = json.load(open(f'{WORK}/areas-report.json'))
IX = json.load(open(f'{OUT}/squares/index.json'))
st = S['stretches']; C = A['councils']; gb = A['gb']
L = []
def p(*s): L.append(' '.join(str(x) for x in s))
def f(n): return f'{n:,}'
def per(rate): return f'{100 / rate:.1f}' if rate else '–'

p('# Data build review,', 'latest five years', f'{A["five"][0]} to {A["five"][-1]}')
p()
p('Made by `build/review.py` from the stage 1 build. For John to look through.')
p()
p('## 1. Stretches of A-road and motorway')
p()
rb = SR['rebuilt']; tot = SR['stretches']
p(f'DfT has {f(tot)} stretches in Great Britain. Rebuilt along the real road from OS Open Roads:',
  f'{f(rb.get("strict", 0))} by the strict rule and {f(rb.get("loose", 0))} by the looser one,',
  f'{round(100 * (rb.get("strict", 0) + rb.get("loose", 0)) / tot)}% in all. The other',
  f'{f(rb.get("length differs", 0) + rb.get("no path", 0))} keep DfT\'s straight line:',
  f'{f(rb.get("length differs", 0))} because the rebuilt length differed from DfT\'s by more than 20%,',
  f'{f(rb.get("no path", 0))} because no path was found.')
p()
m = SR['matching']; on = m.get('one', 0) + m.get('junction', 0)
p(f'Of the {f(on + m.get("unmatched", 0) + m.get("no stretch", 0))} collisions on numbered A-roads and motorways',
  f'in the five years, {f(on)} were matched ({round(100 * on / (on + m.get("unmatched", 0) + m.get("no stretch", 0)), 1)}%),',
  f'{f(m.get("junction", 0))} of them at a junction (half to each stretch). They sit a median {SR["median_m"]} metres',
  f'from their stretch. {f(m.get("unmatched", 0))} were more than 500 metres from any stretch of their road, and',
  f'{f(m.get("no stretch", 0))} were on a road number DfT has no stretch for.')
p()
kept = defaultdict(lambda: [0, 0.0])
for s in st:
    if not s['rebuilt']:
        kept[s['dft_council']][0] += 1; kept[s['dft_council']][1] += s['n']
p('Council areas with the most stretches left as straight lines (collisions on them in brackets):')
p()
for k, v in sorted(kept.items(), key=lambda x: -x[1][0])[:12]:
    p(f'- {C.get(k, {}).get("name", k)}: {v[0]} ({round(v[1])})')
p()
p('Long stretches (more than 5 km) left as straight lines with 10 or more collisions, which the')
p('straight line may have placed on the wrong stretch:')
p()
long = sorted([s for s in st if not s['rebuilt'] and s['dft_m'] > 5000 and s['n'] >= 10], key=lambda s: -s['n'])
for s in long[:20]:
    p(f'- {s["road"]}, {s["start"]} to {s["end"]} ({C.get(s["dft_council"], {}).get("name", s["dft_council"])}):',
      f'{s["dft_m"] / 1000:.1f} km, {s["n"]:g} collisions, {s["why"]}')
p(f'- … {len(long)} in all.' if len(long) > 20 else '')
p()
unm = Counter()
for cid, (kind, ids) in S['match'].items():
    pass
p('## 2. Council areas')
p()
p(f'{len(C)} council areas (highway authorities as they are today). Every collision with a position, and',
  f'every DfT count point, is placed in the council area it lies in.')
p()
tot = sum(gb['trend'][y][0] for y in gb['trend']); placed = sum(c['trend'][y][0] for c in C.values() for y in c['trend'])
p(f'- {f(tot - placed)} of {f(tot)} collisions since {min(map(int, gb["trend"]))} have no usable position and are',
  'left out of council areas and circles (see §4).')
p(f'- In the five years, {f(AR["recent_police_code_differs"])} of {f(AR["recent"])} collisions',
  f'({round(100 * AR["recent_police_code_differs"] / AR["recent"], 1)}%) are placed in a different council area from the one',
  'the police gave, mostly on roads along a boundary.')
p(f'- {AR["count_points_other_council"]} of DfT\'s count points lie in a different council area from the one DfT gives.')
p()
p(f'Great Britain, A-roads and motorways: one injury collision for every {per(gb["five"]["rate"])} million miles.')
p('Motorways: one for every', per(gb['kind_rate']['motorway']), 'million; A-roads: one for every', per(gb['kind_rate']['a']), 'million.')
p()
rows = sorted([c for c in C.values() if c['five']['rate']], key=lambda c: c['five']['rate'])
def line(c):
    v = c['five']
    return (f'| {c["name"]} | {f(v["am"])} | {per(v["rate"])} | {round(100 * v["ratio"])}% |')
p('Fewest collisions for the traffic (A-roads and motorways):')
p()
p('| Council area | Collisions | One for every (million miles) | Of what national averages give |')
p('|---|---|---|---|')
for c in rows[:10]: p(line(c))
p()
p('Most collisions for the traffic:')
p()
p('| Council area | Collisions | One for every (million miles) | Of what national averages give |')
p('|---|---|---|---|')
for c in rows[-10:][::-1]: p(line(c))
p()
few = [c for c in C.values() if c['five']['am'] < 10]
p('Council areas with fewer than 10 collisions on A-roads and motorways (no rate shown):',
  ', '.join(c['name'] for c in few) or 'none')
p()
p('## 3. The files for circles')
p()
sz = sorted(v[1] for v in IX['squares'].values())
p(f'{len(IX["squares"])} squares of {IX["size"] // 1000} km. The biggest files (compressed):',
  ', '.join(f'{k} {v[1]} KB' for k, v in sorted(IX['squares'].items(), key=lambda x: -x[1][1])[:5]) + '.')
p()
p('## 4. Positions before 2000')
p()
p('A collision is left out of councils and circles when its position can\'t be placed, or lands more than 20 km')
p('outside its police force\'s area (a garbled position). Great Britain\'s own totals keep every collision.')
p()
gbt = gb['trend']
p('| Year | Collisions in Great Britain | Left out |')
p('|---|---|---|')
for y in sorted(gbt, key=int):
    if int(y) > 2005: break
    placed = sum(c['trend'][y][0] for c in C.values())
    p(f'| {y} | {f(gbt[y][0])} | {round(100 * (1 - placed / gbt[y][0]), 1)}% |')
p()
p('Counts start in 1989 (John, November 9th 2026). From 1983 to 1988, 4% to 15% of collisions a year would be')
p('left out: whole police forces\' positions are unusable in some years (Strathclyde every year, West Midlands and')
p('Humberside in 1986, Northumbria in 1987, about half of the City of London\'s in 1986); before 1983 it\'s worse.')
open(MD, 'w').write('\n'.join(L) + '\n')
print('\n'.join(L))
