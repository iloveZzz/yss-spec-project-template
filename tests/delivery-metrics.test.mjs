import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectDeliveryMetrics, DAILY_EVIDENCE_MARKER } from '../scripts/lib/delivery-metrics.mjs';

function instance(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-delivery-metrics-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, ref, content) {
  fs.mkdirSync(path.dirname(path.join(root, ref)), { recursive: true });
  fs.writeFileSync(path.join(root, ref), content);
}
const checkpoint = (extra = {}) => JSON.stringify({ repository_mode: 'project-instance', stage: 'stage.plan', status: 'running', blockers: [], human_review: { not_applicable: [] }, ...extra });

test('空实例输出零值，缺失指标标为 unavailable 而不是 0', t => {
  const metrics = collectDeliveryMetrics(instance(t));
  assert.equal(metrics.governed.checkpoints, 0);
  assert.equal(metrics.daily.records, 0);
  assert.equal(metrics.daily.share, null);
  assert.ok(metrics.unavailable.rework_rounds);
});

test('统计正式 checkpoint 的状态、阶段、阻塞与不适用门禁，日常记录按证据标记识别', t => {
  const root = instance(t);
  write(root, '.work/feat-a/cp.json', checkpoint({ status: 'blocked', blockers: [{ id: 'b1' }], human_review: { not_applicable: ['gate.product-design-approved'] } }));
  write(root, '.work/feat-b/cp.json', checkpoint({ stage: 'stage.spec-architecture', human_review: { not_applicable: [{ gate: 'gate.product-design-approved' }] } }));
  write(root, '.work/feat-b/evidence/deep.json', checkpoint());
  write(root, '.work/feat-b/note.json', JSON.stringify({ unrelated: true }));
  write(root, '.work/feat-a/issues/daily.md', `# 普通 Ticket\n\n${DAILY_EVIDENCE_MARKER}\n`);
  write(root, '.work/feat-a/issues/plain.md', '# 没有证据标记\n');
  const metrics = collectDeliveryMetrics(root);
  assert.equal(metrics.governed.checkpoints, 2, '深于功能目录一层的文件不算 checkpoint');
  assert.deepEqual(metrics.governed.by_status, { blocked: 1, running: 1 });
  assert.equal(metrics.governed.blocked, 1);
  assert.equal(metrics.governed.blockers_open, 1);
  assert.deepEqual(metrics.governed.not_applicable, { 'gate.product-design-approved': 2 });
  assert.equal(metrics.daily.records, 1);
  assert.equal(metrics.daily.share, 0.333);
});

test('命令行只读输出 JSON，未知参数拒绝', t => {
  const root = instance(t);
  const script = path.resolve('scripts/delivery-metrics');
  assert.equal(JSON.parse(execFileSync(script, ['--root', root], { encoding: 'utf8' })).schema_version, 1);
  assert.throws(() => execFileSync(script, ['--bogus'], { encoding: 'utf8', stdio: 'pipe' }), /未知参数/);
  assert.deepEqual(fs.readdirSync(root), [], '不写入被检查的实例');
});

test('单记录证据按路线与进度统计，开放阻断项与 standard 决定可机读；澄清记录按状态计数', t => {
  const root = instance(t);
  const record = (evidence) => `# Ticket\n\n${DAILY_EVIDENCE_MARKER}\n\`\`\`json\n${JSON.stringify(evidence)}\n\`\`\`\n`;
  write(root, '.work/a/task.md', record({ delivery_path: 'daily' }));
  write(root, '.work/b/task.md', record({ delivery_path: 'standard', standard_decision: { decision: 'approved' }, implementation: { actor_id: 'dev' }, review: { result: 'passed', blocking_findings: [] } }));
  write(root, '.work/c/task.md', record({ delivery_path: 'daily', implementation: { actor_id: 'dev' }, review: { result: 'failed', blocking_findings: [{ id: 'F1' }, { id: 'F2' }] } }));
  write(root, '.work/d/task.md', `# Ticket\n\n${DAILY_EVIDENCE_MARKER}\n不是 JSON\n`);
  write(root, '.work/b/clarification-log.md', '| 编号 | 问题 | 选项 | 决定 | 影响 | 决策人 | 回复 | 状态 |\n|---|---|---|---|---|---|---|---|\n| CQ-1 | q | a | a | AC-1 | 张三 | r | decided |\n| CQ-2 | q | a |  | AC-2 |  |  | open |\n| CQ-3 | q | a | b | AC-1 | 张三 | r | superseded |\n');
  const m = collectDeliveryMetrics(root);
  assert.equal(m.daily.records, 4);
  assert.deepEqual(m.single_record.by_path, { daily: 2, standard: 1 });
  assert.deepEqual(m.single_record.by_progress, { planned: 1, 'reviewed-passed': 1, implemented: 1 });
  assert.equal(m.single_record.unparsed, 1, '无法解析的证据只计数，不猜字段');
  assert.equal(m.single_record.open_blocking_findings, 2);
  assert.equal(m.single_record.standard_decisions, 1);
  assert.deepEqual(m.clarification, { logs: 1, open: 1, decided: 1, superseded: 1, other: 0 });
  assert.ok(m.unavailable.rework_rounds && m.unavailable.cycle_time && m.unavailable.daily_rejection_reasons);
});

test('Plan 审查尝试按阶段统计复审轮次；审批记录按行统计结论与会话独立性', t => {
  const root = instance(t);
  const attempts = [{ phase: 'initial' }, { phase: 'rereview' }, { phase: 'exception' }];
  write(root, '.work/feat-a/cp.json', checkpoint({ plan_review_control: { attempts } }));
  write(root, '.work/feat-a/reviews/design/bundle.yaml', 'schema_version: 2\nkind: review-bundle\nindependence:\n  mode: same-session\nreviews:\n  - gate_id: gate.technical-design-approved\n    decision: approved\n  - gate_id: gate.engineering-contract-approved\n    decision: pending\n');
  write(root, '.work/feat-a/gates/spec.json', JSON.stringify({ gate_id: 'gate.spec-baseline-approved', decision: 'approved', actor_kind: 'digital-human', independence: { mode: 'separate-session' } }));
  write(root, '.work/feat-a/gates/old.json', JSON.stringify({ gate_id: 'gate.plan-approved', decision: 'approved', actor_kind: 'digital-human' }));
  const m = collectDeliveryMetrics(root);
  assert.deepEqual(m.plan_review, { checkpoints: 1, attempts: 3, by_phase: { initial: 1, rereview: 1, exception: 1 }, rework_rounds: 2 });
  assert.equal(m.governed.checkpoints, 1, '审批记录不计为 checkpoint');
  assert.deepEqual(m.approvals, { files: 3, rows: 4, by_decision: { approved: 3, pending: 1 }, independence: { 'separate-session': 1, 'same-session': 2, undeclared: 1 } });
});
