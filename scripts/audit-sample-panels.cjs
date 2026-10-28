const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const results=[];
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('dist/index.html','utf8')}):r.abort());
  await page.goto('http://localhost:4174');
  await page.waitForTimeout(500);
  const summary=await page.evaluate(()=>{
   const playedGames=games.filter(isPlayed),scores=rated();
   const drillErrors=[];
   for(const el of document.querySelectorAll('.drill[data-kind][data-key]')){
    const {kind,key}=el.dataset;
    const matches=playedGames.filter(g=>(!isAddonExcludedKind(kind)||!isExpansionOrDlc(g))&&matchesBreakdown(g,kind,key));
    if(!matches.length)drillErrors.push({kind,key});
   }
   return {panels:[...document.querySelectorAll('section.panel')].filter(e=>!e.hidden).map(e=>({title:e.querySelector('h2')?.textContent,empty:[...e.querySelectorAll('.empty')].map(x=>x.textContent)})),played:playedGames.length,rated:scores.length,average:scores.reduce((s,g)=>s+g.rating,0)/scores.length,displayedPlayed:document.getElementById('played').textContent,years:groups(playedGames,'year').reduce((s,y)=>s+y.count,0),decades:decadeData(games).dated.length,journeys:journeyGroups().map(g=>({name:g.name,count:g.count,rated:g.ratedCount})),community:document.getElementById('communityStatus').textContent,critics:document.getElementById('criticsStatus').textContent,time:document.getElementById('totalTimeSub').textContent,drillErrors};
  });
  assert.equal(summary.played,674);assert.equal(summary.rated,463);assert.equal(summary.displayedPlayed,'674');assert.equal(summary.years,670);assert.equal(summary.decades,670);assert.deepEqual(summary.drillErrors,[]);
  for(const id of ['avgBtn','countBtn','companyCountBtn','companyRatingBtn','publisherCountBtn','publisherRatingBtn','franchiseRatingBtn','franchiseCountBtn','engineRatingBtn','engineCountBtn','genrePlotBtn','genreCountBtn','eraRatingBtn','eraCountBtn','yearListBtn','yearMixBtn','communityExpand','journeyExpand']){
   const button=page.locator('#'+id);if(await button.isVisible())await button.click();
  }
  await page.locator('#yearIncludeUnrated').check();
  for(const value of ['year','count','rating','mix'])await page.locator('#yearSort').selectOption(value);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  results.push({width,...summary,errors});await page.close();
 }
 fs.writeFileSync('data/sample-panel-browser-audit-2026-10-28.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results[0],null,2));console.log('Panel controls and layout passed at 1440, 390, 320 px.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
