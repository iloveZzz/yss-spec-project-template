from pathlib import Path
import subprocess,json,datetime,time,os
OUT=Path(__file__).resolve().parent;BASE=OUT.parent;registered=json.loads((BASE/'runtime-manifest.json').read_text());docker=['docker','--context','desktop-linux'];records=[]
def run(args):
 start=datetime.datetime.now(datetime.timezone.utc).isoformat();r=subprocess.run(docker+args,capture_output=True,text=True);record={'argv':docker+args,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr};records.append(record);(OUT/'restore-commands.json').write_text(json.dumps(records,indent=2)+'\n');assert r.returncode==0,r.stderr;return r.stdout.strip()
endpoint=run(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']);assert endpoint=='unix:///Users/zhudaoming/.docker/run/docker.sock','unexpected Docker endpoint'
restored=[]
for ref in registered['containers']:
 name=ref['name'];meta=json.loads(run(['inspect',name,'--format','{"id":{{json .Id}},"image":{{json .Image}},"owner":{{json (index .Config.Labels "yss.trial")}},"state":{{json .State.Status}}}']));assert meta['id']==ref['container_id'] and meta['image']==ref['image_id'] and meta['owner']=='target-preview-20260912-0kxzmm','identity changed'
 if meta['state']!='running':run(['start',name])
 port='5432' if name.endswith('-pg') else '6379';mapping=run(['port',name,port]);assert mapping.startswith('127.0.0.1:') and '\n' not in mapping,'not exclusive loopback binding';meta.update(name=name,host='127.0.0.1',host_port=int(mapping.split(':')[-1]),container_port=int(port));restored.append(meta)
for attempt in range(30):
 r=subprocess.run(docker+['exec','yss-preview-0kxzmm-pg','pg_isready','-U','pilot','-d','pilot_control'],capture_output=True,text=True)
 if r.returncode==0:break
 time.sleep(.2)
run(['exec','yss-preview-0kxzmm-pg','pg_isready','-U','pilot','-d','pilot_control']);run(['exec','yss-preview-0kxzmm-redis','redis-cli','PING'])
private=Path(json.loads((BASE/'service-launch-08.json').read_text())['config_ref']).parent;cred=json.loads((private/'database.json').read_text());pg=next(x for x in restored if x['name'].endswith('-pg'));connection={role:{'jdbc_url':'jdbc:postgresql://127.0.0.1:'+str(pg['host_port'])+'/'+db,'username':cred['username'],'password':cred['password']} for role,db in [('control','pilot_control'),('target','pilot_target')]};target=private/'probe-connection.json';target.write_text(json.dumps(connection,indent=2)+'\n');target.chmod(0o600)
(OUT/'restored-services.json').write_text(json.dumps({'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'containers':restored,'connection_config_ref':str(target),'java_started':False,'vite_started':False},indent=2)+'\n');print('PG/Redis restored; ports:',[(x['name'],x['host_port']) for x in restored]);print('Private connection config:',target)
