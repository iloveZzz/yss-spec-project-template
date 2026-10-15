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
