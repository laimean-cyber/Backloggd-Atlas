import fs from 'node:fs';
import worker from './dist/server/index.js';
const all=JSON.parse(fs.readFileSync('laime-audit.json'));
for(const [i,g] of all.filter(g=>!g.checked).entries()){
  for(let attempt=0;attempt<3;attempt++){
    const j=await(await worker.fetch(new Request('https://local/api/details?path='+g.path))).json();
    if(j.details?.[0]?.checked){Object.assign(g,j.details[0]);delete g.failed;delete g.status;break}
    await new Promise(r=>setTimeout(r,1000));
  }
  fs.writeFileSync('laime-audit.json',JSON.stringify(all,null,2));
  if(i%20===0)console.log(i,'checked',all.filter(g=>g.checked).length);
  await new Promise(r=>setTimeout(r,300));
}
console.log('Final checked',all.filter(g=>g.checked).length,'of',all.length);
