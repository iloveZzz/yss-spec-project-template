"""Transparent loopback TCP forwarding to the same registered Docker volumes; no protocol responses."""
import asyncio,json,pathlib,os,datetime
out=pathlib.Path(__file__).resolve().parent;ports=json.loads((out/'baseline-ports.json').read_text())
async def pipe(reader,writer):
 try:
  while data:=await reader.read(65536):writer.write(data);await writer.drain()
 finally:writer.close()
async def serve(reader,writer,target):
 try:
  other_read,other_write=await asyncio.open_connection('127.0.0.1',target)
  await asyncio.gather(pipe(reader,other_write),pipe(other_read,writer))
 except (ConnectionError,OSError):writer.close()
async def main():
 servers=[]
 for local,key in [(60050,'yss-preview-0kxzmm-pg'),(60054,'yss-preview-0kxzmm-redis')]:
  servers.append(await asyncio.start_server(lambda r,w,t=ports[key]:serve(r,w,t),'127.0.0.1',local))
 (out/'baseline-port-forward.json').write_text(json.dumps({'pid':os.getpid(),'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bindings':{'127.0.0.1:60050':ports['yss-preview-0kxzmm-pg'],'127.0.0.1:60054':ports['yss-preview-0kxzmm-redis']},'scope':'transparent TCP to registered dedicated Docker; original data/config bytes unchanged'},indent=2)+'\n')
 print('Loopback forwarding ready',flush=True);await asyncio.gather(*(s.serve_forever() for s in servers))
asyncio.run(main())
