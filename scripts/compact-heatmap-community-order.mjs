import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original;
const sizing="$('eraTable').style.minWidth=(150+data.eras.length*38)+'px';";
if(!page.includes(sizing))throw Error('Heatmap sizing not found');
page=page.replace(sizing,"$('eraTable').style.minWidth=(136+data.eras.length*28)+'px';");
page=page.replace('</head>',`<style>
/* Compact year columns fit the sample library; longer timelines still overflow. */
.era-table{border-spacing:2px 3px;font-size:12px}
.era-table th{padding:4px 1px}
.era-table th:first-child{width:132px;padding-right:6px}
.era-table thead th:not(:first-child){font-size:11px;letter-spacing:-.3px}
.era-table th small{font-size:10px;margin-top:1px}
.era-cell{min-height:28px;padding:2px 0;font-size:11px;border-radius:3px}
.era-panel .panel-sub::after{content:" Wider timelines can be scrolled horizontally."}
</style></head>`);
const sort='.sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title)),most:';
if(!page.includes(sort))throw Error('Decade title sort not found');
page=page.replace(sort,'.sort((a,b)=>(Number.isFinite(b.communityRating)&&b.communityRating>0?b.communityRating:-1)-(Number.isFinite(a.communityRating)&&a.communityRating>0?a.communityRating:-1)||a.title.localeCompare(b.title)),most:');
page=page.replace('Missing years are not assigned to a decade.\';','Missing years are not assigned to a decade. Titles are ordered by Backloggd average, highest first; missing averages appear last.\';');
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
console.log('Compacted heatmap and sorted decade titles by Backloggd average.');
