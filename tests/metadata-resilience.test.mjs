import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../dist/server/index.js';
import {cached} from '../dist/server/cache.js';
import {metadataFresh} from '../dist/server/metadata.js';
import {page} from '../dist/server/page.js';

const env={IGDB_CLIENT_ID:'resilience-tests',IGDB_CLIENT_SECRET:'test'};
const request=slug=>new Request(`https://test/api/details?path=/games/${slug}/`);
const game={id:80,first_release_date:1193702400,involved_companies:[{developer:true,company:{name:'CD Projekt RED'}}]};
async function fixture(backlogStatus, igdbStatus, run) {
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,options)=>{
    calls.push(String(url));
    if(String(url).includes('oauth2/token'))return Response.json({access_token:'test',expires_in:3600});
    if(String(url).includes('api.igdb.com'))return Response.json([...options.body.matchAll(/"([a-z0-9-]+)"/g)].map(([,slug])=>({...game,slug})),{status:igdbStatus});
    return new Response('<title>Backloggd</title><div class="game-subtitle"><a class="game-year">2007</a></div>',{status:backlogStatus});
  };
  try {await run(calls);}finally{globalThis.fetch=original;}
}

test('Backloggd 503 still returns IGDB metadata and expires the degraded result quickly',async()=>{
  await fixture(503,200,async()=>{
    const response=await app.fetch(request('outage'),env);
    const {details,failed}=await response.json();
    assert.equal(failed,0);
    assert.equal(details[0].year,2007);
    assert.deepEqual(details[0].developers,['CD Projekt RED']);
    assert.equal(details[0].warning.status,503);
    assert.match(details[0].warning.error,/Backloggd.*503/);
    assert.equal(metadataFresh(details[0]),true);
    assert.equal(metadataFresh(details[0],Date.now()+61000),false);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('vercel-cdn-cache-control'),null);
  });
});

test('Vercel runtime reuses successful metadata across requests without Workers cache',async()=>{
  await fixture(200,200,async calls=>{
    const responses=await Promise.all([app.fetch(request('cached'),env),app.fetch(request('cached'),env)]);
    const count=calls.length;
    const response=await app.fetch(request('cached'),env);
    assert.equal(calls.length,count);
    assert.equal(calls.filter(url=>url.includes('api.igdb.com')).length,1);
    assert.match(response.headers.get('vercel-cdn-cache-control'),/s-maxage=3600/);
    assert.equal((await response.json()).failed,0);
    for(const item of responses)assert.equal((await item.json()).failed,0);
  });
});

test('IGDB failures preserve diagnostics, remain uncached, and recover on retry',async()=>{
  await fixture(200,503,async()=>{
    const response=await app.fetch(request('retryable'),env);
    const data=await response.json();
    assert.equal(data.details[0].status,503);
    assert.match(data.details[0].error,/IGDB/);
    assert.equal(response.headers.get('cache-control'),'no-store');
  });
  await fixture(200,200,async()=>assert.equal((await(await app.fetch(request('retryable'),env)).json()).failed,0));
});

test('runtime cache expires, deduplicates concurrent work, and isolates caller mutations',async()=>{
  let calls=0;
  const load=async()=>({value:++calls});
  const results=await Promise.all([cached('unit',load),cached('unit',load)]);
  results[0].value=99;
  assert.equal(results[1].value,1);
  assert.equal((await cached('unit',load)).value,1);
  await cached('expired',load,0);
  await cached('expired',load,0);
  assert.equal(calls,3);
});

test('browser shows server failure reasons and clears fallback warnings after recovery',async()=>{
  const code=page.slice(page.indexOf('async function loadDetails(all)'),page.indexOf('async function refreshDefaultMetadata()'));
  let answer;
  const load=new Function('api','$','sleep','saveMetadata','render','renderCommunity','metadataFresh','let metadataLoading=false;'+code+';return loadDetails;')(
    async()=>answer,()=>({textContent:''}),async()=>{},()=>{},()=>{},()=>{},metadataFresh);
  const games=[{path:'/games/browser/'}];
  answer={details:[{path:games[0].path,failed:true,error:'IGDB authentication failed.'}]};
  await load(games);
  assert.equal(games[0].metadataError,'IGDB authentication failed.');
  await fixture(200,200,async()=>{answer=await(await app.fetch(request('browser'),env)).json();});
  Object.assign(games[0],{warning:{error:'Backloggd unavailable'},metadataRetryAt:1});
  await load(games);
  assert.equal(games[0].metadataError,undefined);
  assert.equal(games[0].warning,undefined);
  assert.equal(games[0].metadataRetryAt,undefined);
  assert.equal(metadataFresh(games[0]),true);
});
