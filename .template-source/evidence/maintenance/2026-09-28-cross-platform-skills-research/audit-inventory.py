#!/usr/bin/env python3
"""只读清点；依赖 PyYAML。输出到 stdout，不代表宿主加载或模型行为验证。"""
import collections
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import yaml

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()


def load_frontmatter(path):
    text = path.read_text()
    parts = text.split('---', 2)
    return yaml.safe_load(parts[1]), parts[2], text


def fingerprint(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


repos = []
for repo in [root] + sorted((root / 'submodules').glob('yss-harness-*-agent')):
    rows, runtimes = [], {}
    for p in sorted((repo / '.agents/skills').glob('*/SKILL.md')):
        fm, body, text = load_frontmatter(p)
        name, description = fm.get('name'), fm.get('description')
        issues = []
        if (not isinstance(name, str) or not 1 <= len(name) <= 64
                or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name)
                or name != p.parent.name):
            issues.append('name')
        if not isinstance(description, str) or not 1 <= len(description) <= 1024:
            issues.append('description')
        meta = p.parent / 'agents/openai.yaml'
        obj = yaml.safe_load(meta.read_text()) if meta.exists() else {}
        rows.append(dict(
            path=str(p.relative_to(root)), name=name, description=description,
            keys=list(fm), lines=len(text.splitlines()), body_chars=len(body),
            sha256=fingerprint(p), basic_format_issues=issues,
            openai_metadata=meta.exists(),
            openai_sha256=fingerprint(meta) if meta.exists() else None,
            allow_implicit_invocation=obj.get('policy', {}).get('allow_implicit_invocation'),
            disable_model_invocation=fm.get('disable-model-invocation'),
            resources={k: sum(x.is_file() for x in (p.parent / k).rglob('*'))
                       for k in ['references', 'scripts', 'assets']}))
    for rt in ['.agents', '.codex', '.cursor', '.pi', '.claude', '.gemini']:
        entries = []
        for directory, _, files in os.walk(repo / rt / 'skills', followlinks=True):
            if 'SKILL.md' not in files:
                continue
            p = Path(directory) / 'SKILL.md'
            fm, _, _ = load_frontmatter(p)
            entries.append(dict(path=str(p.relative_to(root)), name=fm.get('name'),
                                resolved_path=str(p.resolve().relative_to(root)),
                                symlink_directory=p.parent.is_symlink()))
        runtimes[rt] = sorted(entries, key=lambda x: x['path'])
    registry_path = repo / '.template-spec/agents/yss-skill-registry.yaml'
    registry = yaml.safe_load(registry_path.read_text())
    contract = registry['invocation_contract']
    by_name = {x['name']: x for x in rows}
    user_entries = []
    for skill in registry['skills']:
        mode = dict(contract['default'])
        mode.update(contract.get('layer_defaults', {}).get(skill['layer'], {}))
        mode.update(contract.get('overrides', {}).get(skill['id'], {}))
        if mode['invocation_mode'] == 'user':
            current = by_name[skill['id']]
            user_entries.append(dict(id=skill['id'], layer=skill['layer'],
                                     openai_policy=current['allow_implicit_invocation'],
                                     claude_disable=current['disable_model_invocation']))
    summary = dict(canonical_count=len(rows),
                   basic_format_issues=[x['name'] for x in rows if x['basic_format_issues']],
                   over_500_lines=[x['name'] for x in rows if x['lines'] > 500],
                   description_chars=sum(len(x['description']) for x in rows),
                   metadata_count=sum(x['openai_metadata'] for x in rows),
                   field_counts=dict(collections.Counter(k for x in rows for k in x['keys'])),
                   runtime_file_counts={k: len(v) for k, v in runtimes.items()},
                   user_only_entries=user_entries,
                   user_only_missing_openai_false=[x['id'] for x in user_entries if x['openai_policy'] is not False],
                   largest_bodies=[dict(name=x['name'], lines=x['lines'], body_chars=x['body_chars'])
                                   for x in sorted(rows, key=lambda x: x['body_chars'], reverse=True)[:10]])
    repos.append(dict(repo=str(repo.relative_to(root)),
                      commit=subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip(),
                      registry_sha256=fingerprint(registry_path),
                      runtime_roots=registry['agent_runtime_roots'],
                      summary=summary, skills=rows, filesystem_entries=runtimes))

print(json.dumps(dict(
    schema_version=1, observation='filesystem-and-declared-policy-only',
    note='文件数包含投影、符号链接和平台私有子目录；不是加载数量；字符数不是 token 数。ASCII 名称检查只覆盖当前目录采用的命名集合。',
    repositories=repos), ensure_ascii=False, indent=2))
