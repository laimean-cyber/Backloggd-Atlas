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

const html = readFileSync('dist/index.html', 'utf8');
const helpers = html.slice(html.indexOf('function companiesFor(g)'), html.indexOf('function render()'));
const { groups } = new Function('avg', `${helpers};return { groups }`)(scores => scores.reduce((a, b) => a + b, 0) / scores.length);
const items = [
  { title: 'A', companies: ['First Studio', 'Second Studio', 'First Studio'], rating: 4 },
  { title: 'B', companies: ['Second Studio'], rating: 5 },
];
assert.deepEqual(groups(items, 'companies').map(g => [g.name, g.count]), [['First Studio', 1], ['Second Studio', 2]]);
console.log('Metadata parsing and transient failure tests passed');
