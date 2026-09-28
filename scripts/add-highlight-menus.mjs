import { writeFileSync } from 'node:fs';
import { page as original } from '../dist/server/page.js';
let page = original;
for (const [id, label] of [['addons', 'Expansions &amp; DLC'], ['remakes', 'Remakes &amp; remasters']]) {
  const start = `<div class="card"><div class="stat-label">${label}</div>`;
  const index = page.indexOf(start);
  if (index < 0) throw new Error(`Missing ${id} card`);
  const end = page.indexOf('</div></div>', page.indexOf(`id="${id}Sub"`, index)) + '</div></div>'.length;
  const card = page.slice(index, end).replace(start, `<button type="button" class="card drill highlight-menu" data-kind="${id}" data-key="${label}" aria-controls="hoverCard" aria-haspopup="true" aria-expanded="false"><span class="stat-label">${label}</span>`).replaceAll('<div ', '<span ').replaceAll('</div>', '</span>').replace(/<\/span>$/, '</button>');
  page = page.slice(0, index) + card + page.slice(end);
}
page = page.replace('</style>', '.highlight-menu{color:inherit;text-align:left;width:100%}.highlight-menu>span{display:block}.highlight-menu:hover,.highlight-menu[aria-expanded="true"]{border-color:#ea377a;background:#272c37}\n</style>');
page = page.replace("return kind==='rating'?Number.isFinite", "return kind==='addons'?isExpansionOrDlc(g):kind==='remakes'?(isRemake(g)||isRemaster(g)):kind==='rating'?Number.isFinite");
page = page.replace("if(!list.length)return;if(hoverTrigger", "if(!list.length&&!['addons','remakes'].includes(kind))return;if(hoverTrigger");
page = page.replace("$('hoverCard').hidden=false;positionHover(trigger)", "if(!list.length)$('hoverList').innerHTML='<div class=\"empty\">No matching games in this library.</div>';$('hoverCard').hidden=false;positionHover(trigger)");
page = page.replace("$('missingDetails').addEventListener('click',showMissing);", "$('missingDetails').addEventListener('click',showMissing);\n  document.querySelectorAll('.highlight-menu').forEach(button=>button.addEventListener('click',()=>toggleHover(button)));");
writeFileSync('dist/server/page.js', `export const page = ${JSON.stringify(page)};\n`);
