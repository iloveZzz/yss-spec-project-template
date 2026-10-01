import os,subprocess,time,json,statistics,pathlib,random
p=pathlib.Path('/tmp/yss-execution-research-20261001');env=os.environ.copy();env['NODE_PATH']=str(p/'ajv-poc/node_modules');env.pop('NODE_COMPILE_CACHE',None);modes=['python-single','python-batch','ajv-compile','ajv-standalone'];samples={k:[] for k in modes};outputs={}
for i in range(4):
 order=modes[:];random.Random(i).shuffle(order)
 for k in order:
  t=time.perf_counter();r=subprocess.run(['node',str(p/'schema-poc.mjs'),k],env=env,capture_output=True,timeout=60);d=(time.perf_counter()-t)*1000
  if r.returncode:raise RuntimeError(r.stderr.decode())
  outputs[k]=json.loads(r.stdout)
  if i:samples[k].append(d)
result={'method':'one warmup then 3 serial samples; wall time including Node launch/import/validation; 20 distinct task payloads from real v1 schema, 6 mutation classes; standalone generation excluded','schema':'.template-spec/process/schemas/digital-human-task-package.schema.json','samples_ms':samples,'p50_ms':{k:statistics.median(v) for k,v in samples.items()},'outputs':outputs,'decision_parity':len({json.dumps(x['results']) for x in outputs.values()})==1,'versions':{x:json.loads((p/'ajv-poc/node_modules'/x/'package.json').read_text())['version'] for x in ['ajv','ajv-formats']}}
(p/'schema-benchmark.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
