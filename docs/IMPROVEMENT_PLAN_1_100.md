# BaselCal Improvement Plan — 100 Steps

Source: 8 parallel codebase audits + 4 second-wave analyses (best-vs-world, brainstorm-30,
red-team critique, validation). Red lines respected throughout: 120 CP rule math is invariant
(`degrees/data-science/rules.json` → pack → ruleEngine → degreeRules, mirrored by
`degree_rules.json` + `validate_all.cjs` CHECK4); Phase-1 stays DS-only (registry throws for
CS/Math); honesty policy stays (coveragePolicy / offering provisional / timetable banner).

Status legend: [x] done in this PR · [~] partially done (remainder noted inline) · [ ] scheduled. Phases are ordered so every phase ends
with `npm run validate && npm run lint && npm run build && npx playwright test`.

## Phase A — Course codes everywhere (disambiguation) [x]

1. [x] Add `src/courseLabel.ts`: `isSyntheticCode` / `displayCode` / `courseFullLabel`
    `Title (CODE)` / `courseShortLabel` `CODE — Title`. Synthetic `Learning contract` rows
    (8×: ML/S/E-PROJ6/12, T-PREP/THESIS) render as `Title (Contract)`; titles already carry
    the 6/12 CP variant so they stay distinct.
2. [x] Timetable grid blocks: VV code line (mono 10px accent) above title; tooltip upgraded
    to `Title (CODE)\ntime\nroom\nMANDATORY/FLEXIBLE`. (`Timetable.tsx`)
3. [x] Timetable conflict list: `Day: Title (CODE) (time) overlaps Title (CODE) (time)`.
4. [x] Timetable unscheduled chips: `Title (CODE)` + `CODE · CP · module`.
5. [x] ProgressPanel bucket breakdown: Contributes line and per-course rows now
    `Title (CODE) · CP · allocated to …` (was code-only).
6. [x] ProgressPanel hard/soft conflict rows + alert text: codes added to title and tooltip.
7. [x] ProgressPanel disputed / missing-schedule / stale lists: `(id)` → `(code)`.
8. [x] ICS export `SUMMARY`: `CODE — Title` (contract rows keep title, which holds the
    variant); `DESCRIPTION` already carried code/CP/module.
9. [ ] CourseCard: add `title` tooltip with full `Title (CODE)` on the card title link.
10. [x] Explorer + DetailsModal: code+title+CP verified together in every row + modal header
    (most already do; close gaps, no renames of VV values).
11. [ ] Playwright: dup-search test — search `11680` vs `11681` shows two distinct cards;
    timetable shows `Computational Physics (11680)`-style labels; conflict row shows codes.
12. [ ] Docs: update `agent.md` data-model note — `id` is the PK, `code` is display-only,
    never a join key (protects `validate_all` code-keyed lookup).

## Phase B — Mobile responsiveness [x] (core), [ ] (polish)

13. [x] Remove `display:block !important` timetable mobile hack (it destroyed grid +
    absolute sessions). Grid keeps layout inside new `.timetable-scroll` (overflow-x auto,
    `min-width:640px`).
14. [x] Agenda fallback `<720px`: grid hidden, `.timetable-agenda` day-grouped list
    (time / CODE / title / room) rendered from the same `collectDaySessions` source —
    presentation-only, no logic fork.
15. [x] 860px breakpoint: closes the 721–860 dead zone (board 1-col, semesters 2-col,
    explorer/campus stack at 860 instead of 720).
16. [x] 480px breakpoint: app-shell 8px, metrics 1-col, topnav compress, segmented scrolls.
17. [x] Catalog panel: `catalog-panel` class + mobile `position:static, max-height:none`
    (unsticks the `top:84 / 100vh-140` trap that pushed semesters off-screen on touch).
18. [x] 44px touch targets under `(pointer:coarse)`: icon-btn, segmented, conflict rows.
19. [x] Toast `max-width:calc(100vw-32px)` wrap; audit-chip `min-width:0` full-width stack.
20. [x] Quick-add 24px button → 44px hit area on touch; label the vague `+` tooltip with
    destination semester (`Add Title (CODE) → S2`).
21. [ ] Planned-card "Move to S1–S4" menu (touch DnD fallback; hello-pangea has no touch
    sensors — buttons are the path, not a DnD fork).
