"""Shared helpers for the Roadteller data build.

Every script takes the download folder (DL) as its first argument and writes into
the repo's data/ folder; working files go in a work folder (WORK), not the repo.
"""
import json, os, math
from collections import defaultdict

import numpy as np
import pandas as pd
import shapely
import shapefile

MILES_PER_KM = 0.621371
FIRST_YEAR = 1989          # STATS19 starts in 1979, but many positions before 1989 are unusable (John, November 9th 2026)
RATE_FROM = 2000           # DfT's count-point traffic starts in 2000
LATEST = int(os.environ.get('RT_LATEST', 2025))   # last complete year of collisions
FIVE = list(range(LATEST - 4, LATEST + 1))
PREV_FIVE = list(range(LATEST - 9, LATEST - 4))

# Boundary-Line codes that DfT's traffic file still uses in their old form.
RECODE = {'E08000016': 'E08000038', 'E08000019': 'E08000039'}   # Barnsley, Sheffield

REGION_NAMES = {
    'E12000001': 'North East England', 'E12000002': 'North West England',
    'E12000003': 'Yorkshire and the Humber', 'E12000004': 'East Midlands',
    'E12000005': 'West Midlands', 'E12000006': 'East of England', 'E12000007': 'London',
    'E12000008': 'South East England', 'E12000009': 'South West England',
    'S92000003': 'Scotland', 'W92000004': 'Wales',
}

# casualty_type → the page's road-user groups
def user_group(t):
    t = int(t)
    if t == 0: return 'walking'
    if t == 1: return 'cycling'
    if t in (2, 3, 4, 5, 23, 97): return 'motorcycle'
    if t == 9: return 'car'
    return 'other'

USER_GROUPS = ['walking', 'cycling', 'motorcycle', 'car', 'other']


def road_name(cls, num):
    """STATS19 first_road_class/number → 'M4', 'A329(M)', 'A33', or None for minor roads."""
    cls = int(cls); num = str(num)
    if cls not in (1, 2, 3) or num in ('0', '-1', '', 'nan'):
        return None
    return ('M' if cls == 1 else 'A') + num + ('(M)' if cls == 2 else '')


def kind_of(cls):
    cls = int(cls)
    return 'motorway' if cls in (1, 2) else 'a' if cls == 3 else 'minor'


