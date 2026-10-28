import fs from 'node:fs';
import assert from 'node:assert/strict';
import {page} from '../dist/server/page.js';
import {normalizeMetadata} from '../dist/server/igdb.js';
import {validateLibrary} from './validate-library.mjs';

const sources = JSON.parse(fs.readFileSync('data/laime-metadata-2026-10-28.json', 'utf8'));
const entries = [
  ['thronebreaker-the-witcher-tales', 3.5],
  ['unharvest', null],
  ['probably-stolen', null],
  ['abyssal-lapidary', null],
  ['battlefield-6', 3.5],
  ['ghost-of-yotei-complete-edition', 3.5],
];
const library = validateLibrary(page);
const additions = [];
const audit = [];
for (const [slug, rating] of entries) {
  const source = sources.find(g => g.slug === slug);
  assert.ok(source, `Missing exact IGDB match: ${slug}`);
  const path = `/games/${slug}/`;
  const existing = library.find(g => g.path === path);
  const game = existing || {id: String(source.id), path, title: source.name, played: true};
  Object.assign(game, normalizeMetadata(source), {rating, checked: true});
  if (slug === 'battlefield-6') game.liked = true;
  if (!existing) additions.push(game);
  audit.push({igdbId: source.id, path, title: source.name, rating,
    ...(game.liked ? {liked: true} : {}), action: existing ? 'updated' : 'added'});
}
library.unshift(...additions);
assert.equal(new Set(library.map(g => g.path)).size, library.length);
let next = page.replace(/const defaultLibrary=\[[^\r\n]+\];/, () =>
  'const defaultLibrary=' + JSON.stringify(library).replace(/</g, '\\u003c') + ';');
next = next.replaceAll('manually updated on 8 October 2026', 'manually updated on 28 October 2026');
validateLibrary(next);
fs.writeFileSync('dist/server/page.js', 'export const page = ' + JSON.stringify(next) + ';\n');
fs.writeFileSync('dist/index.html', next);
fs.writeFileSync('laime-audit.json', JSON.stringify(library, null, 2));
fs.writeFileSync('data/laime-manual-update-2026-10-28.json', JSON.stringify({
  updatedOn: '2026-10-28',
  source: 'User-provided Backloggd screenshot; exact game editions matched against IGDB.',
  notes: 'Unrated entries remain null. No log dates, completion statuses, playtimes, or community ratings inferred. The Battlefield 6 heart is recorded as liked, separately from profile favourites. Original Ghost of Yotei remains a separate existing entry.',
  entries: audit,
}, null, 2) + '\n');
console.log(`Added ${additions.length} games; library now contains ${library.length} entries.`);
