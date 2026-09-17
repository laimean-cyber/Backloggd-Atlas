const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 await page.route('http://127.0.0.1:4174/**',r=>r.request().url().endsWith('/')?r.fulfill({contentType:'text/html',body:fs.readFileSync('dist/index.html','utf8')}):r.fulfill({status:404,body:''}));
 for(const width of [1440,1024,800,760,390,320]){
  await page.setViewportSize({width,height:1100});await page.goto('http://127.0.0.1:4174/');
  await page.evaluate(data=>{games=data;render()},JSON.parse(fs.readFileSync('laime-audit.json','utf8')));
  await page.waitForTimeout(600);
  const result=await page.evaluate(()=>{
   const panels=[...document.querySelectorAll('.panel:not(.span2)')],rect=e=>e.getBoundingClientRect();
   return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,boxes:panels.map(e=>({w:rect(e).width,h:rect(e).height})),fits:['donut','legend','developers','genreRows','yearRows'].every(id=>{const e=document.getElementById(id),r=rect(e),p=rect(e.closest('.panel'));return r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom}),legendOverflow:document.getElementById('legend').scrollWidth>document.getElementById('legend').clientWidth};
  });
  console.log(JSON.stringify(result));assert.equal(result.overflow,false);assert.equal(result.fits,true);assert.equal(result.legendOverflow,false);for(const b of result.boxes){assert.ok(Math.abs(b.w-b.h)<1);assert.ok(Math.abs(b.w-result.boxes[0].w)<1)}
  if(width===1440||width===390)await page.screenshot({path:`square-${width}.png`,fullPage:true});
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
