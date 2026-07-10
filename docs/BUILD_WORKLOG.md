# Case 001 build worklog

This file is the internal implementation record. It is separate from the learner-facing Journey room.

## Repository and branch

- Repository: `ushanayalda/Clinical-Pathway-III`
- Base: `main`
- Working branch: `build/case-001-authority-v2`
- Project type: dependency-free static HTML, CSS and JavaScript
- GitHub Pages compatibility: relative asset paths and `.nojekyll`

## Implemented rooms

### Home

Shows the current training position and one next useful move.

### Library

Uses the hierarchy Phase → Pattern → Station. Case 001 appears under Phase 1 → Chest pain. No clinical answer is included in Library data.

### Station

- reading screen first
- Candidate Information and Tasks
- patient opening only after Start station
- broad reveal controls
- one current response at a time
- persistent encounter log
- exact `I have discussed my plan` gate
- `Response to your plan` unavailable before the gate
- finish confirmation
- locked attempt after finish
- reduced navigation during the live attempt

### Review

- inaccessible before Finish station
- answer-bearing JSON fetched only after finish
- Self-check is the first available stage
- later stages disabled until Self-check is completed
- one main stage rendered at a time
- eight staged sections retained from Authority Pack v2

### Journey

Professional pathway map showing phase, pattern, station, attempt, review, retry and next action. It is not a status table and contains no gamification.

## Hard boundaries retained

No Case 002, audio, voice scoring, typed response requirement, badges, XP, streaks, confetti, rewards, learner-facing AMC branding, learner-facing ADHD labels or learner-facing governance fields were added.

## Release status

Prototype only. Clinical release is HOLD.
