const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{for(const width of [1440,390]){
 const p=await browser.newPage({viewport:{width,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.abort());
 await p.goto('http://localhost:4174');
 await p.evaluate(()=>{games=['expansion','dlc','remake','remaster','main game'].map((gameType,i)=>({title:'Game '+i,path:'/games/game-'+i+'/',gameType,rating:4,played:true})).concat({title:'Unplayed',gameType:'remake',played:false});render()});
 for(const kind of ['addons','remakes']){
  const card=p.locator(`button[data-kind="${kind}"]`);
  await card.click();assert.equal(await p.locator('#hoverList .hover-game').count(),2);
  assert.equal(await p.locator('#'+kind).textContent(),'2');
  const labels=kind==='addons'?['DLCs','Expansions']:['Remakes','Remasters'];
  for(const label of labels){const group=p.locator(`.hover-group[aria-label="${label}"]`);assert.equal(await group.count(),1);assert.equal(await group.locator('.hover-game').count(),1);assert.equal(await group.locator('h3 span').textContent(),'1');}
  const titles=await p.locator('.hover-group .hover-game a').allTextContents();assert.deepEqual(titles,kind==='addons'?['Game 1 ↗','Game 0 ↗']:['Game 2 ↗','Game 3 ↗']);
  await p.screenshot({path:`highlight-${kind}-${width}.png`});
  const box=await p.locator('#hoverCard').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
  await card.click();assert.equal(await p.locator('#hoverCard').isVisible(),false);
  await card.press('Enter');assert(await p.locator('#hoverCard').isVisible());
  await p.keyboard.press('Escape');assert.equal(await card.getAttribute('aria-expanded'),'false');
  await card.press('ArrowDown');assert(await p.evaluate(()=>!!document.activeElement.closest('#hoverList')));
  await p.locator('#closeHoverCard').click();
 }
 await p.evaluate(()=>{games=[];render()});await p.locator('[data-kind="addons"]').click();assert.equal(await p.locator('.hover-group-empty').count(),2);assert.match(await p.locator('#hoverList').textContent(),/No dlcs in this library/);
 assert.deepEqual(errors,[]);await p.close();
}}finally{await browser.close()}console.log('Highlight menus: filtering, counts, toggle, keyboard, empty state and responsive bounds passed.');})().catch(e=>{console.error(e);process.exit(1)});
