"""Map measured command entries to source paths; never infer execution from imports."""
from pathlib import Path
import json,csv,hashlib
out=Path(__file__).resolve().parent;audit=out.parent;root=Path(json.loads((out/'isolation.json').read_text())['source']);iso=Path(json.loads((out/'isolation.json').read_text())['root']);base=iso.parent
runs=[json.loads(x) for x in (out/'runs.jsonl').read_text().splitlines()]
def source_path(cwd,arg):
 p=Path(arg);p=p if p.is_absolute() else Path(cwd)/p
 p=p.resolve()
 try:return str(p.relative_to(root))
 except ValueError:pass
 try:return str(p.relative_to(iso.resolve()))
 except ValueError:pass
 for side in ['backend','frontend']:
  try:return str(Path('submodules')/('create-yss-harness-'+side)/p.relative_to((base/('cli-'+side)).resolve()))
  except ValueError:pass
 for name in ['create-yss-spec','create-yss-strategic-design','create-yss-harness-dev']:
  try:return str(Path('submodules')/name/p.relative_to((base/name).resolve()))
  except ValueError:pass
 return None
entries={}
for r in runs:
 args=r['argv']
 if args[0]=='node' and len(args)>1 and not args[1].startswith('-'):
  src=source_path(r['cwd'],args[1])
  if src and (root/src).is_file():entries.setdefault(src,[]).append({'label':r['label'],'exit_code':r['exit_code'],'trace':r['trace'],'kind':'process-entry'})
for path in (out/'traces').glob('*/*/*.json'):
 r=json.loads(path.read_text());src=source_path(str(iso),r.get('entry') or '')
 if src and (root/src).is_file():entries.setdefault(src,[]).append({'label':path.parent.parent.name,'exit_code':r.get('exit_code'),'trace':True,'kind':'traced-process-entry'})
entries['scripts/lib/plan-spec-entry.mjs']=[{'label':'isolated-plan-entry','exit_code':0,'trace':False,'kind':'explicit-synthetic-API-probe'}]
hashes={hashlib.sha256((root/p).read_bytes()).hexdigest() for p,v in entries.items() if any(x['exit_code']==0 for x in v)}
rows=json.loads((audit/'inventory/inventory.json').read_text());closure=json.loads((audit/'inventory/closure.json').read_text())
if isinstance(rows,dict):rows=rows['files']
if isinstance(closure,dict):closure=closure['files']
result=[]
for row in rows+closure:
 path=row['path'];direct=entries.get(path,[])
 status='static-only'
 if direct:status='measured-success' if any(x['exit_code']==0 for x in direct) else 'measured-rejected-input'
 elif row['sha256'] in hashes:status='same-content-as-measured-entry;not-measured-in-this-context'
 result.append({'path':path,'repo':row['repo'],'sha256':row['sha256'],'inventory_scope':row['inventory_scope'],'status':status,'labels':';'.join(sorted({r['label'] for r in direct}))})
with (out/'coverage.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=result[0]);w.writeheader();w.writerows(result)
counts={}
for r in result:counts[r['status']]=counts.get(r['status'],0)+1
(out/'coverage-summary.json').write_text(json.dumps({'rows':len(result),'counts':counts,'measured_entries':entries,'limitation':'Process entry/API probes only. Same-content and lexical reachability do not establish timing or successful execution in another repo/context.'},ensure_ascii=False,indent=2)+'\n')
print(counts)
