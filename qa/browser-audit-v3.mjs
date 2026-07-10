import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const review = JSON.parse(fs.readFileSync('assets/data/case-001/review-v3.json', 'utf8'));
const station = JSON.parse(fs.readFileSync('assets/data/case-001/station-v3.json', 'utf8'));
const port = 4173;
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port)], { stdio: 'ignore' });

let checks = 0;
const failures = [];
const check = (condition, message) => {
  if (condition) checks += 1;
  else failures.push(message);
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
await wait(700);

async function visibleText(page, selector) {
  return (await page.locator(selector).allTextContents()).join(' ');
}

async function auditViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(`${label}: page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`${label}: console error: ${message.text()}`);
  });

  await page.goto(`${base}/#home`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  check(await page.locator('h1').textContent() === 'Master the clinical road.Not a script.', `${label}: Home title`);
  check(await page.locator('nav[aria-label="Primary navigation"]').isVisible(), `${label}: primary navigation visible`);
  check((await page.locator('body').innerText()).includes('Acute chest discomfort'), `${label}: Home pattern language`);
  check(!(await page.locator('body').innerText()).toLowerCase().includes('adhd'), `${label}: no learner-facing ADHD label`);
  check(!(await page.locator('body').innerText()).toLowerCase().includes('australian medical council'), `${label}: no learner-facing AMC branding`);

  await page.click('a[href="#library"]');
  await page.waitForSelector('h1');
  check((await page.locator('h1').innerText()).includes('Phase'), `${label}: Library hierarchy title`);
  const libraryBody = (await page.locator('body').innerText()).toLowerCase();
  check(libraryBody.includes('acute chest discomfort'), `${label}: Library uses discomfort pattern`);
  check(libraryBody.includes('pain') && libraryBody.includes('pressure') && libraryBody.includes('indigestion'), `${label}: Library normalises patient language`);
  check(!libraryBody.includes('acute coronary syndrome'), `${label}: Library does not leak diagnosis`);
  check(!libraryBody.includes('ambulance'), `${label}: Library does not leak management`);

  await page.click('[data-go="station"]');
  await page.waitForSelector('.m3-stem-header');
  const readingBody = await page.locator('body').innerText();
  check(readingBody.includes('GENERAL PRACTICE CONSULTATION'), `${label}: full station context`);
  check(readingBody.includes('8 MINUTES'), `${label}: station timing visible`);
  check(readingBody.includes('Candidate Information'), `${label}: Candidate Information visible`);
  check(readingBody.includes('Tasks'), `${label}: Tasks visible`);
  check(readingBody.includes('Take a focused history'), `${label}: focused history task visible`);
  check(!readingBody.includes(station.opening.text), `${label}: patient opening hidden before start`);

  await page.click('[data-action="start-station"]');
  await page.waitForSelector('.m3-live-header');
  check((await page.locator('body').innerText()).includes(station.opening.text), `${label}: patient opening appears only after start`);
  check(await page.locator('nav[aria-label="Primary navigation"]').count() === 0, `${label}: normal navigation removed in live attempt`);
  check(await page.locator('.m3-orient-strip').isVisible(), `${label}: current task orientation visible`);
  check(await page.locator('.m3-log').isVisible(), `${label}: encounter trace visible`);
  check(await page.locator('[data-action="orient"]').isVisible(), `${label}: orient control visible`);

  for (const step of station.consultation_steps) {
    await page.waitForSelector(`text=${step.phase}`);
    check((await page.locator('.m3-say-box').innerText()).includes(step.say_aloud), `${label}: spoken prompt for ${step.id}`);

    if (step.type === 'plan_gate') {
      check(await page.locator('text=Response to your plan').count() === 0, `${label}: plan response hidden before exact gate`);
      const gate = page.getByRole('button', { name: 'I have discussed my plan', exact: true });
      check(await gate.isVisible(), `${label}: exact plan gate visible`);
      await gate.click();
      const responseButton = page.getByRole('button', { name: 'Response to your plan', exact: true });
      check(await responseButton.isVisible(), `${label}: separate plan response reveal available`);
      await responseButton.click();
      check((await page.locator('.m3-patient').last().innerText()).includes(step.patient_response), `${label}: plan response revealed after gate`);
      await page.click('[data-action="complete-step"]');
      continue;
    }

    const reveal = page.locator(`[data-action="reveal-step"][data-step="${step.id}"]`);
    check(await reveal.isVisible(), `${label}: reveal control for ${step.id}`);
    await reveal.click();

    if (step.patient_response) {
      check((await page.locator('body').innerText()).includes(step.patient_response), `${label}: one patient response for ${step.id}`);
    }
    if (step.clinical_meaning) {
      check((await page.locator('body').innerText()).includes(step.clinical_meaning), `${label}: clinical meaning for ${step.id}`);
    }
    check(await page.locator('[data-action="complete-step"]').isVisible(), `${label}: explicit continuation for ${step.id}`);
    await page.click('[data-action="complete-step"]');
  }

  check(await page.getByRole('button', { name: 'Finish station', exact: true }).isVisible(), `${label}: Finish station available only at road end`);
  await page.getByRole('button', { name: 'Finish station', exact: true }).click();
  check(await page.locator('dialog[open]').isVisible(), `${label}: finish confirmation dialog`);
  await page.getByRole('button', { name: 'Finish and lock', exact: true }).click();
  await page.waitForSelector('.m3-stage-layout');
  check((await page.locator('h1').innerText()).includes('Clinical mastery'), `${label}: Review unlocked after finish`);
  check(await page.locator('.m3-stage-nav button:not([disabled])').count() === 1, `${label}: only first Review stage open initially`);

  const synthesis = review.stages.find(stage => stage.id === 'synthesis');
  for (const option of synthesis.options.filter(option => option.essential)) {
    await page.locator(`[data-fact="${option.id}"]`).click();
  }
  check(await page.getByRole('button', { name: 'Build the synthesis', exact: true }).isEnabled(), `${label}: synthesis becomes actionable after focused selection`);
  await page.getByRole('button', { name: 'Build the synthesis', exact: true }).click();
  check((await page.locator('body').innerText()).includes(synthesis.model), `${label}: model problem representation shown after retrieval`);
  await page.click('[data-action="next-review-stage"]');

  const mapping = review.stages.find(stage => stage.id === 'question_answer_meaning');
  for (let index = 0; index < mapping.items.length; index++) {
    const item = mapping.items[index];
    const option = page.locator(`input[name="qa-${item.id}"]`).nth(item.correct_index);
    await option.check();
    check((await page.locator('.m3-feedback').innerText()).includes(item.meaning), `${label}: mapping rationale ${item.id}`);
    await page.click('[data-action="next-qa"]');
  }
  check((await page.locator('body').innerText()).includes(mapping.summary), `${label}: question mapping summary`);
  await page.click('[data-action="next-review-stage"]');

  const threshold = review.stages.find(stage => stage.id === 'decision_threshold');
  const safeThreshold = threshold.options.find(option => option.correct);
  await page.locator(`input[data-threshold][value="${safeThreshold.id}"]`).check();
  check((await page.locator('body').innerText()).includes('Safe threshold identified'), `${label}: decision threshold feedback`);
  check((await page.locator('body').innerText()).includes(threshold.action_sequence[0]), `${label}: action sequence revealed`);
  await page.click('[data-action="next-review-stage"]');

  const explanation = review.stages.find(stage => stage.id === 'patient_explanation');
  const balanced = explanation.options.find(option => option.correct);
  await page.locator(`input[data-explanation][value="${balanced.id}"]`).check();
  check((await page.locator('body').innerText()).includes('Five-part explanation'), `${label}: structured explanation model`);
  await page.click('[data-action="explanation-spoken"]');
  await page.click('[data-action="next-review-stage"]');

  const handover = review.stages.find(stage => stage.id === 'handover_drill');
  for (let index = 0; index < handover.cues.length; index++) {
    await page.click('[data-action="reveal-handover-cue"]');
    check((await page.locator('body').innerText()).includes(handover.cues[index].text), `${label}: handover cue ${index + 1}`);
  }
  await page.click('[data-action="handover-spoken"]');
  check((await page.locator('body').innerText()).includes(handover.model), `${label}: model handover shown after spoken drill`);
  await page.click('[data-action="next-review-stage"]');

  const repair = review.stages.find(stage => stage.id === 'one_repair');
  const chosenRepair = repair.options.find(option => option.id === 'threshold');
  await page.locator(`input[data-repair][value="${chosenRepair.id}"]`).check();
  check((await page.locator('body').innerText()).includes(chosenRepair.micro_drill), `${label}: one targeted repair displayed`);
  await page.click('[data-action="repair-done"]');
  await page.click('[data-action="next-review-stage"]');

  const next = review.stages.find(stage => stage.id === 'next_action');
  const cleanRetry = next.options.find(option => option.id === 'clean_retry');
  await page.locator(`input[data-next-action][value="${cleanRetry.id}"]`).check();
  await page.click('[data-action="complete-review"]');
  await page.waitForSelector('.m3-pathway');
  check((await page.locator('body').innerText()).includes(chosenRepair.label), `${label}: Journey carries the repair forward`);
  check((await page.locator('body').innerText()).includes(cleanRetry.label), `${label}: Journey carries the next action forward`);
  check(await page.getByRole('button', { name: 'Start a focused retry', exact: true }).isVisible(), `${label}: focused retry available`);

  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  check(duplicateIds.length === 0, `${label}: no duplicate IDs`);

  const unnamedButtons = await page.evaluate(() => [...document.querySelectorAll('button')].filter(button => !button.innerText.trim() && !button.getAttribute('aria-label')).length);
  check(unnamedButtons === 0, `${label}: every button has an accessible name`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `${label}: no horizontal page overflow`);

  if (viewport.width <= 400) {
    await page.getByRole('button', { name: 'Start a focused retry', exact: true }).click();
    await page.waitForSelector('.m3-stem-header');
    check((await page.locator('body').innerText()).includes(chosenRepair.label), `${label}: retry screen preserves one focus`);
    const top = await page.locator('h1').boundingBox();
    check(Boolean(top && top.y >= 0 && top.y < viewport.height), `${label}: route transition resets scroll to visible title`);
    const minTargets = await page.evaluate(() => [...document.querySelectorAll('button:not(:disabled), a[href]')].every(node => {
      const box = node.getBoundingClientRect();
      return box.height >= 40 || box.width >= 40;
    }));
    check(minTargets, `${label}: mobile interactive targets remain usable`);
  }

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await auditViewport(browser, { width: 1440, height: 1000 }, 'desktop');
  await auditViewport(browser, { width: 375, height: 812 }, 'mobile');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error(`Browser audit failed: ${failures.length} failure(s), ${checks} checks passed.`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Browser, mobile, accessibility and product simulation audit passed: ${checks} checks, 0 failures.`);
