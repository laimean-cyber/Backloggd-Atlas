import fs from 'node:fs';
const slugs=['dragon-age-inquisition','the-witcher-3-wild-hunt','overwatch','the-legend-of-zelda-breath-of-the-wild','god-of-war--1','sekiro-shadows-die-twice','the-last-of-us-part-ii','it-takes-two','elden-ring','baldurs-gate-3','astro-bot','clair-obscur-expedition-33'];
const all=[];
for(const [i,s] of slugs.entries()){
 const r=await fetch('https://backloggd.com/games/'+s+'/');const h=await r.text();
 const tag=h.match(/<img[^>]*class="[^"]*card-img[^"]*"[^>]*>/)?.[0];
 const image=tag?.match(/data-src="([^"]+)/)?.[1];
 const title=tag?.match(/alt="([^"]+)/)?.[1];
 all.push({year:2014+i,path:new URL(r.url).pathname,title,image,status:r.status});
}
fs.writeFileSync('award-sources.json',JSON.stringify(all,null,2));console.log(all);
