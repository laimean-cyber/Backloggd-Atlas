import {companyLogos} from './company-logos.js';
const normalize=s=>s.toLowerCase().replace(/\b(corporation|entertainment)\b/g,'').replace(/[^a-z0-9]/g,'');
async function getJSON(url){const r=await fetch(url,{headers:{'User-Agent':'BackloggdAtlas/1.0 (company logo lookup)'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Logo source unavailable '+r.status+' '+new URL(url).hostname);return r.json()}
export async function companyLogo(name){
  const bundled=companyLogos[name]||Object.entries(companyLogos).find(([key])=>normalize(key)===normalize(name))?.[1];if(bundled)return bundled;
  let cache;try{cache=globalThis.caches?.default}catch{}
  const key=new Request('https://backloggd-atlas.cache/company-logo/v1/'+encodeURIComponent(name));
  if(cache){try{const hit=await cache.match(key);if(hit)return await hit.json()}catch{}}
  const search=await getJSON('https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&search='+encodeURIComponent(name));
  const match=search.search?.find(x=>[x.label,x.match?.text].some(s=>s&&normalize(s)===normalize(name))&&/game|software|entertainment|company|studio|developer|publisher/i.test(x.description||''));
  let result={missing:true};
  if(match){
    const entity=await getJSON('https://www.wikidata.org/wiki/Special:EntityData/'+match.id+'.json');
    const file=entity.entities?.[match.id]?.claims?.P154?.[0]?.mainsnak?.datavalue?.value;
    if(file){
      const info=await getJSON('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=160&titles='+encodeURIComponent('File:'+file));
      const image=Object.values(info.query?.pages||{})[0]?.imageinfo?.[0];const imageURL=image?.thumburl||image?.url;
      if(imageURL&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(imageURL).hostname)){
        const response=await fetch(imageURL,{signal:AbortSignal.timeout(12000)}),type=response.headers.get('content-type')||'';
        if(response.ok&&/^image\/(png|jpeg|webp|gif)$/.test(type.split(';')[0])){const bytes=await response.arrayBuffer();if(bytes.byteLength<=300000)result={data:'data:'+type+';base64,'+btoa(Array.from(new Uint8Array(bytes),byte=>String.fromCharCode(byte)).join('')),source:'https://www.wikidata.org/wiki/'+match.id}}
      }
    }
  }
  if(cache){try{await cache.put(key,new Response(JSON.stringify(result),{headers:{'cache-control':'public, max-age='+ (result.data?2592000:604800)}}))}catch{}}return result;
}
