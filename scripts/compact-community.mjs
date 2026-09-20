import {writeFileSync} from 'node:fs';
import {page as original} from '../dist/server/page.js';
let page=original.replaceAll('background:#b94a78','background:#922c56');
page=page.replace('.community-table td{padding:0;text-align:right;vertical-align:middle;height:46px}', '.community-table td{padding:0;text-align:right;vertical-align:middle;height:32px}');
page=page.replace('padding:8px 12px 8px 0;overflow-wrap:anywhere','padding:5px 12px 5px 0;overflow-wrap:anywhere');
page=page.replace('.community-track{position:relative;height:46px;', '.community-track{position:relative;height:32px;');
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(page)+';\n');
writeFileSync('dist/index.html',page);
