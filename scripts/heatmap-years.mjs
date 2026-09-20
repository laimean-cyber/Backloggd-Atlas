import fs from 'node:fs';
import {page as source} from '../dist/server/page.js';
let page=source.replaceAll('Math.floor(+g.year/10)*10','+g.year')
 .replace("const eras=[...new Set(eligible.map(g=>+g.year))].sort((a,b)=>a-b),rows=new Map();","const knownYears=eligible.map(g=>+g.year),first=Math.min(...knownYears),last=Math.max(...knownYears),eras=knownYears.length?Array.from({length:last-first+1},(_,i)=>first+i):[],rows=new Map();")
 .replaceAll('by release decade','by release year')
 .replace("+era+'s</th>'","+era+'</th>'")
 .replace("+era+'s: '","+era+': '")
 .replace("$('eraTable').innerHTML='<caption>'","$('eraTable').style.minWidth=(180+data.eras.length*58)+'px';\n    $('eraTable').innerHTML='<caption>'")
 .replace('Release era × genre heatmap','Release year × genre heatmap')
 .replace('</style>', '.era-table th:first-child{position:sticky;left:0;background:#242832;z-index:1}.era-scroll{padding-bottom:8px}.era-table caption{position:sticky;left:0;text-align:left}.era-panel .panel-sub::after{content:" Scroll horizontally to explore every year."}@media(max-width:650px){.era-table th:first-child{width:150px}}\n</style>');
if(page===source)throw Error('No changes');
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
let test=fs.readFileSync('tests/era-heatmap.cjs','utf8').replace("year:2009","year:2000").replace("year:2005","year:2000").replace("rpg.locator('button').nth(1)","rpg.locator('button').nth(10)").replace("assert.equal(await rpg.locator('button').first().textContent(),'4.0');","assert.equal(await rpg.locator('button').count(),11);assert.deepEqual(await page.locator('.era-table thead th').allTextContents(),['Genre',...Array.from({length:11},(_,i)=>String(2000+i))]);assert.equal(await rpg.locator('button').first().textContent(),'4.0');").replace('decade boundaries','individual years and empty intervening years');
fs.writeFileSync('tests/era-heatmap.cjs',test);
