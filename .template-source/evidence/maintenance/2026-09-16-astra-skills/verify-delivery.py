"""Verify current Skill bytes in each locally rebuilt CLI, including blob-backed bundles."""
from pathlib import Path
import json
import hashlib
import re

root = Path(__file__).resolve().parents[4]
families = [('create-yss-spec', '.'),
            ('create-yss-harness-backend', 'submodules/yss-harness-backend-agent'),
            ('create-yss-harness-frontend', 'submodules/yss-harness-frontend-agent'),
            ('create-yss-strategic-design', 'submodules/yss-harness-design-agent')]
results = []
for cli, source in families:
    package = root / 'submodules' / cli
    source = root / source
    snapshot = json.loads((package / 'template.snapshot.json').read_text())
    assert snapshot['sourceState'] == 'working-tree', cli
    lock = json.loads((source / 'skills-lock.json').read_text())
    refs = ['AGENTS.md', 'skills-lock.json']
    refs += [str(p.relative_to(source)) for p in (source / '.agents/skills').rglob('SKILL.md')]
    refs += [str(p.relative_to(source)) for p in (source / '.agents/skills').rglob('agents/openai.yaml')]
    refs += [str(p.relative_to(source)) for p in (source / '.agents/skills').rglob('references/authoring.md')]
    refs += [str(p.relative_to(source)) for p in (source / '.agents/skills').rglob('references/annotation-examples.md')]
    for runtime, packages in lock['skills'].get('platform', {}).items():
        for name in packages:
            refs += [str(p.relative_to(source)) for p in (source / runtime / name).rglob('SKILL.md')]
    for ref in refs:
        if 'files' in snapshot:
            item = snapshot['files'][ref]
            artifact = package / 'template' / item['blob']
            assert hashlib.sha256(artifact.read_bytes()).hexdigest() == item['digest'], (cli, ref)
        else:
            artifact = package / 'template' / snapshot.get('encodedPaths', {}).get(ref, ref)
        expected = (source / ref).read_bytes()
        if cli == 'create-yss-spec' and ref == 'AGENTS.md':
            # The existing generator intentionally removes template-maintainer instructions from instances.
            expected = re.sub(r'\n## 4\. `template-source` 模板维护路由[\s\S]*?(?=\n## 5\.)', '', expected.decode()).encode()
        assert artifact.read_bytes() == expected, (cli, ref)
    results.append(dict(cli=cli, checked_files=len(refs), snapshot=snapshot['snapshotHash'], source_state=snapshot['sourceState']))
print(json.dumps(dict(result='pass', bundles=results), ensure_ascii=False))