22. [ ] Timetable agenda: sticky day headings + tap-to-details hooks.
23. [ ] Playwright viewports 360×800 / 390×844 / 768×1024: no board h-scroll, agenda
    visible <720, tap-place works, 44px targets.
24. [ ] Screenshots refresh in `docs/screenshots` (mobile + desktop) after B.

## Phase C — Trust & honesty (no erosion)

25. [ ] Provisional banner above the fold on timetable s2–s4 (exists — keep; add same
    one-liner to ICS DESCRIPTION, already there via disclaimer param — verify).
26. [ ] Per-course provenance in DetailsModal: lastVerified + semester + cached-pre-11-30
    note for Spring-27 rows.
27. [ ] `validate_details.cjs --plan` in CI on catalog-affecting PRs (CHECK1/3/4/6/9 gate).
28. [ ] Stale-watch copy: keep warnings, never silence (CHECK5/9/11 triage rule).
29. [ ] Contrast pass: muted `#8f8875/#7d7565` → `#6b6455` or 11px/600 for 10–10.5px text.
30. [ ] Focus/label pass: note textarea label, timetable session keyboard operability,
    toast `role=status`, conflict `role=alert`, `aria-pressed` on segmented.

## Phase D — Share/export lossless + honest

31. [ ] Share modal (replaces blocking confirm): preview refs, toggles for notes/shortlist/
    admission, copy + QR, keep hash refs-only.
32. [ ] Export filename includes programme (`baselcal-ds-…`).
33. [ ] ICS: per-semester download + campus LOCATION already; add TZID/VTIMEZONE + VALARM
    + SEQUENCE + stable UID review (keep skip-and-disclaim for contracts/thesis).
34. [ ] Import: itemised "kept / dropped unknown / deduped" report instead of alert wall.
35. [ ] Share length guard + JSON-file fallback for oversized plans.

## Phase E — Board UX (rejected-drag reasons, undo, empty states)

36. [x] Rejected-drag toasts (dup / variant-group / self-drop) naming `CODE → S2`.
37. [~] Add/remove toasts (done — PR-2) + Undo button in toast; Ctrl+Z shortcut; Undo(N) label (open).
38. [x] Catalog zero-result empty state + clear-filters chip + result counts.
39. [x] Explorer: `+S1–S4` add menu in detail footer (dup/variant-aware, toast-confirmed).
40. [ ] Credit-to allocation visible pre-plan (starves-electives context), not only planned.

## Phase F — Validation that explains (what → how)

41. [ ] Each rule failure links to an action (which semester, which course to move/add).
42. [ ] Allocation context inline (why a course counts where it does).
43. [ ] Semester-load bar keeps honest caps; no change to the 120CP exact math.
44. [ ] Clash rows deep-link to the timetable day + highlight (no logic change).

## Phase G — Architecture paydown (safe seams only)

45. [ ] Extract `getModuleColor` triplicate (CourseCard/Timetable/CampusRoute?) to one helper —
    keep hex values, no palette rename.
46. [ ] Extract topnav + toast from `App.tsx` god-component (leaf-only, no state moves:
    `evaluatePack`, `withAdmissionTarget`, `basel-plan-v7:<id>` keys untouched).
47. [ ] Single `SEM_LOAD_MAX`/SEMESTERS source (find 3 copies first, codemod, test).
48. [ ] Consolidate BUCKETS triple palette behind existing CSS vars (no renames).
49. [ ] Storage version audit: document v7/v6/unversioned/v3/v2; migrate gaps explicitly.
50. [ ] `loadJson` schema-guard at persistence boundary; TextEncoder base64url fix.
51. [ ] Build-time mirror check: `rules.json` ↔ `degree_rules.json` parity (dev throw exists —
    promote to CI step).
52. [ ] Import `src/` conflict/offering logic into CJS validators (dedup, same tests).

## Phase H — Deploy hardening (static + unlock only)

53. [ ] Verify `.env.example` / `.vercelignore` / build / validate docs (no contract change
    to `/api/unlock`, no committed `student.local.json`/coords/secrets).
