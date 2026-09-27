"""All real model attempts, including excluded calibration/environment failures."""
import datetime,json,pathlib
E=pathlib.Path(__file__).resolve().parent
sources=json.loads((E/'calibration-archive.json').read_text())['sources']
for name,config in [('formal-primary','C2-v2-config.json'),('ui-supplement','C2-ui-supplement-config.json')]:
 p=E/config
 if p.exists():sources.append({'name':name,'path':json.loads(p.read_text())['root']})
rows=[];seen=set()
for source in sources:
 root=pathlib.Path(source['path']).resolve();traces=[];usage=[];unreported=0;results=[]
 for trace in sorted(root.rglob('trace.jsonl')):
  if str(trace.resolve()) in seen:continue
  seen.add(str(trace.resolve()));events=[]
  for line in trace.read_text().splitlines():
   try:events.append(json.loads(line))
   except json.JSONDecodeError:continue
  reports=[e['usage'] for e in events if 'usage' in e];usage+=reports
  completed=any(e.get('type')=='turn.completed' for e in events)
  if not reports:unreported+=1
  traces.append({'ref':str(trace),'completed':completed,'usage_reported':bool(reports)})
 for p in root.rglob('result.json'):
  try:r=json.loads(p.read_text())
  except (json.JSONDecodeError,UnicodeDecodeError):continue
  if isinstance(r,dict) and all(k in r for k in ['scenario','variant','elapsed_seconds','automatic_result']):results.append(r)
 rows.append({'group':source['name'],'path':str(root),'attempted_turns_with_retained_trace':len(traces),'completed_turns':sum(x['completed'] for x in traces),'usage_unreported_turns':unreported,'complete_scenario_records':len(results),'known_scenario_elapsed_seconds':round(sum(r['elapsed_seconds'] for r in results),2),'reported_usage':{k:sum(x.get(k,0) for x in usage) for k in ['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens']},'traces':traces})
total={'attempted_turns_with_retained_trace':sum(r['attempted_turns_with_retained_trace'] for r in rows),'completed_turns':sum(r['completed_turns'] for r in rows),'usage_unreported_turns':sum(r['usage_unreported_turns'] for r in rows),'reported_usage':{k:sum(r['reported_usage'][k] for r in rows) for k in ['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens']}}
report={'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'groups':rows,'total':total,'money':None,'limits':['Includes environment failures and calibration excluded from comparison','Attempt count is retained CLI invocation traces, not provider-internal request count','In-flight or killed turns may lack usage and duration; unknown is not zero','Cached input is part of total input, not extra input','No verified tariff or invoice, no dollar estimate','Human maintainer analysis usage outside eval CLI is unavailable to this ledger']}
(E/'all-evaluation-resource-ledger.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'groups':[{k:v for k,v in r.items() if k!='traces'} for r in rows],'total':total},ensure_ascii=False))
