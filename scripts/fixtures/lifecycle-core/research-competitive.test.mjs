import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {recordResearchVerification, validateResearchCompletion, RESEARCH_VALIDATOR} from '../../lib/maintenance-research.mjs';
import {hash} from '../../lib/strategic-handoff-io.mjs';

function fixture(t, {render = true} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-completion-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const put = (ref, bytes) => {
    fs.mkdirSync(path.dirname(path.join(root, ref)), {recursive: true});
    fs.writeFileSync(path.join(root, ref), typeof bytes === 'string' ? bytes : JSON.stringify(bytes, null, 2) + '\n');
  };
  fs.cpSync('.agents/skills/yss-research', path.join(root, '.agents/skills/yss-research'), {recursive: true});
  for (const ref of ['scripts/lib/json-schema.mjs', 'scripts/lib/validation-phase.mjs', '.template-spec/plan/templates/competitive-matrix-template.md', '.template-spec/plan/templates/competitive-analysis-template.md']) put(ref, fs.readFileSync(ref, 'utf8'));
  put('yss-project.yaml', 'schema_version: 1\nrepository_mode: template-source\n');
  const evidence = JSON.parse(fs.readFileSync('.agents/skills/yss-research/assets/evidence-template.yaml', 'utf8'));
  evidence.evidence_items[0].source_level = 'primary';
  evidence.evidence_items[0].source_class = 'official-documentation';
  evidence.evidence_items[0].source_ref = 'fixture-public-document.md';
  evidence.claims[0].claim_kind = 'technical-fact';
  evidence.claims[0].statement = '固定资料明确支持工作流审批。';
  evidence.competitive_analysis = {
    schema_version: 1, output_selection: 'both', as_of: '2026-10-02', comparison_scope: '固定资料中的团队版审批能力',
    competitors: [{id: 'product-a', name: '样例 A', type: 'direct', product: '样例产品', version: '1', edition: 'team', region: 'global'}],
    capabilities: [{id: 'approval', module: '流程', name: '审批', definition: '指定审批人确认后继续流程', user_value: '责任可追溯'}],
    assessments: [{competitor_id: 'product-a', capability_id: 'approval', status: 'supported', claim_refs: ['claim-001'], limitations: [], gap: null}],
    artifacts: {matrix: 'demo-competitive-matrix.md', report: 'demo-competitive-analysis.md'},
  };
  put('demo-evidence.yaml', evidence);
  put('demo-research-brief.md', fs.readFileSync('.agents/skills/yss-research/assets/research-brief-template.md', 'utf8') + '\nclaim-001\n');
  put('context.json', {status: 'not-applicable', reason: '模板维护固定资料测试'});
  if (render) {
    const rendered = spawnSync(process.execPath, [path.join(root, '.agents/skills/yss-research/scripts/render-competitive-outputs.mjs'), path.join(root, 'demo-evidence.yaml')], {encoding: 'utf8'});
    assert.equal(rendered.status, 0, rendered.stdout + rendered.stderr);
  } else {
    put('demo-competitive-matrix.md', '# 样例矩阵\n');
    put('demo-competitive-analysis.md', '# 样例报告\n');
  }
  return {root, put};
}

function runAndState(root) {
  const run = recordResearchVerification(root, 'demo-research-brief.md', 'demo-evidence.yaml', 'verification');
  assert.equal(run.exit_code, 0, fs.readFileSync(path.join(root, 'verification/stderr.log'), 'utf8'));
  const record = JSON.parse(fs.readFileSync(path.join(root, run.binding.ref), 'utf8'));
  const refs = (record.inputs.competitive || []).map(x => x.ref);
  const state = {research_verification: run.binding, context_reconciliation: {status: 'not-applicable', reason: '模板维护固定资料测试', ref: 'context.json'},
    evidence_refs: ['context.json', run.binding.ref, 'demo-research-brief.md', 'demo-evidence.yaml', ...refs],
    blocking_signals: [], drift: [], violation: [], new_impacts: [], stale_candidates: []};
  return {run, record, state};
}

test('research verification binds both competitor outputs and validation dependencies', t => {
  const {root} = fixture(t, {render: fs.existsSync('.agents/skills/yss-research/scripts/render-competitive-outputs.mjs')});
  const {record, state} = runAndState(root);
  assert.ok(record.inputs.competitive?.some(x => x.ref === 'demo-competitive-matrix.md'), '矩阵必须纳入验证摘要');
  assert.ok(record.inputs.competitive.some(x => x.ref === 'demo-competitive-analysis.md'), '报告必须纳入验证摘要');
  assert.ok(record.inputs.competitive.some(x => x.ref.endsWith('competitive-analysis.schema.json')), 'Schema 必须纳入验证摘要');
  assert.ok(record.inputs.competitive.some(x => x.ref.endsWith('json-schema.mjs')), 'Schema 执行器必须纳入验证摘要');
  assert.deepEqual(validateResearchCompletion(state, {root}), record);
});

test('human narrative changes make a previous competitive research verification stale', t => {
  const {root} = fixture(t);
  const {state} = runAndState(root);
  fs.appendFileSync(path.join(root, 'demo-competitive-analysis.md'), '\n人工追加结论。\n');
  assert.throws(() => validateResearchCompletion(state, {root}), /stale/);
});

test('omitted competitive bindings and changed schema cannot reuse a passed record', t => {
  const {root} = fixture(t);
  const {record, state, run} = runAndState(root);
  const recordPath = path.join(root, run.binding.ref), original = fs.readFileSync(recordPath);
  delete record.inputs.competitive;
  fs.writeFileSync(recordPath, JSON.stringify(record));
  const missing = structuredClone(state);
  missing.research_verification.digest = hash(fs.readFileSync(recordPath));
  assert.throws(() => validateResearchCompletion(missing, {root}), /competitive.*binding|binding.*competitive/);
  fs.writeFileSync(recordPath, original);
  fs.appendFileSync(path.join(root, '.agents/skills/yss-research/references/competitive-analysis.schema.json'), '\n');
  assert.throws(() => validateResearchCompletion(state, {root}), /stale/);
});

test('research completion requires all competitor input references and refuses output symlinks', t => {
  const {root} = fixture(t);
  const {state} = runAndState(root);
  const missing = structuredClone(state);
  missing.evidence_refs = missing.evidence_refs.filter(x => x !== 'demo-competitive-matrix.md');
  assert.throws(() => validateResearchCompletion(missing, {root}), /unreferenced/);
  const report = path.join(root, 'demo-competitive-analysis.md');
  fs.renameSync(report, report + '.original');
  fs.symlinkSync(report + '.original', report);
  assert.throws(() => validateResearchCompletion(state, {root}), /symlink|symbolic link/);
});
