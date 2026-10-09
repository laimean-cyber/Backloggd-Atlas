const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('**/api/**',r=>r.abort());await page.goto(process.env.TEST_BASE_URL||'http://localhost:4174');
 const strip=page.locator('.decade-picks').first();await strip.scrollIntoViewIfNeeded();
 const geometry=await strip.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,gutter:e.offsetHeight-e.clientHeight,client:e.clientWidth,total:e.scrollWidth}});
 console.log(geometry);
 await strip.screenshot({path:'.impeccable/review/decade-scrollbar.png'});
 const y=geometry.y+geometry.height-geometry.gutter/2;
 const thumbWidth=geometry.client/geometry.total*geometry.client;
 await page.mouse.move(geometry.x+thumbWidth/2,y);await page.mouse.down();await page.mouse.move(geometry.x+thumbWidth/2+180,y,{steps:12});await page.mouse.up();
 await page.waitForTimeout(300);
 const position=await strip.evaluate(e=>e.scrollLeft);console.log({position});
 assert(geometry.gutter>0&&geometry.gutter<=10,'Scrollbar should use the restored thin track');
 assert(position>100,'Dragging the visible scrollbar center must scroll');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
