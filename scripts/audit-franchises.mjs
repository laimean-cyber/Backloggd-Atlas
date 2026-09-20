import fs from 'node:fs';
import {page} from '../dist/server/page.js';
const library=JSON.parse(page.match(/const defaultLibrary=(\[[^\n]+\]);/)[1]);
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
const auth=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:env.IGDB_CLIENT_ID,client_secret:env.IGDB_CLIENT_SECRET,grant_type:'client_credentials'})});
if(!auth.ok)throw Error('Authentication failed '+auth.status);
const {access_token}=await auth.json();
const results=[];
for(let i=0;i<library.length;i+=100){
 const slugs=library.slice(i,i+100).map(g=>JSON.stringify(g.path.split('/')[2]));
 const r=await fetch('https://api.igdb.com/v4/games',{method:'POST',headers:{'Client-ID':env.IGDB_CLIENT_ID,Authorization:'Bearer '+access_token},body:`fields name,slug,game_type.type,franchise.name,franchises.name,collections.name,version_parent.name,version_parent.franchise.name,version_parent.franchises.name,parent_game.name,parent_game.franchise.name,parent_game.franchises.name; where slug = (${slugs.join(',')}); limit 500;`});
 if(!r.ok)throw Error('IGDB '+r.status+' '+await r.text());
 results.push(...await r.json());
 await new Promise(resolve=>setTimeout(resolve,280));
}
fs.writeFileSync('franchise-source-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),libraryCount:library.length,results},null,2));
console.log(JSON.stringify({library:library.length,matched:results.length,witcher:results.filter(g=>/witcher/i.test(g.name))},null,2));
