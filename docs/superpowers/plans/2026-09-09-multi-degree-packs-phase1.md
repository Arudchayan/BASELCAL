# Phase 1: Degree-pack foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract MSc Data Science into the first degree pack, add a generic rule engine + per-programme plan storage + header programme switcher, without changing DS validation behaviour.

**Architecture:** Degree packs under `degrees/<id>/`; shared `ProgrammeId` registry; `evaluatePackRules()` drives progress; plans keyed `basel-plan-v7:<programmeId>` with migration from `basel-ds-plan-v6`. CS/Math packs are registered but `enabled: false` until Phase 2/3.

**Tech Stack:** React 19, TypeScript, Vite, existing Playwright + `validate_all.cjs` / `validate_details.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-09-multi-degree-packs-design.md`

**Out of scope for this plan:** Live CS/Math rule encoding, VV scrapes for CS/Math, Vertiefung/specialization UX beyond stubs, university-wide VV crawl.

## Global Constraints

- DS public behaviour stays equivalent: same 120 CP buckets, same example outline, same validation outcomes.
- `npm run validate`, `npm run build`, and `npm test` must stay green after each task that touches runtime code.
- Do not bake personal student config into the client bundle.
- Unofficial disclaimer remains on exports.
- Exhaustive `switch` defaults use `never` checks for new unions.
- No inline imports.

---

## File map

| Path | Responsibility |
|------|----------------|
| `degrees/data-science/manifest.json` | Pack id, labels, totals, enabled |
| `degrees/data-science/rules.json` | Moved/adapted from `degree_rules.json` + UI labels |
| `degrees/data-science/examplePlan.json` | Copy/move of `src/examplePlan.json` |
| `degrees/computer-science/manifest.json` | Stub `enabled: false` |
| `degrees/mathematics/manifest.json` | Stub `enabled: false` |
| `src/degrees/types.ts` | `ProgrammeId`, pack types, rule AST types |
| `src/degrees/registry.ts` | Load manifests, list programmes, get active pack |
| `src/degrees/ruleEngine.ts` | Generic evaluation |
| `src/degrees/dataSciencePack.ts` | Typed import of DS pack JSON |
| `src/degreeRules.ts` | Thin DS-compatible facade over rule engine (keep exports) |
| `src/planStorage.ts` | v7 keys + migration |
| `src/programmeContext.tsx` | Active programme React state |
| `src/App.tsx` | Switcher + wire context |
| `src/ProgressPanel.tsx` / `CourseExplorer.tsx` | Consume active pack modules/labels |
| `degree_rules.json` | Keep as re-export/copy synced for `validate_all.cjs` OR point validate at pack |
| `tests/logic.spec.ts` | Engine + storage migration tests |

---

### Task 1: Pack JSON + registry types

**Files:**
- Create: `degrees/data-science/manifest.json`
- Create: `degrees/data-science/rules.json`
- Create: `degrees/computer-science/manifest.json`
- Create: `degrees/mathematics/manifest.json`
- Create: `src/degrees/types.ts`
- Create: `src/degrees/registry.ts`
- Test: `tests/logic.spec.ts` (extend)

**Interfaces:**
- Produces: `ProgrammeId`, `DegreeManifest`, `listProgrammes()`, `getManifest(id)`, `DEFAULT_PROGRAMME_ID = 'data-science'`

- [ ] **Step 1: Add failing Playwright logic assertion for registry**

In `tests/logic.spec.ts`, add a small node-free browser test that imports registry via a tiny exported helper, OR add `tests/degrees-registry.spec.ts` that hits a page exposing nothing — prefer unit-style check in `tests/logic.spec.ts` if it already evaluates pure TS via page.evaluate.

If `tests/logic.spec.ts` only runs in browser with bundled app, instead create `validate_degrees_registry.cjs` later. Prefer: export registry and assert from a new file `src/degrees/registry.test-helpers` used by Playwright:

