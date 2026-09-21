import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommunityRating} from '../dist/server/community.js';
import worker from '../dist/server/index.js';
test('Backloggd average is scoped to the game rating, not user reviews',()=>{
 assert.equal(parseCommunityRating('<h1>5</h1><div class="col game-rating" id="game-rating"><p>Avg Rating</p><h1 class="text-center">4.5</h1></div><h1>1</h1>'),4.5);
 for(const value of ['','—','0','6'])assert.equal(parseCommunityRating('<div id="game-rating"><h1>'+value+'</h1></div>'),null);
 assert.equal(parseCommunityRating('<h1>4.5</h1>'),null);
});
test('community API validates paths and returns sourced averages',async()=>{
 assert.equal((await worker.fetch(new Request('https://atlas.test/api/community?path=https://example.com'))).status,400);
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('<html>Backloggd<div id="game-rating"><h1>3.8</h1></div></html>');
 try{const response=await worker.fetch(new Request('https://atlas.test/api/community?path=/games/example/'));const {ratings}=await response.json();assert.equal(ratings[0].communityRating,3.8);assert.equal(ratings[0].path,'/games/example/');assert(ratings[0].communityFetchedAt>0)}finally{globalThis.fetch=original}
});
test('cache storage failures do not discard retrieved ratings',async()=>{
 const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;
 globalThis.fetch=async()=>new Response('<html>Backloggd<div id="game-rating"><h1>4.2</h1></div></html>');
 globalThis.caches={default:{match:async()=>{throw Error('cache unavailable')},put:async()=>{throw Error('cache unavailable')}}};
 try{const response=await worker.fetch(new Request('https://atlas.test/api/community?path=/games/example/'));const {ratings}=await response.json();assert.equal(ratings[0].communityRating,4.2);assert.equal(ratings[0].failed,undefined)}finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches}
});
