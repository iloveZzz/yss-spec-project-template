#!/usr/bin/env python3
"""Paired full-fast qualification. Run only against a disposable, fixed checkout."""
import argparse
import collections
import hashlib
import json
import math
import os
from pathlib import Path
import random
import re
import signal
import statistics
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--pairs', type=int, choices=[3, 21], default=21)
parser.add_argument('--seed', type=int, default=20261001)
args = parser.parse_args()
root, output = args.root.resolve(), args.output.resolve()
owner = Path(__file__).resolve().parents[2]
if root == owner or root in owner.parents or owner in root.parents:
    parser.error('root must be an isolated checkout outside the authoring repository')
if output.exists() or root == output or root in output.parents:
    parser.error('output must be a new directory outside the checkout')
if not (root / '.git').exists():
    parser.error('root must be a Git checkout')
output.mkdir(parents=True)
ref = '.template-source/tooling/node/test/plugin-project.test.mjs'
input_ref = '.template-source/plugins/yss-backend-delivery/README.md'
subject = root / input_ref
original = subject.read_bytes()
lock = output.parent / ('tooling-benchmark-' + hashlib.sha256(str(root).encode()).hexdigest()[:16] + '.lock')
lock_fd = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
os.write(lock_fd, str(os.getpid()).encode())
os.close(lock_fd)
report = {'schema_version': 1, 'kind': 'full-fast-tooling-benchmark', 'status': 'running', 'root': str(root),
          'harness_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
          'pairs_per_state': args.pairs, 'seed': args.seed, 'scenario': ref, 'input_change_ref': input_ref,
          'cache_policy': 'No persistent task/artifact cache in either mode. first-run clears owned preparation by construction; repeat preserves source; input-change modifies the same declared source bytes before both members. OS page cache is uncontrolled.',
          'samples': [], 'summary': [], 'test_identities': None}
rng = random.Random(args.seed)
expected = None
expected_runtime = None
expected_python = None

def save():
    temporary = output / 'benchmark.json.tmp'
    temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(output / 'benchmark.json')

def identities(metrics):
    result = collections.Counter()
    for row in metrics['tests']:
        if row['event'] not in ('test:pass', 'test:fail'):
            continue
        if row['event'] != 'test:pass' or row['skip'] or row['todo']:
            raise AssertionError('failed, skipped or todo test cannot qualify')
        relative = str(Path(row['file']).resolve().relative_to(root))
        result[(relative, tuple(row['parents']), row['name'])] += 1
    if not result:
        raise AssertionError('empty test identity set')
    return result

