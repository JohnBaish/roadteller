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
5. `python3 -I build/roads.py DL data`: roads to draw the maps on (every road by 10 km square, main roads by
   50 km square; about 25 minutes). `areas.py` also writes each council's map (`data/council-maps/`).
6. `python3 -I build/check.py data WORK` and `node scripts/check-page.ts`: the checks.
7. `python3 -I build/review.py data WORK design/data-review.md`: the review list.

The download folder holds (not kept in the repo):

- `collision-all.csv` (1979 onwards), `collision.csv` and `casualty.csv` (the last
  five years), from `data.dft.gov.uk/road-accidents-safety-data/`;
- `aadf/dft_traffic_counts_aadf.csv`, `local_authority_traffic.csv`,
  `region_traffic_by_road_type.csv` and `mrdb/MRDB_2025_published2.*`, from
  `storage.googleapis.com/dft-statistics/road-traffic/`;
- `or-all/data/*_RoadLink.*`, OS Open Roads (ESRI Shapefile, GB), and
  `bl/Data/GB/{county_region,district_borough_unitary_region,english_region_region}.*`,
  OS Boundary-Line (ESRI Shapefile, GB), both from `api.os.uk`.
