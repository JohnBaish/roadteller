# Roadteller — working notes

(Named Riskreckoner until November 9th 2026, and Roadreckoner before that.
Log entries written before the rename keep the old name.)

**Road safety measured against traffic levels.** A free baish.net tool
(`roadteller.baish.net`, to be set up) for injured people on the roads near
any postcode or place in Great Britain: how many, who, when, which roads, and
how the area compares, fairly, with elsewhere, from the police's injury
collision records (DfT's STATS19) and DfT's traffic counts. A sister tool to
Clockmaker and Backtimer (`JohnBaish/clockwheel`), Flowcharter, Hindcaster,
Lightreader, Refueller and Riverwatcher.

Read these first, in this order:

1. The tracker's `projects/roadteller.md` in `JohnBaish/baish.net-directory`:
   decisions so far, open questions and next steps.
2. The proposal (a Claude doc, John's):
   https://claude.ai/artifact/VqAyHmbhu7Aiv2n7W1z38D
3. `design/data-tests/README.md`: the West Berkshire and Reading tests.
   The original Reading test is in the "My websites" Claude project
   (`claude/riskreckoner-data-tests.md`, under its old name), which Claude
   Code can't open.
4. The design options: https://claude.ai/artifact/Ej97EjfWGY6DYMLcVTwt8d
   (source `design/mockups/`; pictures in `design/mockups/previews/`).
5. `HOUSE-STYLE.md`, copied from clockwheel on November 9th 2026 (commit
   `49cbf9e`), with `SEO-HANDOVER.md`, `.claude/skills/fresh-look/`,
   `.gitignore` and `.github/workflows/tidy-branches.yml`. Clockwheel holds
   the master copies; if they change, re-copy them and note it here.
6. The baish.net overview, `design/overview/` in clockwheel.

**`SPEC.md` and `PLAN.md`** (drafted November 9th 2026, waiting for John
to agree them and answer SPEC §13). Nothing gets built until he does.

Key points:

- John is not a developer. Explain plainly and briefly, say what he needs to
  do, and use British spelling. He decides the wording.
- Agree before building anything. Show rendered options (A, B, C) at 1200px
  and 390px with touch. Questions in numbered batches.
- Each stage on its own branch, merged only when John says (notes and
  documents may be merged without asking, HOUSE-STYLE §10). A dated log entry
  for every change. After a merge, run "Delete merged branches" (trial, then
  real) and check with `git ls-remote --heads origin`.
- Check in a real browser at 1200px, 390px with touch and 844×390 with touch,
  and say what couldn't be checked.
- **Nothing a visitor types or chooses leaves their browser.** The postcode is
  looked up on the device and kept after "#".
- **No made-up figures**, in mock-ups too.
- **Totals only:** no list of individual collisions, and no details of the
  people involved (decided November 2nd 2026). No "dangerous" or "safe"
  labels on roads.
- Wording rules (HOUSE-STYLE §15): "less than/more than", month-first dates,
  "to" for ranges, one to nine in words, times as "5.50pm".
- Dark mode from the start, following the device (HOUSE-STYLE §2).
- **Project tracker:** when something significant changes (a stage finished, a decision made, something goes live or is parked), update this project's file and its line in `INDEX.md` in `JohnBaish/baish.net-directory`, following that repo's README, straight to its `main` (John's standing permission, even when this session was given its own branch). Before committing there, run `node site/check-tracker.mjs` in that repo and fix anything it lists.

Data notes:

- Hosts needed: `data.dft.gov.uk` (STATS19) and `roadtraffic.dft.gov.uk`
  (allowed November 9th 2026); traffic files and the Major Roads Database are
  on `storage.googleapis.com`; OS Open Roads from `api.os.uk`.
- STATS19's `local_authority_highway` matches the traffic file's council
  areas (highway authorities: 205 in Great Britain with traffic for every year
  2021 to 2025). The districts (`local_authority_ons_district`) don't.
- A rate is shown as "one for every 8.6 million miles driven", with the share
  of the Great Britain rate in words and % (John, November 9th 2026).

## Log

### 2026-11-09 — spec and plan drafted

**John:** go ahead. `SPEC.md` (what's agreed, what's proposed, eight questions
in §13) and `PLAN.md` (stages 0 to 6) written from the proposal, John's answers,
the data tests and the five rounds on option B. Size checked for the circle's
trend: 3,998,361 collisions from 2000 to 2025 in STATS19 (9,116,625 since
1979). Docs only.

### 2026-11-09 — round 5: batch 4 answered

**John (batch 4):** West Berkshire's rates cover A-roads and motorways only (the
switch is gone; counts elsewhere still cover all roads); the "previous five
years" comparison stays, 2020 included ("people know when the pandemic was");
West Berkshire gets the same line ("This compares to 1,122 in the previous five
years.", 2016 to 2020). The options page now ends with "Next: SPEC.md and
PLAN.md". Pictures in `design/mockups/previews/round-5/`.

**Checked:** 1200px, 390px with touch and 844 by 390 with touch, West
Berkshire and the circle: no errors, no sideways scrolling.

### 2026-11-09 — round 4 of option B

**John (batch 3):** questions 3 to 5 yes (stretch names, "2021 to 2025
inclusive", the comparison wording); the circle leads with its count. His
changes: the line above each big figure in orange, with "for every" smaller on
West Berkshire's; the circle's second line "This compares to 126 in the
previous five years." (2016 to 2020); "West Berkshire as a whole (A-roads and
motorways only)"; the circle's two explanatory notes dropped; "In the circle"
and "Collisions on the whole stretch" columns dropped; the circle's road note
in his words; "driven on West Berkshire's A-roads and motorways"; his wording
for "Allowing for the mix of roads"; a "Great Britain rate" column in "Which
roads", with "Rates not available" for minor roads.

**Found, put to John:** West Berkshire's figures until now were for all roads
(DfT estimates minor-road traffic for each council area), so his "A-roads and
motorways only" wording didn't match them. Both are now on the page, with a
switch. A-roads and motorways only, 2021 to 2025: 510 collisions over 7,138
million vehicle miles, one for every 14.0 million miles (Great Britain 4.3
million, 31%; South East 4.9 million); national averages would give 1,120,
so 46%; South East 97%. Year by year from 2000 in
`design/data-tests/a-roads-and-motorways-by-year.json`. All roads: as before
(8.6 million, 37%, 54%). **Caught before publishing:** the first build showed
14.1 million, worked from the rate already rounded to 7.1; exact rates are now
stored.

**Checked:** 1200px, 390px with touch and 844 by 390 with touch, both
versions and the circle: no errors, no sideways scrolling; share buttons still
make their pictures.

### 2026-11-09 — repo created; work pushed

John created `JohnBaish/roadteller` (public). The four commits made in the
session were pushed to `main` unchanged; GitHub holds them (checked with
`git ls-remote`). They had been parked as a git bundle on clockwheel's
session branch `claude/wizardly-babbage-nb841w` while there was no repo; that
copy is now removed. Fixed: the rename had also changed the name of the
original Reading test file in the Claude project, which keeps its old name.

### 2026-11-09 — renamed Roadteller

**John:** Riskreckoner becomes **Roadteller** (address roadteller.baish.net,
repo `JohnBaish/roadteller`). He wanted roads or travel in the name; he
considered RoadAssessor, but "assessor" suggests a verdict, road-condition
surveys, insurance assessors and the Road Assessment Programme. "Reckoner"
had been Claude's favourite in the chat, not his. Web searches found no
product called Roadteller (not a trademark check). Every current mention is
changed: these notes, the data-test scripts and the mock-ups. Earlier log
entries keep the old name.

### 2026-11-09 — round 3 of option B (local, not yet pushed)

**John (round 2):** a bold lead line above the big figure, about half its size;
"44% higher than the rate for Great Britain's A-roads" rather than "about half
as much again"; try "2021 to 2025 inclusive"; keep the table of kinds of road;
the year line shows 2025 until a year is clicked, and clicking anywhere else
clears it; Great Britain's bars beside "Who was hurt"; share buttons on every
chart, as in Refueller; a note beginning "The one-mile circle's rates …".

**Correction:** the circle's big figure said "2.2 million miles driven on the A4
through the middle". That stretch (DfT count point 78260) runs from the A339
junction to Pipers Way, Thatcham; at its closest it is 876 m from the middle
of RG14, and only about 1.1 of its 6 km is inside the circle. Its rate covers
the whole stretch, including collisions outside the circle. Now a circle leads
with its count (129 injury collisions), with West Berkshire's rate beside it,
and its main roads are listed by DfT's junction names with how much of each
lies inside (straight-line lengths, so "about").

**Built:** `compareText` (below Great Britain "about a third of … (37%)", above
it "44% higher than …", from about twice "about twice … (204%)"); `pairBars`
and `svgBars` (SVG, so they can be shared); share buttons making the picture
Refueller's way (light colours, heading, place and dates, credit), shown in an
overlay here because the preview page can't copy or share; tap or click away
clears the year; stretch cards on phones.

**Checked:** 1200px and 390px with touch, light and dark: no errors, no
sideways scrolling; a year marked by click or tap, cleared by clicking
elsewhere; every share button makes a picture (2,000 by 1,044 pixels); fonts
in the pictures checked by eye.

### 2026-11-09 — John's round 1 answers; option B worked up (local, not yet pushed)

**John decided:** option B; the rate as "one for every 8.6 million miles
driven", with "about a third of the Great Britain rate" and the % in
brackets; similar places by demo 3 (Great Britain's rate for each kind of
road applied to the area's own traffic); no rates over time for a circle
(counts only); single years only by clicking a year on the "Better or worse
than before?" chart; a days-of-the-week chart under "When". He also noted that
"2021 to 2025" can read as four years (question 1 of batch 2).

**What:** the options page reworked as option B only (A and C remain in the
source, unused): the share in words (`shareWords`, nearest of a quarter, a
third, half … three times), an "Allowing for the mix of roads" card with
bars and a table by kind of road, clickable and keyboard-usable years on the
trend chart with a line beneath, days of the week (Monday first). The circle's
year line compares with the year before rather than with Great Britain's
total. Round 1 pictures kept in `design/mockups/previews/round-1/`.

**Checked:** Chromium at 1200px and 390px with touch, light and dark: no
errors, no sideways scrolling; clicking, tapping and Enter on a year all
change the line; 2010's figures checked by hand (18.0 per 100 million
vehicle miles, one for every 5.6 million).

### 2026-11-09 — repo started; West Berkshire test; options A, B and C (local, not yet pushed)

**John** (from Claude chat): start the repo, rerun the data tests somewhere
rural, then show options A, B and C for the main page, especially the
comparisons, the longer trend and demos of "similar places"; spec and plan
only after he chooses.

**Repo:** `JohnBaish/riskreckoner` didn't exist yet, and this session isn't
allowed to create repositories, so these files were made locally and wait for
John to create it (public).

**Data test** (`design/data-tests/`): the matching rebuilt from the tracker's
description, checked on Reading (38 m and 3.7 m medians, close to the chat's
38 m and 4 m), then run on West Berkshire. Straight lines are much worse in
the countryside (88 m median, 97 collisions more than 500 m from any line);
rebuilt stretches bring it to 6 m and nine unmatched. 23% of collisions move
stretch, against 6% in Reading, and six of 18 stretch rates change by more
than 20% or cross the 10-collision line. A looser rebuild (ends snapped up to
2.5 km, un-numbered pieces allowed at four times their length) rebuilt 39 of
47 stretches, against 34.

**Options page** (https://claude.ai/artifact/Ej97EjfWGY6DYMLcVTwt8d): real
figures for a mile round RG14 (Newbury) and for West Berkshire, 2021 to 2025.
A, sentence cards with a yardstick and a trend chart with "2021 to 2025 /
Since 2000 / Since 1979"; B, one big plain-English figure ("one injury
collision for every 8.6 million miles driven"), a neighbours ladder with an
"allowing for the mix of roads" switch, trends indexed to 2000, year chips;
C, questions down the side, a dot strip of all 205 council areas, and "then
and now" figures. Four similar-places demos: 1 nearest neighbours, 2
lookalikes by road mix, 3 no list (Great Britain's rate for each kind of road
applied to the area's own traffic: West Berkshire had 54% of expected), 4 road
by road for a circle. All wording is draft.

**Checked:** in Chromium at 1200px and 390px with touch, light and dark (14
views): no script errors, no sideways scrolling; fixed on the way: B's big
figure wrapping, axis steps of 187.5, a chart in C drawn at half width,
overlapping labels on the yardstick. **Corrected before publishing:** the
test table first said five West Berkshire rates changed by more than 20%; it
was three, plus three that crossed the 10-collision line.

**Not checked:** a real phone; the 844×390 sideways view; similar places
for areas other than West Berkshire; whether "neighbours" by nearest middle
match shared borders (the real list would use boundaries).
