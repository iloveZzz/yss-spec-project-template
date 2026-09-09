#!/usr/bin/env python3
"""Revalidate the inventory against current bytes without running source scripts."""
import csv
import hashlib
import json
from pathlib import Path
import time

start = time.perf_counter()
out = Path(__file__).resolve().parent
root = out.parents[4]
rows = json.loads((out / 'inventory.json').read_text())
closure = json.loads((out / 'closure.json').read_text())
groups = json.loads((out / 'unique-implementations.json').read_text())
errors = []
for row in rows + closure:
    path = root / row['path']
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != row['sha256']:
        errors.append({'path': row['path'], 'problem': 'missing-or-sha256-drift'})
for filename, items in [('inventory.csv', rows), ('closure.csv', closure)]:
    with (out / filename).open() as stream:
        csv_rows = list(csv.DictReader(stream))
    if len(csv_rows) != len(items) or {r['path'] for r in csv_rows} != {r['path'] for r in items}:
        errors.append({'path': filename, 'problem': 'CSV-JSON-row-mismatch'})
paths = [row['path'] for row in rows + closure]
members = [copy['path'] for group in groups for copy in group['copies']]
if sorted(paths) != sorted(members) or len(paths) != len(set(paths)):
    errors.append({'problem': 'hash-group-coverage-mismatch'})
with (out / 'dependency-edges.csv').open() as stream:
    edges = list(csv.DictReader(stream))
for edge in edges:
    if edge['status'] == 'resolved-file' and (edge['target'] not in paths or not (root / edge['target']).is_file()):
        errors.append({'problem': 'resolved-edge-target-missing', 'edge': edge})
result = dict(command=f'python3 {Path(__file__).relative_to(root)}', exit_code=int(bool(errors)),
              checked_files=len(paths), checked_hash_groups=len(groups),
              checked_dependency_edges=len(edges), errors=errors,
              elapsed_seconds=round(time.perf_counter() - start, 4), source_scripts_executed=0)
(out / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
raise SystemExit(bool(errors))
