// Shared by the API, browser, snapshot refresh, and build validation.
export function metadataComplete(data) {
  return !!data && data.checked === true && data.metadataVersion === 1 &&
    Number.isFinite(data.metadataFetchedAt) && data.metadataFetchedAt > 0 &&
    Object.hasOwn(data, 'gameType') && (data.gameType === null || typeof data.gameType === 'string') &&
    ['developers', 'publishers', 'genres', 'gameModes', 'playerPerspectives', 'themes', 'franchises', 'gameEngines']
      .every(key => Array.isArray(data[key]) && data[key].every(name => typeof name === 'string' && name.length > 0));
}

export function metadataFresh(data, now = Date.now()) {
  return metadataComplete(data) && data.metadataFetchedAt <= now && now - data.metadataFetchedAt < 7 * 24 * 60 * 60 * 1000;
}
