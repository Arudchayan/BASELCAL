# BaselCal

Curriculum planner for the **University of Basel MSc Data Science** program (Vite + React + TypeScript).

## Quick start

```bash
npm install
npm run dev
```

## Accuracy checks

```bash
npm run validate   # catalog + preset must hit exact 148 / 120 CP
npm test           # Playwright UI / logic tests
npm run build      # typecheck + production build
```

## Docs

- [agent.md](agent.md) — domain rules, preset, handoff notes
- [DATA.md](DATA.md) — which root/archive JSON files to trust

Plan persistence uses course IDs only (`basel-ds-plan-v2`) and rehydrates from the live catalog. Export/Import JSON is available in the UI header.
