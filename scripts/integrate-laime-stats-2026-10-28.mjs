import fs from 'node:fs';
import assert from 'node:assert/strict';
import {page} from '../dist/server/page.js';
import {validateLibrary} from './validate-library.mjs';
const library=validateLibrary(page),before=structuredClone(library);
const source=JSON.parse(fs.readFileSync('data/laime-playtime-source-2026-10-28.json','utf8'));
const averages={
 'thronebreaker-the-witcher-tales':3.8,'ghost-of-yotei-complete-edition':4.2,
 'control-resonant--1':4.3,'onimusha-way-of-the-sword':4.2,'the-witcher':3.3,
 'team-fortress-2':3.9,'need-for-speed-carbon':3.7,
 'need-for-speed-most-wanted':4.2,
 'need-for-speed-most-wanted-53b9fef3-adb4-41a0-8ca0-ffcbb0060467':3.1,
 'heroes-of-might-and-magic-iii-complete':4.4,
};
const counts={'thronebreaker-the-witcher-tales':3600,'ghost-of-yotei-complete-edition':270,'control-resonant--1':6100};
const now=Date.now(),changes=[];
for(const [slug,score] of Object.entries(averages)){
 const game=library.find(g=>g.path===`/games/${slug}/`);assert.ok(game,slug);
 game.communityRating=score;game.communityFetchedAt=now;
}
for(const [slug,count] of Object.entries(counts)){
 const game=library.find(g=>g.path===`/games/${slug}/`);assert.ok(game,slug);
 game.plays=count;game.playText=String(count);
}
assert.equal(new Set(source.entries.map(x=>x.path)).size,source.entries.length);
for(const entry of source.entries){
 const game=library.find(g=>g.path===entry.path);assert.ok(game,entry.path);
 const match=entry.timeText?.match(/^(\d+(?:\.\d+)?) hrs?$/);
 assert.ok(match||entry.timeText==='- hrs',`Unrecognized duration: ${entry.timeText}`);
 const hours=match?Number(match[1]):null;
 if(game.averageTimeHours!==hours)changes.push({path:game.path,title:game.title,before:game.averageTimeHours??null,after:hours});
 game.averageTimeHours=hours;
}
assert.deepEqual(library.map(g=>[g.path,g.rating,g.played]),before.map(g=>[g.path,g.rating,g.played]));
const rated=library.filter(g=>g.played!==false&&g.rating>0);
assert.equal(rated.filter(g=>g.communityRating>0).length,rated.length);
assert.equal(rated.filter(g=>g.plays>0).length,rated.length);
const next=page.replace(/const defaultLibrary=\[[^\r\n]+\];/,()=> 'const defaultLibrary='+JSON.stringify(library).replace(/</g,'\\u003c')+';');
validateLibrary(next);
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(next)+';\n');
fs.writeFileSync('dist/index.html',next);
fs.writeFileSync('laime-audit.json',JSON.stringify(library,null,2));
const report={updatedOn:'2026-10-28',source:'User-supplied averages and play counts; saved Backloggd Played list sorted by average playtime. HTML parsed as inert data.',communityAverages:averages,playCounts:counts,htmlGames:source.entries.length,numericHtmlTimes:source.entries.filter(e=>e.timeText!=='- hrs').length,unknownHtmlTimes:source.entries.filter(e=>e.timeText==='- hrs'),absentFromHtml:library.filter(g=>!source.entries.some(e=>e.path===g.path)).map(g=>({title:g.title,path:g.path,retainedAverageTimeHours:g.averageTimeHours??null})),timedGames:library.filter(g=>g.averageTimeHours>0).length,totalEstimatedHours:library.reduce((s,g)=>s+(g.averageTimeHours>0?g.averageTimeHours:0),0),ratedGames:rated.length,communityCompared:rated.filter(g=>g.communityRating>0).length,popularityCompared:rated.filter(g=>g.plays>0).length,changes};
fs.writeFileSync('data/laime-stats-integration-2026-10-28.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,changes:changes.length,unknownHtmlTimes:report.unknownHtmlTimes.length},null,2));
