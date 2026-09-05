import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import {
  BIOLOGICAL_ROLE_ID,
  countersignRuleForGate,
  loadDigitalHumanRoles,
  collectCountersignGateIds
} from "./digital-human-roles.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
import { assertUserDecisionRequirement, assertWorkUnitUserDecision, assertImplementationDecision } from "./user-decision.mjs";

const DECISIONS = new Set(["approved", "rejected", "vetoed"]);
const ACTOR_KINDS = new Set(["digital-human", "biological-human", "orchestrator"]);

function fail(message) {
  throw new TypeError(message);
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`);
}

function yamlFromFile(filePath, label) {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") fail(`缺少${label}: ${filePath}`);
    throw error;
  }
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length > 0) fail(`无法解析${label}: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label}必须是对象`);
  return value;
}

export function loadApprovalRecord(filePath) {
  return yamlFromFile(filePath, "会签记录");
}

export function resolveApprovalRef(approvalRef, fromFile = ROOT) {
  requireString(approvalRef, "approval_ref");
  if (path.isAbsolute(approvalRef)) return approvalRef;
  const fromRoot = path.join(ROOT, approvalRef);
  if (existsSync(fromRoot)) return fromRoot;
  return path.resolve(path.dirname(fromFile), approvalRef);
}

export function validateApprovalRecord(record, { rolesDoc, requireApproved = false, ...decisionOptions } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) fail("会签记录必须是对象");
  if (record.schema_version !== 1) fail("会签记录 schema_version 必须为 1");
  requireString(record.gate_id, "gate_id");
  requireString(record.decision, "decision");
  if (!DECISIONS.has(record.decision)) fail("decision 必须是 approved、rejected 或 vetoed");
  requireString(record.actor_kind, "actor_kind");
  if (!ACTOR_KINDS.has(record.actor_kind)) fail("actor_kind 无效");
  requireString(record.role_id, "role_id");
  requireString(record.runtime_id, "runtime_id");
  requireString(record.principal_ref, "principal_ref");

  const registry = rolesDoc || loadDigitalHumanRoles();
  const runtimeIds = new Set((registry.runtimes || []).map((runtime) => runtime.id));
  if (!runtimeIds.has(record.runtime_id)) fail(`未知 runtime_id: ${record.runtime_id}`);
  if (record.actor_kind === "orchestrator") fail("编排器门禁不使用会签记录关闭");

  const rule = countersignRuleForGate(registry.gate_policy, record.gate_id);
  if (!rule) fail(`${record.gate_id} 不是会签门禁；evidence_only / orchestrator 门禁不写 approval-record`);

  if (requireApproved && record.decision !== "approved") {
    fail(`${record.gate_id} 会签 decision 必须为 approved 才能关闭门禁`);
  }
  if (record.decision === "approved" && record.biological_veto === true) {
    fail(`${record.gate_id} 已被生物人否决，不能标为 approved`);
  }

  if (rule.bucket === "biological_human") {
    if (record.actor_kind !== "biological-human") fail(`${record.gate_id} 必须由生物人会签`);
    if (record.role_id !== BIOLOGICAL_ROLE_ID) fail(`${record.gate_id} 的 role_id 必须为 ${BIOLOGICAL_ROLE_ID}`);
    if (requireApproved) assertRecordUserDecision(record, registry, decisionOptions);
    return rule;
  }

  if (record.actor_kind !== "digital-human") fail(`${record.gate_id} 必须由数字人会签`);
  if (!rule.countersigners.includes(record.role_id)) {
    fail(`${record.gate_id} 会签角色必须是 ${rule.countersigners.join(" / ")}`);
  }
  if (rule.drafter && record.role_id === rule.drafter) fail(`${record.gate_id} 起草者不得会签自己`);
  if (Array.isArray(record.countersigner_role_ids) && rule.drafter && record.countersigner_role_ids.includes(rule.drafter)) {
    fail(`${record.gate_id} 起草者不得出现在 countersigner_role_ids`);
  }
  if (rule.drafter && record.drafter_role_id && record.drafter_role_id !== rule.drafter) {
    fail(`${record.gate_id} drafter_role_id 必须为 ${rule.drafter}`);
  }
  if (requireApproved) assertRecordUserDecision(record, registry, decisionOptions);
  return rule;
}

function assertRecordUserDecision(record, registry, options) {
  if (!registry.user_decision_policy.gates.includes(record.gate_id) && countersignRuleForGate(registry.gate_policy, record.gate_id)?.bucket !== "biological_human") return;
  const result = assertUserDecisionRequirement({ boundary: record.gate_id, subject_ref: record.subject_ref, scope: record.approval_scope, user_decision_ref: record.user_decision_ref }, { ...options, rolesDoc: registry });
  if (record.actor_kind === "biological-human" && result.validated.some((item) => item.principal_ref !== record.principal_ref)) fail("user-decision-responder-mismatch: 生物人会签者与原始回复者不一致");
}

export function validateApprovalRecordFile(filePath, options = {}) {
  return validateApprovalRecord(loadApprovalRecord(filePath), options);
}

export function assertApprovedGateHasValidApproval(gateId, gateState, { checkpointPath } = {}) {
  const rolesDoc = loadDigitalHumanRoles();
  const countersignGates = new Set(collectCountersignGateIds(rolesDoc.gate_policy));
  if (!countersignGates.has(gateId)) return;
  if (!gateState || typeof gateState !== "object") fail(`${gateId} 缺少门禁状态`);
  if (gateState.status !== "approved") return;
  if (!gateState.approval_ref || !String(gateState.approval_ref).trim()) {
    fail(`${gateId} 已 approved 但缺少 approval_ref`);
  }
  const resolved = resolveApprovalRef(gateState.approval_ref, checkpointPath || ROOT);
  if (!existsSync(resolved)) fail(`${gateId} 的 approval_ref 不可读: ${gateState.approval_ref}`);
  const record = loadApprovalRecord(resolved);
  if (record.gate_id !== gateId) fail(`${gateId} 的会签记录 gate_id 不匹配`);
  if (rolesDoc.user_decision_policy.gates.includes(gateId) || countersignRuleForGate(rolesDoc.gate_policy, gateId)?.bucket === "biological_human") {
    if (!gateState.subject_ref || gateState.subject_ref !== record.subject_ref || JSON.stringify([...(gateState.approval_scope || [])].sort()) !== JSON.stringify([...(record.approval_scope || [])].sort())) {
      fail(`${gateId} user-decision-subject-mismatch: 当前门禁资产与会签范围不匹配`);
    }
  }
  validateApprovalRecord(record, { rolesDoc, requireApproved: true });
}

export function assertCheckpointApprovals(checkpoint, checkpointPath) {
  const gates = checkpoint?.gates;
  if (!gates || typeof gates !== "object") return;
  for (const [gateId, state] of Object.entries(gates)) {
    assertApprovedGateHasValidApproval(gateId, state, { checkpointPath });
  }
}

// Called on resume/transition as well as completion; drafting while waiting stays allowed.
export function assertCheckpointUserDecisions(checkpoint) {
  if (checkpoint.repository_mode !== "project-instance") return;
  const review = checkpoint.human_review || {};
  const advancing = ["running", "completed"].includes(checkpoint.status) || (checkpoint.mode === "resume" && checkpoint.status === "routing");
  if (!advancing) return;
  const state = { user_decisions: review.user_decisions || [], user_decision_not_applicable: review.not_applicable || [] };
  const completedUnit = checkpoint.stage_trace?.completed_work_unit;
  if (completedUnit) assertWorkUnitUserDecision(completedUnit, state);
  if (checkpoint.next_work_unit === "work-unit.slice-implementation") assertImplementationDecision({ ...review.implementation, ...state });
  for (const requirement of review.required_decisions || []) assertUserDecisionRequirement(requirement);
  if (review.external_input) assertUserDecisionRequirement({ ...review.external_input, boundary: "external-input" });
  if (checkpoint.status === "completed") {
    if (checkpoint.gates?.["gate.release-ready"]?.status !== "approved") throw new TypeError("user-decision-response-required: 阶段完成须发布就绪裁决");
  }
}
