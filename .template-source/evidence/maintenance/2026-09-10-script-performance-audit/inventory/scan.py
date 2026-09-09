#!/usr/bin/env python3
"""Read-only source inventory; writes only adjacent audit artifacts.

Dependency edges are lexical candidates, not an AST/call graph. No source code
is imported or executed. Re-run from any cwd; --root defaults to repository root.
"""
import argparse
import collections
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import time

OUT = Path(__file__).resolve().parent
DEFAULT_ROOT = OUT.parents[4]
SKIP = {'.git', 'node_modules', '.pnpm-store', 'dist', 'build', 'target',
        'coverage', '__pycache__', '.venv', 'venv', '.next', '.nuxt',
        '.codegraph', '.graphify'}
CODE_EXT = {'.js': 'JS', '.mjs': 'JS', '.cjs': 'JS', '.ts': 'TS',
            '.py': 'Python', '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell'}
FLAG_PATTERNS = {
    'process_spawn': r'\b(?:spawn(?:Sync)?|exec(?:File)?(?:Sync)?|subprocess\.(?:run|Popen|call|check_output)|os\.system)\s*\(|node:child_process',
    'tree_io': r'\b(?:readdir(?:Sync)?|walk|rglob|glob|cpSync)\s*\(|recursive\s*:\s*true|\b(?:find|rg)\s',
    'network': r'https?://|\bfetch\s*\(|\b(?:curl|wget)\s|git\s+(?:clone|fetch|push|pull)',
    'mutation': r'\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|mkdir(?:Sync)?|mkdtemp(?:Sync)?|rm(?:Sync)?|unlink(?:Sync)?|rename(?:Sync)?|copyFile(?:Sync)?|cpSync)\s*\(|\b(?:rm|mkdir|cp|mv|git push|git commit)\s|\.write_text\s*\(|\.write_bytes\s*\(',
    'sleep': r'\b(?:sleep|setTimeout)\s*\(',
    'loop': r'\b(?:for|while)\s*\(?|\.forEach\s*\(',
}
IMPORTS = [
    ('import-export', re.compile(r'\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?[\"\']([^\"\']+)[\"\']')),
    ('require-import-call', re.compile(r'\b(?:require|import)\s*\(\s*[\"\']([^\"\']+)[\"\']\s*\)')),
    ('shell-source', re.compile(r'(?:^|[;\n])\s*(?:source|\.)\s+[\"\']?([^\s\"\';]+)', re.M)),
    ('scripts-literal', re.compile(r'(?<![\w./-])((?:\.{1,2}/)*(?:[\w.@-]+/)*scripts/[\w./@-]+)')),
]
DYNAMIC = re.compile(r'\b(?:require|import)\s*\(\s*(?![\s\"\'])[A-Za-z_$][^\n;]*|(?:^|[;\n])\s*(?:source|\.)\s+[^\n;]*\$', re.M)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def write_csv(name, rows, fields):
    with (OUT / name).open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(row[k], ensure_ascii=False) if isinstance(row.get(k), (dict, list)) else row.get(k, '') for k in fields})


