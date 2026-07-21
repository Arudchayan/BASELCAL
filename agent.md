# BaselCal - MSc Data Science Curriculum Planner

Last verified: 2026-07-21

## Project Context
BaselCal is a React + Vite + TypeScript app for planning and **validating** a University of Basel **MSc Data Science** curriculum against official 2026 credit rules.

## Degree rules (source of truth: `src/degreeRules.ts`)

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

Exact buckets **fail on overshoot**. Run `npm run validate` after catalog or preset changes.

### Admission model (12 + 8 + 8 = 28 CP)
- Analysis I & II (4+4) + both Practicals (2+2) = **12 CP**
- Algorithms & Data Structures lecture (6) + Practical (2) = **8 CP**
- Scientific Computing lecture (6) + Practical (2) = **8 CP**

Verify against your Zulassungsbescheid — some letters list Analysis as 10 CP and Scientific Computing as 10 CP.

## User constraints
- **Timeframe:** complete Admissions + Master's in **4 semesters**
- **Career:** PhD / ML track
- **Attendance:** front-load physical classes early; Sem 4 is remote-friendly (thesis + learning contract)

## ML/PhD preset (exactly 148 CP)
Defined in `src/types.ts` as `ML_PHD_PRESET_IDS`:

| Semester | Approx CP | Notes |
|----------|-----------|--------|
| S1 Fall | 38 | Heavy physical + admission start |
| S2 Spring | 46 | Peak ML; Causal Inference (spring-only); Systems uses Computer Networks (4 CP) |
| S3 Fall | 28 | Thesis prep starts; irregular ML flagged |
| S4 Spring | 36 | Thesis 30 + Data Science Project 6 — no lectures |

Module totals in preset: Admission 28, Math 18, ML 28, Systems 18, Foundations 64, Electives 20, Thesis 36, **MSc 120**, **Grand 148**.

## Domain rules
- **Jahreskurs:** Analysis split into `AD-10489-1` (Fall 4 CP) and `AD-10489-2` (Spring 4 CP)
- **Offerings:** `src/offering.ts` parses lowercase `when` strings (fall/spring/biennial/irregular/contract)
- **Learning contracts:** no fixed schedule; remote-friendly
- **Persistence:** plan stored as course **IDs** only (`basel-ds-plan-v2`); rehydrated from live catalog

## Data pipeline
```
vv_scrape_cache.json  →  scrape_and_apply_vv.cjs  →  src/courses.ts
                                                      ↓
                                              actual_courses.json
                                                      ↓
                                              npm run validate
```

See [DATA.md](DATA.md) for which root JSON files to trust vs ignore.

## Commands
- `npm run dev` — local UI
- `npm run build` — typecheck + production build
- `npm run validate` — catalog + preset arithmetic
- `npm test` — Playwright suite

## Agent handoff
1. Do **not** change CP math or the ML/PhD preset without `npm run validate` passing (exact 148/120).
2. Append new courses to `courses.ts` carefully; keep module tags consistent with ID prefixes.
3. Keep UI premium (glass + motion) but never sacrifice validation honesty.
