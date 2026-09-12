from pathlib import Path
import subprocess,json,secrets,os,time
OUT=Path(__file__).resolve().parent
ROOT=Path('/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm')
private=ROOT/'runtime-private';private.mkdir(mode=0o700,exist_ok=True)
cred=private/'database.json';password=(json.loads(cred.read_text())['password'] if cred.exists() else secrets.token_urlsafe(32));cred.write_text(json.dumps({'username':'pilot','password':password,'control_database':'pilot_control','target_database':'pilot_target'}));cred.chmod(0o600)
base=['docker','--context','desktop-linux'];records=[]
def run(argv,env=None):
 p=subprocess.run(base+argv,env=env,capture_output=True,text=True);s=(p.stdout+p.stderr).replace(password,'[REDACTED]');records.append({'argv':base+argv,'exit_code':p.returncode,'output':s});(OUT/'local-service-actions.json').write_text(json.dumps(records,indent=2)+'\n');print(s.strip());assert p.returncode==0;return p.stdout.strip()
label=['--label','yss.trial=target-preview-20260912-0kxzmm']
network='yss-preview-0kxzmm-net';run(['network','create',*label,network])
for role,image,port in [('pg','sha256:65e8e7578613732cb07166ea4f1f0bd2096679f5217b5ac23de619077ed684e7',5432),('redis','sha256:2c96e8092504e99e7601bcb6f4954b4cfed77d5125c88061a49c252fb33cf6f7',6379)]:
 name='yss-preview-0kxzmm-'+role;vol=name+'-data';run(['volume','create',*label,vol]);args=['run','-d','--name',name,*label,'--network',network,'--publish','127.0.0.1::'+str(port),'--mount','type=volume,source='+vol+',target='+('/var/lib/postgresql/data' if role=='pg' else '/data')]
 env=os.environ.copy()
 if role=='pg':env['POSTGRES_PASSWORD']=password;args+=['--env','POSTGRES_PASSWORD','--env','POSTGRES_USER=pilot','--env','POSTGRES_DB=pilot_control']
 else:args+=[]
 run(args+[image],env);run(['port',name,str(port)])
for attempt in range(20):
 r=subprocess.run(base+['exec','yss-preview-0kxzmm-pg','pg_isready','-U','pilot','-d','pilot_control'],capture_output=True,text=True)
 if r.returncode==0:break
 time.sleep(.5)
run(['exec','yss-preview-0kxzmm-pg','psql','-U','pilot','-d','pilot_control','-v','ON_ERROR_STOP=1','-c','CREATE DATABASE pilot_target;'])
run(['exec','yss-preview-0kxzmm-redis','redis-cli','PING'])
(OUT/'local-services.json').write_text(json.dumps({'records':records,'network':network,'credentials_ref':str(cred),'ownership':'only this trial','external_connections':'dedicated Docker bridge network, host ports loopback'},indent=2)+'\n')
