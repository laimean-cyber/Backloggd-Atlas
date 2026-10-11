const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:1000}});
  await p.route('**/api/**',r=>r.fulfill({json:{favourites:[],details:[],ratings:[],scores:[]}}));
  await p.goto('http://localhost:4174/');
  const files=process.argv.slice(2);
  assert.ok(files.length,'Pass saved Backloggd HTML file paths to test avatar recovery.');
  for(const file of files){
   const html=fs.readFileSync(file,'utf8');
   const user=await p.evaluate(html=>parseSavedBackloggdHtml(html).username,html);
   await p.evaluate(({html,user})=>{const parsed=parseSavedBackloggdHtml(html);activeUsername=user;activeHtmlImport={avatar:parsed.avatar};renderPassport();},{html,user});
   await p.waitForFunction(()=>{const img=document.querySelector('.passport-seal img');return img&&img.complete&&img.naturalWidth>0;},null,{timeout:15000});
   const src=await p.locator('.passport-seal img').getAttribute('src');
   assert.match(src,/https:\/\/backloggd-(?:s3|avatars)\.b-cdn\.net\//);
   console.log(user+': decoded avatar from '+src);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
