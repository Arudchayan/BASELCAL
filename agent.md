# BaselCal — maintainer notes

Last verified: 2026-09-08

BaselCal is a React + Vite + TypeScript app for planning and **validating** a University of Basel **MSc Data Science** curriculum against official 2026 credit rules.

## Degree rules (`degree_rules.json` → `src/degreeRules.ts`)

| Bucket | Rule |
|--------|------|
| Admission (Auflagen) | Student-specific; default **0**. Set in the UI or `config/student.local.json` |
| Mathematical Foundations | **Min 18 CP** |
| Machine Learning Foundations | **Min 18 CP** |
| Systems Foundations | **Min 18 CP** |
| Foundations combined | **Min 64 CP** |
| Electives in Data Science | **Exactly 20 CP** |
| Thesis block | **Exactly 36 CP** (Prep 6 + Thesis 30) |
| Master's total | **Exactly 120 CP** |
| Grand total | **120 + admission** |

Exact buckets **fail on overshoot**. Run `npm run validate` after catalog or example-plan changes.

Admission courses in the catalog (Analysis, Algorithms & Data Structures, Scientific Computing) are a typical Auflagen set, not a universal requirement. Each student must match their Zulassungsbescheid.

## Public example outline

`src/examplePlan.json` is a **sample** four-semester outline used by **Load example outline**. It is not a personal enrollment and not an official recommendation.

Master’s-only mix (no AD-* Auflagen courses) with schedulability gates (`npm run validate` CHECK 6):

- Public sample is **not** a personal enrollment. Admission target is **0**.
- Math of DS (`M-66096`) sits in **S3**. Fall S1 uses PDE numerics, concentration, generative modeling, and privacy-preserving systems.
- Spring/Fall 2027 and later remain provisional. Irregular offerings in the sample must be confirmed in the live VV.

## Domain rules

- **Jahreskurs:** `AD-10489-1` carries the annual course's full 8 CP in Fall; `AD-10489-2` is the Spring continuation with 0 additional CP.
- **Offerings:** `src/offering.ts` parses lowercase `when` strings (fall/spring/biennial/irregular/contract).
- **Learning contracts:** ML, Systems, and Data Science projects each have mutually exclusive 6/12 CP variants.
- **Cross-listings:** planned courses persist one `allocatedModule`; CP is counted only in that chosen eligible module.
- **Persistence:** plan stored as IDs or `{ id, allocatedModule }` (`basel-ds-plan-v6`). Empty storage stays empty unless a private student config sets `seedPlan`.
- **Private overlay:** `config/student.local.json` or `STUDENT_CONFIG` (build-time). Tests set `BASELCAL_DISABLE_STUDENT_CONFIG=1`.

## Data pipeline

```
vv_scrape_cache.json  →  scrape_and_apply_vv.cjs  →  src/courses.ts
                                                       ↓
                                               npm run validate
```

See [DATA.md](DATA.md). Fall 2026 module tree is reconciled; Spring 2027 is not published until 2026-11-30.

## Commands

- `npm run dev` — local UI
- `npm run build` — typecheck + production build
- `npm run validate` — catalog + official 120 CP rules + example outline + time/room snapshot
- `npm run validate:details:live` — scrape live VV for title/CP/times/rooms
- `npm run audit:modules` / `npm run refresh:modules`
- `npm test` — Playwright suite (generic config)

## Agent handoff

1. Do **not** change official 120 CP math without `npm run validate` passing.
2. Keep personal plans and home coordinates out of git.
3. Keep UI premium (glass + motion) but never sacrifice validation honesty.
