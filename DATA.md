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
| `src/courses.ts` | Live app catalog (74 courses) |
| `coverage_policy.json` | VV module objids, title/CP exceptions, stale watch list, verification metadata |
| `vv_module_manifest.json` | Complete Fall 2026 MSc Data Science module tree (32 entries / 22 unique courses, including cross-listings) |
| `vv_scrape_cache.json` | Best VV enrichment (status, vvId, schedule, exam, …). The 8 CP Jahreskurs is credited on Analysis I; Analysis II remains a 0-additional-CP continuation so the annual course is not double-counted. |
| `vv_msc_ds_official.json` | Live VV audit snapshot (66 detail pages, 2026-07-21). Re-run via `vv_msc_ds_official_scrape.cjs`. |
| `vv_audit_table.json` | Compact audit table derived from official scrape |
| `validate_all.cjs` | Official 120 CP MSc rules + example-outline arithmetic (`npm run validate`) |
| `validate_details.cjs` | Catalog title, CP, times and rooms vs `vv_module_manifest.json` (`npm run validate:details`) |

## Pipeline

```
scrape_and_apply_vv.cjs  ←  vv_scrape_cache.json
        ↓
  src/courses.ts
        ↓
  npm run validate
```

Run `npm run audit:modules` to regenerate the Fall 2026 module-tree snapshot, or `npm run refresh:modules` to also apply those fields to matching catalog courses.

Run `npm run audit:catalog` / `npm run refresh:catalog` to scrape **every** catalog course that has a VV id (admission, spring, irregular). Selected practical groups are kept when they still exist on VV. Spring 2027 is scheduled for publication on 2026-11-30; those pages may still show an older semester.

## Freshness notes

- Irregular / biennial courses may carry older VV semester metadata; the UI flags irregular and biennial placements.
- Analysis I & II share similar Thu/Fri 08:15 slots by design (Jahreskurs).
- Lecture vs practical pairs often share a **title** but differ in CP — check the CP badge.
- The Fall 2026 module tree cross-lists courses 12246, 15731, 19300, 45401, and 66937; their foundation classification is therefore valid even when they also appear under Electives.
- `course_evaluations.md` holds human/agent audit notes (VV coverage, stale offerings, module conflicts).
