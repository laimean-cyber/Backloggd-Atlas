// All Backloggd consumers share HTML, in-flight requests, and an instance-wide queue.
export function createBackloggdClient({fetcher = (...args) => fetch(...args), now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), spacing = 750} = {}) {
  const pages = new Map(), pending = new Map();
  let queue = Promise.resolve(), next = 0, blockedUntil = 0, lastError;
  return async function upstream(path, requireBrand = true) {
    const hit = pages.get(path);
    if (hit && hit.expires > now()) return hit.html;
    if (pending.has(path)) return pending.get(path);
    const queuedAt = now();
    const job = queue.catch(() => {}).then(async () => {
      if (now() - queuedAt > 20000) throw Object.assign(new Error('Game requests are busy. Please retry shortly.'), {status: 503});
      if (blockedUntil > now()) throw lastError;
      await sleep(Math.max(0, next - now()));
      next = now() + spacing;
      let response;
      try { response = await fetcher('https://backloggd.com' + path, {
        headers: {accept: 'text/html,application/xhtml+xml', 'accept-language': 'en-US,en;q=0.9', 'user-agent': 'Mozilla/5.0 (compatible; BackloggdAtlas/1.0)'},
        redirect: 'follow', signal: AbortSignal.timeout(8000),
      }); } catch {
        throw Object.assign(new Error('Backloggd could not be reached. Please retry shortly.'), {status: 504});
      }
      if (!response.ok) {
        const status = response.status;
        const message = status === 403 ? 'Backloggd denied access from our server (HTTP 403). Please retry later.'
          : status === 429 ? 'Backloggd is rate limiting our server (HTTP 429). Please retry later.'
          : status === 404 ? 'Profile or game not found.' : `Backloggd is unavailable right now (HTTP ${status}).`;
        const error = Object.assign(new Error(message), {status});
        if (status === 403 || status === 429) {
          const retry = response.headers.get('retry-after');
          const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : (Date.parse(retry) - now()) / 1000;
          error.retryAfter = Math.max(60, Number.isFinite(seconds) ? seconds : 60);
          blockedUntil = now() + error.retryAfter * 1000;
          lastError = error;
        }
        throw error;
      }
      const html = await response.text();
      if (requireBrand && !/backloggd/i.test(html)) throw new Error('Backloggd returned an unexpected page.');
      // Bound HTML memory as well as entry count (game pages can be large).
      if (html.length < 750000) {
        pages.delete(path);
        while (pages.size >= 64) pages.delete(pages.keys().next().value);
        pages.set(path, {html, expires: now() + 300000});
      }
      return html;
    });
    queue = job;
    pending.set(path, job);
    try { return await job; } finally { pending.delete(path); }
  };
}
export const upstream = createBackloggdClient();
