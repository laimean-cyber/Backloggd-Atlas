import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../dist/server/index.js';
import { page } from '../dist/server/page.js';
import { metadataFresh } from '../dist/server/metadata.js';

const env = { IGDB_CLIENT_ID: 'throughput-test', IGDB_CLIENT_SECRET: 'test' };
const paths = Array.from({ length: 40 }, (_, i) => `/games/fast-${i}/`);

test('forty games use one IGDB query and do not wait for Backloggd', async () => {
  const original = globalThis.fetch;
  let igdbCalls = 0, backlogCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('oauth2/token')) return Response.json({ access_token: 'test', expires_in: 3600 });
    if (String(url).includes('api.igdb.com')) {
      igdbCalls++;
      const slugs = [...options.body.matchAll(/"(fast-\d+)"/g)].map(match => match[1]);
      return Response.json(slugs.map((slug, id) => ({ id: id + 1, slug, genres: [{ name: 'Action' }] })));
    }
    backlogCalls++;
    throw Error('Backloggd should not be needed for matching slugs');
  };
  try {
    const query = new URLSearchParams;
    paths.forEach(path => query.append('path', path));
    const response = await app.fetch(new Request(`https://test/api/metadata?${query}`), env);
    const result = await response.json();
    assert.equal(result.failed, 0);
    assert.equal(result.details.length, 40);
    assert.equal(igdbCalls, 1);
    assert.equal(backlogCalls, 0);
    assert.ok(result.details.every(detail => metadataFresh(detail)));
  } finally { globalThis.fetch = original; }
});

test('browser requests forty metadata records before starting Backloggd enrichment', async () => {
  const code = page.slice(page.indexOf('async function loadFastMetadata(all)'), page.indexOf('async function refreshDefaultMetadata()'));
  const games = paths.map(path => ({ path, rating: 4 }));
  const calls = [];
  const load = new Function('games', 'api', '$', 'sleep', 'saveMetadata', 'render', 'renderCommunity', 'metadataFresh', 'profileNotice',
    'let metadataLoading=false,backlogLoading=false,backlogJob=0;'+code+';return loadFastMetadata;')(
    games,
    async path => {
      calls.push(path);
      if (path.startsWith('/api/details?')) return { details: [] };
      const requested = new URL('https://test' + path).searchParams.getAll('path');
      return { details: requested.map(path => ({ path, checked: true, metadataVersion: 1, metadataFetchedAt: Date.now(), gameType: null, developers: [], publishers: [], genres: [], gameModes: [], playerPerspectives: [], themes: [], franchises: [], gameEngines: [] })) };
    },
    () => ({ textContent: '' }), async () => {}, () => {}, () => {}, () => {}, metadataFresh, () => {});
  const result = await load(games);
  assert.equal(result.metadataIncomplete, false);
  assert.equal(calls.filter(path => path.startsWith('/api/metadata?')).length, 1);
  assert.equal(new URL('https://test' + calls[0]).searchParams.getAll('path').length, 40);
});
