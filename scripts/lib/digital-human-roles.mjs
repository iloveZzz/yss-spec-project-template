import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadRegistry, ROOT } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";

export const DEFAULT_DIGITAL_HUMAN_ROLES = path.join(ROOT, "docs/agents/digital-human-roles.yaml");

const ROLE_ID = /^role\.[a-z0-9][a-z0-9-]*$/;
const GROUP_ID = /^group\.[a-z0-9][a-z0-9-]*$/;
const REQUIRED_ROLES = [
  "role.requirements-manager",
  "role.product-manager",
  "role.business",
  "role.project-manager",
  "role.frontend-engineer",
  "role.backend-engineer",
  "role.test-engineer"
];
const GATE_BUCKETS = [
  "evidence_only",
  "orchestrator",
  "digital_human_review",
  "product_digital_human_with_biological_veto",
  "biological_human"
];

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

function knownActorIds(doc) {
  return new Set([doc.orchestrator.id, ...doc.roles.map((role) => role.id)]);
}

function validateSkills(list, field, skillIds) {
  requireStringArray(list, field);
  for (const skill of list) {
    if (!skillIds.has(skill)) fail(`${field} 引用了未登记技能: ${skill}`);
  }
}

function validateActor(actor, { skillIds, stageIds, artifactIds, expectedKind }) {
  requireString(actor.id, `${expectedKind}.id`);
  if (!ROLE_ID.test(actor.id)) fail(`${actor.id} 不符合 role.*`);
  requireString(actor.name, `${actor.id}.name`);
  if (actor.kind !== expectedKind) fail(`${actor.id}.kind 必须为 ${expectedKind}`);
  requireString(actor.grok_title, `${actor.id}.grok_title`);
  requireString(actor.grok_description, `${actor.id}.grok_description`);
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
  validateSkills(actor.core_skills, `${actor.id}.core_skills`, skillIds);
  validateSkills(actor.forbidden_skills, `${actor.id}.forbidden_skills`, skillIds);
  const overlap = actor.core_skills.filter((skill) => actor.forbidden_skills.includes(skill));
  if (overlap.length > 0) fail(`${actor.id} 的 core_skills 与 forbidden_skills 重叠: ${overlap.join(", ")}`);
}

