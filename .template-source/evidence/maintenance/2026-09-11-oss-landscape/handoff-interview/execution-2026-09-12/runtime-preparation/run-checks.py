from pathlib import Path
import subprocess,os,json,time,re,concurrent.futures
OUT=Path(__file__).resolve().parent
ROOT=Path('/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm')
def clean(s):
 s=re.sub(r'(https?://)[^/@\s]+:[^/@\s]+@',r'\1[REDACTED]@',s)
 s=re.sub(r'(?i)((?:password|passwd|token|secret|authorization)\s*[=:]\s*)[^\s]+',r'\1[REDACTED]',s)
 return s
jobs=[('backend-offline-package',['./mvnw','-B','-o','-pl','valuation-outsourced-starter','-am','-DskipTests','package'],ROOT/'backend',180),('frontend-offline-install',['pnpm','install','--offline','--frozen-lockfile','--ignore-scripts'],ROOT/'frontend',120),('docker-server',['docker','--context','desktop-linux','version','--format','{{.Server.Version}}'],'/tmp',20),('docker-images',['docker','--context','desktop-linux','image','ls','--format','{{.Repository}}:{{.Tag}} {{.ID}}'],'/tmp',20)]
def run(job):
 name,argv,cwd,timeout=job;start=time.time();env=os.environ.copy();env['CI']='true'
 try:r=subprocess.run(argv,cwd=cwd,env=env,capture_output=True,text=True,timeout=timeout);code=r.returncode;raw=r.stdout+r.stderr
 except subprocess.TimeoutExpired as e:code=124;raw=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or '');raw+='\nTIMEOUT'
 text=clean(raw);(OUT/(name+'.log')).write_text(text);record={'name':name,'argv':argv,'cwd':str(cwd),'exit_code':code,'elapsed_seconds':round(time.time()-start,2),'log':name+'.log','redaction':'URL userinfo and credential assignments'};(OUT/(name+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(json.dumps(record),flush=True);print(text[-2500:],flush=True);return record
if __name__ == '__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(run,jobs))
 (OUT/'initial-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
