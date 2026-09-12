import pathlib,json,subprocess,datetime,socket,hashlib
out=pathlib.Path(__file__).resolve().parent;old=out.parent/'2026-09-11-oss-landscape/handoff-interview/execution-2026-09-12/runtime-preparation';registered=json.loads((old/'runtime-manifest.json').read_text());docker=['docker','--context','desktop-linux'];records=[]
def run(args):
 p=subprocess.run(docker+args,capture_output=True,text=True);records.append({'argv':docker+args,'executed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode,'stdout':p.stdout,'stderr':p.stderr});(out/'baseline-restore.json').write_text(json.dumps(records,indent=2)+'\n');assert p.returncode==0,p.stderr;return p.stdout.strip()
assert run(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}'])=='unix:///Users/zhudaoming/.docker/run/docker.sock'
ports={}
for ref in registered['containers']:
 name=ref['name'];meta=json.loads(run(['inspect',name,'--format','{"id":{{json .Id}},"image":{{json .Image}},"owner":{{json (index .Config.Labels "yss.trial")}},"state":{{json .State.Status}}}']));assert meta['id']==ref['container_id'] and meta['image']==ref['image_id'] and meta['owner']=='target-preview-20260912-0kxzmm'
 if meta['state']!='running':run(['start',name])
 mapping=run(['port',name,'5432' if name.endswith('-pg') else '6379']);assert mapping.startswith('127.0.0.1:') and '\n' not in mapping;ports[name]=int(mapping.split(':')[-1])
(out/'baseline-ports.json').write_text(json.dumps(ports,indent=2)+'\n');print(ports)
