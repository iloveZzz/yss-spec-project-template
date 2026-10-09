import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDocument } from '../../../../scripts/vendor/yaml.mjs';
import { loadRegistry, ROOT } from '../../../../scripts/lib/lifecycle-registry.mjs';
import { loadDigitalHumanRoles, taskPackageDefaults, validateDefaultDigitalHumanRoles, countersignRuleForGate } from '../../../../scripts/lib/digital-human-roles.mjs';
import { compileReviewCapabilities, validateReviewCapabilityPolicy, validateReviewTaskBinding, approvalExpectedFromTask, assertReviewCapabilityBinding, reviewDigest, currentApprovalsFromCheckpoint } from '../../../../scripts/lib/review-capabilities.mjs';
import { buildReviewPackage, prepareReviewPackage } from '../../../../scripts/lib/review-package.mjs';
import { validateTaskPackageSchema } from '../../../../scripts/lib/task-package-schema.mjs';
import { validateJsonSchema } from '../../../../scripts/lib/json-schema.mjs';
import { readApprovalHistory, validateApprovalRecordFile } from '../../../../scripts/lib/approval-record.mjs';

const clone = structuredClone;
const registry = loadRegistry(), rolesDoc = loadDigitalHumanRoles();
const policyRef = '.template-spec/agents/digital-human-roles.yaml';
const checkIds = ['check.openapi-draft-reviewed', 'check.engineering-baseline-accepted'];
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-review-capability-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (ref, value) => { fs.mkdirSync(path.dirname(path.join(root, ref)), { recursive: true }); fs.writeFileSync(path.join(root, ref), value); };
  write(policyRef, fs.readFileSync(path.join(ROOT, policyRef)));
  write('yss-project.yaml', 'schema_version: 1\nrepository_mode: project-instance\n');
  const checkpointRef = 'docs/.scratch/feature/checkpoint.json';
  const rows = checkIds.map((id, i) => {
    const subject = `docs/.scratch/feature/subject-${i}.yaml`, evidence = `docs/.scratch/feature/evidence-${i}.txt`;
    write(subject, `schema_version: 1\nsubject: ${i}\n`); write(evidence, `actual evidence ${i}\n`);
    return [id, { applicable: true, status: 'pending', subject_ref: subject, subject_digest: reviewDigest(fs.readFileSync(path.join(root, subject))), approval_scope: [`scope-${i}`], drafter_principal_ref: `instance:author-${i}`, basis: [{ ref: evidence, digest: reviewDigest(fs.readFileSync(path.join(root, evidence))) }], evidence_refs: [evidence] }];
  });
  const checkpoint = { checks: Object.fromEntries(rows), gates: {} };
  write(checkpointRef, JSON.stringify(checkpoint));
  const options = { root, registry, checkpointRef, checkIds, roleId: 'role.test-engineer', runtimeId: 'runtime.generic', actorId: 'agent.reviewer', reviewerPrincipalRef: 'instance:qa', drafterPrincipalRef: 'instance:packet-owner', implementationActorId: 'agent.worker', taskId: 'review.api-baseline', reviewSessionId: 'session:one', workUnitId: 'work-unit.technical-analysis', outputDir: 'docs/.scratch/feature/reviews/current' };
  return { root, write, checkpointRef, checkpoint, options };
}
function prepared(t) { const f = fixture(t), result = prepareReviewPackage(f.options); return { ...f, result, task: JSON.parse(fs.readFileSync(path.join(f.root, result.task_ref))), bundle: parseDocument(fs.readFileSync(path.join(f.root, result.bundle_ref), 'utf8')).toJS() }; }
function expected(f, boundary = checkIds[0]) { return approvalExpectedFromTask(f.task, { root: f.root, rolesDoc, registry, boundary, reviewTaskRef: f.result.task_ref, reviewTaskDigest: f.result.task_digest }); }

