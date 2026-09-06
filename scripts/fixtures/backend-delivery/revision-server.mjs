// Synthetic maintenance service. Never used as evidence of product API readiness.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const server=createServer((request,response)=>{
  if(request.method!=='GET'||request.url!=='/version') {response.writeHead(404);response.end();return;}
  const state=JSON.parse(readFileSync(process.argv[2],'utf8'));
  response.writeHead(state.status||200,{'content-type':'application/json'});
  response.end(JSON.stringify(state.body));
});
server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));
process.on('disconnect',()=>server.close(()=>process.exit(0)));
