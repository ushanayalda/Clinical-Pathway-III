# Clinical Pathway III

Static GitHub Pages prototype for the complete Case 001 vertical slice defined by Clinical Pathway Authority Pack v2.

## Learner rooms

- Home
- Library
- Station
- Review
- Journey

The live Station is answer-safe. It begins with the reading screen, reveals one response at a time, records an encounter log, gates the patient's response to the management plan, and locks when finished. Review remains unavailable until finish and then opens as a staged sequence beginning with Self-check.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`.

## Validate

```bash
npm test
```

The audit checks required files, Case 001 boundaries, station gates, lazy Review loading, the staged Review sequence, Library answer safety, Journey structure, accessibility hooks, GitHub Pages compatibility and prohibited drift.

## Data boundary

- `assets/data/case-001/station.json` contains blind-station content.
- `assets/data/case-001/review.json` contains answer-bearing teaching and is fetched only after `Finish station`.
- `assets/data/library.json` contains discovery metadata without clinical answers.
- `assets/data/case-001/governance.json` is internal and is never loaded by learner code.

## Governance position

This branch is a prototype implementation, not a clinical release. Source review, clinical review, audio release and product release remain **HOLD**. No audio, voice scoring or medication content was generated.

See:

- [Authority trace](docs/AUTHORITY_TRACE.md)
- [Build worklog](docs/BUILD_WORKLOG.md)
- [Acceptance report](qa/acceptance-report.md)
