const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        if (route.request().isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: fs.readFileSync('public/index.html', 'utf8') });
        if (route.request().url().includes('/api/critics') || route.request().url().includes('/api/community')) return route.fulfill({ json: { ratings: [] } });
        if (route.request().url().includes('/api/favourites')) return route.fulfill({ json: { favourites: [] } });
        return route.abort();
      });
      await page.goto('http://localhost:4174');
      await page.evaluate(() => {
        metadataLoading = true;
        criticsBusy = true;
        games = [
          { path: '/games/control/', title: 'Control', rating: 5, criticRating: 4.15, metascore: 83, criticFetchedAt: Date.now(), url: 'https://www.metacritic.com/game/control/', played: true },
          { path: '/games/example/', title: 'Example', rating: 3, criticRating: 4.2, metascore: 84, criticFetchedAt: Date.now(), url: 'https://www.metacritic.com/game/example/', played: true },
          { path: '/games/equal/', title: 'Equal', rating: 4, criticRating: 4, metascore: 80, criticFetchedAt: Date.now(), url: 'https://www.metacritic.com/game/equal/', played: true },
          { path: '/games/unknown/', title: 'Unknown', rating: 4, played: true },
        ];
        renderCritics();
      });
      assert.equal(await page.locator('#criticsMore tbody tr').count(), 1);
      assert.equal(await page.locator('#criticsLess tbody tr').count(), 1);
      assert.equal(await page.locator('#criticsMore .community-gap').textContent(), '+0.85');
      assert.equal(await page.locator('#criticsLess .community-gap').textContent(), '−1.20');
      assert.match(await page.locator('#criticsMore .community-track').getAttribute('aria-label'), /83\/100/);
      assert.equal(await page.locator('#criticsMore a').getAttribute('href'), 'https://www.metacritic.com/game/control/');
      assert(await page.locator('.awards-panel + .critics-panel').count());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('.critics-panel').screenshot({ path: `critics-${width}.png` });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
