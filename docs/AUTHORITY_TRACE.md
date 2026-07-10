# Authority trace

## Source of truth

Implementation source: `Clinical-Pathway-Authority-Pack-v2.zip`.

The pack was extracted into a separate internal working folder with its original directory structure preserved. The following control documents were read before implementation:

- `AGENTS.md`
- `README.md`
- `PACK_STATUS.md`
- `00_READ_FIRST`
- `CODEX_READ_FIRST.md`
- all build-required sections identified by `CODEX_READ_FIRST.md`

The extracted Authority Pack is not published inside the learner repository.

## Case boundary

Only `CP-C001` is implemented. No Case 002 material is present.

The clinical meaning is preserved as supplied:

- 58-year-old man in general practice
- chest discomfort initially attributed to indigestion
- exertional central heavy tight pain radiating to the left arm and jaw
- sweating, nausea and shortness of breath
- cardiovascular risk factors
- urgent ambulance transfer without waiting for clinic proof
- explicit no-driving safety instruction
- continued focused assessment, observations and handover while transfer is arranged

Medication management was not added because it was not released for this prototype.

## Learner data boundary

- `station.json` contains blind-station information and reveal responses.
- `review.json` contains answer-bearing teaching and is fetched only after `Finish station` locks the attempt.
- `library.json` contains discovery metadata without answers.
- `governance.json` is internal and is never fetched by learner code.

## Release position

This branch is a prototype implementation and review surface. It is not marked clinically release-ready. Source review, clinical review, audio release and final product release remain on HOLD.
