# 100% VV Coverage Verification Plan

**Status:** Phase 0 complete; Phase 1 blocked on VV empty module tree — full manifest scrape awaits approval.  
**Related:** [Verification plan agent](5e742b0b-38a6-4e28-8b11-1fc9669b5f52), [Local catalog audit](4e23976e-115e-448d-8430-db257c611859), [Browse UniBasel VV catalog](2793e60d-92eb-40b5-b1f8-0d1528f3a768)

## Problem

`npm run validate` proves **148/120 CP math** and that 66 real courses match `vv_scrape_cache.json`, but it does **not** prove the catalog lists **every** course under the official MSc Data Science modules on VV. `tree.json` has module folders (objids 289453–289457) with **empty children**.

## Phases

| Phase | Goal | Key deliverable |
|-------|------|-----------------|
| **0** | Canonical SoT + policy | `coverage_policy.json` ✓ |
| **1** | Module-tree scrape | `vv_module_manifest.json`, populated `tree.json` |
| **2** | 3 independent agent passes | Browser (A), scrape replay (B), static diff (C) |
| **3** | Field-level matrix | `validate_vv_fields.cjs` → `coverage_report.json` |
| **4** | Admission track (separate) | `audit_admission_vv.cjs` → `admission_audit.json` |
| **5** | Continuous gate | Extend `validate_all.cjs` CHECK 9–14, `npm run refresh:all` |

## Success criteria

- Zero missing courses in foundations + electives vs VV module manifest
- Zero wrong `module` tags
- Stale VV semesters flagged (not silent)
- Admission exactly 28 CP with documented Auflagen risks
- Three consecutive agent cycles with empty symmetric diff
- `coverage_policy.lastVerified` stamped

## VV browser audit results (2026-07-21)

Live scrape artifacts: `vv_msc_ds_official.json`, `vv_audit_table.json`, `vv_msc_ds_official_scrape.cjs`.

| Finding | Status |
|---------|--------|
| All 65 coded catalog courses + admission duplicates on live VV | ✓ verified |
| `ML-78174` FS 2026 offering (vvId 300177) | ✓ confirmed |
| Module tree objids 289453–289457 | ✗ empty — Phase 1 still blocked |
| 11 irregular/stale semester entries | flagged in `coverage_policy.json` + UI |
| `ML-45401` module tag (ML vs Elective on VV) | open — pending program PDF |
| Learning contracts (5) | not in VV search — expected |

Re-run audit: `node vv_msc_ds_official_scrape.cjs`

## Known issues (already addressed in Phase 0)

| Issue | Resolution |
|-------|------------|
| `ML-78174` title truncated | Catalog uses full VV title; `scrape_and_apply_vv.cjs` no longer strips before `:` |
| Title policy | `coverage_policy.json` → `"titleNormalization": "full_vv_title"` |
| Wrong periode codes (`202604`/`202605`) | Use `2026004` / `2025005` per `coverage_policy.json` |

## Approval checklist (before Phase 1)

- [ ] Authority ladder accepted (`DATA.md`)
- [ ] Three agent passes accepted as merge gate
- [ ] Admission 12+8+8 model confirmed vs your Zulassungsbescheid
- [ ] Proceed with `scrape_module_tree.cjs` + manifest reconcile

## Next command (when approved)

```bash
# Planned — not wired yet
node scrape_module_tree.cjs
node reconcile_manifest.cjs
npm run validate
```

See the verification plan agent output for full architecture, field matrix, and agent review loop.
