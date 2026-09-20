import {metadataComplete} from '../dist/server/metadata.js';

export function validateLibrary(page){
  const library=JSON.parse(page.match(/const defaultLibrary=(\[[^\n]+\]);/)[1]);
  const invalid=library.filter(g=>g.checked!==false&&!metadataComplete(g));
  if(invalid.length)throw Error('Bundled library contains incomplete metadata marked as checked: '+invalid.map(g=>g.path).join(', '));
  return library;
}
