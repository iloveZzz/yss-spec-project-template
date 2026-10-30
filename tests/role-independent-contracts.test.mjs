import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateJsonSchemas } from '../scripts/lib/json-schema.mjs';
import { loadOrchestrationContract } from '../scripts/lib/orchestration-contract.mjs';
import { parse } from '../scripts/vendor/yaml.mjs';
const root = path.resolve(import.meta.dirname, '..');
const digest = 'a'.repeat(64);
const asset = { ref: 'candidate.yaml', digest };
const provenance = { tool: 'test-runner', task_ref: 'task.yaml', execution_ref: 'execution.log', identity: { status: 'unavailable', reason: 'tool has no stable session identifier' } };
const review = { mode: 'self-check', provenance };
const policy = { ref: '.template-spec/process/orchestration-contract.yaml', digest, version: 2 };
const check = { schema_version: 3, gate_id: 'check.design-reviewed', decision: 'approved', actor_kind: 'agent', subject_ref: asset.ref, subject_digest: digest, approval_scope: ['feature.demo'], basis: [asset], evidence_refs: ['check.log'], review_task_ref: 'task.yaml', review_task_digest: digest, check_ids: ['check.design-reviewed'], policy, review };
const task = { schema_version: 3, task_id: 'task.demo', work_unit_id: 'work-unit.technical-analysis', stage_id: 'stage.technical-analysis', profile: 'spec', policy, provenance, execution_state: 'Worker', workflow_status: 'active', skill_source: { policy_ref: policy.ref, policy_digest: digest, work_unit_id: 'work-unit.technical-analysis', impacts: ['api-schema'], skills: ['yss-openapi-governance'], check_ids: ['check.design-reviewed'] }, contract: { kind: 'lifecycle-work-unit', contract_id: 'demo', contract_version: 1, status: 'issued', contract_ref: 'contract.yaml', lifecycle_ref: 'checkpoint.yaml' }, inputs: ['spec.md'], input_bindings: [asset], baseline: { repository_root: '/workspace/backend', commit: 'b'.repeat(40), digest }, objective: 'Freeze the current API contract', acceptance: ['Current API passes validation'], allowed_write_paths: ['api/'], forbidden_actions: ['push'], expected_outputs: ['api/openapi.yaml'], expected_evidence_files: ['check.log'], verification_commands: ['validate-api'], verification_results: [], downstream_consumers: ['implementation'], convergence: { parent_work_unit: 'work-unit.technical-analysis', convergence_ref: 'checkpoint.yaml' } };
const bundle = { schema_version: 3, kind: 'review-bundle', bundle_id: 'review-bundle.demo', task_id: task.task_id, work_unit_id: task.work_unit_id, review_task_ref: 'task.yaml', review_task_digest: digest, check_ids: ['check.design-reviewed'], basis: [asset], policy, review, reviews: [check] };
const continuation = { schema_version: 2, kind: 'approved-scope-continuation-v2', boundary: 'implementation-scope', scope: ['feature.demo'], subject: asset, basis: [asset], source: { user_decision_ref: 'user-decision.json', boundary: 'delivery-scope', subject_ref: 'mandate.json', scope: ['feature.demo'] }, comparison: { before: asset, after: asset, affected_check_ids: ['check.design-reviewed'], differences: [{ ref: 'diff.patch', digest, classification: 'implementation-detail', reason: 'Current implementation stays inside the approved scope' }], material_changes: [], decision_basis_unchanged: true }, verification_results: [{ command: 'validate-api', status: 'passed', exit_code: 0, executed_at: '2026-10-17T00:00:00Z', evidence_ref: 'check.log', evidence_digest: digest, candidate_digest: digest }], review, external_rules: { state: 'none-known' } };
function validate(schema, values) { return validateJsonSchemas(values.map(value => ({ value, schemaPath: path.join(root, '.template-spec/process/schemas', `${schema}.schema.json`) }))); }
function accepts(schema, value) { const [r] = validate(schema, [value]); assert.equal(r.valid, true, r.error); }
function rejects(schema, value) { const [r] = validate(schema, [value]); assert.equal(r.valid, false); }
const copy = value => structuredClone(value);
function assertCurrentCheckIDs(policy, profile, registry) {
 const current=policy.gate_policy.profiles[profile];
 const currentIDs=[...current.automatic_checks,...current.evidence_only,...current.user_decision_gates,...current.contract_approval_gates,...current.check_reviews.map(row=>row.gate),...current.technical_reviews.map(row=>row.gate)];
 const registered=new Set(['gates','checks'].flatMap(key=>registry[key].map(row=>row.id)));
 assert.equal(new Set(currentIDs).size,currentIDs.length,`${profile}: duplicate gate/check`);
 for(const id of currentIDs)assert.ok(registered.has(id),`${profile}: unknown gate/check ${id}`);
}

