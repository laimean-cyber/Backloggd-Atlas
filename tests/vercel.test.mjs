import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import handler from '../api/[...path].mjs';
import { page } from '../dist/server/page.js';

test('Vercel build publishes the current application page', async () => {
  await import('../scripts/build-vercel.mjs');
  const publishedPage = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const analytics = publishedPage.match(/<script>\s*window\.va =[\s\S]*?<\/script>\s*<script defer src="\/_vercel\/insights\/script\.js"><\/script>\n/);
  assert.ok(analytics, 'Published HTML must initialize and load Web Analytics');
  assert.equal(publishedPage.split('/_vercel/insights/script.js').length - 1, 1);
  assert.ok(publishedPage.indexOf(analytics[0]) < publishedPage.indexOf('</head>'));
  assert.equal(publishedPage.replace(analytics[0], ''), page);
  assert.match(page, /Backloggd Atlas/);
});

test('API requests reach backend validation rather than returning a hosting 404', async () => {
  for (const route of ['page', 'favourites', 'details']) {
    const response = await handler.fetch(new Request(`https://atlas.example/api/${route}`));
    assert.equal(response.status, 400, route);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('API adapter preserves query parameters and upstream results', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return new Response('<html>Backloggd<div class="game-cover" game_id="123"><a class="cover-link" href="/games/example/"><img alt="Example"></a><span data-rating="8"></span></div></html>');
  };
  try {
    const response = await handler.fetch(new Request('https://atlas.example/api/page?user=Laime&page=2'));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.page, 2);
    assert.equal(result.games[0].title, 'Example');
    assert.equal(result.games[0].rating, 4);
    assert.deepEqual(calls, ['https://backloggd.com/u/Laime/games?page=2']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('API adapter preserves method restrictions and unknown-route responses', async () => {
  assert.equal((await handler.fetch(new Request('https://atlas.example/api/page', { method: 'POST' }))).status, 405);
  assert.equal((await handler.fetch(new Request('https://atlas.example/api/missing'))).status, 404);
});
