const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:4174/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('dist/index.html','utf8')}));
 await page.goto('http://localhost:4174/');
 const fixture=[4,3,5,null,0].map((rating,i)=>({title:'Game '+i,rating,played:true,category:0,developers:['Studio','Studio'],publishers:['Publisher','Publisher'],themes:['Theme'],franchises:['Franchise'],gameEngines:['Engine']}));
 fixture.push({title:'DLC',rating:5,played:true,category:1,developers:['Studio'],publishers:['Publisher'],themes:['Theme'],franchises:['Franchise'],gameEngines:['Engine']});
 fixture.push({title:'Expansion',rating:5,played:true,category:2,developers:['Studio'],publishers:['Publisher'],themes:['Theme'],franchises:['Franchise'],gameEngines:['Engine']});
 fixture.push({title:'Excluded',rating:5,played:false,developers:['Studio'],publishers:['Publisher']});
 await page.evaluate(data=>{games=data;render()},fixture);
 for(const [root,kind,key,buttons] of [['developers','studio','Studio',['companyRatingBtn','companyCountBtn']],['publishers','publisher','Publisher',['publisherRatingBtn','publisherCountBtn']]]){
  for(const button of buttons){
   await page.locator('#'+button).click();
   const row=page.locator('#'+root+' button').first();
   assert.equal(await row.locator('.dev-detail').textContent(),'5 games · 3 rated · 4.0 / 5');
   await row.focus();assert.equal(await page.locator('#hoverList .hover-game').count(),5);
   assert.equal(await page.locator('#hoverSummary').textContent(),'5 games · 3 rated · 4.0 avg');
   assert.equal(await page.locator('#hoverList .hover-game').filter({hasText:'Unrated'}).count(),2);
   await page.keyboard.press('Escape');
  }
  await page.evaluate(({kind,key})=>showBreakdown(kind,key,document.querySelector('[data-kind="'+kind+'"]'),true),{kind,key});
  assert.equal(await page.locator('#breakdownList .game-item').count(),5);
 }
 assert.equal(await page.locator('#addons').textContent(),'2');
 assert.equal(await page.locator('#addonsSub').textContent(),'1 expansion · 1 DLC');
 for(const [root,kind] of [['themes','theme'],['franchises','franchise'],['gameEngines','engine']]){
  const row=page.locator('#'+root+' button').first();
  assert.equal(await row.locator('span').nth(1).textContent(),'5');
  await row.focus();assert.equal(await page.locator('#hoverList .hover-game').count(),5);await page.keyboard.press('Escape');
  await page.evaluate(({kind})=>showBreakdown(kind,kind==='theme'?'Theme':kind==='franchise'?'Franchise':'Engine',document.querySelector('[data-kind="'+kind+'"]'),true),{kind});
 assert.equal(await page.locator('#breakdownList .game-item').count(),5);
 }
 await page.evaluate(()=>{$('hoverCard').hidden=true;hoverTrigger=null});
 const audit=JSON.parse(fs.readFileSync('laime-audit.json','utf8'));
 await page.evaluate(data=>{games=data;render()},audit);
 for(const root of ['developers','publishers'])for(const row of await page.locator('#'+root+' button').all()){
  const count=Number((await row.locator('.dev-detail').textContent()).match(/^\d+/)[0]);
  await row.focus();assert.equal(await page.locator('#hoverList .hover-game').count(),count,`${root}: ${await row.locator('.dev-name').textContent()}`);await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);
 const {page:served}=await import('./dist/server/page.js');assert.equal(served,fs.readFileSync('dist/index.html','utf8'));
 console.log('Passed: both sort modes, unrated inclusion and unplayed exclusion, duplicate credits, hover and breakdown counts, saved profile, served-page parity.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