54. [ ] Preview-env scoping check; no rate-limit theatre (static site + single function).
55. [ ] Security headers via `vercel.json` (CSP conservative — must not break Leaflet/Blob ICS).
56. [ ] Pin engines (`node 22`) + record bundle budget (619KB+171KB baseline).
57. [ ] `validate_details --live` as advisory cron (Spring-27 unpublished till 2026-11-30 —
    never a merge gate; file stale-watch instead).

## Phase I — Product clarity

58. [ ] Rename "Sign in" → "Owner sign in" (matches LoginModal copy).
59. [ ] Sandbox strip explaining local-only demo vs owner board.
60. [ ] Unify brand (BaselCal vs UniBasel DS Planner) per surface.
61. [ ] "Coming soon" programme options get Phase-2 suffix expectations (still disabled).
62. [ ] First-run checklist (catalog → semesters → validation → timetable → export).
63. [ ] Per-programme admission persistence (currently global leaks across programme switch).
64. [ ] Owner-vs-sandbox indicator + scoped sign-out (today wipes all programmes).

## Phase J — Coverage to world-class parity (scored, largest first)

65. [ ] Smart-place suggest-a-semester (`matchesSemesterFilter` + `findConflicts`).
66. [ ] Prereq display (free-text today — render, don't parse yet).
67. [ ] What-if duplicate-plan compare (needs redo/history first).
68. [ ] Redo + history depth beyond undo-20.
69. [ ] Workload/exam/travel warnings (contact hours exist; add walk-time feed from
    CampusRoute into conflicts as soft info only).
70. [ ] EN→DE i18n pass (copy externalised after UI settles).
71. [ ] Offline PWA (manifest + SW + badge) + print/PDF advisor one-pager with header.
72. [ ] ⌘K palette (code-first: type CODE → Add/Details/Jump).
73. [ ] Duplicate-resolver drawer (side-by-side compare + Add) for the 8 title-dup pairs.
74. [ ] Load heatmap + plan-summary card (celebrate 120 exact without touching math).

## Verification gates (every phase)

75. `npm run validate` (all + details offline) green.
76. `npm run lint` (oxlint) clean.
77. `npm run build` (`tsc -b` + vite) clean.
78. `npx playwright test` full suite green (Desktop Chrome baseline kept).
79. Data/UI PRs also run `validate:details:plan` — no new CHECK1/3/4/6/9 failures.
80. Code-label PRs: dup-pair Playwright assertions pass.
81. Mobile PRs: 360/390/768 viewport suite passes.
82. No VV `code`/`title`/`cp` value changes; no hand-edits to manifest/cache (DATA.md:41-49).
83. No `id`/`code` semantic changes; no `creditModule`/`eligibleModules` counting changes.
84. No ICS date changes outside reviewed TZ work (`app.spec.ts` date assertions).
85. `git status` clean tree per PR; one concern per PR for reviewability.

## PR stack (raised from this plan)

86. PR-1 (this): codes-everywhere + timetable agenda + mobile breakpoints + catalog unstick
    + 44px targets + toast/chip fixes + `courseLabel.ts` + this plan doc.
87. PR-2: Quick-add destination toast + 44px hit area + rejected-drag reasons.
88. PR-3: Explorer `+S1–S4` add menu + catalog empty-state + clear-filters.
89. PR-4: Share modal (preview/toggles/copy/QR) + programme-suffixed export filename.
90. PR-5: ICS TZID/VTIMEZONE/VALARM review + per-semester download.
91. PR-6: Import kept/dropped report + share length guard + JSON fallback.
92. PR-7: Undo Ctrl+Z + Undo(N) + add/remove toasts.
93. PR-8: `getModuleColor` dedup + topnav/toast leaf extraction (no state moves).
94. PR-9: `rules.json` ↔ `degree_rules.json` CI parity check + storage version audit doc.
95. PR-10: Contrast + focus/ARIA pass + DetailsModal provenance line.
96. PR-11: Owner-vs-sandbox indicator + scoped sign-out + per-programme admission.
97. PR-12: Suggest-a-semester + clash deep-link/highlight + allocation context.
98. PR-13: Viewport test suite (360/390/768) + screenshots refresh.
99. PR-14: `vercel.json` headers + engines pin + bundle budget record.
100. PR-15+: Phase-J features, one scored bet per PR, each behind the §75–84 gates.
