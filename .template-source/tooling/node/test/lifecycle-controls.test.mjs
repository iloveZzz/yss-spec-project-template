import { loadOrchestrationContract } from '../../../../scripts/lib/orchestration-contract.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { loadRegistry, validateRegistry } = await import(path.join(root, 'scripts/lib/lifecycle-registry.mjs'));

test('current Spec retains four stage gates, conditional handoff and rejects cycles',()=>{
 const r=loadRegistry();assert.equal(r.stages.length,8);assert.equal(r.gates.length,4);assert.equal(r.checks.length,13);
 assert.deepEqual(r.gates.map(g=>g.id).sort(),['gate.plan-approved','gate.spec-baseline-approved','gate.implementation-admitted','gate.delivery-accepted'].sort());
 const orchestration=loadOrchestrationContract(ref=>readFileSync(path.join(root,ref)),'.template-spec/process/orchestration-contract.yaml').value;
 assert.equal(orchestration.work_unit_routes['work-unit.strategic-design-handoff'].applies_when,'unsupported-legacy-only');
 const cyclic=structuredClone(r);cyclic.checks[0].requires_checks=[cyclic.checks[1].id];cyclic.checks[1].requires_checks=[cyclic.checks[0].id];
 assert.throws(()=>validateRegistry(cyclic,{baseline:null}),/依赖循环/);
});
test('published lifecycle IDs migrate without changing retained semantics or accepting retired prose references',()=>{
 const registry=loadRegistry();
 assert.doesNotThrow(()=>validateRegistry(registry));
 for(const [oldId,newId] of [
  ['artifact.prototype-review','artifact.prototype-review-v2'],
  ['artifact.prototype-confirmation','artifact.prototype-confirmation-v2'],
  ['work-unit.intensity-aware-verification','work-unit.intensity-aware-verification-v2'],
  ['work-unit.intensity-aware-review','work-unit.intensity-aware-review-v2'],
 ]) {
  assert.ok(registry.id_policy.deprecated_ids.includes(oldId));
  assert.ok([...registry.artifacts,...registry.work_units].some(item=>item.id===newId));
 }
 const changed=structuredClone(registry);
 changed.work_units.find(item=>item.id==='work-unit.ssot-update').completion='changed';
 assert.throws(()=>validateRegistry(changed),/语义快照已变化/);
 const stale=structuredClone(registry);
 stale.artifacts.find(item=>item.id==='artifact.prototype-review-v2').trigger='命中 gate.prototype-reviewed。';
 assert.throws(()=>validateRegistry(stale,{baseline:null}),/不存在的引用/);
});
