"""Analysis-only hypothesis test, not a replacement validator or runtime change."""
import json,subprocess,time,statistics,sys,copy
from pathlib import Path
out=Path(__file__).resolve().parent
schema=Path(sys.argv[1]).resolve()
value={'schema_version':1,'repository_mode':'project-instance','stage':'stage.plan','work_unit':'work-unit.plan-requirements','status':'reconciled','context_snapshot':{'context_ref':'CONTEXT.md','context_schema_version':1,'document_digest':'sha256:'+'a'*64,'referenced_terms_digest':'sha256:'+'b'*64,'term_refs':[]},'changes':{'added':[],'updated':[],'deprecated':[]},'unresolved_terms':[],'evidence_refs':['CONTEXT.md']}
values=[]
for i in range(20):
 v=copy.deepcopy(value)
 if i%2:v['status']='invalid'
 values.append(v)
# Same engine, schema and sorted diagnostics in both paths. Only batching differs.
program='''import json,sys
from jsonschema import Draft202012Validator
s=json.load(open(sys.argv[1],encoding="utf-8")); v=Draft202012Validator(s)
print(json.dumps([[".".join(map(str,e.absolute_path))+": "+e.message for e in sorted(v.iter_errors(item),key=lambda e:list(e.absolute_path))] for item in json.load(sys.stdin)]))
'''
def validate(items):
 p=subprocess.run(['python3','-c',program,str(schema)],input=json.dumps(items),text=True,capture_output=True,check=True)
 return json.loads(p.stdout)
rows=[]
for i in range(3):
 t=time.perf_counter();separate=[validate([v])[0] for v in values];separate_ms=(time.perf_counter()-t)*1000
 t=time.perf_counter();batch=validate(values);batch_ms=(time.perf_counter()-t)*1000
 assert separate==batch and sum(not errors for errors in batch)==10
 rows.append({'sample':i,'separate_ms':separate_ms,'batch_ms':batch_ms,'identical_errors':True,'valid':10,'invalid':10})
 print(json.dumps(rows[-1]),flush=True)
result={'schema':str(schema),'records_per_sample':20,'python_processes':{'separate':20,'batch':1},'samples':rows,'scope':'schema-only; excludes filesystem snapshot, approval and freshness checks; not production implementation','median_separate_ms':statistics.median(r['separate_ms'] for r in rows),'median_batch_ms':statistics.median(r['batch_ms'] for r in rows)}
(out/'schema-batch-experiment.json').write_text(json.dumps(result,indent=2)+'\n')
