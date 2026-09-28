import {writeFile} from 'node:fs/promises';
import {page} from '../dist/server/page.js';

const existing = '<div class="filehint">Developer and publisher credits, logos, genres, and game modes come from IGDB; a game counts once for each credited developer. Game metadata is saved in this browser for faster repeat lookups.</div>';
const replacement = '<div class="filehint">Backloggd Atlas is an independent fan project and is not affiliated with or endorsed by Backloggd, IGDB, or Metacritic.</div><div class="filehint">Library information, user ratings, community ratings, and average playtimes come from <a href="https://www.backloggd.com/">Backloggd</a>. Additional game metadata comes from <a href="https://www.igdb.com/">IGDB</a>. Critic scores come from <a href="https://www.metacritic.com/">Metacritic</a>.</div><div class="filehint">A game counts once for each credited developer. Game metadata is saved in this browser for faster repeat lookups.</div>';
if (!page.includes(existing)) throw new Error('Expected footer was not found.');
await writeFile(new URL('../dist/server/page.js', import.meta.url), 'export const page = ' + JSON.stringify(page.replace(existing, replacement)) + ';\n');
