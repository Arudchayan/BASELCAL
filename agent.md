# BaselCal - MSc Data Science Curriculum Planner

Last verified: 2026-09-04

## Project Context
BaselCal is a React + Vite + TypeScript app for planning and **validating** a University of Basel **MSc Data Science** curriculum against official 2026 credit rules.

## Degree rules (source of truth: `degree_rules.json` → `src/degreeRules.ts`)

| Bucket | Rule |
|--------|------|
| Admission (Auflagen) | **Exactly 28 CP** |
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
- Analysis I & II (4+4) + both Practicals (2+2) = **12 CP**
- Algorithms & Data Structures lecture (6) + Practical (2) = **8 CP**
- Scientific Computing lecture (6) + Practical (2) = **8 CP**

This is the current student's individualized admission package, not a universal program requirement. Always verify it against the Zulassungsbescheid.

## User constraints
- **Timeframe:** complete Admissions + Master's in **4 semesters**
- **Career:** PhD / ML track
- **Attendance:** front-load physical classes early; Sem 4 is remote-friendly (thesis + learning contract)

## Approved ML/PhD plan (149 CP)
Defined in `src/types.ts` as `ML_PHD_PRESET_IDS`.

The official exact rules remain 120 MSc / 148 overall. This approved student-specific plan intentionally overshoots by 1 CP. Spring 2027 onward is provisional; verify live VV offerings and times before enrolment. Reinforcement Learning (`ML-78174`) and Inverse Problems (`ML-67343`) are irregular, and cached historical data currently shows the `ML-17165`/`E-53822` and `M-66096`/`ML-67343` overlaps.

| Semester | CP | Notes |
|----------|----|--------|
| S1 Fall | 33 | Confirmed Fall 2026 selection |
| S2 Spring | 41 | Provisional; includes RL and two 6 CP projects |
| S3 Fall | 37 | Provisional; systems project, Inverse Problems, thesis prep |
| S4 Spring | 38 | Provisional; thesis plus remaining admission work |

Module totals: Admission 28, Math 18, ML 27, Systems 20, Foundations 65, Electives 20, Thesis 36, **MSc 121**, **Grand 149**. `ML-60876` and `ML-67343` are explicitly allocated to Machine Learning Foundations.

## Domain rules
- **Jahreskurs:** Analysis split into `AD-10489-1` (Fall 4 CP) and `AD-10489-2` (Spring 4 CP)
- **Offerings:** `src/offering.ts` parses lowercase `when` strings (fall/spring/biennial/irregular/contract)
- **Learning contracts:** no fixed schedule; remote-friendly
- **Cross-listing:** eligible courses can be allocated to a permitted bucket; the selection is persisted
- **Projects:** ML, Systems, and Data Science projects each have mutually exclusive 6/12 CP variants
- **Persistence:** plan stored as allocation-aware course references (`basel-ds-plan-v6`); empty storage seeds the approved plan and the immediately previous default migrates forward

## Data pipeline
```
vv_scrape_cache.json  →  scrape_and_apply_vv.cjs  →  src/courses.ts
                                                       ↓
                                               npm run validate
```

See [DATA.md](DATA.md) for which catalog and VV data sources to trust.

VV **completeness** (all MSc DS module courses on VV): [COVERAGE_VERIFICATION_PLAN.md](COVERAGE_VERIFICATION_PLAN.md). Phase 0 policy: `coverage_policy.json`.

## Commands
- `npm run dev` — local UI
- `npm run build` — typecheck + production build
- `npm run validate` — catalog + preset arithmetic
- `npm test` — Playwright suite

## Agent handoff
1. Do **not** change CP math or the approved plan without `npm run validate` passing (approved 149/121; official exact rules remain 148/120).
2. Append new courses to `courses.ts` carefully; keep module tags consistent with ID prefixes.
3. Keep UI premium (glass + motion) but never sacrifice validation honesty.