test('new task3, approval3 and review-bundle3 accept role-free self-check without stable identity', () => { accepts('digital-human-task-package', task); accepts('approval-record', check); accepts('review-bundle', bundle); });
test('legacy required role/runtime fields and readonly intake2 retain their meaning; unknown versions reject', () => {
 for (const [schema, sample] of [['digital-human-task-package', task], ['approval-record', check], ['review-bundle', bundle]]) for (const version of [1, 2, 99]) rejects(schema, { ...sample, schema_version: version });
});
test('new task rejects missing baseline, empty acceptance and role qualification fields', () => {
 for (const key of ['baseline', 'provenance', 'input_bindings', 'policy']) { const bad=copy(task); delete bad[key]; rejects('digital-human-task-package', bad); }
 rejects('digital-human-task-package', {...task, acceptance: []}); rejects('digital-human-task-package', {...task, role_id:'role.backend-engineer'});
});
test('formal task3 rejects empty expected evidence files', () => {
 rejects('digital-human-task-package', {...task, expected_evidence_files: []});
});
test('formal task3 rejects empty verification commands', () => {
 rejects('digital-human-task-package', {...task, verification_commands: []});
});
test('independent and external review require their actual source evidence, self-check cannot carry fake independence', () => {
 for (const mode of ['independent-review','external-required-review']) rejects('approval-record', {...check, review:{...review,mode}});
 rejects('approval-record', {...check, review:{...review, independence:{contexts_distinct:true}}});
 const independent = {...review,mode:'independent-review',independence:{ implementation:provenance, reviewer:{...provenance, execution_ref:'review.log',identity:{status:'available',principal_ref:'agent.b',session_ref:'session.b'}}, implementation_context_ref:'context.a', reviewer_context_ref:'context.b', evidence:asset, candidate:asset, scope:['feature.demo'], readonly:true }};
 // Independent sources require stable, verifiable identities on both sides.
 rejects('approval-record', {...check,review:independent});
 independent.independence.implementation={...provenance,identity:{status:'available',principal_ref:'agent.a',session_ref:'session.a'}};
 accepts('approval-record', {...check,review:independent});
});
test('continuation2 binds original approval, snapshot, differences and current checks without mandatory independent review', () => {
 accepts('approved-scope-continuation',continuation);
 for(const key of ['source','comparison','verification_results']){ const bad=copy(continuation);delete bad[key];rejects('approved-scope-continuation',bad); }
 rejects('approved-scope-continuation',{...continuation,schema_version:99});
 rejects('approved-scope-continuation',{...continuation,comparison:{...continuation.comparison,material_changes:['acceptance']}});
 rejects('approved-scope-continuation',{...continuation,external_rules:{state:'known-verifiable'}});
 accepts('approved-scope-continuation',{...continuation,external_rules:{state:'known-unverifiable',requirements:[{rule_ref:'branch-protection',scope:['merge'],reason:'platform unavailable'}]}});
});
test('passed results cannot have failing exit codes or omit candidate/log binding', () => {
 const result=continuation.verification_results[0];
 accepts('digital-human-task-package',{...task,verification_results:[result]});
 rejects('digital-human-task-package',{...task,verification_results:[{...result,exit_code:1}]});
 const bad={...result};delete bad.evidence_digest;rejects('digital-human-task-package',{...task,verification_results:[bad]});
});
test('policy2 uses registered checks without holders and defaults to single executor', () => {
 const p=loadOrchestrationContract(ref=>fs.readFileSync(path.join(root,ref)),'.template-spec/process/orchestration-contract.yaml').value;
 const registry=parse(fs.readFileSync(path.join(root,'.template-spec/process/lifecycle-registry.yaml'),'utf8'));
 assertCurrentCheckIDs(p,'spec',registry);
 assert.equal(p.schema_version,2); assert.equal(p.task_package.schema_version,3); assert.equal(p.request_triage.delivery_path.version,2); assert.equal(p.request_triage.delivery_path.standard.version,2);
 assert.equal(p.review_verification.default_mode,'self-check'); assert.equal(p.governance_versions.required_capability,'role-independent-governance-v1');
 assert.deepEqual(p.profile_admission.new_profiles,['spec','backend']); assert.equal(p.profile_admission.legacy_design,undefined);
 assert.equal(p.governance_versions.project_identity.current,2); assert.equal(p.governance_versions.harness_profile.current,3);
 assert.equal(p.user_decision_policy.continuation.schema_version,2);
 assert.ok(p.technical_checks.length); assert.ok(p.gate_policy.profiles.spec.check_reviews.every(c=>c.gate.startsWith('check.')&&!('countersigners' in c)));
 assert.equal(JSON.stringify(p.technical_checks).includes('eligible_roles'),false);
 assert.equal(p.preparation_policy.grants_implementation,false); assert.equal(p.planning.formal_spec_draft_requires_passed_entry,false);
 assert.equal(p.request_triage.delivery_path.completion_requires.includes('independent-review'),false);
});

