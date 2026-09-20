import { writeFile } from 'node:fs/promises';
import { page as original } from '../dist/server/page.js';

let page = original;
function replace(before, after) {
  if (!page.includes(before)) throw new Error(`Missing target: ${before}`);
  page = page.replace(before, after);
}
for (const [prefix, title, subtitle, label] of [['franchise', 'Franchises', 'franchiseSubtitle', 'franchises'], ['engine', 'Game engines', 'engineSubtitle', 'engines']]) {
  const start = `<section class="panel"><div class="panel-head"><div><h2>${title}</h2>`;
  replace(start, `<section class="panel metadata-sort-panel"><div class="panel-head"><div><h2>${title}</h2>`);
  const marker = `id="${subtitle}">IGDB ${label} across your games</p></div>`;
  replace(marker, marker + `<div class="seg" role="group" aria-label="Sort ${label}"><button id="${prefix}CountBtn" class="active" aria-pressed="true">Game count</button><button id="${prefix}RatingBtn" aria-pressed="false">Rating</button></div>`);
}
replace('</style>', '.metadata-sort-panel .panel-head{flex-wrap:wrap}.metadata-sort-panel .seg{flex-shrink:0}\n</style>');
replace("publisherSort='rating';", "publisherSort='rating';\n  const metadataSort={franchise:'count',engine:'count'};");
replace('const all=groups(played,key).sort((a,b)=>b.count-a.count||(b.rating||0)-(a.rating||0)||a.name.localeCompare(b.name)),max=', "const byRating=metadataSort[kind]==='rating',all=groups(played,key).filter(x=>!byRating||x.ratedCount>=3).sort((a,b)=>(byRating?b.rating-a.rating||b.count-a.count:b.count-a.count||(b.rating||0)-(a.rating||0))||a.name.localeCompare(b.name)),max=");
replace('games · full list`;', "games · ${byRating?'at least 3 rated games':'full list'}`;");
replace('${x.count/max*100}%', '${(byRating?x.rating/5:x.count/max)*100}%');
replace('No ${label} data yet.', "${byRating?'No '+label+' has at least 3 rated games yet.':'No '+label+' data yet.'}");
replace("  $('closeBreakdown').addEventListener", "  for(const kind of ['franchise','engine'])for(const value of ['count','rating'])$(kind+(value==='count'?'Count':'Rating')+'Btn').addEventListener('click',()=>{metadataSort[kind]=value;for(const measure of ['count','rating']){const button=$(kind+(measure==='count'?'Count':'Rating')+'Btn');button.classList.toggle('active',measure===value);button.setAttribute('aria-pressed',String(measure===value))}render()});\n  $('closeBreakdown').addEventListener");
await writeFile(new URL('../dist/server/page.js', import.meta.url), `export const page = ${JSON.stringify(page)};\n`);
