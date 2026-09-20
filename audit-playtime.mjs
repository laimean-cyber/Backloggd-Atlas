import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/server/index.js','utf8');
const parse=vm.runInNewContext('('+source.match(/function parseAverageTime\(html\) \{[\s\S]*?\n\}/)[0]+')');
const games=JSON.parse(fs.readFileSync('laime-audit.json'));
let next=0,done=0;
async function get(path){const r=await fetch('https://backloggd.com'+path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(String(r.status));return r.text()}
await Promise.all(Array.from({length:6},async()=>{while(next<games.length){const g=games[next++];try{const html=await get(g.path);let hours=parse(html);const path=html.match(/\/fetch_game_stats\/\d+\/\d+\/?/)?.[0];if(hours==null&&path)hours=parse(await get(path));g.averageTimeHours=hours;}catch(e){g.timeError=e.message}done++;if(done%100===0)console.log('Checked',done);}}));
fs.writeFileSync('laime-playtime-audit.json',JSON.stringify(games,null,2));
const timed=games.filter(g=>g.averageTimeHours>0).sort((a,b)=>b.averageTimeHours-a.averageTimeHours);
console.log(JSON.stringify({checked:done,errors:games.filter(g=>g.timeError).length,timed:timed.length,largest:timed.slice(0,50).map(g=>({title:g.title,hours:g.averageTimeHours}))},null,2));
