import { decisionIO, decisionDigest, decisionError, assertUserDecisionRequirement } from './user-decision.mjs';

export const CONTINUATION_CAPABILITY = 'approved-scope-continuation-v1';
const fail = message => decisionError('user-decision-continuation-invalid', message);
const strings = value => Array.isArray(value) && value.length > 0 && value.every(x => typeof x === 'string' && x.trim()) && new Set(value).size === value.length;
const sameSet = (a, b) => strings(a) && strings(b) && a.length === b.length && a.every(x => b.includes(x));
const basisFields = ['business_scope', 'acceptance', 'contract_commitments', 'authorization', 'risk_acceptance', 'quality', 'external_commitments'];

// A continuation validates an explicit human mandate and an independent current
// review. It never infers semantic equivalence from whitespace or a boolean flag.
export function assertDecisionContinuation(requirement, roles, options = {}) {
  const io = decisionIO(options);
  const policy = roles.user_decision_policy.continuation;
  if (policy?.capability !== CONTINUATION_CAPABILITY || !policy.boundaries.includes(requirement.boundary)) fail('未授权的延续边界');
  const proof = io.document(requirement.continuation_ref);
  if (proof.schema_version !== 1 || proof.kind !== CONTINUATION_CAPABILITY || proof.boundary !== requirement.boundary || proof.subject?.ref !== requirement.subject_ref || !sameSet(proof.scope, requirement.scope)) fail('当前边界、资产或范围不匹配');
  const current = (asset, parse = true) => {
    if (!asset?.ref || !asset.version || !asset.digest || decisionDigest(io.bytes(asset.ref)) !== asset.digest) fail(`当前证据缺失或过期: ${asset?.ref}`);
    return parse ? io.document(asset.ref) : null;
  };
  if (!proof.source || proof.source.continuation_ref || proof.source.boundary !== 'delivery-scope') fail('必须引用原始交付范围批准，不能链式扩权');
  const sourceResult = assertUserDecisionRequirement(proof.source, { ...options, rolesDoc: roles });
  const mandate = io.document(proof.source.subject_ref);
  if (mandate.schema_version !== 1 || mandate.kind !== 'delivery-authorization' || !Array.isArray(mandate.targets)) fail('缺少已展示并批准的交付授权清单');
  if (!requirement.scope.every(x => proof.source.scope.includes(x))) fail('超出原始批准范围');
  const matches = mandate.targets.filter(x => x.boundary === requirement.boundary && x.subject_ref === requirement.subject_ref && requirement.scope.every(s => x.scope?.includes(s)));
  if (matches.length !== 1) fail('原授权未唯一覆盖当前边界、资产和范围');
  const target = matches[0];
  if (!basisFields.every(key => strings(target.decision_basis?.[key]))) fail('原授权缺少业务、验收、契约、授权、风险、质量或对外承诺依据');
  if (!Array.isArray(mandate.basis) || !mandate.basis.length) fail('原授权缺少可读取的决定依据');
  for (const asset of mandate.basis) {
    if (!asset.ref || !asset.version || decisionDigest(io.bytes(asset.ref)) !== asset.digest) fail('原授权决定依据变化，须重新决定');
  }
  const external = current(mandate.external_policy);
  if (external.status !== 'confirmed' || !Array.isArray(external.requirements)) fail('项目外部审批要求尚未确认，不能自动延续');
  current(proof.subject, false);
  if (requirement.boundary === 'implementation-scope') {
    const manifest = io.document(proof.subject.ref);
    if (manifest.kind !== 'implementation-scope' || !Array.isArray(manifest.slices)) fail('实施范围清单无效');
    for (const ticket of requirement.scope) {
      const slices = manifest.slices.filter(x => x.ticket_ref === ticket);
      const limit = target.implementation_limits?.[ticket];
      if (slices.length !== 1 || !limit || !sameSet(slices[0].repositories, limit.repositories) || !sameSet(slices[0].allowed_write_paths, limit.allowed_write_paths)) fail('实施仓库或写路径超出原授权边界');
    }
  }
  if (!Array.isArray(proof.basis) || !proof.basis.length) fail('缺少本次实际验证证据');
  for (const asset of proof.basis) {
    if (!asset.ref || !asset.version || decisionDigest(io.bytes(asset.ref)) !== asset.digest) fail('本次验证证据过期');
  }
  const review = current(proof.review);
  const actor = roles.roles.find(x => x.id === review.role_id);
  if (!actor || !roles.runtimes.some(x => x.id === review.runtime_id) || !review.principal_ref || !review.drafter_principal_ref || review.principal_ref === review.drafter_principal_ref) fail('缺少独立专业审查身份');
  const eligible = roles.gate_policy.continuation_reviews?.[requirement.boundary] || roles.gate_policy.dual_digital_human?.find(x => x.gate === requirement.boundary)?.countersigners;
  if (!eligible?.includes(review.role_id)) fail('审查能力不覆盖当前边界');
  if (review.decision !== 'approved' || !['within-approved-scope', 'presentation-only', 'implementation-detail'].includes(review.classification)) fail('未知或实质变化须重新决定');
  if (!Array.isArray(review.material_changes) || review.material_changes.length || !Array.isArray(review.findings)) fail('存在实质变化或未完成影响分析');
  for (const finding of review.findings) {
    if (!finding.id || !finding.reason || !['requirement-violation', 'missing-evidence', 'important-risk', 'suggestion'].includes(finding.kind)) fail('审查发现未分类');
    if (finding.kind === 'suggestion' && !finding.follow_up) fail('非阻断建议缺少待办去向');
    if (finding.kind !== 'suggestion' && finding.status !== 'resolved') fail('未解决的缺陷、证据缺口或重要风险');
  }
  if (review.boundary !== requirement.boundary || !sameSet(review.scope, requirement.scope) || decisionDigest(review.subject) !== decisionDigest(proof.subject) || decisionDigest(review.basis) !== decisionDigest(proof.basis)) fail('审查未绑定当前资产、范围和验证证据');
  if (decisionDigest(review.decision_basis) !== decisionDigest(target.decision_basis)) fail('决定依据有实质变化');
  if (!review.reason?.trim() || !review.comparison?.before || !review.comparison?.after) fail('缺少可审阅的前后差异和等价性说明');
  // Before is an immutable, originally approved snapshot; after is the current candidate.
  const before = review.comparison.before;
  if (!mandate.basis.some(x => decisionDigest(x) === decisionDigest(before)) || decisionDigest(review.comparison.after) !== decisionDigest(proof.subject)) fail('前后差异未绑定原授权快照和当前资产');
  for (const obligation of external.requirements) {
    if (!obligation.id || !strings(obligation.boundaries) || !strings(obligation.principals)) fail('外部审批制度记录不完整');
    if (!obligation.boundaries.includes(requirement.boundary)) continue;
    for (const principal of obligation.principals) {
      const reply = proof.external_decisions?.find(x => x.obligation_id === obligation.id && x.principal_ref === principal);
      if (!reply || reply.requirement?.continuation_ref || reply.requirement?.boundary !== requirement.boundary || reply.requirement?.subject_ref !== requirement.subject_ref || !sameSet(reply.requirement?.scope, requirement.scope)) fail('外部强制审批缺失或范围不符');
      const result = assertUserDecisionRequirement(reply.requirement, { ...options, rolesDoc: roles });
      if (!result.validated.length || result.validated.some(x => x.principal_ref !== principal)) fail('外部审批人与制度要求不符');
    }
  }
  return { ...sourceResult, continued: true, review_ref: proof.review.ref };
}
