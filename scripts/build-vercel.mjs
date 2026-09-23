import { mkdir, writeFile } from 'node:fs/promises';
import { page } from '../dist/server/page.js';
import { validateLibrary } from './validate-library.mjs';

validateLibrary(page);

// This app publishes plain HTML, so installing the React SDK alone cannot
// start tracking. Load Vercel's HTML integration in the published document.
const analytics = `<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
`;
if (!page.includes('</head>')) throw new Error('Application page is missing </head>.');
const publishedPage = page.replace('</head>', analytics + '</head>');

const output = new URL('../public/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), publishedPage, 'utf8');
console.log('Built public/index.html from the application page.');
