import { loadOrchestrationContract } from '../../../../scripts/lib/orchestration-contract.mjs';
import {makeRoot} from '../../../../tests/helpers/yss-instance.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { assertGateChecks } = await import(path.join(root, 'scripts/lib/lifecycle-controls.mjs'));
const { loadRegistry, validateRegistry } = await import(path.join(root, 'scripts/lib/lifecycle-registry.mjs'));
const { validateApprovalRecord, assertCheckpointApprovals, assertCheckpointUserDecisions } = await import(path.join(root, 'scripts/lib/native-approval.mjs'));
const { loadDigitalHumanRoles } = await import(path.join(root, 'scripts/lib/digital-human-roles.mjs'));
const { parseDocument } = await import(path.join(root, 'scripts/vendor/yaml.mjs'));

function fixture(run) {
 const dir = makeRoot('yss-gate-checks-');
 try {
  const save = (ref, data) => writeFileSync(path.join(dir,ref), typeof data === 'string' ? data : JSON.stringify(data));
  const asset = ref => ({ref,digest:createHash('sha256').update(readFileSync(path.join(dir,ref))).digest('hex')});
  save('evidence.txt','actual verification evidence');
  const basis=[asset('evidence.txt')];
  const gateId='gate.slice-contract-approved',checkId='check.repository-identity-valid';
  const registry={gates:[{id:gateId,requires_checks:[checkId],evidence:['evidence.contract-approval']}],checks:[{id:checkId,evidence:['evidence.repository-identity-check']}]};
  const fullRegistry=loadRegistry(path.join(dir,".template-spec/process/lifecycle-registry.yaml"));fullRegistry.gates=fullRegistry.gates.map(row=>row.id===gateId?{...row,...registry.gates[0]}:row);fullRegistry.checks=fullRegistry.checks.map(row=>row.id===checkId?{...row,...registry.checks[0]}:row);save('.template-spec/process/lifecycle-registry.yaml',fullRegistry);
  const state={schema_version:1,repository_mode:'project-instance',mode:'audit',status:'routing',stage:'stage.system-data-engineering',artifacts:{},context_reconciliation:{status:'pending',ref:null,evidence_refs:[]},next_work_unit:null,ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[],gates:{[gateId]:{status:'approved',reason:'Synthetic current gate',evidence_refs:['evidence.txt'],basis:structuredClone(basis),evidence:{'evidence.contract-approval':['evidence.txt']}}},checks:{[checkId]:{status:'passed',applicable:true,basis:structuredClone(basis),evidence:{'evidence.repository-identity-check':['evidence.txt']}}}};
  const persistRegistry=()=>{const current=structuredClone(fullRegistry);for(const gate of registry.gates){current.gates=current.gates.map(row=>row.id===gate.id?{...row,...gate}:row);}for(const check of registry.checks){current.checks=current.checks.map(row=>row.id===check.id?{...row,...check}:row);}save('.template-spec/process/lifecycle-registry.yaml',current);};const verify=()=>{persistRegistry();return assertGateChecks(gateId,state,{root:dir,registry});};
  run({dir,save,asset,gateId,checkId,state,registry,verify,persistRegistry});
 } finally {rmSync(dir,{recursive:true,force:true});}
}
test('current Spec retains four stage gates, conditional handoff and rejects cycles',()=>{
 const r=loadRegistry();assert.equal(r.stages.length,8);assert.equal(r.gates.length,4);assert.equal(r.checks.length,13);
 assert.deepEqual(r.gates.map(g=>g.id).sort(),['gate.plan-approved','gate.spec-baseline-approved','gate.implementation-admitted','gate.delivery-accepted'].sort());
 const orchestration=loadOrchestrationContract(ref=>readFileSync(path.join(root,ref)),'.template-spec/process/orchestration-contract.yaml').value;
 assert.equal(orchestration.work_unit_routes['work-unit.strategic-design-handoff'].applies_when,'explicit-user-package-request');
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
test('automatic evidence passes without another human approval, missing and failed checks block',()=>fixture(f=>{
 assert.equal(f.verify().result,'passed');
 for(const status of ['pending','failed','stale','not-applicable']){f.state.checks[f.checkId].status=status;assert.throws(f.verify,/GATE_CHECK_BLOCKED: 当前检查未通过|GATE_APPLICABILITY: 不适用检查缺少评估原因/);}
 delete f.state.checks[f.checkId];assert.throws(f.verify,/EVIDENCE_REQUIRED: 缺少当前依据/);
}));
test('gate and internal check reject extra current target intent as factual evidence',()=>fixture(f=>{
 assert.equal(f.verify().result,'passed');
 for(const ref of ['progression-target.json','nested/PROGRESSION-TARGET.JSON']) {
  mkdirSync(path.dirname(path.join(f.dir,ref)),{recursive:true});
  f.save(ref,{schema_version:1,kind:'lifecycle-progression-target',target:'business-accepted'});
  const basis=structuredClone(f.state.gates[f.gateId].basis);
  f.state.gates[f.gateId].basis=[...basis,f.asset(ref)];
  assert.throws(f.verify,/PROGRESSION_EVIDENCE:/);
  f.state.checks[f.checkId].basis=[...basis,f.asset(ref)];
  assert.throws(f.verify,/PROGRESSION_EVIDENCE:/);
  f.state.gates[f.gateId].basis=basis;f.state.checks[f.checkId].basis=structuredClone(basis);
 }
}));
test('N/A requires explicit applicability, explanation and current evidence',()=>fixture(f=>{
 Object.assign(f.state.checks[f.checkId],{status:'not-applicable',applicable:false,reason:'no affected delivery'});
 assert.equal(f.verify().result,'passed');delete f.state.checks[f.checkId].reason;assert.throws(f.verify,/GATE_APPLICABILITY:/);
}));
test('evidence drift and aggregate omissions cannot reuse approval',()=>fixture(f=>{
 f.save('evidence.txt','changed');assert.throws(f.verify,/EVIDENCE_DRIFT: 依据过期: evidence.txt/);
 f.state.checks[f.checkId].basis=[f.asset('evidence.txt')];assert.throws(f.verify,/EVIDENCE_DRIFT: 依据过期: evidence.txt/);
}));
test('a bare passed flag and unbound evidence cannot close a check',()=>fixture(f=>{
 delete f.state.checks[f.checkId].evidence;assert.throws(f.verify,/缺少绑定证据/);
}));
test('retired approvals remain readable but cannot approve new gates',t=>{
 const dir=makeRoot('retired-approval-history-');t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const record={schema_version:1,gate_id:'gate.release-ready',decision:'approved',actor_kind:'biological-human',role_id:'role.biological-human',runtime_id:'runtime.generic',principal_ref:'test-only.person'};
 assert.equal(validateApprovalRecord(record,{root:dir,history:true}).execution_authorization,'not-evaluated');assert.throws(()=>validateApprovalRecord(record,{root:dir,requireApproved:true}),/不是会签门禁|已退役/);
 assert.throws(()=>assertCheckpointApprovals({gates:{'gate.release-ready':{status:'pending'}}},undefined,{root:dir}),/已退役/);
});
test('delivery acceptance does not require a release decision; runtime actions still require human authorization',t=>{
 const dir=makeRoot('delivery-decision-policy-','backend');t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const roles=loadDigitalHumanRoles();assert.equal(roles.gate_policy.runtime_side_effect_approval,'biological-human');
 assert.ok(!roles.user_decision_policy.gates.includes('gate.delivery-accepted'));
 assert.doesNotThrow(()=>assertCheckpointUserDecisions({repository_mode:'project-instance',status:'completed',gates:{'gate.delivery-accepted':{status:'approved'}}},{root:dir}));
 assert.throws(()=>assertCheckpointUserDecisions({repository_mode:'project-instance',status:'completed',gates:{}},{root:dir}),/当前交付|交付验收/);
 assert.throws(()=>assertCheckpointUserDecisions({repository_mode:'project-instance',status:'completed',gates:{'gate.delivery-accepted':{status:'approved'},'gate.spec-baseline-approved':{status:'stale'}}},{root:dir}),/未通过门禁/);
});

test('professional checks require current subject, matching scope and an independent reviewer',()=>fixture(f=>{
 const id='check.engineering-baseline-accepted';
 f.registry.checks=[{id,evidence:['evidence.fresh-verification']}];f.registry.gates[0].requires_checks=[id];
 f.save('subject.md','current implementation');
 const record={schema_version:1,gate_id:id,decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'synthetic.qa',drafter_principal_ref:'synthetic.frontend',subject_ref:'subject.md',subject_digest:f.asset('subject.md').digest,approval_scope:['slice.demo'],basis:[f.asset('evidence.txt')]};
 const refresh=()=>{f.save('review.json',record);const basis=['evidence.txt','subject.md','review.json'].map(f.asset);f.state.checks={[id]:{status:'approved',applicable:true,basis,subject_ref:'subject.md',approval_ref:'review.json',approval_scope:['slice.demo'],drafter_principal_ref:'synthetic.frontend',evidence:{'evidence.fresh-verification':['evidence.txt']}}};f.state.gates[f.gateId].basis=structuredClone(basis);};
 refresh();assert.equal(f.verify().result,'passed');
 record.drafter_principal_ref=record.principal_ref;refresh();assert.throws(f.verify,/APPROVAL_CURRENT_INVALID: 独立作者\/实施者\/审查身份不匹配/);
 record.drafter_principal_ref='synthetic.frontend';record.subject_digest='0'.repeat(64);refresh();assert.throws(f.verify,/APPROVAL_CURRENT_INVALID:.*主体.*摘要/);
 record.subject_digest=f.asset('subject.md').digest;refresh();f.state.checks[id].approval_scope=['other.slice'];assert.throws(f.verify,/APPROVAL_CURRENT_INVALID:.*范围/);
}));
test('approval cannot be reused by changing evidence and recomputing checkpoint hashes',()=>fixture(f=>{
 const id='gate.delivery-accepted';f.registry.gates[0].id=id;
 const gate=f.state.gates[f.gateId];f.state.gates={[id]:gate};
 f.save('package.json',{gate_id:id,basis:gate.basis});
 f.save('approval.json',{schema_version:1,gate_id:id,decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',drafter_principal_ref:'synthetic.worker',principal_ref:'synthetic.reviewer',subject_ref:'package.json',subject_digest:f.asset('package.json').digest,approval_scope:['slice.current']});
 gate.approval_scope=['slice.current'];gate.subject_ref='package.json';gate.drafter_principal_ref='synthetic.worker';gate.approval_ref='approval.json';gate.basis.push(f.asset('package.json'),f.asset('approval.json'));
 const verify=()=>{f.persistRegistry();return assertGateChecks(id,f.state,{root:f.dir,registry:f.registry});};assert.equal(verify().result,'passed');
 f.save('evidence.txt','different outcome');const changed=f.asset('evidence.txt');f.state.checks[f.checkId].basis=[changed];gate.basis[0]=changed;
 assert.throws(verify,/批准范围未覆盖|证据过期/);
}));
