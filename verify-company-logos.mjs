import fs from 'node:fs';
import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
import {companyLogos} from './dist/server/company-logos.js';
const games=JSON.parse(fs.readFileSync('laime-audit.json'));
assert.equal(games.filter(g=>g.checked).length,games.length,'Profile metadata must be complete');
const counts=new Map();
for(const game of games.filter(g=>g.played!==false))for(const name of new Set(game.companies))counts.set(name,(counts.get(name)||0)+1);
const companies=[...counts].filter(([,count])=>count>=2).sort(([a],[b])=>a.localeCompare(b));
globalThis.fetch=()=>{throw Error('Bundled logos must not need an upstream request')};
const report=[];
for(const [name,count] of companies){
 const response=await worker.fetch(new Request('https://local/api/company-logo?name='+encodeURIComponent(name)));
 const logo=await response.json();
 assert.equal(response.status,200,name);
 assert.match(logo.data,/^data:image\/(png|webp|jpeg);base64,/,name);
 assert.ok(Buffer.from(logo.data.split(',')[1],'base64').length>100,name);
 assert.ok(companyLogos[name],name);
 report.push({name,games:count,source:logo.source,available:true});
}
fs.writeFileSync('company-logo-audit.json',JSON.stringify({profile:'Laime',gameEntries:games.length,companies:report},null,2));
console.log(`PASS: ${companies.length}/${companies.length} company logos; ${games.length}/${games.length} game details; no upstream logo requests`);
