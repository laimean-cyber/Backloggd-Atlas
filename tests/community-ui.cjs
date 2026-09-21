const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const width of [1440,390,320]){
const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.request().url().includes('/api/community')?r.fulfill({json:{ratings:[]}}):r.abort());
await page.goto('http://localhost:4174');
await page.locator('#communityTitle').scrollIntoViewIfNeeded();
assert(await page.locator('.community-track').evaluateAll(nodes=>nodes.every(n=>Math.abs(n.getBoundingClientRect().height-n.parentElement.getBoundingClientRect().height)<1)));
assert.equal(await page.locator('.community-point:not(.backloggd) .rating-star').count(),await page.locator('.community-track').count());
assert(await page.locator('.community-list').first().evaluate(n=>getComputedStyle(n).scrollbarColor.includes('234, 55, 122')));
await page.locator('.community-panel').screenshot({path:`community-real-${width}.png`});
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>{communityAttempted=new Set();games=[['Higher',5,3],['Highest',5,2],['Lower',2,3],['Lowest',1,4],['Equal',3,3],['Unrated',null,4],['Unavailable',4,null],['Not played',1,5]].map(([title,rating,communityRating])=>({title,rating,communityRating,communityFetchedAt:Date.now(),played:title!=='Not played'}));render()});
assert.deepEqual(await page.locator('#communityMore tbody tr td:first-child').allTextContents(),['Highest','Higher']);
assert.deepEqual(await page.locator('#communityLess tbody tr td:first-child').allTextContents(),['Lowest','Lower']);
assert.deepEqual(await page.locator('#communityMore .community-gap').allTextContents(),['+3.0','+2.0']);
assert.deepEqual(await page.locator('#communityLess .community-gap').allTextContents(),['−3.0','−1.0']);
assert(await page.locator('#communityStatus').textContent().then(x=>x.includes('5 of 6')));
await page.locator('#communityTitle').scrollIntoViewIfNeeded();
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
const halves=await page.locator('.community-half').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
assert(width>760?halves[0].y===halves[1].y:halves[0].y<halves[1].y);
await page.locator('.community-panel').screenshot({path:`community-${width}.png`});
await page.evaluate(()=>{games=[];render()});assert(await page.locator('#communityMore').textContent().then(x=>x.includes('Rate some played games')));
assert.deepEqual(errors,[]);await page.close();
}console.log('Passed community sorting, exclusions, empty states, full-width desktop and stacked mobile layout.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
