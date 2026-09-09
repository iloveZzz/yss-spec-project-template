from pathlib import Path
import json, shutil, subprocess, os, time
OUT=Path(__file__).resolve().parent; SOURCE=OUT.parents[3]; info=json.loads((OUT/'integration.json').read_text());root=Path(info['root']);base=Path(info['base']);rows=[]
def run(label,cwd,args,env=None):
 start=time.monotonic()
 with (OUT/(label+'.log')).open('w') as log:r=subprocess.run(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
 rows.append({'label':label,'cwd':str(cwd),'argv':args,'exit_code':r.returncode,'duration_ms':(time.monotonic()-start)*1000,'log_ref':label+'.log'});(OUT/'final-refresh-results.json').write_text(json.dumps(rows,indent=2)+'\n');print(label,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
def git(repo,*args):return subprocess.check_output(['git','-C',str(repo),'-c','user.name=Performance fixture','-c','user.email=fixture@example.invalid','-c','core.hooksPath=/dev/null',*args],text=True).strip()
def freeze(repo,refs):
 git(repo,'add',*refs)
 if subprocess.run(['git','-C',str(repo),'diff','--cached','--quiet']).returncode:git(repo,'commit','-qm','final local performance verification fixture')
 return git(repo,'rev-parse','HEAD')
refs=['.template-source/cli-core/command-runner.mjs','scripts/lib/command-runner.mjs','scripts/lib/template-commit-cache.mjs','scripts/verify-script-performance-scenarios','scripts/verify-template-cache-scenarios']
for ref in refs:shutil.copy2(SOURCE/ref,root/ref)
revision=freeze(root,refs);info['revisions']['root']=revision;info['template_root_revision']=revision
for name,source in info['sources'].items():
 target=Path(source);shutil.copy2(SOURCE/'scripts/lib/command-runner.mjs',target/'scripts/lib/command-runner.mjs');info['revisions'][name]=freeze(target,['scripts/lib/command-runner.mjs'])
for name in ['create-yss-spec','create-yss-strategic-design','create-yss-harness-dev']:
 shutil.copy2(SOURCE/'.template-source/cli-core/command-runner.mjs',base/name/'src/command-runner.mjs')
 env=os.environ.copy();key,source={'create-yss-spec':('YSS_SPEC_TEMPLATE_REPO',str(root)),'create-yss-strategic-design':('YSS_STRATEGIC_DESIGN_TEMPLATE_REPO',info['sources']['yss-harness-design-agent']),'create-yss-harness-dev':('YSS_HARNESS_TEMPLATE_REPO',info['sources']['yss-harness-dev-agent'])}[name];env[key]=source
 run(name+'-final-sync',base/name,['node','scripts/sync-template.js'],env)
 run(name+'-final-unit',base/name,['pnpm','run','test:unit'],env)
script=f"import {{syncCore,syncTemplate}} from {json.dumps((root/'.template-source/cli-core/build.mjs').as_uri())};\n"
for side in ['backend','frontend']:
 for target in [base/('cli-'+side),base/'integration'/('create-yss-harness-'+side)]:script+=f"syncCore({json.dumps(str(root))},{json.dumps(revision)},{json.dumps(str(target))});syncCore({json.dumps(str(root))},{json.dumps(revision)},{json.dumps(str(target))},true);\n"
 source=info['sources']['yss-harness-'+side+'-agent'];rev=info['revisions']['yss-harness-'+side+'-agent'];target=base/'integration'/('create-yss-harness-'+side)
 script+=f"syncTemplate({json.dumps(source)},{json.dumps(rev)},{json.dumps(str(target))});syncTemplate({json.dumps(source)},{json.dumps(rev)},{json.dumps(str(target))},true);\n"
(OUT/'sync-final-core-and-templates.mjs').write_text(script);run('final-dedicated-sync',root,['node',str(OUT/'sync-final-core-and-templates.mjs')]);(OUT/'integration.json').write_text(json.dumps(info,indent=2)+'\n')
for side in ['backend','frontend']:
 target=base/'integration'/('create-yss-harness-'+side)
 run(side+'-final-cli-tests',target,['pnpm','test']);run(side+'-final-bundle',target,['pnpm','verify-bundle'])
