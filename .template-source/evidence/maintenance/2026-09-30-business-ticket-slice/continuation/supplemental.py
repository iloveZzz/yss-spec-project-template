from pathlib import Path
import subprocess,json,time
out=Path(__file__).resolve().parent;root=out/'verification-source';records=[]
def run(label,args,expected=0):
 t=time.monotonic();p=subprocess.run(args,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env={**__import__('os').environ,'PYTHONDONTWRITEBYTECODE':'1'});log=out/(label+'.log');log.write_text(p.stdout);records.append(dict(label=label,command=args,exit_code=p.returncode,expected=expected,seconds=round(time.monotonic()-t,3),log=str(log)));(out/'supplemental-results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');print(label,p.returncode,flush=True)
 if p.returncode!=expected:raise SystemExit(1)
for label,args in [
 ('verification-framework',['node','scripts/verify-template-verification-scenarios']),
 ('verification-cache',['node','scripts/verify-template-cache-scenarios']),
 ('template-ci',['node','--test','.template-source/scripts/tests/template-ci.test.mjs']),
 ('verification-selection',['node','--test','tests/verification-selection.test.mjs','tests/verification-report.test.mjs'])]:run(label,args)
plan=json.loads((out/'verification-stable/report.json').read_text())['plan'];files=plan['syntax_files']
for i,ref in enumerate(files):run('syntax-'+str(i),['node','--check',ref])
run('legacy-runtime-calls',['rg','-n',r'^#!.*ruby|\bruby\b','scripts','.template-source/scripts','--glob','!*.md'],1)
run('legacy-runtime-files',['python3','-c',"import subprocess; xs=subprocess.check_output(['rg','--files','scripts','.template-source/scripts'],text=True).splitlines(); bad=[x for x in xs if x.endswith('.rb')]; print(bad); raise SystemExit(bool(bad))"])
run('git-diff-check',['git','diff','--check'])
print('all supplemental checks passed; syntax files:',len(files))
