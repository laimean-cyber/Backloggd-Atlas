const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage();let fixture=false,limited=false,calls=[];
await page.route('**/*',r=>{
 if(r.request().isNavigationRequest())return r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')});
 if(!r.request().url().includes('/api/community'))return r.abort();
 const paths=new URL(r.request().url()).searchParams.getAll('path');
 if(!fixture)return r.fulfill({json:{ratings:[{path:paths[0],failed:true,status:429}]}});
 calls.push(paths);
 return r.fulfill({json:{ratings:limited?[{path:paths[0],failed:true,status:429}]:paths.map(path=>path.endsWith('/test-a/')?{path,failed:true,status:404}:{path,communityRating:3,communityFetchedAt:Date.now()})}});
});
await page.goto('http://localhost:4174');await page.waitForFunction(()=>!communityBusy);
fixture=true;
await page.evaluate(()=>{communityResults.clear();communityAttempted.clear();communityPaused=false;games='abcdefgh'.split('').map(x=>({title:x,path:'/games/test-'+x+'/',rating:4,played:true}));render()});
await page.waitForFunction(()=>!communityBusy&&communityResults.size===7);
assert.equal(calls.length,2);assert((await page.locator('#communityStatus').textContent()).includes('7 of 8'));
calls=[];limited=true;
await page.evaluate(()=>{localStorage.clear();communityResults.clear();communityAttempted.clear();communityPaused=false;render()});
await page.waitForFunction(()=>communityPaused&&!communityBusy);assert.equal(calls.length,1);
assert.equal(await page.evaluate(()=>communityAttempted.size),1);
limited=false;await page.locator('#communityRetry').click();await page.waitForFunction(()=>!communityBusy&&communityResults.size===7);
assert.equal(calls.length,3);assert(await page.locator('#communityRetry').isVisible());
console.log('Passed: individual failures do not block later batches; rate limits pause without marking unfetched games; retry makes progress.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
