# Multi-degree Master’s packs — design

**Status:** Approved (brainstorming 2026-09-09)  
**Product:** UniBasel / BaselCal planner  
**Scope (phase goal):** MSc Data Science + MSc Computer Science + MSc Mathematics, full official credit validation, Master’s-only first.

## Decisions locked

| Decision | Choice |
|----------|--------|
| Product direction | Multi-degree planner (not VV dump-only) |
| First programmes | Data Science, Computer Science, Mathematics |
| Validation depth | Full official credit rules for all three |
| Rule authority | Same ladder as DS: Studienordnung / Wegleitung + VV module trees |
| Programme UX | Header switcher (one active degree) |
| Plan persistence | Separate saved plan per programme |
| Architecture | Degree packs + shared course graph + generic rule engine |

## Problem

Today BaselCal is a hard-coded **MSc Data Science (120 CP)** app. Official CS (2026) and Math Master’s programmes are **90 CP** with different shapes (specialization choice; Vertiefungsmodul packages + exams). Courses cross-list heavily across DMI programmes. Expanding by cloning DS three times would break maintenance and validation honesty.

## Goals

- One planner shell; swappable **degree packs**.
- Honest validation against official sources per programme.
- VV enrichment for each pack’s module tree + catalog memberships (not university-wide VV).
- DS behaviour remains correct after extraction into the first pack.
- Architecture allows more Master’s programmes later without another rewrite.

## Non-goals (this effort)

- Bachelor programmes.
- Full-university VV mirror / every faculty.
- Inferring credit rules from module names alone.
- Multi-programme mixed board validated against several degrees at once.

## Architecture

```
UI shell (board, timetable, explorer, export)
  + header programme switcher
        │ activeProgrammeId
        ▼
Plan store keyed by programmeId
        │
        ▼
Shared course graph (vvId / code)  ◄──  VV scrapers (per-pack roots)
  memberships[] per programme
        │
        ▼
Degree pack (rules, scrape config, example, synthetics, labels)
        │
        ▼
Generic rule engine (min/exact/sumOf/chooseOneGroup/completeNGroups/totals)
```

**Invariants**

1. Official programme rules win on CP math; VV wins on offerings, times, and module membership.
2. One course identity may map to different modules per programme.
3. Switching programme never mutates another programme’s saved plan.
4. Public demo stays sandbox; private owner overlay is per active programme.
5. Exports include `programmeId` and unofficial disclaimer.

## Data model

### Degree pack (`degrees/<id>/`)

| Artifact | Role |
|----------|------|
| `manifest.json` | id, display name, total CP, VV programme label / hid, periods |
| `rules.json` | Declarative buckets + special constraints |
| `scrape.json` | Module tree labels / objids for that programme |
| `examplePlan.json` | Public sample outline |
| `synthetics.json` | Thesis / prep / exams / projects not in VV |

Initial ids: `data-science`, `computer-science`, `mathematics`.

DS’s current `degree_rules.json`, example outline, and module taxonomy become the first pack; runtime behaviour for DS stays equivalent.

### Shared course graph

- Canonical key: VV detail id when present, else stable synthetic id.
- Shared fields: title, CP, schedule, lecturer, url, language, when, descriptions.
- `memberships: [{ programmeId, module, type, … }]`.
- Explorer/board filter by active programme memberships.
- Clash detection uses schedules independently of programme.

### Plan storage

- Keys like `basel-plan-v7:<programmeId>` (migrate from `basel-ds-plan-v6` → `data-science`).
- Persist `activeProgrammeId` and per-programme admission target where applicable.
- Export/import version includes `programmeId`; refuse silent cross-programme validation.

### Rule engine vocabulary

Enough to cover all three official shapes:

- `exact` / `min` on a module or named bucket
- `sumOf` buckets (DS foundations combined)
- `chooseOneGroup` + `minCp` (CS specialization ≥ 24 CP)
- `completeNGroups` (Math: two Vertiefungsmodule)
- `mscTotal` / `grandTotal` (+ optional admission overlay)

