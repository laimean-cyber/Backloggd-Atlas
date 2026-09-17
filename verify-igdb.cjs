const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://atlas.test/',route=>route.fulfill({contentType:'text/html',body:require('fs').readFileSync('dist/index.html','utf8')}));
  await page.goto('http://atlas.test/');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.locator('#companyRatingBtn').click();
    await page.evaluate(()=>{games=Array.from({length:3},(_,i)=>({title:`Game ${i}`,year:2020,rating:4,played:true,developers:['Remedy Entertainment'],developerLogos:{'Remedy Entertainment':'https://images.igdb.com/igdb/image/upload/t_logo_med/cl7m5.png'},genres:['Adventure']}));render()});
    await page.waitForFunction(()=>{const img=document.querySelector('.developer-logo');return img&&!img.hidden&&img.naturalWidth>0});
    assert.equal(await page.locator('#companyTitle').textContent(),'Developers you rate highest');
    await page.locator('#companyCountBtn').click();
    assert.equal(await page.locator('#companyTitle').textContent(),'Developers you play most');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  assert.deepEqual(errors,[]);await browser.close();console.log('Developer logos, sorting, and desktop/mobile checks passed');
})().catch(error=>{console.error(error);process.exit(1)});
