import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { projectEntry } from '../../../plugins/yss-backend-delivery/entry.mjs';
import { runProjectCommand } from '../../../plugins/yss-backend-delivery/native-project.mjs';

test('project-entry 仅透传未核验 PR 定位', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'pr-entry-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const input = path.join(target, 'input.json');
  mkdirSync(path.join(target, 'scripts'));
  writeFileSync(path.join(target, 'scripts/query-lifecycle-context'), 'fixture');
  const pull_request_ref = {
    url: 'https://github.com/example/repo/pull/1',
    head_sha: 'a'.repeat(40), paths: ['docs/spec.md']
  };
  writeFileSync(input, JSON.stringify({ pull_request_ref }));
  const result = projectEntry(target, { mode: 'reuse', input },
    { binding: true, ready_for_agent: false }, () => JSON.stringify({}));
  assert.deepEqual(result.pull_request_ref, pull_request_ref);
  assert.equal(result.source_verification_required, true);
  assert.equal(result.stage_verification_required, true);
  assert.equal(result.execution_started, false);
  assert.equal(result.ready_for_agent, false);
  assert.deepEqual(readdirSync(target).sort(), ['input.json', 'scripts']);
});

test('拒绝非法或含糊 PR 定位且不写项目', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'pr-entry-invalid-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const input = path.join(target, 'input.json');
  mkdirSync(path.join(target, 'scripts'));
  writeFileSync(path.join(target, 'scripts/query-lifecycle-context'), 'fixture');
  const valid = { url: 'https://gitlab.example.com/group/sub/project/-/merge_requests/42', head_sha: 'b'.repeat(40), paths: ['spec.md'] };
  const bad = [
    { ...valid, url: 'http://gitlab.example.com/a/b/-/merge_requests/1' },
    { ...valid, url: 'https://user:password@gitlab.example.com/a/b/-/merge_requests/1' },
    { ...valid, url: 'https://github.com/example/repo/issues/1' },
    { ...valid, head_sha: '' }, { ...valid, head_sha: 'x'.repeat(40) },
    { ...valid, paths: [] }, { ...valid, paths: ['a', 'a'] },
    { ...valid, paths: ['/abs'] }, { ...valid, paths: ['C:/windows'] },
    { ...valid, paths: ['a/../b'] }, { ...valid, paths: ['./a'] }, { ...valid, paths: ['a/'] },
    { ...valid, paths: ['a\\b'] }, { ...valid, paths: ['a\0b'] },
    { ...valid, verified: true }
  ];
  for (const ref of bad) {
    writeFileSync(input, JSON.stringify({ pull_request_ref: ref }));
    assert.throws(() => projectEntry(target, { mode: 'reuse', input }, { binding: true }, () => '{}'), JSON.stringify(ref));
    assert.deepEqual(readdirSync(target).sort(), ['input.json', 'scripts']);
  }
  writeFileSync(input, JSON.stringify({ pull_request_ref: valid, import_receipt_ref: 'receipt.json' }));
  assert.throws(() => projectEntry(target, { mode: 'reuse', input }, { binding: true }, () => '{}'));
  writeFileSync(input, JSON.stringify({ pull_request_ref: valid }));
  assert.throws(() => projectEntry(target, { mode: 'new', input }, { binding: true }, () => '{}'));
  assert.throws(() => projectEntry(target, { mode: 'resume', input }, { binding: true }, () => '{}'));
  assert.deepEqual(readdirSync(target).sort(), ['input.json', 'scripts']);
});

test('接受 GitLab 嵌套项目及完整 SHA-256 定位', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'mr-entry-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const input = path.join(target, 'input.json');
  mkdirSync(path.join(target, 'scripts'));
  writeFileSync(path.join(target, 'scripts/query-lifecycle-context'), 'fixture');
  const pull_request_ref = { url: 'https://gitlab.example.com/group/sub/project/-/merge_requests/42', head_sha: 'b'.repeat(64), paths: ['设计/规格.md'] };
  writeFileSync(input, JSON.stringify({ pull_request_ref }));
  const result = projectEntry(target, { mode: 'reuse', input }, { binding: true }, () => '{}');
  assert.deepEqual(result.pull_request_ref, pull_request_ref);
  assert.equal(result.ready_for_agent, false);
  assert.equal(result.source_verification_required, true);
});

test('旧战略 Receipt 不再作为接收凭据且不读取或改写原件', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'old-receipt-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const input = path.join(target, 'input.json');
  const receipt = path.join(target, 'receipt.json');
  writeFileSync(receipt, '{"historic":"keep"}');
  writeFileSync(input, JSON.stringify({ import_receipt_ref: 'receipt.json' }));
  assert.throws(() => projectEntry(target, { mode: 'reuse', input }, { binding: true }, () => '{}'), /legacy-strategic-handoff-unsupported/);
  assert.deepEqual(readdirSync(target).sort(), ['input.json', 'receipt.json']);
});

test('旧战略导入入口明确停止支持', async () => {
  await assert.rejects(() => runProjectCommand('.', 'project-import-design', {}), /legacy-strategic-handoff-unsupported/);
});

test('已交付项目不吞掉新 PR 输入，并校验 resume 的 checkpoint', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'delivered-pr-entry-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const input = path.join(target, 'input.json');
  mkdirSync(path.join(target, 'scripts'));
  writeFileSync(path.join(target, 'scripts/complete-backend-delivery'), 'fixture');
  writeFileSync(path.join(target, '.yss-backend-delivery.json'), '{}');
  writeFileSync(input, JSON.stringify({ pull_request_ref: { url: 'https://github.com/a/b/pull/1', head_sha: 'a'.repeat(40), paths: ['spec.md'] } }));
  assert.throws(() => projectEntry(target, { mode: 'reuse', input }, { binding: true }, () => '{}'), /project-already-delivered-new-input/);
  assert.throws(() => projectEntry(target, { mode: 'resume', input }, { binding: true }, () => '{}'), /checkpoint-required/);
});

test('PR URL 不接受可能携带凭据的 query 和 fragment', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'pr-url-secret-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const input = path.join(target, 'input.json');
  mkdirSync(path.join(target, 'scripts'));
  writeFileSync(path.join(target, 'scripts/query-lifecycle-context'), 'fixture');
  for (const suffix of ['#access_token=secret', '?auth=secret', '?X-Amz-Signature=secret']) {
    writeFileSync(input, JSON.stringify({ pull_request_ref: { url: `https://github.com/a/b/pull/1${suffix}`, head_sha: 'a'.repeat(40), paths: ['spec.md'] } }));
    assert.throws(() => projectEntry(target, { mode: 'reuse', input }, { binding: true }, () => '{}'), /invalid-pull-request-ref/);
  }
});

test('Backend 接收 PR 时直接交给本地后端主控核验', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'backend-pr-entry-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const input = path.join(target, 'input.json');
  const pull_request_ref = { url: 'https://github.com/example/repo/pull/42', head_sha: 'a'.repeat(40), paths: ['docs/spec.md'] };
  writeFileSync(input, JSON.stringify({ pull_request_ref }));
  const result = projectEntry(target, { mode: 'reuse', input }, { binding: true, profile: 'backend' }, () => assert.fail('不得假装完成在线查询'));
  assert.deepEqual(result.pull_request_ref, pull_request_ref);
  assert.equal(result.next_work_unit, 'work-unit.harness-entry');
  assert.equal(result.workflow_reference.skill, 'harness-orchestrator');
  assert.equal(result.source_verification_required, true);
  assert.equal(result.ready_for_agent, false);
});