test('one independent tester covers API draft and engineering baseline without changing role core/forbidden', () => {
  const before = taskPackageDefaults('role.test-engineer');
  const result = compileReviewCapabilities({ checkIds, roleId: 'role.test-engineer', rolesDoc, registry });
  assert.deepEqual(result.capability_ids, ['capability.engineering-baseline', 'capability.openapi-contract']);
  assert.deepEqual(result.review_skills, ['code-review', 'yss-openapi-draft-review']);
  assert.deepEqual(taskPackageDefaults('role.test-engineer'), before);
  assert.ok(before.forbidden_skills.includes('implement'));
  assert.equal(validateDefaultDigitalHumanRoles().claimed_gates, registry.gates.length);
});

test('Worker, unknown boundary, missing expertise, and forbidden supplement fail closed', () => {
  assert.throws(() => compileReviewCapabilities({ checkIds, roleId: 'role.test-engineer', executionState: 'Worker', rolesDoc, registry }), /REVIEW_CAPABILITY_STATE/);
  assert.throws(() => compileReviewCapabilities({ checkIds: ['check.unknown'], roleId: 'role.test-engineer', rolesDoc, registry }), /GATE_POLICY_REQUIRED/);
  assert.throws(() => compileReviewCapabilities({ checkIds, roleId: 'role.frontend-engineer', rolesDoc, registry }), /REVIEW_CAPABILITY_MISSING/);
  const changed = clone(rolesDoc); changed.review_capabilities[0].review_skills = ['implement'];
  assert.throws(() => validateReviewCapabilityPolicy(changed), /REVIEW_CAPABILITY_FORBIDDEN/);
  assert.throws(() => countersignRuleForGate(rolesDoc.gate_policy, 'gate.future'), /GATE_POLICY_REQUIRED/);
  const unknownSkill = clone(rolesDoc); unknownSkill.review_capabilities.find(x => x.id === 'capability.openapi-contract').review_skills = ['unregistered-review-tool'];
  assert.throws(() => compileReviewCapabilities({ checkIds, roleId: 'role.test-engineer', rolesDoc: unknownSkill, registry }), /GATE_POLICY_REQUIRED/);
});

test('complete policy classification is mandatory for every active gate and check', () => {
  const deps = { gateIds: new Set(registry.gates.map(x => x.id)), checkIds: new Set(registry.checks.map(x => x.id)) };
  assert.doesNotThrow(() => validateReviewCapabilityPolicy(rolesDoc, deps));
  const missing = clone(rolesDoc); missing.gate_policy.dual_digital_human.shift();
  assert.throws(() => validateReviewCapabilityPolicy(missing, deps), /GATE_POLICY_REQUIRED/);
  const duplicate = clone(rolesDoc); duplicate.gate_policy.automatic_checks.push(duplicate.gate_policy.automatic_checks[0]);
  assert.throws(() => validateReviewCapabilityPolicy(duplicate, deps), /GATE_POLICY_REQUIRED/);
});

test('a bounded gate-only profile omits checks without expanding its registry', () => {
  const profileRegistry = clone(registry), profileRoles = clone(rolesDoc);
  delete profileRegistry.checks;
  profileRoles.gate_policy.check_reviews = [];
  profileRoles.gate_policy.automatic_checks = [];
  const compiled = compileReviewCapabilities({ checkIds: ['gate.spec-baseline-approved'], roleId: 'role.product-manager', rolesDoc: profileRoles, registry: profileRegistry });
  assert.deepEqual(compiled.capability_ids, ['capability.spec-acceptance']);
  assert.equal(Object.hasOwn(profileRegistry, 'checks'), false);
  assert.throws(() => compileReviewCapabilities({ checkIds: ['check.openapi-draft-reviewed'], roleId: 'role.test-engineer', rolesDoc: profileRoles, registry: profileRegistry }), /GATE_POLICY_REQUIRED/);
});

