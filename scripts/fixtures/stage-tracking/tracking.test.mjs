import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stringify } from '../../vendor/yaml.mjs';
import { assertStageTracking, assertTrackingTransition, parseYaml, binding, refreshTracking, sha256 } from '../../lib/stage-tracking.mjs';
import { planTracking, applyTracking, checkTracking } from '../../lib/stage-tracking-migration.mjs';
const repo = path.resolve(import.meta.dirname, '../../..');
const checkpointRef = 'docs/.scratch/demo/checkpoint.yaml';
function put(root, ref, value) { const p = path.join(root, ref); mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, typeof value === 'string' ? value : stringify(value)); }
function fixture({ design = false, enabled = false, platform = 'local-markdown' } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-stage-tracking-'));
  for (const ref of ['docs/process/schemas/stage-tracking.schema.json', 'docs/process/schemas/lifecycle-checkpoint.schema.json', 'docs/process/templates/lifecycle-checkpoint-template.yaml', 'docs/process/lifecycle-registry.yaml']) put(root, ref, readFileSync(path.join(repo, ref), 'utf8'));
  put(root, 'yss-project.yaml', { schema_version: 1, repository_mode: 'project-instance' });
  put(root, 'CONTEXT.md', '# 测试词汇');
  put(root, 'docs/agents/issue-tracker.md', `---\ntracker:\n  platform: ${platform}\n${enabled ? '  lifecycle_tracking_version: 1\n' : ''}---\n# Tracker\n`);
  if (design) put(root, 'docs/process/harness-profile.yaml', { profile_id: 'harness.business-ddd-strategy-handoff', allowed_work_units: ['work-unit.plan-requirements', 'work-unit.spec-synthesis', 'work-unit.prototype-design'] });
  put(root, 'docs/.scratch/demo/plan/input.md', '# 已确认的问题');
  return root;
}
const seed = (id = 'scope') => ({ id, title: '明确导入覆盖规则', stage: 'stage.plan', work_unit: 'work-unit.plan-requirements', owner: '需求负责人', scope: '明确重复数据如何处理', acceptance: ['覆盖规则有明确实例'], source_refs: ['docs/.scratch/demo/plan/input.md'] });
function start(opts = {}, items = [seed()]) {
  const root = fixture(opts), plan = planTracking(root, { checkpoint_ref: checkpointRef, items });
  applyTracking(root, plan); return { root, plan, checkpoint: parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8')) };
}
function complete(root, cp, id = 'scope') {
  const item = cp.stage_tracking.items.find(x => x.id === id);
  put(root, `docs/.scratch/demo/verification/${id}.md`, '规则已逐例验证');
  item.completion = item.acceptance.map(criterion => ({ criterion, evidence_refs: [binding(root, `docs/.scratch/demo/verification/${id}.md`)] })); item.progress = 'completed';
}
test('new Plan: unique parent, inline item, no slice; check and plan are read-only', () => {
  const root = fixture(); const plan = planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] });
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
  assert.equal(checkTracking(root, checkpointRef).status, 'missing-checkpoint');
  assert.equal(applyTracking(root, plan).status, 'applied');
  assert.equal(checkTracking(root, checkpointRef).status, 'valid');
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/parent-ticket.md')), true);
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/work-items')), false);
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/issues')), false);
  assert.equal(applyTracking(root, plan).status, 'unchanged');
  assert.equal(planTracking(root, plan.input).changes.length, 0);
});
test('Design entry uses checkpoint and never engineering parent', () => {
  const { root, checkpoint } = start({ design: true });
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/parent-ticket.md')), false);
  assert.equal(checkpoint.stage_tracking.entry.kind, 'checkpoint');
  checkpoint.stage_tracking.entry.kind = 'parent-ticket';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /design-parent-forbidden/);
});
test('existing Spec entry preserves approvals and records entry stage, not historical completion', () => {
  const root = fixture(); const cp = parseYaml(readFileSync(path.join(repo, 'docs/process/templates/lifecycle-checkpoint-template.yaml'), 'utf8'));
  cp.stage = 'stage.spec-architecture'; cp.human_review = { preserved: '原始批准引用' }; put(root, checkpointRef, cp);
  const item = { ...seed(), stage: cp.stage, work_unit: 'work-unit.spec-synthesis' };
  applyTracking(root, planTracking(root, { checkpoint_ref: checkpointRef, items: [item] }));
  const got = parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8'));
  assert.equal(got.stage_tracking.entry_stage, cp.stage); assert.deepEqual(got.human_review, cp.human_review);
  assert.equal(got.stage_tracking.items[0].progress, 'pending');
});
test('independent item has no duplicate progress; definition drift fails', () => {
  const item = { ...seed(), split_reasons: ['independent-acceptance'] };
  const { root, checkpoint } = start({}, [item]);
  const ref = checkpoint.stage_tracking.items[0].definition_ref;
  assert.ok(ref.endsWith('/work-items/scope.md')); assert.doesNotMatch(readFileSync(path.join(root, ref), 'utf8'), /^progress:|^Status:/m);
  put(root, ref, readFileSync(path.join(root, ref), 'utf8') + '\n篡改验收');
  assert.throws(() => assertStageTracking(checkpoint, { root }), /definition-drift/);
});
test('completion requires mapped, current evidence and frozen source digests', () => {
  const { root, checkpoint } = start(); checkpoint.stage_tracking.items[0].progress = 'completed';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /acceptance-evidence-required/);
  complete(root, checkpoint); assert.equal(assertStageTracking(checkpoint, { root }).status, 'valid');
  put(root, 'docs/.scratch/demo/verification/scope.md', '证据已改变');
  assert.throws(() => assertStageTracking(checkpoint, { root }), /stale-completion/);
});
test('refresh propagates only to dependents and retains previous evidence', () => {
  const { root, checkpoint } = start({}, [seed(), { ...seed('other'), source_refs: ['CONTEXT.md'] }, { ...seed('dependent'), dependencies: ['scope'] }]);
  complete(root, checkpoint); complete(root, checkpoint, 'other'); complete(root, checkpoint, 'dependent');
  const evidence = structuredClone(checkpoint.stage_tracking.items[0].completion);
  put(root, 'docs/.scratch/demo/plan/input.md', '规则变化');
  const next = refreshTracking(root, checkpoint);
  assert.deepEqual(next.stale_item_ids.sort(), ['dependent', 'scope']);
  assert.equal(next.checkpoint.stage_tracking.items[1].progress, 'completed');
  assert.deepEqual(next.checkpoint.stage_tracking.items[0].completion, evidence);
  assert.equal(next.checkpoint.stage_tracking.items[0].progress, 'pending');
});
test('blocked dependency prevents start; unrelated work remains valid', () => {
  const { root, checkpoint } = start({}, [seed(), { ...seed('other'), dependencies: ['scope'] }]);
  checkpoint.stage_tracking.items[1].progress = 'running';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /dependency-blocked/);
  checkpoint.stage_tracking.items[1].progress = 'pending'; checkpoint.stage_tracking.items[0].progress = 'running';
  assert.equal(assertStageTracking(checkpoint, { root }).status, 'valid');
  checkpoint.stage_tracking.items[0].dependencies = ['other'];
  assert.throws(() => assertStageTracking(checkpoint, { root }), /dependency-cycle/);
});
test('missing items block migration instead of inventing owner or acceptance', () => {
  const root = fixture(); const p = planTracking(root, { checkpoint_ref: checkpointRef });
  assert.ok(p.gaps.length); assert.throws(() => applyTracking(root, p), /needs-info/);
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
});
test('legacy project accepted; enabled missing checkpoint ref rejected at transition', () => {
  const root = fixture(); assert.equal(assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', {}, { root }).status, 'not-applicable');
  const enabled = fixture({ enabled: true });
  assert.throws(() => assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', {}, { root: enabled }), /checkpoint-ref-required/);
  assert.throws(() => assertStageTracking({ stage: 'stage.plan' }, { root: enabled }), /stage-tracking-required/);
});
test('transition requires current unit closure and persisted state', () => {
  const { root, checkpoint } = start();
  assert.throws(() => assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', { checkpoint_ref: checkpointRef }, { root }), /current-work-incomplete/);
  complete(root, checkpoint); put(root, checkpointRef, checkpoint);
  assert.equal(assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', { checkpoint_ref: checkpointRef }, { root }).status, 'valid');
});
test('stage item cannot receive implementation readiness', () => {
  const { root, checkpoint } = start(); checkpoint.stage_tracking.items[0].progress = 'ready-for-agent';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /not one of/);
  checkpoint.stage_tracking.items[0].progress = 'pending'; checkpoint.stage_tracking.items[0].kind = 'vertical-slice-ticket';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /stage-work-item/);
});
test('migration rejects source drift and altered plan; failed writes roll back', () => {
  const root = fixture(), p = planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] });
  put(root, 'CONTEXT.md', '并发改变'); assert.throws(() => applyTracking(root, p), /plan-stale/);
  const newer = planTracking(root, p.input); newer.changes[0].after += '篡改'; assert.throws(() => applyTracking(root, newer), /digest-mismatch/);
  const next = planTracking(root, p.input), before = readFileSync(path.join(root, 'docs/agents/issue-tracker.md'), 'utf8');
  assert.throws(() => applyTracking(root, next, { afterWrite: (_, count) => { if (count === 2) throw new Error('injected-write-failure'); } }), /rollback-complete/);
  assert.equal(readFileSync(path.join(root, 'docs/agents/issue-tracker.md'), 'utf8'), before);
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
});
test('migration protects symlink paths and profile boundaries', () => {
  const root = fixture(); mkdirSync(path.join(root, 'docs/.scratch/demo/work-items'));
  symlinkSync(path.join(root, 'CONTEXT.md'), path.join(root, 'docs/.scratch/demo/work-items/scope.md'));
  assert.throws(() => planTracking(root, { checkpoint_ref: checkpointRef, items: [{ ...seed(), split_reasons: ['different-owner'] }] }), /symlink/);
});
test('remote tracker stays pending; local requires no remote issue', () => {
  const { root } = start({ platform: 'github' });
  assert.match(readFileSync(path.join(root, 'docs/.scratch/demo/parent-ticket.md'), 'utf8'), /publication: pending\npending_publication_to: github/);
});
test('CLI check/plan/apply roundtrip and meaningful exit codes', () => {
  const root = fixture(), items = path.join(root, 'items.yaml'), planFile = path.join(root, 'plan.json'); put(root, 'items.yaml', [seed()]);
  const run = (...args) => spawnSync(process.execPath, [path.join(repo, 'scripts/stage-tracking'), ...args, '--root', root], { encoding: 'utf8' });
  const p = run('plan', '--checkpoint', checkpointRef, '--items', items); assert.equal(p.status, 0, p.stderr); writeFileSync(planFile, p.stdout);
  const applied = run('apply', '--plan', planFile); assert.equal(applied.status, 0, applied.stderr);
  const checked = run('check', '--checkpoint', checkpointRef); assert.equal(checked.status, 0, checked.stderr);
  assert.equal(run('apply', '--plan', planFile).status, 0);
  assert.equal(run('apply', '--plan', planFile, '--refresh').status, 1);
});

