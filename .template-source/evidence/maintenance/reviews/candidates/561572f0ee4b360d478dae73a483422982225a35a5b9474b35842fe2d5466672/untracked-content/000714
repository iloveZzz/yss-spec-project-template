import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadRegistry, ROOT } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";

export const DEFAULT_DIGITAL_HUMAN_ROLES = path.join(ROOT, "docs/agents/digital-human-roles.yaml");

const ROLE_ID = /^role\.[a-z0-9][a-z0-9-]*$/;
const GROUP_ID = /^group\.[a-z0-9][a-z0-9-]*$/;
const RUNTIME_ID = /^runtime\.[a-z0-9][a-z0-9-]*$/;
const REQUIRED_ROLES = [
  "role.requirements-manager",
  "role.product-manager",
  "role.business"
];
const REQUIRED_RUNTIMES = ["runtime.generic", "runtime.skill-projection", "runtime.grok"];
const REQUIRED_DUAL_HAT_SPLIT = ["cross-repo-load", "responsibility-conflict"];
const STRING_GATE_BUCKETS = [
  "evidence_only",
  "orchestrator",
  "product_digital_human_with_biological_veto",
  "biological_human"
];
const COUNTERSIGN_STRING_BUCKETS = ["product_digital_human_with_biological_veto", "biological_human"];
export const BIOLOGICAL_ROLE_ID = "role.biological-human";
const OVERFLOWS = new Set(["not-applicable", "one-to-one-handoff", "forbid"]);
const GROK_FIELDS = ["grok_title", "grok_description", "grok_default_dual_hat", "grok_runtime_root", "grok_platform_approval"];