def sample(state, pair, mode):
    directory = output / f'{state}-{pair:02d}-{mode}'
    command = [str(root / 'scripts/verify-template-fast'), '--changed-file', ref,
               '--tooling-mode', mode, '--concurrency', '2', '--report-dir', str(directory)]
    if state == 'input-change':
        command += ['--changed-file', input_ref]
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
    for name in ('YSS_TOOLING_MODE', 'YSS_TOOLING_REPORT_DIR', 'YSS_TOOLING_PLUGIN_FIXTURE', 'YSS_TOOLING_PLUGIN_FIXTURE_SHA256', 'YSS_TOOLING_COPY_LOG'):
        env.pop(name, None)
    started = time.perf_counter()
    with (output / f'{directory.name}.stdout').open('wb') as out, (output / f'{directory.name}.stderr').open('wb') as err:
        process = subprocess.Popen(command, cwd=root, env=env, stdout=out, stderr=err)
        try:
            code = process.wait(timeout=900)
        except BaseException:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill(); process.wait()
            raise
    wall = (time.perf_counter() - started) * 1000
    row = {'state': state, 'pair': pair, 'mode': mode, 'command': command, 'exit_code': code,
           'wall_ms': wall, 'source_sha256': hashlib.sha256(subject.read_bytes()).hexdigest(), 'report_ref': str(directory / 'report.json')}
    report['samples'].append(row); save()
    verification = json.loads((directory / 'report.json').read_text())
    metrics = json.loads((directory / 'tooling/metrics.json').read_text())
    assert code == 0 and verification['status'] == 'passed' and verification['input_drift'] is False
    assert verification['plan']['effective_profile'] == 'fast'
    assert metrics['status'] == 'passed' and metrics['input_drift'] is False
    assert metrics['mode'] == mode
    row['verification_input_sha256'] = verification['input_sha256']
    for previous in report['samples'][:-1]:
        if previous['state'] == state and previous['pair'] == pair:
            assert previous['verification_input_sha256'] == row['verification_input_sha256'], 'paired source inputs differ'
    global expected_runtime
    if expected_runtime is None:
        expected_runtime = metrics['runtime']; report['runtime'] = expected_runtime
    assert metrics['runtime'] == expected_runtime, 'runtime changed across samples'
    assert len(metrics['executions']) == (1 if mode == 'legacy' else len(metrics['selected_files']))
    assert len(metrics['copies']) == (0 if mode == 'legacy' else 3)
    assert sum('backend-plugin-build' in item['name'] for item in metrics['preparations']) == (mode == 'optimized')
    actual = identities(metrics)
    row['successful_plugin_builds'] = sum(r['code'] == 0 for r in metrics['builds']) + sum('backend-plugin-build' in r['name'] and r['code'] == 0 for r in metrics['preparations'])
    assert row['successful_plugin_builds'] == (6 if mode == 'legacy' else 4), 'actual plugin build count changed'
    global expected
    if expected is None:
        expected = actual
        report['test_identities'] = [{'file': key[0], 'parents': key[1], 'name': key[2], 'count': count} for key, count in sorted(actual.items())]
    assert actual == expected, 'test identity or execution count changed'
    python_rows = [r for r in verification['results'] if 'unittest discover' in r['command']]
    assert len(python_rows) == 1
    python_log = Path(python_rows[0]['stdoutFile']).read_text() + Path(python_rows[0]['stderrFile']).read_text()
    assert 'Ran 39 tests' in python_log and 'OK' in python_log
    python_cases = re.findall(r'^\S+ \(([^)]+)\) \.\.\. (.+)$', python_log, re.MULTILINE)
    assert len(python_cases) == 39 and all(status == 'ok' for _, status in python_cases), 'Python identity/result records incomplete'
    python_identities = collections.Counter(identity for identity, _ in python_cases)
    global expected_python
    if expected_python is None:
        expected_python = python_identities
        report['python_test_identities'] = [{'id': identity, 'count': count} for identity, count in sorted(python_identities.items())]
    assert python_identities == expected_python, 'Python test identity or execution count changed'
    row['node_tests'] = sum(actual.values()); row['python_tests'] = 39; row['input_drift'] = False; row['valid'] = True
    save()
    print(json.dumps({'state': state, 'pair': pair, 'mode': mode, 'seconds': round(wall / 1000, 2), 'tests': row['node_tests']}, ensure_ascii=False), flush=True)

termination_requested = False

def stop_requested(signum, _frame):
    global termination_requested
    if not termination_requested:
        termination_requested = True
        raise KeyboardInterrupt(f'signal {signum}')

signal.signal(signal.SIGTERM, stop_requested)
signal.signal(signal.SIGINT, stop_requested)

try:
    save()
    for state in ['first-run', 'repeat', 'input-change']:
        subject.write_bytes(original)
        for pair in range(args.pairs):
            if state == 'input-change':
                subject.write_bytes(original + f'\n<!-- qualification input {args.seed}:{pair} -->\n'.encode())
            order = ['legacy', 'optimized']; rng.shuffle(order)
            for mode in order:
                sample(state, pair, mode)
        rows = [r for r in report['samples'] if r['state'] == state]
        timings = {mode: sorted(r['wall_ms'] for r in rows if r['mode'] == mode) for mode in ['legacy', 'optimized']}
        median = {mode: statistics.median(values) for mode, values in timings.items()}
        p95 = {mode: values[math.ceil(len(values) * .95) - 1] for mode, values in timings.items()}
        report['summary'].append({'state': state, 'median_ms': median, 'p95_ms': p95,
                                  'reduction_percent': (1 - median['optimized'] / median['legacy']) * 100,
                                  'pass': median['optimized'] <= median['legacy'] * .8 and p95['optimized'] <= p95['legacy']})
        save()
    report['status'] = 'passed' if all(row['pass'] for row in report['summary']) else 'performance-not-accepted'
except BaseException as error:
    report['status'] = 'failed'; report['error'] = repr(error)
    raise
finally:
    subject.write_bytes(original)
    report['source_restored'] = subject.read_bytes() == original
    save(); lock.unlink()

if report['status'] != 'passed':
    raise SystemExit(1)
