import {writeFileSync} from 'node:fs';
import {page} from '../dist/server/page.js';
const match=page.match(/const defaultLibrary=(\[[^\n]+\]);/),games=JSON.parse(match[1]);
const counts=new Map();for(const g of games.filter(g=>g.played!==false))for(const f of new Set(g.franchises||[]))counts.set(f,(counts.get(f)||0)+1);
const eligible=games.filter(g=>g.played!==false&&(g.franchises||[]).some(f=>counts.get(f)>=5));let done=0;
for(let i=0;i<eligible.length;i+=40){const batch=eligible.slice(i,i+40),q=new URLSearchParams();batch.forEach(g=>q.append('path',g.path));const r=await fetch('http://localhost:4174/api/metadata?'+q);const data=await r.json();for(const m of data.details||[]){if(m.failed)continue;const g=batch.find(g=>g.path===m.path);g.cover=m.cover;g.releaseDate=m.releaseDate;done++}}
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page.replace(match[1],JSON.stringify(games)))+';\n');console.log('Enriched '+done+'/'+eligible.length+' franchise entries.');
