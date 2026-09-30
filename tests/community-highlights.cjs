const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.request().url().startsWith('https://images.igdb.com/')?r.continue():r.abort());
await page.goto('http://localhost:4174');
await page.evaluate(()=>{communityPaused=true;criticsPaused=true});
for(const width of [1440,390,320]){
await page.setViewportSize({width,height:1000});await page.locator('#communityTitle').scrollIntoViewIfNeeded();await page.locator('.community-poster img').evaluateAll(images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode().catch(()=>{})})));await page.locator('[aria-labelledby="communityTitle"]').screenshot({path:`.impeccable/review/community-cards-${width}.png`});
assert.equal(await page.locator('.community-category').count(),4);assert.equal(await page.locator('#communityFull').isVisible(),false);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.equal(await page.locator('[aria-labelledby="communityTitle"] > .panel-head .community-explanation').count(),0);
assert.equal(await page.locator('#communityFull > .community-explanation').count(),1);
assert(await page.locator('.community-game-name').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).color==='rgb(234, 55, 122)')));
assert.equal(await page.locator('.community-scoreline').count(),12);
assert(await page.locator('.community-scoreline').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)));
assert(await page.locator('.community-scoreline').evaluateAll(nodes=>nodes.every(n=>n.getAttribute('aria-label').includes('out of 5; difference:'))));
assert.equal(await page.locator('.community-dumbbell-point').count(),24);
assert(await page.locator('.community-dumbbell').evaluateAll(nodes=>nodes.every(n=>n.clientWidth>25)));
assert(await page.locator('.community-dumbbell').evaluateAll(nodes=>nodes.every(n=>{const you=parseFloat(n.querySelector('.community-dumbbell-you').style.left),community=parseFloat(n.querySelector('.community-dumbbell-average').style.left),join=n.querySelector('.community-dumbbell-join');return Math.abs(parseFloat(join.style.width)-Math.abs(you-community))<0.01&&Math.abs(parseFloat(join.style.left)-Math.min(you,community))<0.01})));
await page.locator('#communityExpand').click();assert(await page.locator('#communityFull .community-explanation').isVisible());await page.locator('#communityFull').screenshot({path:`.impeccable/review/community-charts-${width}.png`});await page.locator('#communityExpand').click();
}
await page.evaluate(()=>{games=[['Shared',5,4.5,80000],['Personal',5,3,90000],['Hype',2,4.5,70000],['Gem',4.5,4.5,100],['Unknown',5,2,null],['Boundary',5,2,5000],['Missing',4,null,30],['Unplayed',5,4,20],['Zero',4,3,0]].map(([title,rating,communityRating,plays])=>({title,rating,communityRating,plays,communityFetchedAt:Date.now(),played:title!=='Unplayed'}));renderCommunity()});
const names=id=>page.locator('[data-category="'+id+'"] .community-game-name').allTextContents();
assert.deepEqual(await names('shared'),['Shared','Gem']);assert.deepEqual(await names('personal'),['Boundary','Unknown','Personal']);assert.deepEqual(await names('hype'),['Hype']);assert.deepEqual(await names('hidden'),['Zero','Gem']);
await page.locator('#communityExpand').focus();await page.keyboard.press('Enter');assert(await page.locator('#communityFull').isVisible());assert.equal(await page.locator('#communityExpand').getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#communityEqual, #communityUnavailable').count(),0);assert.equal(await page.locator('#communityFull tbody tr').count(),6);
await page.keyboard.press('Enter');assert.equal(await page.locator('#communityFull').isVisible(),false);
await page.evaluate(()=>{games=[];renderCommunity()});assert.equal(await page.locator('.community-category .empty').count(),4);assert.deepEqual(errors,[]);
console.log('Passed categories, popularity separation, unknown/zero/boundary play counts, missing/equal ratings, disclosure keyboard behavior and 1440/390/320 layouts.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
