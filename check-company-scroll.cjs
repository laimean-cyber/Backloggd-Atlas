const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const { page: html } = await import('./dist/server/page.js');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().url() === 'http://localhost:4174/' ? route.fulfill({ contentType: 'text/html', body: html }) : route.abort());
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://localhost:4174/');
    for (const [id, kind, rating, count] of [['developers','developers','companyRatingBtn','companyCountBtn'], ['publishers','publishers','publisherRatingBtn','publisherCountBtn']]) {
      const expected = await page.evaluate(kind => groups(games.filter(isPlayed).filter(g => !isExpansionOrDlc(g)), kind).filter(g => g.ratedCount >= 3).length, kind);
      assert(expected > 5);
      assert.equal(await page.locator('#'+id+' button').count(), expected);
      await page.locator('#'+count).click();
      const all = await page.evaluate(kind => groups(games.filter(isPlayed).filter(g => !isExpansionOrDlc(g)), kind).length, kind);
      assert.equal(await page.locator('#'+id+' button').count(), all);
      const scroll = await page.locator('#'+id).evaluate(el => { const css = getComputedStyle(el); el.scrollTop = el.scrollHeight; return { moved: el.scrollTop > 0, color: css.scrollbarColor, width: css.scrollbarWidth, rowHeight: el.firstElementChild.getBoundingClientRect().height }; });
      assert(scroll.moved);
      assert.equal(scroll.rowHeight, 60);
      const shared = await page.locator('#franchises').evaluate(el => ({ color: getComputedStyle(el).scrollbarColor, width: getComputedStyle(el).scrollbarWidth }));
      assert.equal(scroll.color, shared.color); assert.equal(scroll.width, shared.width);
      await page.locator('#'+id+' button').last().focus();
      assert.equal(await page.locator('#hoverCard').isVisible(), true);
      await page.keyboard.press('Escape');
      await page.locator('#'+id).evaluate(el => el.scrollTop = 0);
      assert(await page.locator('#'+id).evaluate(el => el.children[4].getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 1), 'Five rows fully fit');
      await page.locator('#'+id).locator('..').screenshot({ path: id+'-'+width+'.png' });
      await page.locator('#'+rating).click();
      assert.equal(await page.locator('#'+id+' button').count(), expected);
      console.log({ width, id, ratingEntries: expected, allEntries: all, scroll });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  assert.deepEqual(errors, []);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
