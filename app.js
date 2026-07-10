const UI_VERSION = 3;
const STATE_KEY = 'clinical-pathway.case-001.mastery.v3';
const ROUTES = ['home', 'library', 'station', 'review', 'journey'];

document.documentElement.dataset.uiVersion = String(UI_VERSION);
if (!document.querySelector('link[data-mastery-css]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles-v3.css?v=3';
  link.dataset.masteryCss = 'true';
  document.head.append(link);
}

const app = document.querySelector('#app') || (() => {
  const node = document.createElement('div');
  node.id = 'app';
  document.body.append(node);
  return node;
})();

let library = null;
let station = null;
let reviewData = null;

function freshAttempt(number = 1, mode = 'guided_mastery') {
  return {
    number,
    mode,
    status: 'not_started',
    startedAt: null,
    finishedAt: null,
    locked: false,
    stepIndex: 0,
    revealed: [],
    completed: [],
    log: [],
    planDiscussed: false,
    planResponseShown: false,
    repairFocus: null
  };
}

function freshReview() {
  return {
    status: 'locked',
    stageIndex: 0,
    synthesis: [],
    synthesisBuilt: false,
    qaIndex: 0,
    qaAnswers: {},
    threshold: null,
    explanation: null,
    explanationSpoken: false,
    handoverReveal: 0,
    handoverSpoken: false,
    repair: null,
    repairDone: false,
    nextAction: null
  };
}

function freshState() {
  return {
    version: UI_VERSION,
    attempt: freshAttempt(),
    review: freshReview(),
    history: []
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATE_KEY));
    if (parsed?.version !== UI_VERSION || !parsed.attempt || !parsed.review) return freshState();
    return parsed;
  } catch {
    return freshState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function route() {
  const candidate = location.hash.replace(/^#/, '') || 'home';
  return ROUTES.includes(candidate) ? candidate : 'home';
}

function go(target) {
  if (route() === target) {
    render({ resetScroll: true });
    return;
  }
  location.hash = target;
}

function reviewUnlocked() {
  return state.attempt.status === 'finished' && state.review.status !== 'locked';
}

function statusLabel() {
  if (state.attempt.status === 'in_progress') return 'Consultation in progress';
  if (state.review.status === 'complete') return 'Review complete';
  if (state.attempt.status === 'finished') return 'Clinical mastery Review ready';
  return 'Ready for reading time';
}

function navItem(id, label, current) {
  if (id === 'review' && !reviewUnlocked()) {
    return `<span class="m3-nav-locked" aria-disabled="true" title="Finish the station to unlock Review">${label}</span>`;
  }
  return `<a href="#${id}" ${id === current ? 'aria-current="page"' : ''}>${label}</a>`;
}

function standardHeader(current) {
  return `<header class="m3-header">
    <div class="m3-header-inner">
      <a class="m3-brand" href="#home" aria-label="Clinical Pathway home">
        <span class="m3-brand-mark" aria-hidden="true">CP</span>
        <span>Clinical Pathway</span>
      </a>
      <nav class="m3-nav" aria-label="Primary navigation">
        ${navItem('home', 'Home', current)}
        ${navItem('library', 'Library', current)}
        ${navItem('station', 'Station', current)}
        ${navItem('review', 'Review', current)}
        ${navItem('journey', 'Journey', current)}
      </nav>
    </div>
  </header>`;
}

function liveHeader() {
  const total = station?.consultation_steps?.length || 0;
  const current = Math.min(state.attempt.stepIndex + 1, total);
  return `<header class="m3-live-header">
    <div class="m3-header-inner">
      <div class="m3-brand" aria-label="Clinical Pathway">
        <span class="m3-brand-mark" aria-hidden="true">CP</span>
        <span>Clinical Pathway</span>
      </div>
      <div class="m3-live-status">
        <div><span>Station 001</span><strong>Live consultation</strong></div>
        <button class="m3-button m3-button--quiet" type="button" data-action="orient">Orient</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="m3-footer"><div class="m3-footer-inner">
    Clinical Pathway supports structured clinical practice. It does not replace clinical judgement, supervision, emergency systems or local protocols. Clinical release status: HOLD.
  </div></footer>`;
}

function shell(content, current, { live = false } = {}) {
  return `<a class="m3-skip" href="#m3-main">Skip to main content</a>
    <div class="m3-shell">
      ${live ? liveHeader() : standardHeader(current)}
      <main id="m3-main" tabindex="-1">${content}</main>
      ${live ? '' : footer()}
    </div>`;
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function ensureCoreData() {
  if (!library) library = await fetchJson('assets/data/library-v3.json');
  if (!station) station = await fetchJson('assets/data/case-001/station-v3.json');
}

async function ensureReviewData() {
  if (state.attempt.status !== 'finished') return null;
  if (!reviewData) reviewData = await fetchJson('assets/data/case-001/review-v3.json');
  return reviewData;
}

function nextMove() {
  if (state.attempt.status === 'in_progress') {
    return {
      label: 'Return to live consultation',
      target: 'station',
      detail: 'Continue from the exact clinical step where you paused.'
    };
  }
  if (state.attempt.status === 'finished' && state.review.status !== 'complete') {
    return {
      label: 'Begin clinical mastery Review',
      target: 'review',
      detail: 'Rebuild the pattern, decision threshold, explanation and handover.'
    };
  }
  if (state.review.status === 'complete') {
    return {
      label: 'Open your next action',
      target: 'journey',
      detail: 'Use one selected repair to plan the next spoken run.'
    };
  }
  return {
    label: 'Open Station 001',
    target: 'station',
    detail: 'Read the full candidate stem, then begin the consultation.'
  };
}

function renderHome() {
  const next = nextMove();
  return shell(`<section class="m3-room">
    <div class="m3-grid m3-grid--home">
      <div>
        <p class="m3-eyebrow">Home</p>
        <h1>Master the clinical road.<br>Not a script.</h1>
        <p class="m3-lead">Ask one purposeful question at a time, recognise when delay becomes unsafe, explain the plan clearly, then repair one weak point.</p>
        <div class="m3-actions">
          <button class="m3-button" type="button" data-go="${next.target}">${esc(next.label)}</button>
          <a class="m3-button m3-button--secondary" href="#library">See the training map</a>
        </div>
      </div>
      <aside class="m3-panel m3-next-card" aria-labelledby="next-heading">
        <p class="m3-kicker">Next useful move</p>
        <h2 id="next-heading">${esc(next.label)}</h2>
        <p>${esc(next.detail)}</p>
        <dl class="m3-meta">
          <div><dt>Phase</dt><dd>1 · Keep the patient safe</dd></div>
          <div><dt>Pattern</dt><dd>Acute chest discomfort</dd></div>
          <div><dt>Station</dt><dd>001 · ${esc(statusLabel())}</dd></div>
        </dl>
      </aside>
    </div>
  </section>`, 'home');
}

function renderLibrary() {
  const phase = library.phases[0];
  const pattern = phase.patterns[0];
  const item = pattern.stations[0];
  return shell(`<section class="m3-room">
    <div class="m3-heading-row">
      <div><p class="m3-eyebrow">Library</p><h1>Phase → Pattern → Station</h1></div>
      <p class="m3-lead">The map tells you what capability is being trained. It does not reveal the patient answers or the clinical conclusion.</p>
    </div>
    <section class="m3-panel m3-phase">
      <div class="m3-phase-head">
        <div><p class="m3-kicker">Phase ${phase.number}</p><h2>${esc(phase.title)}</h2><p class="m3-muted">${esc(phase.confidence_target)}</p></div>
        <strong>Active pathway</strong>
      </div>
      <div class="m3-pattern">
        <p class="m3-kicker">Pattern</p>
        <h2>${esc(pattern.title)}</h2>
        <p>${esc(pattern.training_focus)}</p>
        <div class="m3-language-strip"><strong>Patient language can vary:</strong> ${pattern.patient_language.map(esc).join(' · ')}. Train the pattern, not one preferred word.</div>
        <article class="m3-station-card">
          <div>
            <p class="m3-kicker">Station ${esc(item.station_number)} · ${esc(item.station_type)}</p>
            <h3>${esc(item.title)}</h3>
            <p class="m3-small">${esc(item.answer_safety)}</p>
          </div>
          <button class="m3-button" type="button" data-go="station">${state.attempt.status === 'in_progress' ? 'Continue station' : 'Open station'}</button>
        </article>
      </div>
    </section>
  </section>`, 'library');
}

function renderReading() {
  const card = station.station_card;
  const retry = state.attempt.repairFocus;
  return shell(`<section class="m3-room">
    <div class="m3-heading-row">
      <div><p class="m3-eyebrow">Station 001</p><h1>Candidate reading screen</h1></div>
      <p class="m3-lead">The patient opening and responses remain hidden until you start.</p>
    </div>
    ${retry ? `<div class="m3-feedback m3-feedback--review"><strong>Single focus for attempt ${state.attempt.number}:</strong> ${esc(retry)}</div>` : ''}
    <div class="m3-grid m3-grid--reading">
      <article class="m3-panel">
        <div class="m3-stem-header"><strong>${esc(card.context_label)}</strong><span>${esc(card.time_label)}</span></div>
        <div class="m3-stem-body">
          <h2>${esc(card.heading)}</h2>
          <ul>${card.candidate_information.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
          <div class="m3-task-box">
            <h3>${esc(card.tasks_heading)}</h3>
            <ol>${card.tasks.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
          </div>
          <p class="m3-small" style="margin-top:20px"><strong>Candidate note:</strong> ${esc(card.candidate_note)}</p>
        </div>
      </article>
      <aside class="m3-panel m3-panel-pad">
        <p class="m3-kicker">${esc(station.reading_time_plan.label)}</p>
        <ol class="m3-focus-list">${station.reading_time_plan.items.map((item, index) => `<li><strong>${index + 1}</strong><span>${esc(item)}</span></li>`).join('')}</ol>
        <div class="m3-actions"><button class="m3-button m3-button--safe" type="button" data-action="start-station">Start station</button></div>
      </aside>
    </div>
  </section>`, 'station');
}

function roadDots() {
  return station.consultation_steps.map((step, index) => {
    const cls = index < state.attempt.stepIndex ? 'is-done' : index === state.attempt.stepIndex ? 'is-current' : '';
    return `<span class="m3-road-dot ${cls}" title="${esc(step.phase)}" aria-hidden="true"></span>`;
  }).join('');
}

function logEntry(label, text) {
  state.attempt.log.push({ label, text, at: new Date().toISOString() });
}

function stepIsRevealed(step) {
  return state.attempt.revealed.includes(step.id);
}

function stepIsComplete(step) {
  return state.attempt.completed.includes(step.id);
}

function meaningBlock(step) {
  if (!step.clinical_meaning) return '';
  return `<div class="m3-meaning-grid">
    ${step.what_it_adds ? `<div class="m3-meaning"><strong>What this adds</strong><span>${esc(step.what_it_adds)}</span></div>` : ''}
    <div class="m3-meaning"><strong>Why it matters</strong><span>${esc(step.clinical_meaning)}</span></div>
  </div>`;
}

function continueButton(step) {
  return `<div class="m3-actions"><button class="m3-button" type="button" data-action="complete-step" data-step="${esc(step.id)}">Continue to the next clinical task</button></div>`;
}

function renderQuestionStep(step) {
  const revealed = stepIsRevealed(step);
  return `<p class="m3-muted">${esc(step.intent)}</p>
    <div class="m3-say-box"><p class="m3-kicker">Say one question aloud</p><blockquote>${esc(step.say_aloud)}</blockquote></div>
    ${revealed ? `
      <div class="m3-patient"><p class="m3-kicker">David</p><blockquote>${esc(step.patient_response)}</blockquote></div>
      ${step.suggested_response ? `<div class="m3-model"><p class="m3-kicker" style="color:#dcefeb">Compare your response</p><p>${esc(step.suggested_response)}</p></div>` : ''}
      ${meaningBlock(step)}
      ${continueButton(step)}
    ` : `<div class="m3-actions"><button class="m3-button" type="button" data-action="reveal-step" data-step="${esc(step.id)}">Reveal David’s answer</button></div>`}`;
}

function renderActionCheckpoint(step) {
  const revealed = stepIsRevealed(step);
  return `<p class="m3-muted">${esc(step.intent)}</p>
    <div class="m3-safety"><strong>Pause the history.</strong><p style="margin:6px 0 0">${esc(step.say_aloud)}</p></div>
    ${revealed ? `
      <div class="m3-model"><p class="m3-kicker" style="color:#dcefeb">Safe action sequence</p><ol>${step.model_action.map(item => `<li>${esc(item)}</li>`).join('')}</ol></div>
      ${meaningBlock(step)}
      ${continueButton(step)}
    ` : `<div class="m3-actions"><button class="m3-button m3-button--danger" type="button" data-action="reveal-step" data-step="${esc(step.id)}">${esc(step.action_button)}</button></div>`}`;
}

function renderAssessmentStep(step) {
  const revealed = stepIsRevealed(step);
  return `<p class="m3-muted">${esc(step.intent)}</p>
    <div class="m3-say-box"><p class="m3-kicker">State the focused request aloud</p><blockquote>${esc(step.say_aloud)}</blockquote></div>
    ${revealed ? `
      <div class="m3-model"><p class="m3-kicker" style="color:#dcefeb">Focused request</p><ol>${step.requested_assessment.map(item => `<li>${esc(item)}</li>`).join('')}</ol></div>
      <div class="m3-patient"><p class="m3-kicker">Available findings</p><blockquote>${esc(step.available_findings)}</blockquote></div>
      ${meaningBlock(step)}
      ${continueButton(step)}
    ` : `<div class="m3-actions"><button class="m3-button" type="button" data-action="reveal-step" data-step="${esc(step.id)}">${esc(step.action_button)}</button></div>`}`;
}

function renderSpokenCheckpoint(step) {
  const revealed = stepIsRevealed(step);
  return `<p class="m3-muted">${esc(step.intent)}</p>
    <div class="m3-say-box"><p class="m3-kicker">Speak before comparing</p><blockquote>${esc(step.say_aloud)}</blockquote></div>
    ${revealed ? `
      <div class="m3-model"><p class="m3-kicker" style="color:#dcefeb">Safe version</p><p>${esc(step.model_speech)}</p></div>
      ${meaningBlock(step)}
      ${continueButton(step)}
    ` : `<div class="m3-actions"><button class="m3-button" type="button" data-action="reveal-step" data-step="${esc(step.id)}">${esc(step.action_button)}</button></div>`}`;
}

function renderPlanGate(step) {
  const discussed = state.attempt.planDiscussed;
  const shown = state.attempt.planResponseShown;
  return `<p class="m3-muted">${esc(step.intent)}</p>
    <div class="m3-say-box"><p class="m3-kicker">Discuss the plan aloud</p><blockquote>${esc(step.say_aloud)}</blockquote></div>
    ${!discussed ? `<div class="m3-actions"><button class="m3-button" type="button" data-action="plan-gate">${esc(step.gate_button)}</button></div>` : `
      <div class="m3-feedback"><strong>Plan discussion reached.</strong> David’s response is available separately. Reveal it only after your explanation and plan are complete.</div>
      ${shown ? `
        <div class="m3-patient"><p class="m3-kicker">${esc(step.response_label)}</p><blockquote>${esc(step.patient_response)}</blockquote></div>
        ${meaningBlock(step)}
        ${continueButton(step)}
      ` : `<div class="m3-actions"><button class="m3-button m3-button--secondary" type="button" data-action="show-plan-response">${esc(step.response_label)}</button></div>`}
    `}`;
}

function renderHandoverStep(step) {
  const revealed = stepIsRevealed(step);
  return `<p class="m3-muted">${esc(step.intent)}</p>
    <div class="m3-say-box"><p class="m3-kicker">30-second spoken handover</p><blockquote>${esc(step.say_aloud)}</blockquote></div>
    ${revealed ? `
      <div class="m3-model"><p class="m3-kicker" style="color:#dcefeb">Handover structure</p><ol>${step.handover_cues.map(item => `<li>${esc(item)}</li>`).join('')}</ol></div>
      <details><summary><strong>Compare with a focused model handover</strong></summary><p>${esc(step.model_handover)}</p></details>
      ${meaningBlock(step)}
      ${continueButton(step)}
    ` : `<div class="m3-actions"><button class="m3-button" type="button" data-action="reveal-step" data-step="${esc(step.id)}">${esc(step.action_button)}</button></div>`}`;
}

function renderCurrentStep(step) {
  let body = '';
  if (step.type === 'question') body = renderQuestionStep(step);
  if (step.type === 'action_checkpoint') body = renderActionCheckpoint(step);
  if (step.type === 'assessment_request') body = renderAssessmentStep(step);
  if (step.type === 'spoken_checkpoint') body = renderSpokenCheckpoint(step);
  if (step.type === 'plan_gate') body = renderPlanGate(step);
  if (step.type === 'handover') body = renderHandoverStep(step);
  return `<article class="m3-panel m3-current-card">
    <div class="m3-step-head"><div><p class="m3-kicker">Current clinical task</p><h2>${esc(step.phase)}</h2></div><span class="m3-step-number">Step ${state.attempt.stepIndex + 1} of ${station.consultation_steps.length}</span></div>
    <div class="m3-step-body">${body}</div>
  </article>`;
}

function renderEncounterLog() {
  const items = state.attempt.log.map(item => `<li><strong>${esc(item.label)}</strong><p>${esc(item.text)}</p></li>`).join('');
  return `<aside class="m3-panel m3-panel-pad m3-log" aria-labelledby="log-heading">
    <p class="m3-kicker">Consultation trace</p><h2 id="log-heading">What you have established</h2>
    <ol>${items || '<li><p>No information revealed yet.</p></li>'}</ol>
  </aside>`;
}

function renderFinishPanel() {
  return `<article class="m3-panel m3-panel-pad">
    <p class="m3-kicker">Consultation complete</p>
    <h2>Finish when the spoken run is complete</h2>
    <p>You have reached the end of the clinical road. Finishing locks this attempt and loads the answer-bearing Review.</p>
    <div class="m3-actions"><button class="m3-button m3-button--danger" type="button" data-action="request-finish">${esc(station.finish_action.button_label)}</button></div>
  </article>`;
}

function renderLiveStation() {
  const total = station.consultation_steps.length;
  const step = station.consultation_steps[state.attempt.stepIndex];
  const openingInLog = state.attempt.log.some(item => item.label === 'Patient opening');
  if (!openingInLog) {
    logEntry('Patient opening', station.opening.text);
    saveState();
  }
  return shell(`<section class="m3-room m3-room--compact">
    <div class="m3-orient-strip">
      <div><p class="m3-kicker">Consultation road</p><p><strong>${step ? esc(step.phase) : 'Ready to finish'}</strong> · Ask or speak one clinical unit, then continue.</p></div>
      <div class="m3-road" aria-label="Consultation progress">${roadDots()}</div>
    </div>
    ${state.attempt.stepIndex === 0 && state.attempt.completed.length === 0 ? `<div class="m3-patient" style="margin-top:0"><p class="m3-kicker">David opens the consultation</p><blockquote>${esc(station.opening.text)}</blockquote><p class="m3-small" style="margin:12px 0 0">${esc(station.opening.orientation)}</p></div>` : ''}
    <div class="m3-grid m3-grid--live">
      <div>${step ? renderCurrentStep(step) : renderFinishPanel()}</div>
      <div class="m3-side-stack">
        ${state.attempt.repairFocus ? `<aside class="m3-panel m3-panel-pad m3-panel-soft"><p class="m3-kicker">One repair focus</p><p style="margin:0"><strong>${esc(state.attempt.repairFocus)}</strong></p></aside>` : ''}
        ${renderEncounterLog()}
      </div>
    </div>
  </section>`, 'station', { live: true });
}

function renderLockedStation() {
  return shell(`<section class="m3-room"><div class="m3-panel m3-lock-view">
    <p class="m3-eyebrow">Station 001</p><h1>Attempt locked</h1>
    <p class="m3-lead" style="margin-left:auto;margin-right:auto">The consultation cannot be changed after Finish station. Review now converts the run into reusable clinical reasoning.</p>
    <div class="m3-actions" style="justify-content:center"><button class="m3-button" type="button" data-go="review">Begin clinical mastery Review</button><button class="m3-button m3-button--secondary" type="button" data-go="journey">Open Journey</button></div>
  </div></section>`, 'station');
}

function renderStation() {
  if (state.attempt.status === 'not_started') return renderReading();
  if (state.attempt.status === 'in_progress') return renderLiveStation();
  return renderLockedStation();
}

function reviewStageIndex(id) {
  return reviewData.stage_order.indexOf(id);
}

function currentReviewStage() {
  const id = reviewData.stage_order[state.review.stageIndex];
  return reviewData.stages.find(stage => stage.id === id);
}

function reviewStageNav() {
  return `<nav class="m3-panel m3-stage-nav" aria-label="Review stages"><ol>${reviewData.stage_order.map((id, index) => {
    const stage = reviewData.stages.find(item => item.id === id);
    const available = index <= state.review.stageIndex;
    return `<li><button type="button" data-review-stage="${index}" ${available ? '' : 'disabled'} aria-current="${index === state.review.stageIndex}">${index + 1}. ${esc(stage.label)}</button></li>`;
  }).join('')}</ol></nav>`;
}

function nextReviewButton(label = 'Continue') {
  return `<div class="m3-actions"><button class="m3-button" type="button" data-action="next-review-stage">${esc(label)}</button></div>`;
}

function renderSynthesis(stage) {
  const selected = new Set(state.review.synthesis);
  const target = stage.selection_target;
  return `<p>${esc(stage.instruction)}</p>
    <p class="m3-small"><strong>Select ${target} facts.</strong> Chosen: ${selected.size} of ${target}.</p>
    <div class="m3-fact-grid">${stage.options.map(option => `<button class="m3-fact" type="button" data-fact="${esc(option.id)}" aria-pressed="${selected.has(option.id)}">${esc(option.text)}</button>`).join('')}</div>
    ${state.review.synthesisBuilt ? `<div class="m3-feedback"><p class="m3-kicker">Model problem representation</p><p><strong>${esc(stage.model)}</strong></p><p style="margin-bottom:0">${esc(stage.teaching)}</p></div>${nextReviewButton('Continue to question mapping')}` : `<div class="m3-actions"><button class="m3-button" type="button" data-action="build-synthesis" ${selected.size === target ? '' : 'disabled'}>Build the synthesis</button></div>`}`;
}

function renderQuestionMap(stage) {
  const index = state.review.qaIndex;
  const item = stage.items[index];
  if (!item) return `<div class="m3-feedback"><strong>Question mapping complete.</strong><p>${esc(stage.summary)}</p></div>${nextReviewButton('Continue to the decision threshold')}`;
  const answer = state.review.qaAnswers[item.id];
  return `<div class="m3-question-progress"><span>Clinical mapping ${index + 1} of ${stage.items.length}</span><span>One answer, one earning question</span></div>
    <div class="m3-patient"><p class="m3-kicker">Patient answer</p><blockquote>${esc(item.answer)}</blockquote></div>
    <fieldset style="border:0;padding:0;margin:0"><legend><strong>Which question should earn this answer?</strong></legend>
      <div class="m3-choice-grid">${item.options.map((option, optionIndex) => `<label class="m3-choice"><input type="radio" name="qa-${esc(item.id)}" value="${optionIndex}" data-qa-item="${esc(item.id)}" ${answer?.selected === optionIndex ? 'checked' : ''}><span>${esc(option)}</span></label>`).join('')}</div>
    </fieldset>
    ${answer ? `<div class="m3-feedback ${answer.correct ? '' : 'm3-feedback--review'}"><strong>${answer.correct ? 'Clinically useful question.' : 'Re-select the question that directly earns the answer.'}</strong><p style="margin-bottom:0">${esc(item.meaning)}</p></div>
      <div class="m3-actions"><button class="m3-button" type="button" data-action="next-qa" ${answer.correct ? '' : 'disabled'}>${index + 1 === stage.items.length ? 'Complete question mapping' : 'Next mapping'}</button></div>` : ''}`;
}

function renderThreshold(stage) {
  const selected = stage.options.find(option => option.id === state.review.threshold);
  return `<p>${esc(stage.instruction)}</p>
    <div class="m3-choice-grid">${stage.options.map(option => `<label class="m3-choice"><input type="radio" name="threshold" value="${esc(option.id)}" data-threshold ${state.review.threshold === option.id ? 'checked' : ''}><strong>${esc(option.label)}</strong></label>`).join('')}</div>
    ${selected ? `<div class="m3-feedback ${selected.correct ? '' : 'm3-feedback--review'}"><strong>${selected.correct ? 'Safe threshold identified.' : 'This point is not the earliest safe action point.'}</strong><p style="margin-bottom:0">${esc(selected.feedback)}</p></div>` : ''}
    ${selected?.correct ? `<div class="m3-model"><p class="m3-kicker" style="color:#dcefeb">Action sequence</p><ol>${stage.action_sequence.map(item => `<li>${esc(item)}</li>`).join('')}</ol></div>
      <details><summary><strong>Open the differential lens</strong></summary>${stage.differential_lens.map(item => `<div class="m3-handover-cue"><strong>${esc(item.condition)}</strong><p style="margin:5px 0 0">${esc(item.why_considered)}</p></div>`).join('')}</details>
      ${nextReviewButton('Continue to patient explanation')}` : ''}`;
}

function renderExplanation(stage) {
  const selected = stage.options.find(option => option.id === state.review.explanation);
  return `<p>${esc(stage.instruction)}</p>
    <div class="m3-choice-grid">${stage.options.map(option => `<label class="m3-choice"><input type="radio" name="explanation" value="${esc(option.id)}" data-explanation ${state.review.explanation === option.id ? 'checked' : ''}><span>${esc(option.text)}</span></label>`).join('')}</div>
    ${selected ? `<div class="m3-feedback ${selected.correct ? '' : 'm3-feedback--review'}"><strong>${selected.correct ? 'Balanced explanation.' : 'This opening weakens safe communication.'}</strong><p style="margin-bottom:0">${esc(selected.feedback)}</p></div>` : ''}
    ${selected?.correct ? `<div class="m3-model"><p class="m3-kicker" style="color:#dcefeb">Five-part explanation</p>${stage.model_blocks.map(block => `<p><strong>${esc(block.label)}:</strong> ${esc(block.text)}</p>`).join('')}</div>
      <div class="m3-say-box"><p class="m3-kicker">Spoken retrieval</p><blockquote>${esc(stage.spoken_instruction)}</blockquote></div>
      ${state.review.explanationSpoken ? nextReviewButton('Continue to handover drill') : `<div class="m3-actions"><button class="m3-button" type="button" data-action="explanation-spoken">I have said the explanation aloud</button></div>`}` : ''}`;
}

function renderHandoverReview(stage) {
  const count = state.review.handoverReveal;
  const cues = stage.cues.slice(0, count);
  return `<p>${esc(stage.instruction)}</p>
    ${cues.map(cue => `<div class="m3-handover-cue"><p class="m3-kicker">${esc(cue.label)}</p><p style="margin:0">${esc(cue.text)}</p></div>`).join('')}
    ${count < stage.cues.length ? `<div class="m3-actions"><button class="m3-button m3-button--secondary" type="button" data-action="reveal-handover-cue">Reveal ${count === 0 ? 'first' : 'next'} handover cue</button></div>` : `
      <div class="m3-say-box"><p class="m3-kicker">Now close the cues mentally</p><blockquote>Deliver the complete handover aloud in 30 seconds.</blockquote></div>
      ${state.review.handoverSpoken ? `<details open><summary><strong>Compare with the model handover</strong></summary><p>${esc(stage.model)}</p></details>${nextReviewButton('Continue to one repair')}` : `<div class="m3-actions"><button class="m3-button" type="button" data-action="handover-spoken">${esc(stage.completion_label)}</button></div>`}
    `}`;
}

function renderRepair(stage) {
  const selected = stage.options.find(option => option.id === state.review.repair);
  return `<p>${esc(stage.instruction)}</p>
    <div class="m3-choice-grid">${stage.options.map(option => `<label class="m3-choice"><input type="radio" name="repair" value="${esc(option.id)}" data-repair ${state.review.repair === option.id ? 'checked' : ''}><strong>${esc(option.label)}</strong><span class="m3-small">${esc(option.diagnostic_prompt)}</span></label>`).join('')}</div>
    ${selected ? `<div class="m3-say-box"><p class="m3-kicker">Your single spoken repair</p><blockquote>${esc(selected.micro_drill)}</blockquote></div>
      ${state.review.repairDone ? nextReviewButton('Continue to next action') : `<div class="m3-actions"><button class="m3-button" type="button" data-action="repair-done">${esc(stage.completion_label)}</button></div>`}` : ''}`;
}

function renderNextAction(stage) {
  const selected = stage.options.find(option => option.id === state.review.nextAction);
  return `<p>${esc(stage.instruction)}</p>
    <div class="m3-choice-grid">${stage.options.map(option => `<label class="m3-choice"><input type="radio" name="next-action" value="${esc(option.id)}" data-next-action ${state.review.nextAction === option.id ? 'checked' : ''}><strong>${esc(option.label)}</strong><span class="m3-small">${esc(option.detail)}</span></label>`).join('')}</div>
    ${selected ? `<div class="m3-feedback"><strong>Next move selected.</strong><p style="margin-bottom:0">${esc(selected.detail)}</p></div><div class="m3-actions"><button class="m3-button m3-button--safe" type="button" data-action="complete-review">${esc(stage.completion_label)}</button></div>` : ''}`;
}

function renderReviewStage(stage) {
  let body = '';
  if (stage.id === 'synthesis') body = renderSynthesis(stage);
  if (stage.id === 'question_answer_meaning') body = renderQuestionMap(stage);
  if (stage.id === 'decision_threshold') body = renderThreshold(stage);
  if (stage.id === 'patient_explanation') body = renderExplanation(stage);
  if (stage.id === 'handover_drill') body = renderHandoverReview(stage);
  if (stage.id === 'one_repair') body = renderRepair(stage);
  if (stage.id === 'next_action') body = renderNextAction(stage);
  return `<article class="m3-panel m3-stage"><p class="m3-kicker">Stage ${state.review.stageIndex + 1} of ${reviewData.stage_order.length}</p><h2>${esc(stage.title)}</h2>${body}</article>`;
}

function renderReviewLocked() {
  return shell(`<section class="m3-room"><div class="m3-panel m3-lock-view">
    <p class="m3-eyebrow">Review</p><h1>Review is locked</h1>
    <p class="m3-lead" style="margin-left:auto;margin-right:auto">Complete and finish Station 001 before answer-bearing clinical teaching is loaded.</p>
    <div class="m3-actions" style="justify-content:center"><button class="m3-button" type="button" data-go="station">Open Station</button></div>
  </div></section>`, 'review');
}

function renderReviewComplete() {
  const stage = reviewData.stages.find(item => item.id === 'one_repair');
  const repair = stage.options.find(item => item.id === state.review.repair);
  return shell(`<section class="m3-room"><div class="m3-panel m3-lock-view">
    <p class="m3-eyebrow">Clinical mastery Review</p><h1>One repair is ready</h1>
    <p class="m3-lead" style="margin-left:auto;margin-right:auto">${esc(repair?.label || 'Review complete')}</p>
    <p>${esc(repair?.micro_drill || '')}</p>
    <div class="m3-actions" style="justify-content:center"><button class="m3-button" type="button" data-go="journey">Open Journey and next action</button></div>
  </div></section>`, 'review');
}

function renderReview() {
  if (!reviewUnlocked()) return renderReviewLocked();
  if (state.review.status === 'complete') return renderReviewComplete();
  const stage = currentReviewStage();
  return shell(`<section class="m3-room">
    <div class="m3-heading-row"><div><p class="m3-eyebrow">Review</p><h1>Clinical mastery</h1></div><p class="m3-lead">One stage at a time. Reconstruct, decide, speak, repair.</p></div>
    <div class="m3-stage-layout">${reviewStageNav()}${renderReviewStage(stage)}</div>
  </section>`, 'review');
}

function journeyNodes() {
  const attemptDone = state.attempt.status === 'finished';
  const reviewDone = state.review.status === 'complete';
  return [
    { label: 'Phase', title: '1 · Keep the patient safe', state: 'done' },
    { label: 'Pattern', title: 'Acute chest discomfort', state: 'done' },
    { label: 'Station', title: '001 · Focused consultation', state: state.attempt.status === 'not_started' ? 'current' : 'done' },
    { label: 'Attempt', title: `Attempt ${state.attempt.number} · ${statusLabel()}`, state: state.attempt.status === 'in_progress' ? 'current' : attemptDone ? 'done' : '' },
    { label: 'Review', title: reviewDone ? 'Clinical mastery Review complete' : attemptDone ? 'Clinical mastery Review is next' : 'Locked until Finish station', state: reviewDone ? 'done' : attemptDone ? 'current' : '' },
    { label: 'Repair', title: state.review.repair ? 'One spoken repair selected' : 'Select one repair after Review', state: state.review.repair ? 'done' : reviewDone ? 'current' : '' },
    { label: 'Retry', title: reviewDone ? 'Ready for a focused repeat' : 'Available after Review', state: reviewDone ? 'current' : '' },
    { label: 'Next action', title: state.review.nextAction ? 'Professional practice plan selected' : 'Choose the next useful move', state: state.review.nextAction ? 'done' : '' }
  ];
}

function renderJourney() {
  let repair = null;
  let next = null;
  if (reviewData) {
    const repairStage = reviewData.stages.find(item => item.id === 'one_repair');
    const nextStage = reviewData.stages.find(item => item.id === 'next_action');
    repair = repairStage?.options.find(item => item.id === state.review.repair);
    next = nextStage?.options.find(item => item.id === state.review.nextAction);
  }
  return shell(`<section class="m3-room">
    <div class="m3-heading-row"><div><p class="m3-eyebrow">Journey</p><h1>Your professional pathway</h1></div><p class="m3-lead">The pathway records the training position, attempt, review, repair and next clinical action. It is not a score.</p></div>
    ${repair ? `<div class="m3-feedback"><p class="m3-kicker">Current repair</p><p><strong>${esc(repair.label)}</strong></p><p style="margin-bottom:0">${esc(repair.micro_drill)}</p></div>` : ''}
    ${next ? `<div class="m3-panel m3-panel-pad"><p class="m3-kicker">Next action</p><h2>${esc(next.label)}</h2><p>${esc(next.detail)}</p>${state.review.status === 'complete' ? `<div class="m3-actions"><button class="m3-button" type="button" data-action="start-retry">Start a focused retry</button><button class="m3-button m3-button--secondary" type="button" data-go="review">Reopen completed Review</button></div>` : ''}</div>` : ''}
    <div class="m3-pathway">${journeyNodes().map(node => `<article class="m3-path-node ${node.state === 'done' ? 'is-done' : node.state === 'current' ? 'is-current' : ''}"><p class="m3-kicker">${esc(node.label)}</p><h3 style="margin:0">${esc(node.title)}</h3></article>`).join('')}</div>
  </section>`, 'journey');
}

function ensureDialog() {
  let dialog = document.querySelector('#m3-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'm3-dialog';
    dialog.className = 'm3-dialog';
    document.body.append(dialog);
  }
  return dialog;
}

function showOrientDialog() {
  const step = station.consultation_steps[state.attempt.stepIndex];
  const dialog = ensureDialog();
  dialog.innerHTML = `<div class="m3-dialog-body"><p class="m3-kicker">Pause and orient</p><h2>${step ? esc(step.phase) : 'Ready to finish'}</h2><p>${step ? esc(step.intent) : 'The full consultation road is complete.'}</p><p class="m3-small">Your only task now: ${step ? esc(step.say_aloud) : 'finish and lock the attempt'}.</p><div class="m3-actions"><button class="m3-button" type="button" data-action="close-dialog">Return to consultation</button></div></div>`;
  dialog.showModal();
}

function showFinishDialog() {
  const dialog = ensureDialog();
  dialog.innerHTML = `<div class="m3-dialog-body"><p class="m3-kicker">Attempt control</p><h2>${esc(station.finish_action.confirmation_title)}</h2><p>${esc(station.finish_action.confirmation_text)}</p><div class="m3-actions"><button class="m3-button m3-button--danger" type="button" data-action="confirm-finish">Finish and lock</button><button class="m3-button m3-button--secondary" type="button" data-action="close-dialog">Return to station</button></div></div>`;
  dialog.showModal();
}

function closeDialog() {
  const dialog = document.querySelector('#m3-dialog');
  if (dialog?.open) dialog.close();
}

function findStep(id) {
  return station.consultation_steps.find(step => step.id === id);
}

function revealStep(id) {
  const step = findStep(id);
  if (!step || state.attempt.locked || stepIsRevealed(step)) return;
  state.attempt.revealed.push(id);
  let logText = step.patient_response || step.available_findings || step.model_speech || step.model_action?.join(' ') || step.handover_cues?.join(' ') || 'Spoken checkpoint completed.';
  logEntry(step.log_label || step.phase, logText);
  saveState();
  render();
}

function completeStep(id) {
  const step = findStep(id);
  if (!step || state.attempt.locked) return;
  const ready = step.type === 'plan_gate' ? state.attempt.planResponseShown : stepIsRevealed(step);
  if (!ready) return;
  if (!stepIsComplete(step)) state.attempt.completed.push(id);
  if (state.attempt.stepIndex < station.consultation_steps.length) state.attempt.stepIndex += 1;
  saveState();
  render({ resetScroll: true });
}

function startStation() {
  state.attempt.status = 'in_progress';
  state.attempt.startedAt = new Date().toISOString();
  state.attempt.locked = false;
  state.review = freshReview();
  state.attempt.log = [];
  logEntry('Patient opening', station.opening.text);
  saveState();
  render({ resetScroll: true });
}

function finishStation() {
  closeDialog();
  state.attempt.status = 'finished';
  state.attempt.finishedAt = new Date().toISOString();
  state.attempt.locked = true;
  state.review.status = 'in_progress';
  state.review.stageIndex = 0;
  saveState();
  reviewData = null;
  go('review');
}

function advanceReview() {
  if (state.review.stageIndex < reviewData.stage_order.length - 1) {
    state.review.stageIndex += 1;
    saveState();
    render({ resetScroll: true });
  }
}

function selectedRepairOption() {
  const stage = reviewData?.stages.find(item => item.id === 'one_repair');
  return stage?.options.find(item => item.id === state.review.repair);
}

function selectedNextOption() {
  const stage = reviewData?.stages.find(item => item.id === 'next_action');
  return stage?.options.find(item => item.id === state.review.nextAction);
}

function completeReview() {
  if (!state.review.nextAction || !state.review.repairDone) return;
  state.review.status = 'complete';
  saveState();
  go('journey');
}

function startRetry() {
  const repair = selectedRepairOption();
  const next = selectedNextOption();
  state.history.push({
    attempt: state.attempt.number,
    finishedAt: state.attempt.finishedAt,
    repair: repair?.label || null,
    nextAction: next?.label || null
  });
  const nextAttempt = freshAttempt(state.attempt.number + 1, 'focused_retry');
  nextAttempt.repairFocus = repair?.label || 'Repeat the consultation road with one deliberate improvement.';
  state.attempt = nextAttempt;
  state.review = freshReview();
  reviewData = null;
  saveState();
  go('station');
}

async function render({ resetScroll = false } = {}) {
  try {
    await ensureCoreData();
    const current = route();
    if (current === 'review' || current === 'journey') await ensureReviewData();
    if (current === 'home') app.innerHTML = renderHome();
    if (current === 'library') app.innerHTML = renderLibrary();
    if (current === 'station') app.innerHTML = renderStation();
    if (current === 'review') app.innerHTML = renderReview();
    if (current === 'journey') app.innerHTML = renderJourney();
    if (resetScroll) window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => document.querySelector('#m3-main')?.focus({ preventScroll: true }));
  } catch (error) {
    app.innerHTML = `<main class="m3-room"><div class="m3-panel m3-panel-pad"><p class="m3-eyebrow">Loading error</p><h1>The clinical pathway could not load.</h1><p>${esc(error.message)}</p><button class="m3-button" type="button" onclick="location.reload()">Reload</button></div></main>`;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button, a');
  if (!button) return;

  const target = button.dataset.go;
  if (target) {
    event.preventDefault();
    go(target);
    return;
  }

  const action = button.dataset.action;
  if (!action) return;

  if (action === 'start-station') startStation();
  if (action === 'orient') showOrientDialog();
  if (action === 'close-dialog') closeDialog();
  if (action === 'request-finish') showFinishDialog();
  if (action === 'confirm-finish') finishStation();
  if (action === 'reveal-step') revealStep(button.dataset.step);
  if (action === 'complete-step') completeStep(button.dataset.step);

  if (action === 'plan-gate') {
    state.attempt.planDiscussed = true;
    logEntry('Plan discussed', 'The learner completed the spoken management discussion before viewing David’s response.');
    saveState();
    render();
  }

  if (action === 'show-plan-response') {
    const step = station.consultation_steps.find(item => item.type === 'plan_gate');
    state.attempt.planResponseShown = true;
    if (!state.attempt.revealed.includes(step.id)) state.attempt.revealed.push(step.id);
    logEntry(step.log_label, step.patient_response);
    saveState();
    render();
  }

  if (button.dataset.reviewStage !== undefined) {
    const index = Number(button.dataset.reviewStage);
    if (Number.isInteger(index) && index <= state.review.stageIndex) {
      state.review.stageIndex = index;
      saveState();
      render({ resetScroll: true });
    }
  }

  if (button.dataset.fact) {
    if (state.review.synthesisBuilt) return;
    const id = button.dataset.fact;
    const selected = new Set(state.review.synthesis);
    const stage = reviewData.stages.find(item => item.id === 'synthesis');
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < stage.selection_target) selected.add(id);
    state.review.synthesis = [...selected];
    saveState();
    render();
  }

  if (action === 'build-synthesis') {
    const stage = reviewData.stages.find(item => item.id === 'synthesis');
    if (state.review.synthesis.length === stage.selection_target) {
      state.review.synthesisBuilt = true;
      saveState();
      render();
    }
  }

  if (action === 'next-qa') {
    const stage = reviewData.stages.find(item => item.id === 'question_answer_meaning');
    const item = stage.items[state.review.qaIndex];
    if (!state.review.qaAnswers[item.id]?.correct) return;
    state.review.qaIndex += 1;
    saveState();
    render({ resetScroll: true });
  }

  if (action === 'next-review-stage') advanceReview();

  if (action === 'explanation-spoken') {
    state.review.explanationSpoken = true;
    saveState();
    render();
  }

  if (action === 'reveal-handover-cue') {
    const stage = reviewData.stages.find(item => item.id === 'handover_drill');
    state.review.handoverReveal = Math.min(stage.cues.length, state.review.handoverReveal + 1);
    saveState();
    render();
  }

  if (action === 'handover-spoken') {
    state.review.handoverSpoken = true;
    saveState();
    render();
  }

  if (action === 'repair-done') {
    state.review.repairDone = true;
    saveState();
    render();
  }

  if (action === 'complete-review') completeReview();
  if (action === 'start-retry') startRetry();
});

document.addEventListener('change', event => {
  const input = event.target;

  if (input.dataset.qaItem) {
    const stage = reviewData.stages.find(item => item.id === 'question_answer_meaning');
    const item = stage.items.find(candidate => candidate.id === input.dataset.qaItem);
    const selected = Number(input.value);
    state.review.qaAnswers[item.id] = { selected, correct: selected === item.correct_index };
    saveState();
    render();
  }

  if (input.hasAttribute('data-threshold')) {
    state.review.threshold = input.value;
    saveState();
    render();
  }

  if (input.hasAttribute('data-explanation')) {
    state.review.explanation = input.value;
    state.review.explanationSpoken = false;
    saveState();
    render();
  }

  if (input.hasAttribute('data-repair')) {
    state.review.repair = input.value;
    state.review.repairDone = false;
    saveState();
    render();
  }

  if (input.hasAttribute('data-next-action')) {
    state.review.nextAction = input.value;
    saveState();
    render();
  }
});

window.addEventListener('hashchange', () => render({ resetScroll: true }));
window.addEventListener('storage', event => {
  if (event.key === STATE_KEY) {
    state = loadState();
    render();
  }
});

render({ resetScroll: true });
