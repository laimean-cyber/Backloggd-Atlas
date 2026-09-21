// Warm-instance cache complements CDN caching on Vercel and edge caching on Workers.
const entries = new Map();
const pending = new Map();
export async function cached(key, load, ttl = 604800000) {
  const hit = entries.get(key);
  if (hit && hit.expires > Date.now()) return structuredClone(hit.value);
  if (pending.has(key)) return structuredClone(await pending.get(key));
  const promise = (async () => {
    const value = await load();
    entries.delete(key);
    if (entries.size >= 1000) entries.delete(entries.keys().next().value);
    const expires = Math.min(Date.now() + ttl, value.metadataRetryAt || Infinity,
      value.metadataFetchedAt ? value.metadataFetchedAt + 604800000 : Infinity);
    entries.set(key, { value, expires });
    return value;
  })();
  pending.set(key, promise);
  try { return structuredClone(await promise); }
  finally { pending.delete(key); }
}
