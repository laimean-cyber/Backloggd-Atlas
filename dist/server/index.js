import { page } from './page.js';

const origin = 'https://backloggd.com';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const decode = text => String(text || '').replace(/&#(?:x([0-9a-f]+)|(\d+));|&(#39|amp|quot|lt|gt|nbsp);/gi, (_, hex, dec, named) => hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(+dec) : ({ '#39': "'", amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ' }[named.toLowerCase()] || '')).trim();

async function upstream(path) {
  const response = await fetch(origin + path, { headers: { 'accept': 'text/html,application/xhtml+xml', 'user-agent': 'BackloggdAtlas/1.0 (+personal profile dashboard)' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  if (response.status === 404) throw new Error('Profile or game not found.');
  if (response.status === 403 || response.status === 429) { const error = new Error('Backloggd is limiting automated requests. Please try again later.'); error.status = response.status; throw error; }
  if (!response.ok) throw new Error('Backloggd is unavailable right now.');
  const html = await response.text();
  if (!html.includes('backloggd') && !html.includes('Backloggd')) throw new Error('Backloggd returned an unexpected page.');
  return html;
}

function parseCards(html) {
  const cards = [];
  const chunks = html.split(/(?=<div class="[^"]*\brating-hover\b)/).slice(1);
  for (const chunk of chunks) {
    const head = chunk.slice(0, 1700);
    const id = head.match(/\bgame_id="(\d+)"/);
    const path = head.match(/class="cover-link"[^>]*href="(\/games\/[^"?]+\/)"|href="(\/games\/[^"?]+\/)"[^>]*class="cover-link"/);
    const image = head.match(/<img[^>]*\balt="([^"]+)"/);
    const title = head.match(/class="game-text-centered"[^>]*>([^<]+)</);
    const rating = head.match(/\bdata-rating="([\d.]+)"/);
    if (id && path && (image || title)) cards.push({ id: id[1], path: path[1] || path[2], title: decode(image?.[1] || title?.[1]), rating: rating ? +rating[1] / 2 : null, year: null, companies: [], played: true });
  }
  return cards;
}

function parseDetails(html) {
  const block = html.match(/class="[^"]*game-subtitle[^\"]*"[^>]*>([\s\S]{0,2200}?)<\/div>/i)?.[1] || '';
  const year = block.match(/class="game-year[^\"]*"[^>]*>\s*((?:19|20)\d{2})/i);
  const companies = [...new Set([...block.matchAll(/href="\/company\/[^"<>]+\/"[^>]*>([^<]+)<\/a>/g)].map(x => decode(x[1])).filter(Boolean))];
  return { year: year ? +year[1] : null, companies, checked: true };
}

async function gameDetails(path) {
  const cache = globalThis.caches?.default;
  const key = new Request(`https://backloggd-atlas.cache${path}`);
  if (cache) { try { const hit = await cache.match(key); if (hit) return await hit.json(); } catch {} }
  const details = parseDetails(await upstream(path));
  if (cache && (details.year || details.companies.length)) { try { await cache.put(key, new Response(JSON.stringify(details), { headers: { 'cache-control': 'public, max-age=2592000' } })); } catch {} }
  return details;
}

export default {
  async fetch(request) {
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
      const details = await Promise.all(paths.map(async path => { try { return { path, ...await gameDetails(path) }; } catch (error) { return { path, year: null, companies: [], failed: true, status: error.status || null }; } }));
      return json({ details, failed: details.filter(d => d.failed).length });
    }
    return new Response('Not found', { status: 404 });
  }
};
