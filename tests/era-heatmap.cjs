const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().resourceType()==='document'?route.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):route.abort());
 fs.mkdirSync('.impeccable/review',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4174');
  assert(await page.locator('.era-cell').count()>0);
  assert.equal(await page.locator('.era-panel').evaluate(e=>e.previousElementSibling.querySelector('h2').textContent),'Themes');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.era-panel').scrollIntoViewIfNeeded();await page.locator('.era-panel').screenshot({path:'.impeccable/review/'+(width===1440?'desktop':'mobile')+'.png'});
  await page.click('#eraRatingBtn');assert.equal(await page.locator('#eraRatingBtn').getAttribute('aria-pressed'),'true');
  await page.locator('.era-cell').first().focus();assert.match(await page.locator('#eraDetails').textContent(),/rated/);
  await page.evaluate(()=>{games=[{title:'A',year:2000,rating:5,genres:['RPG','RPG'],themes:['Horror']},{title:'B',year:2009,rating:3,genres:['RPG']},{title:'C',year:2005,rating:null,genres:['RPG']},{title:'D',year:2010,rating:null,genres:['RPG']},{title:'Missing year',year:null,rating:4,genres:['RPG']},{title:'Unplayed',year:2000,rating:1,genres:['RPG'],played:false}];render()});
  const rpg=page.locator('.era-table tbody tr').filter({has:page.locator('th',{hasText:'Role-playing'})});
  assert.equal(await rpg.locator('button').first().textContent(),'4.0');assert.match(await rpg.locator('button').first().getAttribute('class'),/is-sparse/);
  assert.equal(await rpg.locator('button').nth(1).textContent(),'—');
  await page.click('#eraCountBtn');assert.equal(await rpg.locator('button').first().textContent(),'3');assert.doesNotMatch(await rpg.locator('button').first().getAttribute('class'),/is-sparse/);
  assert.equal(await page.locator('.era-table tbody tr').count(),2);assert.match(await page.locator('#eraCoverage').textContent(),/^4\/5/);
  await page.evaluate(()=>{games=[];render()});assert.match(await page.locator('#eraTable caption').textContent(),/No played games/);
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: desktop/mobile, ordering, toggle, keyboard details, sparse thresholds, averages excluding unrated, genre deduplication, Horror, decade boundaries, missing metadata, empty library.');
})().catch(e=>{console.error(e);process.exit(1)});