test('Backend materialized policy selects only its declared gates/checks and retains delivery bounds', async () => {
 const { composeProfileTree } = await import('../scripts/lib/profile-tree.mjs');
 const tree=composeProfileTree('backend');
 const p=loadOrchestrationContract(ref=>fs.readFileSync(path.join(tree,ref)),'.template-spec/process/orchestration-contract.yaml').value;
 const registry=parse(fs.readFileSync(path.join(tree,'.template-spec/process/lifecycle-registry.yaml'),'utf8'));
 const gates=p.gate_policy.profiles.backend;
 assertCurrentCheckIDs(p,'backend',registry);
 assert.ok(!gates.technical_reviews.some(x=>x.gate==='gate.delivery-accepted'));
 assert.equal(p.gate_policy.default_if_unlisted,'reject-unlisted');
 assert.equal(p.profile_admission.backend.business_accepted,false);
 assert.equal(p.profile_admission.backend.frontend_write,false);
 assert.equal(p.task_package.schema_version,3);
 assert.equal(p.slice_contract.professional_review.independence,'conditional-on-explicit-user-or-external-rule');
 assert.equal(p.parallelism.verifier_must_differ_from_worker,false);
 const profile=parse(fs.readFileSync(path.join(tree,'.template-spec/process/harness-profile.yaml'),'utf8'));
 accepts('harness-profile',profile);
});
test('new identity and Profile reject unknown versions and new Design', () => {
 accepts('project-identity',{schema_version:2,repository_mode:'project-instance'});
 for(const schema_version of [0,3,99]) rejects('project-identity',{schema_version,repository_mode:'project-instance'});
 rejects('project-identity',{schema_version:2,repository_mode:'template-source'});
 rejects('harness-profile',{schema_version:3,profile_id:'harness.business-ddd-strategy-handoff',status:'active',required_capabilities:['role-independent-governance-v1']});
});

