import fs from 'node:fs';

const station = JSON.parse(fs.readFileSync('assets/data/case-001/station-v3.json', 'utf8'));
const review = JSON.parse(fs.readFileSync('assets/data/case-001/review-v3.json', 'utf8'));
const library = JSON.parse(fs.readFileSync('assets/data/library-v3.json', 'utf8'));

let passed = 0;
const failures = [];
const check = (condition, message) => condition ? passed++ : failures.push(message);

check(station.case_id === review.case_id, 'Station and Review case IDs must match');
check(station.version === review.version, 'Station and Review versions must match');
check(library.version === station.version, 'Library and Station versions must match');
check(library.phases[0].patterns[0].stations[0].id === station.case_id, 'Library station ID must point to Case 001');
check(station.consultation_road.length === station.consultation_steps.length, 'Road and step counts must match');
check(station.consultation_road.every((item, index) => item.id === station.consultation_steps[index].id), 'Road and step order must match');
check(new Set(station.consultation_steps.map(step => step.id)).size === station.consultation_steps.length, 'Station step IDs must be unique');
check(station.consultation_steps.filter(step => step.type === 'plan_gate').length === 1, 'Station requires exactly one plan gate');
check(station.consultation_steps.at(-1).type === 'handover', 'Handover must be the final clinical step');
check(station.consultation_steps.every(step => typeof step.say_aloud === 'string' && step.say_aloud.length > 20), 'Every step requires a meaningful spoken instruction');
check(review.stage_order.length === review.stages.length, 'Review stage order and stage count must match');
check(review.stage_order.every(id => review.stages.some(stage => stage.id === id)), 'Every Review stage order ID must resolve');
check(new Set(review.stages.map(stage => stage.id)).size === review.stages.length, 'Review stage IDs must be unique');
check(review.stages.find(stage => stage.id === 'question_answer_meaning').items.every(item => item.correct_index >= 0 && item.correct_index < item.options.length), 'Every mapping answer must resolve to an option');
check(review.stages.find(stage => stage.id === 'decision_threshold').options.filter(option => option.correct).length === 1, 'Decision threshold requires exactly one correct answer');
check(review.stages.find(stage => stage.id === 'patient_explanation').options.filter(option => option.correct).length === 1, 'Patient explanation requires exactly one correct opening');
check(review.stages.find(stage => stage.id === 'one_repair').options.every(option => option.micro_drill && option.label), 'Every repair requires a label and micro-drill');

if (failures.length) {
  console.error(`Data contract audit failed: ${failures.length} failure(s), ${passed} checks passed.`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Data contract audit passed: ${passed} checks, 0 failures.`);
