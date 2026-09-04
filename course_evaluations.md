# Course Evaluations

Human/agent notes from VV coverage audits. Runtime catalog: `src/courses.ts`.

## 2026-09-03 — Fall 2026 module-tree reconciliation

**Source:** Live University of Basel semester program, `periode=2026004`, Data Science program `hid=289451`; captured in `vv_module_manifest.json`.

### Coverage and changes

- The module tree is now populated: **32 entries / 22 unique courses** across Mathematical Foundations, Machine Learning Foundations, Systems Foundations, and Electives.
- Added three missing electives: `E-41828`, `E-41829`, and `E-76636`.
- Refreshed official Fall 2026 details for all 22 matching catalog courses, including full titles, language, lecturers, assessment text, and lecture/practical timetable sessions.
- Five courses are intentionally cross-listed: `12246`, `15731`, `19300`, `45401`, and `66937`.
- `ML-45401` is therefore not a module dispute: it is explicitly listed in both Machine Learning Foundations and Electives.
- Spring 2027 is not yet published; the live directory announces publication for 2026-11-30.

### Official-data caution

- Course `41828` currently displays a January 2026 examination date on its Fall 2026 page. This appears stale, so students must verify the assessment date in VV before enrolling.

## 2026-07-21 — Live VV browser audit (historical; superseded for Fall 2026)

**Source:** [Browse UniBasel VV catalog](2793e60d-92eb-40b5-b1f8-0d1528f3a768) → `vv_msc_ds_official.json`

### Coverage

- All **66** VV-backed catalog entries have live detail pages for HS/FS 2026 planning.
- **5** learning contracts (ML/Sys/Elective projects + thesis prep + thesis) are not searchable in VV — expected.
- VV MSc DS module folders (objids 289453–289457) return **empty** `#resultTable`; browse cannot enumerate module manifests.

### ML-78174 — Modern Reinforcement Learning

- **In catalog:** yes (`ML-78174`, full VV title).
- **Offered FS 2026:** yes, 4 CP, irregular, lecturer Ilija Bogunovic, vvId `300177`.
- **Module:** Machine Learning Foundations (catalog/PDF); VV Modules tab empty.
- **Search quirk:** `keyword=78174` returns 0 rows — use direct URL or title search.

### Stale / irregular offerings (11)

VV semester field not HS/FS 2026; keep in catalog, flag in UI:

| ID | Code | Last VV semester hint |
|----|------|------------------------|
| ML-60835 | 60835 | spring 2022 |
| ML-67343 | 67343 | older irregular |
| M-22738 | 22738 | 2025 |
| M-22740 | 22740 | 2025 |
| M-27334 | 27334 | 2025 |
| M-27335 | 27335 | 2025 |
| M-74781 | 74781 | 2025 |
| M-58951 | 58951 | 2025 |
| E-58492 | 58492 | spring 2025 (biennial) |
| E-62229 | 62229 | fall 2024 |
| E-64324 | 64324 | fall 2025 |

### Module tag conflict (resolved 2026-09-03)

**ML-45401 Bioinformatics Algorithms:** the populated Fall 2026 tree confirms it is cross-listed in both ML Foundations and Electives; the ML Foundations catalog assignment remains valid.

### Not in catalog (VV noise)

Broad “Data Science” VV search returns 300+ university-wide hits (HSS, psychology, WWZ). Examples not in the 71-course catalog: 78301, 78299, 79129. Do not add without program PDF authority.
