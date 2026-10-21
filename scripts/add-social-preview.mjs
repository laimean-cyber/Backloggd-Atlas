import { writeFile } from 'node:fs/promises';
import { page } from '../dist/server/page.js';

if (page.includes('property="og:image"')) throw new Error('Social metadata already exists.');
const metadata = `  <link rel="canonical" href="https://www.backloggd-atlas.online/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Backloggd Atlas">
  <meta property="og:title" content="Backloggd Atlas — Your games, in perspective">
  <meta property="og:description" content="Explore your Backloggd game ratings by release year, credited developer, and more.">
  <meta property="og:url" content="https://www.backloggd-atlas.online/">
  <meta property="og:image" content="https://www.backloggd-atlas.online/social/atlas-desktop-v1.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1440">
  <meta property="og:image:height" content="756">
  <meta property="og:image:alt" content="Backloggd Atlas desktop dashboard showing Laime's gaming library and gaming passport.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Backloggd Atlas — Your games, in perspective">
  <meta name="twitter:description" content="Explore your Backloggd game ratings by release year, credited developer, and more.">
  <meta name="twitter:image" content="https://www.backloggd-atlas.online/social/atlas-desktop-v1.png">
`;
await writeFile(new URL('../dist/server/page.js', import.meta.url), 'export const page = ' + JSON.stringify(page.replace('  <title>', metadata + '  <title>')) + ';\n');
