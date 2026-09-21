import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
// Retain the last known average while refresh is unavailable; age controls
// refreshing, not whether a real previously retrieved score can be displayed.
const dataStart=page.indexOf('  function communityData(g){'),dataEnd=page.indexOf('  function renderCommunity(){',dataStart);
page=page.slice(0,dataStart)+`  function communityData(g){
    const candidates=[g,communityResults.get(g.path)];
    try{candidates.push(JSON.parse(localStorage.getItem('atlas-community-v1:'+g.path)))}catch{}
    return candidates.filter(x=>x&&Number.isFinite(x.communityFetchedAt)&&Object.hasOwn(x,'communityRating')).sort((a,b)=>b.communityFetchedAt-a.communityFetchedAt)[0]||null;
  }
  function communityNeedsRefresh(g){const data=communityData(g);return !data||Date.now()-data.communityFetchedAt>=86400000}
`+page.slice(dataEnd);
page=page.replaceAll('eligible.filter(g=>!communityData(g))','eligible.filter(communityNeedsRefresh)');
page=page.replace('var communityBusy=false,','var communityPaused=false,communityError="",communityBusy=false,');
page=page.replace("(communityBusy?'Loading Backloggd averages… ':'')+compared.length", "(communityBusy?'Loading Backloggd averages… ':communityError?communityError+' ':'')+compared.length");
page=page.replace("communityBusy||!missing.some(g=>communityAttempted.has(g.path))", "communityBusy||!missing.length");
page=page.replace("if(!communityBusy&&missing.some", "if(!communityBusy&&!communityPaused&&missing.some");
const start=page.indexOf('  async function loadCommunity(){'),end=page.indexOf('\n\n',page.indexOf("$('communityRetry').addEventListener",start));
page=page.slice(0,start)+`  async function loadCommunity(){
    if(communityBusy)return;
    const queue=communityEligible().filter(g=>/^\\/games\\/[a-z0-9-]+\\/$/.test(g.path)&&communityNeedsRefresh(g)&&!communityAttempted.has(g.path));
    if(!queue.length)return;
    communityBusy=true;communityError='';renderCommunity();
    try{for(let i=0;i<queue.length;i+=4){
      if(!queue.some(g=>games.includes(g)))break;
      const batch=queue.slice(i,i+4);
      const data=await api('/api/community?'+batch.map(g=>'path='+encodeURIComponent(g.path)).join('&'));
      if(!Array.isArray(data.ratings))throw Error('Could not read the averages response.');
      for(const g of batch){
        const result=data.ratings.find(r=>r.path===g.path);
        if(!result)continue;
        communityAttempted.add(g.path);
        if(result.failed){communityError='Some game averages could not be loaded; other games are still included.';continue}
        communityResults.set(result.path,result);try{localStorage.setItem('atlas-community-v1:'+result.path,JSON.stringify(result))}catch{}
      }
      renderCommunity();
      if(data.ratings.some(r=>r.status===429||r.status===403)){
        communityPaused=true;communityError='Backloggd is limiting requests. Wait a moment, then retry the remaining averages.';break;
      }
      // Keep game-specific failures from blocking the rest of the library.
      batch.forEach(g=>communityAttempted.add(g.path));
      if(i+4<queue.length)await new Promise(resolve=>setTimeout(resolve,350));
    }}catch(error){communityPaused=true;communityError=error.message||'Could not load averages. Retry to continue.'}finally{communityBusy=false;renderCommunity()}
  }
  $('communityRetry').addEventListener('click',()=>{communityAttempted.clear();communityPaused=false;communityError='';loadCommunity()});`+page.slice(end);
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
