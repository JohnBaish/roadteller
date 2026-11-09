# Riskreckoner — working notes

**Road safety measured against traffic levels.** A free baish.net tool
(`riskreckoner.baish.net`, to be set up) for injured people on the roads near
any postcode or place in Great Britain: how many, who, when, which roads, and
how the area compares, fairly, with elsewhere, from the police's injury
collision records (DfT's STATS19) and DfT's traffic counts. A sister tool to
Clockmaker and Backtimer (`JohnBaish/clockwheel`), Flowcharter, Hindcaster,
Lightreader, Refueller and Riverwatcher.

Read these first, in this order:

1. The tracker's `projects/riskreckoner.md` in `JohnBaish/baish.net-directory`:
   decisions so far, open questions and next steps.
2. The proposal (a Claude doc, John's):
   https://claude.ai/artifact/VqAyHmbhu7Aiv2n7W1z38D
3. `design/data-tests/README.md`: the West Berkshire and Reading tests.
   The original Reading test is in the "My websites" Claude project
   (`claude/riskreckoner-data-tests.md`), which Claude Code can't open.
4. The design options: https://claude.ai/artifact/Ej97EjfWGY6DYMLcVTwt8d
   (source `design/mockups/`; pictures in `design/mockups/previews/`).
5. `HOUSE-STYLE.md`, copied from clockwheel on November 9th 2026 (commit
   `49cbf9e`), with `SEO-HANDOVER.md`, `.claude/skills/fresh-look/`,
   `.gitignore` and `.github/workflows/tidy-branches.yml`. Clockwheel holds
   the master copies; if they change, re-copy them and note it here.
6. The baish.net overview, `design/overview/` in clockwheel.

**No `SPEC.md` or `PLAN.md` yet:** John chooses among the options first
(his order, November 9th 2026), then the spec and plan are written. Nothing
gets built until he agrees them.

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
