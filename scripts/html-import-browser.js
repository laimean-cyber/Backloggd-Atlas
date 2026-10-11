// Embedded in the standalone dashboard by add-html-import.mjs.
function parseSavedBackloggdHtml(html, capturedAt = Date.now()) {
  if (typeof html !== 'string' || html.length > 25000000) throw Error('Choose a saved HTML page smaller than 25 MB.');
  // Template contents are inert: no scripts run and no saved images/frames load.
  const template = document.createElement('template');
  template.innerHTML = html;
  const doc = template.content;
  if (/Making sure you|Just a moment|Access denied/i.test(doc.querySelector('title')?.textContent || ''))
    throw Error('This file contains a verification page. Wait for your games to appear in Backloggd, then save again.');
  const source = html.match(/saved from url=\(\d+\)(https?:\/\/[^\s<>]+)/i)?.[1]
    || doc.querySelector('link[rel="canonical"]')?.getAttribute('href')
    || doc.querySelector('meta[property="og:url"]')?.getAttribute('content');
  let username, sourceUrl;
  if (source) {
    try { sourceUrl = new URL(source); } catch { throw Error('The saved page has an invalid Backloggd address.'); }
    if (!['backloggd.com', 'www.backloggd.com'].includes(sourceUrl.hostname) || !/^https?:$/.test(sourceUrl.protocol))
      throw Error('Choose a Games page saved from backloggd.com.');
    username = sourceUrl.pathname.match(/^\/u\/([A-Za-z0-9_-]{1,40})\/games(?:\/|$)/)?.[1];
    if (!username) throw Error('Choose your Backloggd Games page, not a profile or individual game page.');
    if (!sourceUrl.pathname.includes('/by/rating/'))
      throw Error('Sort your Played games by Backloggd rating, scroll to the end, and save the page again.');
    if (!sourceUrl.pathname.includes('/played/') && !sourceUrl.pathname.includes('type:played;'))
      throw Error('Choose the Played games view before saving your library.');
  } else {
    username = doc.querySelector('title')?.textContent.match(/^([A-Za-z0-9_-]{1,40})['’]s games\s*\|\s*Backloggd/i)?.[1];
  }
  if (!username) throw Error('Could not identify the profile. Save the original Backloggd Games page as HTML and try again.');
  // Only the profile header identifies the owner; navigation may show another signed-in user.
  const avatarSource = doc.querySelector('#profile-header .avatar img')?.getAttribute('src') || '';
  let avatar = null;
  try {
    const url = new URL(avatarSource, 'https://backloggd.com');
    if (url.protocol === 'https:' && ['backloggd-avatars.b-cdn.net','backloggd-s3.b-cdn.net'].includes(url.hostname) && !url.username && !url.password) avatar = url.href;
    // Save Page rewrites CDN images to <page>_files/<Active Storage blob key>.
    const savedKey = avatarSource.match(/(?:^|\/)[^/]+_files\/([a-z0-9]{28})(?:[?#].*)?$/i)?.[1];
    if (!avatar && !/^[a-z]+:|^\/\//i.test(avatarSource) && savedKey) avatar = 'https://backloggd-avatars.b-cdn.net/' + savedKey;
  } catch {}
  const root = doc.querySelector('#user_games');
  if (!root) throw Error('No Games list was found. Wait for your library to load before saving the page.');
  const markers = Array.from(doc.querySelectorAll('#games_pagination'));
  const lastMarker = markers.at(-1);
  const nextLink = doc.querySelector('a[rel="next"], .pagination .next:not(.disabled) a');
  if ((lastMarker && (lastMarker.hasAttribute('src') || lastMarker.querySelector('a[href], turbo-frame[src]'))) || nextLink)
    throw Error('More games are still waiting to load. Scroll to the very bottom until loading finishes, then save the page again.');
  const complete = !!lastMarker;
  const savedAt = Number.isFinite(capturedAt) && capturedAt > 0 ? Math.min(capturedAt, Date.now()) : Date.now();
  const byId = new Map();
  for (const card of root.querySelectorAll('.game-cover[game_id]')) {
    const id = card.getAttribute('game_id');
    const title = (card.querySelector('img[alt]')?.getAttribute('alt') || card.querySelector('.game-text-centered')?.textContent || '').trim();
    let url;
    try { url = new URL(card.querySelector('a.cover-link[href]')?.getAttribute('href'), 'https://backloggd.com'); } catch {}
    if (!/^\d+$/.test(id || '') || !title || !url || !['backloggd.com', 'www.backloggd.com'].includes(url.hostname)
      || !/^https?:$/.test(url.protocol) || !/^\/games\/[a-z0-9-]+\/$/.test(url.pathname))
      throw Error('A game card could not be read. Save the complete original Games page again.');
    const rawRating = card.getAttribute('data-rating');
    const personal = rawRating === null ? null : Number(rawRating);
    if (personal !== null && (!Number.isFinite(personal) || personal < 0 || personal > 10 || !Number.isInteger(personal)))
      throw Error('A personal rating is invalid. Save the original page again.');
    const column = card.closest('.col-cus-user-games');
    const averageText = column?.querySelector('.avg-rating')?.textContent.trim();
    const averageMatch = averageText?.match(/^(\d+(?:[.,]\d+)?)(?:\s|$)/);
    const communityRating = averageMatch ? Number(averageMatch[1].replace(',', '.')) : null;
    if (averageText && (!averageMatch || !Number.isFinite(communityRating) || communityRating < 0 || communityRating > 5))
      throw Error('A Backloggd average could not be read. Save the page sorted by Backloggd rating again.');
    const game = {id, title, path: url.pathname, rating: personal > 0 ? personal / 2 : null,
      played: true, htmlImported: true, communityRating: communityRating > 0 ? communityRating : null,
      communityFetchedAt: savedAt, checked: false, year: null, developers: [], developerLogos: {}};
    const previous = byId.get(id);
    if (previous && (previous.path !== game.path || previous.rating !== game.rating || previous.communityRating !== game.communityRating))
      throw Error('The saved page contains conflicting copies of a game. Reload Backloggd, scroll to the end, and save again.');
    byId.set(id, game);
  }
  const all = Array.from(byId.values());
  if (!all.length) throw Error('No games were found in this file. Save the page after your games have loaded.');
  if (!sourceUrl && !all.some(g => Number.isFinite(g.communityRating)))
    throw Error('Backloggd averages are missing. Sort by Backloggd rating, then save the page again.');
  return {username, avatar, games: all, savedAt, complete, rated: all.filter(g => g.rating !== null).length,
    averages: all.filter(g => g.communityRating !== null).length};
}

let pendingHtmlImport = null;
function updateHtmlImportLink() {
  let username;
  try { username = usernameFromInput($('username').value); } catch { username = activeUsername || defaultUsername; }
  $('htmlImportSource').href = 'https://backloggd.com/u/' + encodeURIComponent(username) + '/games/played/by/rating/type:played;/';
}
$('username').addEventListener('input', updateHtmlImportLink);
$('htmlImportSource').addEventListener('click', updateHtmlImportLink);
$('htmlImportFile').addEventListener('change', async event => {
  pendingHtmlImport = null;
  $('htmlImportPreview').hidden = true;
  $('htmlImportBuild').hidden = true;
  const file = event.target.files[0];
  if (!file) return;
  $('htmlImportStatus').textContent = 'Reading saved games…';
  $('htmlImportStatus').dataset.state = 'loading';
  try {
    if (!/\.html?$/i.test(file.name)) throw Error('Choose an .html or .htm file saved from your Backloggd Games page.');
    if (file.size > 25000000) throw Error('This file is larger than 25 MB. Choose the HTML file, not its assets folder.');
    pendingHtmlImport = parseSavedBackloggdHtml(await file.text(), file.lastModified);
    const result = pendingHtmlImport;
    $('htmlImportStatus').textContent = '@' + result.username + ' · ' + result.games.length + ' games · ' + result.rated + ' personal ratings · ' + result.averages + ' Backloggd averages';
    $('htmlImportStatus').dataset.state = 'ready';
    $('htmlImportCoverage').textContent = (result.complete ? 'End of the saved list found. ' : 'The file has no end-of-list marker. Check that the game count matches your full library. ')
      + 'Saved ' + new Date(result.savedAt).toLocaleString() + '. Importing replaces this profile’s saved library in this browser.';
    $('htmlImportPreview').hidden = false;
    $('htmlImportBuild').hidden = false;
  } catch (error) {
    $('htmlImportStatus').dataset.state = 'error';
    $('htmlImportStatus').textContent = error.message;
  }
});
$('htmlImportBuild').addEventListener('click', async () => {
  if (!pendingHtmlImport || $('lookupButton').disabled) return;
  const result = pendingHtmlImport;
  const importInfo = {savedAt: result.savedAt, complete: result.complete, avatar: result.avatar};
  const snapshot = {games: result.games, savedAt: result.savedAt, htmlImport: importInfo};
  let persisted = true;
  try { localStorage.setItem(libraryKey(result.username), JSON.stringify(snapshot)); } catch { persisted = false; }
  $('username').value = result.username;
  $('htmlImportBuild').disabled = true;
  $('htmlImportFile').disabled = true;
  try {
    const built = await buildProfile(result.username, snapshot);
    if (!built) throw Error('The file was read, but the dashboard could not finish building. Check the library data status and try again.');
    $('htmlImportStatus').textContent = 'Imported ' + result.games.length + ' games for @' + result.username + '. '
      + (persisted ? 'Library saved in this browser.' : 'Browser storage is full or unavailable. The dashboard works now; reimport the file after reloading.');
    $('htmlImportStatus').dataset.state = persisted ? 'ready' : 'error';
    $('htmlImportPreview').hidden = true;
  $('htmlImportBuild').hidden = true;
    pendingHtmlImport = null;
  } catch (error) {
    $('htmlImportStatus').textContent = error.message;
    $('htmlImportStatus').dataset.state = 'error';
  } finally {
    $('htmlImportBuild').disabled = false;
    $('htmlImportFile').disabled = false;
  }
});
