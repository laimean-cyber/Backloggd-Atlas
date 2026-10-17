import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';

if(original.includes('const panelMarkup = new WeakMap();')){
  const page=original.replace("img.removeAttribute('src');img.hidden=true}","if(img.hasAttribute('src'))img.removeAttribute('src');if(!img.hidden)img.hidden=true}");
  writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
  writeFileSync('dist/index.html',page);
  process.exit(0);
}

const helper = `  // Keep scroll containers and loaded images alive during background refreshes.
  const panelMarkup = new WeakMap();
  function updatePanel(root, html){
    if(panelMarkup.get(root)===html)return;
    const template=document.createElement('template');
    template.innerHTML=html;
    const key=node=>node.nodeType===1?(node.id||node.getAttribute('data-key')||node.getAttribute('data-journey')||node.getAttribute('aria-labelledby')||node.getAttribute('data-developer')||node.getAttribute('href')||''):'';
    const compatible=(a,b)=>a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&key(a)===key(b);
    function reconcile(parent, desired){
      let cursor=parent.firstChild;
      for(const next of [...desired.childNodes]){
        let current=cursor;
        if(!current||!compatible(current,next))current=[...parent.childNodes].find(node=>key(next)&&compatible(node,next));
        if(!current){current=next.cloneNode(true);parent.insertBefore(current,cursor)}
        else{
          if(current!==cursor)parent.insertBefore(current,cursor);
          if(current.nodeType===1){
            // The logo loader owns src/hidden; markup deliberately contains a placeholder.
            const logo=current.matches('img[data-developer]');
            for(const attr of [...current.attributes])if(!next.hasAttribute(attr.name)&&!(logo&&['src','hidden'].includes(attr.name)))current.removeAttribute(attr.name);
            for(const attr of next.attributes)if(!(logo&&['src','hidden'].includes(attr.name))&&current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
            reconcile(current,next);
          }else if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;
        }
        cursor=current.nextSibling;
      }
      while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next}
    }
    reconcile(root,template.content);
    panelMarkup.set(root,html);
  }
`;
let page=original;
const start=page.indexOf('  let lastRenderLibrary = null;');
const end=page.indexOf('    renderDecades();',start);
if(start<0||end<0)throw Error('Previous scroll workaround not found');
page=page.slice(0,start)+helper+'  function render(){\n'+page.slice(end);
for(const [id,endMarker] of [
  ['decadesReel',"    }).join('');"],
  ['franchiseJourneys',"    }).join(''):'<div class=\"empty\">No franchise has five played entries and three ratings excluding DLC yet.</div>';"],
  ['developers',null],['publishers',null],
]){
  const prefix="$('"+id+"').innerHTML=";
  const from=page.indexOf(prefix);
  if(from<0)throw Error('Missing panel '+id);
  const to=endMarker?page.indexOf(endMarker,from)+endMarker.length:page.indexOf('\n',from);
  const assignment=page.slice(from,to);
  if(!assignment.endsWith(';'))throw Error('Invalid boundary '+id);
  page=page.slice(0,from)+"updatePanel($('"+id+"'),"+assignment.slice(prefix.length,-1)+');'+page.slice(to);
}
page=page.replace('class="journey-row" data-row="\'+row+\'"','class="journey-row" data-journey="\'+esc(x.name)+\'" data-row="\'+row+\'"');
page=page.replace("if(img.isConnected)img.src=src", "if(img.isConnected&&img.dataset.logoUrl===url&&img.getAttribute('src')!==src)img.src=src");
page=page.replace('cachedDeveloperLogo(url).then(src=>', "{if(img.dataset.logoUrl===url)continue;img.dataset.logoUrl=url;cachedDeveloperLogo(url).then(src=>");
page=page.replace("img.src=src});", "img.src=src});}else{delete img.dataset.logoUrl;if(img.hasAttribute('src'))img.removeAttribute('src');if(!img.hidden)img.hidden=true}");
// Keep loader bookkeeping while reconciling company rows.
page=page.replace("['src','hidden'].includes", "['src','hidden','data-logo-url'].includes");
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
console.log('Replaced scroll restoration with persistent decade, franchise and company panels.');