export function validateDigitalHumanRoles(doc, { skillIds, stageIds, gateIds, artifactIds, workUnitIds } = {}) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) fail("数字人角色注册表必须是对象");
  if (doc.schema_version !== 1) fail("schema_version 必须为 1");
  if (doc.registry_id !== "yss.digital-human-roles") fail("registry_id 必须为 yss.digital-human-roles");
  if (doc.status !== "active") fail("status 必须为 active");
  requireString(doc.description, "description");
  if (doc.canonical_path !== "docs/agents/digital-human-roles.yaml") fail("canonical_path 必须为 docs/agents/digital-human-roles.yaml");
  const runtime = doc.runtime_policy;
  if (!runtime || typeof runtime !== "object") fail("缺少 runtime_policy");
  if (runtime.overlay_on_lifecycle !== true) fail("runtime_policy.overlay_on_lifecycle 必须为 true");
  if (runtime.git_is_ssot !== true) fail("runtime_policy.git_is_ssot 必须为 true");
  if (runtime.shared_computer_is_not_security_boundary !== true) {
    fail("runtime_policy.shared_computer_is_not_security_boundary 必须为 true");
  }
  if (runtime.max_group_size !== 6 || runtime.min_group_size !== 2) fail("群聊人数必须为 2–6");
  if (runtime.default_invocation !== "orchestrator") fail("default_invocation 必须为 orchestrator");
  if (runtime.dispatch !== "orchestrator-one-to-one") fail("dispatch 必须为 orchestrator-one-to-one");
  if (runtime.per_feature_bots !== "forbidden") fail("per_feature_bots 必须为 forbidden");
  if (runtime.implementer_must_differ !== true) fail("implementer_must_differ 必须为 true");
  if (runtime.biological_veto !== true) fail("biological_veto 必须为 true");

  const orchestrator = doc.orchestrator;
  if (!orchestrator || typeof orchestrator !== "object") fail("缺少 orchestrator");
  validateActor(orchestrator, { skillIds, stageIds, artifactIds, expectedKind: "orchestrator" });
  requireStringArray(orchestrator.grok_default_dual_hat, "orchestrator.grok_default_dual_hat");
  if (!Array.isArray(doc.roles) || doc.roles.length === 0) fail("roles 不能为空");
  const roleIds = [];
  for (const role of doc.roles) {
    validateActor(role, { skillIds, stageIds, artifactIds, expectedKind: "digital-human" });
    roleIds.push(role.id);
  }
  if (new Set(roleIds).size !== roleIds.length) fail("roles.id 重复");
  if (roleIds.slice().sort().join("\0") !== REQUIRED_ROLES.slice().sort().join("\0")) {
    fail(`v1 必须恰好包含: ${REQUIRED_ROLES.join(", ")}`);
  }
  if (roleIds.includes(orchestrator.id)) fail("orchestrator 不得再出现在 roles");
  for (const dual of orchestrator.grok_default_dual_hat) {
    if (!roleIds.includes(dual)) fail(`grok_default_dual_hat 引用了未知角色: ${dual}`);
  }

  const actors = knownActorIds(doc);
  if (!Array.isArray(doc.stage_groups) || doc.stage_groups.length === 0) fail("缺少 stage_groups");
  const groupIds = [];
  for (const group of doc.stage_groups) {
    requireString(group.id, "stage_groups.id");
    if (!GROUP_ID.test(group.id)) fail(`${group.id} 不符合 group.*`);
    groupIds.push(group.id);
    requireString(group.name, `${group.id}.name`);
    if (!stageIds.has(group.stage)) fail(`${group.id} 引用了未知阶段: ${group.stage}`);
    requireStringArray(group.members, `${group.id}.members`);
    if (group.members.length < runtime.min_group_size || group.members.length > runtime.max_group_size) {
      fail(`${group.id} 成员数必须为 ${runtime.min_group_size}–${runtime.max_group_size}，当前 ${group.members.length}`);
    }
    for (const member of group.members) {
      if (!actors.has(member)) fail(`${group.id} 包含未知成员: ${member}`);
    }
  }
  if (new Set(groupIds).size !== groupIds.length) fail("stage_groups.id 重复");

  const policy = doc.gate_policy;
  if (!policy || typeof policy !== "object") fail("缺少 gate_policy");
  if (policy.default_if_unlisted !== "biological-human") fail("default_if_unlisted 必须为 biological-human");
  if (policy.grok_platform_approval !== "biological-human") fail("grok_platform_approval 必须为 biological-human");
  if (policy.commercial_contract !== "biological-human") fail("commercial_contract 必须为 biological-human");
  const claimed = new Set();
  for (const bucket of GATE_BUCKETS) {
    requireStringArray(policy[bucket], `gate_policy.${bucket}`);
    for (const gate of policy[bucket]) {
      if (!gateIds.has(gate)) fail(`gate_policy.${bucket} 引用了未知门禁: ${gate}`);
      if (claimed.has(gate)) fail(`门禁被多个会签桶重复占用: ${gate}`);
      claimed.add(gate);
    }
  }
  if (policy.digital_human_review.includes("gate.release-ready")) {
    fail("gate.release-ready 不得放入 digital_human_review");
  }
  if (!policy.biological_human.includes("gate.release-ready")) {
    fail("gate.release-ready 必须属于 biological_human");
  }
  requireStringArray(policy.digital_human_review_work_units, "gate_policy.digital_human_review_work_units");
  for (const workUnit of policy.digital_human_review_work_units) {
    if (!workUnitIds.has(workUnit)) fail(`未知工作单元: ${workUnit}`);
  }
  if (!Array.isArray(policy.dual_digital_human) || policy.dual_digital_human.length === 0) {
    fail("缺少 dual_digital_human");
  }
  for (const rule of policy.dual_digital_human) {
    if (!gateIds.has(rule.gate)) fail(`dual_digital_human 引用了未知门禁: ${rule.gate}`);
    if (claimed.has(rule.gate)) fail(`dual_digital_human 与其他桶重复: ${rule.gate}`);
    claimed.add(rule.gate);
    if (!actors.has(rule.drafter)) fail(`dual_digital_human 起草者未知: ${rule.drafter}`);
    requireStringArray(rule.countersigners, `${rule.gate}.countersigners`);
    if (rule.countersigners.includes(rule.drafter)) fail(`${rule.gate} 起草者不得会签自己`);
    for (const signer of rule.countersigners) {
      if (!actors.has(signer)) fail(`${rule.gate} 会签人未知: ${signer}`);
    }
  }

  return {
    role_count: doc.roles.length,
    group_count: doc.stage_groups.length,
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
    workUnitIds: idsFromCollection(lifecycle.work_units, "work_units")
  });
}
