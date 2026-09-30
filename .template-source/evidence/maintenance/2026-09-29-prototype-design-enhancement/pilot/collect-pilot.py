import json, hashlib, shutil, tarfile, re
from pathlib import Path
W=Path(__file__).parent.resolve()
E=Path('/Users/zhudaoming/Projects/yss-spec-project-template/.template-source/evidence/maintenance/2026-09-29-prototype-design-enhancement')
P=E/'pilot'; P.mkdir(exist_ok=True)
suite=json.loads((W/'pilot-scenarios.json').read_text())['scenarios']
results=[]; mapping=[]; manifest={}
for arm,directory in [('baseline','baseline-results-v2'),('candidate','candidate-results')]:
 root=W/directory
 rows=[json.loads(line) for line in (root/'results.jsonl').read_text().splitlines()]
 for name in ['summary.json','results.jsonl','run-config.json']:
  if (root/name).exists():
   target=P/arm/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target)
 by={row['scenario']:row for row in rows}
 for i,case in enumerate(suite):
  row=by.get(case['id'])
  if not row: continue
  side=('A' if i%2==0 else 'B') if arm=='baseline' else ('B' if i%2==0 else 'A')
  directory=root/(case['id']+'-1');output=P/arm/case['id'];output.mkdir(parents=True,exist_ok=True)
  # Preserve real runner traces, including truncated final JSON lines after a timeout.
  trace=directory/'trace.jsonl';s=trace.read_text()
  if re.search(r'(?i)(?:authorization[\"\s:]*bearer\s+|api[_-]?key\s*[=:]\s*[\"\']?sk-|sk-[A-Za-z0-9]{24,})',s):raise RuntimeError('credential-like material detected; inspect before archiving')
  shutil.copy2(trace,output/'trace.jsonl')
  (output/'result.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
  read_commands=[];bad_commands=[];explicit_paths=set();invalid=0;output_bytes=0
  for line in s.splitlines():
   try:event=json.loads(line)
   except json.JSONDecodeError:invalid+=1;continue
   item=event.get('item',{})
   if event.get('type')!='item.completed' or item.get('type')!='command_execution':continue
   command=item.get('command','');output_bytes+=len(item.get('aggregated_output','').encode())
   if item.get('exit_code')!=0:bad_commands.append({'command':command,'exit_code':item.get('exit_code'),'output':item.get('aggregated_output','')})
   if item.get('exit_code')==0 and re.search(r'\b(cat|sed|head)\b|read_text\(|readFile',command):
    refs=sorted(set(re.findall(r'\.agents/skills/[\w/.-]+',command)))
    explicit_paths.update(refs);read_commands.append({'command':command,'paths':refs})
  (output/'command-observations.json').write_text(json.dumps({'successful_read_commands':read_commands,'failed_commands':bad_commands,'truncated_trace_lines':invalid,'tool_output_bytes':output_bytes,'scope':'Tool-output byte count is not total source bytes read or token usage; multi-file and partial reads need trace inspection.'},ensure_ascii=False,indent=2)+'\n')
  draft=directory/'workspace/drafts'; target=P/'ab'/case['id']/side
  if draft.exists():
   for file in draft.rglob('*'):
    if file.is_symlink():raise RuntimeError(f'Unexpected pilot symlink: {file}')
   shutil.copytree(draft,target,dirs_exist_ok=True)
  result={'task':case['id'],'title':case['files']['fixture/brief.md'].splitlines()[0].removeprefix('# '),'arm':arm,'side':side,'automatic_result':row['automatic_result'],'timeout':row['timeout'],'elapsed_seconds':row['elapsed_seconds'],'tool_calls':row['tool_calls'],'usage':row['usage'],'usage_status':'reported' if row['usage'] else 'unknown','turn_completed':all(x.get('turn_completed',False) for x in row['steps']),'html_exists':(target/'index.html').is_file(),'design_exists':(target/'design.md').is_file(),'explicit_skill_reference_paths':sorted(explicit_paths),'failed_commands':len(bad_commands),'write_scope':row['steps'][0]['write_scope'],'trace_ref':str((output/'trace.jsonl').relative_to(E)),'semantic_review':'pending-browser-and-source-inspection'}
  results.append(result);mapping.append({'task':case['id'],'side':side,'arm':arm})
(P/'observations.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
(P/'ab-mapping.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
shutil.copy2(W/'pilot-budget.json',P/'budget.json');shutil.copy2(W/'skills-agent-eval.py',P/'frozen-evaluator.py');shutil.copy2(W/'pilot-scenarios.json',P/'scenarios.json')
for arm in ['baseline','candidate']:
 archive=P/(arm+'-source.tar.gz')
 if not archive.exists():
  with tarfile.open(archive,'w:gz') as tar: tar.add(W/arm,arcname=arm)
for p in P.rglob('*'):
 if p.is_file() and p.name!='file-manifest.json':manifest[str(p.relative_to(P))]=hashlib.sha256(p.read_bytes()).hexdigest()
(P/'file-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'records':len(results),'attempts':len(json.loads((P/'budget.json').read_text())['attempts']),'html':sum(x['html_exists'] for x in results),'design':sum(x['design_exists'] for x in results)}))