def main():
    started = time.perf_counter()
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    args = parser.parse_args()
    root = args.root.resolve()
    submodules = re.findall(r'^\s*path = (.+)$', (root / '.gitmodules').read_text(), re.M)
    errors, links, rows = [], [], []
    sources = {}
    script_dirs = set()

    def repo_for(path):
        return next((s for s in submodules if path == s or path.startswith(s + '/')), '.')

    def scope_for(parts):
        if any(p.startswith('.template-staging-') for p in parts):
            return 'staging'
        if 'evidence' in parts:
            return 'historical'
        if any(parts[i].startswith('.') and parts[i] != '.agents' and parts[i + 1] == 'skills' for i in range(len(parts) - 1)):
            return 'projection'
        return 'active'

    def inspect(path, origin='scripts'):
        rel = path.relative_to(root).as_posix()
        try:
            data = path.read_bytes()
            text = data.decode('utf-8', errors='replace')
        except OSError as error:
            errors.append({'path': rel, 'error': str(error)})
            return None
        parts = Path(rel).parts
        ext = path.suffix.lower()
        lang = CODE_EXT.get(ext)
        shebang = text.split('\n', 1)[0] if data.startswith(b'#!') else ''
        if not lang and shebang:
            lang = 'JS' if 'node' in shebang else 'Python' if 'python' in shebang else 'Shell' if re.search(r'bash|\bsh\b|zsh', shebang) else 'Other-script'
        lang = lang or 'data'
        category = ('directory-external-dependency' if origin == 'closure' else
                    'template-copy' if 'template' in parts else
                    'skill-script' if '.agents' in parts and 'skills' in parts else
                    'maintenance' if '.template-source' in parts else
                    'vendor-fixture' if 'vendor' in parts or 'fixtures' in parts else 'root-script')
        role = ('fixture' if 'fixtures' in parts or lang == 'data' else
                'test' if re.search(r'(?:^|[./_-])(?:tests?|spec)(?:[./_-]|$)', rel) and ('.test.' in rel or '/test/' in rel or '/tests/' in rel) else
                'library' if 'lib' in parts or 'vendor' in parts else
                'cli' if shebang or (path.parent.name == 'scripts' and lang != 'data') else 'library')
        flags = {key: bool(re.search(pattern, text)) for key, pattern in FLAG_PATTERNS.items()} if lang != 'data' else dict.fromkeys(FLAG_PATTERNS, False)
        if role == 'cli' and len(text.splitlines()) <= 20 and re.search(r'\b(?:import|require|exec|node|bash|python)\b', text):
            role = 'wrapper'
        row = dict(repo=repo_for(rel), path=rel, sha256=digest(data), size_bytes=len(data),
                   lines=len(data.splitlines()), language=lang, category=category, role=role,
                   inventory_scope=scope_for(parts), origin=origin,
                   executable_mode=bool(path.stat().st_mode & 0o111), shebang=shebang,
                   static_flags=flags, measurement_status='static-only')
        sources[rel] = text
        return row

    for base, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in SKIP)
        rel = Path(base).relative_to(root)
        for name in dirs:
            path = Path(base) / name
            if path.is_symlink() and ('scripts' in rel.parts or name == 'scripts'):
                links.append({'path': path.relative_to(root).as_posix(), 'kind': 'directory-symlink'})
        if 'scripts' not in rel.parts:
            continue
        script_dirs.add('/'.join(rel.parts[:rel.parts.index('scripts') + 1]))
        for name in sorted(files):
            path = Path(base) / name
            if path.is_symlink():
                links.append({'path': path.relative_to(root).as_posix(), 'kind': 'file-symlink'})
            elif path.is_file():
                row = inspect(path)
                if row:
                    rows.append(row)

    by_path = {r['path']: r for r in rows}
    active = [r for r in rows if r['inventory_scope'] == 'active']
    pending = [r['path'] for r in active if r['language'] != 'data']
    seen, edge_keys, edges, closure = set(), set(), [], []
    # Audit-selected entrypoints complement paths constructed at runtime.
    # Their provenance is explicit; they are not claimed to be inferred calls.
    supplemental = [
        ('.template-source/cli-core/build.mjs', 'canonical source: CORE_PATH in vendored build.mjs'),
        ('.template-source/cli-core/cli.mjs', 'canonical CLI entry corresponding to package.bin runtime'),
        ('.template-source/cli-core/scaffold.mjs', 'canonical CLI generator emits scripts wrappers'),
    ]
    for repo in ('submodules/create-yss-harness-backend', 'submodules/create-yss-harness-frontend'):
        package = json.loads((root / repo / 'package.json').read_text())
        bins = package.get('bin', {})
        for token in ([bins] if isinstance(bins, str) else bins.values()):
            supplemental.append((repo + '/' + token, repo + '/package.json#bin'))
    for entry, reason in supplemental:
        row = inspect(root / entry, 'closure')
        if row:
            by_path[entry] = row
            closure.append(row)
            pending.append(entry)
            edges.append(dict(source='audit-supplemental-entrypoints', line=0, kind='explicit-analysis-entry',
                              token=reason, target=entry, status='resolved-file', semantics='declared-entrypoint-not-inferred-call'))

    def candidates_for(source, token, kind):
        repo = repo_for(source)
        repo_root = root if repo == '.' else root / repo
        source_path = root / source
        candidates = [source_path.parent / token]
        if kind in ('scripts-literal', 'shell-source'):
            candidates += [repo_root / token]
            rel_repo = source_path.relative_to(repo_root)
            if 'template' in rel_repo.parts:
                candidates += [repo_root / 'template' / token]
        expanded = []
        for candidate in candidates:
            expanded += [candidate]
            if not candidate.suffix:
                expanded += [Path(str(candidate) + e) for e in ('.mjs', '.js', '.cjs', '.ts', '.py', '.sh')]
                expanded += [candidate / ('index' + e) for e in ('.js', '.mjs', '.ts')]
        return expanded

    while pending:
        source = pending.pop()
        if source in seen:
            continue
        seen.add(source)
        content = sources[source]
        for kind, pattern in IMPORTS:
            for match in pattern.finditer(content):
                token = match.group(1)
                if kind in ('import-export', 'require-import-call') and not token.startswith('.'):
                    status, resolved = 'external-module', ''
                elif '$' in token:
                    status, resolved = 'unresolved-dynamic', ''
                else:
                    resolved = ''
                    status = 'unresolved-literal'
                    for candidate in candidates_for(source, token, kind):
                        try:
                            absolute = candidate.resolve()
                            relative = absolute.relative_to(root)
                        except (ValueError, OSError):
                            continue
                        if absolute.is_file() and not any(p in SKIP for p in relative.parts) and scope_for(relative.parts) == 'active':
                            resolved = relative.as_posix()
                            status = 'resolved-file'
                            break
                    if resolved and resolved not in by_path:
                        row = inspect(root / resolved, 'closure')
                        if row:
                            by_path[resolved] = row
                            closure.append(row)
                            if row['language'] != 'data':
                                pending.append(resolved)
                    elif resolved and by_path[resolved]['language'] != 'data' and resolved not in seen:
                        pending.append(resolved)
                line = content.count('\n', 0, match.start()) + 1
                edge = dict(source=source, line=line, kind=kind, token=token, target=resolved,
                            status=status, semantics='lexical-reference-candidate')
                key = (source, line, kind, token, resolved)
                if key not in edge_keys:
                    edge_keys.add(key)
                    edges.append(edge)
        for match in DYNAMIC.finditer(content):
            edges.append(dict(source=source, line=content.count('\n', 0, match.start()) + 1,
                              kind='dynamic-expression', token=match.group(0)[:160], target='',
                              status='unresolved-dynamic', semantics='lexical-reference-candidate'))

    rows.sort(key=lambda x: x['path'])
    closure.sort(key=lambda x: x['path'])
    edges.sort(key=lambda x: (x['source'], x['line'], x['kind']))
    groups = collections.defaultdict(list)
    for row in rows + closure:
        groups[row['sha256']].append(row)
    unique = []
    for sha, copies in sorted(groups.items()):
        representatives = sorted(copies, key=lambda r: (r['inventory_scope'] != 'active', r['repo'] != '.', 'template' in Path(r['path']).parts, len(r['path']), r['path']))
        unique.append(dict(sha256=sha, representative_path=representatives[0]['path'],
                           representative_is_authority_claim=False,
                           code=any(r['language'] != 'data' for r in copies),
                           copies=[dict(path=r['path'], repo=r['repo'], inventory_scope=r['inventory_scope'], origin=r['origin']) for r in copies]))

    def summarize(items):
        return dict(files=len(items), code_files=sum(r['language'] != 'data' for r in items),
                    unique_sha256=len({r['sha256'] for r in items}),
                    unique_code_sha256=len({r['sha256'] for r in items if r['language'] != 'data'}),
                    bytes=sum(r['size_bytes'] for r in items),
                    languages=dict(collections.Counter(r['language'] for r in items)),
                    roles=dict(collections.Counter(r['role'] for r in items)),
                    executable_mode=sum(r['executable_mode'] for r in items),
                    shebang_files=sum(bool(r['shebang']) for r in items))

    summary = dict(schema_version=1, repository_root=str(root), repository_mode='template-source',
                   context_reconciliation={'status': 'not-applicable', 'reason': '模板维护事实盘点，不生成产品工作单元或产品术语。'},
                   scan_policy={'directory_name': 'scripts', 'recursive': True, 'follow_symlinks': False,
                                'supplemental_entrypoints': [{'path': p, 'reason': r} for p, r in supplemental],
                                'excluded_directory_names': sorted(SKIP),
                                'scope_order': ['staging', 'historical(evidence)', 'projection', 'active'],
                                'dependency_analysis': 'lexical static candidates; dynamic calls unresolved; not complete semantic graph',
                                'performance_flags': 'regex presence, including comments/literals; candidates only, not execution evidence',
                                'measurement_status': 'static-only'},
                   scripts=summarize(rows),
                   scopes={scope: summarize([r for r in rows if r['inventory_scope'] == scope]) for scope in ('active', 'projection', 'staging', 'historical')},
                   active_by_repo={repo: summarize([r for r in active if r['repo'] == repo]) for repo in ['.'] + submodules},
                   directory_external_closure=summarize(closure),
                   dependency_edges=dict(total=len(edges), by_status=dict(collections.Counter(e['status'] for e in edges))),
                   readable_regular_files_total=len(rows) + len(closure),
                   read_errors=errors, skipped_symlinks=links,
                   verification={'sha256_coverage': f'{len(rows) + len(closure)}/{len(rows) + len(closure)}', 'source_scripts_executed': 0},
                   scan_seconds=round(time.perf_counter() - started, 4))
    fields = ['repo', 'path', 'sha256', 'size_bytes', 'lines', 'language', 'category', 'role', 'inventory_scope', 'origin', 'executable_mode', 'shebang', 'static_flags', 'measurement_status']
    write_json('inventory.json', rows)
    write_csv('inventory.csv', rows, fields)
    write_json('closure.json', closure)
    write_csv('closure.csv', closure, fields)
    write_json('unique-implementations.json', unique)
    write_csv('dependency-edges.csv', edges, ['source', 'line', 'kind', 'token', 'target', 'status', 'semantics'])
    write_json('summary.json', summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
