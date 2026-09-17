const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const {igdbDetails}=await import('./dist/server/igdb.js');
 const {page:dashboard}=await import('./dist/server/page.js');
 const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
 const data=[];
 for(const slug of ['portal','portal-2','half-life-2'])data.push({path:'/games/'+slug+'/',title:slug,rating:4.5,year:2011,played:true,checked:true,plays:100,...await igdbDetails('/games/'+slug+'/', '',env)});
 assert.ok(data.every(g=>g.publishers.includes('Valve')&&g.gameModes.length));
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();let requests=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:4174/**',r=>{if(r.request().url().includes('/api/details')){requests++;return r.fulfill({json:{details:data,failed:0}})}return r.fulfill({contentType:'text/html',body:dashboard})});
 for(const width of [1440,800,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4174/');await page.evaluate(data=>{games=data;render()},data);await page.waitForTimeout(400);
  assert.ok((await page.locator('#publishers').textContent()).includes('Valve'));
  assert.ok((await page.locator('#modeLegend').textContent()).includes('Single player'));
  assert.equal(await page.locator('.stats').count(),2);
  assert.equal(await page.locator('.stats').first().locator('.card').count(),4);
  assert.equal(await page.locator('.stats').last().locator('.card').count(),4);
  assert.equal(await page.locator('#topFranchise').textContent(),'Portal');
  assert.equal(await page.locator('#topFranchiseSub').textContent(),'2 games in this franchise');
  assert.match(await page.locator('#remakesSub').textContent(),/^\d+ remakes? · \d+ remasters?$/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.evaluate(()=>['publishers','modeDonut','modeLegend'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),p=e.closest('.panel').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom})),true);
  await page.locator('#publisherCountBtn').click();assert.equal(await page.locator('#publisherTitle').textContent(),'Publishers you play most');await page.locator('#publisherRatingBtn').click();
  await page.locator('#publishers button').first().focus();assert.ok((await page.locator('#hoverList').textContent()).includes('portal'));await page.keyboard.press('Escape');
  if(width===1440||width===390)await page.screenshot({path:'panels-'+width+'.png',fullPage:true});
 }
 await page.evaluate(data=>{for(const g of data)saveMetadata(g);saveLibrary('cachetest',data)},data);
 await page.reload();await page.evaluate(async()=>{const {all}=await loadCards('cachetest');games=all;await loadDetails(all);if(!all.every(g=>g.publishers.length&&g.gameModes.length))throw Error('Cache lost fields')});assert.equal(requests,0);
 await page.evaluate(async()=>{const all=[{path:'/games/portal/',title:'Portal'}];await loadDetails(all)});assert.equal(requests,1);
 await page.reload();await page.evaluate(async()=>{const all=[{path:'/games/portal/',title:'Portal',...readMetadata('/games/portal/')}];await loadDetails(all)});assert.equal(requests,1);
 assert.deepEqual(errors,[]);await browser.close();console.log('Live IGDB fields, publisher controls, four viewport layouts, and cache reuse passed.');
})().catch(e=>{console.error(e);process.exit(1)});
