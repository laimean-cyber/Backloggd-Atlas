import { igdbDetails, metadataBatch } from './igdb.js';
import { page } from './page.js';
import { metadataFresh } from './metadata.js';
import { parseCommunityRating } from './community.js';
import { metacriticScore } from './metacritic.js';
import { cached } from './cache.js';

import { upstream } from './backloggd.js';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const decode = text => String(text || '').replace(/&#(?:x([0-9a-f]+)|(\d+));|&(#39|amp|quot|lt|gt|nbsp);/gi, (_, hex, dec, named) => hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(+dec) : ({ '#39': "'", amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ' }[named.toLowerCase()] || '')).trim();

function publicJson(data, seconds) {
  const response = json(data);
  response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage='+seconds);
  return response;
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

export function parseFavourites(html) {
  const start = html.search(/<div\b[^>]*\bid=["']profile-favorites["'][^>]*>/i);
  if (start < 0) return [];
  const remaining = html.slice(start);
  let depth = 0, end = 0;
  for (const tag of remaining.matchAll(/<\/?div\b[^>]*>/gi)) {
    depth += /^<\//.test(tag[0]) ? -1 : 1;
    if (depth === 0) { end = tag.index + tag[0].length; break; }
  }
  if (!end) throw new Error('Could not read the profile favourites.');
  const block = remaining.slice(0, end);
  return parseCards(block).map(game => {
    const card = block.split(/(?=<div class="[^"]*\bgame-cover\b)/).find(chunk => chunk.includes(`game_id="${game.id}"`)) || '';
    const img = card.match(/<img\b[^>]*>/i)?.[0] || '';
    const source = decode(img.match(/\bdata-src="([^"]+)"/i)?.[1] || img.match(/\bsrc="([^"]+)"/i)?.[1]);
    const image = source.startsWith('//') ? 'https:' + source : source;
    if (!/^https:\/\/images\.igdb\.com\//.test(image)) throw new Error('Could not read a favourite game poster.');
    return { path: game.path, title: game.title, image };
  });
}

function parseAverageTime(html) {
  const match = html.match(/class="[^"]*stat-value[^" ]*\s+element-revealed[^"]*"[^>]*>\s*([\d.]+)\s*(?:<small[^>]*>\s*(h|m)\s*<\/small>)?[\s\S]{0,240}?class="[^"]*label[^"]*"[^>]*>\s*average\s*</i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value * (match[2]?.toLowerCase() === 'm' ? 1 / 60 : 1) : null;
}

function parseDetails(html, averageTimeHours = parseAverageTime(html)) {
  const block = html.match(/class="[^"]*game-subtitle[^\"]*"[^>]*>([\s\S]{0,2200}?)<\/div>/i)?.[1];
  if (!block) throw new Error('Backloggd returned a game page without details.');
  const year = block.match(/class="game-year[^\"]*"[^>]*>\s*((?:19|20)\d{2})/i);
  const playText = html.match(/href="\/logs\/[^"<>]+\/plays\/"[\s\S]{0,500}?class="[^"]*log-counter-stat[^"]*"[^>]*>\s*([\d,.]+\s*[KMB]?)\s*</i)?.[1]?.replace(/\s+/g, '') || null;
  const amount = playText ? Number(playText.replace(/,/g, '').replace(/[KMB]$/i, '')) : NaN;
  const unit = playText?.match(/[KMB]$/i)?.[0]?.toUpperCase();
  const plays = Number.isFinite(amount) ? amount * ({ K: 1e3, M: 1e6, B: 1e9 }[unit] || 1) : null;
  return { year: year ? +year[1] : null, plays, playText, averageTimeHours, checked: true };
}

// Both metadata and community averages come from the same public game page.
// Keep only the small parsed result after the short-lived HTML cache expires.
async function gamePage(path) {
  return cached('backloggd-game-v1:'+path, async () => {
    const html = await upstream(path);
    let backlog = {}, parseError;
    try { backlog = parseDetails(html); } catch (error) { parseError = error.message; }
    return {
      backlog, parseError, metadataRetryAt: parseError ? Date.now() + 60000 : undefined,
      igdbLink: html.match(/https?:\/\/(?:www\.)?igdb\.com\/games\/[a-z0-9-]+/i)?.[0] || '',
      communityRating: parseCommunityRating(html),
      communityFetchedAt: Date.now(),
      averageTimeHours: parseAverageTime(html),
      statsPath: html.match(/\/fetch_game_stats\/\d+\/\d+\/?/)?.[0] || null,
    };
  }, 86400000);
}

async function gameDetails(path, env, batch) {
  let signaled = false;
  const ready = () => { if (!signaled) { signaled = true; batch.ready(); } };
  try {
    return await cached(`details-v8:${env.IGDB_CLIENT_ID || ''}:${path}`, () => fetchGameDetails(path, env, batch, ready), undefined, ready);
  } finally { ready(); }
}

async function fetchGameDetails(path, env, batch, ready) {
  const cache = globalThis.caches?.default;
  const key = new Request(`https://backloggd-atlas.cache/igdb-v8${path}`);
  if (cache) { try { const hit = await cache.match(key); if (hit) { const data = await hit.json(); if (metadataFresh(data)) return data; } } catch {} }
  let source, backlog = {}, warning;
  try {
    source = await gamePage(path);
    backlog = source.backlog;
    if (source.parseError) warning = { source: 'Backloggd', status: null, error: source.parseError };
  } catch (error) {
    warning = { source: 'Backloggd', status: error.status || null, error: error.message };
  }
  let averageTimeHours = source?.averageTimeHours ?? null;
  if (averageTimeHours == null && source?.statsPath) {
    try { averageTimeHours = await cached('backloggd-stats-v1:'+source.statsPath, async () => parseAverageTime(await upstream(source.statsPath, false)), 86400000); } catch {}
  }
  const metadataPending = igdbDetails(path, source?.igdbLink || '', env, batch);
  ready();
  const metadata = await metadataPending;
  const details = { ...metadata, plays: null, playText: null, ...backlog, year: backlog.year ?? metadata.year, averageTimeHours, checked: true };
  if (source) Object.assign(details, { communityRating: source.communityRating, communityFetchedAt: source.communityFetchedAt, backlogFetchedAt: source.communityFetchedAt });
  if (warning) Object.assign(details, { warning, metadataRetryAt: Date.now() + 60000 });
  if (cache && !warning) { try { await cache.put(key, new Response(JSON.stringify(details), { headers: { 'cache-control': 'public, max-age=604800' } })); } catch {} }
  return details;
}

export default {
  async fetch(request, env = globalThis.process?.env || {}) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    if (url.pathname === '/' || url.pathname === '/index.html') return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    if (url.pathname === '/api/favourites') {
      const username = url.searchParams.get('user') || '';
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(username)) return json({ error: 'Enter a valid Backloggd nickname.' }, 400);
      try { return publicJson(await cached('favourites:'+username.toLowerCase(), async () => ({ favourites: parseFavourites(await upstream(`/u/${encodeURIComponent(username)}/`)) }), 300000), 300); }
      catch (error) { return json({ error: error.message, status: error.status || null, retryAfter: error.retryAfter || null }, 502); }
    }
    if (url.pathname === '/api/page') {
      const username = url.searchParams.get('user') || '';
      const pageNo = +(url.searchParams.get('page') || '1');
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(username) || !Number.isInteger(pageNo) || pageNo < 1 || pageNo > 100) return json({ error: 'Enter a valid Backloggd nickname.' }, 400);
      try {
        const result = await cached('profile:'+username.toLowerCase()+':'+pageNo, async () => {
        const html = await upstream(`/u/${encodeURIComponent(username)}/games?page=${pageNo}`);
        const games = parseCards(html);
        if (!games.length && pageNo === 1) throw new Error('No public games were found for this profile. Check the nickname or profile visibility.');
        return { games, page: pageNo };
        }, 300000);
        return publicJson(result, 300);
      } catch (error) { return json({ error: error.message, status: error.status || null, retryAfter: error.retryAfter || null }, 502); }
    }
    if (url.pathname === '/api/community') {
      const paths = url.searchParams.getAll('path');
      if (!paths.length || paths.length > 4 || paths.some(p => !/^\/games\/[a-z0-9-]+\/$/.test(p))) return json({ error: 'Invalid game paths.' }, 400);
      const ratings = await Promise.all(paths.map(async path => {
        try {
          const cache = globalThis.caches?.default;
          const key = new Request('https://backloggd-atlas.cache/community-v1' + path);
          let hit = null;
          try { hit = cache ? await cache.match(key) : null; } catch {}
          if (hit) return await hit.json();
          const result = await cached('community:'+path, async () => {
            const source = await gamePage(path);
            return { path, communityRating: source.communityRating, communityFetchedAt: source.communityFetchedAt };
          }, 86400000);
          if (cache) { try { await cache.put(key, new Response(JSON.stringify(result), { headers: { 'cache-control': 'public, max-age=86400' } })); } catch {} }
          return result;
        } catch (error) {
          return { path, failed: true, status: error.status || null, error: error.message };
        }
      }));
      return ratings.length === paths.length && ratings.every(r => !r.failed) ? publicJson({ ratings }, 3600) : json({ ratings });
    }
    if (url.pathname === '/api/metadata') {
      const paths = url.searchParams.getAll('path');
      if (!paths.length || paths.length > 40 || paths.some(p => !/^\/games\/[a-z0-9-]+\/$/.test(p))) return json({ error: 'Invalid game paths.' }, 400);
      const batch = metadataBatch(env, paths.length);
      const pending = paths.map(async path => {
        try { return await igdbDetails(path, '', env, batch); }
        catch (error) {
          if (error.message !== 'No matching IGDB game was found.') throw error;
          // Use Backloggd's explicit IGDB link only when its own slug does not match.
          const source = await gamePage(path);
          if (!source.igdbLink) throw error;
          return igdbDetails(path, source.igdbLink, env);
        }
      });
      paths.forEach(() => batch.ready());
      const details = await Promise.all(pending.map(async (result, i) => {
        const path = paths[i];
        try { return { path, ...await result, plays: null, playText: null, averageTimeHours: null, checked: true }; }
        catch (error) { return { path, failed: true, status: error.status || null, error: error.message }; }
      }));
      return details.every(d => !d.failed) ? publicJson({ details, failed: 0 }, 3600) : json({ details, failed: details.filter(d => d.failed).length });
    }
    if (url.pathname === '/api/critics') {
      const paths = url.searchParams.getAll('path'), titles = url.searchParams.getAll('title');
      if (!paths.length || paths.length > 4 || paths.length !== titles.length || paths.some(p => !/^\/games\/[a-z0-9-]+\/$/.test(p)) || titles.some(t => !t.trim() || t.length > 180)) return json({ error: 'Invalid game titles or paths.' }, 400);
      const ratings = await Promise.all(paths.map(async (path, i) => {
        try { return await metacriticScore({ path, title: titles[i] }); }
        catch (error) { return { path, failed: true, status: error.status || null, error: error.message }; }
      }));
      return ratings.every(r => !r.failed) ? publicJson({ ratings }, 3600) : json({ ratings });
    }
    if (url.pathname === '/api/details') {
      const paths = url.searchParams.getAll('path');
      if (!paths.length || paths.length > 4 || paths.some(p => !/^\/games\/[a-z0-9-]+\/$/.test(p))) return json({ error: 'Invalid game paths.' }, 400);
      const batch = metadataBatch(env, paths.length);
      const details = await Promise.all(paths.map(async path => { try { return { path, ...await gameDetails(path, env, batch) }; } catch (error) { return { path, year: null, gameType: null, developers: [], developerLogos: {}, genres: [], publishers: [], publisherLogos: {}, gameModes: [], playerPerspectives: [], themes: [], franchises: [], gameEngines: [], failed: true, status: error.status || null, error: error.message }; } }));
      const response = json({ details, failed: details.filter(d => d.failed).length });
      if (details.every(d => !d.failed && !d.warning)) {
        response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
        response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=3600');
      }
      return response;
    }
    return new Response('Not found', { status: 404 });
  }
};
