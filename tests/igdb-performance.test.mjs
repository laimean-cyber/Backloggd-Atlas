import test from 'node:test';
import assert from 'node:assert/strict';
import { metadataBatch, igdbDetails, query } from '../dist/server/igdb.js';
import app from '../dist/server/index.js';

const env = { IGDB_CLIENT_ID: 'performance', IGDB_CLIENT_SECRET: 'test' };
async function fixture(run, handler) {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('oauth2/token')) return Response.json({ access_token: 'test', expires_in: 3600 });
    if (!String(url).includes('api.igdb.com')) return new Response('<div class="game-subtitle"></div>');
    calls.push({ body: options.body, time: Date.now() });
    if (handler) return handler(options.body, calls.length);
    const slugs = [...options.body.matchAll(/"([a-z0-9-]+)"/g)].map(([, slug]) => slug);
    return Response.json(slugs.reverse().map((slug, id) => ({ id: id + 1, slug, genres: [{ name: slug }] })));
  };
  try { await run(calls); } finally { globalThis.fetch = original; }
}
test('four API games use one query; mixed warm, duplicate and cold paths do not stall', async () => {
  await fixture(async calls => {
    const request = paths => app.fetch(new Request('https://test/api/details?' + paths.map(p => 'path=/games/' + p + '/').join('&')), env).then(r => r.json());
    const first = await request(['one', 'two', 'three', 'four']);
    assert.equal(first.failed, 0);
    assert.equal(calls.length, 1);
    assert.deepEqual(first.details.map(d => d.genres[0]), ['one', 'two', 'three', 'four']);
    const second = await request(['one', 'five', 'five', 'two']);
    assert.equal(second.failed, 0);
    assert.equal(calls.length, 2);
    assert.match(calls[1].body, /where slug = \("five"\)/);
  });
});
test('canonical slugs deduplicate across batches and IGDB cache survives details retries', async () => {
  await fixture(async calls => {
    const a = metadataBatch(env, 2), b = metadataBatch(env, 1);
    const first = igdbDetails('/games/alias/', 'https://igdb.com/games/canonical', env, a);
    const duplicate = igdbDetails('/games/canonical/', '', env, b);
    b.ready(); a.ready(); a.ready();
    assert.deepEqual(await first, await duplicate);
    assert.equal(calls.length, 1);
    const again = metadataBatch(env, 1);
    const hit = igdbDetails('/games/canonical/', '', env, again); again.ready();
    assert.equal((await hit).igdbId, 1);
    assert.equal(calls.length, 1);
  });
});
test('missing batch matches fail individually and are not cached', async () => {
  await fixture(async calls => {
    for (let i = 0; i < 2; i++) {
      const batch = metadataBatch(env, 1);
      const result = batch.lookup('missing'); batch.ready();
      await assert.rejects(result, /No matching IGDB/);
    }
    assert.equal(calls.length, 2);
  }, () => Response.json([]));
});
test('429 honors shared cooldown and retries only once', async () => {
  await fixture(async calls => {
    await assert.rejects(query('rate-test', env), error => error.status === 429);
    assert.equal(calls.length, 2);
    assert.ok(calls[1].time - calls[0].time >= 1000);
  }, () => new Response('limited', { status: 429, headers: { 'Retry-After': '1' } }));
});
test('slow requests overlap while starts stay below four per second and eight open', async () => {
  let open = 0, max = 0;
  await fixture(async calls => {
    await Promise.all(Array.from({ length: 10 }, () => query('slow-test', env)));
    assert.ok(max > 1 && max <= 8);
    for (let i = 4; i < calls.length; i++) assert.ok(calls[i].time - calls[i - 4].time >= 1000);
  }, async () => {
    open++; max = Math.max(max, open);
    await new Promise(resolve => setTimeout(resolve, 2300));
    open--; return Response.json([]);
  });
});
