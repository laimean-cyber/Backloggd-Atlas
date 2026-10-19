const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [320, 390, 600, 800, 1440]) {
      const mobile = width < 900;
      const page = await browser.newPage({ viewport: { width, height: 1000 }, screen: { width, height: 1000 }, isMobile: mobile, hasTouch: mobile });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', route => route.fulfill({ json: { favourites: [], details: [], ratings: [], scores: [] } }));
      await page.goto(process.env.CHECK_URL || 'http://localhost:4174');
      await page.locator('.passport-archetype').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => {
        const columns = selector => getComputedStyle(document.querySelector(selector)).gridTemplateColumns.split(' ').length;
        return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, facts: columns('.passport-facts'), posters: columns('.passport-picks'), scale: visualViewport.scale };
      });
      assert.equal(layout.width, Math.max(600, width));
      assert.equal(layout.overflow, false);
      assert.equal(layout.facts, 3);
      assert.equal(layout.posters, 4);
      if (width < 600) assert(Math.abs(layout.scale - width / 600) < 0.01);
      if (width < 600) {
        const fit = await page.evaluate(() => {
          // A wide descendant must never turn the document into a horizontal scroller.
          const probe = document.createElement('div');
          probe.style.cssText = 'position:absolute;top:0;left:0;width:1200px;height:1px;pointer-events:none';
          document.body.append(probe);
          window.scrollTo(300, 0);
          const result = { x: scrollX, offset: visualViewport.offsetLeft, visible: visualViewport.width, scrollWidth: document.documentElement.scrollWidth };
          probe.remove();
          return result;
        });
        assert.equal(fit.x, 0);
        assert.equal(fit.offset, 0);
        assert(Math.abs(fit.visible - 600) < 1);
      }
      assert.deepEqual(errors, []);
      await page.locator('#gamingPassport').screenshot({ path: `.impeccable/review/mobile-canvas-${width}.png` });
      console.log(width, layout);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
