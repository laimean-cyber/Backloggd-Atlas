const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {for(const width of [1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.abort());
    await page.goto('http://localhost:4174');
    await page.evaluate(()=>{games=Array.from({length:650},(_,i)=>({title:'Game '+i,year:i<200?2011:i<400?2015:2022,rating:4,gameModes:i<629?['Single player','Multiplayer','Single player']:['Multiplayer']}));games.push({title:'Missing metadata',year:null},{title:'Unplayed',played:false,year:2022,gameModes:['Single player']});render()});
    assert.match(await page.locator('#decadeInsight').innerText(),/2010s[\s\S]*400 played games/);
    const single=page.locator('#modeLegend button[data-key="Single player"]');
    assert.equal(await single.innerText(),'Single-player — 629 of 650 games · 97%');
    assert.match(await page.locator('#modeLegend').innerText(),/Multiplayer — 650 of 650 games · 100%/);
    assert.equal(await page.locator('#modeDonut').count(),0);
    assert(await single.locator('.mode-bar-track>span').evaluate(el=>Math.abs(parseFloat(el.style.width)-629/650*100)<0.001));
    await single.click();assert.equal(await page.locator('#hoverList .hover-game').count(),629);await page.keyboard.press('Escape');
    await single.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#hoverCard').isVisible(),true);await page.keyboard.press('Escape');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#modeLegend').screenshot({path:`mode-bars-${width}.png`});
    await page.evaluate(()=>{games=[{title:'Missing',year:null},{title:'Blank',year:''},{title:'Invalid',year:'bad'}];render()});
    assert.match(await page.locator('#decadeInsight').innerText(),/Waiting for release-year data/);
    assert.match(await page.locator('#modeLegend').innerText(),/No game mode data yet/);
    assert.deepEqual(errors,[]);await page.close();
  }}finally{await browser.close()}
  console.log('Passed decade aggregation, missing years, overlapping modes, deduplication, coverage, empty states, interaction and responsive checks.');
})().catch(e=>{console.error(e);process.exit(1)});
