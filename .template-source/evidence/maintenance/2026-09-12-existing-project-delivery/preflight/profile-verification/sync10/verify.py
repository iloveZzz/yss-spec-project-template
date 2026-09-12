import concurrent.futures, datetime, hashlib, json, pathlib, shutil, subprocess, time

ROOT = pathlib.Path('/Users/zhudaoming/Projects/yss-spec-project-template')
E = pathlib.Path(__file__).resolve().parent
OLD = json.loads((E.parent/'sync09/cli-results.json').read_text())
REFS = ['scripts/preflight-delivery','scripts/lib/delivery-preflight.mjs','scripts/lib/approved-execution-context.mjs','scripts/lib/json-schema.mjs','scripts/lib/strategic-handoff.mjs','scripts/lib/existing-ui-baseline.mjs','scripts/lib/backend-delivery.mjs','scripts/lib/frontend-delivery.mjs']
OWNERS = {'spec': ROOT, **{p:ROOT/f'submodules/yss-harness-{p}-agent' for p in ['design','backend','frontend']}}
BIN = {'spec':'create-yss-spec','design':'create-yss-harness-design','backend':'create-yss-harness-backend','frontend':'create-yss-harness-frontend'}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def run(name, cmd, cwd):
    begin=time.monotonic()
    with (E/f'{name}.log').open('w') as log:
        try: code=subprocess.run(cmd,cwd=cwd,stdout=log,stderr=subprocess.STDOUT,timeout=300).returncode
        except subprocess.TimeoutExpired: code='timeout-300s'
    return {'name':name,'command':cmd,'cwd':str(cwd),'exit_code':code,'duration_seconds':round(time.monotonic()-begin,2),'log':f'{name}.log'}
def snapshot_path(cli,snapshot,ref):
    return cli/'template'/(snapshot['files'][ref]['blob'] if 'files' in snapshot else ref)
def cli_check(item):
    p=item['profile']; cli=pathlib.Path(item['cli']);target=pathlib.Path(item['target']);owner=OWNERS[p]
    snapshot=json.loads((cli/'template.snapshot.json').read_text()); assert snapshot['sourceState']=='working-tree'
    cmd=['node',str(cli/f'bin/{BIN[p]}.js'),'sync','--target-dir',str(target)]+([] if p=='spec' else ['--apply'])
    runs=[run(f'cli-{p}-sync',cmd,cli)]
    result={'profile':p,'source_state':snapshot['sourceState'],'snapshot_hash':snapshot['snapshotHash'],'snapshot_file_sha256':sha(cli/'template.snapshot.json'),'target':str(target),'runs':runs,'bytes':[]}
    if runs[-1]['exit_code']!=0:return result
    for ref in REFS+['skills-lock.json']:
        source=owner/ref;payload=snapshot_path(cli,snapshot,ref)
        values={'source':sha(source),'snapshot':sha(payload),'instance':sha(target/ref)}
        assert len(set(values.values()))==1,(p,ref,values)
        if 'files' in snapshot: assert values['snapshot']==snapshot['files'][ref]['digest']
        result['bytes'].append({'ref':ref,'sha256':values['source'],'matched':['source','snapshot','actual-cli-sync-instance']})
    if p in ['backend','frontend']:
        lock=json.loads((cli/'cli-core.lock.json').read_text());assert lock['sourceState']=='working-tree'; result['core_files']=[]
        for ref,record in lock['files'].items():
            assert sha(cli/'vendor/cli-core'/ref)==record['digest']==sha(ROOT/'.template-source/cli-core'/ref)
            result['core_files'].append({'ref':ref,'sha256':record['digest']})
        result['core_lock_sha256']=sha(cli/'cli-core.lock.json')
    harness=target.with_name(target.name+'-sync10-protocol-harness');shutil.copytree(target,harness,symlinks=True)
    shutil.copytree(owner/'scripts/fixtures',harness/'scripts/fixtures',dirs_exist_ok=True)
    shutil.copy2(owner/'scripts/verify-existing-ui-baseline-scenarios',harness/'scripts/verify-existing-ui-baseline-scenarios')
    skill='.agents/skills/yss-technical-design'
    if (harness/skill).is_dir():
        (harness/skill/'tests').mkdir(exist_ok=True);shutil.copy2(owner/skill/'tests/fixtures.mjs',harness/skill/'tests/fixtures.mjs')
    for ref in REFS: assert sha(harness/ref)==sha(target/ref)
    if p in ['spec','backend']:
        runs.append(run(f'cli-{p}-slice-structure',['node','--test','scripts/fixtures/delivery-preflight/approved-execution.test.mjs'],harness))
    else:result['slice_structure']={'status':'not-applicable','reason':'This profile does not own raw backend Slice approval; main and backend execute all 8 approval tests.'}
    runs.append(run(f'cli-{p}-ui-collector',['node','--test','--test-name-pattern=既有 UI 全目录','scripts/verify-existing-ui-baseline-scenarios'],harness))
    (E/f'cli-{p}-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    return result
def template_check(p):
    owner=OWNERS[p]; result={'profile':p,'bytes':[],'runs':[]}
    for ref in REFS:
        expected=(ROOT/ref).read_bytes(); transformation='identity'
        if p=='backend' and ref=='scripts/lib/delivery-preflight.mjs':
            original=b'../../.agents/skills/yss-prototype-stage/scripts/visual-baseline-contract.mjs'
            assert expected.count(original)==1
            expected=expected.replace(original,b'./visual-baseline-contract.mjs');transformation='backend-wire-runtime: scripts/sync-strategic-handoff-tools'
        assert expected==(owner/ref).read_bytes(),(p,ref)
        result['bytes'].append({'ref':ref,'source_sha256':sha(ROOT/ref),'sha256':sha(owner/ref),'transformation':transformation})
    if p=='backend':result['runs'].append(run('template-backend-slice-structure',['node','--test','scripts/fixtures/delivery-preflight/approved-execution.test.mjs'],owner))
    else:result['slice_structure']='not-applicable: raw backend Slice approval is not this profile responsibility'
    result['runs'].append(run(f'template-{p}-ui-collector',['node','--test','--test-name-pattern=既有 UI 全目录','scripts/verify-existing-ui-baseline-scenarios'],owner))
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    cli_results=[json.loads((E/f'cli-{item["profile"]}-result.json').read_text()) for item in OLD['results']]
    template_results=list(pool.map(template_check,['design','backend','frontend']))
result={'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_state':'working-tree','cli_results':cli_results,'template_results':template_results,'boundaries':['Actual normal CLI sync updated the original synthetic instances created by sync09. No force, no generated approval, no pilot change.','Tests run in separate copies containing only owning profile test harness/fixtures; eight runtime files retain byte identity with actual synchronized instances.','All old scenarios were verified in sync09; this is targeted Fresh verification of structure guard and newly added opaque UI collector scenario.','No Git commit, push, npm publication or S0-S6/O1 completion claim.']}
result['passed']=all(run['exit_code']==0 for item in cli_results+template_results for run in item['runs'])
(E/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'cli_profiles':len(cli_results),'receiving_templates':len(template_results)},ensure_ascii=False))
raise SystemExit(0 if result['passed'] else 1)
