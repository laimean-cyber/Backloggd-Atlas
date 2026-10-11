const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('C:/Users/Laimean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fixture = (cards, tail = '<turbo-frame id="games_pagination"></turbo-frame>', user = 'Fixture') => `<!doctype html><!-- saved from url=(0080)https://backloggd.com/u/${user}/games/played/by/rating/type:played;/ --><title>${user}'s games | Backloggd</title><div id="user_games">${cards}${tail}</div>`;
const card = (id, rating = '8', average = '4.3', path = 'fixture-game') => `<div class="col col-cus-user-games"><div class="game-cover user-rating" game_id="${id}" ${rating === null ? '' : `data-rating="${rating}"`}><a class="cover-link extra" href="https://backloggd.com/games/${path}/"></a><img src="https://untrusted.invalid/probe" onerror="window.importExecuted=true" alt="Game &amp; example"></div><div class="star-rating-below">${average === null ? '' : `<p class="avg-rating">${average} <i></i></p>`}</div></div>`;
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const p = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors = [], requests = [], probes = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', r => {if(r.url().includes('untrusted.invalid')) probes.push(r.url());});
    await p.route('**/api/**', async route => {
      const u = new URL(route.request().url());requests.push(u.pathname + u.search);
      if(u.pathname === '/api/metadata') {
        const details = u.searchParams.getAll('path').map(path => ({path,checked:true,metadataVersion:1,metadataFetchedAt:Date.now(),year:2000,gameType:'Main Game',developers:['Fixture Studio'],developerLogos:{},publishers:[],publisherLogos:{},genres:['Adventure'],gameModes:[],playerPerspectives:[],themes:[],franchises:[],gameEngines:[],communityRating:null,communityFetchedAt:Date.now()}));
        return route.fulfill({json:{details}});
      }
      return route.fulfill({json:{favourites:[],details:[],ratings:[],scores:[]}});
    });
    await p.goto('http://localhost:4174/');
    await p.waitForFunction(() => typeof parseSavedBackloggdHtml === 'function');
    const parse = html => p.evaluate(html => parseSavedBackloggdHtml(html, Date.now()-1000), html);
    const avatarUrl='https://backloggd-avatars.b-cdn.net/5ggh6w9r3mkxouhg5l53wcirt54n';
    const profileAvatarMarkup=src=>`<div id="profile-header"><div class="avatar"><img src="${src}"></div></div>`;
    const good = fixture(card('1') + card('2',null,null,'unrated') + card('1'))+profileAvatarMarkup('./Fixture_files/5ggh6w9r3mkxouhg5l53wcirt54n');
    const parsed = await parse(good);
    assert.equal(parsed.avatar,avatarUrl);
    assert.equal((await parse(fixture(card('1'))+profileAvatarMarkup(avatarUrl))).avatar,avatarUrl);
    assert.equal((await parse(fixture(card('1'))+profileAvatarMarkup('https://evil.invalid/avatar.png'))).avatar,null);
    assert.equal((await parse(fixture(card('1'))+'<nav class="avatar"><img src="'+avatarUrl+'"></nav>')).avatar,null);
    assert.equal(parsed.username,'Fixture');assert.equal(parsed.games.length,2);assert.equal(parsed.rated,1);assert.equal(parsed.averages,1);assert.equal(parsed.complete,true);
    assert.equal(parsed.games[0].rating,4);assert.equal(parsed.games[0].communityRating,4.3);assert.equal(parsed.games[0].title,'Game & example');assert.equal(parsed.games[1].rating,null);
    await parse(good + '<script>window.importExecuted=true</script><iframe src="https://untrusted.invalid/frame"></iframe>');
    assert.equal(await p.evaluate(() => window.importExecuted),undefined);assert.deepEqual(probes,[]);
    for(const [html, pattern] of [
      [fixture(card('1'),'<turbo-frame id="games_pagination" src="/next"></turbo-frame>'),/More games/],
      [fixture(card('1')).replace('/by/rating/','/by/added/'),/Sort your Played/],
      ['<title>Making sure you are not a bot</title>',/verification/],
      [fixture(card('1','12')),/personal rating/],
      [fixture(card('1','8','8.7')),/average/],
      [fixture(card('1')+card('1','6')),/conflicting/],
      [fixture(card('1')).replace('href="https://backloggd.com/games/','href="https://evil.invalid/games/'),/game card/],
    ]) await assert.rejects(parse(html),pattern);
    assert.equal((await parse(fixture(card('1'),''))).complete,false);
    await p.locator('#htmlImportFile').setInputFiles({name:'fixture.html',mimeType:'text/html',buffer:Buffer.from(good)});
    await p.locator('#htmlImportBuild').waitFor({state:'visible'});
    requests.length=0;
    await p.locator('#htmlImportBuild').click();
    await p.waitForFunction(() => !document.getElementById('htmlImportBuild').disabled && document.getElementById('htmlImportStatus').textContent.startsWith('Imported'));
    const state = await p.evaluate(() => ({count:games.length,rating:games[0].rating,average:communityData(games[0]).communityRating,checked:games.every(g=>metadataFresh(g)),saved:readLibrary('Fixture'),note:document.getElementById('dataNote').textContent}));
    assert.equal(state.count,2);assert.equal(state.rating,4);assert.equal(state.average,4.3);assert.equal(state.checked,true);assert.ok(state.saved.htmlImport);assert.match(state.note,/Imported 2/);
    assert.ok(requests.some(u=>u.startsWith('/api/metadata?')&&u.includes('igdbOnly=1')));
    assert.equal(requests.some(u=>/^\/api\/(page|favourites|community|details)\?/.test(u)),false,requests.join('\n'));
    requests.length=0;await p.reload();await p.waitForFunction(()=>activeUsername==='Fixture'&&games.length===2&&!document.getElementById('lookupButton').disabled);
    assert.equal(await p.evaluate(()=>communityData(games[0]).communityRating),4.3);
    assert.equal(await p.locator('.passport-seal img').getAttribute('src'),avatarUrl);
    assert.equal(requests.some(u=>/^\/api\/(page|favourites|community|details)\?/.test(u)),false);
    // Errors do not replace the current library; selecting the same file can be retried.
    await p.locator('#htmlImportFile').setInputFiles({name:'invalid.html',mimeType:'text/html',buffer:Buffer.from('<html>wrong page</html>')});
    await p.waitForFunction(()=>document.getElementById('htmlImportStatus').dataset.state==='error');
    assert.equal(await p.evaluate(()=>games.length),2);
    assert.equal(await p.locator('#htmlImportPreview').isVisible(),false);
    const actualFile=process.argv[2];
    if(actualFile){
      const actual=await parse(fs.readFileSync(actualFile,'utf8'));
      console.log('User file:',JSON.stringify({username:actual.username,games:actual.games.length,rated:actual.rated,averages:actual.averages,complete:actual.complete,first:actual.games[0]}));
      assert.ok(actual.games.length>40);assert.ok(actual.averages>0);assert.equal(actual.complete,true);
      assert.equal(actual.avatar,avatarUrl);
      await p.locator('#htmlImportFile').setInputFiles(actualFile);
      await p.locator('#htmlImportBuild').click();
      await p.waitForFunction(()=>!document.getElementById('htmlImportBuild').disabled&&document.getElementById('htmlImportStatus').textContent.startsWith('Imported'),null,{timeout:90000});
      assert.equal(await p.evaluate(()=>games.length),actual.games.length);
      assert.equal(await p.evaluate(()=>games.filter(g=>Number.isFinite(g.communityRating)).length),actual.averages);
    }
    fs.mkdirSync('.impeccable/review/html-import',{recursive:true});
    for(const width of [1440,390]){
      await p.setViewportSize({width,height:1200});
      await p.screenshot({path:'.impeccable/review/html-import/'+(width===1440?'desktop':'mobile')+'.png'});
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow at '+width);
      assert.equal(await p.locator('.profile-availability').evaluate(e=>e.tagName),'ASIDE');
      assert.equal(await p.locator('#htmlImportFile').isVisible(),true);
    }
    assert.deepEqual(errors,[]);
    console.log('Passed: HTML fields, deduplication, incomplete/wrong/unsafe files, inert parsing, import + IGDB, preserved averages, reload, responsive notice.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
