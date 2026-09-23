import { cached } from './cache.js';

const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const slug = value => normalize(value).replace(/ /g, '-');

export function parseMetascore(html, expectedTitle) {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(match[1]); } catch { continue; }
    for (const item of Array.isArray(data) ? data : [data]) {
      if (item?.['@type'] !== 'VideoGame' || normalize(item.name) !== normalize(expectedTitle)) continue;
      const rating = item.aggregateRating;
      if (!/^(?:100|[1-9]?\d)$/.test(String(rating?.ratingValue))) continue;
      const score = Number(rating?.ratingValue);
      if (rating?.name !== 'Metascore' || rating?.bestRating !== 100 || !Number.isInteger(score) || score < 0 || score > 100) continue;
      return { score, url: item.url };
    }
  }
  return null;
}

export async function metacriticScore({ path, title }) {
  const titleSlug = slug(title);
  const pathSlug = path.match(/^\/games\/([a-z0-9-]+)\/$/)?.[1];
  const candidates = [...new Set([titleSlug, pathSlug].filter(Boolean))].slice(0, 2);
  return cached('metacritic-v1:' + path + ':' + normalize(title), async () => {
    for (const candidate of candidates) {
      const url = `https://www.metacritic.com/game/${candidate}/`;
      const response = await fetch(url, { headers: { 'accept': 'text/html', 'user-agent': 'BackloggdAtlas/1.0 (public Metascore lookup)' }, signal: AbortSignal.timeout(12000) });
      if (response.status === 404) continue;
      if (!response.ok) { const error = new Error(`Metacritic returned ${response.status}.`); error.status = response.status; throw error; }
      const parsed = parseMetascore(await response.text(), title);
      if (parsed && parsed.url === url) return { path, metascore: parsed.score, criticRating: parsed.score / 20, url, criticFetchedAt: Date.now() };
    }
    return { path, metascore: null, criticRating: null, url: null, criticFetchedAt: Date.now() };
  }, 86400000);
}
