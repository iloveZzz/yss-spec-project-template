import hashlib,json,pathlib,subprocess,tarfile,sys
base=pathlib.Path(sys.argv[1]).resolve()
families={'dev':('create-yss-harness-dev','0.4.3','0.5.0'),'backend':('create-yss-harness-backend','0.1.1','0.2.0'),'frontend':('create-yss-harness-frontend','0.1.1','0.1.2'),'design':('create-yss-harness-design','0.4.4','0.5.0')}
def run(args,**kw):
 r=subprocess.run(args,capture_output=True,text=True,timeout=600,**kw)
 if r.returncode:raise RuntimeError(str(args)+'\n'+r.stdout[-3500:]+'\n'+r.stderr[-3500:])
 return r.stdout
def tree(p):
 return [(str(f.relative_to(p)),f.stat().st_mode,hashlib.sha256(f.read_bytes()).hexdigest()) for f in sorted(p.rglob('*')) if f.is_file()]
results=[]
for f,(name,old,new) in families.items():
 if len(sys.argv)>2 and f not in sys.argv[2:]:continue
 entries={}
 for kind,version in [('old',old),('new',new)]:
  dest=base/'extracted'/kind/f;dest.mkdir(parents=True,exist_ok=True)
  with tarfile.open(base/kind/(name+'-'+version+'.tgz')) as t:t.extractall(dest,filter='data')
  entries[kind]=dest/'package/bin'/(name+'.js')
 def init(kind,target):
  if target.exists(): return
  run(['node',str(entries[kind])]+(['init'] if f in ['backend','frontend'] else [])+['--target-dir',str(target),'--project-name','兼容验收','--business-domain','技术设计升级'])
 existing=base/'instances'/('existing-'+f);existing.parent.mkdir(exist_ok=True);init('old',existing)
 protected={'business.txt':b'preserve business', 'docs/.scratch/old/approved-ddd.yaml':b'schema_version: 1\nstatus: approved\n', 'docs/architecture/registrations/existing.yaml':b'architecture_family: layered-mvc\nstatus: current\n'}
 for ref,data in protected.items():p=existing/ref;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 context=existing/'CONTEXT.md';context.write_text(context.read_text()+'\n<!-- user glossary note -->\n');protected['CONTEXT.md']=context.read_bytes()
 before=tree(existing)
 run(['node',str(entries['new']),'sync','--target-dir',str(existing),'--dry-run']);assert tree(existing)==before,('preview wrote files',f)
 run(['node',str(entries['new']),'sync','--target-dir',str(existing)]+([] if f=='dev' else ['--apply']))
 for ref,data in protected.items():assert (existing/ref).read_bytes()==data,(f,'changed protected',ref)
 fresh=base/'instances'/('new-'+f);init('new',fresh)
 for target in [existing,fresh]:
  schema=(target/'docs/process/schemas/strategic-design-handoff.schema.json').read_text();assert 'yss-technical-design' in schema and 'yss-tactical-design' in schema
  run(['node',str(target/'scripts/verify-skill-registry')],cwd=target)
  if f in ['dev','backend']:
   assert (target/'.agents/skills/yss-mvc-design/SKILL.md').exists()
   run(['node',str(target/'.agents/skills/yss-technical-design/tests/run-scenarios.mjs')],cwd=target)
  else:assert not (target/'.agents/skills/yss-mvc-design').exists()
 results.append({'family':f,'version':new,'init':'pass','old_instance_sync':'pass','preview_readonly':'pass','protected_files':'pass'})
 print(json.dumps(results[-1],ensure_ascii=False),flush=True)
(base/('packed-results-'+('-'.join(sys.argv[2:]) or 'all')+'.json')).write_text(json.dumps(results,indent=2))
