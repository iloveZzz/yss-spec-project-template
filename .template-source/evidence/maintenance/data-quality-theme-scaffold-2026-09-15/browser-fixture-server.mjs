import http from 'node:http';import path from 'node:path';import {readFile,stat} from 'node:fs/promises';
const roots=['/tmp/yss-dq-scaffold-verified/packages/dist','/tmp/yss-dq-standalone-dist'];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://127.0.0.1:4188');try{
 if(['/dq-demo','/dq-demo/'].includes(url.pathname)){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><link rel="icon" href="/favicon.svg"></head><body><div id="host-marker">宿主</div><div id="micro"></div><script src="/host.js"></script></body></html>');return;}
 let names=url.pathname==='/host.js'?['/tmp/yss-dq-qiankun-host/host.js']:url.pathname.startsWith('/standalone')?[path.join(roots[1],url.pathname.replace(/^\/standalone\/?/,'')||'index.html')]:url.pathname.startsWith('/micro/')?[path.join(roots[0],url.pathname.slice(7))]:roots.map(root=>path.join(root,url.pathname));
 for(const name of names){try{if(!(await stat(name)).isFile())continue;const bytes=await readFile(name);res.setHeader('Content-Type',mime[path.extname(name)]||'application/octet-stream');res.end(bytes);return;}catch{}}
 res.writeHead(404);res.end('not found');
 }catch(error){res.writeHead(500);res.end(error.message);}});server.listen(4188,'127.0.0.1',()=>console.log('fixture http://127.0.0.1:4188'));
