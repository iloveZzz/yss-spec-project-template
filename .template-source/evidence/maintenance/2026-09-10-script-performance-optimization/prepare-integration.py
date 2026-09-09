"""Synthetic commits are confined to temporary test repositories, never source repositories."""
from pathlib import Path
import json,shutil,subprocess,os
OUT=Path(__file__).resolve().parent
SOURCE=OUT.parents[3]
iso=json.loads((OUT/'after/isolation.json').read_text());root=Path(iso['root']);base=Path(iso['base']);integration=base/'integration';integration.mkdir(exist_ok=True)
def git(repo,*args):
 return subprocess.check_output(['git','-C',str(repo),'-c','user.name=Performance fixture','-c','user.email=fixture@example.invalid','-c','core.hooksPath=/dev/null',*args],text=True,stderr=subprocess.PIPE).strip()
def freeze(repo):
 git(repo,'init','-q','--initial-branch=main');git(repo,'add','-A');git(repo,'commit','-qm','isolated performance fixture');return git(repo,'rev-parse','HEAD')
rootCommit=freeze(root)
revisions={'root':rootCommit};sources={}
ignore=shutil.ignore_patterns('.git','node_modules','.codegraph','.template-staging-*','.DS_Store')
for name in ['yss-harness-design-agent','yss-harness-dev-agent','yss-harness-backend-agent','yss-harness-frontend-agent']:
 target=base/'sources'/name;shutil.copytree(SOURCE/'submodules'/name,target,symlinks=True,ignore=ignore);revisions[name]=freeze(target);sources[name]=str(target)
for name in ['create-yss-spec','create-yss-strategic-design','create-yss-harness-dev']:
 target=base/name
 for ref in ['bin','tests']:
  src=SOURCE/'submodules'/name/ref
  if src.exists():shutil.copytree(src,target/ref,symlinks=True,ignore=ignore,dirs_exist_ok=True)
 mapping={'create-yss-spec':('YSS_SPEC_TEMPLATE_REPO',root),'create-yss-strategic-design':('YSS_STRATEGIC_DESIGN_TEMPLATE_REPO',Path(sources['yss-harness-design-agent'])),'create-yss-harness-dev':('YSS_HARNESS_TEMPLATE_REPO',Path(sources['yss-harness-dev-agent']))}
 key,source=mapping[name];env=os.environ.copy();env[key]=str(source)
 for setting in ['YSS_SPEC_TEMPLATE_REF','YSS_HARNESS_TEMPLATE_REF','YSS_STRATEGIC_DESIGN_TEMPLATE_REF']:env.pop(setting,None)
 result=subprocess.run(['node','scripts/sync-template.js'],cwd=target,env=env,capture_output=True,text=True)
 (OUT/f'{name}-sync.log').write_text(result.stdout+result.stderr)
 print(name,result.returncode,flush=True)
 if result.returncode:raise SystemExit(result.returncode)
# Sync only core into the measured packages: retain exactly the baseline template bytes.
script=f'''import {{syncCore,syncTemplate}} from {json.dumps((root/'.template-source/cli-core/build.mjs').as_uri())};
import fs from 'node:fs';
const root={json.dumps(str(root))},base={json.dumps(str(base))};
for(const side of ['backend','frontend']){{
 const pkg=base+'/cli-'+side;
 syncCore(root,{json.dumps(rootCommit)},pkg);syncCore(root,{json.dumps(rootCommit)},pkg,true);
 const target=base+'/integration/create-yss-harness-'+side;fs.cpSync(pkg,target,{{recursive:true}});
 const source=base+'/sources/yss-harness-'+side+'-agent';
 const revisions={json.dumps(revisions)};syncTemplate(source,revisions['yss-harness-'+side+'-agent'],target);syncTemplate(source,revisions['yss-harness-'+side+'-agent'],target,true);
}}
'''
(OUT/'sync-isolated.mjs').write_text(script)
result=subprocess.run(['node',str(OUT/'sync-isolated.mjs')],capture_output=True,text=True)
(OUT/'dedicated-sync.log').write_text(result.stdout+result.stderr)
print('dedicated',result.returncode,flush=True)
if result.returncode:raise SystemExit(result.returncode)
(OUT/'integration.json').write_text(json.dumps({'root':str(root),'base':str(base),'integration':str(integration),'revisions':revisions,'sources':sources,'formal_locks_updated':False},indent=2)+'\n')
