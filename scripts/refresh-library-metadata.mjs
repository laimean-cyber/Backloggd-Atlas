import fs from 'node:fs';
import { page } from '../dist/server/page.js';
import { metadataFields, query, normalizeMetadata, igdbDetails } from '../dist/server/igdb.js';
import { metadataComplete } from '../dist/server/metadata.js';

const env = {...process.env};
if (fs.existsSync('.env.local')) for (const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)) {
  const i=line.indexOf('='); if(i>0&&!line.startsWith('#')) env[line.slice(0,i)]=line.slice(i+1);
}
const library = JSON.parse(page.match(/const defaultLibrary=(\[[^\n]+\]);/)[1]);
const unresolved=[];
for(let i=0;i<library.length;i+=100){
  const batch=library.slice(i,i+100);
  const results=await query(`${metadataFields} where slug = (${batch.map(g=>JSON.stringify(g.path.split('/')[2])).join(',')}); limit 500;`,env);
  for(const g of batch){
    const source=results.find(s=>s.slug===g.path.split('/')[2]);
    if(source)Object.assign(g,normalizeMetadata(source),{checked:true});
    else unresolved.push(g);
  }
}
for(const g of unresolved){
  try {
    const response=await fetch('https://backloggd.com'+g.path,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Backloggd '+response.status);
    Object.assign(g,await igdbDetails(g.path,await response.text(),env),{checked:true});
  } catch(error) { g.checked=false; console.log('Unresolved:',g.title,g.path,error.message); }
}
// Do not convert missing source records into apparently successful empty metadata.
for(const g of library)if(g.checked&&!metadataComplete(g))throw Error('Incomplete refreshed metadata: '+g.path);
const next=page.replace(/const defaultLibrary=\[[^\r\n]+\];/,()=> 'const defaultLibrary='+JSON.stringify(library).replace(/</g,'\\u003c')+';');
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(next)+';\n');
fs.writeFileSync('dist/index.html',next);
fs.writeFileSync('laime-audit.json',JSON.stringify(library,null,2));
console.log('Refreshed',library.filter(metadataComplete).length,'of',library.length,'games.');
