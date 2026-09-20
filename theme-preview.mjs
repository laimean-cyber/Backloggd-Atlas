import http from 'node:http';
import fs from 'node:fs';
import worker from './dist/server/index.js';
import {page} from './dist/server/page.js';
const games=JSON.parse(fs.readFileSync('laime-audit.json'));
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4174');
 let response;
 if(url.pathname==='/logo-gallery')response=new Response(fs.readFileSync('logo-gallery.html'),{headers:{'content-type':'text/html'}});
 else if(url.pathname==='/audit'){
  // Exercise the production renderer and logo loader against every qualifying company.
  const audit=page.replace("companySort='rating'","companySort='count'").replace('.slice(0,5),companyMax','.filter(x=>x.count>=2),companyMax');
  response=new Response(audit,{headers:{'content-type':'text/html'}});
 }else if(url.pathname==='/api/page'&&url.searchParams.get('user')?.toLowerCase()==='laime'){
  const start=(Number(url.searchParams.get('page')||1)-1)*40;
  response=Response.json({games:games.slice(start,start+40),page:Number(url.searchParams.get('page')||1)});
 }else if(url.pathname==='/api/details'){
  response=Response.json({details:url.searchParams.getAll('path').map(path=>games.find(g=>g.path===path)),failed:0});
 }else response=await worker.fetch(new Request(url));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}).listen(4174,'127.0.0.1',()=>console.log('Logo validation on http://127.0.0.1:4174'));

