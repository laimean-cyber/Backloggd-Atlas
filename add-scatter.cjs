const fs=require('fs');
let html=fs.readFileSync('page-working.html','utf8');
html=html.replace('</style>',`.playtime-scroll{overflow:auto;max-height:680px;scrollbar-color:#a3acb5 #16181c}.playtime-scroll svg{display:block;width:100%;min-width:var(--plot-width);height:auto}.playtime-dot{fill:#ea377a;fill-opacity:.75;stroke:#242832;stroke-width:1}.playtime-dot:hover,.playtime-dot:focus{fill-opacity:1;stroke:#fff;stroke-width:2;outline:none}.playtime-axis{fill:#c4cbd1;font-size:12px;font-variant-numeric:tabular-nums}.playtime-grid{stroke:#353d4e;stroke-width:1}</style>`);
const marker='  <div class="explore-pair span2">';
html=html.replace(marker,`  <section class="panel span2 playtime-panel" aria-labelledby="playtimeTitle"><div class="panel-head"><div><h2 id="playtimeTitle">Average playtime by release year</h2><p class="panel-sub" id="playtimeSummary">Each pink dot is a game</p></div></div><div id="playtimePlot" class="playtime-scroll" tabindex="0" role="region" aria-label="Game playtime scatter plot; scroll to explore all years and hours"></div></section>\n`+marker);
const fn=`
  function renderPlaytime(played){
    const data=played.filter(g=>Number.isInteger(g.year)&&g.year>0&&Number.isFinite(g.averageTimeHours)&&g.averageTimeHours>0);
    $('playtimeSummary').textContent=data.length+' games with average playtime data · each pink dot is a game · hover or focus for details';
    if(!data.length){$('playtimePlot').innerHTML='<div class="empty">No games with release year and average playtime data yet.</div>';return}
    const first=Math.min(...data.map(g=>g.year)),last=Math.max(...data.map(g=>g.year)),max=Math.max(5,Math.ceil(Math.max(...data.map(g=>g.averageTimeHours))/5)*5);
    const width=Math.max(900,(last-first+1)*42+100),height=Math.max(380,max/5*24+90),left=72,right=width-28,top=28,bottom=height-64;
    const x=year=>left+(year-first+.5)/(last-first+1)*(right-left),y=hours=>bottom-hours/max*(bottom-top);
    let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" style="--plot-width:'+width+'px" aria-labelledby="playtimeTitle"><g class="playtime-axis">';
    for(let h=0;h<=max;h+=5)svg+='<line class="playtime-grid" x1="'+left+'" x2="'+right+'" y1="'+y(h)+'" y2="'+y(h)+'"/><text text-anchor="end" x="'+(left-12)+'" y="'+(y(h)+4)+'">'+h+' h</text>';
    for(let year=first;year<=last;year++)svg+='<text text-anchor="middle" x="'+x(year)+'" y="'+(bottom+25)+'">'+year+'</text>';
    svg+='<text x="'+left+'" y="15">Average playtime (hours)</text><text text-anchor="middle" x="'+((left+right)/2)+'" y="'+(height-12)+'">Release year</text></g>';
    svg+=data.map(g=>{const label=esc(g.title+' · '+g.year+' · '+Number(g.averageTimeHours.toFixed(1))+' hours');return '<circle class="playtime-dot" tabindex="0" role="img" aria-label="'+label+'" cx="'+x(g.year)+'" cy="'+y(g.averageTimeHours)+'" r="5"><title>'+label+'</title></circle>'}).join('');
    $('playtimePlot').innerHTML=svg+'</svg>';
  }
`;
html=html.replace('  function render(){',fn+'  function render(){');
html=html.replace("renderMetadataList('gameEngines','gameEngines','engine','engineSubtitle','game engine',corePlayed);","renderMetadataList('gameEngines','gameEngines','engine','engineSubtitle','game engine',corePlayed);\n    renderPlaytime(played);");
fs.writeFileSync('dist/index.html',html);fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
