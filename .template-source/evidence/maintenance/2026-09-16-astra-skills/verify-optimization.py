"""Local maintenance audit. Requires the maintainer's Python + PyYAML, not an instance runtime."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import yaml

here = Path(__file__).resolve().parent
root = here.parents[3]
before = json.loads((here / 'before.json').read_text())
rows = []
for old in before:
    path = root / old['path']
    text = path.read_text()
    metadata = yaml.safe_load(text.split('---', 2)[1])
    assert metadata['name'] == old['name'], path
    assert metadata.get('disable-model-invocation', False) == old['explicit_only'], path
    if old['explicit_only']:
        policy = yaml.safe_load((path.parent / 'agents/openai.yaml').read_text())
        assert policy['policy']['allow_implicit_invocation'] is False, path
    changed = metadata['description'] != old['description']
    rows.append(dict(repo=old['repo'], path=old['path'], name=old['name'],
                     before_description_chars=old['description_chars'],
                     description_chars=len(metadata['description']),
                     before_lines=old['lines'], lines=len(text.splitlines()),
                     decision='refine-trigger' if changed else 'retain-existing-trigger',
                     explicit_only=old['explicit_only']))

for repo in ['.', 'submodules/yss-harness-backend-agent']:
    for skill in ['lombok', 'mapstruct']:
        directory = root / repo / '.agents/skills' / skill
        entry = (directory / 'SKILL.md').read_text()
        assert 'mcp__documentation__fetch_docs' not in entry
        assert '## YSS 阶段 7 执行结果' in entry
        assert 'annotation-examples.md' in entry
        for link in re.findall(r'\]\(([^)]+)\)', entry):
            if not link.startswith('https://'):
                assert (directory / link.split('#')[0]).is_file(), link
        reference = (directory / 'references/annotation-examples.md').read_text()
        assert 'mcp__documentation__fetch_docs' not in reference
        if skill == 'mapstruct':
            assert 'unmappedTargetPolicy = ReportingPolicy.IGNORE' not in reference
            assert 'unmappedTargetPolicy = ReportingPolicy.ERROR' in reference
        else:
            assert 'log.info("Creating user: {}", dto.getEmail())' not in reference
            assert 'binding 不作为业务依赖单独引入' in reference

platform = json.loads((here / 'platform-audit.json').read_text())
for item in platform:
    text = (root / item['path']).read_text()
    metadata = yaml.safe_load(text.split('---', 2)[1])
    assert metadata['name'] == item['name']
    assert metadata['description'] == item.get('new_description', item['description'])

baseline = subprocess.check_output(['git', 'show', json.loads((here / 'source-baseline.json').read_text())['.'] + ':.agents/skills/mapstruct/SKILL.md'], cwd=root, text=True)
assert 'unmappedTargetPolicy = ReportingPolicy.IGNORE' in baseline

summaries = []
for repo in dict.fromkeys(row['repo'] for row in rows):
    scoped = [r for r in rows if r['repo'] == repo]
    summaries.append(dict(repo=repo, skills=len(scoped),
                          descriptions_changed=sum(r['decision'] == 'refine-trigger' for r in scoped),
                          before_description_chars=sum(r['before_description_chars'] for r in scoped),
                          description_chars=sum(r['description_chars'] for r in scoped),
                          before_entry_lines=sum(r['before_lines'] for r in scoped),
                          entry_lines=sum(r['lines'] for r in scoped)))

(here / 'audit.json').write_text(json.dumps(dict(summaries=summaries, entries=rows,
    method='Source and metadata audit; not a model behavior evaluation'), ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(result='pass', entries=len(rows), platform_entries=len(platform), explicit_policies=sum(r['explicit_only'] for r in rows), summaries=summaries), ensure_ascii=False))
