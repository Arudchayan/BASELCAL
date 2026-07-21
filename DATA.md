# BaselCal data files

Canonical runtime catalog: **`src/courses.ts`** (mirrored by **`actual_courses.json`**).

## Trust these

| File | Role |
|------|------|
| `src/courses.ts` | Live app catalog (71 courses) |
| `actual_courses.json` | Byte-synced mirror for audits |
| `vv_scrape_cache.json` | Best VV enrichment (status, vvId, schedule, exam, …). Do **not** overwrite Jahreskurs 4+4 Analysis split with VV’s raw 8 CP. |
| `validate_all.cjs` | Official 148/120 arithmetic gate (`npm run validate`) |

## Do not use as source of truth

| File | Why |
|------|-----|
| `unibas_courses.json` | Early 31-course scrape; rooms/times superseded by VV cache |
| `live_verify_results.json` | Failed probe (wrong `details?id=` URL scheme) — false negatives |
| `preset_schedules_scraped.json` | Same broken URL pattern; all `ok: false` |
| `vv_2026_schedules.json` | Empty failed scrape |
| `73_courses.json` | Pre-retag / pre-split snapshot |
| `unique_*.json`, `to_eval.json`, `batch_*.json` | Eval pipeline residue |
| `missing.json` | Mostly obsolete vs current catalog |
| `scraped_real_data.json` | Partial title-matched enrichment; prefer VV text |

Failed / residue copies also live under **`archive/`** for reference.

## Pipeline

```
scrape_and_apply_vv.cjs  ←  vv_scrape_cache.json
        ↓
  src/courses.ts  →  actual_courses.json
        ↓
  npm run validate
```

Optional: `tree.json` holds VV faculty/module shells (MSc DS leaves currently empty — needs follow-up scrape to discover missing offerings).

## Freshness notes

- Irregular / biennial courses may carry older VV semester metadata; the UI flags irregular and biennial placements.
- Analysis I & II share similar Thu/Fri 08:15 slots by design (Jahreskurs).
- Lecture vs practical pairs often share a **title** but differ in CP — check the CP badge.
- `course_evaluations.md` is reserved for human/agent reviews (currently empty).
