const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let logoRequests=0;
  page.on('request',request=>{if(request.url().startsWith('https://images.igdb.com/'))logoRequests++});
  await page.route('http://localhost:4174/',route=>route.fulfill({contentType:'text/html',body:require('fs').readFileSync('dist/index.html','utf8')}));
  await page.goto('http://localhost:4174/');
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
  assert.equal(logoRequests,1,'one download across rerenders');
  assert.ok(await page.locator('.developer-logo').evaluate(img=>img.src.startsWith('blob:')),'display persistent cached image');
  await page.evaluate(()=>localStorage.setItem(metadataKey('/games/cached/'),JSON.stringify({year:2020,category:0,developers:['Remedy Entertainment'],developerLogos:{'Remedy Entertainment':'https://images.igdb.com/igdb/image/upload/t_logo_med/cl7m5.png'},genres:['Adventure'],publishers:[],publisherLogos:{},gameModes:[],playerPerspectives:['Third person'],themes:['Action'],franchises:['Alan Wake'],gameEngines:['Northlight'],plays:100,checked:true,savedAt:1})));
  await page.reload();
  let requested=[];
  await page.route('**/api/details?*',route=>{
    const paths=new URL(route.request().url()).searchParams.getAll('path');requested.push(...paths);
    return route.fulfill({json:{details:paths.map(path=>({path,developers:['New Studio'],genres:[],developerLogos:{},checked:true})),failed:0}});
  });
  await page.evaluate(async()=>{
    const cached=readMetadata('/games/cached/');
    if(!cached)throw Error('Existing metadata expired');
    games=[{path:'/games/cached/',title:'Cached',rating:4,played:true,...cached},{path:'/games/new/',title:'New',rating:4,played:true}];
    await loadDetails(games);companySort='count';render();
  });
  await page.waitForFunction(()=>document.querySelector('.developer-logo[src^="blob:"]')?.naturalWidth>0);
  assert.deepEqual(requested,['/games/new/'],'only uncached game metadata is requested');
  assert.equal(logoRequests,1,'reload reuses persistent logo without a network request');
  assert.deepEqual(errors,[]);await browser.close();console.log('Developer logos, sorting, and desktop/mobile checks passed');
})().catch(error=>{console.error(error);process.exit(1)});
