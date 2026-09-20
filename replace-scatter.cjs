const fs=require('fs');
let html=fs.readFileSync('dist/index.html','utf8');
const section=`<section class="panel span2 taste-panel" aria-labelledby="tasteTitle"><div class="panel-head"><div><h2 id="tasteTitle">Your taste vs. popularity</h2><p class="panel-sub" id="tasteSummary"></p></div></div><div class="taste-filters"><label>Genre<select id="tasteGenre"><option value="">All genres</option></select></label><label>Release period<select id="tastePeriod"><option value="">All years</option></select></label><label>Game type<select id="tasteType"><option value="">All types</option></select></label></div><div id="tastePlot"></div><p class="panel-sub" id="tasteMedians"></p><div id="tasteDetails" class="taste-details" aria-live="polite">Hover, focus or tap a dot to explore its games.</div><p class="panel-sub">Plays measure activity on Backloggd, not worldwide sales. Dashed lines mark medians within the filtered games.</p></section>`;
html=html.replace(/<section class="panel span2 playtime-panel"[\s\S]*?<\/section>/,section);
html=html.replace(/\.playtime-scroll\{[\s\S]*?\.playtime-grid\{[^}]*\}/,'');
html=html.replace('</style>',`.taste-filters{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:22px}.taste-filters label{display:grid;gap:7px;color:#c4cbd1;font-size:14px}.taste-filters select{font:inherit;background:#16181c;color:#eef0f2;border:1px solid #566075;border-radius:7px;padding:9px 30px 9px 10px;max-width:100%}.taste-filters select:focus-visible{outline:2px solid #ea377a;outline-offset:3px}#tastePlot svg{display:block;width:100%;height:auto;overflow:visible}.taste-axis{fill:#c4cbd1;font-size:14px;font-variant-numeric:tabular-nums}.taste-grid{stroke:#353d4e;stroke-width:1}.taste-median{stroke:#a3acb5;stroke-dasharray:5 6;stroke-width:1}.taste-dot{fill:#ea377a;fill-opacity:.55;stroke:#242832;stroke-width:1;cursor:pointer}.taste-dot:hover,.taste-dot:focus{fill-opacity:1;stroke:#fff;stroke-width:2;outline:none}.taste-details{margin:16px 0;padding:14px 0;border-top:1px solid #353d4e;border-bottom:1px solid #353d4e;font-size:14px;line-height:1.6;max-height:180px;overflow:auto}.taste-details strong{color:#eef0f2}.taste-details p{margin:0 0 8px}.taste-details p:last-child{margin-bottom:0}@media(max-width:600px){.taste-filters{gap:10px}.taste-filters label{flex:1 1 120px;min-width:0}.taste-panel{padding:18px}.taste-axis{font-size:13px}}</style>`);
const fn=String.raw`  function renderTaste(played){
    const genre=$('tasteGenre'),period=$('tastePeriod'),type=$('tasteType');
    const eligible=played.filter(g=>Number.isFinite(g.rating)&&g.rating>0&&g.rating<=5&&Number.isFinite(g.plays)&&g.plays>0);
    const decade=g=>Number.isInteger(g.year)?Math.floor(g.year/10)*10:null;
    const gameType=g=>normalizedGameType(g)||'unspecified';
    const options=(el,values,all,label=x=>x)=>{const previous=el.value;el.innerHTML='<option value="">'+all+'</option>'+values.map(v=>'<option value="'+esc(String(v))+'">'+esc(label(v))+'</option>').join('');if(values.map(String).includes(previous))el.value=previous};
    options(genre,[...new Set(eligible.flatMap(genresFor))].sort(),'All genres');
    options(period,[...new Set(eligible.map(decade).filter(x=>x!==null))].sort((a,b)=>a-b),'All years',v=>v+'–'+(v+9));
    options(type,[...new Set(eligible.map(gameType))].sort(),'All types',v=>v==='unspecified'?'Unspecified':v.charAt(0).toUpperCase()+v.slice(1));
    for(const el of [genre,period,type])el.onchange=()=>renderTaste(played);
    const data=eligible.filter(g=>(!genre.value||genresFor(g).includes(genre.value))&&(!period.value||decade(g)===+period.value)&&(!type.value||gameType(g)===type.value));
    $('tasteSummary').textContent=data.length+' of '+played.length+' library games shown · '+eligible.length+' have a rating and positive play count';
    $('tasteDetails').textContent='Hover, focus or tap a dot to explore its games.';
    if(!data.length){$('tastePlot').innerHTML='<div class="empty">No rated games with play counts match these filters.</div>';$('tasteMedians').textContent='';return}
    const width=Math.max(300,Math.round($('tastePlot').getBoundingClientRect().width)),height=width<600?360:420,left=38,right=width-20,top=35,bottom=height-64;
    const minLog=Math.floor(Math.log10(Math.min(...data.map(g=>g.plays)))),maxLog=Math.max(minLog+1,Math.ceil(Math.log10(Math.max(...data.map(g=>g.plays)))));
    const x=n=>left+8+(Math.log10(n)-minLog)/(maxLog-minLog)*(right-left-16),y=n=>bottom-n/5*(bottom-top);
    const median=values=>{values.sort((a,b)=>a-b);const m=Math.floor(values.length/2);return values.length%2?values[m]:(values[m-1]+values[m])/2};
    const mp=median(data.map(g=>g.plays)),mr=median(data.map(g=>g.rating));
    const short=n=>Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(n);
    $('tasteMedians').textContent='Median: '+mp.toLocaleString()+' plays · '+mr.toLocaleString()+'/5 rating. Upper left: lesser-known favourites. Upper right: popular favourites.';
    let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" aria-labelledby="tasteTitle"><g class="taste-axis">';
    for(let r=0;r<=5;r++)svg+='<line class="taste-grid" x1="'+left+'" x2="'+right+'" y1="'+y(r)+'" y2="'+y(r)+'"/><text x="'+(left-12)+'" y="'+(y(r)+5)+'" text-anchor="end">'+r+'</text>';
    const tickStep=width<500?Math.max(1,Math.ceil((maxLog-minLog)/3)):1;
    for(let p=minLog;p<=maxLog;p++){if((p-minLog)%tickStep&&p!==maxLog)continue;svg+='<text text-anchor="middle" x="'+x(10**p)+'" y="'+(bottom+26)+'">'+short(10**p)+'</text>'}
    svg+='<text x="'+left+'" y="17">Your rating / 5</text><text text-anchor="middle" x="'+((left+right)/2)+'" y="'+(height-8)+'">Backloggd plays · log scale</text></g><line class="taste-median" x1="'+x(mp)+'" x2="'+x(mp)+'" y1="'+top+'" y2="'+bottom+'"/><line class="taste-median" x1="'+left+'" x2="'+right+'" y1="'+y(mr)+'" y2="'+y(mr)+'"/>';
    svg+=data.map((g,i)=>'<circle class="taste-dot" data-index="'+i+'" tabindex="0" role="button" aria-label="'+esc(g.title+', '+g.rating+' out of 5, '+g.plays.toLocaleString()+' Backloggd plays. Show nearby games.')+'" cx="'+x(g.plays)+'" cy="'+y(g.rating)+'" r="5"/>').join('');
    $('tastePlot').innerHTML=svg+'</svg>';
    const show=i=>{const g=data[i],near=data.filter(h=>Math.hypot(x(h.plays)-x(g.plays),y(h.rating)-y(g.rating))<=12).sort((a,b)=>a.title.localeCompare(b.title));$('tasteDetails').innerHTML=near.map(h=>'<p><strong>'+esc(h.title)+'</strong> · '+h.rating+'/5 · '+h.plays.toLocaleString()+' plays'+(h.year?' · '+h.year:'')+'</p>').join('')};
    for(const dot of $('tastePlot').querySelectorAll('.taste-dot')){dot.onmouseenter=dot.onfocus=dot.onclick=()=>show(+dot.dataset.index);dot.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(+dot.dataset.index)}}}
  }
  let tasteResizeTimer;window.addEventListener('resize',()=>{clearTimeout(tasteResizeTimer);tasteResizeTimer=setTimeout(()=>renderTaste(games.filter(isPlayed)),150)});
`;
html=html.replace(/  function renderPlaytime\(played\)\{[\s\S]*?(?=  function render\(\))/,fn).replace('renderPlaytime(played);','renderTaste(played);');
fs.writeFileSync('dist/index.html',html);fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
