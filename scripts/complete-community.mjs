import {writeFileSync} from 'node:fs';
import {page} from '../dist/server/page.js';
const match=page.match(/const defaultLibrary=(\[[^\r\n]+\]);/),games=JSON.parse(match[1]);
const pending=games.filter(g=>g.rating>0&&g.played!==false&&!g.communityFetchedAt);
for(let i=0;i<pending.length;i+=4){
 const batch=pending.slice(i,i+4);
 const response=await fetch('https://backloggd-atlas.nice-01.chatgpt.site/api/community?'+batch.map(g=>'path='+encodeURIComponent(g.path)).join('&'),{headers:{'OAI-Sites-Authorization':'Bearer '+process.argv[2]}});
 if(!response.ok)throw Error('API status '+response.status);
 const {ratings}=await response.json();
 for(const r of ratings){if(!r.failed)Object.assign(batch.find(g=>g.path===r.path),r);else console.log('Failed',r.path,r.status,r.error)}
 if(ratings.some(r=>r.status===429||r.status===403))break;
}
const updated=page.replace(match[1],JSON.stringify(games));
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(updated)+';\n');
writeFileSync('dist/index.html',updated);
console.log({rated:games.filter(g=>g.rating>0).length,averages:games.filter(g=>g.rating>0&&g.communityRating>0).length});
