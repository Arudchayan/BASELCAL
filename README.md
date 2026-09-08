# BaselCal

Unofficial curriculum planner for the **University of Basel MSc Data Science** programme.

Plan four semesters, check official 2026 credit rules, spot timetable clashes, and export ICS / JSON. This is **not** an official University of Basel tool. Always verify CP rules, module membership, and offerings in the [Vorlesungsverzeichnis](https://vorlesungsverzeichnis.unibas.ch) before you enrol.

Live demo: [baselcal.vercel.app](https://baselcal.vercel.app)

## Quick start

```bash
npm install
npm run dev
```

Dev server: `http://localhost:5179`

The board starts empty. Drag courses from the catalog, or click **Load example outline** for a sample 120 CP MSc plan plus a typical 28 CP admission package.

## Your personal details stay local

Admission conditions (Auflagen), your real plan, and an optional home pin are **not** part of the public default.

1. Copy the example config:

   ```bash
   cp config/student.example.json config/student.local.json
   ```

2. Edit `config/student.local.json`:
   - `admissionTarget` — CP from your Zulassungsbescheid (`0` if none)
   - `seedPlan` — `true` to fill the board on first visit
   - `plan` / `allocations` — course IDs per semester
   - `home` — optional map pin (`lat` / `lng`); leave null to set it in the browser

3. Restart `npm run dev`. The file is gitignored.

On Vercel, paste the same JSON as the `STUDENT_CONFIG` environment variable (one line). Do not commit it.

You can also change **Auflagen CP** in the header at any time; that value is stored only in this browser.

## Accuracy checks

```bash
npm run validate   # catalog + official 120 CP MSc rules + example outline
npm run audit:modules
npm test
npm run build
```

## Degree rules

Official MSc Data Science 2026 targets (see `degree_rules.json`):

| Bucket | Rule |
|--------|------|
| Mathematical Foundations | min 18 CP |
| Machine Learning Foundations | min 18 CP |
| Systems Foundations | min 18 CP |
| Foundations combined | min 64 CP |
| Electives in Data Science | exactly 20 CP |
| Thesis block | exactly 36 CP |
| Master's total | exactly 120 CP |
| Admission (Auflagen) | **your letter** (default 0) |

Grand total = 120 + admission. Exact buckets fail on overshoot.

## Docs

- [agent.md](agent.md) — domain rules for contributors
- [DATA.md](DATA.md) — catalog and VV sources
- [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