```ts
// In tests/logic.spec.ts — after existing imports/helpers
test('degree registry lists DS enabled and stubs disabled', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const mod = await import('/src/degrees/registry.ts');
    const list = mod.listProgrammes();
    return {
      ids: list.map((p: { id: string }) => p.id),
      ds: list.find((p: { id: string }) => p.id === 'data-science')?.enabled,
      cs: list.find((p: { id: string }) => p.id === 'computer-science')?.enabled,
      math: list.find((p: { id: string }) => p.id === 'mathematics')?.enabled,
      defaultId: mod.DEFAULT_PROGRAMME_ID,
    };
  });
  expect(result.ids).toEqual(['data-science', 'computer-science', 'mathematics']);
  expect(result.ds).toBe(true);
  expect(result.cs).toBe(false);
  expect(result.math).toBe(false);
  expect(result.defaultId).toBe('data-science');
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `npx playwright test tests/logic.spec.ts -g "degree registry"`
Expected: FAIL resolving `/src/degrees/registry.ts` or import error.

- [ ] **Step 3: Create types + manifests + registry**

`degrees/data-science/manifest.json`:

```json
{
  "id": "data-science",
  "displayName": "Data Science",
  "shortName": "DS",
  "degreeTitle": "MSc Data Science",
  "totalCp": 120,
  "enabled": true,
  "brandSubtitle": "University of Basel · MSc Data Science · unofficial",
  "sources": {
    "rules": "Official MSc Data Science 2026 programme rules",
    "vvProgrammeLabel": "Master's Studies: Data Science"
  }
}
```

`degrees/computer-science/manifest.json` / `degrees/mathematics/manifest.json`: same shape, `enabled: false`, titles Computer Science / Mathematics, `totalCp: 90`.

`degrees/data-science/rules.json` — copy current `degree_rules.json` and add label map:

```json
{
  "admission": { "target": 0, "kind": "exact", "module": "Admission requirement", "configurable": true, "label": "Admission Req" },
  "math": { "target": 18, "kind": "min", "module": "Mathematical Foundations", "label": "Math Found." },
  "ml": { "target": 18, "kind": "min", "module": "Machine Learning Foundations", "label": "ML Found." },
  "systems": { "target": 18, "kind": "min", "module": "Systems Foundations", "label": "Systems Found." },
  "foundationsSum": { "target": 64, "kind": "min", "label": "Foundations Sum", "sumOf": ["math", "ml", "systems"] },
  "electives": { "target": 20, "kind": "exact", "module": "Electives in Data Science", "label": "Electives" },
  "thesis": { "target": 36, "kind": "exact", "module": "Thesis", "label": "Thesis block" },
  "mscTotal": { "target": 120, "kind": "exact", "label": "MSc Total" },
  "grandTotal": { "target": 120, "kind": "exact", "derived": "mscPlusAdmission", "label": "Grand Total" }
}
```

`src/degrees/types.ts`:

```ts
export type ProgrammeId = 'data-science' | 'computer-science' | 'mathematics';

export type RuleKind = 'exact' | 'min';

export type PackRuleEntry = {
  target: number;
  kind: RuleKind;
  module?: string;
  configurable?: boolean;
  derived?: string;
  label: string;
  sumOf?: string[];
};

