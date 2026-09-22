import { cached } from './cache.js';
let tokenState;
let tokenPending;
let requestQueue = Promise.resolve();
let nextRequest = 0;
const active = new Set();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function accessToken(env) {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) throw new Error('IGDB credentials are not configured.');
  if (tokenState?.client === env.IGDB_CLIENT_ID && tokenState.expires > Date.now()) return tokenState.token;
  if (!tokenPending) tokenPending = (async () => {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST', body: new URLSearchParams({ client_id: env.IGDB_CLIENT_ID, client_secret: env.IGDB_CLIENT_SECRET, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Object.assign(new Error('IGDB authentication failed.'), { status: response.status });
    const data = await response.json();
    tokenState = { client: env.IGDB_CLIENT_ID, token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return tokenState.token;
  })().finally(() => { tokenPending = null; });
  return tokenPending;
}

export async function query(body, env, retry = true, rateRetry = true) {
  const token = await accessToken(env);
  let work;
  await (requestQueue = requestQueue.catch(() => {}).then(async () => {
    while (active.size >= 8) await Promise.race(active);
    while (Date.now() < nextRequest) await sleep(nextRequest - Date.now());
    nextRequest = Date.now() + 275;
    work = (async () => {
      const response = await fetch('https://api.igdb.com/v4/games', { method: 'POST', headers: { 'Client-ID': env.IGDB_CLIENT_ID, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' }, body, signal: AbortSignal.timeout(15000) });
      if (response.status === 429) {
        const header = response.headers.get('retry-after');
        const delay = header && Number.isFinite(Number(header)) ? Number(header) * 1000 : Date.parse(header) - Date.now();
        nextRequest = Math.max(nextRequest, Date.now() + Math.max(1000, delay || 0));
      }
      // Keep the concurrency slot until the response body has been consumed.
      const data = response.ok ? await response.json() : (await response.text(), null);
      return { response, data };
    })();
    const settled = work.then(() => {}, () => {}).finally(() => active.delete(settled));
    active.add(settled);
  }));
  const { response, data } = await work;
  if (response.status === 401 && retry) { tokenState = null; return query(body, env, false, rateRetry); }
  if (response.status === 429 && rateRetry) return query(body, env, retry, false);
  if (!response.ok) { const error = new Error('IGDB game details are unavailable.'); error.status = response.status; throw error; }
  return data;
}

// One batch per API request, grouped only after each game's canonical slug is known.
export function metadataBatch(env, count) {
  const entries = new Map();
  let remaining = count;
  return {
    lookup(slug) {
      return cached(`igdb-v1:${env.IGDB_CLIENT_ID}:${slug}`, () => new Promise((resolve, reject) => {
        entries.set(slug, { resolve, reject });
      }));
    },
    ready() {
      if (--remaining !== 0 || !entries.size) return;
      const slugs = [...entries.keys()];
      query(`${metadataFields} where slug = (${slugs.map(slug => JSON.stringify(slug)).join(',')}); limit 500;`, env).then(games => {
        const bySlug = new Map(games.map(game => [game.slug, game]));
        for (const [slug, entry] of entries) {
          const game = bySlug.get(slug);
          if (game) entry.resolve(normalizeMetadata(game));
          else entry.reject(new Error('No matching IGDB game was found.'));
        }
      }).catch(error => { for (const entry of entries.values()) entry.reject(error); });
    },
  };
}

export const metadataFields = 'fields name,slug,first_release_date,game_type.type,genres.name,game_modes.name,player_perspectives.name,themes.name,franchise.name,franchises.name,game_engines.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.logo.image_id;';

export async function igdbDetails(path, html, env, batch) {
  const slug = path.split('/')[2];
  // Prefer the explicit IGDB link; Backloggd's internal game IDs are not IGDB IDs.
  const linkedSlug = html.match(/https?:\/\/(?:www\.)?igdb\.com\/games\/([a-z0-9-]+)/i)?.[1];
  if (batch) return batch.lookup(linkedSlug || slug);
  const matches = await query(`${metadataFields} where slug = ${JSON.stringify(linkedSlug || slug)}; limit 1;`, env);
  const game = matches[0];
  if (!game) throw new Error('No matching IGDB game was found.');
  return normalizeMetadata(game);
}

export function normalizeMetadata(game) {
  const credits = (game.involved_companies || []).filter(credit => credit.developer === true && credit.company?.name).map(credit => credit.company);
  return {
    year: Number.isFinite(game.first_release_date) ? new Date(game.first_release_date * 1000).getUTCFullYear() : null,
    metadataVersion: 1,
    metadataFetchedAt: Date.now(),
    gameType: typeof game.game_type?.type === 'string' ? game.game_type.type : null,
    publishers: [...new Set((game.involved_companies || []).filter(c => c.publisher === true && c.company?.name).map(c => c.company.name))],
    publisherLogos: Object.fromEntries((game.involved_companies || []).filter(c => c.publisher === true && c.company?.name && /^[a-zA-Z0-9_-]+$/.test(c.company.logo?.image_id || '')).map(c => [c.company.name, `https://images.igdb.com/igdb/image/upload/t_logo_med/${c.company.logo.image_id}.png`])),
    gameModes: [...new Set((game.game_modes || []).map(mode => mode.name).filter(Boolean))],
    playerPerspectives: [...new Set((game.player_perspectives || []).map(item => item.name).filter(Boolean))],
    themes: [...new Set((game.themes || []).map(item => item.name).filter(Boolean))],
    franchises: [...new Set([game.franchise, ...(game.franchises || [])].map(item => item?.name).filter(Boolean))],
    gameEngines: [...new Set((game.game_engines || []).map(item => item.name).filter(Boolean))],
    igdbId: game.id,
    developers: [...new Set(credits.map(company => company.name))],
    developerLogos: Object.fromEntries(credits.filter(company => /^[a-zA-Z0-9_-]+$/.test(company.logo?.image_id || '')).map(company => [company.name, `https://images.igdb.com/igdb/image/upload/t_logo_med/${company.logo.image_id}.png`])),
    genres: [...new Set((game.genres || []).map(genre => genre.name).filter(Boolean))],
  };
}
