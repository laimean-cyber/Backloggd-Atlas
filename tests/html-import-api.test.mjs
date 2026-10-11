import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../dist/server/index.js';

test('HTML import metadata never falls back to challenged Backloggd pages for unmatched IGDB slugs', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('oauth2/token')) return Response.json({access_token:'test',expires_in:3600});
    if (String(url).includes('api.igdb.com')) return Response.json([]);
    throw Error('Unexpected upstream: ' + url);
  };
  try {
    const response = await app.fetch(new Request('https://test/api/metadata?igdbOnly=1&path=/games/html-import-unmatched/'), {IGDB_CLIENT_ID:'html-import-test',IGDB_CLIENT_SECRET:'test'});
    const data = await response.json();
    assert.equal(data.details[0].failed,true);
    assert.match(data.details[0].error,/No matching IGDB/);
    assert.equal(calls.some(url => new URL(url).hostname === 'backloggd.com'),false);
    assert.ok(calls.some(url => url.includes('api.igdb.com')));
    assert.equal(response.headers.get('cache-control'),'no-store');
  } finally {globalThis.fetch = original;}
});
