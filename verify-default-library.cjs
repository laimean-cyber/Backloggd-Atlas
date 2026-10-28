const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const html=fs.readFileSync('dist/index.html','utf8');
 assert.equal((await import('./dist/server/page.js')).page,html);
 const library=JSON.parse(fs.readFileSync('laime-audit.json','utf8'));
 const favourites=JSON.parse(fs.readFileSync('favourites-fixture.json','utf8'));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Hold background API refreshes pending: this check verifies the bundled snapshot.
 await page.route('http://localhost:4174/**',r=>{
  const url=new URL(r.request().url());
  if(url.pathname==='/api/favourites')return r.fulfill({json:{favourites}});
  if(url.pathname.startsWith('/api/'))return;
  return r.fulfill({contentType:'text/html',body:html});
 });
 await page.goto('http://localhost:4174');await page.locator('.favourites-grid').waitFor();
 assert.deepEqual(await page.evaluate(()=>games),library);
 assert.equal(await page.locator('#sourceLabel').textContent(),"Laime's library");
 assert.equal(await page.locator('#username').inputValue(),'Laime');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 await page.evaluate(()=>{games=[{title:'Temporary game',rating:4,played:true}];render()});
 assert.equal(await page.evaluate(()=>games.length),1);
 await page.locator('#reset').click();
 assert.deepEqual(await page.evaluate(()=>games),library);
 assert.equal(await page.evaluate(()=>activeUsername),'Laime');
 assert.equal(new URL(page.url()).searchParams.has('profile'),false);
 assert.deepEqual(errors,[]);
 await browser.close();console.log(`Passed: ${library.length} real default games, source parity, favourites, sample reset, desktop/mobile layout, no script errors.`);
})().catch(e=>{console.error(e);process.exit(1)});
