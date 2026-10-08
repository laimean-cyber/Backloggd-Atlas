import { query } from './igdb.js';
import { cached } from './cache.js';

export function franchiseGames(name, env) {
  return cached(`franchise-v2:${env.IGDB_CLIENT_ID}:${name}`, async () => {
    const games = [];
    let cursor = 0;
    for (;;) {
      const batch = await query(`fields name,slug,first_release_date,cover.image_id,game_type.type; where (franchise.name = ${JSON.stringify(name)} | franchises.name = ${JSON.stringify(name)}) & first_release_date <= ${Math.floor(Date.now()/1000)} & version_parent = null & id > ${cursor}; sort id asc; limit 500;`, env);
      games.push(...batch.filter(g => !/dlc|downloadable content|pack|add[\s-]?on|season|bundle|update/i.test(g.game_type?.type || '')).map(g => ({
        igdbId: g.id, title: g.name, slug: g.slug, played: false,
        releaseDate: g.first_release_date,
        year: new Date(g.first_release_date * 1000).getUTCFullYear(),
        gameType: g.game_type?.type || null,
        cover: /^[a-zA-Z0-9_-]+$/.test(g.cover?.image_id || '') ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
      })));
      if (batch.length < 500) break;
      cursor = batch.at(-1).id;
    }
    return { games: games.sort((a,b) => a.releaseDate-b.releaseDate || a.title.localeCompare(b.title)) };
  }, 3600000);
}
