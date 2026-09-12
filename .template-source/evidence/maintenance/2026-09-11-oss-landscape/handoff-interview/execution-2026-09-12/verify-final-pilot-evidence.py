from pathlib import Path
import json,hashlib,subprocess,datetime
E=Path(__file__).resolve().parent
I=Path('/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm')
G=I/'backend-governance'; A=G/'docs/.scratch/target-preview-pilot'
checks=[]
def sha(p):return 'sha256:'+hashlib.sha256(p.read_bytes()).hexdigest()
def check(name,ok,**details):
 checks.append(dict(name=name,passed=bool(ok),**details));assert ok,name
for x in json.loads((A/'architecture/freeze-review-manifest.json').read_text())['assets']:
 check('frozen '+x['ref'],sha(A/x['ref'])==x['sha256'])
for x in json.loads((A/'architecture/continuation-audit-result.json').read_text())['source_manifest']:
 p=Path(x['ref']);p=p if p.is_absolute() else G/p
 check('audit '+x['ref'],sha(p)==x['sha256'])
rows=json.loads((E/'baseline.json').read_text())['repositories'];count=0
for n,row in zip(['backend','frontend'],rows):
 for x in row['files']:
  check(n+' baseline '+x['path'],sha(I/n/x['path'])==x['head_sha256']);count+=1
 p=subprocess.run(['git','status','--porcelain'],cwd=I/n,text=True,capture_output=True)
 check(n+' clean',p.returncode==0 and not p.stdout,exit_code=p.returncode)
for n in ['strategy-governance','backend-governance','frontend-governance']:
 cmd=['node','scripts/verify-context-reconciliation','--root','.','docs/.scratch/target-preview-pilot/context-reconciliation.json'];p=subprocess.run(cmd,cwd=I/n,text=True,capture_output=True)
 check(n+' context',p.returncode==0,command=cmd,exit_code=p.returncode,output=p.stdout+p.stderr)
p=E/'runtime-preparation/probe-data';v=json.loads((p/'verification.json').read_text());check('test data bytes',sha(p/'test-data.json')==v['test_data_digest']);check('psql and JDBC snapshots',json.loads((p/'snapshot.json').read_text())==json.loads((p/'jdbc-snapshot.json').read_text()))
for n in ['yss-preview-0kxzmm-pg','yss-preview-0kxzmm-redis']:
 cmd=['docker','--context','desktop-linux','inspect',n,'--format','{{.State.Status}} {{index .Config.Labels "yss.trial"}}'];r=subprocess.run(cmd,text=True,capture_output=True)
 check(n+' stopped',r.returncode==0 and r.stdout.strip()=='exited target-preview-20260912-0kxzmm',command=cmd,exit_code=r.returncode,output=r.stdout)
r=subprocess.run(['lsof','-nP','-iTCP:61111','-iTCP:61112','-sTCP:LISTEN'],text=True,capture_output=True);check('java and vite ports inactive',r.returncode==1 and not r.stdout,exit_code=r.returncode,meaning='lsof exit1 with no rows means no listeners')
for r in json.loads((E/'compiler-fresh-reproduction.json').read_text())['results']:
 check('compiler failure evidence '+r['log_ref'],r['exit_code']==1 and sha(E/r['log_ref'])==r['log_sha256'])
out={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verification_exit_code':0,'baseline_scope_files':count,'checks':checks,'trial_outcome':'baseline-not-ready','mechanism_pass_claimed':False,'probe_implemented':False,'S0_S6_executed':False}
(E/'final-pilot-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'verification_exit_code':0,'checks_passed':len(checks),'baseline_scope_files':count,'trial_outcome':'baseline-not-ready'}))
