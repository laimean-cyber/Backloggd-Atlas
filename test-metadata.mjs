import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from './dist/server/index.js';

globalThis.fetch = async () => new Response(`<!doctype html><title>Backloggd</title><div class="game-subtitle"><a class="game-year" href="/games/foo/">2023</a><a href="/company/first/">First Studio</a>, <a href="/company/second/">Second Studio</a>, <a href="/company/first/">First Studio</a></div>`);
const url = 'https://atlas.test/api/details?path=%2Fgames%2Ffoo%2F';
const response = await worker.fetch(new Request(url));
const body = await response.json();
assert.equal(body.failed, 0);
assert.deepEqual(body.details[0].companies, ['First Studio', 'Second Studio']);
assert.equal(body.details[0].year, 2023);
assert.equal(body.details[0].checked, true);

globalThis.fetch = async () => new Response('Backloggd request limited', { status: 429 });
const failed = await (await worker.fetch(new Request(url))).json();
assert.equal(failed.failed, 1);
assert.equal(failed.details[0].status, 429);
globalThis.fetch = async () => new Response('<title>Backloggd</title><p>Temporary response without game details</p>');
const incompletePage = await (await worker.fetch(new Request(url))).json();
assert.equal(incompletePage.failed, 1, 'an incomplete HTML page must be retried later');

const html = readFileSync('dist/index.html', 'utf8');
const helpers = html.slice(html.indexOf('function companiesFor(g)'), html.indexOf('function render()'));
const { groups } = new Function('avg', `${helpers};return { groups }`)(scores => scores.reduce((a, b) => a + b, 0) / scores.length);
const items = [
  { title: 'A', companies: ['First Studio', 'Second Studio', 'First Studio'], rating: 4 },
  { title: 'B', companies: ['Second Studio'], rating: 5 },
];
assert.deepEqual(groups(items, 'companies').map(g => [g.name, g.count]), [['First Studio', 1], ['Second Studio', 2]]);
const detailsCode = html.slice(html.indexOf('async function loadDetails(all)'), html.indexOf('let activeUsername'));
const loadDetails = new Function('api', '$', 'sleep', 'saveMetadata', 'render', `${detailsCode};return loadDetails`)(
  async url => ({ details: new URL(`https://atlas.test${url}`).searchParams.getAll('path').map(path => path.endsWith('/bad/') ? { path, failed: true } : { path, year: 2023, companies: ['Studio'], checked: true }) }),
  () => ({ textContent: '' }), async () => {}, () => {}, () => {},
);
const library = ['bad', 'good-1', 'good-2', 'good-3', 'good-4', 'good-5', 'good-6', 'good-7'].map(path => ({ path: `/games/${path}/`, rating: 4 }));
const scan = await loadDetails(library);
assert.equal(scan.metadataIncomplete, true);
assert.equal(library.filter(game => game.checked).length, 7, 'a permanently failed game must not block later games');
const profileCode = html.slice(html.indexOf('async function loadCards(username)'), html.indexOf('const metadataKey'));
const storage = new Map();
const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
storage.set('backloggd-atlas:library:v1:tester', JSON.stringify({ games: [{ id: '1', path: '/games/cached/', title: 'Cached', rating: 4 }], savedAt: Date.now() - 3600000 }));
const loadCards = new Function('api', '$', 'readMetadata', 'localStorage', `${profileCode};return loadCards`)(
  async () => { throw new Error('Backloggd unavailable') }, () => ({ textContent: '' }), () => null, localStorage,
);
const cachedProfile = await loadCards('tester');
assert.equal(cachedProfile.fromCache, true);
assert.equal(cachedProfile.all[0].title, 'Cached');
console.log('Metadata parsing and transient failure tests passed');
