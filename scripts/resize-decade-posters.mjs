import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
const oldCount="<p>'+d.list.length+' played · '+d.ratedCount+' rated</p>";
const newCount="<p class=\"decade-counts\"><span>'+d.list.length+' played</span><span>'+d.ratedCount+' rated</span></p>";
if(!page.includes(oldCount))throw new Error('Count markup missing');
page=page.replace(oldCount,newCount);
const oldGenre="'<li><span>'+esc(g.name)+'</span><span>'+g.count+' · '+Math.round(g.count/d.list.length*100)+'%</span></li>'";
const newGenre="'<li class=\"decade-genre\"><div class=\"decade-genre-caption\"><span>'+esc(g.name)+'</span><span title=\"'+g.count+' games\">'+Math.round(g.count/d.list.length*100)+'%</span></div><div class=\"decade-genre-track\" aria-hidden=\"true\"><i style=\"width:'+g.count/d.list.length*100+'%\"></i></div></li>'";
if(!page.includes(oldGenre))throw new Error('Genre markup missing');
page=page.replace(oldGenre,newGenre);
page=page.replace('</style>',`
/* Poster-led decades: compact supporting facts, proportional genre shares. */
.decade-row{grid-template-columns:90px minmax(0,1fr) 280px;gap:20px}.decade-counts span{display:block}.decade-picks{gap:12px}.decade-cover{width:100%;max-height:none}.decade-facts{gap:10px 12px}.decade-facts dd{font-size:.85rem;line-height:1.35}.decade-facts dt{font-size:.72rem}.decade-facts small{font-size:.72rem}.decade-genres ul{gap:9px}.decade-genres li.decade-genre{display:block}.decade-genre-caption{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:4px}.decade-genre-caption span:last-child{color:#f593b8;font-weight:650}.decade-genre-track{height:4px;background:#353d4e;border-radius:2px;overflow:hidden}.decade-genre-track i{display:block;height:100%;background:#ea377a;border-radius:2px}.decade-comparison{font-size:.76rem;line-height:1.4}.decade-comparison dt{margin-bottom:3px}
@media(min-width:601px) and (max-width:1100px){.decade-row{grid-template-columns:90px minmax(0,1fr)}.decade-facts{grid-column:2;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 20px}.decade-cover{max-height:none}}
@media(max-width:600px){.decade-row{grid-template-columns:minmax(0,1fr)}.decade-era{align-items:center}.decade-counts{text-align:right}.decade-picks{grid-template-columns:repeat(5,132px)}.decade-facts{grid-column:1}.decade-cover{max-height:none}}
</style>`);
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
