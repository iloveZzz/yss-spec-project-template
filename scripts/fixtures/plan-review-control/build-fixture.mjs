// Synthetic fixture only. These assets and replies never approve a real project.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../lib/lifecycle-registry.mjs';
import { reviewDigest } from '../../lib/review-capabilities.mjs';
import { initializePlanReview, dispatchPlanReview, completePlanReview, writePlanReviewCheckpoint } from '../../lib/plan-review-control.mjs';
import { parseDocument } from '../../vendor/yaml.mjs';
import { prepareReviewPackage } from '../../lib/review-package.mjs';

export const PLAN_BOUNDARIES = ['check.domain-strategy-approved', 'check.stage-decision-package-approved'];

export function buildPlanReviewFixture(root, { boundaries = PLAN_BOUNDARIES } = {}) {
  fs.mkdirSync(root, { recursive: true });
  root = fs.realpathSync(root);
  const write = (ref, value) => {
    const file = path.resolve(root, ref);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
  };
  const read = ref => fs.readFileSync(path.resolve(root, ref));
  const asset = ref => ({ ref, digest: reviewDigest(read(ref)) });
  const authorities = ['CONTEXT.md', '.template-spec/agents/digital-human-roles.yaml', '.template-spec/agents/yss-skill-registry.yaml', '.template-spec/process/lifecycle-registry.yaml', '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'];
  for (const ref of authorities) write(ref, fs.readFileSync(path.join(ROOT, ref)));
  fs.cpSync(path.join(ROOT, '.template-spec/process/schemas'), path.join(root, '.template-spec/process/schemas'), { recursive: true });
  write('yss-project.yaml', 'schema_version: 1\nrepository_mode: project-instance\n');
  write('input/confirmed-scope.md', '# 合成确认范围\n\nfeature.demo：提交当前业务报表，不扩展已确认范围。仅用于测试。\n');
  write('input/business-evidence.md', '# 合成业务依据\n\n提交后状态为待处理；业务规则与验收场景已列明。仅用于测试。\n');
  const checkpointRef = 'docs/.scratch/feature.demo/checkpoint.json';
  const checkpoint = {
    schema_version: 1, repository_mode: 'project-instance', feature_id: 'feature.demo', mode: 'orchestrate', status: 'running', stage: 'stage.plan',
    artifacts: {}, checks: {}, gates: {}, context_reconciliation: { status: 'pending', ref: null, evidence_refs: [] },
    next_work_unit: 'work-unit.plan-requirements', ticket_sync: {}, verification: {}, human_review: {}, git_checkpoint: {}, blockers: [], rollback: []
  };
  for (const [index, boundary] of boundaries.entries()) {
    const subjectRef = `docs/.scratch/feature.demo/subject-${index}.json`;
    write(subjectRef, { schema_version: 1, kind: 'synthetic-plan-subject', feature_id: checkpoint.feature_id, boundary, gate_id: boundary, basis: [asset('input/confirmed-scope.md'), asset('input/business-evidence.md')], rule: '提交后待处理', synthetic_fixture: true });
    checkpoint[boundary.startsWith('check.') ? 'checks' : 'gates'][boundary] = {
      applicable: true, status: 'pending', subject_ref: subjectRef, subject_digest: asset(subjectRef).digest,
      approval_scope: [checkpoint.feature_id], drafter_principal_ref: 'synthetic.plan-author',
      basis: [asset('input/confirmed-scope.md'), asset('input/business-evidence.md')], evidence_refs: ['input/business-evidence.md']
    };
  }
  write('input/origin-checkpoint.json', checkpoint);
  if (boundaries.some(id => PLAN_BOUNDARIES.includes(id))) checkpoint.plan_review_control = initializePlanReview(checkpoint, {
    feature_id: checkpoint.feature_id, scope_ids: [checkpoint.feature_id], scope_digest: asset('input/confirmed-scope.md').digest,
    provenance: { kind: 'new-feature', source_ref: 'input/origin-checkpoint.json', source_digest: asset('input/origin-checkpoint.json').digest }
  }, { root });
  const save = () => write(checkpointRef, checkpoint);
  const reload = () => Object.assign(checkpoint, JSON.parse(read(checkpointRef)));
  save();
  const options = {
    root, checkpointRef, checkIds: [...boundaries], roleId: 'role.product-manager', runtimeId: 'runtime.generic', actorId: 'synthetic.plan-reviewer',
    reviewerPrincipalRef: 'synthetic.independent-reviewer', drafterPrincipalRef: 'synthetic.packet-owner', implementationActorId: 'synthetic.plan-author',
    taskId: 'synthetic.plan-initial', reviewSessionId: 'synthetic:plan-one', workUnitId: parseDocument(String(read('.template-spec/agents/digital-human-roles.yaml'))).toJS().gate_policy.review_execution.review_bundles.find(row => row.aggregate_gate === 'gate.plan-approved').work_unit,
    outputDir: 'docs/.scratch/feature.demo/reviews/initial', reviewPhase: 'initial'
  };
  const changeSubject = (boundary = boundaries[0], rule = '提交后校验，失败可修正') => {
    const row = checkpoint[boundary.startsWith('check.') ? 'checks' : 'gates'][boundary];
    const subject = JSON.parse(read(row.subject_ref)); subject.rule = rule;
    write(row.subject_ref, subject); row.subject_digest = asset(row.subject_ref).digest; save();
  };
  return { root, read, write, asset, checkpointRef, checkpoint, options, save, reload, changeSubject, synthetic_fixture: true };
}

/** Complete a real transaction path using explicitly synthetic reviewer evidence. */
export function completeSyntheticPlanReview(fixture) {
  const f = fixture, prepared = prepareReviewPackage(f.options), task = JSON.parse(f.read(prepared.task_ref)), binding = task.review_context.plan_review_binding;
  writePlanReviewCheckpoint(f.checkpointRef, checkpoint => dispatchPlanReview(checkpoint.plan_review_control, binding, { root: f.root }), { root: f.root });
  const resultRef = path.posix.join(f.options.outputDir, 'result.json');
  const result = { synthetic_fixture: true, plan_review_binding: binding, outcome: 'passed', check_results: f.options.checkIds.map(check_id => ({ check_id, status: 'passed' })), findings: [] };
  f.write(resultRef, result);
  writePlanReviewCheckpoint(f.checkpointRef, checkpoint => completePlanReview(checkpoint.plan_review_control, binding, { ...result, result_ref: resultRef, result_digest: f.asset(resultRef).digest }, { root: f.root }), { root: f.root });
  f.reload();
  const bundle = parseDocument(String(f.read(prepared.bundle_ref))).toJS();
  for (const row of bundle.reviews) row.decision = 'approved';
  const approvedRef = path.posix.join(f.options.outputDir, 'approved-bundle.json');
  f.write(approvedRef, bundle);
  for (const row of bundle.reviews) {
    const original = f.checkpoint.checks[row.gate_id];
    Object.assign(original, { status: 'approved', approval_ref: approvedRef, basis: [...original.basis, f.asset(original.subject_ref), f.asset(approvedRef)] });
  }
  f.save();
  return { prepared, task, binding, resultRef, bundle, approvedRef };
}