## Official programme shapes (authority)

### Data Science — 120 CP

Unchanged: Mathematical / ML / Systems Foundations mins, foundations sum, electives exact 20, thesis block 36, MSc total 120, admission overlay.

Sources: existing `degree_rules.json` + Fall VV module tree (`hid` for Master’s Studies: Data Science).

### Computer Science (Guidelines 2026) — 90 CP

From official Wegleitung excerpt (Faculty-approved 2026):

- Modules: General Topics + Distributed Systems + Machine Intelligence + Cyber Security + Data Engineering.
- **50 CP** across specialization modules + General Topics (no per-module minimum; modules may be empty).
- Student selects **one specialization**; **≥ 24 CP** in that module.
- Preparation Master’s Thesis **6**, Master’s Thesis **30**, Master’s Examination **4**.

Sources: DMI Wegleitung 2026 PDF + VV Master’s Computer Science module tree.

### Mathematics — 90 CP

From official Studienplan / Wegleitung:

- **32 CP** from **two** Vertiefungsmodule (year packages announced in VV).
- **16 CP** from further Vertiefungen or Aufbau/Master Math/Physics/CS (with exclusions).
- **12 CP** Wahlbereich.
- Masterarbeit **20**, two Masterprüfungen **10**.

Sources: Phil.-Nat. Studienplan Mathematik + VV Vertiefungsmodul listings for the academic year.

## UX

- Header switcher: Data Science · Computer Science · Mathematics.
- On switch: save current plan → load target plan → swap pack (rules, explorer, progress, example button, brand subtitle).
- Progress panel keeps current visual language; buckets and choosers are pack-specific (CS specialization selector; Math Vertiefung picker).
- Example outline loads only the active pack’s sample.
- Disclaimer and provisional flags unchanged in spirit; copy is programme-aware.

## VV / scrape pipeline

- Generalize `scrape_module_manifest.cjs` to accept a pack’s `scrape.json` (programme search label, module labels, period).
- Output per-pack manifests (or one file namespaced by programmeId).
- `refresh:catalog` remains “every course in the shared graph that has a VV id,” not a full-university crawl.
- Validation gates: per-pack module-tree reconciliation + shared detail checks.
- Do not auto-import university-wide search noise.

## Rollout

1. **Phase 1 — Foundation:** Extract DS into a degree pack; introduce shared graph + generic engine sufficient for DS; header switcher UI; per-programme plan storage; CS/Math packs may be stubs or hidden until ready. All existing DS tests/`npm run validate` stay green.
2. **Phase 2 — Computer Science:** Official rules + VV tree + specialization UX + example outline + validate gates.
3. **Phase 3 — Mathematics:** Official rules + Vertiefung picker + exam synthetics + example outline + validate gates.
4. **Later:** Additional Master’s programmes reuse the same pack interface.

## Testing

- Unit: rule engine cases for DS (regression), CS specialization, Math Vertiefungen.
- Storage: migrate v6 → v7 data-science; isolation across programme keys.
- Playwright: switcher preserves plans; example outline per programme; export includes programmeId.
- `validate_all` / details: run per enabled pack; DS checks must not regress.

## Risks

| Risk | Mitigation |
|------|------------|
| CS/Math rules encoded wrong | Cite official PDFs in pack manifests; human review before enabling pack in UI |
| Vertiefungen change yearly | Scrape + pack version stamp; UI labels “HS26/FS27 Vertiefungen” |
| Cross-listing CP double-count | Credit only via active programme membership + allocated module |
| Scope creep to full VV | Explicit non-goal; scrapers stay pack-rooted |

## References

- DS: existing BaselCal `degree_rules.json`, `coverage_policy.json`, `vv_module_manifest.json`
- CS: https://dmi.unibas.ch/en/studies/computer-science/masters/ and Wegleitung 2026 excerpt PDF
- Math: Phil.-Nat. Studienplan Mathematik / DMI Mathematik Wegleitung; Vertiefungsmodul announcements (e.g. HS26 infoabend PDF)
