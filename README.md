# BaselCal

Curriculum planner for the **University of Basel MSc Data Science** program (Vite + React + TypeScript).

## Quick start

```bash
npm install
npm run dev
```

## Accuracy checks

```bash
npm run validate   # catalog rules + approved 149 / 121 CP preset checks
npm run audit:modules # compare against the live Fall 2026 MSc DS module tree
npm test           # Playwright UI / logic tests
npm run build      # typecheck + production build
```

## Docs

- [agent.md](agent.md) — domain rules, preset, handoff notes
- [DATA.md](DATA.md) — catalog and VV data sources to trust

## Persistence

- Allocation-aware plan references (`basel-ds-plan-v6`); empty storage seeds the confirmed Fall 2026 selections plus the approved 149 CP ML/PhD outline
- Degree targets: `degree_rules.json` (shared by UI + `npm run validate`)
- Freshness / disputed modules: `coverage_policy.json` → `src/coveragePolicy.ts`
- Export JSON includes an unofficial-planner disclaimer

Dev server: `http://localhost:5179` (dedicated port for Playwright).
