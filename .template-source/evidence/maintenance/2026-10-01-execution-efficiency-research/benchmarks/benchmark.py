import subprocess,time,json,os,statistics,random,pathlib,platform,hashlib
root=pathlib.Path.cwd(); out=pathlib.Path('/tmp/yss-execution-research-20261001'); cache=out/'node-compile-cache';cache.mkdir(exist_ok=True)
base=os.environ.copy();base.pop('NODE_COMPILE_CACHE',None);base.pop('NODE_OPTIONS',None)
query=['scripts/query-lifecycle-context','--mode','route','--stage','stage.plan','--work-unit','work-unit.plan-requirements','--include','execution_efficiency']
cases={
 'node_start':(['node','-e',''],{}), 'bun_start':(['bun','-e',''],{}),
 'python_start':(['python3','-c','pass'],{}),'python_jsonschema_import':(['python3','-c','import jsonschema'],{}),
 'node_query':(['node']+query,{}),'node_query_compile_cache':(['node']+query,{'NODE_COMPILE_CACHE':str(cache)}),'bun_query':(['bun']+query,{}),
 'node_mode':(['node','scripts/repository-mode'],{}),'bun_mode':(['bun','scripts/repository-mode'],{}),
 'node_plan':(['node','scripts/run-template-verification','--profile','fast','--changed-file','README.md','--plan','--json'],{}),
 'node_plan_compile_cache':(['node','scripts/run-template-verification','--profile','fast','--changed-file','README.md','--plan','--json'],{'NODE_COMPILE_CACHE':str(cache)}),
 'bun_plan':(['bun','scripts/run-template-verification','--profile','fast','--changed-file','README.md','--plan','--json'],{})}
rows={k:[] for k in cases};first={}; outputs={}
def once(k):
 cmd,e=cases[k];t=time.perf_counter();p=subprocess.run(cmd,cwd=root,env=base|e,capture_output=True,timeout=40);d=(time.perf_counter()-t)*1000
 if p.returncode:raise RuntimeError((k,p.returncode,p.stderr.decode()[:300]))
 outputs[k]=p.stdout;return {'ms':d,'exit':p.returncode,'stdout_bytes':len(p.stdout),'stdout_sha256':hashlib.sha256(p.stdout).hexdigest()}
for k in cases:
 first[k]=once(k)
 for _ in range(2):once(k)
rng=random.Random(42)
for _ in range(11):
 order=list(cases);rng.shuffle(order)
 for k in order:rows[k].append(once(k))
summary={k:{'p50_ms':statistics.median(x['ms'] for x in v),'p95_ms':sorted(x['ms'] for x in v)[-1],'min_ms':min(x['ms'] for x in v),'max_ms':max(x['ms'] for x in v)} for k,v in rows.items()}
parity={k:outputs[a]==outputs[b] for k,a,b in [('query','node_query','bun_query'),('mode','node_mode','bun_mode'),('plan','node_plan','bun_plan'),('query_cache','node_query','node_query_compile_cache'),('plan_cache','node_plan','node_plan_compile_cache')]}
for k in ['node_query','bun_query','node_plan','bun_plan']: json.loads(outputs[k])
reject={}
for runtime in ['node','bun']:
 p=subprocess.run([runtime,'scripts/query-lifecycle-context','--stage','stage.invalid'],capture_output=True,env=base)
 reject[runtime]={'code':p.returncode,'stderr':p.stderr.decode()}
result={'date':'2026-10-01 Asia/Shanghai','head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'platform':platform.platform(),'machine':platform.machine(),'cpu':subprocess.check_output(['sysctl','-n','machdep.cpu.brand_string'],text=True).strip(),'versions':{c:subprocess.check_output([c,'--version'],text=True).strip() for c in ['node','bun','python3','uv']},'method':'serial shuffled 11 samples after 2 warmups; fresh processes, warm filesystem; p95 nearest rank; no cache purge; wall time includes spawn+capture; same live source, no full release benchmark','cases':{k:{'argv':v[0],'env_overrides':v[1]} for k,v in cases.items()},'first_runs':first,'samples':rows,'summary':summary,'byte_parity':parity,'invalid_stage':reject}
(out/'benchmark.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'summary':summary,'byte_parity':parity,'invalid_stage':reject},ensure_ascii=False,indent=2))
