const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const {passportVoices,passportDescription}=await import('../scripts/passport-description.mjs');
  const names=[...Object.keys(passportVoices),'Unlisted genre'];
  const descriptions=new Set(['An unwritten legend']);
  for(const a of names)for(const b of names)descriptions.add(passportDescription([{name:a,count:20,rating:5,ratedCount:20},{name:b,count:20,rating:4,ratedCount:20}],100).text);
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const p=await browser.newPage();
    await p.route('**/api/**',route=>route.fulfill({json:{favourites:[],details:[],ratings:[],scores:[]}}));
    await p.goto('http://localhost:4174/');
    await p.locator('.passport-archetype').waitFor();
    await p.evaluate(()=>document.fonts.ready);
    for(const width of [320,375,390,480,768,850,851,1024,1100,1101,1280,1440,1920]){
      await p.setViewportSize({width,height:1000});
      const bad=await p.evaluate(texts=>{
        const el=document.querySelector('.passport-archetype'), failures=[];
        for(const text of texts){
          el.textContent=text;
          const range=document.createRange();range.selectNodeContents(el);
          const r=range.getBoundingClientRect(),box=el.getBoundingClientRect();
          if(el.scrollWidth>el.clientWidth+1||range.getClientRects().length>1||r.right>box.right+1)failures.push(text);
        }
        el.textContent='Spellbound Deadeye';
        return failures;
      },[...descriptions]);
      assert.deepEqual(bad,[],`Overflow at ${width}px`);
      if(width===390||width===1440){
        await p.locator('#gamingPassport').screenshot({path:`.impeccable/review/html-import/passport-${width}.png`});
      }
    }
    console.log(`All ${descriptions.size} descriptions fit on one line at 13 viewport widths (320–1920px).`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
