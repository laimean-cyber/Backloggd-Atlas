import fs from 'node:fs';
import worker from './dist/server/index.js';
const all=JSON.parse(fs.readFileSync('laime-audit.json'));
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
const fields=['developers','publishers','gameModes','playerPerspectives','themes','franchises','gameEngines'];
const pending=all.filter(g=>!g.checked||fields.some(field=>!Array.isArray(g[field])));
for(let i=0;i<pending.length;i+=4){
  let group=pending.slice(i,i+4);
  for(let attempt=0;group.length&&attempt<3;attempt++){
    const params=new URLSearchParams;group.forEach(g=>params.append('path',g.path));
    const result=await(await worker.fetch(new Request('https://local/api/details?'+params),env)).json();
    const byPath=new Map((result.details||[]).map(detail=>[detail.path,detail]));
    group=group.filter(g=>{const detail=byPath.get(g.path);if(!detail?.checked)return true;Object.assign(g,detail);delete g.failed;delete g.status;return false});
    if(group.length)await new Promise(resolve=>setTimeout(resolve,1000));
  }
  fs.writeFileSync('laime-audit.json',JSON.stringify(all,null,2));
  if(i%20===0||i+4>=pending.length)console.log(Math.min(i+4,pending.length),'refreshed of',pending.length);
}
console.log('Final coverage',Object.fromEntries(fields.map(field=>[field,all.filter(g=>g[field]?.length).length])));
