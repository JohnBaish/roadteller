# Postcodes and places

Copied unchanged on November 9th 2026 from Refueller (`JohnBaish/refueller`,
commit e326ef9), which made them from OS Open Names (October 2026):

- `outcodes.json`: the middle of every postcode district in Great Britain
  (Refueller's `scripts/build-outcodes.ts`);
- `postcodes/<area>.json`: every postcode's position, one file per postcode area
  (Refueller's `scripts/build-postcodes.ts`; the format is in
  `src/lib/postcodes.ts`);
- `places.json`: cities, towns, suburbs and villages (Refueller's
  `scripts/build-places.ts`).

Contains OS data © Crown Copyright and database rights 2026. Contains Royal Mail
data © Royal Mail copyright and database right 2026. Contains National Statistics
data © Crown copyright and database right 2026.

`build/lookup.py` adds which council area (highway authority) each of them is in,
as `data/councils-of.json`.
