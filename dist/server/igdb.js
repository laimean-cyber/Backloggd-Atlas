let tokenState;
let tokenPending;
let requestQueue = Promise.resolve();
let nextRequest = 0;

async function accessToken(env) {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) throw new Error('IGDB credentials are not configured.');
  if (tokenState?.client === env.IGDB_CLIENT_ID && tokenState.expires > Date.now()) return tokenState.token;
  if (!tokenPending) tokenPending = (async () => {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST', body: new URLSearchParams({ client_id: env.IGDB_CLIENT_ID, client_secret: env.IGDB_CLIENT_SECRET, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('IGDB authentication failed.');
    const data = await response.json();
    tokenState = { client: env.IGDB_CLIENT_ID, token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return tokenState.token;
  })().finally(() => { tokenPending = null; });
  return tokenPending;
}

async function query(body, env, retry = true) {
  const token = await accessToken(env);
  const response = await (requestQueue = requestQueue.catch(() => {}).then(async () => {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, nextRequest - Date.now())));
    nextRequest = Date.now() + 275;
    return fetch('https://api.igdb.com/v4/games', { method: 'POST', headers: { 'Client-ID': env.IGDB_CLIENT_ID, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' }, body, signal: AbortSignal.timeout(15000) });
  }));
  if (response.status === 401 && retry) { tokenState = null; return query(body, env, false); }
  if (!response.ok) { const error = new Error('IGDB game details are unavailable.'); error.status = response.status; throw error; }
  return response.json();
}

export async function igdbDetails(path, html, env) {
  const slug = path.split('/')[2];
  // Prefer the explicit IGDB link; Backloggd's internal game IDs are not IGDB IDs.
  const linkedSlug = html.match(/https?:\/\/(?:www\.)?igdb\.com\/games\/([a-z0-9-]+)/i)?.[1];
  const fields = 'fields name,slug,genres.name,game_modes.name,player_perspectives.name,themes.name,franchises.name,game_engines.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.logo.image_id;';
  const matches = await query(`${fields} where slug = ${JSON.stringify(linkedSlug || slug)}; limit 1;`, env);
  const game = matches[0];
  if (!game) throw new Error('No matching IGDB game was found.');
  const credits = (game.involved_companies || []).filter(credit => credit.developer === true && credit.company?.name).map(credit => credit.company);
  return {
    publishers: [...new Set((game.involved_companies || []).filter(c => c.publisher === true && c.company?.name).map(c => c.company.name))],
    publisherLogos: Object.fromEntries((game.involved_companies || []).filter(c => c.publisher === true && c.company?.name && /^[a-zA-Z0-9_-]+$/.test(c.company.logo?.image_id || '')).map(c => [c.company.name, `https://images.igdb.com/igdb/image/upload/t_logo_med/${c.company.logo.image_id}.png`])),
    gameModes: [...new Set((game.game_modes || []).map(mode => mode.name).filter(Boolean))],
    playerPerspectives: [...new Set((game.player_perspectives || []).map(item => item.name).filter(Boolean))],
    themes: [...new Set((game.themes || []).map(item => item.name).filter(Boolean))],
    franchises: [...new Set((game.franchises || []).map(item => item.name).filter(Boolean))],
    gameEngines: [...new Set((game.game_engines || []).map(item => item.name).filter(Boolean))],
    igdbId: game.id,
    developers: [...new Set(credits.map(company => company.name))],
    developerLogos: Object.fromEntries(credits.filter(company => /^[a-zA-Z0-9_-]+$/.test(company.logo?.image_id || '')).map(company => [company.name, `https://images.igdb.com/igdb/image/upload/t_logo_med/${company.logo.image_id}.png`])),
    genres: [...new Set((game.genres || []).map(genre => genre.name).filter(Boolean))],
  };
}
