import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import app from '../api/[...path].mjs';
const port=Number(process.env.PORT||4174);
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost:'+port);
 if(url.pathname.startsWith('/api/')){const response=await app.fetch(new Request(url));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
 if(url.pathname==='/'||url.pathname==='/index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(new URL('../public/index.html',import.meta.url)));return;}
 res.writeHead(404);res.end('Not found');
}catch{res.writeHead(500);res.end('Local server error');}}).listen(port,'127.0.0.1',()=>console.log('Backloggd Atlas: http://localhost:'+port));
