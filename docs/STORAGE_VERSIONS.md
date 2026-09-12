# Storage version audit (plan step 49)

All browser persistence lives in `src/planStorage.ts`. Current version: **v7**
(`PLAN_STORAGE_VERSION = 7`). Per-programme keys carry the version and the
programme id, e.g. `basel-plan-v7:data-science`.

## Key inventory

| Key | Since | Shape | Migrated forward? |
|-----|-------|-------|-------------------|
| `basel-plan-v7:<programme>` | v7 (current) | `{ s1..s4: (id \| { id, allocatedModule })[] }` | n/a (live) |
| `basel-notes-v7:<programme>` | v7 | `Record<courseId, note>` | n/a (live) |
| `basel-shortlist-v7:<programme>` | v7 | `string[]` (course ids) | n/a (live) |
| `basel-ds-plan-v6` | v6 | same shape as v7 (added `allocatedModule` refs) | **yes** — copied to `basel-plan-v7:data-science` when the v7 slot is empty |
| `basel-ds-plan-v5` | v5 | `{ s1..s4: string[] }` (bare ids, no allocations) | **yes** — same carry-forward as v6 |
| `basel-ds-plan-v4` | v4 | presumed `{ s1..s4: string[] }` | **no — deleted unmigrated** (see gaps) |
| `basel-ds-plan-v3` | v3 | unversioned-era shape, exact schema unknown | **no — deleted unmigrated** |
| `basel-ds-plan-v2` | v2 | unversioned-era shape, exact schema unknown | **no — deleted unmigrated** |
| `basel-ds-plan` | v1 | unversioned-era shape, exact schema unknown | **no — deleted unmigrated** |
| `basel-ds-notes` | unversioned | `Record<courseId, note>` | **yes** — copied to the v7 notes slot when empty |
| `basel-ds-shortlist` | unversioned | `string[]` | **yes** — copied to the v7 shortlist slot when empty |
| `basel-ds-theme` | unversioned | `"light" \| "dark"` | n/a (theme is not versioned; read in place) |
| `basel-active-programme-v1` | — | programme id | n/a (selector, not plan data) |
| `baselcal-home-v1` | — | campus-map home pin | n/a (not plan data) |
| `basel-ds-unlock-v1` (sessionStorage) | — | owner-unlock flag | n/a (session-scoped by design) |

## Migration behaviour (`ensurePlanMigrated`)

Runs only for the default programme (`data-science`) on load:

1. If the v7 plan slot is empty, copy the newest present legacy plan (`v6`, else `v5`) into it.
2. If the v7 notes/shortlist slots are unset, copy the unversioned values over.
3. **Delete every legacy key** (`v6`–`v1` plans, unversioned notes/shortlist) so stale
   copies can never shadow the v7 slots afterwards.

## Explicit migrate gaps (accepted, documented 2026-09-12)

- **v1–v4 plan payloads are deleted, not migrated.** Their exact schemas predate
  the versioned era and were never pinned; writing a migrator would mean guessing
  at user data. Anyone upgrading from a v4-or-older install starts from an empty
  board (or the owner seed) — the JSON export (v2/v3 payloads, `importPlanPayload`)
  remains the durable backup path across versions.
- **Only v6/v5 are carried forward**, and only into an *empty* v7 slot — a
  non-empty v7 board always wins; migration never merges or overwrites.
- **Only the default programme migrates legacy keys.** `computer-science` and
  `mathematics` are Phase-1 disabled and always boot empty by design.
- **Admission target is global, not per-programme** (`ADMISSION_STORAGE_KEY` in
  `studentConfig.ts`) — survives sign-out clearing only via export; see step 62.
- **Corrupt JSON anywhere falls back silently**: `loadJson` returns the caller
  fallback (now shape-checked via an optional guard, step 50); plan slots fall
  back to empty/seed. Corrupt values are left in place, never auto-deleted.
