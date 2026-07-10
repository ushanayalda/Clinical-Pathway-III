# Case 001 Clinical Mastery v3 Acceptance Report

## Scope

Complete vertical slice: Home, Library, Station, Review and Journey.

## Mechanical

- Static project remains compatible with GitHub Pages.
- No build-time application framework is required.
- Review data is fetched only after Finish station.
- Attempt state persists in local storage and is version-isolated from the prior prototype.
- Finish station locks the attempt.
- A focused retry creates a new attempt and preserves the selected repair in history.

## Clinical product simulation

- Full candidate stem includes setting, patient presentation, available support, examination instruction, explicit tasks and 8-minute timing.
- Library and stem both use the pattern name **Acute chest discomfort**.
- Patient-language variants include pain, pressure, tightness, heaviness, discomfort and indigestion.
- Live consultation advances through one purposeful question or spoken task at a time.
- Every revealed answer is paired with what it adds and why it matters.
- A dedicated action-before-certainty checkpoint interrupts continued history gathering.
- Immediate assessment, explanation, exact plan gate, patient resistance and focused handover are present.
- `Response to your plan` is hidden before `I have discussed my plan`.

## Review

- Locked before Finish station.
- One stage open initially.
- One main stage rendered at a time.
- Review requires clinical synthesis, question-answer mapping, decision-threshold retrieval, patient explanation, handover, one spoken repair and a next action.
- Generic confidence scoring, long-form self-report and redundant what-if content are absent.

## Visual and cognitive load

- Current task is explicit on every live screen.
- Consultation progress is visible without points or rewards.
- Normal navigation is removed during the live attempt.
- Encounter trace externalises already established information.
- No required typing.
- Mobile route transitions reset to the new room title.
- Primary controls use large touch targets.
- Reduced-motion preference is respected.

## Accessibility

- Keyboard focus is visible.
- Landmark and navigation labels are present.
- Dialogs use the native dialog element.
- Buttons have accessible names.
- Colour is not the sole carrier of state.
- Desktop and 375 × 812 mobile viewports are included in browser validation.

## No drift

Absent from learner delivery:

- Case 002
- medication additions
- audio
- voice scoring
- required typing
- badges, XP, streaks, confetti or rewards
- learner-facing AMC branding
- learner-facing ADHD labels
- learner-facing governance fields

## Release position

Clinical release: **HOLD**

Source review: **HOLD**

Medication content: **HOLD**

Audio release: **HOLD**

Product release: **HOLD**
