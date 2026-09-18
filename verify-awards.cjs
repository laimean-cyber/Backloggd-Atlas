const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const {page:html}=await import('./dist/server/page.js');
 assert.equal(html,fs.readFileSync('dist/index.html','utf8'));
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:4174/**',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.goto('http://localhost:4174');
 await page.evaluate(()=>{games=awardWinners.filter((_,i)=>i%2===0).map(g=>({...g,played:true}));render()});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.locator('#awardsTitle').scrollIntoViewIfNeeded();
  await page.locator('.award-poster').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode()}});
  const result=await page.evaluate(()=>{const panel=document.querySelector('.awards-panel'),grid=document.querySelector('.grid');return {overflow:document.documentElement.scrollWidth>innerWidth,width:panel.getBoundingClientRect().width,gridWidth:grid.getBoundingClientRect().width,years:[...document.querySelectorAll('.award-year')].map(x=>+x.textContent),styles:[...document.querySelectorAll('.award-poster')].map(img=>{const s=getComputedStyle(img);return [s.opacity,s.transform,s.outlineWidth,s.outlineColor]}),afterEngine:panel.previousElementSibling.contains(document.getElementById('gameEngines'))}});
  assert.equal(result.overflow,false);assert.equal(result.width,result.gridWidth);assert.equal(result.afterEngine,true);assert.deepEqual(result.years,Array.from({length:12},(_,i)=>2014+i));
  result.styles.forEach((s,i)=>{assert.equal(s[0],i%2===0?'1':'0.5');assert.equal(s[1],i%2===0?'matrix(1, 0, 0, 1, 0, -20)':'none');assert.equal(s[2],i%2===0?'3px':'0px');if(i%2===0)assert.equal(s[3],'rgb(234, 55, 122)')});
  await page.evaluate(()=>{document.querySelectorAll('main > :not(.grid), .grid > :not(.awards-panel), .top, .heading, .foot').forEach(e=>e.style.display='none');scrollTo(0,0)});
  await page.locator('.awards-panel').screenshot({path:'awards-'+width+'.png'});
 }
 await page.evaluate(()=>{games=[{title:"Baldur’s Gate III",played:true},{title:'God of War',year:2005,played:true},{path:'/games/elden-ring/',played:false}];render()});
 assert.equal(await page.locator('.award-link.is-played').count(),1);
 assert.match(await page.locator('.award-link.is-played').getAttribute('href'),/baldurs-gate-iii/);
 await page.evaluate(()=>{games=[];render()});assert.equal(await page.locator('.award-link.is-played').count(),0);assert.deepEqual(errors,[]);
 await browser.close();console.log('Passed: twelve loaded posters; chronological order; exact played/unplayed styles; full width at desktop/mobile; profile updates; title fallback and same-name protection; no browser errors.');
})().catch(e=>{console.error(e);process.exit(1)});
