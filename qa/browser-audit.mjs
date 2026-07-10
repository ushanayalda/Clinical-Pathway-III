import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server=spawn('python3',['-m','http.server','4173'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let passed=0;const failed=[];
function check(name,value){if(value){passed++;console.log(`PASS ${name}`)}else{failed.push(name);console.error(`FAIL ${name}`)}}
async function text(page,value){return (await page.locator('body').innerText()).includes(value)}

try{
  await sleep(1200);
  const browser=await chromium.launch({headless:true});
  for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:375,height:812}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4173/#home');
    await page.evaluate(()=>localStorage.clear());
    await page.reload();
    await page.waitForSelector('h1');
    check(`${viewport.name} Home`,await text(page,'Practise the station.'));
    check(`${viewport.name} five-room navigation`,await page.locator('.nav a,.nav span').count()===5);
    check(`${viewport.name} no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));

    await page.goto('http://127.0.0.1:4173/#library');
    check(`${viewport.name} Library hierarchy`,await text(page,'Phase → Pattern → Station'));
    check(`${viewport.name} Case 001 location`,await text(page,'Chest discomfort after lunch'));
    check(`${viewport.name} no Library answer leakage`,!(await text(page,'ambulance')));

    await page.goto('http://127.0.0.1:4173/#station');
    check(`${viewport.name} reading first`,await text(page,'CANDIDATE INFORMATION AND TASKS'));
    check(`${viewport.name} opening hidden before start`,!(await text(page,'I think it is just indigestion')));
    check(`${viewport.name} Review locked before finish`,await page.locator('.nav .locked').filter({hasText:'Review'}).count()===1);
    check(`${viewport.name} no typing input`,await page.locator('input[type=text],input[type=search],textarea').count()===0);
    await page.locator('input[name=confidence-before][value=Ready]').check();
    await page.getByRole('button',{name:'Start station'}).click();
    check(`${viewport.name} patient opening after start`,await text(page,'I think it is just indigestion'));
    check(`${viewport.name} normal navigation hidden live`,await page.locator('.nav').count()===0);
    check(`${viewport.name} broad reveals`,await page.locator('[data-reveal]').count()===5);
    check(`${viewport.name} plan response hidden`,await page.getByRole('button',{name:'Response to your plan'}).count()===0);

    await page.getByRole('button',{name:'Pain story'}).click();
    check(`${viewport.name} one current response`,await page.locator('.response blockquote').count()===1);
    check(`${viewport.name} encounter log retained`,await page.locator('.log-list li').count()===2);
    await page.getByRole('button',{name:'I have discussed my plan'}).click();
    check(`${viewport.name} response unlocked after exact gate`,await page.getByRole('button',{name:'Response to your plan'}).count()===1);
    await page.getByRole('button',{name:'Response to your plan'}).click();
    check(`${viewport.name} driving challenge revealed`,await text(page,'Can I just drive myself?'));

    await page.evaluate(()=>{location.hash='home'});
    await page.waitForTimeout(100);
    check(`${viewport.name} live route guard`,locationHash(await page)==='#station');

    await page.getByRole('button',{name:'Finish station'}).click();
    check(`${viewport.name} finish confirmation`,await page.locator('dialog[open]').count()===1);
    await page.locator('dialog').getByRole('button',{name:'Finish station'}).click();
    await page.waitForSelector('.review-grid');
    check(`${viewport.name} Review unlocks after finish`,await text(page,'Self-check'));
    check(`${viewport.name} one main review stage`,await page.locator('.stage').count()===1);
    check(`${viewport.name} later stages disabled initially`,await page.locator('.stage-nav button:disabled').count()===7);

    for(const id of ['focused_history','associated_risk','act_before_proof','ambulance_no_driving','monitor_handover']){
      await page.locator(`input[data-self="${id}"][value="Yes"]`).check();
    }
    await page.getByRole('button',{name:'Continue to Safety mirror'}).click();
    check(`${viewport.name} staged Review advances`,await text(page,'Choose the description closest to your run'));
    check(`${viewport.name} later stages enabled after Self-check`,await page.locator('.stage-nav button:disabled').count()===0);
    await page.locator('button[data-stage=safe_version]').click();
    check(`${viewport.name} Safe version stage`,await text(page,'I am arranging an ambulance now'));

    await page.goto('http://127.0.0.1:4173/#journey');
    for(const label of ['Phase','Pattern','Station','Attempt','Review','Retry','Next action'])check(`${viewport.name} Journey ${label}`,await text(page,label));
    check(`${viewport.name} Journey not a table`,await page.locator('table').count()===0);
    check(`${viewport.name} mobile/desktop final overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    await context.close();
  }
  await browser.close();
}catch(error){failed.push(`browser audit exception: ${error.message}`);console.error(error)}finally{server.kill('SIGTERM')}

console.log(`\n${passed} browser checks passed; ${failed.length} failed.`);
if(failed.length){console.error(failed.join('\n'));process.exit(1)}

function locationHash(page){return page.url().slice(page.url().indexOf('#'))}
