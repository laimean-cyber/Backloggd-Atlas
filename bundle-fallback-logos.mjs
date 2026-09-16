import fs from 'node:fs';
import {companyLogos} from './dist/server/company-logos.js';
const sources=JSON.parse(fs.readFileSync('fallback-logo-sources.json'));
for(const [name,entry] of Object.entries(sources)){
 const r=await fetch(entry.url,{signal:AbortSignal.timeout(20000)}),type=r.headers.get('content-type')?.split(';')[0];
 if(!r.ok||!/^image\/(png|jpeg|webp)$/.test(type))throw Error(`Invalid image ${name}: ${r.status} ${type}`);
 const bytes=Buffer.from(await r.arrayBuffer());
 if(!bytes.length||bytes.length>300000)throw Error(`Invalid size ${name}: ${bytes.length}`);
 companyLogos[name]={data:`data:${type};base64,${bytes.toString('base64')}`,source:entry.source};
 fs.writeFileSync('dist/server/company-logos.js','export const companyLogos = '+JSON.stringify(companyLogos)+';\n');
 console.log(name,bytes.length);
}
