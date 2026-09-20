const fs=require('node:fs');
let html=fs.readFileSync('dist/index.html','utf8');
const helper=`  // Tukey's upper outer fence removes extreme high values only.
  function playtimeEstimate(library){
    const available=library.filter(g=>isPlayed(g)&&Number.isFinite(g.averageTimeHours)&&g.averageTimeHours>0);
    const sorted=available.map(g=>g.averageTimeHours).sort((a,b)=>a-b);
    const quantile=p=>{const index=(sorted.length-1)*p,lo=Math.floor(index);return sorted[lo]+(sorted[Math.ceil(index)]-sorted[lo])*(index-lo)};
    const q1=quantile(.25),q3=quantile(.75),iqr=q3-q1;
    const cutoff=sorted.length>=8&&iqr>0?q3+3*iqr:Infinity;
    const excluded=available.filter(g=>g.averageTimeHours>cutoff).sort((a,b)=>b.averageTimeHours-a.averageTimeHours);
    const included=available.filter(g=>g.averageTimeHours<=cutoff);
    return {included,excluded,cutoff,totalHours:included.reduce((sum,g)=>sum+g.averageTimeHours,0)};
  }
`;
if(!html.includes('function playtimeEstimate'))html=html.replace('  function isPlayed(g)',helper+'  function isPlayed(g)');
const before='const timedGames=played.filter(g=>Number.isFinite(g.averageTimeHours)&&g.averageTimeHours>0),totalHours=timedGames.reduce((sum,g)=>sum+g.averageTimeHours,0);';
const after='const {included:timedGames,excluded:timeOutliers,cutoff:timeCutoff,totalHours}=playtimeEstimate(played);';
if(!html.includes(before))throw Error('Calculation target missing');
html=html.replace(before,after);
html=html.replace('with average time data`','with average time data${timeOutliers.length?" · "+timeOutliers.length+" outliers excluded":""}`');
const anchor="$('topFranchise').textContent=topFranchise?.name";
html=html.replace(anchor,`$('totalTimeSub').title=timeOutliers.length?'Excluded above '+timeCutoff.toFixed(1)+' hours (Q3 + 3 × IQR):\\n'+timeOutliers.map(g=>g.title+': '+g.averageTimeHours+' hours').join('\\n'):'No high playtime outliers';`+anchor);
fs.writeFileSync('dist/index.html',html);
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
