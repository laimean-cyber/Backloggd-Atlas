import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetascore } from '../dist/server/metacritic.js';
import worker from '../dist/server/index.js';

const gamePage = (name, score) => `<script type="application/ld+json">${JSON.stringify({ '@type': 'VideoGame', name, url: 'https://www.metacritic.com/game/control/', aggregateRating: { name: 'Metascore', bestRating: 100, ratingValue: score } })}</script><div>Other platform score: 91</div>`;

test('reads the main game Metascore and rejects a different game or invalid score', () => {
  assert.deepEqual(parseMetascore(gamePage('Control', 82), 'Control'), { score: 82, url: 'https://www.metacritic.com/game/control/' });
  assert.equal(parseMetascore(gamePage('Control: Ultimate Edition', 85), 'Control'), null);
  assert.equal(parseMetascore(gamePage('Control', 101), 'Control'), null);
});

test('critic API validates requests and preserves hundred-point precision', async () => {
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/critics?path=/games/control/'))).status, 400);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(gamePage('Control', 83));
  try {
    const response = await worker.fetch(new Request('https://atlas.test/api/critics?path=/games/control/&title=Control'));
    const { ratings } = await response.json();
    assert.equal(ratings[0].metascore, 83);
    assert.equal(ratings[0].criticRating, 4.15);
    assert.equal(ratings[0].url, 'https://www.metacritic.com/game/control/');
  } finally { globalThis.fetch = original; }
});
