"""Analysis runner: explicit argv only; bounded process groups; baseline != trace."""
import os,sys,time,json,hashlib,subprocess,signal,resource
from pathlib import Path
out=Path(__file__).resolve().parent

def run(label,cwd,args,*,repeat=3,timeout=90,trace=False,extra_env=None):
 rows=[]
 for i in range(repeat):
  env=os.environ.copy()
  env.pop('NODE_OPTIONS',None) # reproducible instrumentation/runtime
  for key,value in (extra_env or {}).items():
   if value is None:env.pop(key,None)
   else:env[key]=value
  if trace:
   trace_dir=out/'traces'/label/str(i);trace_dir.mkdir(parents=True,exist_ok=True)
   env['NODE_OPTIONS']='--require='+str(out/'probe.cjs');env['YSS_PERF_TRACE_DIR']=str(trace_dir)
  before=resource.getrusage(resource.RUSAGE_CHILDREN);start=time.perf_counter()
  p=subprocess.Popen(args,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
  timedout=False
  try:stdout,stderr=p.communicate(timeout=timeout)
  except subprocess.TimeoutExpired:
   timedout=True;os.killpg(p.pid,signal.SIGTERM)
   try:stdout,stderr=p.communicate(timeout=3)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);stdout,stderr=p.communicate()
  after=resource.getrusage(resource.RUSAGE_CHILDREN)
  row=dict(label=label,sample=i,trace=trace,cwd=str(cwd),argv=args,wall_ms=round((time.perf_counter()-start)*1000,3),cpu_user_ms=round((after.ru_utime-before.ru_utime)*1000,3),cpu_system_ms=round((after.ru_stime-before.ru_stime)*1000,3),exit_code=p.returncode,timeout=timedout,stdout_bytes=len(stdout),stderr_bytes=len(stderr),executed_at=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
  log=out/'logs';log.mkdir(exist_ok=True);(log/f'{label}-{i}.stdout').write_bytes(stdout);(log/f'{label}-{i}.stderr').write_bytes(stderr)
  row['stdout_ref']=str((log/f'{label}-{i}.stdout').relative_to(out));row['stderr_ref']=str((log/f'{label}-{i}.stderr').relative_to(out))
  with (out/'runs.jsonl').open('a') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n')
  print(label,i,row['wall_ms'],p.returncode,'timeout' if timedout else '',flush=True);rows.append(row)
  if timedout:break
 return rows
if __name__=='__main__':
 plan=json.loads(Path(sys.argv[1]).read_text())
 for job in plan:run(**job)
