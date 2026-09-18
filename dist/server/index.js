import { igdbDetails } from './igdb.js';
import { page } from './page.js';

const origin = 'https://backloggd.com';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const decode = text => String(text || '').replace(/&#(?:x([0-9a-f]+)|(\d+));|&(#39|amp|quot|lt|gt|nbsp);/gi, (_, hex, dec, named) => hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(+dec) : ({ '#39': "'", amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ' }[named.toLowerCase()] || '')).trim();

async function upstream(path) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    response = await fetch(origin + path, { headers: { 'accept': 'text/html,application/xhtml+xml', 'accept-language': 'en-US,en;q=0.9', 'user-agent': 'Mozilla/5.0 (compatible; BackloggdAtlas/1.0)' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (response.status !== 429) break;
  }
  if (response.status === 404) throw new Error('Profile or game not found.');
  if (response.status === 403 || response.status === 429) { const error = new Error('Backloggd is limiting automated requests. Please try again later.'); error.status = response.status; throw error; }
  if (!response.ok) throw new Error('Backloggd is unavailable right now.');
  const html = await response.text();
  if (!html.includes('backloggd') && !html.includes('Backloggd')) throw new Error('Backloggd returned an unexpected page.');
  return html;
}

function parseCards(html) {
  const cards = [];
  // Backloggd removed the old `rating-hover` wrapper in September 2026.
  // The stable library-card marker is now `game-cover` plus `game_id`.
  const chunks = html.split(/(?=<div class="[^"]*\bgame-cover\b[^"]*"[^>]*\bgame_id="\d+")/).slice(1);
  for (const chunk of chunks) {
    const head = chunk.slice(0, 1700);
    const id = head.match(/\bgame_id="(\d+)"/);
    const path = head.match(/class="cover-link"[^>]*href="(\/games\/[^"?]+\/)"|href="(\/games\/[^"?]+\/)"[^>]*class="cover-link"/);
    const image = head.match(/<img[^>]*\balt="([^"]+)"/);
    const title = head.match(/class="game-text-centered"[^>]*>([^<]+)</);
    const rating = head.match(/\bdata-rating="([\d.]+)"/);
    if (id && path && (image || title)) cards.push({ id: id[1], path: path[1] || path[2], title: decode(image?.[1] || title?.[1]), rating: rating ? +rating[1] / 2 : null, year: null, developers: [], developerLogos: {}, played: true });
  }
  return cards;
}

function parseDetails(html) {
  const block = html.match(/class="[^"]*game-subtitle[^\"]*"[^>]*>([\s\S]{0,2200}?)<\/div>/i)?.[1];
  if (!block) throw new Error('Backloggd returned a game page without details.');
  const year = block.match(/class="game-year[^\"]*"[^>]*>\s*((?:19|20)\d{2})/i);
  const playText = html.match(/href="\/logs\/[^"<>]+\/plays\/"[\s\S]{0,500}?class="[^"]*log-counter-stat[^"]*"[^>]*>\s*([\d,.]+\s*[KMB]?)\s*</i)?.[1]?.replace(/\s+/g, '') || null;
  const amount = playText ? Number(playText.replace(/,/g, '').replace(/[KMB]$/i, '')) : NaN;
  const unit = playText?.match(/[KMB]$/i)?.[0]?.toUpperCase();
  const plays = Number.isFinite(amount) ? amount * ({ K: 1e3, M: 1e6, B: 1e9 }[unit] || 1) : null;
  const pageText = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ');
  const averageTimeText = pageText.match(/\b(\d+(?:\.\d+)?\s*(?:h(?:ours?)?|m(?:in(?:utes?)?)?))\s+average\b/i)?.[1]?.replace(/\s+/g, '') || null;
  const averageTimeValue = averageTimeText ? Number.parseFloat(averageTimeText) : NaN;
  const averageTimeHours = Number.isFinite(averageTimeValue) ? averageTimeValue * (/m(?:in(?:utes?)?)?$/i.test(averageTimeText) ? 1 / 60 : 1) : null;
  return { year: year ? +year[1] : null, plays, playText, averageTimeHours, checked: true };
}

async function gameDetails(path, env) {
  const cache = globalThis.caches?.default;
  const key = new Request(`https://backloggd-atlas.cache/igdb-v5${path}`);
  if (cache) { try { const hit = await cache.match(key); if (hit) return await hit.json(); } catch {} }
  const html = await upstream(path);
  const details = { ...parseDetails(html), ...await igdbDetails(path, html, env) };
  if (cache) { try { await cache.put(key, new Response(JSON.stringify(details), { headers: { 'cache-control': 'public, max-age=604800' } })); } catch {} }
  return details;
}

export default {
  async fetch(request, env = globalThis.process?.env || {}) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    if (url.pathname === '/' || url.pathname === '/index.html') return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    if (url.pathname === '/api/page') {
      const username = url.searchParams.get('user') || '';
      const pageNo = +(url.searchParams.get('page') || '1');
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(username) || !Number.isInteger(pageNo) || pageNo < 1 || pageNo > 100) return json({ error: 'Enter a valid Backloggd nickname.' }, 400);
      try {
        const html = await upstream(`/u/${encodeURIComponent(username)}/games?page=${pageNo}`);
        const games = parseCards(html);
        if (!games.length && pageNo === 1) throw new Error('No public games were found for this profile. Check the nickname or profile visibility.');
        return json({ games, page: pageNo });
      } catch (error) { return json({ error: error.message }, 502); }
    }
    if (url.pathname === '/api/details') {
      const paths = url.searchParams.getAll('path');
      if (!paths.length || paths.length > 4 || paths.some(p => !/^\/games\/[a-z0-9-]+\/$/.test(p))) return json({ error: 'Invalid game paths.' }, 400);
      const details = await Promise.all(paths.map(async path => { try { return { path, ...await gameDetails(path, env) }; } catch (error) { return { path, year: null, gameType: null, developers: [], developerLogos: {}, genres: [], publishers: [], publisherLogos: {}, gameModes: [], playerPerspectives: [], themes: [], franchises: [], gameEngines: [], failed: true, status: error.status || null }; } }));
      return json({ details, failed: details.filter(d => d.failed).length });
    }
    return new Response('Not found', { status: 404 });
  }
};
