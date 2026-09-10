import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { assertGateChecks } = await import(path.join(root, 'scripts/lib/lifecycle-controls.mjs'));
const { loadRegistry, validateRegistry } = await import(path.join(root, 'scripts/lib/lifecycle-registry.mjs'));
const { validateApprovalRecord, assertCheckpointApprovals, assertCheckpointUserDecisions } = await import(path.join(root, 'scripts/lib/approval-record.mjs'));
const { loadDigitalHumanRoles } = await import(path.join(root, 'scripts/lib/digital-human-roles.mjs'));

function fixture(run) {
 const dir = mkdtempSync(path.join(tmpdir(), 'yss-gate-checks-'));
 try {
  const save = (ref, data) => writeFileSync(path.join(dir,ref), typeof data === 'string' ? data : JSON.stringify(data));
  const asset = ref => ({ref,digest:createHash('sha256').update(readFileSync(path.join(dir,ref))).digest('hex')});
  save('evidence.txt','actual verification evidence');
  const basis=[asset('evidence.txt')];
  const gateId='gate.slice-contract-approved',checkId='check.repository-identity-valid';
  const registry={gates:[{id:gateId,requires_checks:[checkId],evidence:['evidence.contract-approval']}],checks:[{id:checkId,evidence:['evidence.repository-identity-check']}]};
  const state={gates:{[gateId]:{status:'approved',basis:structuredClone(basis),evidence:{'evidence.contract-approval':['evidence.txt']}}},checks:{[checkId]:{status:'passed',applicable:true,basis:structuredClone(basis),evidence:{'evidence.repository-identity-check':['evidence.txt']}}}};
  const verify=()=>assertGateChecks(gateId,state,{root:dir,registry});
  run({dir,save,asset,gateId,checkId,state,registry,verify});
 } finally {rmSync(dir,{recursive:true,force:true});}
}
test('registry distinguishes six approval gates from internal checks and rejects cycles',()=>{
 const r=loadRegistry();assert.equal(r.stages.length,8);assert.equal(r.gates.length,6);assert.equal(r.checks.length,14);
 const cyclic=structuredClone(r);cyclic.checks[0].requires_checks=[cyclic.checks[1].id];cyclic.checks[1].requires_checks=[cyclic.checks[0].id];
 assert.throws(()=>validateRegistry(cyclic,{baseline:null}),/依赖循环/);
});
test('automatic evidence passes without another human approval, missing and failed checks block',()=>fixture(f=>{
 assert.equal(f.verify().result,'passed');
 for(const status of ['pending','failed','stale','not-applicable']){f.state.checks[f.checkId].status=status;assert.throws(f.verify,/未通过|未命中/);}
 delete f.state.checks[f.checkId];assert.throws(f.verify,/缺少检查/);
}));
test('N/A requires explicit applicability, explanation and current evidence',()=>fixture(f=>{
 Object.assign(f.state.checks[f.checkId],{status:'not-applicable',applicable:false,reason:'no affected delivery'});
 assert.equal(f.verify().result,'passed');delete f.state.checks[f.checkId].reason;assert.throws(f.verify,/未命中/);
}));
test('evidence drift and aggregate omissions cannot reuse approval',()=>fixture(f=>{
 f.save('evidence.txt','changed');assert.throws(f.verify,/证据过期/);
 f.state.checks[f.checkId].basis=[f.asset('evidence.txt')];assert.throws(f.verify,/证据过期/);
}));
test('a bare passed flag and unbound evidence cannot close a check',()=>fixture(f=>{
 delete f.state.checks[f.checkId].evidence;assert.throws(f.verify,/缺少绑定证据/);
}));
test('retired approvals remain readable but cannot approve new gates',()=>{
 const record={schema_version:1,gate_id:'gate.release-ready',decision:'approved',actor_kind:'biological-human',role_id:'role.biological-human',runtime_id:'runtime.generic',principal_ref:'test-only.person'};
 assert.equal(validateApprovalRecord(record).bucket,'historical');assert.throws(()=>validateApprovalRecord(record,{requireApproved:true}),/不是会签门禁/);
 assert.throws(()=>assertCheckpointApprovals({gates:{'gate.release-ready':{status:'pending'}}}),/已退役/);
});
test('delivery acceptance does not require a release decision; runtime actions still require human authorization',()=>{
 const roles=loadDigitalHumanRoles();assert.equal(roles.gate_policy.runtime_side_effect_approval,'biological-human');
 assert.ok(!roles.user_decision_policy.gates.includes('gate.delivery-accepted'));
 assert.doesNotThrow(()=>assertCheckpointUserDecisions({repository_mode:'project-instance',status:'completed',gates:{'gate.delivery-accepted':{status:'approved'}}}));
 assert.throws(()=>assertCheckpointUserDecisions({repository_mode:'project-instance',status:'completed',gates:{}}),/交付验收/);
 assert.throws(()=>assertCheckpointUserDecisions({repository_mode:'project-instance',status:'completed',gates:{'gate.delivery-accepted':{status:'approved'},'gate.spec-baseline-approved':{status:'stale'}}}),/未通过门禁/);
});

test('professional checks require current subject, matching scope and an independent reviewer',()=>fixture(f=>{
 const id='check.frontend-implementation-verified';
 f.registry.checks=[{id,evidence:['evidence.frontend-implementation-verification']}];f.registry.gates[0].requires_checks=[id];
 f.save('subject.md','current implementation');
 const record={schema_version:1,gate_id:id,decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'synthetic.qa',drafter_principal_ref:'synthetic.frontend',subject_ref:'subject.md',subject_digest:f.asset('subject.md').digest,approval_scope:['slice.demo']};
 const refresh=()=>{f.save('review.json',record);const basis=['evidence.txt','subject.md','review.json'].map(f.asset);f.state.checks={[id]:{status:'approved',applicable:true,basis,subject_ref:'subject.md',approval_ref:'review.json',approval_scope:['slice.demo'],evidence:{'evidence.frontend-implementation-verification':['evidence.txt']}}};f.state.gates[f.gateId].basis=structuredClone(basis);};
 refresh();assert.equal(f.verify().result,'passed');
 record.drafter_principal_ref=record.principal_ref;refresh();assert.throws(f.verify,/独立审查/);
 record.drafter_principal_ref='synthetic.frontend';record.subject_digest='0'.repeat(64);refresh();assert.throws(f.verify,/审查资产摘要/);
 record.subject_digest=f.asset('subject.md').digest;refresh();f.state.checks[id].approval_scope=['other.slice'];assert.throws(f.verify,/审查范围/);
}));
test('approval cannot be reused by changing evidence and recomputing checkpoint hashes',()=>fixture(f=>{
 const id='gate.delivery-accepted';f.registry.gates[0].id=id;
 const gate=f.state.gates[f.gateId];f.state.gates={[id]:gate};
 f.save('package.json',{gate_id:id,basis:gate.basis});
 f.save('approval.json',{drafter_principal_ref:'synthetic.worker',principal_ref:'synthetic.reviewer',subject_ref:'package.json',subject_digest:f.asset('package.json').digest});
 gate.subject_ref='package.json';gate.approval_ref='approval.json';gate.basis.push(f.asset('package.json'),f.asset('approval.json'));
 const verify=()=>assertGateChecks(id,f.state,{root:f.dir,registry:f.registry});assert.equal(verify().result,'passed');
 f.save('evidence.txt','different outcome');const changed=f.asset('evidence.txt');f.state.checks[f.checkId].basis=[changed];gate.basis[0]=changed;
 assert.throws(verify,/批准范围未覆盖/);
}));
