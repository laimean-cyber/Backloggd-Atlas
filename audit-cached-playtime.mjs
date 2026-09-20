import fs from 'node:fs';
const games=JSON.parse(fs.readFileSync('laime-playtime-audit.json'));
let next=0,done=0;
await Promise.all(Array.from({length:3},async()=>{while(next<games.length){const group=games.slice(next,next+=4);const q=new URLSearchParams();group.forEach(g=>q.append('path',g.path));const r=await fetch('https://backloggd-atlas.nice-01.chatgpt.site/api/details?'+q,{headers:{"OAI-Sites-Authorization":'Bearer '+process.argv[2]},signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();for(const d of data.details||[]){const g=group.find(g=>g.path===d.path);if(!d.failed&&'averageTimeHours' in d){g.averageTimeHours=d.averageTimeHours;delete g.timeError}}done+=group.length;if(done%100===0)console.log('Checked',done);}}));
fs.writeFileSync('laime-playtime-audit.json',JSON.stringify(games,null,2));
console.log(JSON.stringify({errors:games.filter(g=>g.timeError).length,timed:games.filter(g=>g.averageTimeHours>0).length,largest:games.filter(g=>g.averageTimeHours>0).sort((a,b)=>b.averageTimeHours-a.averageTimeHours).slice(0,40).map(g=>({title:g.title,hours:g.averageTimeHours}))},null,2));
