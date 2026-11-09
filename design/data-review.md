# Data build review, latest five years 2021 to 2025

Made by `build/review.py` from the stage 1 build. For John to look through.

## 1. Stretches of A-road and motorway

DfT has 17,941 stretches in Great Britain. Rebuilt along the real road from OS Open Roads: 13,812 by the strict rule and 1,280 by the looser one, 84% in all. The other 2,849 keep DfT's straight line: 2,632 because the rebuilt length differed from DfT's by more than 20%, 217 because no path was found.

Of the 242,499 collisions on numbered A-roads and motorways in the five years, 239,252 were matched (98.7%), 33,746 of them at a junction (half to each stretch). They sit a median 3.9 metres from their stretch. 3,018 were more than 500 metres from any stretch of their road, and 229 were on a road number DfT has no stretch for.

Council areas with the most stretches left as straight lines (collisions on them in brackets):

- Kent: 76 (390)
- Warwickshire: 64 (203)
- Staffordshire: 60 (132)
- Hertfordshire: 55 (452)
- Lancashire: 52 (236)
- Essex: 52 (347)
- Hampshire: 48 (354)
- Leeds: 48 (344)
- Surrey: 47 (409)
- Glasgow City: 46 (120)
- North Yorkshire: 44 (81)
- Manchester: 37 (134)

Long stretches (more than 5 km) left as straight lines with 10 or more collisions, which the
straight line may have placed on the wrong stretch:

- A45, A4540 to A4040 (Birmingham): 5.7 km, 81.5 collisions, length differs
- M25, LA Boundary to 27 (Essex): 8.9 km, 47 collisions, no path
- M62, LA Boundary to 23 (Kirklees): 5.3 km, 45.5 collisions, length differs
- M1, LA boundary to 5 (Hertfordshire): 5.2 km, 44 collisions, length differs
- A419, LA Boundary to LA Boundary (Wiltshire): 8.9 km, 33 collisions, length differs
- M1, LA Boundary to LA Boundary (Nottinghamshire): 5.1 km, 31 collisions, length differs
- M4, 15 to LA Boundary (Swindon): 6.7 km, 27.5 collisions, no path
- A14, B1050 to Dry Drayton Rd/ Oakington Rd (Cambridgeshire): 8.2 km, 25.5 collisions, length differs
- M4, LA Boundary to J8/9 (Windsor and Maidenhead): 5.3 km, 24 collisions, no path
- M62, 7 to LA Boundary (St. Helens): 5.1 km, 24 collisions, length differs
- A1, A1(T) to A184 (Gateshead): 5.1 km, 24 collisions, length differs
- M5, LA Boundary to 21 (North Somerset): 7.9 km, 22.5 collisions, no path
- M4, LA Boundary to 14 (West Berkshire): 8.6 km, 21.5 collisions, length differs
- M4, 33 to 32 (Cardiff): 5.5 km, 21 collisions, length differs
- A421, A507 to LA Boundary (Central Bedfordshire): 7.7 km, 19.5 collisions, length differs
- A1(M), LA Boundary to 2 (Doncaster): 7.5 km, 18 collisions, no path
- M40, 12 to LA Boundary (Warwickshire): 9.0 km, 17 collisions, no path
- M4, 12 to LA Boundary (West Berkshire): 5.2 km, 16 collisions, length differs
- M180, LA Boundary to 2 (North Lincolnshire): 5.5 km, 15.5 collisions, no path
- M40, LA Boundary to 10 (Oxfordshire): 5.9 km, 15 collisions, no path
- … 36 in all.

## 2. Council areas

207 council areas (highway authorities as they are today). Every collision with a position, and every DfT count point, is placed in the council area it lies in.

- 207,458 of 9,116,625 collisions since 1979 couldn't be placed: nearly all are from 1979 to 1988 with garbled positions (see §4).
- In the five years, 7,562 of 513,801 collisions (1.5%) are placed in a different council area from the one the police gave, mostly on roads along a boundary.
- 91 of DfT's count points lie in a different council area from the one DfT gives.

Great Britain, A-roads and motorways: one injury collision for every 4.4 million miles.
Motorways: one for every 20.4 million; A-roads: one for every 3.2 million.

Fewest collisions for the traffic (A-roads and motorways):

| Council area | Collisions | One for every (million miles) | Of what national averages give |
|---|---|---|---|
| Rutland | 85 | 17.9 | 18% |
| Aberdeen City | 136 | 17.8 | 18% |
| Aberdeenshire | 385 | 14.7 | 22% |
| Neath Port Talbot | 237 | 14.5 | 35% |
| West Berkshire | 509 | 14.0 | 45% |
| Newport | 291 | 14.0 | 53% |
| Shetland Islands | 33 | 13.7 | 23% |
| Moray | 112 | 13.4 | 24% |
| Perth & Kinross | 482 | 13.3 | 29% |
| Bridgend | 211 | 13.1 | 42% |

Most collisions for the traffic:

| Council area | Collisions | One for every (million miles) | Of what national averages give |
|---|---|---|---|
| Islington | 2,154 | 0.3 | 1204% |
| Southwark | 3,344 | 0.3 | 1079% |
| Lambeth | 3,629 | 0.3 | 1030% |
| Hackney | 2,451 | 0.3 | 1004% |
| Haringey | 2,466 | 0.3 | 947% |
| Westminster | 3,626 | 0.4 | 861% |
| Camden | 2,001 | 0.4 | 842% |
| Lewisham | 2,164 | 0.4 | 741% |
| City of London | 463 | 0.5 | 684% |
| Wandsworth | 3,025 | 0.5 | 680% |

Council areas with fewer than 10 collisions on A-roads and motorways (no rate shown): Isles of Scilly

## 3. The files for circles

410 squares of 50 km. The biggest files (compressed): 10-3 1038 KB, 8-8 293 KB, 8-5 274 KB, 7-7 258 KB, 7-8 247 KB.

## 4. Positions before 2000

Before 1983 about one collision in seven has a garbled position that falls outside its police force's area (17% in 1979, 14% in 1981); from 1983 to 1999 about 1.5% a year, and almost none since 2001. These would add to the wrong place's counts.
