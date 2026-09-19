import { mkdir, writeFile } from 'node:fs/promises';
import { page } from '../dist/server/page.js';

const output = new URL('../public/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), page, 'utf8');
console.log('Built public/index.html from the application page.');