class Councils:
    """Today's highway authorities from OS Boundary-Line: two-tier counties, unitary
    authorities, metropolitan districts and London boroughs (Scottish and Welsh
    councils are unitary). A point goes to the area it lies in, or to the nearest
    within 2 km (bridges, piers, the coast)."""

    def __init__(self, dl):
        geoms, codes, names = [], [], []
        for layer, keep in (('county_region', {'CTY'}),
                            ('district_borough_unitary_region', {'UTA', 'MTD', 'LBO'})):
            r = shapefile.Reader(f'{dl}/bl/Data/GB/{layer}')
            for sr in r.iterShapeRecords():
                if sr.record['AREA_CODE'] not in keep:
                    continue
                geoms.append(shapely.geometry.shape(sr.shape.__geo_interface__))
                codes.append(sr.record['CODE']); names.append(sr.record['NAME'])
        self.geoms = geoms; self.geoms_arr = np.array(geoms, dtype=object); self.codes = np.array(codes); self.bl_names = names
        self.tree = shapely.STRtree(geoms)
        rg, rc = [], []
        r = shapefile.Reader(f'{dl}/bl/Data/GB/english_region_region')
        for sr in r.iterShapeRecords():
            rg.append(shapely.geometry.shape(sr.shape.__geo_interface__)); rc.append(sr.record['CODE'])
        self.region = {}
        for g, c in zip(geoms, codes):
            if c[0] == 'S': self.region[c] = 'S92000003'
            elif c[0] == 'W': self.region[c] = 'W92000004'
            else:
                p = g.representative_point()
                self.region[c] = next(rc[i] for i, x in enumerate(rg) if x.contains(p))

    def assign(self, x, y):
        """Arrays of eastings and northings → array of council codes ('' where none).
        Points are grouped into 1 km squares: a square lying wholly inside one area
        takes that area without testing each point; only squares on a boundary are
        tested point by point."""
        x = np.asarray(x, float); y = np.asarray(y, float)
        out = np.full(len(x), '', dtype=object)
        ok = np.where(np.isfinite(x) & np.isfinite(y) & (x > 0) & (y > 0))[0]
        xs, ys = x[ok], y[ok]
        cell = (xs // 1000).astype(np.int64) * 10000 + (ys // 1000).astype(np.int64)
        cells, inv = np.unique(cell, return_inverse=True)
        cx = (cells // 10000) * 1000.0; cy = (cells % 10000) * 1000.0
        boxes = shapely.box(cx, cy, cx + 1000, cy + 1000)
        shapely.prepare(self.geoms_arr)
        ic, ig = self.tree.query(boxes)            # areas whose bounding box touches the square
        inside = shapely.contains(self.geoms_arr[ig], boxes[ic])
        res = np.full(len(xs), '', dtype=object)
        whole = np.zeros(len(cells), bool)
        code_of = np.full(len(cells), '', dtype=object)
        whole[ic[inside]] = True
        code_of[ic[inside]] = self.codes[ig[inside]]
        m = whole[inv]
        res[m] = code_of[inv[m]]
        # boundary squares: test each point against the areas its square touches
        todo = ~whole[inv]
        if todo.any():
            pairs = ~whole[ic]
            by_geom = {}
            for c_, g_ in zip(ic[pairs], ig[pairs]):
                by_geom.setdefault(int(g_), []).append(int(c_))
            pt_idx = np.where(todo)[0]
            pt_cells = inv[pt_idx]
            order = np.argsort(pt_cells, kind='stable')
            pt_idx = pt_idx[order]; pt_cells = pt_cells[order]
            starts = np.searchsorted(pt_cells, np.arange(len(cells)))
            ends = np.searchsorted(pt_cells, np.arange(len(cells)), side='right')
            for g_, cl in by_geom.items():
                sel = np.concatenate([pt_idx[starts[c_]:ends[c_]] for c_ in cl])
                sel = sel[res[sel] == '']
                if not len(sel): continue
                hit = shapely.contains_xy(self.geoms_arr[g_], xs[sel], ys[sel])
                res[sel[hit]] = self.codes[g_]
        # anything left (the sea's edge, bridges): the nearest area within 2 km
        miss = np.where(res == '')[0]
        if len(miss):
            p = shapely.points(xs[miss], ys[miss])
            ip2, ig2 = self.tree.query_nearest(p, max_distance=2000)
            res[miss[ip2]] = self.codes[ig2]
        out[ok] = res
        return out


def in_force_area(force, council, year, x, y, councils, km=20):
    """True where a collision lies in, or within `km` of, an area its police force
    covers. A force's areas are the council areas holding at least 0.1%, or at
    least 20, of its collisions from 2000 on, when positions are reliable (the
    count keeps small, distant places such as the Isles of Scilly). The 20 km allows for
    forces whose boundaries moved (the Metropolitan Police covered parts of
    Surrey, Hertfordshire and Essex until 2000). Garbled positions, often hundreds
    of kilometres out, and positions that couldn't be placed at all, are left out."""
    force = np.asarray(force); council = np.asarray(council, dtype=object); year = np.asarray(year)
    x = np.asarray(x, float); y = np.asarray(y, float)
    recent = (year >= 2000) & (council != '')
    pairs = pd.Series(1, index=pd.MultiIndex.from_arrays([force[recent], council[recent]])).groupby(level=[0, 1]).size()
    share = pairs / pairs.groupby(level=0).transform('sum')
    usual = defaultdict(set)
    for f, c in share[(share >= 0.001) | (pairs >= 20)].index:
        usual[f].add(c)
    ok = np.array([c in usual.get(f, ()) for f, c in zip(force, council)])
    check = np.where(~ok & (council != ''))[0]
    geom_of = dict(zip(councils.codes, councils.geoms))
    for f in np.unique(force[check]):
        idx = check[force[check] == f]
        if f not in usual: continue
        area = shapely.union_all([geom_of[c] for c in usual[f]])
        shapely.prepare(area)
        d = shapely.distance(area, shapely.points(x[idx], y[idx]))
        ok[idx[d <= km * 1000]] = True
    return ok


def dump(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(obj, f, separators=(',', ':'), ensure_ascii=False)


def r(v, n=2):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), n)


# Lists of whole numbers written as text, about half the size of JSON numbers (read by src/lib/packed.ts): each number
# zigzagged (0, -1, 1, -2 ... as 0, 1, 2, 3 ...) and written five bits to a character, low bits first; the first 32
# characters of CODE carry on to the next, the last 32 end the number. The same code is in build/roads.py.
CODE = ''.join(chr(c) for c in range(35, 127) if chr(c) != '\\')[:64]


def text(nums):
    out = []
    for d in nums:
        d = int(d)
        z = d * 2 if d >= 0 else -d * 2 - 1
        while z >= 32:
            out.append(CODE[z & 31])
            z >>= 5
        out.append(CODE[32 + z])
    return ''.join(out)


def pack_square(obj):
    """A circle file (build/tiles.py) with its lists of numbers written as text."""
    if 'recent' in obj:
        obj['recent'] = [text(c) for c in obj['recent']]
    obj['history'] = [[y, text(k), text(c)] for y, k, c in obj['history']]
    for s in obj.get('stretches', []):
        s['line'] = text(s['line'])
    return obj
