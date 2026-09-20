const fs=require('fs');
const winners=JSON.parse(fs.readFileSync('award-sources.json','utf8'));
Object.assign(winners[9],{path:'/games/baldurs-gate-iii/',title:"Baldur's Gate 3",image:'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co670h.jpg'});
fs.writeFileSync('award-sources.json',JSON.stringify(winners,null,2)+'\n');
let html=fs.readFileSync('dist/index.html','utf8');
const css=`
  .awards-panel{grid-column:1 / -1}.awards-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:28px 20px;margin:0;padding:20px 0 0;list-style:none}.award-link{display:block;min-width:0;text-decoration:none;border-radius:6px}.award-poster{display:block;width:100%;aspect-ratio:3 / 4;object-fit:cover;border-radius:6px;opacity:.5}.award-link.is-played .award-poster{opacity:1;transform:translateY(-20px);outline:3px solid #ea377a;outline-offset:0}.award-name{display:block;margin-top:12px;font-size:.875rem;font-weight:650;line-height:1.4}.award-year{display:block;margin-top:4px;color:#c4cbd1;font-size:.8125rem;font-variant-numeric:tabular-nums}.award-link:hover .award-name{text-decoration:underline;text-underline-offset:3px}.award-link:focus-visible{outline:2px solid #eef0f2;outline-offset:6px}.awards-panel .panel-head{margin-bottom:24px}@media(max-width:900px){.awards-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:650px){.awards-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 18px}}
`;
html=html.replace('</style>',css+'</style>');
const marker='  <div class="explore-pair span2">';
if(!html.includes(marker))throw Error('Missing insertion point');
html=html.replace(marker,`  <section class="panel awards-panel" aria-labelledby="awardsTitle"><div class="panel-head"><div><h2 id="awardsTitle">The Game Awards winners</h2><p class="panel-sub" id="awardsSummary"></p></div></div><ol class="awards-grid" id="awardWinners"></ol></section>\n`+marker);
const js=`
  const awardWinners=${JSON.stringify(winners.map(({status,...g})=>g))};
  const awardTitleKey=title=>String(title||'').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\biii\\b/g,'3').replace(/[^a-z0-9]/g,'');
  function renderAwards(played){
    let count=0;
    $('awardWinners').innerHTML=awardWinners.map(winner=>{
      const didPlay=played.some(game=>game.path?game.path===winner.path:awardTitleKey(game.title)===awardTitleKey(winner.title)&&(winner.title!=='God of War'||Number(game.year)===2018));
      if(didPlay)count++;
      return '<li><a class="award-link'+(didPlay?' is-played':'')+'" href="https://backloggd.com'+winner.path+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(winner.title)+', '+winner.year+', '+(didPlay?'played':'not played')+'; view on Backloggd"><img class="award-poster" src="'+winner.image+'" alt="" width="264" height="352" loading="lazy" decoding="async"><span class="award-name">'+esc(winner.title)+'</span><span class="award-year">'+winner.year+'</span></a></li>';
    }).join('');
    $('awardsSummary').textContent=count+' of '+awardWinners.length+' played · Game of the Year, 2014–2025'+(activeLibraryIncomplete?' · Library incomplete':'');
  }
`;
html=html.replace('  function render(){',js+'\n  function render(){');
html=html.replace("    renderMetadataList('gameEngines'","    renderAwards(played);\n    renderMetadataList('gameEngines'");
fs.writeFileSync('dist/index.html',html);
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
