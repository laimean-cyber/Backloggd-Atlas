import fs from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
const css=`
.era-panel .panel-head{flex-wrap:wrap}.era-panel .seg button{font-size:14px}.era-scroll{overflow-x:auto;scrollbar-color:#a13b64 #16181c}.era-table{width:100%;border-spacing:5px;table-layout:fixed;min-width:620px;font-size:14px}.era-table caption{text-align:left;color:#c4cbd1;margin-bottom:12px;line-height:1.5}.era-table th{font-weight:600;color:#c4cbd1;padding:8px 4px;text-align:center}.era-table th:first-child{width:180px;text-align:left}.era-table th small{display:block;font-size:12px;font-weight:400;color:#a3acb5;margin-top:3px}.era-table td{padding:0}.era-cell{width:100%;min-height:40px;position:relative;border:1px solid transparent;border-radius:5px;color:#fff0f7;background:var(--era-color,#1b1e25);font-size:14px;font-weight:650;font-variant-numeric:tabular-nums;cursor:pointer}.era-cell:hover,.era-cell:focus-visible{outline:2px solid #fff0f7;outline-offset:1px}.era-cell.is-sparse{border:1px dashed #f5adca}.era-cell.is-empty{color:#a3acb5;background:#1b1e25;cursor:default}.era-key{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:15px;font-size:14px;color:#c4cbd1}.era-ramp{display:flex;gap:3px}.era-ramp i{width:23px;height:12px;border-radius:2px}.era-sparse-key{border:1px dashed #f5adca;width:23px;height:16px;border-radius:3px;margin-left:12px}.era-details{font-size:14px;line-height:1.5;color:#eef0f2;margin:16px 0 0;min-height:42px}.era-panel .foot{font-size:14px;margin-top:10px}.era-scroll:focus-visible{outline:2px solid #f276a4;outline-offset:3px}@media(max-width:650px){.era-table{min-width:580px}.era-table th:first-child{width:150px}.era-panel .panel-head{margin-bottom:16px}}
`;
const html=`<section class="panel span2 era-panel" aria-labelledby="eraTitle"><div class="panel-head"><div><h2 id="eraTitle">Release era × genre heatmap</h2><p class="panel-sub">Find the combinations that define your library.</p></div><div class="seg" role="group" aria-label="Heatmap measure"><button type="button" id="eraCountBtn" class="active" aria-pressed="true">Game count</button><button type="button" id="eraRatingBtn" aria-pressed="false">Average rating</button></div></div><div class="era-scroll" tabindex="0" role="region" aria-label="Release era and genre table; scroll horizontally on small screens"><table class="era-table" id="eraTable"></table></div><div class="era-key"><span id="eraScaleLow">0</span><span class="era-ramp" aria-hidden="true"><i style="background:#382532"></i><i style="background:#642c46"></i><i style="background:#90335b"></i><i style="background:#bb3a70"></i><i style="background:#ea377a"></i></span><span id="eraScaleHigh"></span><span class="era-sparse-key" aria-hidden="true"></span><span id="eraSparseLabel">Fewer than 3 games</span></div><p class="era-details" id="eraDetails" aria-live="polite">Hover, focus or tap a cell for its exact count and average.</p><p class="foot" id="eraCoverage"></p></section>\n  `;
const anchor='  <section class="panel span2"><div class="panel-head"><div><h2>Beyond the averages</h2>';
if(!page.includes(anchor))throw Error('Panel anchor missing');
page=page.replace('</style>',css+'</style>').replace(anchor,'  '+html+anchor.trimStart());
const logic=`
  let eraMeasure='count';
  function eraTags(g){return [...new Set([...genresFor(g),...(Array.isArray(g.themes)&&g.themes.some(t=>String(t).toLowerCase()==='horror')?['Horror']:[])])];}
  function eraData(played){
    const eligible=played.filter(g=>g.year!=null&&String(g.year).trim()!==''&&Number.isInteger(+g.year)&&+g.year>=1900&&+g.year<=2100&&eraTags(g).length);
    const eras=[...new Set(eligible.map(g=>Math.floor(+g.year/10)*10))].sort((a,b)=>a-b),rows=new Map();
    for(const g of eligible)for(const tag of eraTags(g)){if(!rows.has(tag))rows.set(tag,new Map());const era=Math.floor(+g.year/10)*10,cells=rows.get(tag);if(!cells.has(era))cells.set(era,[]);cells.get(era).push(g)}
    return {eligible,eras,rows:[...rows].sort((a,b)=>[...b[1].values()].flat().length-[...a[1].values()].flat().length||a[0].localeCompare(b[0]))};
  }
  function renderEraHeatmap(played){
    const data=eraData(played),rating=eraMeasure==='rating',maximum=Math.max(1,...data.rows.flatMap(([,cells])=>[...cells.values()].map(list=>list.length)));
    $('eraScaleLow').textContent=rating?'0 / 5':'0';$('eraScaleHigh').textContent=rating?'5 / 5':maximum+' games';$('eraSparseLabel').textContent=rating?'Fewer than 3 ratings':'Fewer than 3 games';
    $('eraCoverage').textContent=data.eligible.length+'/'+played.length+' played games have a release year and genre or Horror theme. Each game counts once per matching row. Horror is an IGDB theme. Averages use rated games only; — means no '+(rating?'ratings.':'games.');
    $('eraDetails').textContent='Hover, focus or tap a cell for its exact count and average.';
    if(!data.rows.length){$('eraTable').innerHTML='<caption>No played games with release years and genre data yet.</caption>';return}
    $('eraTable').innerHTML='<caption>'+(rating?'Average rating out of 5':'Played game count')+' by release decade · rows ordered by total games</caption><thead><tr><th scope="col">Genre</th>'+data.eras.map(era=>'<th scope="col">'+era+'s</th>').join('')+'</tr></thead><tbody>'+data.rows.map(([tag,cells])=>'<tr><th scope="row">'+esc(tag)+(tag==='Horror'?'<small>Theme</small>':'')+'</th>'+data.eras.map(era=>{
      const list=cells.get(era)||[],scores=list.map(g=>g.rating).filter(n=>Number.isFinite(n)&&n>0&&n<=5),average=avg(scores),sample=rating?scores.length:list.length,value=rating?average:list.length,sparse=sample>0&&sample<3,t=sample?(rating?value/5:value/maximum):0;
      const color='rgb('+[56,37,50].map((base,i)=>Math.round(base+([234,55,122][i]-base)*t)).join(',')+')',summary=tag+' · '+era+'s: '+list.length+' games · '+scores.length+' rated · '+(scores.length?average.toFixed(2)+' / 5 average':'no ratings')+(sparse?' · sparse sample':'');
      return '<td><button type="button" class="era-cell'+(sparse?' is-sparse':'')+(!sample?' is-empty':'')+'" style="--era-color:'+color+';color:'+(t>.72?'#16181c':'#fff0f7')+'" aria-label="'+esc(summary)+'" data-summary="'+esc(summary)+'">'+(sample?(rating?average.toFixed(1):value):'—')+'</button></td>';
    }).join('')+'</tr>').join('')+'</tbody>';
  }
  for(const [id,measure] of [['eraCountBtn','count'],['eraRatingBtn','rating']])$(id).addEventListener('click',()=>{eraMeasure=measure;for(const [button,value] of [['eraCountBtn','count'],['eraRatingBtn','rating']]){$(button).classList.toggle('active',measure===value);$(button).setAttribute('aria-pressed',String(measure===value))}renderEraHeatmap(games.filter(isPlayed))});
  for(const event of ['pointerover','focusin','click'])$('eraTable').addEventListener(event,e=>{const cell=e.target.closest('.era-cell');if(cell)$('eraDetails').textContent=cell.dataset.summary});
`;
page=page.replace('  function render(){',logic+'\n  function render(){\n    renderEraHeatmap(games.filter(isPlayed));');
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
