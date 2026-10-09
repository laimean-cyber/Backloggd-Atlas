import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
const start=page.indexOf('  function decadeData('),end=page.indexOf('  function render(){',start);
let section=page.slice(start,end).replace('.slice(0,3),most:', '.slice(0,5),most:');
section=section.replace('<div class="decade-rating">\'+fmt(g.rating)+\' / 5</div>', '<div class="award-rating decade-rating" role="img" aria-label="\'+fmt(g.rating)+\' out of 5 stars" title="\'+fmt(g.rating)+\' out of 5 stars">\'+ratingStars(g.rating)+\'</div>');
if(!section.includes('award-rating decade-rating'))throw new Error('Rating replacement failed');
page=page.slice(0,start)+section+page.slice(end);
const css=`
/* Compact decade highlights share the awards panel's rating stars. */
.decade-row{grid-template-columns:105px minmax(0,1.8fr) minmax(260px,1fr);gap:20px;padding:20px 0}.decade-era h3{color:#ff5798;font-size:2rem}.decade-label{margin-bottom:9px}.decade-picks{grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.decade-cover{max-height:150px}.decade-pick-title{margin-top:7px;font-size:.78rem}.decade-facts{gap:12px 14px}.decade-facts>div:nth-child(-n+2) dd{color:#ff5798}.decade-facts dt{margin-bottom:4px}.decade-facts small{margin-top:3px}.decade-genres ul{gap:4px}.decade-comparison{padding-top:8px;line-height:1.45}.decade-rating.award-rating{gap:2px;height:18px;margin-top:5px}.decade-rating.award-rating .star-icon,.decade-rating.award-rating .star-icon>span svg{width:15px;height:15px}
@media(min-width:601px) and (max-width:1100px){.decade-row{grid-template-columns:90px minmax(0,1fr);gap:16px}.decade-facts{grid-column:2;grid-template-columns:repeat(2,minmax(0,1fr))}.decade-genres,.decade-comparison{grid-column:auto}.decade-comparison{border-top:0;padding-top:0}.decade-cover{max-height:150px}}
@media(max-width:600px){.decade-row{grid-template-columns:minmax(0,1fr);gap:14px;padding:18px 0}.decade-era h3{font-size:1.75rem}.decade-facts{grid-column:1;gap:12px}.decade-picks{grid-template-columns:repeat(5,104px);overflow-x:auto;padding-bottom:8px;scrollbar-width:thin;scrollbar-color:#ea377a #16181c}.decade-cover{max-height:none}.decade-pick-title{font-size:.75rem}.decade-rating.award-rating .star-icon,.decade-rating.award-rating .star-icon>span svg{width:17px;height:17px}}
`;
page=page.replace('</style>',css+'</style>');
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
