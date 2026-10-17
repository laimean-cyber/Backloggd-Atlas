import {readFileSync,writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';

// Backloggd averages supplied by the library owner on 2026-10-17.
const averages=new Map([
  ['/games/need-for-speed-most-wanted/',4.2],
  ['/games/half-life-2-episode-one/',3.9],
  ['/games/half-life-2-episode-two/',4.3],
]);
const fetchedAt=Date.now();
function update(games){
  for(const [path,rating] of averages){
    const matches=games.filter(g=>g.path===path);
    if(matches.length!==1)throw Error('Expected exactly one game for '+path);
    matches[0].communityRating=rating;
    matches[0].communityFetchedAt=fetchedAt;
  }
  return games;
}
const line=original.split('\n').find(s=>s.includes('const defaultLibrary='));
const start=line.indexOf('['),end=line.lastIndexOf(']')+1;
const games=update(JSON.parse(line.slice(start,end)));
let page=original.replace(line,line.slice(0,start)+JSON.stringify(games)+line.slice(end));
// Older metadata caches must not erase newer bundled community averages.
page=page.replace('function mergeGameMetadata(g,metadata){const cover=', 'function mergeGameMetadata(g,metadata){const community=Number.isFinite(g.communityFetchedAt)&&(!Number.isFinite(metadata.communityFetchedAt)||g.communityFetchedAt>metadata.communityFetchedAt)?{communityRating:g.communityRating,communityFetchedAt:g.communityFetchedAt}:null;const cover=');
page=page.replace('Object.assign(g,metadata);if(imported)', 'Object.assign(g,metadata);if(community)Object.assign(g,community);if(imported)');
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
writeFileSync('laime-audit.json',JSON.stringify(update(JSON.parse(readFileSync('laime-audit.json','utf8'))),null,2)+'\n');
console.log('Added all three supplied Backloggd averages.');
