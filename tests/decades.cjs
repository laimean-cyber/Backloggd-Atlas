const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const width of [1440,800,390,320]){
 const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>r.abort());
 await page.goto(process.env.TEST_BASE_URL||'http://localhost:4174');
 await page.locator('#decadesPanel').scrollIntoViewIfNeeded();
 await page.waitForTimeout(1500);
 assert.equal(await page.locator('#decadesPanel').evaluate(e=>e.previousElementSibling.querySelector('h2').textContent),'Games by release year');
 assert.equal(await page.locator('.decade-era h3').first().innerText(),'2020s');
 const picks=page.locator('.decade-row').first().locator('.decade-picks');
 const pickCount=await picks.locator('li').count();
 assert(pickCount>5);
 assert.equal(await picks.locator('.decade-rating .star-icon').count(),pickCount*5);
 assert(await picks.evaluate(e=>{e.scrollLeft=e.scrollWidth;const moved=e.scrollLeft>0;e.scrollLeft=0;return moved}),'Highlights scroll');
 if(width===1440)assert(await picks.evaluate(e=>Math.abs(e.children[4].getBoundingClientRect().right-e.getBoundingClientRect().right)<2),'Exactly five visible on desktop');
 assert.equal(await page.locator('.decade-era h3').first().evaluate(e=>getComputedStyle(e).color),'rgb(255, 87, 152)');
 assert(await page.locator('.decade-counts').first().evaluate(e=>e.children[1].getBoundingClientRect().top>e.children[0].getBoundingClientRect().top),'Counts must be stacked');
 assert(await page.locator('.decade-genre').first().evaluate(e=>{const bar=e.querySelector('.decade-genre-track'),fill=bar.firstElementChild,pct=parseInt(e.querySelector('.decade-genre-caption').lastElementChild.textContent);return Math.abs(fill.getBoundingClientRect().width/bar.getBoundingClientRect().width*100-pct)<1}),'Genre bar must match percentage');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow at '+width);
 await page.locator('#decadesPanel').screenshot({path:'.impeccable/review/decades-'+width+'.png'});
 const stats=await page.evaluate(()=>{
  const fixture=[{title:'A',year:2021,rating:5,developers:['Loved'],genres:['RPG']},{title:'B',year:2022,rating:4,developers:['Loved'],genres:['RPG']},{title:'C',year:2023,rating:3,developers:['Loved'],genres:['RPG']},...Array.from({length:4},(_,i)=>({title:'Other '+i,year:2020,developers:['Played']})),{title:'Old',year:1999,rating:2},{title:'Unknown',year:null,rating:1},{title:'Unplayed',year:2020,rating:5,played:false}];
  const data=decadeData(fixture);return {most:data.eras[0].most.name,fav:data.eras[0].favourite.name,top:data.eras[0].top.map(g=>g.title),years:data.eras.map(d=>d.year),baseline:data.baseline,dated:data.dated.length,empty:decadeData([]).eras[0].list.length};
 });
 assert.deepEqual(stats,{most:'Played',fav:'Loved',top:['A'],years:[2020,2010,2000,1990],baseline:3,dated:8,empty:0});
 assert.deepEqual(await page.evaluate(()=>decadeData(Array.from({length:8},(_,i)=>({title:String(i),year:2020,rating:i===7?4:i%2?4.5:5}))).eras[0].top.map(g=>g.rating)),[5,5,5,5,4.5,4.5,4.5]);
 assert.deepEqual(await page.evaluate(()=>decadeData([{title:'B',year:1990,rating:4},{title:'A',year:1991,rating:4},{title:'C',year:1992,rating:3.5},{title:'Unrated',year:1993}]).eras.find(d=>d.year===1990).top.map(g=>g.title)),['A','B']);
 assert.deepEqual(await page.evaluate(()=>decadeData([{title:'Unrated',year:2020}]).eras[0].top),[]);
 await page.locator('.decade-method summary').click();
 assert(await page.locator('.decade-method p').isVisible());
 assert.deepEqual(errors,[]);console.log(width+': placement, responsive layout, calculations, disclosure and runtime checks passed');
 await page.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
