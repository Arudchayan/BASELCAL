# Contributing

## Setup

```bash
npm install
npm run dev
```

Do not put personal plans, home addresses, or admission letters in `src/`. Use `config/student.local.json` (gitignored) or the `STUDENT_CONFIG` env var. See `.env.example`.

## Checks before a PR

```bash
npm run validate
npm run validate:details
npm run lint
npm run build
npm test
```

`npm run validate` already includes the time/room snapshot check. Use `npm run validate:details:live` when you want to scrape live VV pages.

`npm test` starts Vite with `BASELCAL_DISABLE_STUDENT_CONFIG=1` so CI matches a generic checkout.

## Catalog and rules

- Official MSc targets live in `degree_rules.json` (120 CP). Admission is runtime/config.
- Course catalog: `src/courses.ts`. Keep module tags consistent with ID prefixes.
- Public sample outline: `src/examplePlan.json`. It must keep `npm run validate` green.
- Do not treat the example outline as an official recommendation.

## Product rules

- Keep validation honest. No fake AI branding.
- Export JSON must include the unofficial-planner disclaimer.
- Spring 2027 and later offerings are provisional until the live VV is published.