export type DegreeManifest = {
  id: ProgrammeId;
  displayName: string;
  shortName: string;
  degreeTitle: string;
  totalCp: number;
  enabled: boolean;
  brandSubtitle: string;
  sources: { rules: string; vvProgrammeLabel: string };
};
```

`src/degrees/registry.ts`: import the three manifests, export `DEFAULT_PROGRAMME_ID`, `listProgrammes()`, `getManifest(id)`, `listEnabledProgrammes()`.

- [ ] **Step 4: Re-run test — expect PASS**

Run: `npx playwright test tests/logic.spec.ts -g "degree registry"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add degrees src/degrees tests/logic.spec.ts
git commit -m "feat: add degree pack manifests and programme registry"
```

---

### Task 2: Generic rule engine (DS-equivalent)

**Files:**
- Create: `src/degrees/ruleEngine.ts`
- Create: `src/degrees/dataSciencePack.ts`
- Modify: `src/degreeRules.ts` (delegate)
- Keep: `degree_rules.json` in sync for `validate_all.cjs` (same numbers)
- Test: `tests/logic.spec.ts`

**Interfaces:**
- Consumes: `PackRuleEntry` map, `Course[]`, admission target
- Produces: `evaluatePack(courses, rules, admissionTarget) => { stats, buckets, isComplete, issues, rules }`

- [ ] **Step 1: Write failing test — DS example outline still evaluates complete under engine**

```ts
test('rule engine matches DS facade on empty admission example shape', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { evaluatePlan } = await import('/src/degreeRules.ts');
    const { evaluatePack } = await import('/src/degrees/ruleEngine.ts');
    const { DS_RULES } = await import('/src/degrees/dataSciencePack.ts');
    const { COURSES } = await import('/src/courses.ts');
    const example = await import('/src/examplePlan.json');
    const ids = Object.values(example.plan).flat() as string[];
    const courses = ids.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);
    const a = evaluatePlan(courses as never[], 0);
    const b = evaluatePack(courses as never[], DS_RULES, 0);
    return {
      facadeComplete: a.isComplete,
      engineComplete: b.isComplete,
      facadeMsc: a.stats.mscTotal,
      engineMsc: b.stats.mscTotal,
      sameIssues: JSON.stringify(a.issues) === JSON.stringify(b.issues),
    };
  });
  expect(result.facadeComplete).toBe(true);
  expect(result.engineComplete).toBe(true);
  expect(result.facadeMsc).toBe(120);
  expect(result.engineMsc).toBe(120);
  expect(result.sameIssues).toBe(true);
});
```

(Adjust import paths if Vite needs `?url` — use whatever pattern existing tests use for JSON.)

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx playwright test tests/logic.spec.ts -g "rule engine matches"`
Expected: FAIL missing `ruleEngine` / `dataSciencePack`.

- [ ] **Step 3: Implement `evaluatePack`**

Logic:
- For each rule key with `module`: sum CP where `creditModule(course) === module`.
- For `sumOf`: sum those bucket values.
- For `mscTotal`: sum CP where `type !== 'Admission'`.
- For `grandTotal`: sum all CP; target = mscTotal.target + admission when `derived === 'mscPlusAdmission'`.
- Reuse `statusFor` / issue strings identical to current `degreeRules.ts`.
- Bucket order: admission, math, ml, systems, foundationsSum, electives, thesis, mscTotal, grandTotal.

`dataSciencePack.ts` imports `degrees/data-science/rules.json` as `DS_RULES`.

Update `degreeRules.ts` to call `evaluatePack` for `evaluatePlan` / `computeStats` / `withAdmissionTarget` so existing imports keep working. Keep exporting `DEGREE_RULES` shaped like today (can derive from `DS_RULES`).

- [ ] **Step 4: Run test + validate**

Run: `npx playwright test tests/logic.spec.ts -g "rule engine matches"`
Expected: PASS

Run: `npm run validate`
Expected: PASS (CHECK example outline still green)

- [ ] **Step 5: Commit**

```bash
git add src/degrees src/degreeRules.ts degrees/data-science/rules.json tests/logic.spec.ts
git commit -m "feat: add pack rule engine with DS-equivalent evaluation"
```

---

### Task 3: Per-programme plan storage (v7)

**Files:**
- Modify: `src/planStorage.ts`
- Test: `tests/logic.spec.ts` or `tests/app.spec.ts`

**Interfaces:**
- Produces: `planStorageKey(programmeId)`, `loadPlanForProgramme(id)`, `savePlanForProgramme(id, plan)`, migrate v6 → `data-science`

- [ ] **Step 1: Failing test — v6 migrates to data-science key**

```ts
test('migrates basel-ds-plan-v6 into basel-plan-v7:data-science', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
      s1: [], s2: [], s3: [], s4: [],
    }));
  });
  await page.goto('/');
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys.some((k) => k === 'basel-plan-v7:data-science')).toBe(true);
});
```

(May need to call migration explicitly if App only migrates on load — assert after first interaction or export a `ensurePlanMigrated()` invoked at startup.)

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
export const PLAN_STORAGE_VERSION = 7;
export function planStorageKey(programmeId: ProgrammeId): string {
  return `basel-plan-v7:${programmeId}`;
}
```

On load:
1. If `planStorageKey('data-science')` empty and `STORAGE_KEYS.plan` (v6) present → copy then remove v6 (keep legacy keys list for older).
2. `loadActiveProgrammeId()` / `saveActiveProgrammeId()` using `basel-active-programme-v1`.
3. Notes/shortlist: either keep global for Phase 1 or key by programme — **Phase 1: key notes/shortlist by programme** (`basel-notes-v7:<id>`, etc.) and migrate old global notes into data-science only.

- [ ] **Step 4: Run test + `npm test` smoke**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: store plans per programme (v7) with DS migration"
```

