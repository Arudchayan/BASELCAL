# BaselCal

Curriculum planner for the **University of Basel MSc Data Science** program (Vite + React + TypeScript).

## Quick start

```bash
npm install
npm run dev
```

## Accuracy checks

```bash
npm run validate   # catalog + approved 149 / 121 CP plan (official targets stay 148 / 120)
npm test           # Playwright UI / logic tests
npm run build      # typecheck + production build
```

## Docs

- [agent.md](agent.md) — domain rules, preset, handoff notes
- [DATA.md](DATA.md) — catalog and VV data sources to trust

## Persistence

- Allocation-aware course references (`basel-ds-plan-v6`); empty storage seeds the approved ML/PhD plan
- Cross-listed courses retain the chosen degree bucket; 6/12 CP project variants are mutually exclusive
- Degree targets: `degree_rules.json` (shared by UI + `npm run validate`)
- Freshness / disputed modules: `coverage_policy.json` → `src/coveragePolicy.ts`
- Export JSON includes an unofficial-planner disclaimer

Dev server: `http://localhost:5179` (dedicated port for Playwright).