test('deferral needs independent record and remains non-completed', () => {
  const root = fixture(); put(root, 'docs/.scratch/demo/gates/deferral.md', '测试决定引用；不替代阶段批准');
  const item = { ...seed(), deferred: { owner: '负责人', resolve_by: '2099-01-01T00:00:00Z', receiver: '需求接收方', verification_plan: '复验边界', risk: '后续范围不确定', follow_up_ref: 'follow-up-1', decision_ref: 'docs/.scratch/demo/gates/deferral.md' } };
  applyTracking(root, planTracking(root, { checkpoint_ref: checkpointRef, items: [item] }));
  const cp = parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8'));
  assert.ok(cp.stage_tracking.items[0].definition_ref);
  assert.equal(assertStageTracking(cp, { root, currentWorkUnit: 'work-unit.plan-requirements', nextWorkUnit: 'work-unit.spec-synthesis', transition: true }).status, 'valid');
  cp.stage_tracking.items[0].progress = 'completed'; assert.throws(() => assertStageTracking(cp, { root }), /deferred-not-completed/);
  cp.stage_tracking.items[0].progress = 'pending'; cp.stage_tracking.items[0].deferred.resolve_by = '2000-01-01T00:00:00Z'; assert.throws(() => assertStageTracking(cp, { root }), /deferral-expired/);
});
test('public transition entry cannot bypass tracking with a claimed WER', async () => {
  const { validateNextRoute } = await import('../../lib/lifecycle-transition.mjs');
  const root = fixture({ enabled: true });
  const result = validateNextRoute('work-unit.plan-requirements', 'work-unit.spec-synthesis', { result: 'completed' }, { root });
  assert.equal(result.result, 'blocked'); assert.ok(result.blocking_signals.includes('stage-tracking-blocked'));
});
test('dispatch rejects missing registration and permits independent pending work', async () => {
  const { assertTrackingEntry } = await import('../../lib/stage-tracking.mjs');
  const root = fixture({ enabled: true });
  assert.throws(() => assertTrackingEntry('work-unit.plan-requirements', {}, { root }), /entry-checkpoint-required/);
  const active = start();
  assert.doesNotThrow(() => assertTrackingEntry('work-unit.plan-requirements', { checkpoint_ref: checkpointRef }, { root: active.root }));
  assert.throws(() => assertTrackingEntry('work-unit.prototype-design', { checkpoint_ref: checkpointRef }, { root: active.root }), /entry-work-item-required/);
});
test('checkpoint schema embeds the canonical stage tracking schema exactly', () => {
  assert.deepEqual(JSON.parse(readFileSync(path.join(repo, 'docs/process/schemas/lifecycle-checkpoint.schema.json'))).properties.stage_tracking, JSON.parse(readFileSync(path.join(repo, 'docs/process/schemas/stage-tracking.schema.json'))));
});

