const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const width of [1440,390]){
const p=await browser.newPage({viewport:{width,height:1000}});let fail=true;
await p.route('**/api/**',r=>r.fulfill({json:{details:[],favourites:[]}}));
await p.route('**/api/franchise?*',r=>fail?r.fulfill({status:502,json:{error:'Temporary IGDB failure'}}):r.fulfill({json:{games:[{igdbId:1,title:'Played alias',slug:'alias',year:2000},{igdbId:99,title:'Played path',slug:'entry-1',year:2001},{igdbId:100,title:'Next game',slug:'next-game',year:2008,gameType:'Main Game'}]}}));
await p.goto('http://localhost:4174');
await p.evaluate(()=>{games=Array.from({length:5},(_,i)=>({igdbId:i+1,title:'Entry '+i,path:'/games/entry-'+i+'/',played:true,franchises:['Test'],year:2000+i,rating:i===4?null:4,gameType:'Main Game'}));render()});
const button=p.getByRole('button',{name:'Show unrated and unplayed',exact:true});await button.click();
await p.locator('#retryJourneyCatalog').waitFor();assert.match(await p.locator('#journeyMenuBody').innerText(),/Entry 4/);fail=false;await p.locator('#retryJourneyCatalog').click();
await p.getByRole('heading',{name:'Unplayed (1)',exact:true}).waitFor();assert.equal(await p.locator('#journeyUnplayed .journey-unrated-item').count(),1);assert.match(await p.locator('#journeyUnplayed').innerText(),/Next game/);
assert.equal(await p.locator('.journey-point').count(),4);assert(await p.locator('#journeyMenu').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}));
await p.screenshot({path:'journey-unplayed-'+width+'.png'});
await p.keyboard.press('Escape');assert(!(await p.locator('#journeyMenu').isVisible()));await p.close();
}console.log('Passed: IGDB error/retry, ID and path matching, separate sections, chart unchanged, desktop/mobile menu.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
