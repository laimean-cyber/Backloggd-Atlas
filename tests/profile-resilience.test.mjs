import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackloggdClient} from '../dist/server/backloggd.js';
import app from '../dist/server/index.js';
import {page} from '../dist/server/page.js';

test('Backloggd shares concurrent HTML fetches and spaces different pages',async()=>{
  let time=1000; const starts=[];
  const client=createBackloggdClient({now:()=>time,sleep:async ms=>{time+=ms;},fetcher:async()=>{starts.push(time);return new Response('Backloggd');}});
  assert.deepEqual(await Promise.all([client('/a'),client('/a'),client('/b')]),['Backloggd','Backloggd','Backloggd']);
  assert.deepEqual(starts,[1000,1750]);
  await client('/a');assert.equal(starts.length,2);
  time+=300001;await client('/a');assert.equal(starts.length,3);
});

test('slow Backloggd responses overlap without exceeding the open-request cap',async()=>{
  const starts=[];let open=0,maxOpen=0;
  const client=createBackloggdClient({spacing:60,maxOpen:2,fetcher:async()=>{
    starts.push(Date.now());maxOpen=Math.max(maxOpen,++open);
    await new Promise(resolve=>setTimeout(resolve,230));open--;
    return new Response('Backloggd');
  }});
  await Promise.all(['/one','/two','/three','/four'].map(path=>client(path)));
  assert.equal(maxOpen,2);
  for(let i=1;i<starts.length;i++)assert.ok(starts[i]-starts[i-1]>=50);
});

test('403 and 429 have distinct diagnostics; cooldown protects other endpoints and honors Retry-After',async()=>{
  for(const status of [403,429]){
    let time=1000,calls=0;
    const client=createBackloggdClient({now:()=>time,sleep:async ms=>{time+=ms;},fetcher:async()=>{calls++;return calls===1?new Response('',{status,headers:{'retry-after':'120'}}):new Response('Backloggd');}});
    await assert.rejects(client('/profile'),e=>e.status===status&&e.retryAfter===120&&e.message.includes(String(status)));
    await assert.rejects(client('/game'),e=>e.status===status);
    assert.equal(calls,1);
    time+=120001;assert.equal(await client('/profile'),'Backloggd');assert.equal(calls,2);
  }
});

test('fresh browsers load a profile through the shared API without localStorage',async()=>{
  const original=globalThis.fetch;let requests=0;
  globalThis.fetch=async()=>{
    requests++;
    return new Response('<html>Backloggd<div class="game-cover" game_id="123"><a class="cover-link" href="/games/fresh-device/"><img alt="Fresh device game"></a><span data-rating="8"></span></div></html>');
  };
  try {
    const code=page.slice(page.indexOf('async function loadCards(username)'),page.indexOf('const libraryKey='));
    const api=async path=>{
      const response=await app.fetch(new Request('https://test'+path));
      assert.equal(response.status,200);
      assert.match(response.headers.get('vercel-cdn-cache-control'),/s-maxage=300/);
      return response.json();
    };
    const load=new Function('api','readLibrary','saveLibrary','readMetadata','$',code+';return loadCards;')(api,()=>null,()=>{},()=>null,()=>({textContent:''}));
    const first=await load('FreshDeviceTest');
    const second=await load('FreshDeviceTest');
    assert.equal(first.all[0].title,'Fresh device game');
    assert.equal(second.all[0].title,first.all[0].title);
    assert.equal(first.fromCache,false);assert.equal(second.fromCache,false);
    assert.equal(requests,1);
  }finally{globalThis.fetch=original;}
});

test('profile failures preserve upstream status and are never CDN cached',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('',{status:503});
  try{
    const response=await app.fetch(new Request('https://test/api/page?user=UnavailableTest&page=1'));
    assert.equal(response.status,502);
    assert.equal((await response.json()).status,503);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('vercel-cdn-cache-control'),null);
  }finally{globalThis.fetch=original;}
});
