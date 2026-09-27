"""Build review packets from retained evidence; never assign semantic pass."""
import hashlib
import json
from pathlib import Path
import sys

EVIDENCE = Path(__file__).resolve().parent
RUNS = Path(json.loads((EVIDENCE / 'C2-v2-config.json').read_text())['root'])
OUTPUTS = {
    'e01-status': ['assessment.json'],
    'e02-template': ['maintenance-plan.md'],
    'e03-small': ['docs/note.md'],
    'e04-current': ['entry-result.json', 'docs/.scratch/demo/spec.md'],
    'e05-continuation': ['entry-result.json'],
    'e06-expanded': ['entry-result.json'],
    'e07-mvc': ['technical-plan.md', 'api-check.json'],
    'e08-ui': ['design-overview.md', 'interaction.md', 'state-matrix.md'],
    'e09-resume-drift': ['entry-result.json', 'docs/.scratch/demo/spec.md', 'resume-result.json'],
    'e10-running': ['recovery.json'],
    'e11-cross-repo': ['cross-repo-result.json', 'cross-repo.log'],
    'e12-failed-verification': ['verification.md', 'delivery-result.json'],
}


def collect(run):
    result = json.loads((run / 'result.json').read_text())
    workspace = run / 'workspace'
    before = json.loads((Path(result['steps'][0]['trace']).parent / 'step-input-manifest.json').read_text())
    original = {row['ref']: row for row in before}
    changed, added, missing, unsafe = [], [], [], []
    for ref, row in original.items():
        path = workspace / ref
        if not path.resolve().is_relative_to(workspace.resolve()):
            unsafe.append(ref); continue
        if not path.exists(): missing.append(ref)
        elif path.is_file() and not path.is_symlink() and 'sha256' in row and hashlib.sha256(path.read_bytes()).hexdigest() != row['sha256']:
            changed.append(ref)
    for path in workspace.rglob('*'):
        ref = path.relative_to(workspace)
        if any(part in ['__pycache__', '.eval-tmp', '.git'] for part in ref.parts): continue
        if str(ref) == '.eval-commands.jsonl': continue
        if (path.is_file() or path.is_symlink()) and str(ref) not in original: added.append(str(ref))
    commands, messages, tools, errors = [], [], [], []
    for step in result['steps']:
        for line in Path(step['trace']).read_text().splitlines():
            try: event = json.loads(line)
            except json.JSONDecodeError: continue
            item = event.get('item', {})
            if event.get('type') != 'item.completed': continue
            if item.get('type') == 'command_execution':
                commands.append({'step': step['step'], 'command': item.get('command'), 'exit_code': item.get('exit_code')})
                if item.get('exit_code') not in [0, None]: errors.append({'command': item.get('command'), 'exit_code': item.get('exit_code'), 'output': item.get('aggregated_output', '')})
            elif item.get('type') == 'agent_message': messages.append({'step': step['step'], 'text': item.get('text')})
            elif item.get('type') == 'mcp_tool_call': tools.append(item)
    artifacts = {}
    for ref in OUTPUTS[result['scenario']]:
        path = workspace / ref
        artifacts[ref] = path.read_text() if path.resolve().is_relative_to(workspace.resolve()) and path.is_file() and not path.is_symlink() else None
    return {'result': result, 'original_files_changed': sorted(changed), 'original_files_missing': sorted(missing), 'unsafe_paths': sorted(unsafe), 'new_files': sorted(added), 'commands': commands, 'command_errors': errors, 'other_tools': tools, 'agent_messages': messages, 'artifacts': artifacts, 'semantic_review': 'pending'}


def main():
    target = EVIDENCE / 'semantic-review-packets'; target.mkdir(exist_ok=True)
    summary = []
    for variant in ['baseline', 'candidate']:
        for result in sorted((RUNS / variant).glob('*/result.json')):
            ref = f'{variant}-{result.parent.name}.json'
            cached = target / ref
            data = json.loads(cached.read_text()) if cached.exists() and '--refresh' not in sys.argv else None
            if data is None or data['result'] != json.loads(result.read_text()):
                data = collect(result.parent)
                cached.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
            summary.append({'variant': variant, 'run': result.parent.name, 'automatic_result': data['result']['automatic_result'], 'elapsed_seconds': data['result']['elapsed_seconds'], 'changed': data['original_files_changed'], 'missing': data['original_files_missing'], 'added': data['new_files'], 'packet': ref, 'semantic_review': 'pending'})
    (target / 'index.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
