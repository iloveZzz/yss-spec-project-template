from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[4]; e=Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
base=r/'.agents/skills/yss-prototype-stage/assets/vue-business-patterns'
records=[]
for folder in ['review/workspace','review/glass','review/comfortable','patterns/list-detail','patterns/multi-step','patterns/approval','patterns/conflict','patterns/analysis','patterns/workspace','patterns/component-states']:
 p=e/folder; provenance=json.loads((p/'build-provenance.json').read_text())
 for file,digest in provenance['authored_files'].items():
  local=base/file.removeprefix('authoring-sources/'); actual='sha256:'+sha(local.read_bytes())
  assert actual==digest,(folder,file,'source drift')
  assert (p/file).read_bytes()==local.read_bytes(),(folder,file,'copy drift')
 assert (p/'tokens.css').read_bytes()==(r/'.template-spec/design/tokens/variables.css').read_bytes(),folder
 records.append({'bundle':folder,'authored_files':len(provenance['authored_files']),'registry_revision':provenance['registry_revision'],'lock_digest':provenance['lock_digest'],'source_match':True,'token_match':True})
refs=['DESIGN.md','.template-spec/design/tokens/variables.css','.agents/skills/yss-prototype-stage/assets/vue-business-patterns/Workspace.vue','.agents/skills/yss-prototype-stage/assets/vue-business-patterns/workspace-model.js','.agents/skills/yss-prototype-stage/assets/vue-business-patterns/workspace.scenarios.json','.agents/skills/yss-prototype-stage/references/enterprise-workspace.md','.agents/skills/yss-prototype-stage/tests/workspace.test.mjs','.agents/skills/yss-prototype-stage/assets/shadcn-vue-authoring/registry-manifest.json']
clis=[]
for name,profile in [('create-yss-spec',''),('create-yss-strategic-design','design'),('create-yss-harness-frontend','frontend')]:
 cli=r/'submodules'/name; snap=json.loads((cli/'template.snapshot.json').read_text()); source=r if not profile else r/f'submodules/yss-harness-{profile}-agent'
 for ref in refs:
  expected=(source/ref).read_bytes()
  if 'files' in snap:
   item=snap['files'][ref]; actual=(cli/'template'/item['blob']).read_bytes(); assert sha(actual)==item['digest']
  else: actual=(cli/'template'/ref).read_bytes()
  assert actual==expected,(name,ref,'distribution drift')
  clis.append({'cli':name,'path':ref,'sha256':sha(actual),'source_state':snap['sourceState']})
 assert not any(k.startswith('.agents/skills/yss-prototype-stage/assets/shadcn-authoring/') for k in snap.get('files',{}))
(e/'evidence/delivery-audit.json').write_text(json.dumps({'bundles':records,'cli_files':clis},ensure_ascii=False,indent=2)+'\n')
print(f'Checked {len(records)} bundles and {len(clis)} distributed files; current source and Token match')