---

### Task 4: Programme context + header switcher

**Files:**
- Create: `src/programmeContext.tsx`
- Modify: `src/App.tsx` (brand + switcher)
- Modify: `src/main.tsx` if provider wrap needed
- Test: `tests/app.spec.ts`

**Interfaces:**
- Produces: `useProgramme()` → `{ programmeId, setProgrammeId, manifest, enabledProgrammes }`

- [ ] **Step 1: Failing test**

```ts
test('programme switcher shows DS selected and stubs disabled', async ({ page }) => {
  await page.goto('/');
  const switcher = page.getByRole('combobox', { name: /programme|degree/i });
  await expect(switcher).toBeVisible();
  await expect(switcher).toHaveValue('data-science');
  // Opening options: CS/Math present but disabled OR hidden — pick one and assert.
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement provider + `<select>` in header**

- Changing programme: save current plan to current key → set programmeId → load other plan (empty default).
- Brand subtitle from `manifest.brandSubtitle`.
- Disabled options for `enabled: false` packs (visible so users see roadmap) **or** hide them — **prefer visible + disabled with title “Coming soon”**.

- [ ] **Step 4: Tests PASS; manual: switch stays on DS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add header programme switcher with pack context"
```

---

### Task 5: Wire explorer/progress/copy to active pack (DS-only behaviour)

**Files:**
- Modify: `src/ProgressPanel.tsx`, `src/CourseExplorer.tsx`, `src/QuickTips.tsx`, `src/App.tsx`
- Optional: move `src/examplePlan.json` load through pack path while keeping file for validate

- [ ] **Step 1: Failing test — brand subtitle and MSc total still 120 for DS**

Existing `tests/oss-flows.spec.ts` / `app.spec.ts` assertions on “MSc ECTS” / 120 — run them; if any hard-code only DS strings that break with switcher, update selectors.

Add:

```ts
test('active DS pack still shows 120 CP rules in progress UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/MSc Data Science/i)).toBeVisible();
  // load example if needed then:
  await expect(page.getByText(/120/)).toBeVisible();
});
```

- [ ] **Step 2–4: Replace direct `DEGREE_RULES` module lists in Explorer with pack-driven module list derived from DS rules modules; keep identical order/labels for DS.**

- [ ] **Step 5: `npm test` + `npm run validate` + commit**

```bash
git commit -m "feat: drive explorer and progress from active degree pack"
```

---

### Task 6: Docs + validate path clarity

**Files:**
- Modify: `README.md`, `DATA.md`, `agent.md` (brief Phase 1 note)
- Modify: `validate_all.cjs` only if rules path moved — prefer keep `degree_rules.json` as mirrored DS rules for node validate

- [ ] **Step 1: Ensure `degree_rules.json` matches `degrees/data-science/rules.json` targets (script or comment “source of truth: degrees/…; mirror for validate”).**

- [ ] **Step 2: Document Phase 1 in README Scope section: switcher present; CS/Math coming soon.**

- [ ] **Step 3: `npm run validate && npm run build && npm test`**

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: note multi-degree Phase 1 foundation"
```

---

## Phase 2 / 3 (separate plans — do not implement here)

- **Phase 2:** Enable Computer Science pack — official 90 CP rules, specialization chooser, VV scrape root, example outline, shared course memberships.
- **Phase 3:** Enable Mathematics pack — Vertiefung picker, exams synthetics, VV year packages.

---

## Plan self-review

1. **Spec coverage (Phase 1):** packs, registry, rule engine for DS, shared storage keys, switcher, DS non-regression — covered. Full shared course graph memberships deferred lightly (filter hook can be identity for DS); acceptable for Phase 1 with note in Task 5.
2. **Placeholders:** none intentional.
3. **Types:** `ProgrammeId` consistent across tasks.
