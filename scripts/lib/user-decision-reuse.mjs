import { assertUserDecisionRequirement, decisionIO, decisionDigest, decisionError } from './user-decision.mjs';

export const DECISION_REUSE_CAPABILITY = 'strategic-decision-reuse-v1';
const fail = detail => decisionError('user-decision-reuse-invalid', detail);
const sameSet = (a,b) => Array.isArray(a) && Array.isArray(b) && a.length === new Set(a).size && b.length === new Set(b).size && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// A reuse record is a coverage proof, never a new reply or a substitute for one.
export function assertApprovalUserDecision(record, roles, options = {}) {
  const policy = roles.user_decision_policy;
  const io = decisionIO(options);
  if (policy.required_capabilities?.some(id => id !== DECISION_REUSE_CAPABILITY)) fail('接收工具不支持源用户决定策略，请升级');
  if (!record.decision_reuse_ref) return assertUserDecisionRequirement({boundary:record.gate_id,subject_ref:record.subject_ref,scope:record.approval_scope,user_decision_ref:record.user_decision_ref}, {...options,rolesDoc:roles});
  if (record.gate_id !== 'gate.strategic-design-handoff-approved' || !policy.required_capabilities?.includes(DECISION_REUSE_CAPABILITY)) fail('未登记的复用边界或能力');
  const reuse = io.document(record.decision_reuse_ref);
  if (reuse.schema_version !== 1 || reuse.kind !== DECISION_REUSE_CAPABILITY || reuse.target_gate !== record.gate_id || reuse.scope_ref !== record.subject_ref || !sameSet(reuse.scope, record.approval_scope)) fail('目标边界、资产或范围不匹配');
  const manifest = io.document(reuse.scope_ref);
  if (manifest.schema_version !== 1 || manifest.kind !== 'strategic-delivery-scope' || !Array.isArray(manifest.assets) || !manifest.assets.length || !Array.isArray(manifest.risks) || !Array.isArray(manifest.conditions)) fail('交付范围清单不完整');
  if (!Array.isArray(reuse.requirements) || !reuse.requirements.length) fail('缺少原决定');
  const approved = [];
  for (const requirement of reuse.requirements) {
    const result = assertUserDecisionRequirement(requirement,{...options,rolesDoc:roles});
    const source = io.document(requirement.user_decision_ref);
    for (const item of source.request.items.filter(item => result.validated.some(v => v.item_id === item.id))) approved.push({item, requirement});
  }
  const identities = new Set();
  for (const asset of manifest.assets) {
    if (!asset.ref || !asset.version || !asset.boundary || !Array.isArray(asset.scope) || !asset.scope.length || identities.has(`${asset.boundary}:${asset.ref}`)) fail('资产缺少身份、专业边界、范围或重复');
    identities.add(`${asset.boundary}:${asset.ref}`);
    if (decisionDigest(io.bytes(asset.ref)) !== asset.digest) fail(`资产已变化: ${asset.ref}`);
    const covering = approved.filter(({item,requirement}) => item.boundary === asset.boundary && asset.scope.every(s => requirement.scope.includes(s)) && [item.subject,...item.basis].some(a => a.ref === asset.ref && a.version === asset.version && a.digest === asset.digest));
    if (!covering.length) fail(`没有原决定覆盖: ${asset.ref} / ${asset.boundary}`);
  }
  const coveredScope = new Set(manifest.assets.flatMap(asset => asset.scope));
  if (!reuse.scope.length || reuse.scope.some(s => !coveredScope.has(s))) fail('交付范围超出资产批准范围');
  for (const risk of manifest.risks) if (!approved.some(({item}) => item.risks.includes(risk))) fail(`新增未接受风险: ${risk}`);
  for (const condition of manifest.conditions) if (!approved.some(({item}) => item.next_actions.includes(condition))) fail(`新增授权条件: ${condition}`);
  return {reused:true,manifest,validated:approved.map(({item})=>({item_id:item.id,principal_ref:item.responder_ref}))};
}
