const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 await page.route('http://127.0.0.1:4174/', route=>route.fulfill({contentType:'text/html',body:require('fs').readFileSync('dist/index.html','utf8')}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [name,width,height] of [['desktop',1440,1100],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  await page.goto('http://127.0.0.1:4174/');
  await page.evaluate(data=>{games=data;render()},JSON.parse(require('fs').readFileSync('laime-audit.json','utf8')));
  await page.waitForFunction(()=>document.querySelectorAll('.average-stars svg').length===10&&document.querySelectorAll('.genre-word').length>0);
  await page.locator('#loading').waitFor({state:'hidden',timeout:120000});
  await page.screenshot({path:`theme-${name}.png`,fullPage:true});
  const state=await page.evaluate(()=>({background:getComputedStyle(document.documentElement).backgroundColor,pink:getComputedStyle(document.querySelector('.star-icon>span')).color,star:document.querySelector('.star-icon svg').getAttribute('viewBox'),overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(state.background,'rgb(22, 24, 28)');assert.equal(state.pink,'rgb(234, 55, 122)');assert.equal(state.star,'0 0 576 512');assert.equal(state.overflow,false);
  assert.ok(await page.locator('#donut').evaluate(e=>e.style.background.includes('234, 55, 122')));
  await page.locator('#companyCountBtn').click();
  await page.locator('#developers button').first().focus();
  await page.locator('#hoverCard').waitFor({state:'visible'});
  assert.ok(await page.locator('#hoverList .rating-star').count());
  await page.screenshot({path:`theme-${name}-hover.png`});
  console.log(name,JSON.stringify(state),'rating previews and sorting passed');
 }
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
