const fs=require('fs');let h=fs.readFileSync('dist/index.html','utf8');
h=h.replace('<div id="tasteDetails"','<p class="panel-sub taste-fit-summary" id="tasteFit" aria-live="polite"></p><div id="tasteDetails"');
h=h.replace('</style>','.taste-fit{stroke:#74d7e8;stroke-width:2.5;fill:none;pointer-events:none}.taste-fit-summary{line-height:1.6}.taste-fit-key{display:inline-block;width:24px;border-top:3px solid #74d7e8;vertical-align:middle;margin-right:8px}</style>');
h=h.replace('  function renderTaste(played){',`  function tasteRegression(data){
    if(data.length<3)return null;
    const xs=data.map(g=>Math.log10(g.plays)),ys=data.map(g=>g.rating),mx=avg(xs),my=avg(ys);
    const sxx=xs.reduce((s,v)=>s+(v-mx)**2,0),syy=ys.reduce((s,v)=>s+(v-my)**2,0),sxy=xs.reduce((s,v,i)=>s+(v-mx)*(ys[i]-my),0);
    if(sxx<1e-12)return null;
    const slope=sxy/sxx,intercept=my-slope*mx;
    return {slope,intercept,r2:syy<1e-12?null:Math.max(0,Math.min(1,sxy*sxy/(sxx*syy))),lo:Math.min(...xs),hi:Math.max(...xs),n:data.length};
  }
  function renderTaste(played){`);
h=h.replace("$('tasteDetails').textContent='Hover, focus or tap a dot to explore its games.';","$('tasteDetails').textContent='Hover, focus or tap a dot to explore its games.';$('tasteFit').textContent='';");
h=h.replace("    svg+=data.map((g,i)=>",`    const fit=tasteRegression(data);
    if(fit){
      let lo=fit.lo,hi=fit.hi;
      if(Math.abs(fit.slope)>1e-12){const a=(0-fit.intercept)/fit.slope,b=(5-fit.intercept)/fit.slope;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b))}
      if(lo<=hi)svg+='<line class="taste-fit" x1="'+x(10**lo)+'" y1="'+y(fit.intercept+fit.slope*lo)+'" x2="'+x(10**hi)+'" y2="'+y(fit.intercept+fit.slope*hi)+'"/>';
      $('tasteFit').innerHTML='<span class="taste-fit-key" aria-hidden="true"></span>Best-fit line · '+fit.n+' games · R² '+(fit.r2===null?'undefined (all ratings equal)':fit.r2.toFixed(3))+' · '+(fit.slope>=0?'+':'')+fit.slope.toFixed(2)+' rating points per 10× plays. Fits rating against log₁₀(plays); association, not causation.';
    }else $('tasteFit').textContent='Best-fit line needs at least 3 rated games with differing play counts.';
    svg+=data.map((g,i)=>`);
fs.writeFileSync('dist/index.html',h);fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(h)+';\n');
