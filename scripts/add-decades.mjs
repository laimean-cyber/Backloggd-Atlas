import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
if(page.includes('id="decadesPanel"'))throw new Error('Decades already installed');
const anchor=page.indexOf('<section class="panel span2"><div class="panel-head"><div><h2>Games by release year');
if(anchor<0)throw new Error('Release chart missing');
const end=page.indexOf('</section>',anchor)+10;
page=page.slice(0,end)+`
<section class="panel span2 decades-panel" id="decadesPanel" aria-labelledby="decadesTitle"><div class="panel-head"><div><h2 id="decadesTitle">Games through the decades</h2><p class="panel-sub">Your highest-rated games, defining developers and dominant genres, era by era.</p></div></div><div id="decadesReel"></div><p class="foot" id="decadesNote"></p><details class="decade-method"><summary>How these highlights are calculated</summary><p>Played games only. Highest-rated games use your ratings, with ties ordered by title. Most-played developer uses game count; favourite developer uses average rating with at least 3 rated games in that decade. Developer statistics exclude DLC and expansions. Genre shares include every credited genre, so they can overlap. Comparisons use your entire played library, including games without a release year.</p></details></section>
`+page.slice(end);
const css=`
.decades-panel .panel-head{margin-bottom:8px}.decade-row{display:grid;grid-template-columns:130px minmax(0,1.5fr) minmax(220px,1fr);gap:28px;padding:28px 0;border-top:1px solid #353d4e}.decade-era h3{font-size:2.25rem;letter-spacing:-.03em;margin:0 0 8px;color:#f276a4}.decade-era p{margin:4px 0;color:#c4cbd1;font-size:.8rem;line-height:1.5}.decade-label{font-size:.8rem;font-weight:650;color:#c4cbd1;margin:0 0 12px}.decade-picks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;list-style:none;padding:0;margin:0}.decade-picks li{min-width:0}.decade-cover{aspect-ratio:3/4;max-height:180px;position:relative;background:#16181c;overflow:hidden;border-radius:6px;display:grid;place-items:center;color:#a3acb5;font-size:.75rem}.decade-cover img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.decade-pick-title{font-size:.83rem;line-height:1.4;margin:9px 0 4px;overflow-wrap:anywhere}.decade-pick-title a{text-decoration:none}.decade-pick-title a:hover{text-decoration:underline;text-underline-offset:3px}.decade-pick-title a:focus-visible,.decade-method summary:focus-visible{outline:2px solid #f276a4;outline-offset:4px}.decade-rating{color:#f276a4;font-weight:750;font-size:.85rem;font-variant-numeric:tabular-nums}.decade-facts{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:20px 16px;align-content:start}.decade-facts dt{color:#c4cbd1;font-size:.75rem;margin-bottom:6px}.decade-facts dd{margin:0;font-size:.95rem;font-weight:650;line-height:1.4;overflow-wrap:anywhere}.decade-facts small{display:block;font-size:.75rem;color:#a3acb5;font-weight:400;margin-top:4px}.decade-genres,.decade-comparison{grid-column:1/-1}.decade-genres ul{list-style:none;padding:0;margin:0;display:grid;gap:7px}.decade-genres li{display:flex;justify-content:space-between;gap:12px;font-size:.8rem;font-weight:400}.decade-genres span:last-child{color:#c4cbd1;white-space:nowrap;font-variant-numeric:tabular-nums}.decade-comparison{margin:0;padding-top:12px;border-top:1px solid #353d4e;color:#c4cbd1;font-size:.8rem;line-height:1.6}.decade-method{font-size:.8rem;color:#c4cbd1;line-height:1.6}.decade-method summary{cursor:pointer;width:fit-content}.decade-method p{max-width:75ch}.decade-empty{color:#a3acb5;font-size:.85rem;line-height:1.5;margin:0}.decades-panel .foot{margin:0 0 12px}
@media(max-width:1100px){.decade-row{grid-template-columns:100px minmax(0,1fr);gap:20px}.decade-facts{grid-column:2;grid-template-columns:1fr 1fr}.decade-cover{max-height:220px}}
@media(max-width:600px){.decade-row{grid-template-columns:minmax(0,1fr);gap:20px;padding:24px 0}.decade-era{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}.decade-era h3{font-size:1.85rem;margin:0}.decade-era p{margin:0}.decade-facts{grid-column:1}.decade-picks{gap:10px}.decade-pick-title{font-size:.75rem}.decade-cover{max-height:none}.decade-rating{font-size:.8rem}}
`;
page=page.replace('</style>',css+'</style>');
const functions=String.raw`
  function decadeData(items){
    const played=items.filter(isPlayed),dated=played.filter(g=>Number.isInteger(+g.year)&&+g.year>=1900&&+g.year<2030),scores=played.filter(g=>Number.isFinite(g.rating)&&g.rating>0).map(g=>g.rating),baseline=scores.length?avg(scores):null;
    const earliest=dated.length?Math.min(2020,...dated.map(g=>Math.floor(+g.year/10)*10)):2020;
    const eras=[];
    for(let year=2020;year>=earliest;year-=10){
      const list=dated.filter(g=>Math.floor(+g.year/10)*10===year),ratedGames=list.filter(g=>Number.isFinite(g.rating)&&g.rating>0),devs=groups(list.filter(g=>!isExpansionOrDlc(g)),'developers');
      eras.push({year,list,ratedCount:ratedGames.length,rating:ratedGames.length?avg(ratedGames.map(g=>g.rating)):null,top:ratedGames.sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title)).slice(0,3),most:[...devs].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))[0],favourite:devs.filter(d=>d.ratedCount>=3).sort((a,b)=>b.rating-a.rating||b.ratedCount-a.ratedCount||a.name.localeCompare(b.name))[0],genres:groups(list,'genres').sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,3)});
    }
    return {played,dated,baseline,eras};
  }
  function renderDecades(){
    const {played,dated,baseline,eras}=decadeData(games);
    $('decadesNote').textContent=dated.length+' of '+played.length+' played games have a release year from the 2020s or earlier. Missing years are not assigned to a decade.';
    $('decadesReel').innerHTML=eras.map(d=>{
      const share=played.length?Math.round(d.list.length/played.length*100):0,delta=d.rating!==null&&baseline!==null?d.rating-baseline:null;
      const comparison=delta===null?'No rated games to compare yet.':Math.abs(delta)<0.05?'Its average matches your library at '+fmt(baseline)+' / 5.':'Its '+fmt(d.rating)+' / 5 average is '+fmt(Math.abs(delta))+' '+(delta>0?'above':'below')+' your library average ('+fmt(baseline)+' / 5).';
      const picks=d.top.map(g=>{const cover=journeyCover(g);return '<li><div class="decade-cover"><span>Cover unavailable</span>'+(cover?'<img src="'+esc(cover)+'" alt="" loading="lazy" onerror="this.remove()">':'')+'</div><div class="decade-pick-title">'+gameLink(g)+'</div><div class="decade-rating">'+fmt(g.rating)+' / 5</div></li>'}).join('');
      return '<article class="decade-row" aria-labelledby="decade-'+d.year+'"><div class="decade-era"><h3 id="decade-'+d.year+'">'+d.year+'s</h3><p>'+d.list.length+' played · '+d.ratedCount+' rated</p></div><div><h4 class="decade-label">Highest-rated games</h4>'+(picks?'<ol class="decade-picks">'+picks+'</ol>':'<p class="decade-empty">No rated games from this decade yet.</p>')+'</div><dl class="decade-facts"><div><dt>Most-played developer</dt><dd>'+ (d.most?esc(d.most.name)+'<small>'+d.most.count+' games played</small>':'—<small>No developer data</small>')+'</dd></div><div><dt>Favourite developer</dt><dd>'+(d.favourite?esc(d.favourite.name)+'<small>'+fmt(d.favourite.rating)+' / 5 · '+d.favourite.ratedCount+' rated</small>':'—<small>Needs 3 rated games per developer</small>')+'</dd></div><div class="decade-genres"><dt>Dominant genres</dt><dd>'+(d.genres.length?'<ul>'+d.genres.map(g=>'<li><span>'+esc(g.name)+'</span><span>'+g.count+' · '+Math.round(g.count/d.list.length*100)+'%</span></li>').join('')+'</ul>':'<small>No genre data</small>')+'</dd></div><div class="decade-comparison"><dt>Compared with your library</dt><dd style="font-size:inherit;font-weight:400">'+share+'% of your played games. '+comparison+'</dd></div></dl></article>';
    }).join('');
  }
`;
page=page.replace('  function render(){',functions+'\n  function render(){\n    renderDecades();');
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
console.log('Added Games through the decades.');
