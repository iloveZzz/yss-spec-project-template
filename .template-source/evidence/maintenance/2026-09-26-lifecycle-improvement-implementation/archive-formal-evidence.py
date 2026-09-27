"""Archive a complete comparison without duplicating all source trees 48 times."""
import datetime
import hashlib
import json
from pathlib import Path
import tarfile

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / 'C2-v2-config.json').read_text())
ROOT = Path(CONFIG['root'])
EXCLUDED = {'.agents', '.codex', '.template-spec', '.template-source', 'scripts', '.eval-python', '.eval-bin', '.eval-tmp', '.git', '__pycache__'}


def main():
    results = list(ROOT.glob('*/*/result.json'))
    if len(results) != 48:
        raise SystemExit(f'Formal archive requires 48 retained results; found {len(results)}')
    target = HERE / 'formal-agent-evaluation-evidence.tar.gz'
    if target.exists(): raise SystemExit('Archive exists; retain it and use a new version')
    included = []
    with tarfile.open(target, 'w:gz') as tar:
        for key in ['baseline', 'candidate', 'python_dependencies']:
            source = Path(CONFIG[key])
            tar.add(source, arcname=f'sources/{key}')
        for ref in ['evaluated-runner.py','agent-scenarios-full.json','C2-v2-config.json','baseline.json','candidate-v2.json','python-dependencies.json','semantic-review.json','semantic-review-packets','evaluation-summary.json','C2-v2-execution.json','evaluation-coverage.md']:
            tar.add(HERE / ref, arcname=ref)
        for variant in ['baseline', 'candidate']:
            for ref in ['run-config.json', 'results.jsonl']:
                tar.add(ROOT / variant / ref, arcname=f'runs/{variant}/{ref}')
            for result_file in sorted((ROOT / variant).glob('*/result.json')):
                run = result_file.parent; workspace = run / 'workspace'
                packet = json.loads((HERE / 'semantic-review-packets' / f'{variant}-{run.name}.json').read_text())
                changed = set(packet['original_files_changed']) | set(packet['new_files'])
                for file in sorted(run.rglob('*')):
                    if not file.is_file() or file.is_symlink(): continue
                    if not file.resolve().is_relative_to(run.resolve()): continue
                    relative = file.relative_to(run)
                    if '__pycache__' in relative.parts: continue
                    if relative.parts[0] == 'workspace':
                        local = file.relative_to(workspace)
                        if any(part in EXCLUDED for part in local.parts) and str(local) not in changed: continue
                    archive_ref = f'runs/{variant}/{run.name}/{relative}'
                    tar.add(file, arcname=archive_ref)
                    included.append({'ref':archive_ref,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
    record = {'archive':target.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'original_raw_root':str(ROOT),'original_files_retained':True,'source_trees_archived_once':True,'raw_traces_and_final_artifacts_preserved':True,'excluded_duplicates_and_temporary_files':sorted(EXCLUDED),'files':included}
    (HERE / 'formal-archive.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({key:value for key,value in record.items() if key!='files'},ensure_ascii=False))


if __name__ == '__main__':
    main()
