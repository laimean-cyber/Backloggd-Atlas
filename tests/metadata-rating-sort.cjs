const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.abort());
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4174');
  await page.evaluate(()=>{games=[];for(const [name,scores] of [['Popular',[3,3,3,3]],['Best',[5,4,4]],['Sparse',[5,5,null]],['Single',[5]]])scores.forEach((rating,i)=>games.push({title:name+i,path:'/games/'+name+i+'/',played:true,rating,franchises:[name],gameEngines:[name]}));render()});
  for(const [kind,id] of [['franchise','franchises'],['engine','gameEngines']]){
   const names=()=>page.locator('#'+id+' .explorer-row > span:first-child').allTextContents();
   assert.deepEqual(await names(),['Popular','Sparse','Best','Single']);
   await page.locator('#'+kind+'RatingBtn').click();
   assert.deepEqual(await names(),['Best','Popular']);
   assert.equal(await page.locator('#'+kind+'RatingBtn').getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#'+(kind==='engine'?'engine':'franchise')+'Subtitle').textContent(),/at least 3 rated games/);
   await page.locator('#'+id).locator('..').screenshot({path:`metadata-${kind}-${width}.png`});
   await page.locator('#'+kind+'CountBtn').click();assert.equal((await names()).length,4);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#franchiseRatingBtn').click();await page.locator('#engineRatingBtn').click();
  await page.evaluate(()=>{games=[];render()});
  for(const id of ['franchises','gameEngines'])assert.match(await page.locator('#'+id).textContent(),/at least 3 rated games/);
 }
 assert.deepEqual(errors,[]);console.log('Metadata rating sorting, minimum rated count, toggles, empty states, and desktop/mobile layout passed.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
