"""Checks on the built data, against the data tests and simple sums.

python3 -I build/check.py <data folder> <WORK>
"""
import sys, json, pickle
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *

OUT, WORK = sys.argv[1:3]
A = json.load(open(f'{OUT}/areas.json'))
fails = []; passed = 0
def check(name, ok, detail=''):
    global passed
    if ok: passed += 1
    else: fails.append(f'{name}: {detail}')

gb = A['gb']; C = A['councils']; R = A['regions']
# every collision with a council adds up to Great Britain, year by year
# Great Britain's counts are the full totals; councils leave out collisions with no
# usable position (up to about 3% a year before 2000, almost none since)
for y in map(str, range(FIRST_YEAR, LATEST + 1)):
    s = sum(c['trend'][y][0] for c in C.values())
    check(f'councils add up, {y}', s <= gb['trend'][y][0] and s >= gb['trend'][y][0] * (0.97 if int(y) < 2000 else 0.995),
          f'{s} of {gb["trend"][y][0]}')
for y in map(str, range(RATE_FROM, LATEST + 1)):
    s = sum(c['trend'][y][2] for c in C.values())
    check(f'traffic adds up, {y}', abs(s - gb['trend'][y][2]) < 0.01 * gb['trend'][y][2], f'{s} of {gb["trend"][y][2]}')
    s = sum(r['trend'][y][0] for r in R.values())
    check(f'regions add up, {y}', s == sum(c['trend'][y][0] for c in C.values()), f'{s}')
# West Berkshire against the data test (A-roads and motorways, 2021 to 2025)
wb = C['E06000037']['five']
check('West Berkshire collisions near 510', abs(wb['am'] - 510) <= 10, wb['am'])
check('West Berkshire traffic near 7,138 million miles', abs(wb['am_mvm'] - 7138) <= 0.02 * 7138, wb['am_mvm'])
check('West Berkshire one for every 14.0 million miles',
      round(100 / wb['rate'], 1) in (13.9, 14.0, 14.1), round(100 / wb['rate'], 2))
check('West Berkshire about 46% of expected', 0.43 <= wb['ratio'] <= 0.49, wb['ratio'])
check('no year before 1983', min(map(int, gb['trend'])) == FIRST_YEAR == 1983)
check('West Berkshire previous five years near 1,122', abs(wb['prev_all'] - 1122) <= 15, wb['prev_all'])
# Great Britain: the rate for A-roads and motorways near one for every 4.3 million miles
check('Great Britain one for every 4.3 million miles', round(100 / gb['five']['rate'], 1) in (4.2, 4.3, 4.4),
      round(100 / gb['five']['rate'], 2))
check('Great Britain ratio is 1', abs(gb['five']['ratio'] - 1) < 1e-6, gb['five']['ratio'])
check('205 or more council areas', len(C) >= 205, len(C))
check('people hurt by group add up', sum(gb['five']['who'].values()) == gb['five']['hurt'])
# stretches
S = pickle.load(open(f'{WORK}/stretches.pkl', 'rb'))
st = S['stretches']
check('most stretches rebuilt', sum(1 for s in st if s['rebuilt']) / len(st) > 0.8)
n = sum(s['n'] for s in st)
check('matched collisions counted once', abs(n - sum(1 for k, v in S['match'].items() if v[0] in ('one', 'junction'))) < 1)
a329 = [s for s in st if s['cp'] == 6924]
check('Reading A329 Norcot Road to Prospect Street (hand check: 88 over 29.3)',
      a329 and 80 <= a329[0]['n'] <= 92 and abs(a329[0]['mvm'] - 29.3) < 0.5, a329 and (a329[0]['n'], a329[0]['mvm']))
print(f'{passed} passed, {len(fails)} failed')
for f in fails: print('  FAIL', f)
sys.exit(1 if fails else 0)