test('legacy task1 and readonly task2 still accept original records and reject missing roles', () => {
 const legacy=copy(task);
 for(const key of ['profile','policy','provenance','acceptance','input_bindings','baseline']) delete legacy[key];
 Object.assign(legacy,{schema_version:1,actor_id:'fixture.worker',role_id:'role.backend-engineer',runtime_id:'runtime.generic',skill_source:{registry_ref:'.template-spec/agents/digital-human-roles.yaml',defaults_ref:'role.backend-engineer',core_skills:['yss-web-controller'],forbidden_skills:['frontend-implementation']}});
 accepts('digital-human-task-package',legacy);
 const noRole=copy(legacy);delete noRole.role_id;rejects('digital-human-task-package',noRole);
 const intake={...legacy,schema_version:2,execution_state:'Explorer',work_unit_id:'work-unit.entry-triage',stage_id:'stage.entry-triage',allowed_write_paths:[],verification_status:'not-executed',contract:{kind:'read-only-intake',contract_id:'intake',contract_version:1,status:'issued',contract_ref:'request.md'}};
 accepts('digital-human-task-package',intake);
 rejects('digital-human-task-package',{...intake,allowed_write_paths:['src/']});
});
const slice={schema_version:4,contract_id:'contract.demo',contract_version:'v1',slice_id:'slice.demo',status:'draft',basis:{spec:'spec.md'},scope:{impacted_areas:['backend'],implementation_path_policy:'external-repository-native',project_roots:['/workspace/backend'],allowed_write_paths:['src/']},applicability:{frontend:{status:'not-applicable',reason:'Backend only'},backend:{status:'required'},api:{status:'not-applicable',reason:'No wire change'},cross_repo:{status:'not-applicable',reason:'One repository'}},resolution:{required_capabilities:['backend.mvc-service-behavior'],required_skills:['yss-application'],recipe_ids:[],conditions:[],registry_digest:digest,compiler_contract_digest:digest},acceptance:{'AC-1':{source:'spec',locator:'AC-1'}},verification:{test:{command:'./mvnw test',cwd:'/workspace/backend',expected_evidence:['test.log'],test_seams:['success','failure'],acceptance_refs:['AC-1']}},work_units:[{id:'work-unit.slice-backend',behavior:'Validate input before saving',primary_skill:'yss-application',tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-1'],check_ids:['check.design-reviewed']}]};
test('Slice4 removes role qualification while preserving Slice3 and strict versions', () => {
 accepts('slice-implementation-contract-v4',slice);
 const old=copy(slice);old.schema_version=3;delete old.work_units[0].check_ids;old.work_units[0].role_id='role.backend-engineer';
 accepts('slice-implementation-contract-v3',old);
 delete old.work_units[0].role_id;rejects('slice-implementation-contract-v3',old);
 rejects('slice-implementation-contract-v4',{...slice,schema_version:3});
 const bad=copy(slice);bad.work_units[0].role_id='role.backend-engineer';rejects('slice-implementation-contract-v4',bad);
});
test('approval3 remains bound even after mandatory digital-human countersign is retired', () => {
 // 删除会签措辞不能把批准记录降级为可省略的自由文本。
 rejects('approval-record',{...check,check_ids:[]});
 rejects('approval-record',{...check,review:{mode:'self-check'}}); // self-check 仍须 provenance
 rejects('approval-record',{...check,actor_kind:'digital-human'});
 const registry=parse(fs.readFileSync(path.join(root,'.template-spec/process/lifecycle-registry.yaml'),'utf8'));
 for(const gateId of ['gate.plan-approved','gate.spec-baseline-approved']){
  const gate=registry.gates.find(row=>row.id===gateId);
  assert.ok(gate?.evidence?.includes('evidence.approval-record'),`${gateId} 仍必须要求当前批准记录`);
 }
});
