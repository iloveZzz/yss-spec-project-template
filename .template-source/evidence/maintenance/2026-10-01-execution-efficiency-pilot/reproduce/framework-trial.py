import pathlib,subprocess,os,json,time,hashlib,shutil,random,statistics,math
P=pathlib.Path(__file__).parent;W=P/'trial';B=P/'tools/node_modules/.bin'
BASE={**os.environ,'NX_DAEMON':'false','NX_CACHE_FAILURES':'false','NX_NO_CLOUD':'true','MOON_TELEMETRY':'false','NO_COLOR':'1','PILOT_MODE':'normal','PILOT_AUDIT':str(P/'task-executions.jsonl')}
def cmd(tool,names):
 if tool=='runner':return ['node','runner.mjs',*names]
 if tool=='nx':return [str(B/'nx'),'run-many','-t',','.join(names),'-p','pilot','--parallel=1','--outputStyle=static']
 return [str(B/'moon'),'run',*['pilot:'+x for x in names],'--concurrency','1']
def cache_clear(tool):
 for d in ({'nx':['.nx/cache','.nx/workspace-data'],'moon':['.moon/cache'],'runner':[]}[tool]):shutil.rmtree(W/d,ignore_errors=True)
def outputs(names):
 return {name:hashlib.sha256((W/f'out/{name}/result.json').read_bytes()).hexdigest() if (W/f'out/{name}/result.json').exists() else None for name in names}
def run(tool,names,mode='normal',log=None):
 audit=P/'task-executions.jsonl';before=len(audit.read_text().splitlines()) if audit.exists() else 0;start=time.perf_counter()
 r=subprocess.run(cmd(tool,names),cwd=W,env={**BASE,'PILOT_MODE':mode},capture_output=True,text=True,timeout=120)
 code=r.returncode
 if code==0:
  try:
   for name in names:
    artifact=W/f'out/{name}/result.json';manifest=json.loads((W/f'out/{name}/manifest.json').read_text())
    assert manifest['sha256']==hashlib.sha256(artifact.read_bytes()).hexdigest()
    obj=json.loads(artifact.read_text());assert obj['mode']==mode
    current={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (W/'inputs').iterdir()}
    assert obj['inputs']==current
  except (ValueError,KeyError,AssertionError,FileNotFoundError):code=86
 elapsed=(time.perf_counter()-start)*1000;entries=[json.loads(l) for l in audit.read_text().splitlines()[before:]] if audit.exists() else []
 if log:(P/(log+'.stdout')).write_text(r.stdout);(P/(log+'.stderr')).write_text(r.stderr)
 return {'tool':tool,'ms':elapsed,'exit':code,'executed':[x['task'] for x in entries],'outputs':outputs(names)}
