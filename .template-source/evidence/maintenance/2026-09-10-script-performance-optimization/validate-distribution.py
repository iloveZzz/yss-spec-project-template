from pathlib import Path
import json,subprocess,os,time
OUT=Path(__file__).resolve().parent;i=json.loads((OUT/'integration.json').read_text());base=Path(i['base']);rows=[]
env=os.environ.copy();env.update(YSS_SPEC_TEMPLATE_REPO=i['root'],YSS_STRATEGIC_DESIGN_TEMPLATE_REPO=i['sources']['yss-harness-design-agent'],YSS_HARNESS_TEMPLATE_REPO=i['sources']['yss-harness-dev-agent'])
def run(label,cwd,args,timeout=300):
 start=time.monotonic()
 with (OUT/(label+'.log')).open('w') as log:
  try:result=subprocess.run(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=timeout);code=result.returncode
  except subprocess.TimeoutExpired:code=124
 row={'label':label,'cwd':str(cwd),'argv':args,'exit_code':code,'duration_ms':round((time.monotonic()-start)*1000,3),'log_ref':label+'.log'};rows.append(row);(OUT/'distribution-results.json').write_text(json.dumps(rows,indent=2)+'\n');print(label,code,flush=True);return code
run('spec-offline-dependencies',base/'create-yss-spec',['pnpm','install','--offline','--ignore-scripts'])
for name in ['create-yss-spec','create-yss-strategic-design','create-yss-harness-dev']:
 run(name+'-tests',base/name,['pnpm','run','test:prepared'])
for side in ['backend','frontend']:
 pkg=base/'integration'/('create-yss-harness-'+side)
 run(side+'-cli-tests',pkg,['pnpm','test'])
 run(side+'-bundle',pkg,['pnpm','verify-bundle'])
run('legacy-generated-handoff',i['root'],['node','.template-source/scripts/verify-strategic-handoff-distribution.mjs'])
