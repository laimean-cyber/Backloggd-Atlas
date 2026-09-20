const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('dist/index.html','utf8'),fn=html.slice(html.indexOf('  function tasteRegression'),html.indexOf('  function renderTaste'));
const ctx={avg:a=>a.reduce((s,v)=>s+v,0)/a.length};vm.createContext(ctx);vm.runInContext(fn,ctx);
const fit=ctx.tasteRegression([{plays:10,rating:1},{plays:100,rating:2},{plays:1000,rating:3}]);assert.equal(fit.slope,1);assert.equal(fit.intercept,0);assert.equal(fit.r2,1);
assert.equal(ctx.tasteRegression([{plays:10,rating:1},{plays:10,rating:2},{plays:10,rating:3}]),null);
assert.equal(ctx.tasteRegression([{plays:10,rating:1}]),null);
assert.equal(ctx.tasteRegression([{plays:10,rating:3},{plays:100,rating:3},{plays:1000,rating:3}]).r2,null);
const real=JSON.parse(fs.readFileSync('laime-audit.json')).filter(g=>g.rating>0&&g.plays>0);console.log('Regression checks passed',ctx.tasteRegression(real));
