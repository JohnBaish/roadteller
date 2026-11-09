# Roadteller — specification

**Road safety measured against traffic levels.** A free baish.net tool for
`roadteller.baish.net`. It answers one question for any postcode or place in
Great Britain: how many people are hurt on the roads round here, who they are,
when it happens, which roads, and how that compares, fairly, with elsewhere.

Each part is marked **Agreed** (John has decided) or **Proposed** (Claude's
suggestion, for John to agree). John answered the questions in §13 on
November 9th 2026.

Sources for this spec: the proposal
(https://claude.ai/artifact/VqAyHmbhu7Aiv2n7W1z38D), John's answers to it, the
data tests (`design/data-tests/`), the design options and John's five rounds
of answers on option B (https://claude.ai/artifact/Ej97EjfWGY6DYMLcVTwt8d),
and the tracker's decisions list.

## 1. What it does (Agreed)

1. The visitor gives a place: a full or half postcode, or a town, village or
   suburb, with suggestions as they type (as in Refueller).
2. The page shows figures for a **circle round that place** or for **the whole
   council area** it's in. Not postcode districts.
3. Figures are for the **latest five complete years** (2021 to 2025 inclusive
   today), with a longer trend, and single years by clicking or tapping a year
   on the trend chart.
4. The fair comparison is the point of the tool: wherever traffic figures
   allow, collisions are set against miles driven.
5. **Totals only.** No list of individual collisions, and no details of the
   people involved (age, sex). No "dangerous" or "safe" labels on roads: the
   sentences say what happened and how it compares, and leave the judgement to
   the reader.
6. **Nothing a visitor types or chooses leaves their browser.** The postcode is
   looked up on the device and kept after "#" in the address; the last choice
   is remembered on the device.

## 2. Data sources (Agreed)

All under the Open Government Licence or OS OpenData.

1. **STATS19** (DfT): every injury collision reported to the police in Great
   Britain, with its casualties. Final figures for a year come in late July; a
   provisional January to June file at the end of November.
2. **DfT traffic counts:** daily flows at each count point (AADF), council-area
   totals for all roads (including DfT's estimates for minor roads), and
   regional totals by kind of road. Once a year (the 2025 file is dated June
   2nd 2026).
3. **DfT Major Roads Database:** each stretch of A-road and motorway between
   junctions, tied to its count point, drawn as a straight line. Once a year.
4. **OS Open Roads:** the real shape of every road, used to rebuild stretches
   along the real road (§4). Every six months.
5. **OS Open Names / postcodes:** turning a postcode or place into a point, as
   in Refueller.

Not shown: crashes in which nobody was hurt (not recorded), Northern Ireland
(the PSNI publishes its own data), and the police's contributory factors (not
in the open data).

## 3. Areas

1. **Council areas (Agreed):** the highway authorities, as in STATS19's
   `local_authority_highway`, which match DfT's traffic file. 205 in Great
   Britain have traffic figures for every year 2021 to 2025. (The districts in
   STATS19 don't match the traffic file, so aren't used.)
2. **Circles (Agreed):** half a mile, one mile or two miles round the place,
   one mile by default.
3. **Agreed:** a postcode or place opens its circle, with a link to the whole
   council area it's in ("See all of West Berkshire"). A council area can also
   be chosen from a list, as Hindcaster's counties are.
4. **Proposed:** a council area's region is its English region; in Scotland and
   Wales, the country.

## 4. Matching collisions to roads (Agreed rules, from the data tests)

1. A collision on a numbered A-road or motorway (`first_road_class` 1, 2 or 3)
   goes to the nearest stretch of the same road within 500 metres.
2. If it lies within 60 metres of that stretch's end and another stretch of the
   same road is within 60 metres more, it counts **half to each**, rather than
   guessed.
3. Stretches are rebuilt along the real road from OS Open Roads (decided
   November 9th 2026): the shortest path along links with the same road number,
   ends snapped within 300 metres; if that fails, ends snapped up to 2.5
   kilometres and short unnumbered pieces allowed at four times their length.
   A rebuilt stretch is kept only if its length is within 20% of DfT's;
   otherwise DfT's straight line is kept. West Berkshire: 39 of 47 rebuilt;
   collisions sit a median 6 metres from their road (88 metres from the
   straight lines).
4. Collisions on minor roads (B and unclassified) aren't matched: counts only.

## 5. Rates (Agreed)

1. Vehicle miles = DfT's daily flow × 365 × DfT's link length, added up over the
   same years as the collisions.
2. A rate is written **"One injury collision for every 8.6 million miles
   driven"**, with the comparison beneath: below Great Britain "about a third of
   the Great Britain rate (37%)", above it "44% higher than the rate for Great
   Britain's A-roads", from about twice "about twice … (204%)".
3. **A council area's rate covers A-roads and motorways only** (decided November
   9th 2026), because DfT's minor-road traffic is only estimated. Counts
   elsewhere on the page (who, when, the trend for a circle) cover all roads.
   West Berkshire, 2021 to 2025: 510 collisions over 7,138 million vehicle miles,
   one for every 14.0 million miles; Great Britain's A-roads and motorways one
   for every 4.3 million (31%); South East one for every 4.9 million.
4. Rates use all injury collisions. "Killed or seriously injured" uses DfT's
   adjusted figures for comparisons and the recorded figures for bare counts.
5. **Allowing for the mix of roads** ("similar places", decided as demo 3): no
   list of other places. Great Britain's rate for motorways and for A-roads is
   applied to the area's own traffic on each, giving what national averages
   would predict. West Berkshire: 1,120 predicted, 510 recorded, about half
   (46%); the South East region 97%.
6. **A circle has no rate of its own** (it has no traffic figure): it shows
   counts, plus a rate for each A-road stretch passing through it, and its
   council area's rate beside the count.
7. **Agreed:** a rate is shown only where at least 10 collisions lie behind
   it; below that, "too few to say". (Short stretches gave unsteady rates in
   the Reading test.)
8. **Proposed:** each rate uses exact figures and is rounded only when shown
   (a first build showed 14.1 million from an already-rounded rate).

## 6. The page: a council area (Agreed, option B round 5)

In order, with the house look (Hindcaster's cards, strip with Change, dark mode
following the device):

1. **The big figure:** "One injury collision *for every*" (orange, "for every"
   smaller), "14.0 million miles", "driven on West Berkshire's A-roads and
   motorways"; the comparison with Great Britain in bold; a sentence with the
   count, people hurt and killed, then "This compares to 1,122 in the previous
   five years." (2016 to 2020, 2020 included); Great Britain and the region
   beside it.
2. **Allowing for the mix of roads:** John's wording ("Taking the mix of roads
   for West Berkshire's A-roads and motorways, and applying the national
   average for those kinds of roads to West Berkshire's own traffic, would give
   1,120 injury collisions in five years. There were 510: about half (46%)."),
   bars for the area, its region and Great Britain, and a table by kind of road.
3. **Better or worse than before?** The rate since 2000 against Great Britain's,
   both indexed to 100 in 2000. The line beneath shows 2025 until a year is
   clicked or tapped; clicking or tapping anywhere else clears it.
4. **Who was hurt:** casualties by road user (walking, cycling, motorcycles,
   cars, others), with Great Britain's bars beside.
5. **When:** by hour of the day and by day of the week (Monday first).
6. **Which roads:** each A-road and motorway with its collisions, its rate and
   Great Britain's rate for that kind of road; minor roads as one line, "Rates
   not available" in both rate columns.
7. **About these figures** and the footer (§10).
8. A **Copy chart** (computer) or **Share chart** (touch screen) button under
   each chart, making a picture in the light colours with the heading, place,
   dates and credit, as in Refueller.

## 7. The page: a circle (Agreed, option B round 5)

1. **The big figure:** "Within a mile of the middle of RG14" (orange), "129
   injury collisions", "from 2021 to 2025 inclusive", people hurt and killed,
   "This compares to 126 in the previous five years."; beside it, the council
   area's A-roads-and-motorways rate and its comparison.
2. **Better or worse than before?** Counts since 2000 against Great Britain's,
   indexed to 100 in 2000 (counts only, no rates); a year's own count against
   the year before when a year is chosen.
3. **Who was hurt** and **When**, as for a council area.
4. **Main roads through the circle:** each A-road stretch passing through it, by
   DfT's junction names, with its rate and how it compares with Great Britain's
   A-roads (cards on a phone); the note "Traffic is counted between junctions,
   so some collisions are included which are outside the one-mile circle.
   Collisions at a junction between two stretches count half to each."

## 8. Other agreed points

1. **A map of shaded squares, counts only, to try** (November 9th 2026); not yet
   designed (§13).
2. **Provisional January to June figures are included each November**, marked
   as provisional.
3. **Counts go back to 1989, rates to 2000** (John, November 9th 2026). Before
   1989 too many locations are unusable: from 1983 to 1988, 4% to 15% of
   collisions a year (whole police forces in some years, Strathclyde in every
   one), and more before. In every year, a collision whose location can't be
   placed, or lands more than 20 km outside its police force's area, is left out
   of councils and circles (0.3% a year or less from 1989, almost none since
   2003); Great Britain's own totals keep every collision. Older locations are
   also rougher (many rounded to 100 metres), which is why the files for circles
   use 100-metre cells before the latest five years.

## 9. How it works (Proposed)

1. **No collector on a timetable.** The sources change only a few times a year,
   so a build script does all the heavy work ahead, run when new data comes out
   (July, November, June). The page only looks things up and counts circles on
   the device, as Refueller does.
2. **The build script** (Python, as the data tests, run by a "Rebuild data"
   workflow in GitHub Actions, Run workflow only; or by hand here):
   1. download the sources;
   2. rebuild stretches and match collisions (§4);
   3. work out vehicle miles and rates for each stretch, road, council area,
      region and Great Britain, and the trends from 2000;
   4. trim each collision to what the page needs: position, year, and for the
      latest five years also month, hour, day of the week, severity (recorded
      and adjusted), kind of road, stretch, and people hurt by road-user group;
   5. split the collisions into files by 50 km square of the OS grid (John,
      November 9th 2026), so the page loads only the one or few its circle
      touches, and tells the website no more than roughly which part of the
      country is being looked at. Years before 2000 are in a second file per
      square, loaded only when the longer view is asked for.
3. **Size** (measured in stage 1): about 13 MB compressed for all of Great
   Britain. A circle in central London loads about 1 MB, most places 100 to
   300 KB.
4. **Where the data lives:** in this public repo's `data/`, rebuilt a few times a
   year (all of it is open data). Git compresses it, so each rebuild adds about
   13 MB to the repo's history: fine for years. If it ever grows too big, the
   data can move to a separate repo, as Riverwatcher's did.
5. **The page:** Vite, React and TypeScript, as the other tools; Vercel; Web
   Analytics without the part after "#".
6. **Checks:** `npm run check` for the page's rules, and the build script checked
   against the data tests' figures (West Berkshire 510 collisions, one for every
   14.0 million miles; Reading's hand-checked A329 stretch).

## 10. Wording, credits and footer (Proposed)

1. House style §15 throughout: "less than/more than", month-first dates, "to"
   for ranges, one to nine in words, times as "5.50pm".
2. **About these figures** (draft in stage 6): what counts and what doesn't; that
   most traffic figures are DfT's estimates (a typical stretch is counted in one
   year of five); the half-and-half rule; adjusted severity; rough older
   locations; provisional figures.
