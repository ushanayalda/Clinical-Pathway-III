import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
let passed=0;const failures=[];
function check(name,condition){if(condition){passed++;console.log(`PASS ${name}`)}else{failures.push(name);console.error(`FAIL ${name}`)}}

const required=['index.html','styles.css','app.js','assets/data/library.json','assets/data/case-001/station.json','assets/data/case-001/review.json','assets/data/case-001/governance.json','docs/AUTHORITY_TRACE.md','docs/BUILD_WORKLOG.md','qa/acceptance-report.md','.nojekyll'];
for(const file of required)check(`required file ${file}`,fs.existsSync(path.join(root,file)));

const html=read('index.html');const css=read('styles.css');const js=read('app.js');
const library=json('assets/data/library.json');const station=json('assets/data/case-001/station.json');const review=json('assets/data/case-001/review.json');const governance=json('assets/data/case-001/governance.json');
const learner=[html,css,js,JSON.stringify(library),JSON.stringify(station),JSON.stringify(review)].join('\n').toLowerCase();

check('Case 001 identity',station.case_id==='CP-C001'&&review.case_id==='CP-C001');
check('no Case 002',!learner.includes('case 002')&&!learner.includes('cp-c002'));
check('five learner rooms', ['home','library','station','review','journey'].every(x=>js.includes(`'${x}'`)));
check('library hierarchy',library.phases[0].patterns[0].stations[0].case_id==='CP-C001');
check('library has no answer leakage',!JSON.stringify(library).toLowerCase().includes('ambulance'));
check('candidate heading exact',station.station_card.heading==='CANDIDATE INFORMATION AND TASKS');
check('patient opening gated',js.includes("data-action=\"start\"")&&js.includes('opening_line'));
check('broad reveal controls',station.reveal_actions.length===5);
check('one current response model',js.includes('Current response')&&js.includes('state.attempt.current'));
check('encounter log',js.includes('Encounter log')&&js.includes('state.attempt.log'));
check('exact plan gate',station.plan_gate.button_label==='I have discussed my plan');
check('plan response separate',station.plan_gate.response_action.label==='Response to your plan');
check('plan gate enforced in code',js.includes("id==='response_to_plan'&&!state.attempt.planDiscussed"));
check('finish locks attempt',js.includes("state.attempt.locked=true"));
check('review gated by finish',review.unlock_rule==='attempt_finished'&&js.includes("state.attempt.status==='finished'"));
check('review data lazy loaded',js.includes("fetch('./assets/data/case-001/review.json'")&&!js.match(/Promise\.all\([\s\S]{0,300}review\.json/));
check('Self-check first',review.stage_order[0]==='self_check');
check('eight staged review sections',review.stage_order.length===8);
check('later stages disabled first',js.includes("!state.review.selfComplete&&id!=='self_check'"));
check('one review stage renderer',js.includes('renderReviewStage'));
check('Journey pathway sequence',['Phase','Pattern','Station','Attempt','Review','Retry','Next action'].every(x=>js.includes(`'${x}'`)));
check('no learner AMC branding',!learner.includes('amc'));
check('no learner ADHD labels',!learner.includes('adhd'));
check('no gamification',!/(badge|\bxp\b|streak|confetti|reward)/i.test(learner));
check('no voice scoring',!learner.includes('voice scoring'));
check('no audio generation',!/(\.mp3|audio manifest|elevenlabs)/i.test(learner));
check('no typing requirement',!/<input[^>]+type=["']?(text|search)/i.test(html+js));
check('governance release hold',governance.release_status==='hold'&&governance.clinical_status==='hold'&&governance.audio_release_status==='hold');
check('governance not fetched by learner app',!js.includes('governance.json'));
check('mobile breakpoint',css.includes('@media(max-width:560px)'));
check('visible keyboard focus',css.includes(':focus-visible'));
check('reduced motion support',css.includes('prefers-reduced-motion'));
check('semantic main landmark',html.includes('id="app"')&&js.includes('<main'));
check('confirmation dialog',html.includes('<dialog')&&js.includes("dialog.returnValue==='finish'"));
check('live navigation suppressed',js.includes("{live:true}")&&js.includes('liveHeader'));
check('GitHub Pages paths relative',!/(src|href)=["']\//.test(html));

console.log(`\n${passed} checks passed; ${failures.length} failed.`);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
