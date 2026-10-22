# Designer Workflow Friction Audit — dashboard prototype

A small study of where designers and design students lose time to repetitive work, plus a dashboard that ranks those pain points and maps them to candidate AI or automation tools.

> **Sample data, not research findings.** The study has not been conducted yet. `sample-data.csv` is synthetic: every participant ID starts with `SAMPLE-` and every row is marked `SAMPLE DATA`. No conclusions should be drawn from it.

## Problem

Designers know parts of their workflow are slow, but the most time-consuming repetitive tasks are rarely measured, so tooling effort goes to the wrong places.

## Method (planned)

- **Participants:** 5–10 designers or design students, recruited directly and anonymised by ID.
- **Measures, per task:** minutes per week, times per week, friction from 1 to 5, and whether the task feels repetitive.
- **Impact score:** average minutes per week × (average friction ÷ 5) × reach, where reach is the share of participants who reported the task.
- **Output:** a ranked list of tasks, a time-versus-friction chart, and candidate tools for each category. The tools are hypotheses to validate with participants, not proven solutions.

## Limitations

The sample is small and convenience-recruited, and self-reported time is approximate. Results describe the group studied and do not generalise to all designers.

## Files

| File | Purpose |
|---|---|
| `analysis.js` | Pure functions: CSV parsing, validation, per-task aggregation, summary |
| `dashboard.js` | Renders the KPIs, ranked bars, scatter plot and table |
| `template.csv` | Survey template, one row per participant per task |
| `sample-data.csv` | Synthetic data for testing the dashboard |

Uploaded CSVs are processed in the browser and never sent anywhere. The dashboard keeps the sample-data warning for any file whose participant IDs start with `SAMPLE`.

## Replacing the sample data

1. Collect responses with `template.csv`.
2. Replace `sample-data.csv` with the real file, using IDs such as `P01`.
3. Update the banner in `index.html` and `dashboard.js`, the project card on the home page, and the label test in `tests/site.test.mjs`.

## Run

From the repository root:

```bash
npm run serve   # then open http://localhost:5173/demos/friction/
npm test
```
