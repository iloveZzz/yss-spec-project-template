import json,pathlib,subprocess,tempfile,re,urllib.parse,sys,hashlib,datetime,time
s=json.load(open('/tmp/yss-manual-state.json'));root=pathlib.Path(s['root']);out=pathlib.Path('/tmp/yss-manual-validation');records=[]
def run(args,cwd):
 q=subprocess.run(args,cwd=cwd,capture_output=True,text=True)
 if q.returncode:raise RuntimeError(str(args)+'\n'+q.stdout+q.stderr)
 return q.stdout
def check(target,source):
 count=0
 for p in (target/'docs/user-guide').glob('*.md'):
  if p.name=='yss-ui-mcp.md':continue # unchanged specialist guide is outside this refresh
  text=p.read_text();original=source/'docs/user-guide'/p.name
  if original.exists():assert original.read_bytes()==p.read_bytes(),f'distribution drift: {p}'
  count+=1
  for dest in re.findall(r'\]\(([^)]+)\)',re.sub(r'```.*?```','',text,flags=re.S)):
   dest=urllib.parse.unquote(dest.strip('<>')).split('#')[0]
   if not dest or re.match(r'[a-zA-Z]+:',dest):continue
   assert (p.parent/dest).exists(),f'missing link: {p}: {dest}'
 assert (target/'docs/user-guide/设备借用贯穿案例.md').is_file()
 assert (target/'docs/user-guide/用户手册索引.md').is_file()
 for f in ['strategic-handoff','backend-delivery','verify-frontend-delivery']:assert (target/'scripts'/f).exists()
 assert 'repository_mode: project-instance' in (target/'yss-project.yaml').read_text()
 return count
with tempfile.TemporaryDirectory(prefix='yss-manual-instance-') as tmp:
 tmp=pathlib.Path(tmp)
 for key,sourceKey in [('create-yss-spec','root'),('create-yss-strategic-design','yss-harness-design-agent'),('create-yss-harness-dev','yss-harness-dev-agent')]:
  r=s['repos'][key];pkg=pathlib.Path(s['unpacked'][key]);target=tmp/key;source=pathlib.Path(s['repos'][sourceKey]['path'])
  run(['node',str(pkg/'bin'/f"{r['package']}.js"),'--project-name','Manual verification','--business-domain','合成手册验证','--team-size','3','--target-dir',str(target)],root)
  count=check(target,source)
  snap=json.loads((pkg/'template.snapshot.json').read_text());assert snap['templateCommit']==s['source_commits'][sourceKey];assert snap['requestedRef']==snap['templateCommit']
  for script in ['sync-skills','update-skill-lock']:run(['node',str(target/'scripts'/script),'--check'],target)
  records.append({'family':key,'manuals':count,'source_commit':snap['templateCommit'],'result':'pass'});print(records[-1],flush=True)
 for key in ['yss-harness-backend-agent','yss-harness-frontend-agent']:
  source=pathlib.Path(s['repos'][key]['path']);target=tmp/key
  result=json.loads(run(['node','scripts/instantiate-harness','--target',str(target),'--project-name','Manual verification'],source))
  assert result['release_snapshot'] is True
  count=check(target,source)
  run(['node','scripts/verify-harness-profile'],target)
  records.append({'family':key,'manuals':count,'source_commit':result['template_commit'],'result':'pass'});print(records[-1],flush=True)
(out/'manual-distribution.json').write_text(json.dumps({'command':'python3 verify-yss-manual-distribution.py','executed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':0,'families':records},ensure_ascii=False,indent=2)+'\n')
