"""Replay the exact recorded original Java launch after its process has stopped."""
from pathlib import Path
import subprocess,json,socket,hashlib,datetime
out=Path(__file__).resolve().parent;x=json.loads((out/'service-launch-08.json').read_text());jar=Path(x['argv'][x['argv'].index('-jar')+1]);assert hashlib.sha256(jar.read_bytes()).hexdigest()==x['jar_sha256'],'JAR changed; require new launch basis'
with socket.socket() as s:assert s.connect_ex(('127.0.0.1',x['port']))!=0,'port in use; refuse duplicate launch'
assert Path(x['config_ref']).is_file(),'private config missing; do not reconstruct credentials or shared config'
expected=json.loads((out/'runtime-manifest.json').read_text())['java']['config_sha256'];assert hashlib.sha256(Path(x['config_ref']).read_bytes()).hexdigest()==expected,'config changed; require new launch basis'
private=Path(x['config_ref']).parent;stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ');log=private/('java-restart-'+stamp+'.raw.log');fd=log.open('w');proc=subprocess.Popen(x['argv'],cwd=private,stdout=fd,stderr=subprocess.STDOUT,start_new_session=True);fd.close();x.update(pid=proc.pid,raw_log_ref=str(log),restart_at=stamp);(out/('service-restart-'+stamp+'.json')).write_text(json.dumps(x,indent=2)+'\n');print('restarted original Java pid',proc.pid,'on',x['port'],'; run fresh HTTP collection before use')