3. **Credits** (wording to check against each source's terms in stage 6):
   "Contains public sector information licensed under the Open Government
   Licence v3.0." for DfT's data, and the OS line for Open Roads and postcodes.
4. **Footer:** the house privacy sentence, "More free tools at www.baish.net." and
   "Contact: workshop@baish.net."

## 11. Phones and computers (Agreed, house style)

Checked at 1200px, 390px with touch and 844 by 390 with touch; tables become
cards on a phone; charts never taller than a sideways phone's screen; tap
targets 44px; boxes 16px on touch screens; dark mode following the device.

## 12. Later (not in the first version)

1. Rates for minor roads (DfT only samples them).
2. Comparing with a second place chosen by the visitor (the proposal's "Compare
   with"), beyond Great Britain and the region.
3. Filtering by road user or by road (the proposal's optional inputs).

## 13. Questions for John (all answered November 9th 2026)

1. **The 10-collision rule** (§5.7): yes.
2. **Default circle:** one mile, with half a mile and two miles as buttons, and
   a link to the whole council area: yes.
3. **The longer trend:** yes, a circle also offers counts back to 1979 (rates
   still from 2000). Then, after stage 1 showed garbled early locations: start
   in 1983; then, after a correction (more were unusable than first said),
   1989 (§8.3).
4. **The map of shaded squares:** try 250 metres for a circle and one kilometre
   for a council area, and see; options in stage 5.
5. **Provisional half-years:** yes, five-year figures on complete years only;
   the provisional January to June figures on the trend chart, marked
   "provisional".
6. **Filters and a second place:** left for later, if at all.
7. **Updating the data:** agreed in principle, kept in this repo (John left
   where it lives to Claude: this repo, §9.4); how it's rebuilt (by hand or a
   workflow) to be worked out in stage 1.
8. **A testing stage:** only once Roadteller is built and John says "It's now in
   testing".
