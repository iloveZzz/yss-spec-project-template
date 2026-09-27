"""Bounded balanced follow-up; primary results remain immutable."""
import datetime,json,pathlib,subprocess,tempfile,time
E=pathlib.Path(__file__).resolve().parent
C=json.loads((E/'C2-v2-config.json').read_text())
primary=list(pathlib.Path(C['root']).glob('*/*/result.json'))
if len(primary)!=48: raise SystemExit('Primary 48 must complete first')
start=min(datetime.datetime.fromisoformat(s['started_at'].replace('Z','+00:00')) for p in primary for s in json.loads(p.read_text())['steps'])
deadline=start+datetime.timedelta(seconds=10800)
now=datetime.datetime.now(datetime.timezone.utc)
plan=json.loads((E/'C2-ui-supplement-plan.json').read_text())
if (deadline-now).total_seconds()<2500:
    plan.update(status='not-started-budget-insufficient',checked_at=now.isoformat(),deadline=deadline.isoformat(),remaining_seconds=(deadline-now).total_seconds())
    (E/'C2-ui-supplement-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(plan,ensure_ascii=False)); raise SystemExit(0)
config_path=E/'C2-ui-supplement-config.json'
if config_path.exists(): raise SystemExit('Supplement already configured; do not overwrite or rerun')
root=pathlib.Path(tempfile.mkdtemp(prefix='yss-lifecycle-ui-supplement-'))
config={**C,'root':str(root),'expected_scenario_runs':4,'maximum_agent_turns':4,'per_turn_timeout_seconds':600,'deadline':deadline.isoformat(),'started_at':now.isoformat(),'primary_results_unchanged':True}
config_path.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
plan.update(status='running',started_at=now.isoformat(),root=str(root),deadline=deadline.isoformat())
(E/'C2-ui-supplement-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
base=json.loads((E/'C2-v2-execution.json').read_text())[0]['command']
records=[]
for variant in ['baseline','candidate']:
    cmd=base[:]
    for flag,value in {'--source':C[variant],'--output':str(root/variant),'--variant':variant,'--timeout':'600'}.items(): cmd[cmd.index(flag)+1]=value
    cmd+=['--scenario','e08-ui']
    begun=datetime.datetime.now(datetime.timezone.utc); tick=time.monotonic()
    with (E/f'C2-ui-supplement-{variant}.log').open('w') as log:
        result=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
    record={'variant':variant,'command':cmd,'started_at':begun.isoformat(),'ended_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':round(time.monotonic()-tick,2),'exit_code':result.returncode}
    records.append(record)
    (E/'C2-ui-supplement-execution.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(record,ensure_ascii=False),flush=True)
    if result.returncode: break
plan.update(status='execution-ended',ended_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),records=len(list(root.glob('*/*/result.json'))))
(E/'C2-ui-supplement-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
