import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
const old='top:ratedGames.sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title)).slice(0,5)';
if(!page.includes(old))throw new Error('Decade selection not found');
page=page.replace(old,'top:ratedGames.filter(g=>g.rating===5||g.rating===4.5).sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title))');
page=page.replace('Your highest-rated games, defining developers and dominant genres, era by era.','Your 5- and 4.5-star games, defining developers and dominant genres, era by era.');
page=page.replace('Highest-rated games use your ratings, with ties ordered by title.','Game highlights include every game you rated 5 or 4.5 stars, ordered by rating then title.');
page=page.replace('<h4 class="decade-label">Highest-rated games</h4>', '<h4 class="decade-label">5 &amp; 4.5-star games <span class="decade-scroll-hint">Scroll to explore</span></h4>');
page=page.replace('<ol class="decade-picks">','<ol class="decade-picks" tabindex="0" aria-label="5 and 4.5 star games; scroll horizontally to explore">');
page=page.replace('No rated games from this decade yet.','No 5- or 4.5-star games from this decade yet.');
page=page.replace('</style>',`
.decade-picks{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:calc((100% - 48px)/5);overflow-x:auto;padding-bottom:10px;scroll-snap-type:x proximity;scrollbar-width:thin;scrollbar-color:#ea377a #16181c}.decade-picks>li{scroll-snap-align:start}.decade-picks:focus-visible{outline:2px solid #f276a4;outline-offset:4px}.decade-label{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.decade-scroll-hint{font-size:.72rem;color:#a3acb5;font-weight:400}.decade-row:has(.decade-picks>li:nth-child(6)) .decade-scroll-hint{display:inline}.decade-scroll-hint{display:none}
@media(max-width:600px){.decade-picks{grid-template-columns:none;grid-auto-columns:132px}.decade-row:has(.decade-picks>li:nth-child(3)) .decade-scroll-hint{display:inline}}
</style>`);
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
