"""Apply two reviewed prose fixes after comparison, preserving its frozen inputs."""
import datetime,hashlib,json,pathlib,shutil,subprocess
ROOT=pathlib.Path.cwd(); E=pathlib.Path(__file__).resolve().parent
C=json.loads((E/'C2-v2-config.json').read_text())
assert len(list(pathlib.Path(C['root']).glob('*/*/result.json')))==48, 'Finish primary comparison first'
B=E/'post-comparison-before'; assert not B.exists(), 'Do not overwrite prior backups'
subprocess.run(['node','scripts/sync-profile-skills','--check','--profile=all'],check=True)
refs=['.template-spec/process/lifecycle-registry.yaml','.template-spec/process/lifecycle-artifact-map.md','.template-source/derived/harness-work-unit-map.md','.agents/skills/yss-openapi-governance/SKILL.md','.codex/skills/yss-openapi-governance/SKILL.md','.template-source/profile-skill-sync.json','.template-source/profile-skill-patches/frontend/yss-openapi-governance.patch','skills-lock.json']
for profile in ['backend','frontend']:
 for ref in ['.agents/skills/yss-openapi-governance/SKILL.md','.codex/skills/yss-openapi-governance/SKILL.md','skills-lock.json']:
  refs.append(f'submodules/yss-harness-{profile}-agent/{ref}')
for ref in refs:
 p=ROOT/ref
 if p.exists():
  target=B/ref;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
for ref in [refs[0],refs[3]]:
 assert (ROOT/ref).read_bytes()==(pathlib.Path(C['candidate'])/ref).read_bytes(), f'Live source drift: {ref}'
p=ROOT/refs[0];s=p.read_text();old='    description: schema v3 共同证据与所选档位的浏览器、Design QA、无障碍、组件事实或真实组件合同验证结果。';new='    # description 保留已发布稳定 ID 的历史语义快照；当前产物版本读取 public_description 及原型证据合同。\n    description: schema v3 共同证据与所选档位的浏览器、Design QA、无障碍、组件事实或真实组件合同验证结果。';assert s.count(old)==1;p.write_text(s.replace(old,new))
p=ROOT/refs[3];s=p.read_text();old='在技术分析中生成 `api-contract-decision-v1`：';new='在技术分析中生成 API Contract Decision（版本与历史兼容见下文第 3 步）：';assert s.count(old)==1;p.write_text(s.replace(old,new))
p=ROOT/'.template-source/profile-skill-patches/frontend/yss-openapi-governance.patch';s=p.read_text();assert s.count(old)==1;p.write_text(s.replace(old,new))
skill=ROOT/'.agents/skills/yss-openapi-governance';h=hashlib.sha256()
for p in sorted(skill.rglob('*'),key=lambda p:p.relative_to(skill).as_posix()):
 if '__pycache__' in p.parts or p.name=='.DS_Store' or p.suffix in ['.iml','.pyc','.pyo']: continue
 assert not p.is_symlink()
 if p.is_file(): h.update(p.relative_to(skill).as_posix().encode()+b'\0'+p.read_bytes()+b'\0')
p=ROOT/'.template-source/profile-skill-sync.json';d=json.loads(p.read_text());n=0
for profile in d['profiles'].values():
 for item in profile.get('adapted',[]):
  if item['id']=='yss-openapi-governance': item['source_tree_sha256']=h.hexdigest();n+=1
assert n==2;p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
for cmd in [['node','scripts/node-generate-lifecycle-artifacts.mjs','--write'],['node','scripts/sync-skills'],['node','scripts/update-skill-lock']]:subprocess.run(cmd,check=True)
script=r'''
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {loadProfileSyncConfig,planProfileSkillSync,applyProfileSkillSync,reportProfileSkillSync} from './scripts/lib/profile-skill-sync.mjs';
const root=process.cwd(), evidence=process.argv[1];
const config=loadProfileSyncConfig(root), plan=planProfileSkillSync({root,config,selectedProfiles:[]});
const allowed='submodules/yss-harness-backend-agent/.agents/skills/yss-openapi-governance/SKILL.md';
for(const c of plan.changes){
 const ref=`${config.profiles[c.profile].target}/${c.path}`;
 if(ref!==allowed) throw Error(`Unexpected change: ${ref}`);
 const before=fs.readFileSync(path.join(evidence,'post-comparison-before',ref));
 if(!before.equals(fs.readFileSync(path.join(root,ref)))) throw Error('Target changed after backup');
 if(crypto.createHash('sha256').update(before).digest('hex')!==c.before_sha256) throw Error('Preview does not match preserved bytes');
}
const reconciled=plan.issues.filter(i=>i.status==='adaptation_conflict' && i.path===allowed);
plan.issues=plan.issues.filter(i=>!reconciled.includes(i));
const result=applyProfileSkillSync({root,config,plan});
fs.writeFileSync(path.join(evidence,'post-comparison-profile-sync.json'),JSON.stringify({...reportProfileSkillSync(result),reconciled_owned_dirty_files:reconciled,justification:'Pre-edit full profile check was clean; source-derived current target exactly matches backup; only one reviewed prose delta'},null,2)+'\n');
'''
subprocess.run(['node','--input-type=module','-e',script,str(E)],check=True)
backend=ROOT/'submodules/yss-harness-backend-agent'
for cmd in [['node','scripts/sync-skills'],['node','scripts/update-skill-lock']]:subprocess.run(cmd,cwd=backend,check=True)
changes=[]
for ref in refs:
 before=B/ref;after=ROOT/ref
 if before.exists() and before.read_bytes()!=after.read_bytes(): changes.append({'ref':ref,'before_sha256':hashlib.sha256(before.read_bytes()).hexdigest(),'after_sha256':hashlib.sha256(after.read_bytes()).hexdigest()})
(E/'post-comparison-source-delta.json').write_text(json.dumps({'applied_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'evaluated_snapshot_unchanged':True,'scope':'Two prose corrections and governed derivatives, no behavioral code change','changes':changes},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(changes,ensure_ascii=False))
