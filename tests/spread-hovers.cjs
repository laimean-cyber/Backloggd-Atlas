const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8')}):r.abort());
await page.goto('http://localhost:4174');
await page.evaluate(()=>{games=[{title:'Alpha',path:'/games/alpha/',rating:5,playerPerspectives:['First person'],gameModes:['Single player']},{title:'Beta',rating:null,playerPerspectives:['First person'],gameModes:['Single player','Multiplayer']},{title:'Excluded',rating:5,played:false,playerPerspectives:['First person'],gameModes:['Single player']}];render()});
for(const [selector,count] of [['#perspectiveTreemap button',2],['#legend button',1],['#modeLegend button[data-key="Single player"]',2]]){
const trigger=page.locator(selector).first();await trigger.hover();assert.equal(await page.locator('#hoverList .hover-game').count(),count);assert(await page.locator('#hoverCard').isVisible());
await trigger.focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.closest('#hoverList')!==null),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#hoverCard').isVisible(),false);
await trigger.click();assert(await page.locator('#hoverCard').isVisible());
const box=await page.locator('#hoverCard').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
await page.screenshot({path:`spread-hover-${width}-${count}-${selector.includes('mode')?'mode':selector.includes('legend')?'rating':'perspective'}.png`});await page.keyboard.press('Escape');}
assert.deepEqual(errors,[]);await page.close();}
console.log('Passed spread previews: correct games, played filter, hover, keyboard, click, desktop/mobile bounds.');}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
