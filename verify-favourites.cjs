const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const {default:worker,parseFavourites}=await import('./dist/server/index.js');
 const fixture=JSON.parse(fs.readFileSync('favourites-fixture.json','utf8'));
 assert.equal(parseFavourites('<div id="profile-favorites"></div><div class="game-cover" game_id="1"></div>').length,0);
 assert.equal((await worker.fetch(new Request('http://local/api/favourites?user=bad!'))).status,400);
 const response=await worker.fetch(new Request('http://local/api/favourites?user=Laime'));assert.equal(response.status,200);const live=await response.json();assert.deepEqual(live.favourites.map(x=>x.path),fixture.map(x=>x.path));
 const {page:html}=await import('./dist/server/page.js');assert.equal(html,fs.readFileSync('dist/index.html','utf8'));
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let mode='ready';
 await page.route('http://localhost:4174/**',r=>r.request().url().includes('/api/favourites')?r.fulfill(mode==='error'?{status:502,json:{error:'Unavailable'}}:{json:{favourites:mode==='empty'?[]:fixture}}):r.fulfill({contentType:'text/html',body:html}));
 await page.goto('http://localhost:4174');await page.evaluate(async()=>{activeUsername='Laime';await loadFavourites('Laime')});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.locator('.favourites-panel').scrollIntoViewIfNeeded();
  await page.locator('.favourites-grid img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode()})));
  assert.equal(await page.locator('.favourites-grid img').count(),5);
  assert.equal(await page.evaluate(()=>document.querySelector('.favourites-panel').nextElementSibling.querySelector('h2').textContent),'Games by release year');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('.favourites-grid img').evaluateAll(imgs=>imgs.every(img=>{const s=getComputedStyle(img),p=img.closest('.favourites-panel').getBoundingClientRect(),r=img.getBoundingClientRect();return s.opacity==='1'&&s.transform==='none'&&s.outlineColor==='rgb(234, 55, 122)'&&s.outlineWidth==='3px'&&r.bottom<p.bottom})),true);
  await page.locator('.favourites-panel').screenshot({path:'favourites-'+width+'.png'});
 }
 mode='empty';await page.evaluate(()=>loadFavourites('Laime'));assert.match(await page.locator('#favouritesContent').textContent(),/No favourite games/);
 mode='error';await page.evaluate(()=>loadFavourites('Laime'));assert.equal(await page.locator('#retryFavourites').count(),1);
 mode='ready';await page.locator('#retryFavourites').click();await page.locator('.favourites-grid').waitFor();
 await page.evaluate(()=>{activeUsername='';render()});assert.equal(await page.locator('.favourites-grid').count(),0);assert.deepEqual(errors,[]);
 await browser.close();console.log('Passed: live favourites endpoint, exact source order, desktop/mobile poster styles and placement, empty/error/retry/reset states.');
})().catch(e=>{console.error(e);process.exit(1)});
