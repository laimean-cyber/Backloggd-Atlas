import { readFile, writeFile } from 'node:fs/promises';
import { page } from '../dist/server/page.js';

const style = `.critics-panel .community-dot.critic,.critics-panel .community-point.backloggd.critic{background:#8ab7e8}.critics-panel .community-gap{color:#b5d4f3}.critics-panel .community-less .community-gap{color:#f7b1cc}.critics-panel .community-list{scrollbar-color:#8ab7e8 #242832}.critics-panel .community-list::-webkit-scrollbar-thumb{background:#8ab7e8}.critics-panel .community-list::-webkit-scrollbar-thumb:hover{background:#b5d4f3}.critics-panel .community-table a:focus-visible{outline:2px solid #eef0f2;outline-offset:3px}`;
const panel = `<section class="panel span2 community-panel critics-panel" aria-labelledby="criticsTitle"><div class="panel-head"><div><h2 id="criticsTitle">You versus the critics</h2><div class="community-explanation"><p class="panel-sub">Games you rated higher—or lower—than critics on Metacritic</p><div class="community-legend" aria-label="Rating colors"><span><i class="community-dot backloggd critic" aria-hidden="true"></i>Critics</span><span><svg class="rating-star" viewBox="0 0 576 512" aria-hidden="true"><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"/></svg>You</span></div></div></div><button type="button" class="ghost" id="criticsRetry" hidden>Retry critic scores</button></div><div class="community-halves"><div class="community-half"><h3>You rated higher</h3><div class="community-list" id="criticsMore"></div></div><div class="community-half community-less"><h3>You rated lower</h3><div class="community-list" id="criticsLess"></div></div><p class="community-status" id="criticsStatus" role="status"></p></section>`;
const logic = `  var criticsPaused=false,criticsError='',criticsBusy=false,criticsResults=new Map(),criticsAttempted=new Set();
  function criticsEligible(){return games.filter(g=>isPlayed(g)&&Number.isFinite(g.rating)&&g.rating>0&&g.rating<=5)}
  function criticData(g){
    const candidates=[g,criticsResults.get(g.path)];
    try{candidates.push(JSON.parse(localStorage.getItem('atlas-critics-v1:'+g.path)))}catch{}
    return candidates.filter(x=>x&&Number.isFinite(x.criticFetchedAt)&&Object.hasOwn(x,'criticRating')).sort((a,b)=>b.criticFetchedAt-a.criticFetchedAt)[0]||null;
  }
  function criticsNeedsRefresh(g){const data=criticData(g);return !data||Date.now()-data.criticFetchedAt>=86400000}
  function renderCritics(){
    const eligible=criticsEligible(),compared=eligible.map(g=>({g,data:criticData(g)})).filter(x=>Number.isFinite(x.data?.criticRating)&&x.data.criticRating>=0&&x.data.criticRating<=5&&/^https:\\/\\/www\\.metacritic\\.com\\/game\\/[a-z0-9-]+\\/$/.test(x.data.url)).map(x=>({...x,score:x.data.criticRating,gap:Math.round((x.g.rating-x.data.criticRating)*100)/100}));
    for(const [id,positive] of [['criticsMore',true],['criticsLess',false]]){
      const list=compared.filter(x=>positive?x.gap>0:x.gap<0).sort((a,b)=>positive?b.gap-a.gap||a.g.title.localeCompare(b.g.title):a.gap-b.gap||a.g.title.localeCompare(b.g.title));
      $(id).innerHTML=list.length?'<table class="community-table"><thead><tr><th scope="col">Game</th><th scope="col"><span class="community-axis-label">Rating / 5</span><span class="community-axis" aria-hidden="true">'+[0,1,2,3,4,5].map(n=>'<span>'+n+'</span>').join('')+'</span></th><th scope="col">Gap</th></tr></thead><tbody>'+list.map(x=>{const description='You: '+x.g.rating.toFixed(2)+'; critics: '+x.score.toFixed(2)+' ('+x.data.metascore+'/100); gap: '+(x.gap>0?'+':'')+x.gap.toFixed(2);return '<tr><td><a href="'+esc(x.data.url)+'" target="_blank" rel="noopener noreferrer" title="View Metacritic score">'+esc(x.g.title)+' ↗</a></td><td><div class="community-track" tabindex="0" role="img" aria-label="'+esc(x.g.title+'. '+description)+'" title="'+esc(description)+'"><span class="community-connector" style="left:'+Math.min(x.g.rating,x.score)/5*100+'%;width:'+Math.abs(x.g.rating-x.score)/5*100+'%"></span><span class="community-point backloggd critic" style="left:'+x.score/5*100+'%"></span><span class="community-point" style="left:'+x.g.rating/5*100+'%">'+inlineStar+'</span></div></td><td class="community-gap">'+(x.gap>0?'+':'−')+Math.abs(x.gap).toFixed(2)+'</td></tr>'}).join('')+'</tbody></table>':'<p class="empty">'+(!eligible.length?'Rate some played games to compare your scores.':!compared.length?'No Metacritic scores available yet.':positive?'No games rated above the critics.':'No games rated below the critics.')+'</p>';
    }
    const missing=eligible.filter(criticsNeedsRefresh);
    $('criticsStatus').textContent=(criticsBusy?'Loading Metacritic scores… ':criticsError?criticsError+' ':'')+compared.length+' of '+eligible.length+' rated games compared · main game Metascore ÷ 20 · scores out of 5 · largest gaps first · equal ratings omitted.';
    $('criticsRetry').hidden=criticsBusy||!missing.length;
    if(!criticsBusy&&!criticsPaused&&!metadataLoading&&missing.some(g=>g.path&&!criticsAttempted.has(g.path)))queueMicrotask(loadCritics);
  }
  async function loadCritics(){
    if(criticsBusy||metadataLoading)return;
    const queue=criticsEligible().filter(g=>/^\\/games\\/[a-z0-9-]+\\/$/.test(g.path)&&criticsNeedsRefresh(g)&&!criticsAttempted.has(g.path));
    if(!queue.length)return;
    criticsBusy=true;criticsError='';renderCritics();
    try{for(let i=0;i<queue.length;i+=4){
      if(!queue.some(g=>games.includes(g)))break;
      const batch=queue.slice(i,i+4);
      const data=await api('/api/critics?'+batch.map(g=>'path='+encodeURIComponent(g.path)+'&title='+encodeURIComponent(g.title)).join('&'));
      if(!Array.isArray(data.ratings))throw Error('Could not read the critic scores response.');
      for(const g of batch){
        const result=data.ratings.find(r=>r.path===g.path);
        if(!result)continue;
        criticsAttempted.add(g.path);
        if(result.failed){criticsError='Some critic scores could not be loaded; other games are still included.';continue}
        criticsResults.set(result.path,result);try{localStorage.setItem('atlas-critics-v1:'+result.path,JSON.stringify(result))}catch{}
      }
      renderCritics();
      if(data.ratings.some(r=>r.status===429||r.status===403)){
        criticsPaused=true;criticsError='Metacritic is limiting requests. Wait a moment, then retry the remaining scores.';break;
      }
      batch.forEach(g=>criticsAttempted.add(g.path));
      if(i+4<queue.length)await new Promise(resolve=>setTimeout(resolve,350));
    }}catch(error){criticsPaused=true;criticsError=error.message||'Could not load critic scores. Retry to continue.'}finally{criticsBusy=false;renderCritics()}
  }
  $('criticsRetry').addEventListener('click',()=>{criticsAttempted.clear();criticsPaused=false;criticsError='';loadCritics()});

`;

function update(html) {
  if (html.includes('id="criticsTitle"')) return html.includes(style) ? html : html.replace('</style>', style + '</style>');
  if (!html.includes('  <section class="panel span2 awards-panel"')) throw Error('Awards panel not found.');
  html = html.replace('</style>', style + '</style>');
  html = html.replace(/(<section class="panel span2 awards-panel"[^\n]*<\/section>)/, '$1\n  ' + panel);
  html = html.replace('  var communityPaused=', logic + '  var communityPaused=');
  html = html.replace('  function render(){', '  function render(){\n    renderCritics();');
  return html;
}

const file = new URL('../dist/index.html', import.meta.url);
await writeFile(file, update(await readFile(file, 'utf8')), 'utf8');
await writeFile(new URL('../dist/server/page.js', import.meta.url), 'export const page = ' + JSON.stringify(update(page)) + ';\n', 'utf8');
