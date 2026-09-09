import json,csv,statistics,hashlib
from pathlib import Path
out=Path(__file__).resolve().parent;rows=[json.loads(s) for s in (out/'runs.jsonl').read_text().splitlines()]
groups={}
for row in rows:groups.setdefault(row['label'],[]).append(row)
summary=[]
for label,samples in groups.items():
 times=[r['wall_ms'] for r in samples]
 summary.append(dict(label=label,trace=samples[0]['trace'],samples=len(samples),median_ms=round(statistics.median(times),3),min_ms=min(times),max_ms=max(times),exit_codes=','.join(str(r['exit_code']) for r in samples),success=all(r['exit_code']==0 and not r['timeout'] for r in samples),timeout=any(r['timeout'] for r in samples),argv=samples[0]['argv'],cwd=samples[0]['cwd']))
(out/'timings.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
with (out/'timings.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=summary[0].keys());w.writeheader();w.writerows(summary)
traces={}
for trace in (out/'traces').glob('*'):
 docs=[json.loads(p.read_text()) for p in trace.glob('*/*.json')];entries=[]
 for d in docs:
  ops=d['operations'];py={k:v for k,v in ops.items() if k.startswith('spawnSync:python') and 'schema.json' in k}
  entries.append({'entry':d.get('entry'),'entry_note':None if d.get('entry') else 'No file entry recorded (for example node -e); operations retained.','wall_ms':d['wall_ms'],'schema_processes':sum(v['count'] for v in py.values()),'schema_ms':sum(v['duration_ms'] for v in py.values()),'operations':ops})
 traces[trace.name]={'processes':entries,'schema_processes':sum(e['schema_processes'] for e in entries),'schema_ms':sum(e['schema_ms'] for e in entries)}
(out/'trace-summary.json').write_text(json.dumps(traces,ensure_ascii=False,indent=2)+'\n')
print(len(rows),'runs;',len(summary),'commands;',len(traces),'trace sets')
