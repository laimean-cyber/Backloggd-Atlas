import { page } from './dist/server/page.js';
import { writeFileSync } from 'node:fs';
let next = page.replace('padding:14px;width:100%;min-height:68px','padding:8px 12px;width:100%;min-height:60px')
  .replace('width:56px;height:44px;object-fit:contain','width:48px;height:36px;object-fit:contain')
  .replace('.developer-list{gap:10px}', '.developer-list{gap:8px}')
  .replace('.developer-list>.dev-row{flex-shrink:0}', '.developer-list>.dev-row{flex:0 0 60px}.panel.company-panel{aspect-ratio:auto}.company-panel .developer-list{flex:none;height:332px}');
for (const id of ['companyTitle','publisherTitle']) next = next.replace(`<section class="panel"><div class="panel-head"><div><h2 id="${id}">`, `<section class="panel company-panel"><div class="panel-head"><div><h2 id="${id}">`);
writeFileSync('dist/server/page.js', 'export const page = '+JSON.stringify(next)+';\n');