test('cross-root preparation and validation use the target lifecycle and skill registries',t=>{
  const f=fixture(t),profile=path.join(ROOT,'submodules/yss-harness-backend-agent');
  for(const ref of [policyRef,'.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/yss-skill-registry.yaml'])f.write(ref,fs.readFileSync(path.join(profile,ref)));
  const boundary='gate.technical-design-approved';
  f.write(f.checkpointRef,JSON.stringify({gates:{[boundary]:f.checkpoint.checks[checkIds[0]]},checks:{}}));
  const options={...f.options,checkIds:[boundary],roleId:'role.test-agent',workUnitId:'work-unit.technical-design'};delete options.registry;
  const built=buildReviewPackage(options);
  assert.equal(built.task.stage_id,'stage.technical-design');
  assert.deepEqual(built.task.skill_source.review_skills,['code-review','yss-technical-design']);
  const subjectRef=built.task.review_context.candidate_ref;
  f.write(subjectRef,JSON.stringify(built.subject,null,2)+'\n');
  assert.doesNotThrow(()=>validateReviewTaskBinding(built.task,{root:f.root}));
  const ref='.template-spec/agents/yss-skill-registry.yaml',skills=parseDocument(fs.readFileSync(path.join(f.root,ref),'utf8')).toJS();
  for(const key of ['skills','platform_skills','external_skills'])if(skills[key])skills[key]=skills[key].filter(row=>row.id!=='code-review');
  f.write(ref,JSON.stringify(skills));
  assert.throws(()=>buildReviewPackage(options),/GATE_POLICY_REQUIRED/);
});

test('真实专职政策允许独立Slice工程审查并绑定当前编译候选',t=>{
  for(const profile of ['backend','frontend']) {
    const f=fixture(t),source=path.join(ROOT,`submodules/yss-harness-${profile}-agent`);
    for(const ref of [policyRef,'.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/yss-skill-registry.yaml']) f.write(ref,fs.readFileSync(path.join(source,ref)));
    const localRegistry=loadRegistry(path.join(source,'.template-spec/process/lifecycle-registry.yaml'));
    const localRoles=loadDigitalHumanRoles(path.join(source,policyRef));
    const compiled=compileReviewCapabilities({checkIds:['check.design-reviewed'],roleId:'role.architecture-agent',rolesDoc:localRoles,registry:localRegistry});
    assert.deepEqual(compiled.capability_ids,[profile==='backend'?'capability.technical-design':'capability.frontend-engineering']);
    const subject='compiled-slice.yaml';
    f.write(subject,'schema_version: 3\ncontract_id: synthetic.current-compiled-slice\n');
    f.write(f.checkpointRef,JSON.stringify({checks:{'check.design-reviewed':{...f.checkpoint.checks[checkIds[0]],subject_ref:subject,subject_digest:reviewDigest(fs.readFileSync(path.join(f.root,subject))) }},gates:{}}));
    const options={...f.options,checkIds:['check.design-reviewed'],roleId:'role.architecture-agent',workUnitId:'work-unit.slice-contract'};
    delete options.registry;
    const built=buildReviewPackage(options);
    assert.equal(built.task.stage_id,'stage.slice-contract');
    assert.equal(built.bundle.reviews[0].subject_ref,subject);
    assert.equal(built.bundle.reviews[0].subject_digest,reviewDigest(fs.readFileSync(path.join(f.root,subject))));
    assert.ok(localRegistry.gates.find(gate=>gate.id==='gate.slice-contract-approved').requires_checks.includes('check.design-reviewed'));
    assert.throws(()=>buildReviewPackage({...options,reviewerPrincipalRef:'instance:author-0'}),/INDEPENDENT|independent|独立/);
  }
});

