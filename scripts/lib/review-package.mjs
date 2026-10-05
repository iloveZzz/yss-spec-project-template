import fs from 'node:fs';
import path from 'node:path';
import { parseDocument, stringify } from '../vendor/yaml.mjs';
import { ROOT } from './lifecycle-registry.mjs';
import { taskPackageDefaults } from './digital-human-roles.mjs';
import { validateTaskPackageSchema } from './task-package-schema.mjs';
import { validateJsonSchema } from './json-schema.mjs';
import { REVIEW_POLICY_REF, reviewDigest, reviewLocalPath, reviewAuthorityRegistries, compileReviewCapabilities, currentApprovalsDigest, currentApprovalsFromCheckpoint, validateReviewTaskBinding } from './review-capabilities.mjs';
import { isPlanReview, loadPlanReviewPolicy, planReviewRequest, bindPlanReviewAttempt } from './plan-review-control.mjs';
import { runAssetTransaction } from './asset-transactions.mjs';
import { serializeAsset, validateAssetStructure } from './structured-assets.mjs';

const error = message => { throw new TypeError(message); };
const parse = (bytes, label) => { const doc = parseDocument(String(bytes), { uniqueKeys: true, maxAliasCount: 0 }); if (doc.errors.length) error(`无法解析 ${label}`); return doc.toJS({ maxAliasCount: 0 }); };
const json = value => JSON.stringify(value, null, 2) + '\n';
const join = (directory, file) => path.posix.join(directory, file);
function requireText(value, name) { if (typeof value !== 'string' || !value.trim()) error(`缺少 ${name}`); }
function unionBasis(rows) {
  const result = new Map();
  for (const row of rows) for (const basis of row.basis) {
    if (result.has(basis.ref) && result.get(basis.ref).digest !== basis.digest) error(`依据摘要冲突: ${basis.ref}`);
    result.set(basis.ref, { ...basis });
  }
  return [...result.values()].sort((a, b) => a.ref.localeCompare(b.ref));
}
function textDiff(before, after) {
  if (before === undefined) return '未提供历史审阅包，无法比较旧内容。此处只登记当前输入；不得据此判断无实质变化。\n';
  if (before === after) return '原始字节未变化；此机械比较不构成专业审查或批准。\n';
  const a = before.split('\n'), b = after.split('\n');
  let prefix = 0, suffix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - suffix - 1] === b[b.length - suffix - 1]) suffix++;
  return ['机械字节差异，实质影响由独立 Reviewer 判断。', '```diff', '--- 原审阅包', '+++ 当前审阅包', ...a.slice(Math.max(0, prefix - 3), prefix).map(line => ' ' + line), ...a.slice(prefix, a.length - suffix).map(line => '-' + line), ...b.slice(prefix, b.length - suffix).map(line => '+' + line), ...b.slice(b.length - suffix, b.length - suffix + 3).map(line => ' ' + line), '```', ''].join('\n');
}
/** Build draft evidence from current checkpoint rows. Never sets an approved decision. */
export function buildReviewPackage({ checkpointRef, checkIds, roleId, runtimeId = 'runtime.generic', actorId, reviewerPrincipalRef, drafterPrincipalRef, implementationActorId, taskId, reviewSessionId, workUnitId, outputDir, previousSubjectRef, reviewPhase, reviewInputRef, targetFindingIds, resolutionEvidence, root = ROOT, registry, skillRegistry }) {
  root = fs.realpathSync(root);
  for (const [name, value] of Object.entries({ checkpointRef, roleId, runtimeId, actorId, reviewerPrincipalRef, drafterPrincipalRef, implementationActorId, taskId, reviewSessionId, workUnitId, outputDir })) requireText(value, name);
  const read = file => fs.readFileSync(file), bytes = ref => read(reviewLocalPath(root, ref));
  ({registry,skillRegistry}=reviewAuthorityRegistries({root,read,registry,skillRegistry}));
  const policyBytes = bytes(REVIEW_POLICY_REF), rolesDoc = parse(policyBytes, REVIEW_POLICY_REF);
  const compiled = compileReviewCapabilities({ checkIds, roleId, rolesDoc, registry, skillRegistry });
  const rows = currentApprovalsFromCheckpoint(checkpointRef, checkIds, { root, read });
  if (rows.some(row => row.drafter_principal_ref === reviewerPrincipalRef) || reviewerPrincipalRef === drafterPrincipalRef || actorId === implementationActorId) error('审查实例必须独立于所有起草者和实现者');
  if (!rolesDoc.runtimes.some(x => x.id === runtimeId)) error(`未登记 runtime: ${runtimeId}`);
  if (!registry.work_units.some(x => x.id === workUnitId)) error(`未登记 work unit: ${workUnitId}`);
  const basis = unionBasis(rows);
  for(const ref of ['.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/yss-skill-registry.yaml']) if(fs.existsSync(reviewLocalPath(root,ref,{missing:true})) && !basis.some(row=>row.ref===ref)) basis.push({ref,digest:reviewDigest(bytes(ref))});
  const scope = [...new Set(rows.flatMap(row => row.approval_scope))].sort();
  const subjectRef = join(outputDir, 'subject.json'), taskRef = join(outputDir, 'task.json'), resultRef = join(outputDir, 'result.json');
  reviewLocalPath(root, outputDir, { missing: true });
  const plan = isPlanReview(checkIds, { root, read });
  let reservation, planCheckpoint;
  if (plan) {
    if (checkIds.includes('gate.plan-approved')) error('PLAN_REVIEW_AGGREGATE_REUSE: Plan 聚合结论消费内部组合审查，不另派专业审查');
    const bundleRule = rolesDoc.gate_policy.review_execution?.review_bundles?.find(rule => rule.aggregate_gate === 'gate.plan-approved');
    if (!bundleRule || bundleRule.work_unit !== workUnitId) error('PLAN_REVIEW_WORK_UNIT_INVALID: Plan 组合审查须使用角色表登记的工作单元');
    const checkpoint = parse(bytes(checkpointRef), checkpointRef);
    const reviewInput = reviewInputRef ? parse(bytes(reviewInputRef), reviewInputRef) : {};
    if (Object.keys(reviewInput).some(key => !['target_finding_ids','resolution_evidence'].includes(key))) error('PLAN_REVIEW_INPUT_INVALID: 定向输入只允许问题范围和解决证据');
    reservation = planReviewRequest(checkpoint, {
      checkpoint_ref: checkpointRef, feature_id: checkpoint.feature_id,
      scope_ids: checkpoint.plan_review_control?.scope_ids,
      scope_digest: checkpoint.plan_review_control?.scope_digest,
      phase: reviewPhase || 'initial', check_ids: checkIds,
      candidate_ref: subjectRef, candidate_digest: currentApprovalsDigest(rows),
      basis, task_ref: taskRef,
      target_finding_ids: targetFindingIds || reviewInput.target_finding_ids,
      resolution_evidence: resolutionEvidence || reviewInput.resolution_evidence,
    }, { root, read });
    if (reservation.reusedAttempt) return { reused_attempt: reservation.control.attempts.find(attempt => attempt.attempt_id === reservation.binding.attempt_id), reservation };
    planCheckpoint = { ...checkpoint, plan_review_control: reservation.control };
  } else if (reviewPhase) error('PLAN_REVIEW_PHASE_INVALID: --review-phase 只用于 Plan 专业审查');
  const subject = { schema_version: 1, kind: 'review-subject', source_checkpoint: { ref: checkpointRef, digest: currentApprovalsDigest(rows), binding_kind:'current-approvals-v1' }, current_approvals: rows };
  if (plan) subject.plan_review_binding = reservation.binding;
  const subjectText = json(subject), defaults = taskPackageDefaults(roleId, rolesDoc);
  const task = {
    schema_version: 1, role_id: roleId,
    skill_source: { registry_ref: REVIEW_POLICY_REF, defaults_ref: `taskPackageDefaults(${roleId})`, core_skills: defaults.core_skills, forbidden_skills: defaults.forbidden_skills, review_skills: compiled.review_skills },
    task_id: taskId, work_unit_id: workUnitId, actor_id: actorId, runtime_id: runtimeId,
    stage_id: compiled.review_stages[0], checkpoint_ref: checkpointRef,
    execution_state: 'Reviewer', workflow_status: 'active',
    contract: { kind: 'lifecycle-work-unit', contract_id: `review.${taskId}`, contract_version: 1, status: 'issued', contract_ref: subjectRef, lifecycle_ref: checkpointRef },
    inputs: [...new Set([checkpointRef, REVIEW_POLICY_REF, subjectRef, ...rows.map(row => row.subject_ref), ...basis.map(x => x.ref),
      ...(plan ? [reservation.control.policy_ref, ...(['.template-spec/process/harness-profile.yaml'].filter(ref => fs.existsSync(reviewLocalPath(root, ref, { missing: true }))))] : [])])],
    objective: '对同一当前候选逐项独立审查，回传结论和证据；草案不授予批准或实现权限。',
    allowed_write_paths: [resultRef], forbidden_actions: ['不得修改候选、实现、政策、用户回复或当前 checkpoint', '不得会签自己起草的资产', '能力技能仅用于审查，不得扩大 Worker 或跨端写范围'],
    expected_outputs: ['逐项结论、发现、实际验证证据；由主控核对当前绑定'], expected_evidence_files: [resultRef],
    verification_commands: ['scripts/verify-approval-record --require-approved --checkpoint ' + checkpointRef + ' ' + join(outputDir, 'bundle-draft.yaml')], verification_results: [],
    review_context: { implementation_actor_id: implementationActorId, ...compiled, candidate_ref: subjectRef, candidate_digest: reviewDigest(subjectText), policy_ref: REVIEW_POLICY_REF, policy_digest: reviewDigest(policyBytes), reviewer_principal_ref: reviewerPrincipalRef, drafter_principal_ref: drafterPrincipalRef, approval_scope: scope, basis, current_approvals: rows },
    downstream_consumers: ['生命周期主控'], convergence: { parent_work_unit: workUnitId, convergence_ref: checkpointRef, conflict_escalation: '缺陷、缺证据和未知影响回交主控，不自行修改范围' }
  };
  // review_stages is an implementation result, not part of the persisted contract.
  delete task.review_context.review_stages;
  delete task.review_context.review_skills;
  if (plan) task.review_context.plan_review_binding = reservation.binding;
  validateTaskPackageSchema(task);
  const taskText = json(task), taskDigest = reviewDigest(taskText);
  if (plan) planCheckpoint.plan_review_control = bindPlanReviewAttempt(reservation.control, reservation.binding.attempt_id, { task_ref: taskRef, task_digest: taskDigest }, { root, read });
  const overlayRead = file => path.resolve(file) === path.resolve(root, subjectRef) ? Buffer.from(subjectText)
    : plan && path.resolve(file) === path.resolve(root, checkpointRef) ? Buffer.from(serializeAsset(planCheckpoint))
    : path.resolve(file) === path.resolve(root, taskRef) ? Buffer.from(taskText) : read(file);
  validateReviewTaskBinding(task, { rolesDoc, registry, skillRegistry, root, read: overlayRead });
  const bundle = {
    schema_version: 2, kind: 'review-bundle', bundle_id: plan ? loadPlanReviewPolicy({ root, read }).bundle_id : `review-bundle.${taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`, task_id: taskId, work_unit_id: workUnitId, review_session_id: reviewSessionId,
    role_id: roleId, runtime_id: runtimeId, principal_ref: reviewerPrincipalRef,
    review_task_ref: taskRef, review_task_digest: taskDigest, capability_ids: compiled.capability_ids, basis,
    reviews: rows.map(row => ({ schema_version: 2, gate_id: row.boundary, decision: 'pending', actor_kind: 'digital-human', role_id: roleId, runtime_id: runtimeId, principal_ref: reviewerPrincipalRef, drafter_principal_ref: row.drafter_principal_ref, subject_ref: row.subject_ref, subject_digest: row.subject_digest, approval_scope: row.approval_scope, basis: row.basis, evidence_refs: row.basis.map(x => x.ref), review_task_ref: taskRef, review_task_digest: taskDigest, capability_ids: compiled.capability_ids })),
    notes: '所有行均待独立专业审查；自动化只形成当前输入、差异和覆盖草案，不产生 approved 结论。'
  };
  if (plan) bundle.plan_review_binding = reservation.binding;
  validateJsonSchema(bundle, path.join(ROOT, '.template-spec/process/schemas/review-bundle.schema.json'));
  const names = new Map([...registry.gates, ...(registry.checks || [])].map(x => [x.id, x.public_name || x.name]));
  const coverage = ['# 当前审阅包草案', '', '状态：待独立专业审查。来源、能力和摘要已机械绑定；没有批准、用户同意或实现资格。', '', `任务：${taskId}；同一独立实例：${reviewerPrincipalRef}；能力：${compiled.capability_ids.join('、')}。`, '', '| 检查 | 当前主体 | 范围 | 作者 | 依据 | 结论 |', '|---|---|---|---|---|---|', ...rows.map(row => `| ${names.get(row.boundary)}（${row.boundary}） | ${row.subject_ref} (${row.subject_digest}) | ${row.approval_scope.join('、')} | ${row.drafter_principal_ref} | ${row.basis.map(x => `${x.ref} (${x.digest})`).join('；')} | 待审查 |`), '', '每个检查保留独立结论。能力缺口增专家；未知影响先调查。实际验证与阻断由 Reviewer 记录，主控重新核对当前版本。', ''].join('\n');
  const diff = textDiff(previousSubjectRef ? String(bytes(previousSubjectRef)) : undefined, subjectText);
  const files = { 'subject.json': subjectText, 'task.json': taskText, 'bundle-draft.yaml': stringify(bundle, { lineWidth: 0, aliasDuplicateObjects: false }), 'coverage.md': coverage, 'diff.md': '# 审阅包原始差异\n\n' + diff };
  if (plan) validateAssetStructure(planCheckpoint, 'checkpoint', { schemaRoot: root });
  return { task, bundle, subject, files, task_ref: taskRef, task_digest: taskDigest, subject_ref: subjectRef, subject_digest: reviewDigest(subjectText), decision: 'pending', execution_authorization: 'not-granted', ...(plan ? { plan_checkpoint: planCheckpoint, checkpoint_before: { digest: 'sha256:' + reviewDigest(bytes(checkpointRef)), mode: fs.statSync(reviewLocalPath(root, checkpointRef)).mode & 0o777 } } : {}) };
}
export function prepareReviewPackage(options) {
  const root = fs.realpathSync(options.root || ROOT), built = buildReviewPackage({ ...options, root });
  if (built.reused_attempt) {
    const attempt = built.reused_attempt;
    const task = parse(fs.readFileSync(reviewLocalPath(root, attempt.task_ref)), attempt.task_ref);
    validateReviewTaskBinding(task, { root });
    return { reused: true, ...(options.dryRun ? { dry_run: true } : {}), task_ref: attempt.task_ref, task_digest: attempt.task_digest, attempt_id: attempt.attempt_id, plan_review_binding: built.reservation.binding, decision: 'pending', execution_authorization: 'not-granted' };
  }
  if (options.dryRun) return { dry_run: true, task_ref: built.task_ref, subject_ref: built.subject_ref, decision: 'pending', execution_authorization: 'not-granted', plan_review_binding: built.task.review_context.plan_review_binding ?? null };
  const directory = reviewLocalPath(root, options.outputDir, { missing: true });
  if (fs.existsSync(directory)) error('审阅包输出目录必须不存在；不得覆盖历史证据');
  if (built.plan_checkpoint) {
    const checkpointText = serializeAsset(built.plan_checkpoint), checkpointFile = reviewLocalPath(root, options.checkpointRef);
    const changes = [{ ref: options.checkpointRef, before: built.checkpoint_before, after_digest: 'sha256:' + reviewDigest(checkpointText) },
      ...Object.entries(built.files).map(([name, content]) => ({ ref: join(options.outputDir, name), before: null, after_digest: 'sha256:' + reviewDigest(content) }))];
    try { return runAssetTransaction(root, changes, () => {
      // Validate the original live input under the transaction lock before publishing the reservation.
      const rows = currentApprovalsFromCheckpoint(options.checkpointRef, options.checkIds, { root });
      if (currentApprovalsDigest(rows) !== built.subject.source_checkpoint.digest) error('REVIEW_BINDING_STALE: 准备期间业务输入已变更');
      fs.mkdirSync(directory, { recursive: true });
      for (const [name, content] of Object.entries(built.files)) fs.writeFileSync(reviewLocalPath(root, join(options.outputDir, name), { missing: true }), content, { flag: 'wx' });
      const temporary = checkpointFile + '.plan-review-' + process.pid;
      try { fs.writeFileSync(temporary, checkpointText, { flag: 'wx', mode: built.checkpoint_before.mode }); fs.renameSync(temporary, checkpointFile); }
      finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
      validateReviewTaskBinding(built.task, { root, registry: options.registry, skillRegistry: options.skillRegistry });
      return { task_ref: built.task_ref, task_digest: built.task_digest, subject_ref: built.subject_ref, subject_digest: built.subject_digest, bundle_ref: join(options.outputDir, 'bundle-draft.yaml'), coverage_ref: join(options.outputDir, 'coverage.md'), diff_ref: join(options.outputDir, 'diff.md'), plan_review_binding: built.task.review_context.plan_review_binding, decision: 'pending', execution_authorization: 'not-granted' };
    }); } catch (failure) {
      // The transaction restores files; remove only our now-empty directory.
      if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
      throw failure;
    }
  }
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  const staging = fs.mkdtempSync(path.join(path.dirname(directory), '.review-package-'));
  try {
    for (const [file, content] of Object.entries(built.files)) fs.writeFileSync(path.join(staging, file), content, { flag: 'wx' });
    // Re-read every input after building, before publishing the draft atomically.
    validateReviewTaskBinding(built.task, { root, registry: options.registry, skillRegistry:options.skillRegistry, read: file => file === path.resolve(root, built.subject_ref) ? Buffer.from(built.files['subject.json']) : fs.readFileSync(file) });
    reviewLocalPath(root, options.outputDir, { missing: true });
    if (fs.existsSync(directory)) error('输出目录在准备期间出现，拒绝覆盖');
    fs.renameSync(staging, directory);
    return { task_ref: built.task_ref, task_digest: built.task_digest, subject_ref: built.subject_ref, subject_digest: built.subject_digest, bundle_ref: join(options.outputDir, 'bundle-draft.yaml'), coverage_ref: join(options.outputDir, 'coverage.md'), diff_ref: join(options.outputDir, 'diff.md'), decision: 'pending', execution_authorization: 'not-granted' };
  } finally { if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true }); }
}
