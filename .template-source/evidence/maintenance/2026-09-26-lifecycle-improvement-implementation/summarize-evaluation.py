"""Summarize all retained formal runs without replacing failures or raw records."""
import hashlib
import json
from pathlib import Path
import statistics

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / 'C2-v2-config.json').read_text())
ROOT = Path(CONFIG['root'])


def distribution(values):
    return {'n': len(values), 'sum': round(sum(values), 2), 'median': round(statistics.median(values), 2), 'min': min(values), 'max': max(values)} if values else None


def main():
    reviews = {(row['variant'], row['scenario'], row['repeat']): row for row in json.loads((HERE / 'semantic-review.json').read_text())}
    results = {variant: [json.loads(f.read_text()) for f in sorted((ROOT / variant).glob('*/result.json'))] for variant in ['baseline', 'candidate']}
    variants, by_scenario = {}, []
    for variant, rows in results.items():
        usage = [u for row in rows for u in row['usage']]
        reviewed = [reviews[(variant, row['scenario'], row['repeat'])] for row in rows if (variant, row['scenario'], row['repeat']) in reviews]
        variants[variant] = {
            'completed_scenario_records': len(rows), 'expected': 24,
            'automatic_passed': sum(r['automatic_result'] == 'passed' for r in rows),
            'automatic_failed': sum(r['automatic_result'] != 'passed' for r in rows),
            'semantic_reviewed': len(reviewed), 'semantic_passed': sum(r['semantic_result'] == 'passed' for r in reviewed),
            'critical_wrong_allow_observed': sum(r.get('critical_wrong_allow', 0) for r in reviewed),
            'wrong_reject_observed': sum(r.get('wrong_reject', 0) for r in reviewed),
            'duplicate_decision_requests_observed': sum(r.get('duplicate_decision_requests', 0) for r in reviewed),
            'duplicate_side_effects_observed': sum(r.get('duplicate_side_effects', 0) for r in reviewed),
            'evidence_quality_findings': [{'scenario':r['scenario'], 'repeat':r['repeat'], **finding} for r in reviewed for finding in r.get('evidence_quality_findings', [])],
            'scenario_elapsed_seconds': distribution([r['elapsed_seconds'] for r in rows]),
            'step_elapsed_seconds': distribution([s['elapsed_seconds'] for r in rows for s in r['steps']]),
            'tool_calls': distribution([r['tool_calls'] for r in rows]),
            'usage': {key: sum(u.get(key, 0) for u in usage) for key in ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens']},
            'usage_unreported_steps': sum(not step['usage'] for row in rows for step in row['steps']),
            'usage_scope': 'Only runtime-reported usage; missing/timeout usage is unknown, not zero',
            'timing_limits': {'human_wait_seconds': 0, 'human_wait_basis': 'No live human answer collected inside fixtures', 'tool_wait_seconds': None, 'agent_compute_seconds': None, 'reason': 'CLI events do not expose timestamps; total elapsed includes model/tool/runtime time'},
        }
    for scenario in json.loads((HERE / 'agent-scenarios-full.json').read_text())['scenarios']:
        row = {'scenario': scenario['id']}
        for variant, results_for_variant in results.items():
            rows = [r for r in results_for_variant if r['scenario'] == scenario['id']]
            row[variant] = {'runs': [{'repeat': r['repeat'], 'automatic': r['automatic_result'], 'semantic': reviews.get((variant,r['scenario'],r['repeat']),{}).get('semantic_result','pending'), 'seconds':r['elapsed_seconds'], 'tool_calls':r['tool_calls'], 'timeout':r['timeout'], 'unattempted_steps':r['unattempted_steps']} for r in rows], 'elapsed_seconds':distribution([r['elapsed_seconds'] for r in rows])}
        by_scenario.append(row)
    configs = {}
    for variant in results:
        ref = ROOT / variant / 'run-config.json'
        if ref.exists(): configs[variant] = json.loads(ref.read_text())
    equality = {key: len(configs)==2 and configs['baseline'][key] == configs['candidate'][key] for key in ['runtime_sha256','runner_sha256','suite_sha256','model','reasoning_effort','repetitions','python_dependencies','python_runtime']}
    report = {'complete': all(v['completed_scenario_records']==24 and v['semantic_reviewed']==24 for v in variants.values()), 'variants': variants, 'by_scenario': by_scenario, 'shared_configuration_equal': equality, 'raw_root':str(ROOT), 'monetary_cost':None, 'monetary_cost_reason':'No verified billing/rate data; token counts are not a monetary invoice', 'limitations':['Two repetitions per case; no statistical significance claim','Synthetic approvals and local component scenarios do not prove real business release','Disk recovery uses a new runtime session','Semantic assessment by primary maintainer, not an independent reviewer','Prompt-guided tasks do not test fully autonomous scenario discovery','Interrupted environment batch excluded as a whole; preserved separately']}
    (HERE / 'evaluation-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'complete':report['complete'],'variants':variants},ensure_ascii=False))


if __name__ == '__main__':
    main()
