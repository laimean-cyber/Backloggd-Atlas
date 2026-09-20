const fs=require('fs');
let h=fs.readFileSync('dist/index.html','utf8');
h=h.replace('</style>',`.favourites-grid{padding-top:3px}.favourites-grid .award-poster{opacity:1;transform:none;outline:3px solid #ea377a}.favourites-panel .empty{margin:0;padding:12px 0;text-align:left}\n</style>`);
h=h.replace('<div class="grid"><section','<div class="grid"><section class="panel span2 favourites-panel" aria-labelledby="favouritesTitle"><div class="panel-head"><div><h2 id="favouritesTitle">Favourite games</h2><p class="panel-sub">From your Backloggd profile</p></div></div><div id="favouritesContent"></div></section>\n<section');
h=h.replace('  function render(){',`  let favouriteGames=[],favouritesStatus='idle',favouritesRequest=0;
  function renderFavourites(){
    const root=$('favouritesContent');
    if(!activeUsername){root.innerHTML='<p class="empty">Load a Backloggd profile to see its favourite games.</p>';return}
    if(favouritesStatus==='loading'){root.innerHTML='<p class="empty" role="status">Loading favourite games…</p>';return}
    if(favouritesStatus==='error'){root.innerHTML='<p class="empty" role="status">Could not load favourite games. <button class="ghost" id="retryFavourites" type="button">Retry</button></p>';$('retryFavourites').onclick=()=>loadFavourites(activeUsername);return}
    root.innerHTML=favouriteGames.length?'<ol class="awards-grid favourites-grid">'+favouriteGames.map(g=>{
      const year=games.find(game=>game.path===g.path)?.year;
      return '<li><a class="award-link" href="https://backloggd.com'+esc(g.path)+'" target="_blank" rel="noopener noreferrer"><img class="award-poster" src="'+esc(g.image)+'" alt="" width="264" height="352" loading="lazy" decoding="async"><span class="award-name">'+esc(g.title)+'</span>'+(year?'<span class="award-year">'+esc(year)+'</span>':'')+'</a></li>';
    }).join('')+'</ol>':'<p class="empty">No favourite games on this profile yet.</p>';
  }
  async function loadFavourites(username){
    const request=++favouritesRequest;favouriteGames=[];favouritesStatus='loading';renderFavourites();
    try{const response=await fetch('/api/favourites?user='+encodeURIComponent(username));const data=await response.json();if(!response.ok||!Array.isArray(data.favourites))throw Error('Could not load favourites');if(request!==favouritesRequest||activeUsername!==username)return;favouriteGames=data.favourites;favouritesStatus='ready'}
    catch{if(request!==favouritesRequest||activeUsername!==username)return;favouritesStatus='error'}
    renderFavourites();
  }
  function render(){
    renderFavourites();`);
h=h.replace("render();await loadDetails(all);render();profileNotice()","render();await Promise.all([loadFavourites(username),loadDetails(all)]);render();profileNotice()");
fs.writeFileSync('dist/index.html',h);fs.writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(h)+';\n');
