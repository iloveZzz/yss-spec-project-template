from pathlib import Path
import json,shutil,subprocess,os,time
OUT=Path(__file__).resolve().parent;SOURCE=OUT.parents[3];info=json.loads((OUT/'integration.json').read_text());root=Path(info['root']);base=Path(info['base']);records=[]
bindings={side:{'core_lock':json.loads((base/'integration'/('create-yss-harness-'+side)/'cli-core.lock.json').read_text()),'snapshot':json.loads((base/'integration'/('create-yss-harness-'+side)/'template.snapshot.json').read_text())} for side in ['backend','frontend']}
(OUT/'distribution-measurement-bindings.json').write_text(json.dumps({'scope':'P05 调度对照共同使用此冻结 CLI 基底；后续恢复修正的最终生成实例另做完整验证。','packages':bindings},ensure_ascii=False,indent=2)+'\n')
if (OUT/'coverage/raw').exists():shutil.move(OUT/'coverage/raw',OUT/'coverage/pre-recovery')
refs=['.template-source/cli-core/transaction.mjs','.template-source/cli-core/tests/cli.test.mjs']
for ref in refs:shutil.copy2(SOURCE/ref,root/ref)
def git(*args):return subprocess.check_output(['git','-C',str(root),'-c','user.name=Performance fixture','-c','user.email=fixture@example.invalid','-c','core.hooksPath=/dev/null',*args],text=True).strip()
git('add',*refs);git('commit','-qm','persist temporary-file ownership for interrupted recovery');revision=git('rev-parse','HEAD');info['revisions']['root']=revision;info['template_root_revision']=revision
script=f"import {{syncCore}} from {json.dumps((root/'.template-source/cli-core/build.mjs').as_uri())};\n"
for side in ['backend','frontend']:
 for target in [base/('cli-'+side),base/'integration'/('create-yss-harness-'+side)]:script+=f"syncCore({json.dumps(str(root))},{json.dumps(revision)},{json.dumps(str(target))});syncCore({json.dumps(str(root))},{json.dumps(revision)},{json.dumps(str(target))},true);\n"
(OUT/'sync-recovery-core.mjs').write_text(script)
def run(label,cwd,args,env=None):
 start=time.monotonic()
 with (OUT/(label+'.log')).open('w') as log:r=subprocess.run(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
 records.append({'label':label,'cwd':str(cwd),'argv':args,'exit_code':r.returncode,'duration_ms':(time.monotonic()-start)*1000,'log_ref':label+'.log'});(OUT/'recovery-refresh-results.json').write_text(json.dumps(records,indent=2)+'\n');print(label,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
run('recovery-core-sync',root,['node',str(OUT/'sync-recovery-core.mjs')])
env=os.environ.copy();env['YSS_SPEC_TEMPLATE_REPO']=str(root);run('recovery-spec-sync',base/'create-yss-spec',['node','scripts/sync-template.js'],env)
for side in ['backend','frontend']:
 pkg=base/'integration'/('create-yss-harness-'+side);run(side+'-recovery-cli-tests',pkg,['pnpm','test']);run(side+'-recovery-bundle',pkg,['pnpm','verify-bundle'])
(OUT/'integration.json').write_text(json.dumps(info,indent=2)+'\n')
