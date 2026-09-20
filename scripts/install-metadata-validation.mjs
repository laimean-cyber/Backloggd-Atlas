import fs from 'node:fs';
import {page} from '../dist/server/page.js';
import {metadataComplete,metadataFresh} from '../dist/server/metadata.js';
let html=page;
function replace(from,to){if(!html.includes(from))throw Error('Missing patch anchor: '+from.slice(0,90));html=html.replace(from,to);}
replace('  const metadataKey=',`  ${metadataComplete.toString()}\n  ${metadataFresh.toString()}\n  const metadataKey=`);
replace('metadata:igdb-v9:', 'metadata:igdb-v10:');
html=html.replace(/  function readMetadata\(path\)[^\r\n]+/,`  function readMetadata(path){try{const data=JSON.parse(localStorage.getItem(metadataKey(path)));if(metadataFresh(data))return data}catch{}return null}`);
replace('function saveMetadata(g){try{','function saveMetadata(g){if(!metadataComplete(g))return;try{');
replace('JSON.stringify({year:g.year??null,gameType:', 'JSON.stringify({metadataVersion:g.metadataVersion,metadataFetchedAt:g.metadataFetchedAt,year:g.year??null,gameType:');
replace('all.filter(g=>!g.checked)', 'all.filter(g=>!metadataFresh(g))');
replace('if(!detail||detail.failed)return true;', 'if(!detail||detail.failed||!metadataFresh(detail))return true;');
replace('all.some(g=>!g.checked)', 'all.some(g=>!metadataFresh(g))');
replace('checked=games.filter(g=>g.checked).length', 'checked=games.filter(g=>metadataFresh(g)).length');
replace('Some game pages could not be retrieved; retry to continue.', 'Some metadata is missing or out of date; retry to continue.');
// Preserve stored data while refreshing, and never let a failed refresh mark it complete.
replace("  let activeUsername=defaultUsername",`  async function refreshDefaultMetadata(){
    const current=games;
    current.forEach(g=>{const cached=readMetadata(g.path);if(cached&&(!metadataFresh(g)||cached.metadataFetchedAt>g.metadataFetchedAt))Object.assign(g,cached)});
    render();
    if(current.every(g=>metadataFresh(g)))return;
    profileNotice();
    await loadDetails(current);
    if(games===current){render();profileNotice()}
  }
  let activeUsername=defaultUsername`);
replace('render();loadFavourites(defaultUsername)};', 'render();loadFavourites(defaultUsername);refreshDefaultMetadata()};');
replace('catch{loadFavourites(defaultUsername)}}else', 'catch{loadFavourites(defaultUsername);refreshDefaultMetadata()}}else');
replace("else{$('username').value=defaultUsername;loadFavourites(defaultUsername)}", "else{$('username').value=defaultUsername;loadFavourites(defaultUsername);refreshDefaultMetadata()}");
fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
fs.writeFileSync('dist/index.html',html);
