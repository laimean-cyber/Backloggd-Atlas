import fs from 'node:fs';
import worker from './dist/server/index.js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const username = process.argv[2] || 'gamelogd';
const pageResponse = await worker.fetch(new Request(`https://local.test/api/page?user=${encodeURIComponent(username)}&page=1`), env);
const page = await pageResponse.json();
if (!pageResponse.ok) throw new Error(page.error || `Library request failed (${pageResponse.status})`);
if (!Array.isArray(page.games) || page.games.length === 0) throw new Error('Library parser returned no games.');

const detailsResponse = await worker.fetch(new Request(`https://local.test/api/details?path=${encodeURIComponent(page.games[0].path)}`), env);
const details = await detailsResponse.json();
if (!detailsResponse.ok || details.failed !== 0 || !details.details?.[0]?.checked) throw new Error('Game details request failed.');

console.log(`Retrieved ${page.games.length} games; details loaded for ${page.games[0].title}.`);