def correctness(tools=None):
 names=['schema','query','checks'];res=[]
 originals={p:p.read_bytes() for p in (W/'inputs').iterdir()}
 variants={
  'data-change':('inputs/data.json',b'{"count":2,"name":"updated"}'),
  'schema-change':('inputs/schema.json',None),
  'reference-change':('inputs/reference.json',b'{"type":"integer","minimum":0}'),
  'lock-change':('inputs/lock.json',b'{"version":"changed"}'),
  'runtime-change':('inputs/runtime.json',b'{"node":"different-runtime"}'),
  'ignored-change':('inputs/ignored.json',b'{"enabled":true,"revision":2}'),
  'script-change':('task.mjs',None),
 }
 for tool in (tools or ['runner','nx','moon']):
  cache_clear(tool);base=run(tool,names,log=f'correct-{tool}-initial');hot=run(tool,names)
  res.append({'tool':tool,'case':'unchanged','pass':hot['exit']==0 and hot['outputs']==base['outputs'],'detail':hot})
  for label,(file,content) in variants.items():
   p=W/file;old=p.read_bytes()
   if content is None:content=old+(b'\n// change\n' if file.endswith('.mjs') else b'\n ')
   p.write_bytes(content)
   candidate=run(tool,names);oracle=run('runner',names)
   res.append({'tool':tool,'case':label,'pass':candidate['exit']==oracle['exit']==0 and candidate['outputs']==oracle['outputs'] and set(candidate['executed'])==set(names),'detail':candidate})
   p.write_bytes(old);run(tool,names)
  candidate=run(tool,names,'different');oracle=run('runner',names,'different')
  res.append({'tool':tool,'case':'environment-change','pass':candidate['exit']==oracle['exit']==0 and candidate['outputs']==oracle['outputs'] and set(candidate['executed'])==set(names),'detail':candidate})
  run(tool,names);shutil.rmtree(W/'out');restored=run(tool,names)
  res.append({'tool':tool,'case':'output-deletion','pass':restored['exit']==0 and restored['outputs']==base['outputs'],'detail':restored})
  p=W/'out/query/result.json';p.write_text('TAMPERED');damaged=run(tool,names)
  res.append({'tool':tool,'case':'output-tamper','pass':damaged['exit']!=0 or damaged['outputs']==base['outputs'],'detail':damaged})
  # Force clean output reconstruction, so a preceding failure cannot pollute later probes.
  shutil.rmtree(W/'out');run(tool,names)
  p=W/'inputs/ignored.json';old=p.read_bytes();p.unlink();missing=run(tool,names)
  res.append({'tool':tool,'case':'ignored-missing','pass':missing['exit']!=0 and len(missing['executed'])>0,'detail':missing});p.write_bytes(old);run(tool,names)
  for i in range(2):
   bad=run(tool,names,'fail');res.append({'tool':tool,'case':f'failure-{i+1}','pass':bad['exit']!=0 and bad['executed']==['schema'],'detail':bad})
  recovered=run(tool,names);res.append({'tool':tool,'case':'recovery','pass':recovered['exit']==0 and recovered['outputs']==base['outputs'],'detail':recovered})
  readme=W/'README.md';readme.write_text('unrelated');unrelated=run(tool,names);readme.unlink()
  res.append({'tool':tool,'case':'unrelated-readme','pass':unrelated['exit']==0 and unrelated['outputs']==base['outputs'],'detail':unrelated})
 for p,data in originals.items():p.write_bytes(data)
 if tools:
  (P/'framework-correctness-nx-local.json').write_text(json.dumps(res,indent=2)+'\n')
  res=[x for x in json.loads((P/'framework-correctness.json').read_text()) if x['tool'] not in tools]+res
 (P/'framework-correctness.json').write_text(json.dumps(res,indent=2)+'\n')
 print(json.dumps({'cases':len(res),'failures':[{'tool':x['tool'],'case':x['case']} for x in res if not x['pass']]}),flush=True)
def benchmark():
 random.seed(20261001);rows=[];protocol={'samples':21,'warmups':2,'workloads':{'tiny':['schema','query'],'daily':['schema','query','checks']},'regimes':['cold-cache','hot-cache','input-change'],'guard':'all tools check output manifest SHA256, current input hashes and mode after execution; checksum mismatch exits86; graph schema->query->checks', 'execution':'serial randomized tool order; fresh CLI processes; daemon off; local only; filesystem warm; p95 nearest-rank; cold resets task cache not OS page cache; equal weights declared; all source frozen'}
 (P/'framework-protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
 for workload,names in protocol['workloads'].items():
  for regime in protocol['regimes']:
   for tool in ['runner','nx','moon']:
    cache_clear(tool)
    for _ in range(2):run(tool,names)
   for i in range(21):
    order=['runner','nx','moon'];random.shuffle(order)
    for tool in order:
     if regime=='cold-cache':cache_clear(tool)
     mode=f'variation-{workload}-{i}' if regime=='input-change' else 'normal'
     row=run(tool,names,mode);row.update(workload=workload,regime=regime,index=i);rows.append(row)
     if row['exit']!=0:raise RuntimeError(row)
     expected=len(names) if tool=='runner' or regime in ['cold-cache','input-change'] else 0
     if len(row['executed'])!=expected:raise RuntimeError({'cache-execution-count-mismatch':row,'expected':expected})
    (P/'framework-benchmark.json').write_text(json.dumps({'protocol':protocol,'rows':rows},indent=2)+'\n')
   print(workload,regime,'done',flush=True)
 summary=[]
 for workload in protocol['workloads']:
  for regime in protocol['regimes']:
   for tool in ['runner','nx','moon']:
    group=[r for r in rows if r['tool']==tool and r['workload']==workload and r['regime']==regime];t=sorted(r['ms'] for r in group)
    summary.append({'workload':workload,'regime':regime,'tool':tool,'median_ms':statistics.median(t),'p95_ms':t[math.ceil(.95*len(t))-1],'actual_task_executions':sum(len(r['executed']) for r in group)})
 (P/'framework-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
if __name__=='__main__':
 import sys
 benchmark() if 'benchmark' in sys.argv else correctness(['nx'] if 'nx-only' in sys.argv else None)
