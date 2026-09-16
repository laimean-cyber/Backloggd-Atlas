import fs from 'node:fs';
import {companyLogos} from './dist/server/company-logos.js';
const audit=JSON.parse(fs.readFileSync('company-logo-audit.json'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
process.on('exit',()=>{
 let html=fs.readFileSync('logo-gallery.html','utf8');
 for(const [name,logo] of Object.entries(companyLogos))if(logo.dark)html=html.replace(`alt="${esc(name)}"`,`style="background:#17212b" alt="${esc(name)}"`);
 fs.writeFileSync('logo-gallery.html',html);
});
fs.writeFileSync('logo-gallery.html',`<!doctype html><meta charset="utf-8"><title>Laime company logo verification</title><style>body{background:#111417;color:#fff;font:14px system-ui;padding:20px}main{display:grid;grid-template-columns:repeat(7,1fr);gap:12px}article{padding:10px;background:#1b2023;text-align:center;height:105px}img{width:100px;height:60px;object-fit:contain;background:#edf3f8;padding:5px}p{margin:6px 0}</style><h1>Laime · ${audit.companies.length} company logos</h1><main>${audit.companies.map(c=>`<article><img alt="${esc(c.name)}" src="${companyLogos[c.name].data}"><p>${esc(c.name)} · ${c.games}</p></article>`).join('')}</main>`);
