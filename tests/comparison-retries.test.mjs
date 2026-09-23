import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {page} from '../dist/server/page.js';
const source=page.slice(page.indexOf('  async function comparisonBatch('),page.indexOf('  var criticsPaused='));
function setup(respond){
  const calls=[],waits=[],batch=[{path:'/games/a/',title:'A'},{path:'/games/b/',title:'B'}];
  const context=vm.createContext({games:batch,AbortController,URL,console,$:()=>({}),setTimeout:(fn,ms)=>{if(ms!==30000){waits.push(ms);queueMicrotask(fn)}return 1},clearTimeout:()=>{},fetch:async url=>{calls.push(url);return respond(calls.length,url,context)},Math,Date});
  vm.runInContext(source,context);
  return {context,calls,waits,run:kind=>context.comparisonBatch(kind,batch)};
}
const response=(ratings,status=200,header=null)=>({ok:status===200,status,headers:{get:()=>header},json:async()=>({ratings})});
for(const kind of ['community','critics']){
  test(kind+': retries only failed games and recovers',async()=>{
    const s=setup(n=>response(n===1?[{path:'/games/a/',rating:3},{path:'/games/b/',failed:true,status:503}]:[{path:'/games/b/',rating:4}]));
    const result=await s.run(kind);assert.equal(result.ratings.length,2);assert.equal(s.calls.length,2);assert(!s.calls[1].includes(encodeURIComponent('/games/a/')));assert(s.waits[0]>=5000);
  });
  test(kind+': network failures stop after three requests',async()=>{
    const s=setup(()=>{throw Error('offline')});await assert.rejects(s.run(kind),/offline/);assert.equal(s.calls.length,3);assert.equal(s.waits.length,2);assert(s.waits[1]>=10000);
  });
  test(kind+': rate limits honor server cooldown and stop',async()=>{
    const s=setup(()=>response([],429,'90'));await assert.rejects(s.run(kind));assert.equal(s.calls.length,3);assert(s.waits[0]>=90000);assert(s.waits[1]>=120000);
  });
  test(kind+': permanent failures and unavailable scores do not retry',async()=>{
    const s=setup(()=>response([{path:'/games/a/',failed:true,status:404},{path:'/games/b/',communityRating:null,criticRating:null}]));await s.run(kind);assert.equal(s.calls.length,1);
  });
  test(kind+': missing results have a finite retry budget',async()=>{
    const s=setup(()=>response([]));const result=await s.run(kind);assert.equal(s.calls.length,3);assert(result.ratings.every(r=>r.failed));
  });
  test(kind+': library change cancels obsolete work',async()=>{
    const s=setup((n,url,ctx)=>{ctx.games=[];return response([])});await s.run(kind);assert.equal(s.calls.length,1);assert.equal(s.waits.length,0);
  });
  test(kind+': cooldown longer than five minutes does not schedule retries',async()=>{
    const s=setup(()=>response([],429,'600'));await assert.rejects(s.run(kind));assert.equal(s.calls.length,1);
  });
}
