"""Check recorded analysis evidence; does not execute repository scripts."""
from pathlib import Path
import csv, json, statistics

base = Path(__file__).resolve().parent
m = base / 'measurements'
runs = [json.loads(line) for line in (m / 'runs.jsonl').read_text().splitlines()]
assert len({(r['label'], r['sample']) for r in runs}) == len(runs)
for run in runs:
    assert run['wall_ms'] >= 0 and isinstance(run['exit_code'], int)
    for stream in ('stdout', 'stderr'):
        path = (m / run[stream + '_ref']).resolve()
        assert path.is_relative_to(m.resolve())
        assert path.stat().st_size == run[stream + '_bytes'], path
for row in json.loads((m / 'timings.json').read_text()):
    samples = [r for r in runs if r['label'] == row['label']]
    assert len(samples) == row['samples']
    assert round(statistics.median(r['wall_ms'] for r in samples), 3) == row['median_ms']
coverage = list(csv.DictReader((m / 'coverage.csv').open()))
assert len(coverage) == 2820
assert len({r['path'] for r in coverage}) == 2820
assert len(list(csv.DictReader((base / 'hotspots/implementation-assessments.csv').open()))) == 338
experiment = json.loads((m / 'schema-batch-experiment.json').read_text())
assert all(s['identical_errors'] and s['valid'] == 10 and s['invalid'] == 10 for s in experiment['samples'])
result = {'status': 'passed', 'runs_checked': len(runs), 'log_files_checked': len(runs) * 2,
          'coverage_rows': len(coverage), 'implementation_groups': 338,
          'limitation': 'Evidence consistency only; recorded rejected inputs remain failures, not runtime validation passes.'}
(base / 'measurement-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
