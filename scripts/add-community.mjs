import { readFileSync, writeFileSync } from 'node:fs';
import { page as original } from '../dist/server/page.js';
let page = original;
const css = `
.community-halves{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}.community-half{min-width:0}.community-half+ .community-half{border-left:1px solid #353d4e;padding-left:28px}.community-half h3{font-size:1rem;margin:0 0 16px;font-weight:650}.community-table{width:100%;border-collapse:collapse;font-size:.875rem;font-variant-numeric:tabular-nums}.community-table th{color:#c4cbd1;font-size:.75rem;font-weight:500;text-align:right;padding:0 0 10px 10px;white-space:nowrap}.community-table th:first-child{text-align:left;padding-left:0}.community-table td{border-top:1px solid #353d4e;padding:12px 0 12px 10px;text-align:right;vertical-align:top;white-space:nowrap}.community-table td:first-child{text-align:left;padding-left:0;white-space:normal;overflow-wrap:anywhere}.community-table a{text-decoration:none;line-height:1.45}.community-table a:hover{text-decoration:underline;text-underline-offset:3px}.community-gap{color:#f7b1cc;font-weight:750}.community-less .community-gap{color:#bacbf4}.community-list{max-height:390px;overflow:auto;scrollbar-color:#596477 #242832;scrollbar-width:thin;padding-right:5px}.community-status{margin-bottom:0;font-size:.8125rem;color:#c4cbd1;line-height:1.5}.community-half .empty{font-size:.875rem;text-align:left;padding:20px 0}.community-panel .panel-head{margin-bottom:24px}@media(max-width:760px){.community-halves{grid-template-columns:1fr;gap:28px}.community-half+ .community-half{border-left:0;border-top:1px solid #353d4e;padding:24px 0 0}.community-table th{font-size:.75rem}.community-table td{padding-left:8px}}
`;
page = page.replace('</style>',css+'</style>');
const panel = `<section class="panel span2 community-panel" aria-labelledby="communityTitle"><div class="panel-head"><div><h2 id="communityTitle">You versus the community</h2><p class="panel-sub">Games you loved more—or less—than other players</p></div><button type="button" class="ghost" id="communityRetry" hidden>Retry averages</button></div><div class="community-halves"><div class="community-half"><h3>You rated higher</h3><div class="community-list" id="communityMore"></div></div><div class="community-half community-less"><h3>You rated lower</h3><div class="community-list" id="communityLess"></div></div><p class="community-status" id="communityStatus" role="status"></p></section>\n`;
page = page.replace('  <section class="panel span2 awards-panel"',panel+'  <section class="panel span2 awards-panel"');
const logic = `
  var communityBusy=false,communityResults=new Map(),communityAttempted=new Set();
  function communityEligible(){return games.filter(g=>isPlayed(g)&&Number.isFinite(g.rating)&&g.rating>0&&g.rating<=5)}
  function communityData(g){
    if(communityResults.has(g.path))return communityResults.get(g.path);
    if(Number.isFinite(g.communityFetchedAt)&&Date.now()-g.communityFetchedAt<86400000)return g;
    try{const cached=JSON.parse(localStorage.getItem('atlas-community-v1:'+g.path));if(cached&&Date.now()-cached.communityFetchedAt<86400000){communityResults.set(g.path,cached);return cached}}catch{}
    return null;
  }
  function renderCommunity(){
    const eligible=communityEligible(),compared=eligible.map(g=>({g,score:communityData(g)?.communityRating})).filter(x=>Number.isFinite(x.score)&&x.score>0&&x.score<=5).map(x=>({...x,gap:Math.round((x.g.rating-x.score)*100)/100}));
    for(const [id,positive] of [['communityMore',true],['communityLess',false]]){
      const list=compared.filter(x=>positive?x.gap>0:x.gap<0).sort((a,b)=>positive?b.gap-a.gap||a.g.title.localeCompare(b.g.title):a.gap-b.gap||a.g.title.localeCompare(b.g.title));
      $(id).innerHTML=list.length?'<table class="community-table"><thead><tr><th scope="col">Game</th><th scope="col">You</th><th scope="col">Backloggd</th><th scope="col">Gap</th></tr></thead><tbody>'+list.map(x=>'<tr><td>'+gameLink(x.g)+'</td><td>'+x.g.rating.toFixed(1)+'</td><td>'+x.score.toFixed(1)+'</td><td class="community-gap">'+(x.gap>0?'+':'−')+Math.abs(x.gap).toFixed(1)+'</td></tr>').join('')+'</tbody></table>':'<p class="empty">'+(!eligible.length?'Rate some played games to compare your scores.':!compared.length?'No community averages available yet.':positive?'No games rated above the community.':'No games rated below the community.')+'</p>';
    }
    const missing=eligible.filter(g=>!communityData(g));
    $('communityStatus').textContent=(communityBusy?'Loading Backloggd averages… ':'')+compared.length+' of '+eligible.length+' rated games compared · scores out of 5 · largest gaps first · equal ratings omitted.';
    $('communityRetry').hidden=communityBusy||!missing.some(g=>communityAttempted.has(g.path));
    if(!communityBusy&&missing.some(g=>g.path&&!communityAttempted.has(g.path)))queueMicrotask(loadCommunity);
  }
  async function loadCommunity(){
    if(communityBusy)return;
    const queue=communityEligible().filter(g=>/^\\/games\\/[a-z0-9-]+\\/$/.test(g.path)&&!communityData(g)&&!communityAttempted.has(g.path));
    if(!queue.length)return;
    communityBusy=true;renderCommunity();
    try{for(let i=0;i<queue.length;i+=4){
      if(!queue.some(g=>games.includes(g)))break;
      const batch=queue.slice(i,i+4);batch.forEach(g=>communityAttempted.add(g.path));
      const data=await api('/api/community?'+batch.map(g=>'path='+encodeURIComponent(g.path)).join('&'));
      for(const result of data.ratings||[]){if(result.failed)continue;communityResults.set(result.path,result);try{localStorage.setItem('atlas-community-v1:'+result.path,JSON.stringify(result))}catch{}}
      renderCommunity();
      if((data.ratings||[]).some(r=>r.failed)){queue.forEach(g=>communityAttempted.add(g.path));break}
    }}catch{queue.forEach(g=>communityAttempted.add(g.path))}finally{communityBusy=false;renderCommunity()}
  }
  $('communityRetry').addEventListener('click',()=>{communityAttempted.clear();loadCommunity()});
`;
// Initialize state before the first render, which occurs before some later declarations.
page = page.replace('  function render(){',logic+'\n  function render(){\n    renderCommunity();');
if(page===original||!page.includes('id="communityMore"'))throw Error('Insertion failed');
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
