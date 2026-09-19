const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.abort());
 async function verify(name){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.evaluate(()=>{
   const labels=[...document.querySelectorAll('.genre-preference-label')],dots=[...document.querySelectorAll('.genre-preference-dot')],bounds=document.querySelector('.genre-preference-grid').getBoundingClientRect();
   const rects=labels.map(x=>x.getBoundingClientRect()),points=dots.map(x=>{const r=x.getBoundingClientRect();return {left:r.left+5,right:r.right-5,top:r.top+5,bottom:r.bottom-5}});
   const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   return {labels:labels.length,dots:dots.length,collisions:rects.flatMap((a,i)=>rects.slice(i+1).filter(b=>overlap(a,b)).map(()=>i)),pointCollisions:rects.flatMap((a,i)=>points.filter(b=>overlap(a,b)).map(()=>i)),outside:rects.some(r=>r.left<bounds.left||r.right>bounds.right+1||r.top<bounds.top||r.bottom>bounds.bottom+1),overflow:document.documentElement.scrollWidth>innerWidth,visible:labels.every(el=>el.offsetWidth&&el.offsetHeight),finite:dots.every(el=>Number.isFinite(parseFloat(el.style.left))&&Number.isFinite(parseFloat(el.style.top)))};
  });
  assert.equal(result.labels,result.dots,name);assert(result.labels>0,name);assert.deepEqual(result.collisions,[],name+' labels overlap');assert.deepEqual(result.pointCollisions,[],name+' label touches point');assert.equal(result.outside,false,name);assert.equal(result.overflow,false,name);assert(result.visible&&result.finite,name);
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:4174');await verify('default desktop');
 for(const width of [390,320,768,1440]){await page.setViewportSize({width,height:1000});await verify('live resize '+width)}
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>{games=Array.from({length:35},(_,i)=>({title:'Cluster '+i,played:true,rating:3.5+(i%3)*.01,genres:['Long genre name with a varied description '+i]}));render()});await verify('dense long labels '+width);
  await page.locator('.genre-preference-label').first().focus();assert(await page.locator('#hoverCard').isVisible());assert.match(await page.locator('#hoverSummary').textContent(),/1 games · 1 rated/);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{games=[{title:'A',played:true,rating:5,genres:['A']},{title:'B',played:true,rating:.5,genres:['B']}];render()});await verify('axis edges '+width);
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('All labels visible, zero label/point collisions, bounds, live resizing, 35 clustered long labels, axis edges and label tooltips passed at 320–1440px.');
})().catch(e=>{console.error(e);process.exit(1)});
