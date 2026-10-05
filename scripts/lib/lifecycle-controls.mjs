import { readFileSync, withValidationPhase } from './validation-phase.mjs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';
import { loadRegistry, ROOT } from './lifecycle-registry.mjs';
import { loadDigitalHumanRoles, countersignRuleForGate } from './digital-human-roles.mjs';
import {loadApprovalRecord} from './approval-record-io.mjs';
import {assertCurrentApproval, approvalExpectationFromState} from './approval-current.mjs';
import {assertPlanAggregateApproval} from './plan-spec-entry.mjs';

const fail = message => { throw new TypeError(`lifecycle-control-blocked: ${message}`); };

// Checks retain their own evidence and independent review; only the aggregate requests a user decision.
export function assertGateChecks(gateId, state, options = {}) {
  return withValidationPhase({root:options.root || ROOT,purpose:'current-gate-checks',readOnly:true},()=>validateGateChecks(gateId,state,options));
}
function validateGateChecks(gateId, state, { root = ROOT, registry = loadRegistry(), rolesDoc = loadDigitalHumanRoles() } = {}) {
  const gate = registry.gates.find(item => item.id === gateId);
  if (!gate) fail(`未知或已退役门禁: ${gateId}`);
  const controls = new Map(registry.checks.map(item => [item.id, item]));
  const seen = new Set();
  const evidence = item => {
    if (!Array.isArray(item.basis) || !item.basis.length) fail('缺少当前证据摘要');
    const refs = new Set();
    for (const asset of item.basis) {
      if (!asset?.ref || refs.has(asset.ref)) fail('证据引用缺失或重复');
      refs.add(asset.ref);
      const bytes = readFileSync(path.resolve(root, asset.ref));
      if (createHash('sha256').update(bytes).digest('hex') !== asset.digest) fail(`证据过期: ${asset.ref}`);
    }
    return refs;
  };
  function check(id) {
    if (seen.has(id)) return;
    seen.add(id);
    const definition = controls.get(id), item = state.checks?.[id];
    if (!definition || !item) fail(`缺少检查: ${id}`);
    const refs = evidence(item);
    if (item.status === 'not-applicable') {
      if (item.applicable !== false || !item.reason?.trim()) fail(`${id} 未命中须有影响面、原因和证据`);
      return;
    }
    if (item.applicable !== true || !['passed', 'approved'].includes(item.status)) fail(`${id} 未通过或未评估`);
    for (const dependency of definition.requires_checks || []) {
      check(dependency);
      if (state.checks[dependency].status === 'not-applicable') fail(`${id} 前置检查不适用，必须重新评估依赖`);
    }
    for (const kind of definition.evidence || []) {
      if (!item.evidence?.[kind]?.length || item.evidence[kind].some(ref => !refs.has(ref))) fail(`${id} 缺少绑定证据: ${kind}`);
    }
    const rule = countersignRuleForGate(rolesDoc.gate_policy, id);
    if (rule) {
      if (!refs.has(item.approval_ref) || !refs.has(item.subject_ref)) fail(`${id} 未绑定审查与资产`);
      const record = loadApprovalRecord(path.resolve(root, item.approval_ref), id);
      assertCurrentApproval(record,approvalExpectationFromState(id,item,{root}),{rolesDoc,registry,root});
    }
  }
  for (const id of gate.requires_checks || []) check(id);
  const item = state.gates?.[gateId];
  if (!item || item.status !== 'approved') fail(`${gateId} 未批准`);
  const refs = evidence(item);
  for (const kind of gate.evidence) {
    if (!item.evidence?.[kind]?.length || item.evidence[kind].some(ref => !refs.has(ref))) fail(`${gateId} 缺少绑定证据: ${kind}`);
  }
  const approvalRequired = countersignRuleForGate(rolesDoc.gate_policy, gateId);
  if (approvalRequired) {
    if (!refs.has(item.approval_ref) || !refs.has(item.subject_ref)) fail(`${gateId} 缺少已绑定批准记录和审阅包`);
    const boundedPlan = state.plan_review_control || rolesDoc.gate_policy.review_execution?.review_bundles?.some(rule =>
      rule.aggregate_gate === 'gate.plan-approved' && rule.aggregate_additional_review_task === 'forbidden');
    if (gateId === 'gate.plan-approved' && boundedPlan) assertPlanAggregateApproval(state, {rolesDoc,registry,root});
    else {
      const record = loadApprovalRecord(path.resolve(root, item.approval_ref), gateId);
      assertCurrentApproval(record,approvalExpectationFromState(gateId,item,{root}),{rolesDoc,registry,root});
    }
  }
  // Bind the aggregate approval to the exact check evidence it covers.
  for (const id of seen) for (const asset of state.checks[id].basis) {
    if (!item.basis.some(bound => bound.ref === asset.ref && bound.digest === asset.digest)) fail(`${gateId} 未覆盖检查依据: ${id}/${asset.ref}`);
  }
  return { gate: gateId, checks: [...seen], result: 'passed' };
}
