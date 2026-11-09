import sys, math, shapefile
from collections import defaultdict
DL=sys.argv[1]; want={36127:'A4',94263:'A338',26014:'M4',74037:'M4',99633:'A34',73891:'A329',95123:'A4',75106:'A4',73588:'A34'}
mr=shapefile.Reader(f'{DL}/mrdb/MRDB_2025_published2'); ends={}
for sr in mr.iterShapeRecords():
    cp=int(sr.record['CP_Number'])
    if cp in want: ends[cp]=(sr.shape.points[0],sr.shape.points[-1])
osr=shapefile.Reader(f'{DL}/or/data/SU_RoadLink')
L=defaultdict(list)
for sr in osr.iterShapeRecords(fields=['roadNumber','startNode','endNode','formOfWay']):
    if sr.record['roadNumber'] in set(want.values()): L[sr.record['roadNumber']].append((sr.record['startNode'],sr.record['endNode'],sr.shape.points,sr.record['formOfWay']))
for cp,rn in want.items():
    g=defaultdict(set); xy={}
    for a,b,p,f in L[rn]: g[a].add(b); g[b].add(a); xy[a]=p[0]; xy[b]=p[-1]
    res=[]
    for (x,y) in ends[cp]:
        k=min(xy,key=lambda k:(xy[k][0]-x)**2+(xy[k][1]-y)**2); res.append((k,round(math.dist(xy[k],(x,y)))))
    # component sizes
    def comp(s):
        seen={s};st=[s]
        while st:
            u=st.pop()
            for v in g[u]:
                if v not in seen: seen.add(v);st.append(v)
        return seen
    c0=comp(res[0][0]); print(cp,rn,'snap',[r[1] for r in res],'same component' if res[1][0] in c0 else 'DIFFERENT components', len(c0))
