import {readFileSync,writeFileSync} from 'node:fs';
import {page} from '../dist/server/page.js';
const script=readFileSync('scripts/add-year-mix.mjs','utf8');
const css=script.split("html=html.replace('  </style>', `")[1].split('  </style>`);')[0];
const html=page.replace('</style>',css+'\n.explore-pair>.explorer-panel{height:620px}\n</style>');
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(html)+';\n');
writeFileSync('dist/index.html',html);writeFileSync('public/index.html',html);
