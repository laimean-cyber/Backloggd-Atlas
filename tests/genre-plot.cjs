const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:4174/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}));
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4174');
  await page.click('#genrePlotBtn');
  assert(await page.locator('.genre-dot-row').count()>0);
  const actual=await page.evaluate(()=>({names:groups(games.filter(isPlayed),'genres').map(x=>x.name),avg:fmt(avg(rated().map(g=>g.rating))),reference:document.querySelector('.genre-reference').textContent}));
  assert(!actual.names.includes('RPG'));assert(!actual.names.includes('Real Time Strategy'));assert(actual.reference.includes(actual.avg));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.genres-panel').scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.keyboard.press('Escape');
  await page.locator('.genres-panel').screenshot({path:`genre-dots-${width}.png`});
  await page.evaluate(()=>{games=[{title:'A',played:true,rating:5,genres:['RPG','Role-playing (RPG)',' RPG ']},{title:'B',played:true,rating:3,genres:['RPG','Real Time Strategy','Real Time Strategy (RTS)']},{title:'C',played:true,rating:null,genres:['Turn Based Strategy','Turn-based strategy (TBS)']},{title:'No genre',rating:1,played:true},{title:'Unplayed',rating:5,played:false,genres:['RPG']}];render()});
  const groups=await page.evaluate(()=>groups(games.filter(isPlayed),'genres'));
  assert.equal(groups.length,3);const rpg=groups.find(x=>x.name==='Role-playing (RPG)');assert.equal(rpg.count,2);assert.equal(rpg.ratedCount,2);assert.equal(rpg.rating,4);
  assert.equal(await page.locator('.genre-dot-row').count(),3);assert.equal(await page.locator('.genre-dot').count(),2);
  assert((await page.locator('.genre-reference').textContent()).includes('3.0'));
  await page.locator('.genre-dot-row').first().focus();assert.equal(await page.locator('#hoverList .hover-game').count(),2);
  await page.click('#genreCountBtn');assert.equal(await page.locator('.genre-word').count(),3);
  await page.click('#genreRatingBtn');assert.equal(await page.locator('.genre-word').count(),2);
  await page.click('#genrePlotBtn');
  await page.evaluate(()=>{games=[{title:'Unrated',rating:null,genres:['RPG']}];render()});assert.equal(await page.locator('.genre-dot').count(),0);assert.equal(await page.locator('.genre-dot-reference').count(),0);
  await page.evaluate(()=>{games=[];render()});assert.equal(await page.locator('#genreRows .empty').count(),1);
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('Passed genre aliases, deduplication, ranking, overall average, unrated/empty states, previews, cloud toggles, desktop/mobile.');
})().catch(e=>{console.error(e);process.exit(1)});
