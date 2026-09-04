# BaselCal - MSc Data Science Curriculum Planner

Last verified: 2026-09-03

## Project Context
BaselCal is a React + Vite + TypeScript app for planning and **validating** a University of Basel **MSc Data Science** curriculum against official 2026 credit rules.

## Degree rules (source of truth: `degree_rules.json` → `src/degreeRules.ts`)

| Bucket | Rule |
|--------|------|
| Admission (Auflagen) | **Admission (Auflagen) is student-specific** |
| Mathematical Foundations | **Min 18 CP** |
| Machine Learning Foundations | **Min 18 CP** |
| Systems Foundations | **Min 18 CP** |
| Foundations combined | **Min 64 CP** |
| Electives in Data Science | **Exactly 20 CP** |
| Thesis block | **Exactly 36 CP** (Prep 6 + Thesis 30) |
| Master's total | **Exactly 120 CP** |
| Grand total | **Exactly 148 CP** (28 + 120) |

Exact buckets **fail on overshoot**. Run `npm run validate` after catalog or preset changes. UI and `validate_all.cjs` both read `degree_rules.json`.

### Admission model (12 + 8 + 8 = 28 CP)
This is the student's individualized admission decision, not a universal MSc Data Science requirement.
- Annual Analysis lecture (8 CP, credited in Fall) + both Practicals (2+2) = **12 CP**
- Algorithms & Data Structures lecture (6) + Practical (2) = **8 CP**
- Scientific Computing lecture (6) + Practical (2) = **8 CP**

Verify against your Zulassungsbescheid — some letters list Analysis as 10 CP and Scientific Computing as 10 CP.

## User constraints
- **Timeframe:** complete Admissions + Master's in **4 semesters**
- **Career:** PhD / ML track
- **Attendance:** front-load physical classes early; Sem 4 is remote-friendly (thesis + learning contract)

## ML/PhD preset (exactly 148 CP)
Defined in `src/types.ts` as `ML_PHD_PRESET_IDS`.

Hands-on / PhD mix with **schedulability gates** (`npm run validate` CHECK 6):
- Sci Comp practical (`AD-62060`) and Distributed Systems (`S-45402`) are never co-scheduled (both Fri 10–12).
- Math of DS is in **S3** so it does not clash with Analysis I (Thu 08–10).
- The selected Analysis I practical group avoids the Scientific Computing lecture.
- Spring/Fall 2027 and later remain provisional. Reinforcement Learning (`ML-78174`) and Randomized Algorithms (`M-77777`) are irregular and must be confirmed in the live VV.

| Semester | CP | Notes |
|----------|----|--------|
| S1 Fall | 37 | Fixed confirmed selection; unchanged |
| S2 Spring | 38 | Remaining admission conditions + ML + AI + 12 CP Data Science project |
| S3 Fall | 38 | Math of DS + Randomized Algorithms + FDS + Systems project + RL + thesis prep |
| S4 Spring | 35 | Thesis + final 5 taught-module CP |

Module totals: Admission 28, Math 18, ML 26, Systems 20, Foundations 64, Electives 20, Thesis 36, **MSc 120**, **Grand 148**.

Thesis gate: **79 taught-module CP** are complete before S4, above the 76 CP start threshold. The remaining **5 taught-module CP** are completed during S4 before the presentation, reaching 84 CP.

## Confirmed Fall 2026 selections

`FALL_2026_SELECTION_IDS` reflects the timetable PDF supplied by the user: Analysis I lecture/practical, Scientific Computing lecture/practical, Random Processes, Bioinformatics Algorithms, Applied Mathematics and Informatics in Drug Discovery, Applied Programming Projects, and Multimedia Retrieval. The nine-course semester total is **37 CP**. `CURRENT_PLAN_IDS` keeps S1 exact and uses the approved S2–S4 outline, reaching **120 MSc CP / 148 CP overall**. Spring 2027 and later offerings and timetable slots remain provisional until checked against their live VV semesters.

## Domain rules
- **Jahreskurs:** `AD-10489-1` carries the annual course's full 8 CP in Fall; `AD-10489-2` is the Spring continuation with 0 additional CP, preventing double counting
- **Offerings:** `src/offering.ts` parses lowercase `when` strings (fall/spring/biennial/irregular/contract)
- **Learning contracts:** ML, Systems, and Data Science projects each have mutually exclusive 6/12 CP variants; no fixed schedule
- **Cross-listings:** planned courses persist one `allocatedModule`; CP is counted only in that chosen eligible module. The preset credits ML-60876 to Machine Learning Foundations and E-53822 to Electives.
- **Persistence:** plan stored as IDs or `{ id, allocatedModule }` references (`basel-ds-plan-v6`); only recognized prior defaults upgrade, custom v6 plans remain unchanged, and empty storage seeds `CURRENT_PLAN_IDS`

## Data pipeline
```
vv_scrape_cache.json  →  scrape_and_apply_vv.cjs  →  src/courses.ts
                                                       ↓
                                               npm run validate
```

See [DATA.md](DATA.md) for which catalog and VV data sources to trust.

VV **completeness** (all MSc DS module courses on VV): [COVERAGE_VERIFICATION_PLAN.md](COVERAGE_VERIFICATION_PLAN.md). The Fall 2026 module tree is fully reconciled; Spring 2027 is not published until 2026-11-30.

## Commands
- `npm run dev` — local UI
- `npm run build` — typecheck + production build
- `npm run validate` — catalog + preset arithmetic
- `npm run audit:modules` — regenerate the live Fall 2026 module manifest
- `npm run refresh:modules` — regenerate the manifest and apply official Fall 2026 fields to the catalog
- `npm test` — Playwright suite

## Agent handoff
1. Do **not** change CP math or the ML/PhD preset without `npm run validate` passing (exact 148/120).
2. Append new courses to `courses.ts` carefully; keep module tags consistent with ID prefixes.
3. Keep UI premium (glass + motion) but never sacrifice validation honesty.