test('generated draft is parsed by the real approval reader and remains blocked by pending', t => {
  const f = prepared(t), file = path.join(f.root, f.result.bundle_ref);
  const history = readApprovalHistory(file, { root: f.root });
  assert.equal(history.bucket, 'history-only');
  assert.equal(history.execution_authorization, 'not-evaluated');
  assert.deepEqual(history.record.reviews.map(row => row.decision), ['pending', 'pending']);
  assert.throws(() => validateApprovalRecordFile(file, { root: f.root, rolesDoc, registry, checkpoint: f.checkpoint }), error => error.code === 'APPROVAL_CURRENT_INVALID' && /decision.*approved/.test(error.message));
});

test('draft package binds distinct per-check subjects, scopes, authors and actual evidence; every decision is pending', t => {
  const f = prepared(t);
  assert.equal(f.result.execution_authorization, 'not-granted');
  assert.ok(f.bundle.reviews.every(x => x.decision === 'pending' && x.schema_version === 2));
  assert.notEqual(f.bundle.reviews[0].subject_ref, f.bundle.reviews[1].subject_ref);
  assert.notEqual(f.bundle.reviews[0].drafter_principal_ref, f.bundle.reviews[1].drafter_principal_ref);
  assert.equal(f.bundle.reviews[0].principal_ref, f.bundle.reviews[1].principal_ref);
  assert.deepEqual(f.task.review_context.approval_scope, ['scope-0', 'scope-1']);
  assert.deepEqual(f.task.review_context.current_approvals.map(x => x.boundary), checkIds);
  assert.match(fs.readFileSync(path.join(f.root, f.result.diff_ref), 'utf8'), /无法比较旧内容/);
  assert.doesNotThrow(() => validateReviewTaskBinding(f.task, { root: f.root, rolesDoc, registry }));
  validateJsonSchema(f.bundle, path.join(ROOT, '.template-spec/process/schemas/review-bundle.schema.json'));
});

test('task independently supplies per-boundary expected context and v2 binding uses it', t => {
  const f = prepared(t), exp = expected(f);
  assert.equal(exp.subject_ref, f.bundle.reviews[0].subject_ref);
  assert.deepEqual(exp.approval_scope, ['scope-0']);
  assert.equal(exp.review_context.current_approvals.length, 2);
  assert.doesNotThrow(() => assertReviewCapabilityBinding(f.bundle.reviews[0], { expected: exp.review_context, root: f.root, rolesDoc, registry }));
  assert.throws(() => approvalExpectedFromTask(f.task, { root: f.root, rolesDoc, registry, boundary: 'check.prototype-reviewed', reviewTaskRef: f.result.task_ref, reviewTaskDigest: f.result.task_digest }), /APPROVAL_CONTEXT_REQUIRED/);
  assert.throws(() => assertReviewCapabilityBinding(f.bundle.reviews[0], { root: f.root, rolesDoc, registry }), /APPROVAL_CONTEXT_REQUIRED/);
});

test('current approval task rejects unknown work units and substituted lifecycle sources',t=>{
  const f=prepared(t),mutations=[
    task=>{task.work_unit_id='work-unit.unregistered-review';task.convergence.parent_work_unit=task.work_unit_id;},
    task=>{task.work_unit_id='work-unit.slice-implementation';task.convergence.parent_work_unit=task.work_unit_id;},
    task=>task.contract.contract_ref=f.bundle.reviews[0].subject_ref,
    task=>task.contract.lifecycle_ref=f.bundle.reviews[0].subject_ref,
    task=>task.contract.slice_contract_ref=f.bundle.reviews[0].subject_ref,
    task=>task.contract.maintenance_ref=f.bundle.reviews[0].subject_ref,
    task=>task.checkpoint_ref=f.bundle.reviews[0].subject_ref,
    task=>task.convergence.convergence_ref=f.bundle.reviews[0].subject_ref,
    task=>task.convergence.parent_work_unit='work-unit.code-review',
    task=>delete task.stage_id,
  ];
  for(const mutate of mutations){const task=clone(f.task);mutate(task);assert.throws(()=>validateReviewTaskBinding(task,{root:f.root,rolesDoc,registry}),/REVIEW_TASK_INVALID|stage_id.*required/);}
});

