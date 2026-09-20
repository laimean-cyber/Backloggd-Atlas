import test from 'node:test';
import assert from 'node:assert/strict';
import {page} from '../dist/server/page.js';
import {metadataComplete,metadataFresh} from '../dist/server/metadata.js';
import {normalizeMetadata} from '../dist/server/igdb.js';
import {validateLibrary} from '../scripts/validate-library.mjs';
import worker from '../dist/server/index.js';

const record=()=>({...normalizeMetadata({id:80,game_type:{type:'Main Game'},franchises:[{name:'The Witcher'}]}),checked:true});
const library=validateLibrary(page);

test('partial and legacy checked records are never complete; legitimate empty lists are valid',()=>{
  assert.equal(metadataComplete({checked:true}),false);
  for(const field of ['franchises','gameType','developers','gameEngines','metadataVersion','metadataFetchedAt']){
    const g=record();delete g[field];assert.equal(metadataComplete(g),false,field);
  }
  assert.equal(metadataComplete({...record(),franchises:[],gameType:null}),true);
  assert.equal(metadataFresh({...record(),metadataFetchedAt:Date.now()-8*86400000}),false);
  assert.equal(metadataFresh({...record(),metadataFetchedAt:Date.now()+86400000}),false);
});

test('franchise normalization includes primary and multiple franchises without duplicates',()=>{
  assert.deepEqual(normalizeMetadata({franchise:{name:'A'},franchises:[{name:'A'},{name:'B'}]}).franchises,['A','B']);
});

test('bundled Witcher membership and expansion exclusions are correct',()=>{
  const witcher=library.filter(g=>g.franchises?.includes('The Witcher'));
  assert.equal(witcher.length,6);
  const core=witcher.filter(g=>!['Expansion','DLC'].includes(g.gameType));
  assert.deepEqual(core.map(g=>g.path).sort(),['/games/the-witcher/','/games/the-witcher-enhanced-edition/','/games/the-witcher-2-assassins-of-kings/','/games/the-witcher-3-wild-hunt/'].sort());
  const ratings=core.map(g=>g.rating).filter(Number.isFinite);
  assert.equal(ratings.length,3);
  assert.equal(ratings.reduce((a,b)=>a+b)/ratings.length,4.5);
  assert.equal(library.filter(g=>g.franchises?.includes('Total War')&&!['Expansion','DLC'].includes(g.gameType)).length,8);
  assert.equal(library.filter(g=>g.franchises?.includes('Call of Duty')&&!['Expansion','DLC'].includes(g.gameType)).length,15);
});

test('build rejects a regressed checked snapshot and explicitly permits unresolved records',()=>{
  const bad=structuredClone(library);delete bad.find(g=>g.path==='/games/the-witcher/').franchises;
  assert.throws(()=>validateLibrary('const defaultLibrary='+JSON.stringify(bad)+';'),/incomplete metadata/);
  assert.ok(library.filter(g=>!metadataComplete(g)).every(g=>g.checked===false));
  assert.ok(page.includes(metadataComplete.toString()));
  assert.ok(page.includes(metadataFresh.toString()));
});

test('browser refresh retries checked-but-incomplete records and rejects partial successful responses',async()=>{
  const code=page.slice(page.indexOf('async function loadDetails(all)'),page.indexOf('async function refreshDefaultMetadata()'));
  let calls=0;
  const games=[{path:'/games/incomplete/',checked:true}, {path:'/games/partial-response/',checked:true}, {...record(),path:'/games/fresh/'}];
  const saved=[];
  const load=new Function('api','$','sleep','saveMetadata','render','metadataFresh',code+';return loadDetails;')(
    async url=>{calls++;const paths=new URL('https://test'+url).searchParams.getAll('path');assert.ok(!paths.includes('/games/fresh/'));return {details:paths.map(path=>path.includes('partial')?{path,checked:true}:{path,...record()})};},
    ()=>({textContent:''}),async()=>{},g=>saved.push(g.path),()=>{},metadataFresh);
  assert.equal((await load(games)).metadataIncomplete,true);
  assert.equal(calls,3);
  assert.deepEqual(saved,['/games/incomplete/']);
  assert.equal(metadataComplete(games[0]),true);
  assert.equal(metadataComplete(games[1]),false);
});

test('browser cache expires and cannot turn partial data into a complete record',()=>{
  const start=page.indexOf('const metadataKey=');
  const code=page.slice(start,page.indexOf('async function loadDetails(all)',start));
  const storage=new Map();const localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  const {readMetadata,saveMetadata}=new Function('localStorage','metadataComplete','metadataFresh',code+';return {readMetadata,saveMetadata};')(localStorage,metadataComplete,metadataFresh);
  saveMetadata({path:'/partial/',checked:true});assert.equal(storage.size,0);
  saveMetadata({...record(),path:'/valid/'});assert.equal(readMetadata('/valid/').franchises[0],'The Witcher');
  saveMetadata({...record(),path:'/expired/',metadataFetchedAt:Date.now()-8*86400000});assert.equal(readMetadata('/expired/'),null);
});

test('API ignores incomplete edge-cache hits and returns versioned source metadata',async()=>{
  const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;
  let writes=0;
  globalThis.caches={default:{match:async()=>Response.json({checked:true,franchises:[]}),put:async(key,response)=>{assert.equal(metadataFresh(await response.json()),true);writes++;}}};
  globalThis.fetch=async url=>{
    if(String(url).includes('oauth2/token'))return Response.json({access_token:'test',expires_in:3600});
    if(String(url).includes('api.igdb.com'))return Response.json([{id:80,game_type:{type:'Main Game'},franchises:[{name:'The Witcher'}]}]);
    return new Response('<title>Backloggd</title><div class="game-subtitle"><a class="game-year">2007</a></div>');
  };
  try{
    const result=await(await worker.fetch(new Request('https://test/api/details?path=/games/the-witcher/'),{IGDB_CLIENT_ID:'integrity-test',IGDB_CLIENT_SECRET:'test'})).json();
    assert.equal(result.failed,0);assert.equal(metadataFresh(result.details[0]),true);
    assert.deepEqual(result.details[0].franchises,['The Witcher']);assert.equal(writes,1);
  }finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
});
