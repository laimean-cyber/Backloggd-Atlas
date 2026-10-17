const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.abort());
  await page.route('https://images.igdb.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="90" height="120"><rect width="90" height="120" fill="pink"/></svg>',headers:{'access-control-allow-origin':'*'}}));
  const html=readFileSync('public/index.html','utf8').replace('  function render(){','  function render(){ window.testPanels={render,renderDecades,renderJourneys,games};');
  await page.route('http://localhost:4174/',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.goto('http://localhost:4174/');
  await page.waitForFunction(()=>document.querySelector('.developer-logo:not([hidden])'));
  await page.waitForTimeout(500);
  const result=await page.evaluate(async()=>{
   const strips=[...document.querySelectorAll('.decade-picks,.journey-scroll')].filter(e=>e.scrollWidth>e.clientWidth+100);
   strips.forEach(e=>e.scrollLeft=120);
   const logos=[...document.querySelectorAll('.developer-logo:not([hidden])')];
   const sources=logos.map(e=>e.src);
   const mutations=[];
   const observer=new MutationObserver(records=>mutations.push(...records));
   for(const id of ['developers','publishers','decadesReel','franchiseJourneys'])observer.observe(document.getElementById(id),{childList:true,attributes:true,subtree:true});
   for(let i=0;i<6;i++){testPanels.render();testPanels.renderDecades();testPanels.renderJourneys()}
   await new Promise(r=>setTimeout(r,100));
   const unchangedMutations=mutations.filter(m=>m.type==='childList'||m.target.matches('img')&&['src','hidden'].includes(m.attributeName)).length;
   // Simulate metadata arriving while a person is using the dashboard.
   testPanels.games.find(g=>g.rating>0).rating=3.5;
   testPanels.render();
   await new Promise(r=>setTimeout(r,100));
   observer.disconnect();
   return {strips:strips.length,preserved:strips.every(e=>e.isConnected&&Math.abs(e.scrollLeft-120)<1),logos:logos.length,stableLogos:logos.every((e,i)=>e.isConnected&&!e.hidden&&e.src===sources[i]),unchangedMutations};
  });
  assert(result.strips>0&&result.preserved,JSON.stringify(result));
  assert(result.logos>0&&result.stableLogos,JSON.stringify(result));
  assert.equal(result.unchangedMutations,0,'Unchanged panels should not mutate');
  const strip=page.locator('.decade-picks').first();await strip.scrollIntoViewIfNeeded();
  await strip.evaluate(e=>e.scrollLeft=0);
  const box=await strip.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,g:e.offsetHeight-e.clientHeight}});
  await page.evaluate(()=>window.refreshTimer=setInterval(()=>testPanels.render(),60));
  await page.mouse.move(box.x+box.w*.8,box.y+box.h-box.g/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  const trackPosition=await strip.evaluate(e=>e.scrollLeft);
  assert(trackPosition>0,'Clicking empty scrollbar track must advance');
  await page.mouse.move(10,10);await page.mouse.wheel(0,450);await page.waitForTimeout(250);
  assert((await strip.evaluate(e=>e.scrollLeft))>=trackPosition,'Page scrolling and hover exit must not reset the strip');
  await page.evaluate(()=>clearInterval(refreshTimer));
  assert.deepEqual(errors,[]);
  console.log({ ...result,trackPosition,errors });
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
