const fs=require('node:fs');
let html=fs.readFileSync('dist/index.html','utf8');
html=html.replace('<div class="stat-sub" id="totalTimeSub">Backloggd average times</div>','<div class="stat-sub" id="totalTimeSub">Backloggd average times</div><button class="ghost" id="timeExclusions" type="button" hidden style="margin-top:8px">View exclusions</button>');
html=html.replace("$('totalTimeSub').title=timeOutliers.length?","$('timeExclusions').hidden=!timeOutliers.length;$('totalTimeSub').title=timeOutliers.length?");
html=html.replace("  $('missingDetails').addEventListener('click',showMissing);",`  $('timeExclusions').addEventListener('click',()=>{
    const {excluded,cutoff}=playtimeEstimate(games);if(!excluded.length)return;
    activeBreakdown=null;breakdownTrigger=$('timeExclusions');
    $('breakdownTitle').textContent='Excluded playtime estimates';
    $('breakdownSubtitle').textContent=excluded.length+' games above '+cutoff.toFixed(1)+' hours · upper outlier cutoff: Q3 + 3 × IQR. Games remain in your library. The cutoff updates as time data loads.';
    $('breakdownList').innerHTML=excluded.map(g=>'<div class="game-item"><div class="game-title">'+gameLink(g)+'</div><div class="game-rating">'+esc(g.averageTimeHours)+' h</div></div>').join('');
    $('breakdown').hidden=false;$('breakdownTitle').setAttribute('tabindex','-1');$('breakdownTitle').focus({preventScroll:true});$('breakdown').scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  $('missingDetails').addEventListener('click',showMissing);`);
const audit=JSON.parse(fs.readFileSync('laime-playtime-audit.json'));
const library=JSON.parse(fs.readFileSync('laime-audit.json'));
for(const g of library){const d=audit.find(d=>d.path===g.path);if(d&&!d.timeError)g.averageTimeHours=d.averageTimeHours;}
fs.writeFileSync('laime-audit.json',JSON.stringify(library,null,2));
html=html.replace(/const defaultLibrary=\[[^\r\n]+\];/, 'const defaultLibrary='+JSON.stringify(library)+';');
fs.writeFileSync('dist/index.html',html);
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
