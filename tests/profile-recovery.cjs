const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
  for(const saved of [false,true]){
    const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/api/**',r=>r.fulfill({status:502,json:{error:'Backloggd bot-verification page; retry later or import CSV.',status:403}}));
    await p.goto('http://localhost:4174/');
    if(saved)await p.evaluate(()=>{const game=structuredClone(defaultLibrary.find(metadataComplete));game.metadataFetchedAt=Date.now();localStorage.setItem(libraryKey('splinefx'),JSON.stringify({savedAt:Date.now()-30*86400000,games:[game]}));});
    await p.locator('#username').fill('splinefx');await p.locator('#lookupButton').click();
    await p.waitForFunction(()=>!document.getElementById('lookupButton').disabled);
    assert.match(await p.locator('#notice').innerText(),/bot-verification/);
    if(saved){assert.match(await p.locator('#title').innerText(),/splinefx/);assert.match(await p.locator('#notice').innerText(),/saved library snapshot/);assert.equal(await p.evaluate(()=>games.length),1)}
    assert.deepEqual(errors,[]);await p.close();
  }
  console.log('Passed: build exits loading on upstream failure; month-old snapshot builds with a visible warning; no browser script errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
