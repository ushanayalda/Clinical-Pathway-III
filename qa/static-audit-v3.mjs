import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let passed = 0;
const failures = [];

function check(condition, message) {
  if (condition) passed += 1;
  else failures.push(message);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function json(file) {
  return JSON.parse(read(file));
}

const required = [
  'index.html',
  'app.js',
  'styles-v3.css',
  'assets/data/library-v3.json',
  'assets/data/case-001/station-v3.json',
  'assets/data/case-001/review-v3.json',
  'assets/data/case-001/governance-v3.json',
  'qa/static-audit-v3.mjs',
  'qa/data-contract-audit-v3.mjs',
  'qa/browser-audit-v3.mjs',
  '.github/workflows/validate.yml',
  '.github/workflows/deploy-pages.yml'
];

for (const file of required) check(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`);

const app = read('app.js');
const css = read('styles-v3.css');
const libraryText = read('assets/data/library-v3.json');
const stationText = read('assets/data/case-001/station-v3.json');
const reviewText = read('assets/data/case-001/review-v3.json');
const governanceText = read('assets/data/case-001/governance-v3.json');
const deploy = read('.github/workflows/deploy-pages.yml');
const validate = read('.github/workflows/validate.yml');
const learnerFacing = [app, css, libraryText, stationText, reviewText].join('\n').toLowerCase();

const appNeedles = [
  'styles-v3.css',
  'library-v3.json',
  'station-v3.json',
  'review-v3.json',
  'clinical-pathway.case-001.mastery.v3',
  'start-station',
  'reveal-step',
  'complete-step',
  'plan-gate',
  'show-plan-response',
  'request-finish',
  'confirm-finish',
  'reviewUnlocked',
  'ensureReviewData',
  'synthesisBuilt',
  'qaAnswers',
  'threshold',
  'explanationSpoken',
  'handoverSpoken',
  'repairDone',
  'nextAction',
  'startRetry',
  'window.scrollTo',
  'm3-live-header',
  'm3-stage-layout',
  'm3-pathway',
  'I have discussed my plan',
  'Response to your plan',
  'Finish station',
  'One repair'
];
for (const needle of appNeedles) check(app.includes(needle), `app.js missing required implementation marker: ${needle}`);

const station = json('assets/data/case-001/station-v3.json');
check(station.version === 3, 'Station version must be 3');
check(station.case_id === 'case-001', 'Station must remain Case 001');
check(station.station_number === '001', 'Station number must remain 001');
check(station.time_minutes === 8, 'Station timing must be 8 minutes');
check(station.station_card.candidate_information.length >= 4, 'Candidate Information must be complete');
check(station.station_card.tasks.length === 3, 'Station must have three explicit tasks');
check(station.station_card.candidate_note.includes('one question at a time'), 'Candidate note must establish one-question interaction');
check(station.opening.text.toLowerCase().includes('discomfort'), 'Patient opening must use chest discomfort language');
check(station.opening.text.toLowerCase().includes('indigestion'), 'Patient opening must preserve the indigestion label');
check(station.consultation_road.length === 10, 'Consultation road must contain ten professional steps');
check(station.consultation_steps.length === 10, 'Station must contain ten sequential consultation steps');

const expectedIds = ['define', 'associated', 'alternatives', 'risk', 'threshold', 'assessment', 'explain', 'plan', 'resistance', 'handover'];
check(JSON.stringify(station.consultation_steps.map(step => step.id)) === JSON.stringify(expectedIds), 'Consultation steps must follow the clinical road');

for (const step of station.consultation_steps) {
  check(Boolean(step.phase), `Step ${step.id} requires a phase label`);
  check(Boolean(step.intent), `Step ${step.id} requires a focused intent`);
  check(Boolean(step.say_aloud), `Step ${step.id} requires a spoken prompt`);
  check(Boolean(step.clinical_meaning), `Step ${step.id} requires clinical meaning`);
  check(Boolean(step.log_label), `Step ${step.id} requires encounter-log text`);
}

for (const step of station.consultation_steps.filter(step => step.type === 'question')) {
  check(Boolean(step.patient_response), `Question step ${step.id} requires one patient response`);
  check(!Array.isArray(step.patient_response), `Question step ${step.id} must reveal one response, not a bundle`);
}

const plan = station.consultation_steps.find(step => step.type === 'plan_gate');
check(plan.gate_button === 'I have discussed my plan', 'Exact plan gate button must be preserved');
check(plan.response_label === 'Response to your plan', 'Plan response label must be exact');
check(Boolean(plan.patient_response), 'Plan response must exist behind the gate');
check(station.finish_action.button_label === 'Finish station', 'Finish button must be exact');
check(station.boundaries.medication_content === 'hold', 'Medication content must remain on HOLD');
check(station.boundaries.audio === false, 'Audio must remain disabled');
check(station.boundaries.voice_scoring === false, 'Voice scoring must remain disabled');
check(station.boundaries.typing_required === false, 'Typing must not be required');
check(station.boundaries.clinical_release === 'hold', 'Clinical release must remain HOLD');

const library = json('assets/data/library-v3.json');
const pattern = library.phases[0].patterns[0];
check(pattern.title === 'Acute chest discomfort', 'Library pattern must match the stem language');
check(pattern.patient_language.includes('pain'), 'Library must teach pain as one possible patient word');
check(pattern.patient_language.includes('pressure'), 'Library must teach pressure as one possible patient word');
check(pattern.patient_language.includes('tightness'), 'Library must teach tightness as one possible patient word');
check(pattern.patient_language.includes('discomfort'), 'Library must teach discomfort as one possible patient word');
check(pattern.patient_language.includes('indigestion'), 'Library must teach indigestion as one possible patient word');
check(pattern.stations.length === 1, 'Library must contain Case 001 only');
check(pattern.stations[0].id === 'case-001', 'Library station must be Case 001');
check(!libraryText.toLowerCase().includes('acute coronary syndrome'), 'Library must not leak the answer');
check(!libraryText.toLowerCase().includes('ambulance'), 'Library must not leak the management plan');

const review = json('assets/data/case-001/review-v3.json');
const expectedStages = ['synthesis', 'question_answer_meaning', 'decision_threshold', 'patient_explanation', 'handover_drill', 'one_repair', 'next_action'];
check(JSON.stringify(review.stage_order) === JSON.stringify(expectedStages), 'Review stage order must match clinical mastery sequence');
check(review.stages.length === 7, 'Review must contain seven concise stages');
for (const id of expectedStages) check(review.stages.some(stage => stage.id === id), `Review missing stage: ${id}`);

const synthesis = review.stages.find(stage => stage.id === 'synthesis');
check(synthesis.selection_target === 5, 'Synthesis must require deliberate fact selection');
check(synthesis.options.filter(option => option.essential).length === 5, 'Synthesis must define five essential facts');
check(Boolean(synthesis.model), 'Synthesis must provide a model problem representation');

const mapping = review.stages.find(stage => stage.id === 'question_answer_meaning');
check(mapping.items.length === 5, 'Question-answer-meaning stage must contain five retrieval items');
for (const item of mapping.items) {
  check(item.options.length === 3, `Mapping item ${item.id} must present three focused options`);
  check(Number.isInteger(item.correct_index), `Mapping item ${item.id} requires a correct index`);
  check(Boolean(item.meaning), `Mapping item ${item.id} requires clinical meaning`);
}

const threshold = review.stages.find(stage => stage.id === 'decision_threshold');
check(threshold.options.filter(option => option.correct).length === 1, 'Decision threshold must have one safe answer');
check(threshold.action_sequence.length === 5, 'Decision threshold must teach a five-step action sequence');
check(threshold.differential_lens.length >= 4, 'Decision threshold must include a useful differential lens');

const explanation = review.stages.find(stage => stage.id === 'patient_explanation');
check(explanation.options.filter(option => option.correct).length === 1, 'Explanation must have one balanced opening');
check(explanation.model_blocks.length === 5, 'Explanation must use a five-part communication structure');
check(Boolean(explanation.spoken_instruction), 'Explanation must include spoken retrieval');

const handover = review.stages.find(stage => stage.id === 'handover_drill');
check(handover.cues.length === 4, 'Handover drill must use four concise cues');
check(Boolean(handover.model), 'Handover drill must include a comparison model');
check(Boolean(handover.completion_label), 'Handover drill must require spoken completion');

const repair = review.stages.find(stage => stage.id === 'one_repair');
check(repair.options.length === 5, 'One-repair stage must offer five clinically targeted repairs');
for (const option of repair.options) {
  check(Boolean(option.diagnostic_prompt), `Repair ${option.id} needs a diagnostic prompt`);
  check(Boolean(option.micro_drill), `Repair ${option.id} needs a spoken micro-drill`);
}

const next = review.stages.find(stage => stage.id === 'next_action');
check(next.options.length === 3, 'Next action must offer three professional practice routes');
check(review.boundaries.clinical_release === 'hold', 'Review clinical release must remain HOLD');
check(review.boundaries.audio === false, 'Review must not add audio');
check(review.boundaries.voice_scoring === false, 'Review must not add voice scoring');
check(review.boundaries.typing_required === false, 'Review must not require typing');

const prohibited = [
  'case 002',
  'badge',
  'badges',
  'xp',
  'streak',
  'confetti',
  'reward',
  'leaderboard',
  'voice score',
  'adhd',
  'australian medical council'
];
for (const term of prohibited) check(!learnerFacing.includes(term), `Learner-facing files contain prohibited term: ${term}`);

check(!app.includes('governance-v3.json'), 'Learner app must not fetch governance data');
check(!deploy.includes('governance-v3.json'), 'Deployment must not publish governance data');
check(deploy.includes('styles-v3.css'), 'Deployment must include v3 CSS');
check(deploy.includes('library-v3.json'), 'Deployment must include v3 Library data');
check(deploy.includes('station-v3.json'), 'Deployment must include v3 Station data');
check(deploy.includes('review-v3.json'), 'Deployment must include v3 Review data');
check(validate.includes('npm test'), 'Validation workflow must run mechanical audits');
check(validate.includes('npm run audit:browser'), 'Validation workflow must run browser audit');
check(css.includes('@media (max-width: 720px)'), 'CSS must include mobile adaptation');
check(css.includes('prefers-reduced-motion'), 'CSS must respect reduced motion');
check(css.includes(':focus-visible'), 'CSS must provide visible keyboard focus');
check(css.includes('min-height: 48px'), 'Primary controls must meet touch-target height');

const governance = JSON.parse(governanceText);
check(governance.clinical_release === 'HOLD', 'Governance must retain clinical HOLD');
check(governance.learner_delivery.case_002 === false, 'Governance must prohibit Case 002');
check(governance.learner_delivery.gamification === false, 'Governance must prohibit gamification');
check(governance.learner_delivery.learner_facing_governance === false, 'Governance must remain internal');

if (failures.length) {
  console.error(`Static audit failed: ${failures.length} failure(s), ${passed} checks passed.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Static and no-drift audit passed: ${passed} checks, 0 failures.`);
