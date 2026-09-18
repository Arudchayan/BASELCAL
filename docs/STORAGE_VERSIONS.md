# Storage version audit

All browser persistence lives in `src/planStorage.ts` (admission/unlock keys in
`src/studentConfig.ts`). Current plan version: **v7**
(`PLAN_STORAGE_VERSION = 7`). Per-programme keys carry the version and the
programme id, e.g. `basel-plan-v7:data-science`.

Share/export is **not** a storage key. After #18, writers emit a v1
`kind: "baselcal-plan"` JSON blob (`exportPlanPayload` / `#p=` hash). That is
an interchange format, not a `localStorage` slot. This inventory lists only
keys the running app actually reads or writes.

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
| `basel-ds-admission-target` | unversioned | integer string, clamped `[0, 30]` | n/a (global; not per-programme) |
| `basel-active-programme-v1` | — | programme id | n/a (selector, not plan data) |
| `baselcal-home-v1` | — | campus-map home pin | n/a (not plan data) |
| `basel-ds-unlock-v1` (sessionStorage) | — | owner-unlock flag / overlay | n/a (session-scoped by design) |

## Migration behaviour (`ensurePlanMigrated`)

Runs only for the default programme (`data-science`) on load:

1. If the v7 plan slot is empty, copy the newest present legacy plan (`v6`, else `v5`) into it.
2. If the v7 notes/shortlist slots are unset, copy the unversioned values over.
3. **Delete every legacy key** (`v6`–`v1` plans, unversioned notes/shortlist) so stale
   copies can never shadow the v7 slots afterwards.

## Explicit migrate gaps (accepted)

- **v1–v4 plan payloads are deleted, not migrated.** Their exact schemas predate
  the versioned era and were never pinned; writing a migrator would mean guessing
  at user data. Anyone upgrading from a v4-or-older install starts from an empty
  board (or the owner seed). Durable backup across versions is the JSON export:
  writers emit v1 `kind: "baselcal-plan"`; `importPlanPayload` still reads legacy
  `version: 2` / `version: 3` files.
- **Only v6/v5 are carried forward**, and only into an *empty* v7 slot — a
  non-empty v7 board always wins; migration never merges or overwrites.
- **Only the default programme migrates legacy keys.** `computer-science` and
  `mathematics` are Phase-1 disabled (`enabled: false`) and always boot empty.
- **Admission target is global, not per-programme** (`basel-ds-admission-target`
  via `ADMISSION_STORAGE_KEY` in `studentConfig.ts`).
- **Corrupt JSON fallback:** `loadJson(key, fallback, validate?)` returns the
  caller fallback when parse fails or the optional shape guard rejects; it does
  not invent values. Notes/wishlist boot and programme-switch use `isNotesRecord`
  / `isStringArray`. Plan slots do **not** go through `loadJson`: parse failure
  falls back to empty (or the owner seed) and that fallback is persisted.
  Unknown course IDs are dropped; garbage entries are skipped. Never invent plan
  state from a bad blob.
