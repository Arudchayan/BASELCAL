# Task 3 Report: Per-programme plan storage (v7)

## Status

Complete.

## Implementation

- Added programme-scoped plan keys: `basel-plan-v7:<programmeId>`.
- Added programme-scoped notes and shortlist keys.
- Added persisted active programme selection at `basel-active-programme-v1`.
- Added v6 Data Science plan migration, plus legacy v5 fallback.
- Migrated global Data Science notes and shortlist into programme-scoped v7 storage.
- Removed migrated legacy keys after copying.
- Wired application startup, persistence, and owner logout to the active programme.
- Kept the previous Data Science storage APIs as deprecated compatibility wrappers.

## TDD evidence

1. Added migration and programme-isolation Playwright tests.
2. Confirmed both tests failed before implementation:
   - v7 migration key was absent.
   - `savePlanForProgramme` was not defined.
3. Implemented storage APIs and startup migration.
4. Confirmed focused tests and the complete suite pass.

## Verification

- `npm run validate`: passed (0 errors; existing catalog/detail warnings only).
- `npm run build`: passed (existing bundle-size warning only).
- `npm run lint`: passed.
- `npm test`: 38 passed, 1 skipped.
- `git diff --check`: passed.

## Self-review

- Non-empty v7 Data Science plans take precedence over stale legacy data.
- Missing or genuinely empty v7 plans can recover legacy v6/v5 data.
- Notes and shortlist migration never overwrites an existing scoped value.
- Other programme plans initialize empty and use isolated keys.
- Invalid stored active programme IDs fall back to Data Science.

## Concerns

None blocking. The existing Vite bundle-size warning and validation data warnings are unrelated to this task.