function fail(message) {
  throw new TypeError(message);
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

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`);
}

function requireStringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(`${field} 必须是非空字符串数组`);
  }
  if (new Set(value).size !== value.length) fail(`${field} 包含重复项`);
}
function requireStringArrayOrEmpty(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) fail(`${field} 必须是字符串数组`);
  if (new Set(value).size !== value.length) fail(`${field} 包含重复项`);
}

function idsFromCollection(records, kind) {
  if (!Array.isArray(records)) fail(`生命周期注册表缺少 ${kind}`);
  return new Set(records.map((record) => record.id));
}

export function skillIdsFromRegistry(skillRegistry) {
  const ids = new Set();
  for (const collection of ["skills", "platform_skills", "external_skills"]) {
    const records = skillRegistry[collection];
    if (!records) continue;
    if (!Array.isArray(records)) fail(`技能注册表 ${collection} 必须是数组`);
    for (const record of records) {
      if (!record?.id) fail(`技能注册表 ${collection} 缺少 id`);
      ids.add(record.id);
    }
  }
  return ids;
}

function rejectGrokCoupling(object, label) {
  if (!object || typeof object !== "object") return;
  for (const field of GROK_FIELDS) {
    if (Object.hasOwn(object, field)) fail(`${label} 不得包含平台耦合字段 ${field}`);
  }
}

function knownActorIds(doc) {
  return new Set([doc.orchestrator.id, ...doc.roles.map((role) => role.id)]);
}

function validateSkills(list, field, skillIds) {
  requireStringArrayOrEmpty(list, field);
  for (const skill of list) {
    if (!skillIds.has(skill)) fail(`${field} 引用了未登记技能: ${skill}`);
  }
}

function validateActor(actor, { skillIds, stageIds, artifactIds, evidenceIds, expectedKind }) {
  rejectGrokCoupling(actor, actor?.id || expectedKind);
  requireString(actor.id, `${expectedKind}.id`);
  if (!ROLE_ID.test(actor.id)) fail(`${actor.id} 不符合 role.*`);
  requireString(actor.name, `${actor.id}.name`);
  if (actor.kind !== expectedKind) fail(`${actor.id}.kind 必须为 ${expectedKind}`);
  requireString(actor.title, `${actor.id}.title`);
  requireString(actor.description, `${actor.id}.description`);
  requireStringArray(actor.stages, `${actor.id}.stages`);
  for (const stage of actor.stages) {
    if (!stageIds.has(stage)) fail(`${actor.id} 引用了未知阶段: ${stage}`);
  }
  if (actor.draft_artifact_ids) {
    requireStringArray(actor.draft_artifact_ids, `${actor.id}.draft_artifact_ids`);
    for (const artifact of actor.draft_artifact_ids) {
      if (!artifactIds.has(artifact)) fail(`${actor.id} 引用了未知产物: ${artifact}`);
    }
  }
  if (actor.owned_evidence_ids) {
    requireStringArray(actor.owned_evidence_ids, `${actor.id}.owned_evidence_ids`);
    for (const evidence of actor.owned_evidence_ids) {
      if (!evidenceIds || !evidenceIds.has(evidence)) fail(`${actor.id} 引用了未知证据: ${evidence}`);
    }
  }
  validateSkills(actor.core_skills, `${actor.id}.core_skills`, skillIds);
  validateSkills(actor.forbidden_skills, `${actor.id}.forbidden_skills`, skillIds);
  const overlap = actor.core_skills.filter((skill) => actor.forbidden_skills.includes(skill));
  if (overlap.length > 0) fail(`${actor.id} 的 core_skills 与 forbidden_skills 重叠: ${overlap.join(", ")}`);
}

function validateRuntimes(doc, skillRegistry, groupSizes) {
  if (!Array.isArray(doc.runtimes) || doc.runtimes.length === 0) fail("缺少 runtimes");
  const ids = [];
  let sawProjection = false;
  for (const runtime of doc.runtimes) {
    requireString(runtime.id, "runtimes.id");
    if (!RUNTIME_ID.test(runtime.id)) fail(`${runtime.id} 不符合 runtime.*`);
    ids.push(runtime.id);
    requireString(runtime.kind, `${runtime.id}.kind`);
    requireString(runtime.instance_kind, `${runtime.id}.instance_kind`);
    requireString(runtime.collaboration, `${runtime.id}.collaboration`);
    requireString(runtime.side_effect_approval, `${runtime.id}.side_effect_approval`);
    if (runtime.side_effect_approval !== "biological-human") {
      fail(`${runtime.id}.side_effect_approval 必须为 biological-human`);
    }
    if (!OVERFLOWS.has(runtime.overflow)) fail(`${runtime.id}.overflow 无效`);
    if (typeof runtime.covers_skill_registry_roots !== "boolean") {
      fail(`${runtime.id}.covers_skill_registry_roots 必须是布尔值`);
    }
    if (runtime.covers_skill_registry_roots) sawProjection = true;
    const max = runtime.max_collaboration_group_size;
    if (max == null) {
      if (runtime.overflow !== "not-applicable") fail(`${runtime.id} 无人数上限时 overflow 必须为 not-applicable`);
    } else {
      if (!Number.isInteger(max) || max < 2) fail(`${runtime.id}.max_collaboration_group_size 必须是 >=2 的整数`);
      if (runtime.overflow === "not-applicable") fail(`${runtime.id} 有人数上限时必须声明 overflow`);
      if (runtime.overflow === "forbid") {
        for (const [groupId, size] of groupSizes) {
          if (size > max) fail(`${runtime.id} 禁止超过 ${max} 人的阶段协作组: ${groupId} 有 ${size} 人`);
        }
      }
    }
    if (runtime.id === "runtime.grok") {
      if (runtime.kind !== "grok-bot") fail("runtime.grok.kind 必须为 grok-bot");
      if (runtime.max_collaboration_group_size !== 6) fail("runtime.grok 群聊上限必须为 6");
      if (runtime.shared_workspace_is_not_security_boundary !== true) {
        fail("runtime.grok 必须声明共享工作区不是安全边界");
      }
    }
    if (runtime.id === "runtime.generic" && runtime.max_collaboration_group_size != null) {
      fail("runtime.generic 不得设置平台群聊上限");
    }
  }
  if (new Set(ids).size !== ids.length) fail("runtimes.id 重复");
  for (const required of REQUIRED_RUNTIMES) {
    if (!ids.includes(required)) fail(`缺少运行时绑定: ${required}`);
  }
  if (!sawProjection) fail("必须有 covers_skill_registry_roots=true 的运行时，以覆盖技能注册表投影根");
  const roots = skillRegistry.agent_runtime_roots;
  if (!roots || typeof roots !== "object") fail("技能注册表缺少 agent_runtime_roots");
}

function validateSignRule(rule, { actors, gateIds, claimed, field }) {
  if (!rule || typeof rule !== "object") fail(`${field} 必须是对象`);
  requireString(rule.gate, `${field}.gate`);
  if (!gateIds.has(rule.gate)) fail(`${field} 引用了未知门禁: ${rule.gate}`);
  if (claimed.has(rule.gate)) fail(`门禁被多个会签桶重复占用: ${rule.gate}`);
  claimed.add(rule.gate);
  if (rule.drafter != null) {
    requireString(rule.drafter, `${rule.gate}.drafter`);
    if (!actors.has(rule.drafter)) fail(`${rule.gate} 起草者未知: ${rule.drafter}`);
  }
  requireStringArray(rule.countersigners, `${rule.gate}.countersigners`);
  if (rule.drafter && rule.countersigners.includes(rule.drafter)) fail(`${rule.gate} 起草者不得会签自己`);
  for (const signer of rule.countersigners) {
    if (!actors.has(signer)) fail(`${rule.gate} 会签人未知: ${signer}`);
  }
}

export function collectCountersignGateIds(policy) {
  const ids = [];
  for (const bucket of COUNTERSIGN_STRING_BUCKETS) {
    const gates = policy?.[bucket];
    if (Array.isArray(gates)) ids.push(...gates);
  }
  for (const rule of policy?.digital_human_review || []) {
    if (rule?.gate) ids.push(rule.gate);
  }
  for (const rule of policy?.dual_digital_human || []) {
    if (rule?.gate) ids.push(rule.gate);
  }
  return ids;
}

export function countersignRuleForGate(policy, gateId) {
  const dual = (policy?.dual_digital_human || []).find((rule) => rule.gate === gateId);
  if (dual) return { bucket: "dual_digital_human", ...dual };
  const review = (policy?.digital_human_review || []).find((rule) => rule.gate === gateId);
  if (review) return { bucket: "digital_human_review", ...review };
  if ((policy?.product_digital_human_with_biological_veto || []).includes(gateId)) {
    return { bucket: "product_digital_human_with_biological_veto", gate: gateId, countersigners: ["role.product-manager"] };
  }
  if ((policy?.biological_human || []).includes(gateId)) {
    return { bucket: "biological_human", gate: gateId, countersigners: [BIOLOGICAL_ROLE_ID] };
  }
  return null;
}

export function taskPackageDefaults(roleId, doc) {
  const registry = doc || loadDigitalHumanRoles();
  const actor = roleId === registry.orchestrator.id
    ? registry.orchestrator
    : registry.roles.find((role) => role.id === roleId);
  if (!actor) fail(`未知角色: ${roleId}`);
  return {
    role_id: actor.id,
    kind: actor.kind,
    stages: [...actor.stages],
    core_skills: [...actor.core_skills],
    forbidden_skills: [...actor.forbidden_skills],
    draft_artifact_ids: actor.draft_artifact_ids ? [...actor.draft_artifact_ids] : [],
    owned_evidence_ids: actor.owned_evidence_ids ? [...actor.owned_evidence_ids] : []
  };
}

export function validateDigitalHumanRoles(doc, { skillIds, stageIds, gateIds, artifactIds, evidenceIds, workUnitIds, skillRegistry } = {}) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) fail("数字人角色注册表必须是对象");
  if (doc.schema_version !== 1) fail("schema_version 必须为 1");
  if (doc.registry_id !== "yss.digital-human-roles") fail("registry_id 必须为 yss.digital-human-roles");
  if (doc.status !== "active") fail("status 必须为 active");
  requireString(doc.description, "description");
  if (doc.canonical_path !== "docs/agents/digital-human-roles.yaml") fail("canonical_path 必须为 docs/agents/digital-human-roles.yaml");
  rejectGrokCoupling(doc.runtime_policy, "runtime_policy");
  rejectGrokCoupling(doc.gate_policy, "gate_policy");
  const runtime = doc.runtime_policy;
  if (!runtime || typeof runtime !== "object") fail("缺少 runtime_policy");
  if (runtime.overlay_on_lifecycle !== true) fail("runtime_policy.overlay_on_lifecycle 必须为 true");
  if (runtime.git_is_ssot !== true) fail("runtime_policy.git_is_ssot 必须为 true");
  if (runtime.default_invocation !== "orchestrator") fail("default_invocation 必须为 orchestrator");
  if (runtime.dispatch !== "orchestrator-one-to-one") fail("dispatch 必须为 orchestrator-one-to-one");
  if (runtime.per_feature_instances !== "forbidden") fail("per_feature_instances 必须为 forbidden");
  if (runtime.implementer_must_differ !== true) fail("implementer_must_differ 必须为 true");
  if (runtime.biological_veto !== true) fail("biological_veto 必须为 true");
  if (runtime.write_isolation !== "task-package-policy") fail("write_isolation 必须为 task-package-policy");
  requireStringArray(runtime.dual_hat_split_when, "runtime_policy.dual_hat_split_when");
  for (const required of REQUIRED_DUAL_HAT_SPLIT) {
    if (!runtime.dual_hat_split_when.includes(required)) {
      fail(`runtime_policy.dual_hat_split_when 必须包含 ${required}`);
    }
  }
  if (runtime.max_group_size != null || runtime.min_group_size != null) {
    fail("平台群聊人数上限属于 runtimes，不得写在 runtime_policy");
  }

  const orchestrator = doc.orchestrator;
  if (!orchestrator || typeof orchestrator !== "object") fail("缺少 orchestrator");
  validateActor(orchestrator, { skillIds, stageIds, artifactIds, evidenceIds, expectedKind: "orchestrator" });
  requireStringArrayOrEmpty(orchestrator.default_dual_hat, "orchestrator.default_dual_hat");
  if (!Array.isArray(doc.roles) || doc.roles.length === 0) fail("roles 不能为空");
  const roleIds = [];
  for (const role of doc.roles) {
    validateActor(role, { skillIds, stageIds, artifactIds, evidenceIds, expectedKind: "digital-human" });
    roleIds.push(role.id);
  }
  if (new Set(roleIds).size !== roleIds.length) fail("roles.id 重复");
  if (roleIds.slice().sort().join("\0") !== REQUIRED_ROLES.slice().sort().join("\0")) {
    fail(`v1 必须恰好包含: ${REQUIRED_ROLES.join(", ")}`);
  }
  if (roleIds.includes(orchestrator.id)) fail("orchestrator 不得再出现在 roles");
  for (const dual of orchestrator.default_dual_hat) {
    if (!roleIds.includes(dual)) fail(`default_dual_hat 引用了未知角色: ${dual}`);
  }

  const actors = knownActorIds(doc);
  if (!Array.isArray(doc.stage_groups) || doc.stage_groups.length === 0) fail("缺少 stage_groups");
  const groupIds = [];
  const groupSizes = [];
  for (const group of doc.stage_groups) {
    requireString(group.id, "stage_groups.id");
    if (!GROUP_ID.test(group.id)) fail(`${group.id} 不符合 group.*`);
    groupIds.push(group.id);
    requireString(group.name, `${group.id}.name`);
    if (!stageIds.has(group.stage)) fail(`${group.id} 引用了未知阶段: ${group.stage}`);
    requireStringArray(group.members, `${group.id}.members`);
    if (group.members.length < 2) fail(`${group.id} 逻辑协作组至少 2 人`);
    groupSizes.push([group.id, group.members.length]);
    for (const member of group.members) {
      if (!actors.has(member)) fail(`${group.id} 包含未知成员: ${member}`);
    }
  }
  if (new Set(groupIds).size !== groupIds.length) fail("stage_groups.id 重复");
  validateRuntimes(doc, skillRegistry, groupSizes);

  const policy = doc.gate_policy;
  if (!policy || typeof policy !== "object") fail("缺少 gate_policy");
  if (policy.default_if_unlisted !== "biological-human") fail("default_if_unlisted 必须为 biological-human");
  if (policy.runtime_side_effect_approval !== "biological-human") fail("runtime_side_effect_approval 必须为 biological-human");
  if (policy.commercial_contract !== "biological-human") fail("commercial_contract 必须为 biological-human");
  if (policy.unlisted_kept_biological) {
    requireStringArray(policy.unlisted_kept_biological, "gate_policy.unlisted_kept_biological");
    for (const gate of policy.unlisted_kept_biological) {
      if (!gateIds.has(gate)) fail(`unlisted_kept_biological 引用了未知门禁: ${gate}`);
    }
  }
  const claimed = new Set();
  for (const bucket of STRING_GATE_BUCKETS) {
    requireStringArray(policy[bucket], `gate_policy.${bucket}`);
    for (const gate of policy[bucket]) {
      if (!gateIds.has(gate)) fail(`gate_policy.${bucket} 引用了未知门禁: ${gate}`);
      if (claimed.has(gate)) fail(`门禁被多个会签桶重复占用: ${gate}`);
      claimed.add(gate);
    }
  }
  if (!Array.isArray(policy.digital_human_review) || policy.digital_human_review.length === 0) {
    fail("缺少 digital_human_review");
  }
  for (const [index, rule] of policy.digital_human_review.entries()) {
    if (typeof rule === "string") fail("digital_human_review 必须是含 gate 与 countersigners 的规则");
    validateSignRule(rule, { actors, gateIds, claimed, field: `digital_human_review[${index}]` });
    if (rule.gate === "gate.release-ready") fail("gate.release-ready 不得放入 digital_human_review");
  }
  if (!policy.biological_human.includes("gate.release-ready")) {
    fail("gate.release-ready 必须属于 biological_human");
  }
  if (!Array.isArray(policy.digital_human_review_work_units) || policy.digital_human_review_work_units.length === 0) {
    fail("缺少 digital_human_review_work_units");
  }
  const workUnitSeen = new Set();
  for (const [index, rule] of policy.digital_human_review_work_units.entries()) {
    if (typeof rule === "string") fail("digital_human_review_work_units 必须是含 work_unit 与 countersigners 的规则");
    requireString(rule.work_unit, `digital_human_review_work_units[${index}].work_unit`);
    if (!workUnitIds.has(rule.work_unit)) fail(`未知工作单元: ${rule.work_unit}`);
    if (workUnitSeen.has(rule.work_unit)) fail(`工作单元重复: ${rule.work_unit}`);
    workUnitSeen.add(rule.work_unit);
    requireStringArray(rule.countersigners, `${rule.work_unit}.countersigners`);
    for (const signer of rule.countersigners) {
      if (!actors.has(signer)) fail(`${rule.work_unit} 会签人未知: ${signer}`);
    }
    if (rule.implementer_must_differ !== true) {
      fail(`${rule.work_unit}.implementer_must_differ 必须为 true`);
    }
  }
  if (!Array.isArray(policy.dual_digital_human) || policy.dual_digital_human.length === 0) {
    fail("缺少 dual_digital_human");
  }
  for (const [index, rule] of policy.dual_digital_human.entries()) {
    validateSignRule(rule, { actors, gateIds, claimed, field: `dual_digital_human[${index}]` });
    if (!rule.drafter) fail(`${rule.gate} 双数字人会签必须有 drafter`);
  }
  for (const gate of policy.unlisted_kept_biological || []) {
    if (claimed.has(gate)) fail(`unlisted_kept_biological 与会签桶重复: ${gate}`);
  }

  return {
    role_count: doc.roles.length,
    group_count: doc.stage_groups.length,
    runtime_count: doc.runtimes.length,
    claimed_gates: claimed.size
  };
}

export function loadDigitalHumanRoles(filePath = DEFAULT_DIGITAL_HUMAN_ROLES) {
  return yamlFromFile(filePath, "数字人角色注册表");
}

export function validateDefaultDigitalHumanRoles() {
  const lifecycle = loadRegistry();
  const skills = loadSkillRegistry();
  return validateDigitalHumanRoles(loadDigitalHumanRoles(), {
    skillIds: skillIdsFromRegistry(skills),
    stageIds: idsFromCollection(lifecycle.stages, "stages"),
    gateIds: idsFromCollection(lifecycle.gates, "gates"),
    artifactIds: idsFromCollection(lifecycle.artifacts, "artifacts"),
    evidenceIds: idsFromCollection(lifecycle.evidence, "evidence"),
    workUnitIds: idsFromCollection(lifecycle.work_units, "work_units"),
    skillRegistry: skills
  });
}
