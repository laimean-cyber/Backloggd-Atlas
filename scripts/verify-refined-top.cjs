const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const width of [1440,1024,850,390,320]){
 const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.abort());
 await page.goto('http://localhost:4174');
 assert.equal(await page.locator('#title').innerText(),"Laime's gaming journey in numbers");
 assert.equal(await page.locator('.passport-pick').count(),4);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow at '+width);
 await page.locator('.profile-availability summary').click();
 assert(await page.locator('.profile-availability p').isVisible());
 await page.locator('.profile-availability summary').click();
 await page.locator('#reset').click();
 await page.screenshot({path:'.impeccable/review/top-after-'+width+'.png'});
 await page.locator('#title').evaluate(e=>e.textContent="AReallyLongBackloggdNickname's gaming journey in numbers");
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Long title overflow at '+width);
 assert.deepEqual(errors,[]);
 console.log(width+': no overflow or JS errors; notice and sample controls work.');
 await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
