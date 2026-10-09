import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
const old="top:ratedGames.filter(g=>g.rating===5||g.rating===4.5).sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title))";
const replacement="top:ratedGames.filter(g=>ratedGames.some(x=>x.rating===5||x.rating===4.5)?g.rating===5||g.rating===4.5:g.rating===Math.max(...ratedGames.map(x=>x.rating))).sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title))";
if(!page.includes(old))throw new Error('Decade rating filter missing');
page=page.replace(old,replacement);
page=page.replace('Your highest rated games, defining developers and dominant genres, era by era.','Your highest rated games, defining developers and dominant genres, era by era. Games rated 5 or 4.5 stars are shown; otherwise, all games at the decade’s highest available rating.');
page=page.replace('Game highlights include every game you rated 5 or 4.5 stars, ordered by rating then title.','Game highlights include every game you rated 5 or 4.5 stars. If a decade has none, all games tied at its highest available rating are shown. Games are ordered by rating then title.');
page=page.replace('<h4 class="decade-label">5 &amp; 4.5-star games <span', '<h4 class="decade-label">\'+(d.top.length&&d.top[0].rating<4.5?fmt(d.top[0].rating)+\'-star games · highest rated\':\'5 &amp; 4.5-star games\')+\' <span');
page=page.replace('aria-label="5 and 4.5 star games; scroll horizontally to explore"','aria-label="Highlighted games; scroll horizontally to explore"');
page=page.replace('No 5- or 4.5-star games from this decade yet.','No rated games from this decade yet.');
page=page.replace('</style>',`
/* Restore the thin scrollbar while retaining direct, unsnapped scrolling. */
.decade-picks{scrollbar-width:thin;scrollbar-color:#ea377a #16181c}
.decade-picks::-webkit-scrollbar{height:10px}
.decade-picks::-webkit-scrollbar-track{border:1px solid #353d4e;border-radius:0}
.decade-picks::-webkit-scrollbar-thumb{border:2px solid #16181c;border-radius:0}
</style>`);
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
