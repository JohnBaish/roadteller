# Roadteller — build plan

Each stage on its own branch, merged only when John says (notes and documents
may be merged without asking). Every stage is checked in a real browser at
1200px, 390px with touch and 844 by 390 with touch, with what couldn't be
checked said plainly. John agreed `SPEC.md` and this plan on November 9th 2026.

## Stage 0 — spec and plan (done)

`SPEC.md` and this file, agreed by John on November 9th 2026 ("Let's go!").

## Stage 1 — the data build (no page yet)

1. The build script, from the data tests' code: download the sources, rebuild
   the stretches from OS Open Roads, match every collision in Great Britain,
   work out vehicle miles and rates (stretch, road, council area, region, Great
   Britain), the trends from 2000, and the counts for the previous five years.
2. Trim and split the collisions by postcode area (SPEC §9.2); measure the
   sizes, including the trend from 2000 (about 4.0 million collisions), and
   bring the figures to John if it's too big.
3. A review list for John: stretches that couldn't be rebuilt, collisions left
   unmatched, council areas with unusual figures.
4. Checks: West Berkshire 510 collisions on A-roads and motorways, one for every
   14.0 million miles, 46% of what national averages would give; the Reading
   A329 stretch checked by hand; Great Britain's totals against DfT's published
   tables.
5. How the data gets rebuilt each year (by hand here, or a "Rebuild data"
   workflow), worked out with John (SPEC §13.7).

## Stage 2 — choosing a place

The postcode and place box with suggestions (from Refueller's postcode and
place data), the council area list, the address after "#", the last choice
remembered on the device, Change, and dark mode. A plain list of figures behind
it, to prove the lookups work.

## Stage 3 — the council area view

SPEC §6 built from the agreed mock-up with the app's own parts: the big figure,
allowing for the mix of roads, the trend with clickable years, who was hurt,
when, which roads, share buttons. Shown to John before merging.

## Stage 4 — the circle view

SPEC §7: the circle counted on the device from the postcode area files, the
three sizes, the main roads through it with their junction names, and the link
to the whole council area. Shown to John before merging.

## Stage 5 — the map of shaded squares

Options A, B and C at 1200px and 390px, for John to choose (SPEC §13.4); then
built.

## Stage 6 — finishing and launch

1. About these figures, the credits checked against each source's terms, and
   the footer (SPEC §10).
2. Favicon options and the link-preview picture, shown to John before wiring in.
3. Search set-up (`SEO-HANDOVER.md`): title, description, canonical, robots.txt,
   sitemap.
4. Vercel project and `roadteller.baish.net` (John), Web Analytics.
5. `/fresh-look`; a testing stage only when John says "It's now in testing"
   (SPEC §13.8).
6. After launch: the card on www.baish.net, the overview and the tracker.

## Later

The items in SPEC §12.

## Dates to remember

1. End of November 2026: DfT's provisional January to June 2026 collisions
   (SPEC §8.2).
2. About June 2027: DfT's 2026 traffic figures.
3. Late July 2027: DfT's final 2026 collisions, which move the five years on to
   2022 to 2026.
4. Every six months: a new OS Open Roads.