test('source changes during apply are detected and preserved while own writes roll back', () => {
  const root = fixture(), p = planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] });
  assert.throws(() => applyTracking(root, p, { afterWrite: (_, count) => { if (count === 1) put(root, 'docs/.scratch/demo/plan/input.md', '并发更新的业务规则'); } }), /concurrent-change.*rollback-complete/);
  assert.equal(readFileSync(path.join(root, 'docs/.scratch/demo/plan/input.md'), 'utf8'), '并发更新的业务规则');
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
});

test('migration preserves existing stable feature IDs independently of folder slugs', () => {
  const root = fixture(), cp = parseYaml(readFileSync(path.join(repo, 'docs/process/templates/lifecycle-checkpoint-template.yaml'), 'utf8'));
  cp.feature_id = 'feature.demo'; cp.stage = 'stage.plan'; put(root, checkpointRef, cp);
  applyTracking(root, planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] }));
  const saved = parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8'));
  assert.equal(saved.feature_id, 'feature.demo'); assert.equal(saved.stage_tracking.feature_id, 'feature.demo');
  assert.equal(checkTracking(root, checkpointRef).status, 'valid');
});
test('a quoted stage-work-item moved under issues still cannot become an implementation ticket', async () => {
  const { validateTicketFormalization } = await import('../../lib/lifecycle-transition.mjs');
  const root = fixture(), slice = 'docs/.scratch/demo/issues/01-fake.md', resultRef = 'docs/.scratch/demo/verification/decomposition.yaml';
  put(root, slice, '---\nkind: "stage-work-item"\n---\n# 设计工作\n');
  put(root, resultRef, { result_schema: 'workflow-execution-result-v1', work_unit: 'work-unit.ticket-decomposition', result: 'completed', evidence_refs: [resultRef] });
  const state = { tracker_kind: 'local-markdown', ticket_decomposition_result_ref: resultRef, ticket_decomposition_result: { result: 'completed', evidence_refs: [resultRef] }, vertical_slice_ticket_ref: slice, vertical_slice_ticket_role: 'ready-for-agent', vertical_slice_ticket_kind: 'vertical-slice-ticket', vertical_slice_ticket: { ref: slice, role: 'ready-for-agent', kind: 'vertical-slice-ticket' }, slice_contract: { ticket_ref: slice, status: 'approved', persisted: true, current_version: true } };
  const result = validateTicketFormalization(state, { exists: ref => existsSync(path.join(root, ref)), read: ref => readFileSync(path.join(root, ref), 'utf8') });
  assert.ok(result.blocking_signals.includes('stage-work-item-not-implementable'));
});


test('manual checkpoint edits cannot bypass required owner splitting', () => {
  const { root, checkpoint } = start({}, [seed(), seed('second')]);
  checkpoint.stage_tracking.items[1].owner = '另一位负责人';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /independent-item-required/);
});
