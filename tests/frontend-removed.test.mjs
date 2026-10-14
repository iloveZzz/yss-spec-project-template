import {loadOrchestrationContract} from '../scripts/lib/orchestration-contract.mjs';
// AR-12c：前端整线已移除。这些断言防止被删除的 Profile、入口与稳定 ID 悄悄回流；全部是只读的文件与注册表检查，亚秒级。
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {parse} from '../scripts/vendor/yaml.mjs';
import {PROFILE_NAMES} from '../scripts/lib/profile-tree.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (ref) => readFileSync(path.join(root, ref), 'utf8');

test('前端 Profile 与前端移交验证入口已删除', () => {
  for (const ref of ['profiles/frontend', 'scripts/verify-frontend-delivery', 'scripts/verify-frontend-strategic-preflight', 'scripts/verify-frontend-implementation-evidence',
    'scripts/lib/frontend-delivery.mjs', 'scripts/lib/frontend-delivery-boundary.mjs', 'scripts/fixtures/frontend-delivery']) assert.equal(existsSync(path.join(root, ref)), false, `${ref} 不应存在`);
  assert.deepEqual(PROFILE_NAMES, ['design', 'backend']);
});

test('前端生命周期稳定 ID 已弃用且不再定义', () => {
  const registry = parse(read('.template-spec/process/lifecycle-registry.yaml'));
  const removed = ['evidence.frontend-implementation-verification', 'artifact.frontend-implementation-plan', 'artifact.frontend-implementation-verification',
    'work-unit.frontend-implementation-verification', 'check.frontend-delivery-inputs-verified', 'check.frontend-implementation-verified'];
  const active = new Set(['stages', 'gates', 'checks', 'artifacts', 'work_units', 'evidence'].flatMap((key) => (registry[key] ?? []).map((row) => row.id)));
  for (const id of removed) {
    assert.ok(registry.id_policy.deprecated_ids.includes(id), `${id} 必须在 deprecated_ids`);
    assert.equal(active.has(id), false, `${id} 不应再被定义`);
  }
});

test('推进目标不再支持 frontend-accepted', () => {
  const schema = JSON.parse(read('.template-spec/process/schemas/progression-target.schema.json'));
  assert.equal(schema.properties.target.enum.includes('frontend-accepted'), false);
  const contract = loadOrchestrationContract(read, '.template-spec/process/orchestration-contract.yaml').value;
  assert.equal('frontend-accepted' in contract.progression_target.completion_policy, false);
});

test('Compiler 合同不再声明前端交付绑定', () => {
  for (const ref of ['.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml', 'profiles/backend/.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml']) {
    const doc = parse(read(ref));
    assert.equal('frontend_delivery' in (doc.slice_contract_basis ?? doc), false, ref);
    assert.equal('frontend_delivery_readiness' in doc, false, ref);
  }
});

test('分发验证脚本与旧试点不再依赖前端实例', () => {
  assert.equal(existsSync(path.join(root, '.template-source/scripts/run-lifecycle-cross-repo-pilot')), false);
  for (const ref of ['.template-source/scripts/verify-delivery-harness-distribution.mjs', '.template-source/scripts/verify-strategic-handoff-distribution.mjs']) {
    const text = read(ref);
    assert.doesNotMatch(text, /frontend-delivery-boundary|verify-frontend-delivery-scenarios|enforceFrontendDelivery/, ref);
  }
});
