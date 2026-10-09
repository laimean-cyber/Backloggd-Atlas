import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original.replace('Your 5- and 4.5-star games, defining developers and dominant genres, era by era.','Your highest rated games, defining developers and dominant genres, era by era.');
page=page.replace('</style>',`
/* Use a reserved native track instead of the browser's thin overlay scrollbar. */
.decade-picks{scrollbar-width:auto;scrollbar-color:auto;scrollbar-gutter:auto;scroll-snap-type:none;padding-bottom:8px}
.decade-picks::-webkit-scrollbar{height:14px}
.decade-picks::-webkit-scrollbar-track{background:#16181c;border:0;border-radius:7px}
.decade-picks::-webkit-scrollbar-thumb{background:#ea377a;border:0;border-radius:7px;min-width:40px}
.decade-picks::-webkit-scrollbar-thumb:hover{background:#f276a4}
</style>`);
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
