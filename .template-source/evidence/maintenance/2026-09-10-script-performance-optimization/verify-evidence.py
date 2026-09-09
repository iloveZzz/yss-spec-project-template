"""Verify report bindings without rerunning or changing measured fixtures."""
from pathlib import Path
import csv, hashlib, json, os, platform, re, subprocess, time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
checks = []

def check(name, condition, **details):
    checks.append({'check': name, 'result': 'pass' if condition else 'fail', **details})
    if not condition:
        raise AssertionError(name)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(label, argv):
    start = time.monotonic()
    result = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True)
    log = OUT / (label + '.log')
    log.write_text(result.stdout + result.stderr)
    check(label, result.returncode == 0, argv=argv, cwd=str(ROOT),
          exit_code=result.returncode, duration_ms=(time.monotonic()-start)*1000,
          log_ref=log.name)

runs = [json.loads(line) for line in (OUT/'runs.jsonl').read_text().splitlines()]
check('all-run-logs-preserved', all((OUT/r[k]).is_file() for r in runs for k in ['stdout_ref', 'stderr_ref']), records=len(runs))
full = [r for r in runs if r['label'] == 'validation-after-recovery']
check('final-full-profile', len(full) == 1 and full[0]['exit_code'] == 0 and not full[0]['timeout'])
check('profile-escalation-recorded', 'fast -> release' in (OUT/full[0]['stderr_ref']).read_text())
rows = list(csv.DictReader((OUT/'implementation-dispositions.csv').open()))
original = list(csv.DictReader((OUT.parent/'2026-09-10-script-performance-audit/hotspots/implementation-assessments.csv').open()))
check('338-audit-identities-preserved', len(rows) == 338 and {r['sha256'] for r in rows} == {r['sha256'] for r in original})
candidates = {c for r in rows for c in r['candidate_ids_final'].split(';') if c}
check('all-candidates-disposed', candidates == {f'P{i:02}' for i in range(1,13)}, candidates=sorted(candidates))
check('all-dispositions-have-basis', all(r['optimization_disposition'] and r['source_routing'] and r['evidence_basis'] and r['verification_entry'] for r in rows))
summary = json.loads((OUT/'measurement-summary.json').read_text())
for name, comparison in summary['comparisons'].items():
    required = 3 if name in ['strategic-handoff','backend-frontend-delivery','init-backend','init-frontend','distribution'] else 5
    check('sample-count-'+name, all(comparison[side]['wall_ms']['n'] >= required for side in ['before','after']))
    for side in ['before','after']:
        labels = comparison[side]['labels']
        check('accepted-runs-'+name+'-'+side, all(r['exit_code'] == 0 and not r['timeout'] and not r['trace'] for r in runs if r['label'] in labels))
check('historical-failures-disclosed', len(summary['rejected_samples']) == sum(r['exit_code'] != 0 or r['timeout'] for r in runs))
before = Path(json.loads((OUT/'baseline/isolation.json').read_text())['base'])
info = json.loads((OUT/'integration.json').read_text())
after = Path(info['base'])
for side in ['backend','frontend']:
    old, new = before/('cli-'+side)/'template.snapshot.json', after/('cli-'+side)/'template.snapshot.json'
    check('identical-init-template-input-'+side, old.read_bytes() == new.read_bytes(), sha256=digest(old))
    for directory in [after/('cli-'+side), after/'integration'/('create-yss-harness-'+side)]:
        source_files = list((ROOT/'.template-source/cli-core').glob('*.mjs'))
        check('current-core-bytes-'+str(directory.relative_to(after)), all((directory/'vendor/cli-core'/p.name).read_bytes() == p.read_bytes() for p in source_files), files=len(source_files))
helper = ROOT/'.template-source/cli-core/command-runner.mjs'
mirrors = [ROOT/'scripts/lib/command-runner.mjs']
mirrors += [p/'scripts/lib/command-runner.mjs' for p in (ROOT/'submodules').glob('yss-harness-*-agent')]
mirrors += [ROOT/'submodules'/name/'src/command-runner.mjs' for name in ['create-yss-spec','create-yss-strategic-design','create-yss-harness-dev']]
check('declared-command-runner-mirrors', len(mirrors) == 8 and all(p.read_bytes() == helper.read_bytes() for p in mirrors), paths=[str(p.relative_to(ROOT)) for p in mirrors])
run('preservation-final', ['python3', str(OUT/'check-preservation.py')])
preserved = json.loads((OUT/'preservation.json').read_text())
check('formal-cli-locks-unchanged', preserved['formal_dedicated_repositories_clean'] and info['formal_locks_updated'] is False)
run('checkpoint-final', ['scripts/verify-maintenance-checkpoint', str(OUT/'checkpoint.json')])
run('shared-sync-final', ['scripts/sync-strategic-handoff-tools', '--check'])
for name, repo in json.loads((OUT/'baseline/repositories.json').read_text()).items():
    run('diff-check-'+name, ['git', '-C', repo['root'], 'diff', '--check'])
environment = {'system':platform.platform(),'machine':platform.machine(),'python':platform.python_version(), 'cpu_count':os.cpu_count()}
for command in ['node','pnpm','git']:
    environment[command] = subprocess.check_output([command,'--version'], text=True).strip()
environment['measurement_method'] = 'Same machine; sequential before/after; unchanged template.snapshot for init; /usr/bin/time -l; OS page cache not cleared; instrumentation separate.'
(OUT/'environment.json').write_text(json.dumps(environment,ensure_ascii=False,indent=2)+'\n')
result = {'result':'pass','checks':checks,'limitations':['No remote/private Maven/actual project/self-update performance claim.','V8 observations only bind surviving source files; missing samples are not zero-call claims.','Temporary fixture Git revisions are not formal distribution locks.']}
(OUT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'result':'pass','checks':len(checks)},ensure_ascii=False))
