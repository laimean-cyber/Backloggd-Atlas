import fs from 'node:fs';
import {page} from '../dist/server/page.js';
const library=JSON.parse(page.match(/const defaultLibrary=(\[[^\n]+\]);/)[1]);
const source=JSON.parse(fs.readFileSync('franchise-source-audit.json')).results;
const bySlug=new Map(source.map(g=>[g.slug,g]));
const changed=[];const counts=new Map();
for(const g of library){
 const s=bySlug.get(g.path.split('/')[2]);
 const before=g.franchises||[],after=s?(s.franchises||[]).map(f=>f.name):before;
 if(JSON.stringify(before)!==JSON.stringify(after))changed.push({title:g.title,path:g.path,before,after,missingField:!Array.isArray(g.franchises),sourceType:s.game_type?.type});
 if(g.played===false)continue;
 const excluded=t=>['dlc','dlc addon','downloadable content','expansion'].includes(String(t||'').toLowerCase().replace(/[_-]+/g,' '));
 for(const name of new Set([...before,...after])){
  if(!counts.has(name))counts.set(name,{name,saved:0,franchisesRefreshed:0,franchisesAndTypesRefreshed:0});
  const row=counts.get(name);
  if(!excluded(g.gameType)){if(before.includes(name))row.saved++;if(after.includes(name))row.franchisesRefreshed++;}
  if(!excluded(s?.game_type?.type??g.gameType)&&after.includes(name))row.franchisesAndTypesRefreshed++;
 }
}
const report={libraryCount:library.length,matched:source.length,unmatched:library.filter(g=>!bySlug.has(g.path.split('/')[2])).map(g=>g.title),missingFranchiseField:library.filter(g=>!Array.isArray(g.franchises)).length,missingGameType:library.filter(g=>!('gameType'in g)).length,changedGames:changed.length,changed,counts:[...counts.values()].filter(r=>r.saved!==r.franchisesRefreshed||r.saved!==r.franchisesAndTypesRefreshed).sort((a,b)=>a.name.localeCompare(b.name))};
fs.writeFileSync('franchise-audit-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,changed:undefined},null,2));