test('record cannot change bound role/runtime/principal, capability set or review task', t => {
  const f = prepared(t), exp = expected(f), record = f.bundle.reviews[0];
  for (const [field, value, pattern] of [['role_id', 'role.frontend-engineer', /REVIEW_NOT_INDEPENDENT/], ['runtime_id', 'runtime.grok', /REVIEW_NOT_INDEPENDENT/], ['principal_ref', 'instance:other', /REVIEW_NOT_INDEPENDENT/], ['drafter_principal_ref', 'instance:other', /REVIEW_NOT_INDEPENDENT/], ['capability_ids', ['capability.openapi-contract'], /REVIEW_CAPABILITY_MISSING/], ['review_task_digest', '0'.repeat(64), /REVIEW_BINDING_STALE/]]) {
    assert.throws(() => assertReviewCapabilityBinding({ ...record, [field]: value }, { expected: exp.review_context, root: f.root, rolesDoc, registry }), pattern, field);
  }
});

for (const mutation of ['subject', 'evidence', 'policy', 'checkpoint', 'candidate', 'task']) test(`current ${mutation} bytes drift rejects the prior approval binding`, t => {
  const f = prepared(t), exp = expected(f);
  const target = { subject: f.bundle.reviews[0].subject_ref, evidence: f.bundle.reviews[0].basis[0].ref, policy: policyRef, checkpoint: f.checkpointRef, candidate: f.result.subject_ref, task: f.result.task_ref }[mutation];
  fs.appendFileSync(path.join(f.root, target), '\nchanged\n');
  assert.throws(() => assertReviewCapabilityBinding(f.bundle.reviews[0], { expected: exp.review_context, root: f.root, rolesDoc, registry }), /REVIEW_BINDING_STALE|APPROVAL_CONTEXT_REQUIRED/);
});

test('rewritten candidate/task digests cannot fabricate a different current checkpoint subject', t => {
  const f = prepared(t), task = clone(f.task);
  const subject = JSON.parse(fs.readFileSync(path.join(f.root, f.result.subject_ref)));
  subject.current_approvals[0].approval_scope = ['invented'];
  task.review_context.current_approvals = clone(subject.current_approvals); task.review_context.approval_scope.push('invented');
  const bytes = JSON.stringify(subject); f.write(f.result.subject_ref, bytes); task.review_context.candidate_digest = reviewDigest(bytes);
  assert.throws(() => validateReviewTaskBinding(task, { root: f.root, rolesDoc, registry }), /REVIEW_BINDING_STALE.*checkpoint/);
});

test('duplicated or omitted conclusions and schema omissions cannot bypass capability binding', t => {
  const f = prepared(t);
  const duplicate = clone(f.task); duplicate.review_context.current_approvals[1] = clone(duplicate.review_context.current_approvals[0]);
  assert.throws(() => validateReviewTaskBinding(duplicate, { root: f.root, rolesDoc, registry }), /APPROVAL_CONTEXT_REQUIRED/);
  const missing = clone(f.task); delete missing.review_context.policy_digest;
  assert.throws(() => validateReviewTaskBinding(missing, { root: f.root, rolesDoc, registry }), /policy_digest/);
  const uncompiled = clone(f.task); uncompiled.skill_source.review_skills.push('yss-domain');
  assert.throws(() => validateReviewTaskBinding(uncompiled, { root: f.root, rolesDoc, registry }), /REVIEW_CAPABILITY_MISSING/);
});

