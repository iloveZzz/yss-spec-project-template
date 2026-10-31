// Spec 分发不再强制数字人多角色会签，但门禁批准记录、真实用户决定和条件独立复核仍是当前合同。
// 本测试同时防止“会签措辞回流”和“删除会签时误删批准证据”两类回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { shipped } from '../scripts/lib/profile-distribution.mjs';
import { parse } from '../scripts/vendor/yaml.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = ref => fs.readFileSync(path.join(ROOT, ref), 'utf8');
const SPEC_MANIFEST = JSON.parse(read('.template-source/distribution/bundle-profile.json')).manifest;
const APPROVAL_SCHEMA = JSON.parse(read('.template-spec/process/schemas/approval-record.schema.json'));

function trackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split('\0').filter(Boolean);
}

/** 根仓 + _specialist 覆盖后的 Spec 有效文件；同一个 ref 后写入的覆盖根仓。 */
function effectiveSpecFiles() {
  const files = new Map();
  for (const file of trackedFiles()) {
    if (file.startsWith('profiles/')) continue;
    files.set(file, file);
  }
  for (const file of trackedFiles()) {
    if (!file.startsWith('profiles/_specialist/')) continue;
    files.set(file.slice('profiles/_specialist/'.length), file);
  }
  return [...files.entries()].map(([ref, file]) => ({ ref, file }));
}

const DOC = /\.(md|ya?ml)$/i;
const HISTORICAL_OR_FIXTURE = /(^|\/)(tests?|fixtures|examples)\//;
const inSpecGuidance = ({ ref, file }) => DOC.test(ref)
  && (ref.startsWith('.template-spec/') || ref.startsWith('.agents/skills/'))
  && shipped(ref, SPEC_MANIFEST)
  && !HISTORICAL_OR_FIXTURE.test(file);

function guidanceFiles() {
  return effectiveSpecFiles()
    .filter(entry => fs.existsSync(path.join(ROOT, entry.file)))
    .filter(inSpecGuidance)
    .map(entry => ({ ...entry, text: read(entry.file) }));
}

function byRef(files, ref) {
  const found = files.find(entry => entry.ref === ref);
  assert.ok(found, `Spec 有效分发中缺少 ${ref}`);
  return found;
}

// 唯一允许保留角色文件路径的地方：说明旧强约束如何退休的历史映射。
const LEGACY_PATH_ALLOW = new Map([
  ['.template-spec/process/orchestration-policy-consumers.md', '旧强约束退休映射：说明旧读取器如何只读保留历史角色文件'],
]);
const MANDATORY_COUNTERSIGN = /会签人|会签角色|双数字人会签|(?<!历史)数字人会签|需要会签|须会签|应当会签/;

test('Spec 分发不再要求数字人多角色会签，且不引用未分发的历史角色表', () => {
  const files = guidanceFiles();
  const violations = [];
  for (const { ref, text } of files) {
    if (text.includes('digital-human-roles.yaml') && !LEGACY_PATH_ALLOW.has(ref)) {
      violations.push(`${ref}: 当前分发文档引用未分发的历史角色表`);
    }
    if (MANDATORY_COUNTERSIGN.test(text)) {
      violations.push(`${ref}: 仍包含当前强制会签措辞`);
    }
    if (text.includes('#4-进度与会签提示')) {
      violations.push(`${ref}: 仍引用旧写作锚点`);
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
  assert.equal(shipped('.template-spec/agents/digital-human-roles.yaml', SPEC_MANIFEST), false, '历史角色表不应进入 Spec 分发');
  for (const ref of LEGACY_PATH_ALLOW.keys()) assert.ok(files.some(entry => entry.ref === ref), `历史说明文件必须存在: ${ref}`);
});

test('Spec 模板、术语和写作锚点使用当前批准语义', () => {
  const files = guidanceFiles();
  const localParent = byRef(files, '.template-spec/templates/local-parent-ticket-template.md');
  assert.match(localParent.text, /## 批准记录/);
  assert.doesNotMatch(localParent.text, /## 会签|会签角色/);
  const verticalSlice = byRef(files, '.template-spec/templates/vertical-slice-ticket-template.md');
  assert.match(verticalSlice.text, /## 批准记录/);
  assert.doesNotMatch(verticalSlice.text, /## 会签|会签角色/);

  const triage = byRef(files, '.template-spec/agents/triage-labels.md');
  assert.match(triage.text, /当前政策要求的批准或审查/);
  assert.doesNotMatch(triage.text, /digital-human-roles\.yaml/);

  const glossary = byRef(files, '.template-spec/process/process-glossary.md');
  assert.match(glossary.text, /\| 生命周期批准记录 \|/);
  assert.match(glossary.text, /\| 历史数字人会签（只读） \|/);
  assert.doesNotMatch(glossary.text, /需要会签（指定数字人或生物人）/);

  const writing = byRef(files, '.template-spec/process/document-writing.md');
  assert.match(writing.text, /^## 4\. 进度与批准提示$/m);
  const execution = read('.template-spec/process/orchestration/entry/execution.yaml');
  assert.match(execution, /writing_reference: \.template-spec\/process\/document-writing\.md#4-进度与批准提示/);
  assert.doesNotMatch(execution, /#4-进度与会签提示/);
  const backendExecution = read('profiles/backend/.template-spec/process/orchestration/entry/execution.yaml');
  assert.match(backendExecution, /document-writing\.md#4-进度与批准提示/);
  assert.doesNotMatch(backendExecution, /#4-进度与会签提示/);
});

test('用户决定政策指向当前编排政策，而不是历史角色表', () => {
  for (const ref of [
    '.template-spec/process/orchestration/core/results.yaml',
    '.template-spec/process/orchestration/entry/execution.yaml',
  ]) {
    const text = read(ref);
    assert.match(text, /\.template-spec\/process\/orchestration\/domain\/review\.yaml#user_decision_policy/, ref);
    assert.doesNotMatch(text, /digital-human-roles\.yaml#user_decision_policy/, ref);
  }
});

test('移除会签措辞不削弱门禁批准记录和当前审批合同', () => {
  const registry = parse(read('.template-spec/process/lifecycle-registry.yaml'));
  for (const gateId of ['gate.plan-approved', 'gate.spec-baseline-approved']) {
    const gate = registry.gates.find(row => row.id === gateId);
    assert.ok(gate, gateId);
    assert.ok(gate.evidence.includes('evidence.approval-record'), `${gateId} 仍必须要求批准记录`);
  }
  const approval3 = APPROVAL_SCHEMA.oneOf.find(branch => branch.properties?.schema_version?.const === 3);
  assert.ok(approval3, '当前 approval3 合同必须存在');
  assert.deepEqual(approval3.properties.actor_kind.enum, ['agent', 'human']);
  for (const field of ['subject_ref', 'subject_digest', 'approval_scope', 'basis', 'check_ids', 'policy', 'review']) {
    assert.ok(approval3.required.includes(field), `approval3 仍要求 ${field}`);
  }
  assert.equal(approval3.properties.role_id, undefined);
  assert.equal(approval3.properties.countersigner_role_ids, undefined);
  assert.equal(fs.existsSync(path.join(ROOT, '.template-spec/agents/digital-human-roles.yaml')), true, '历史角色表仍保留给旧实例只读核验');
});

test('当前业务票正式化路径不再无条件读取历史角色表', () => {
  assert.doesNotMatch(read('scripts/lib/business-ticket-lifecycle.mjs'), /digital-human-roles\.yaml/);
});
