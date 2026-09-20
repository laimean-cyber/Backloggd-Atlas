import {writeFileSync} from 'node:fs';
import {page} from '../dist/server/page.js';
import {parseCommunityRating} from '../dist/server/community.js';
const match=page.match(/const defaultLibrary=(\[[^\r\n]+\]);/);
if(!match)throw Error('Library missing');
const games=JSON.parse(match[1]),rated=games.filter(g=>g.rating>0&&g.played!==false&&!g.communityFetchedAt);
let next=0,done=0,failed=0,limited=false;
await Promise.all(Array.from({length:1},async()=>{while(next<rated.length&&!limited){const g=rated[next++];try{
 const response=await fetch('https://backloggd.com'+g.path,{headers:{'user-agent':'Mozilla/5.0','accept':'text/html'},signal:AbortSignal.timeout(20000)});
 if(!response.ok){if(response.status===429||response.status===403)limited=true;throw Error(String(response.status));}
 g.communityRating=parseCommunityRating(await response.text());g.communityFetchedAt=Date.now();
 }catch{failed++}done++;if(done%100===0)console.log({done,total:rated.length,failed});}}));
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page.replace(match[1],JSON.stringify(games)))+';\n');
console.log({total:rated.length,compared:rated.filter(g=>g.communityRating>0).length,failed});
