# Clinical Pathway III

Static GitHub Pages prototype for the Case 001 clinical mastery vertical slice.

## Learner rooms

- **Home** identifies the next useful clinical action.
- **Library** follows Phase → Pattern → Station without answer leakage.
- **Station** uses a full candidate stem and a sequential, one-question consultation.
- **Review** rebuilds clinical synthesis, decision threshold, explanation and handover one stage at a time.
- **Journey** maps phase, pattern, station, attempt, review, repair, retry and next action without gamification.

## Case 001 interaction

The live consultation is not a category-reveal game. Each step contains one clinical purpose, one question or spoken task, one patient response, and the meaning of the information obtained. The learner must state the safety action before further assessment, discuss the plan before the patient response is available, manage resistance to private transport, and complete a focused handover.

Review remains locked until `Finish station`. It then uses retrieval and one targeted spoken repair rather than a long generic report.

## Run locally

```bash
npm install
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`.

## Validate

```bash
npm test
npm run audit:browser
```

The audits cover structural boundaries, data contracts, the complete desktop and mobile product flow, keyboard-accessible controls, mobile overflow and prohibited drift.

## Public data boundary

GitHub Pages publishes only learner-facing files:

- `index.html`
- `app.js`
- `styles.css`
- `styles-v3.css`
- `assets/data/library-v3.json`
- `assets/data/case-001/station-v3.json`
- `assets/data/case-001/review-v3.json`

Internal governance, documentation and QA files are excluded from the deployed artifact.

## Governance position

This remains a prototype implementation, not a clinical release. Clinical review, source review, medication content, audio release and product release remain **HOLD**. No Case 002, audio, voice scoring, required typing, gamification or learner-facing governance has been added.

See [Clinical Mastery v3](docs/CLINICAL_MASTERY_V3.md) and [v3 acceptance report](qa/acceptance-report-v3.md).
