# BaselCal data files

Canonical runtime catalog: **`src/courses.ts`**.

## Authority ladder (what wins on conflict)

1. **Official program rules** — `src/degreeRules.ts` (2026 MSc DS CP targets)
2. **VV live** — `vorlesungsverzeichnis.unibas.ch` (existence, CP, semester, lecturer, exam, schedule, vvId)
3. **`vv_scrape_cache.json`** — scraped field snapshots
4. **`src/courses.ts`** — app catalog after validation passes

See **`coverage_policy.json`** for objids, synthetic IDs, CP preserve rules, and `lastVerified` stamp. Full verification workflow: **`COVERAGE_VERIFICATION_PLAN.md`**.

## Trust these

| File | Role |
|------|------|
| `src/courses.ts` | Live app catalog (71 courses) |
| `coverage_policy.json` | VV module objids, title/CP exceptions, stale watch list, verification metadata |
| `vv_scrape_cache.json` | Best VV enrichment (status, vvId, schedule, exam, …). Do **not** overwrite Jahreskurs 4+4 Analysis split with VV’s raw 8 CP. |
| `vv_msc_ds_official.json` | Live VV audit snapshot (66 detail pages, 2026-07-21). Re-run via `vv_msc_ds_official_scrape.cjs`. |
| `vv_audit_table.json` | Compact audit table derived from official scrape |
| `validate_all.cjs` | Official 148/120 arithmetic gate (`npm run validate`) |

## Pipeline

```
scrape_and_apply_vv.cjs  ←  vv_scrape_cache.json
        ↓
  src/courses.ts
        ↓
  npm run validate
```

Optional: `tree.json` holds VV faculty/module shells (MSc DS leaves currently empty — needs follow-up scrape to discover missing offerings).

## Freshness notes

- Irregular / biennial courses may carry older VV semester metadata; the UI flags irregular and biennial placements.
- Analysis I & II share similar Thu/Fri 08:15 slots by design (Jahreskurs).
- Lecture vs practical pairs often share a **title** but differ in CP — check the CP badge.
- `course_evaluations.md` holds human/agent audit notes (VV coverage, stale offerings, module conflicts).
