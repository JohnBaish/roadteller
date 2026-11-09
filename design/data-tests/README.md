# Data tests, November 9th 2026

A second, rural run of the matching first tried on Reading in the Claude chat
(`claude/riskreckoner-data-tests.md` in the "My websites" project, which a
Claude Code session can't open). These scripts were rebuilt from the method
described in the tracker and the proposal, then checked by running Reading
again: the results came out close to the chat's (see "Reading as a check").

## Sources (all downloaded on November 9th 2026, not kept in the repo)

- STATS19 collisions and casualties, last five years, and collisions
  1979 to 2025: `data.dft.gov.uk/road-accidents-safety-data/` (allowed in the
  environment for this, November 9th 2026, with `roadtraffic.dft.gov.uk`).
- DfT traffic: `dft_traffic_counts_aadf.zip`, `local_authority_traffic.csv`,
  `region_traffic_by_road_type.csv` and the Major Roads Database
  (`mrdb-2025.zip`), all on `storage.googleapis.com/dft-statistics/road-traffic/`.
- OS Open Roads, GB, ESRI Shapefile (October 2026), from `api.os.uk`; only the
  SU tile is used, which holds all of Reading and West Berkshire.
- Postcode district middles: Hindcaster's `data/outcodes.json` (OS Open Names).

## Scripts

- `match.py <dl> <ONS district code> <label> <out.json>`: the matching.
  `RR_FALLBACK=1` adds the looser rebuild described below (the results here
  used it). Needs `pyshp`, `shapely` (`pip install pyshp shapely`).
- `probe.py <dl>`: why stretches failed to rebuild (ends far from the road,
  or the road in two pieces).
- `figures.py`, `figures2.py`: the mock-ups' figures (`../mockups/mock-data.json`).

Rules, as built: a collision on a numbered A-road or motorway goes to the
nearest stretch of the same road within 500 m; if it lies within 60 m of that
stretch's end and another stretch of the road is within 60 m more, it counts
half to each. Vehicle miles: DfT's AADF × 365 × DfT's link length, 2021 to
2025. A rebuilt stretch is kept only if its length is within 20% of DfT's.

## Results, 2021 to 2025

| | Reading | West Berkshire |
|---|---|---|
| Injury collisions | 1,305 | 1,014 |
| Rural (police's flag) | 5% | 70% |
| On minor roads (counts only) | 640 | 504 |
| Median distance from road, straight lines | 38 m | 88 m |
| Median distance from road, rebuilt | 4 m | 6 m |
| More than 500 m from any straight line | 6 | 97 |
| Not matched once rebuilt | 5 | 9 |
| Matched to a different stretch once rebuilt | 37 of 660 (6%) | 115 of 501 (23%) |
| At a junction (half and half), rebuilt | 124 | 56 |
| Stretches rebuilt | 34 of 48 | 39 of 47 |
| Stretches with 10 or more collisions | 18 | 18 |
| Of those, rate changed by more than 20% | 1 | 3 |
| Of those, gained or lost a rate at the 10 line | 0 | 3 |

What it shows: on winding rural roads DfT's straight lines are not good
enough. 97 West Berkshire collisions (one in five on A-roads and motorways)
were more than 500 m from any straight line of their own road and would have
been lost. The M4's longest stretch (18.6 km) went from 0.8 to 2.7 injury
collisions per 100 million vehicle miles once rebuilt; the A34's 11.8 km
stretch from 3.2 to 6.0.

Two causes of failed rebuilds, both fixed by the looser rule: DfT's ends are
sometimes more than a kilometre from the road (the M4's sit out at junctions
such as Chieveley), and OS sometimes gives a short piece of the road no number
(roundabouts), splitting it. The looser rule snaps ends up to 2.5 km away and
lets the path use un-numbered pieces at four times their length. Strict:
34 of 47 rebuilt; looser: 39. The eight left keep straight lines, all because
the rebuilt length differed from DfT's by more than 20%.

## Reading as a check

The chat's Reading test gave 38 m and 4 m medians and 24 of 665 moving
stretch; this version gives 38 m and 3.7 m, and 37 of 660 (its junction
rule differs slightly). Close enough to trust the West Berkshire comparison.

## Also found

- Long trend: Great Britain's rate fell from 89 injury collisions per
  100 million vehicle miles in 1993 to 30 in 2025. West Berkshire has its
  own figures in STATS19 from 1994 (its highway authority code).
- Rounded locations: about a third of collisions in the 1980s have
  coordinates on a 100 m grid, 16% in 1998, 1% by 2010, none since 2019.
- Allowing for the mix of roads (Great Britain's rate for motorways, A-roads
  and minor roads applied to an area's own traffic): West Berkshire 54% of
  expected, Reading 204%, South East 106%.
