const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.abort());
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4174');
  await page.locator('.genre-preference-panel').screenshot({path:`genre-preference-${width}.png`});
  assert(await page.locator('.genre-preference-dot').count()>0);
  assert(await page.evaluate(()=>document.querySelector('.genre-preference-panel').offsetWidth===document.querySelector('.grid').offsetWidth));
  assert(await page.evaluate(()=>document.querySelector('.genre-preference-panel').nextElementSibling.textContent.includes('Beyond the averages')));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(()=>{games=[{title:'A',played:true,rating:5,genres:['RPG','Role-playing (RPG)']},{title:'B',played:true,rating:3,genres:['RPG']},{title:'C',played:true,rating:null,genres:['RPG']},{title:'D',played:true,rating:null,genres:['Puzzle']},{title:'E',played:false,rating:1,genres:['RPG']}];render()});
  assert.equal(await page.locator('.genre-preference-dot').count(),1);
  assert.match(await page.locator('.genre-preference-dot').getAttribute('aria-label'),/3 games, 4.0 \/ 5 average, 2 rated games/);
  await page.locator('.genre-preference-dot').focus();
  assert.match(await page.locator('#hoverSummary').textContent(),/3 games · 2 rated · 4.0 avg/);
  await page.keyboard.press('Escape');assert(await page.locator('#hoverCard').isHidden());
  await page.evaluate(()=>{games=[];render()});assert.equal(await page.locator('#genrePreferencePlot .empty').count(),1);
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('Genre preference: desktop/mobile, placement, counts, averages, rated tooltips, keyboard and empty state passed.');
})().catch(e=>{console.error(e);process.exit(1)});
