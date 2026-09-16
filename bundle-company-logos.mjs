import fs from 'node:fs';
import {companyLogos} from './dist/server/company-logos.js';
const sources=JSON.parse(fs.readFileSync('logo-sources.json'));
for(const [name,id] of Object.entries(sources)){
  if(companyLogos[name]?.imageId===id)continue;
  const url=`https://images.igdb.com/igdb/image/upload/t_logo_med/${id}.webp`;
  let response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)response=await fetch(url.replace('t_logo_med','t_original'),{signal:AbortSignal.timeout(15000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error(`Invalid logo: ${name}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.length||bytes.length>300000)throw Error(`Unexpected logo size: ${name}`);
  const slug=({'ZA/UM':'za-slash-um','Ubisoft Québec':'ubisoft-quebec--1',"DON'T NOD":'dont-nod'}[name])||name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[,\.]/g,'').replaceAll(' ','-');
  companyLogos[name]={data:`data:image/webp;base64,${bytes.toString('base64')}`,source:`https://www.igdb.com/companies/${slug}`,imageId:id,...(['Asobo Studio','Round8 Studio','Sandfall Interactive','Tango Gameworks'].includes(name)?{dark:true}:{})};
  fs.writeFileSync('dist/server/company-logos.js','export const companyLogos = '+JSON.stringify(companyLogos)+';\n');
  console.log(name,bytes.length);
}
fs.writeFileSync('dist/server/company-logos.js','export const companyLogos = '+JSON.stringify(companyLogos)+';\n');