test('core and forbidden changes, self review, source write scope and v2 read-only extension are rejected', t => {
  const f = prepared(t);
  const forbidden = clone(f.task); forbidden.skill_source.forbidden_skills = [];
  assert.throws(() => validateReviewTaskBinding(forbidden, { root: f.root, rolesDoc, registry }), /forbidden_skills|REVIEW_CAPABILITY_FORBIDDEN/);
  const self = clone(f.task); self.review_context.reviewer_principal_ref = self.review_context.drafter_principal_ref;
  assert.throws(() => validateReviewTaskBinding(self, { root: f.root, rolesDoc, registry }), /REVIEW_NOT_INDEPENDENT/);
  const write = clone(f.task); write.allowed_write_paths = [f.checkpointRef];
  assert.throws(() => validateReviewTaskBinding(write, { root: f.root, rolesDoc, registry }), /REVIEW_CAPABILITY_WRITE_SCOPE/);
  const worker = clone(f.task); worker.execution_state = 'Worker';
  assert.throws(() => validateTaskPackageSchema(worker), /Reviewer|Verifier/);
  const intake = clone(f.task); intake.schema_version = 2;
  assert.throws(() => validateTaskPackageSchema(intake), /schema_version|Explorer/);
});

test('prepare refuses missing independent consumer input and never overwrites existing evidence', t => {
  const f = prepared(t), old = fs.readFileSync(path.join(f.root, f.result.task_ref));
  assert.throws(() => prepareReviewPackage(f.options), /不得覆盖历史证据/);
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.result.task_ref)), old);
  delete f.checkpoint.checks[checkIds[0]].drafter_principal_ref;
  f.write(f.checkpointRef, JSON.stringify(f.checkpoint));
  assert.throws(() => buildReviewPackage({ ...f.options, outputDir: 'docs/.scratch/feature/reviews/next' }), /APPROVAL_CONTEXT_REQUIRED/);
});

test('symlinked subject is rejected and current bytes are never accepted through an escaping path', t => {
  const f = prepared(t), subject = f.bundle.reviews[0].subject_ref;
  const target = path.join(f.root, subject), linked = path.join(f.root, 'linked-subject');
  fs.renameSync(target, linked); fs.symlinkSync(linked, target);
  assert.throws(() => currentApprovalsFromCheckpoint(f.checkpointRef, checkIds, { root: f.root }), /symlink/);
  assert.throws(() => buildReviewPackage({ ...f.options, outputDir: '../escape' }), /APPROVAL_CONTEXT_REQUIRED/);
});

test('CLI creates a reviewable pending package and returns a nonzero exit for a missing real checkpoint', t => {
  const f = fixture(t);
  const args = ['--root', f.root, '--checkpoint', f.checkpointRef, '--check', checkIds[0], '--check', checkIds[1], '--role', 'role.test-engineer', '--actor', 'agent.reviewer', '--reviewer-principal', 'instance:qa', '--drafter-principal', 'instance:packet-owner', '--implementation-actor', 'agent.worker', '--task-id', 'review.api-baseline', '--review-session', 'session:one', '--work-unit', 'work-unit.technical-analysis', '--output-dir', f.options.outputDir];
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/prepare-review-package'), ...args], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr); assert.equal(JSON.parse(run.stdout).decision, 'pending');
  const invalid = spawnSync(process.execPath, [path.join(ROOT, 'scripts/prepare-review-package'), ...args.map(x => x === f.checkpointRef ? 'missing.json' : x)], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(invalid.status, 1); assert.match(invalid.stderr, /APPROVAL_CONTEXT_REQUIRED/);
});

test('same checkpoint may record approval control state while frozen review inputs remain current',t=>{
 const f=prepared(t);
 for(const row of Object.values(f.checkpoint.checks)){row.status='approved';row.approval_ref=f.result.bundle_ref;}
 f.write(f.checkpointRef,JSON.stringify(f.checkpoint));
 assert.doesNotThrow(()=>validateReviewTaskBinding(f.task,{root:f.root,rolesDoc,registry}));
 f.checkpoint.checks[checkIds[0]].approval_scope=['changed-scope'];f.write(f.checkpointRef,JSON.stringify(f.checkpoint));
 assert.throws(()=>validateReviewTaskBinding(f.task,{root:f.root,rolesDoc,registry}),/REVIEW_BINDING_STALE/);
});
