import {readFileSync,writeFileSync} from 'node:fs';
import {page} from '../dist/server/page.js';
let html=page;
html=html.replace("let yearSort='year'","let yearView='mix',yearSort='year'");
html=html.replace('<div class="explorer-controls"><label>Sort years', '<div class="explorer-controls"><div class="seg" role="group" aria-label="Release-year explorer view"><button type="button" id="yearMixBtn" class="active" aria-pressed="true">Rating mix</button><button type="button" id="yearListBtn" aria-pressed="false">Year list</button></div><label>Sort years');
html=html.replace('<div class="explorer-head"><span>Year</span>', '<div id="yearMixLegend" class="year-mix-legend" aria-label="Ratings out of 5"></div><div id="yearListHead" class="explorer-head" hidden><span>Year</span>');
html=html.replace('  </style>', `
  .year-mix-legend{display:flex;flex-wrap:wrap;gap:8px 12px;margin:0 0 18px;font-size:.75rem;color:#eadde3}.year-mix-legend span{display:inline-flex;align-items:center;gap:5px}.year-mix-legend i{width:12px;height:12px;border-radius:2px;background:var(--mix-color)}
  .year-mix-row{display:block;width:100%;border:0;background:transparent;color:#eef0f2;text-align:left;padding:4px 4px 14px;border-radius:5px}.year-mix-row:hover{background:#302631}.year-mix-row:focus-visible{outline:2px solid #f276a4;outline-offset:-2px}.year-mix-label{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;font-size:.875rem;font-variant-numeric:tabular-nums}.year-mix-label small{font-size:.75rem;color:#c4cbd1}.year-mix-bar{display:flex;height:30px;width:100%;overflow:hidden;border-radius:3px}.year-mix-segment{display:flex;align-items:center;justify-content:center;background:var(--mix-color);color:var(--mix-ink);font-size:.75rem;font-weight:700;min-width:0;font-variant-numeric:tabular-nums}.year-mix-segment b{overflow:hidden;white-space:nowrap;font-weight:inherit}.year-mix-legend[hidden],#yearListHead[hidden]{display:none}
  </style>`);
const at="    $('yearRows').innerHTML=sortedYears.length?";
html=html.replace(at,`    $('yearMixLegend').hidden=yearView!=='mix';$('yearListHead').hidden=yearView==='mix';
    if(yearView==='mix'){renderYearMix(sortedYears)}else{
${at}`);
html=html.replace("    if(genreSort==='plot')", "    }\n    if(genreSort==='plot')");
html=html.replace("  $('yearSort').addEventListener",`  const yearMixColors=['#fde4ef','#fac7dd','#f7a4c8','#f47db1','#ed5596','#db307b','#b91f63','#94174f','#711139','#500d29','#584651'];
  function renderYearMix(years){
    const labels=Array.from({length:10},(_,i)=>((i+1)/2).toFixed(1)+' / 5').concat('Unrated');
    $('yearSubtitle').textContent='Share of played games at each rating · each year totals 100%';
    $('yearMixLegend').innerHTML=labels.map((label,i)=>'<span><i style="--mix-color:'+yearMixColors[i]+'"></i>'+label+'</span>').join('');
    $('yearRows').innerHTML=years.length?years.map(year=>{
      const counts=Array(11).fill(0);year.list.forEach(g=>{const index=Number.isFinite(g.rating)&&g.rating>0&&g.rating<=5?Math.max(0,Math.min(9,Math.round(g.rating*2)-1)):10;counts[index]++});
      const percentages=counts.map(n=>n/year.count*100),rounded=percentages.map(Math.floor);let remaining=100-rounded.reduce((a,b)=>a+b,0);
      percentages.map((n,i)=>({i,f:n-rounded[i]})).sort((a,b)=>b.f-a.f).slice(0,remaining).forEach(x=>rounded[x.i]++);
      const summary=counts.map((n,i)=>n?labels[i]+': '+n+' games ('+percentages[i].toFixed(1)+'%)':'').filter(Boolean).join('; ');
      return '<button type="button" class="year-mix-row drill" data-kind="year" data-key="'+esc(year.name)+'" aria-describedby="hoverCard" aria-label="'+esc(year.name+': '+summary)+'"><span class="year-mix-label"><strong>'+esc(year.name)+'</strong><small>'+year.count+' games</small></span><span class="year-mix-bar">'+counts.map((n,i)=>n?'<span class="year-mix-segment" style="width:'+percentages[i]+'%;--mix-color:'+yearMixColors[i]+';--mix-ink:'+(i<5?'#321020':'#fff0f7')+'" title="'+esc(labels[i]+': '+n+' games · '+percentages[i].toFixed(1)+'%')+'"><b>'+(percentages[i]>=9?rounded[i]+'%':'')+'</b></span>':'').join('')+'</span></button>';
    }).join(''):'<div class="empty">No release years in this library.</div>';
  }
  for(const [id,view] of [['yearMixBtn','mix'],['yearListBtn','list']])$(id).addEventListener('click',()=>{yearView=view;for(const [button,value] of [['yearMixBtn','mix'],['yearListBtn','list']]){$(button).classList.toggle('active',value===view);$(button).setAttribute('aria-pressed',String(value===view))}render()});
  $('yearSort').addEventListener`);
// The initial render runs before the event bindings; hoist the palette with the state.
html=html.replace("  const yearMixColors=", "  var yearMixColors=");
const palette=html.match(/  var yearMixColors=.*?;\n/)[0];html=html.replace(palette,'').replace("  let yearView=",palette+"  let yearView=");
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
writeFileSync('dist/index.html',html);writeFileSync('public/index.html',html);
