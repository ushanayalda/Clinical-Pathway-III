# Validation

Run the complete prototype audit from the repository root:

```bash
npm install
npx playwright install chromium
npm test
npm run audit:browser
```

`npm test` performs mechanical, authority-boundary and no-drift checks.

`npm run audit:browser` starts the static site and exercises the complete learner flow at desktop and mobile viewports, including Station gates, encounter logging, finish locking, staged Review, Journey structure, keyboard-native controls and horizontal-overflow checks.

The pull-request workflow runs both commands and reports the outcomes on draft PR #1. Clinical release remains HOLD regardless of prototype validation status.
