# The data build

Python 3 with `pyshp`, `shapely` (2.x), `numpy` and `pandas` (`requirements.txt`).
Run from the repo, with a download folder (DL) and a work folder (WORK) outside it:

1. `python3 -I build/stretches.py DL WORK`: rebuild DfT's stretches along OS Open
   Roads and match the latest five years' collisions (about 3 minutes).
2. `python3 -I build/areas.py DL WORK data`: council areas, regions and Great
   Britain (about 5 minutes); needs step 1 for each council's roads.
3. `python3 -I build/tiles.py DL WORK data`: the files for circles (about 2 minutes).
4. `python3 -I build/lookup.py DL data`: which council area each postcode,
   postcode district and place (`data/os/`, copied from Refueller) is in.
   Then `python3 -I build/place_sizes.py data` (about 15 seconds): how big each place is, as the postcodes nearer to it
   than to any other place (`data/place-sizes.json`), so the maps name the best-known villages.
5. `python3 -I build/roads.py DL data`: roads to draw the maps on (every road by 10 km square, main roads by
   50 km square; about 25 minutes). `areas.py` also writes each council's map (`data/council-maps/`).
6. `python3 -I build/check.py data WORK` and `node scripts/check-page.ts`: the checks.
7. `python3 -I build/review.py data WORK design/data-review.md`: the review list.
8. After a rebuild, check three figures typed into "About these figures" (`src/components/About.tsx`; its years come
   from the data): "about a quarter" of yearly A-road and motorway traffic figures from a count that year, "about a
   third" of stretches never counted in the five years, and "about one in seven" collisions on these roads counted
   half to each stretch (for 2021 to 2025: 24% of yearly figures counted, 6,999 of 19,073 count points never
   counted, and 33,746 of 242,499 collisions at a junction; `design/wording/about-draft-2026-11-10.html`). Also check that every council in
   `scripts/councilNames.ts` still exists (the build stops if one doesn't).

The download folder holds (not kept in the repo):

- `collision-all.csv` (1979 onwards), `collision.csv` and `casualty.csv` (the last
  five years), from `data.dft.gov.uk/road-accidents-safety-data/`;
- `aadf/dft_traffic_counts_aadf.csv`, `local_authority_traffic.csv`,
  `region_traffic_by_road_type.csv` and `mrdb/MRDB_2025_published2.*`, from
  `storage.googleapis.com/dft-statistics/road-traffic/`;
- `or-all/data/*_RoadLink.*`, OS Open Roads (ESRI Shapefile, GB), and
  `bl/Data/GB/{county_region,district_borough_unitary_region,english_region_region}.*`,
  OS Boundary-Line (ESRI Shapefile, GB), both from `api.os.uk`.
