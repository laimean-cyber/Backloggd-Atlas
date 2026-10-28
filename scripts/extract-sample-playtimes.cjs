const fs=require('node:fs');
const {chromium}=require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/*',r=>r.abort());
  const html=fs.readFileSync(process.argv[2],'utf8');
  const result=await page.evaluate(html=>{
   const template=document.createElement('template');template.innerHTML=html;
   const root=template.content;
   return {entries:[...root.querySelectorAll('.col-cus-user-games')].flatMap(col=>{
    const card=col.querySelector('.game-cover'),link=card?.querySelector('a.cover-link');
    if(!link)return [];
    const path=new URL(link.getAttribute('href'),'https://backloggd.com').pathname;
    const text=col.querySelector('.avg-rating')?.textContent.trim()??null;
    return [{path,title:card.querySelector('img')?.alt,timeText:text}];
   }),pagination:[...root.querySelectorAll('#games_pagination')].map(e=>e.textContent.trim()),loaders:[...root.querySelectorAll('turbo-frame[src]')].map(e=>({id:e.id,src:e.getAttribute('src')}))};
  },html);
  fs.writeFileSync('data/laime-playtime-source-2026-10-28.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({count:result.entries.length,formats:[...new Set(result.entries.map(e=>e.timeText))].slice(-35),pagination:result.pagination,loaders:result.loaders},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
