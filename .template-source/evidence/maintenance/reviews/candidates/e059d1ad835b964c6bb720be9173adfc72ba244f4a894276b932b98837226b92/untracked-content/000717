import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadDigitalHumanRoles } from "./digital-human-roles.mjs";
import { loadRegistry, ROOT } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";
import { lifecycleTransitionContract } from "./lifecycle-transition.mjs";

export const DEFAULT_PROFILE = path.join(ROOT, "docs/process/harness-profile.yaml");
export const STRATEGIC_PROFILE_ID = "harness.business-ddd-strategy-handoff";
const TARGET_ROLES = ["role.product-manager", "role.requirements-manager", "role.business"];
const CONTROL_ROLES = ["role.lifecycle-orchestrator"];
const ALLOWED_WORK_UNITS = [
  "work-unit.discovery-opportunity",
  "work-unit.discovery-requirements",
  "work-unit.domain-strategy-design",
  "work-unit.stage-decision",
  "work-unit.spec-synthesis",
  "work-unit.prototype-design",
  "work-unit.business-ticket-formalization",
  "work-unit.strategic-design-handoff",
];

function fail(message) { throw new TypeError(message); }
function parseYaml(filePath, label) {
  const document = parseDocument(readFileSync(filePath, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length > 0) fail(`无法解析${label}: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label}必须是对象`);
  return value;
}
function equalArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}
function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`);
}
function requireExistingRelative(filePath, field) {
  requireString(filePath, field);
  if (path.isAbsolute(filePath) || !existsSync(path.resolve(ROOT, filePath))) fail(`${field} 不可读: ${filePath}`);
}

export function loadHarnessProfile(filePath = DEFAULT_PROFILE) {
  return parseYaml(filePath, "Harness profile");
}

export function validateHarnessProfile(profile = loadHarnessProfile(), {
  lifecycle = loadRegistry(),
  roles = loadDigitalHumanRoles(),
  skills = loadSkillRegistry(),
} = {}) {
  if (profile.schema_version !== 1) fail("Harness profile schema_version 必须为 1");
  if (profile.profile_id !== STRATEGIC_PROFILE_ID) fail(`只支持 ${STRATEGIC_PROFILE_ID}`);
  if (profile.status !== "active") fail("Harness profile status 必须为 active");
  requireString(profile.name, "profile.name");
  requireString(profile.purpose, "profile.purpose");

  const roleIds = new Set([roles.orchestrator?.id, ...(roles.roles || []).map((role) => role.id)]);
  for (const [field, values] of [["target_user_roles", TARGET_ROLES], ["control_plane_roles", CONTROL_ROLES]]) {
    if (!equalArray(profile.audience?.[field], values)) fail(`audience.${field} 必须严格匹配 profile 角色边界`);
    for (const role of values) if (!roleIds.has(role)) fail(`audience.${field} 引用了未知角色: ${role}`);
  }
  if (new Set(profile.audience.target_user_roles).size !== profile.audience.target_user_roles.length) fail("target_user_roles 不得重复");
  requireString(profile.audience.non_target_role_policy, "audience.non_target_role_policy");
  requireString(profile.audience.boundary, "audience.boundary");

  const stageIds = new Set((lifecycle.stages || []).map((stage) => stage.id));
  const workUnitIds = new Set((lifecycle.work_units || []).map((unit) => unit.id));
  if (!equalArray(profile.lifecycle.allowed_work_units, ALLOWED_WORK_UNITS)) fail("lifecycle.allowed_work_units 与策略 profile 不一致");
  if (profile.lifecycle.repository_modes?.length !== 1 || profile.lifecycle.repository_modes[0] !== "project-instance") fail("profile 只适用于 project-instance");
  requireString(profile.lifecycle.entry_work_unit, "lifecycle.entry_work_unit");
  requireString(profile.lifecycle.terminal_work_unit, "lifecycle.terminal_work_unit");
  requireString(profile.lifecycle.terminal_stage, "lifecycle.terminal_stage");
  for (const id of [profile.lifecycle.entry_work_unit, profile.lifecycle.terminal_work_unit, ...profile.lifecycle.allowed_work_units, ...(profile.lifecycle.forbidden_work_units || [])]) {
    if (!workUnitIds.has(id)) fail(`lifecycle 引用了未知工作单元: ${id}`);
  }
  if (!stageIds.has(profile.lifecycle.terminal_stage)) fail(`lifecycle.terminal_stage 引用了未知阶段: ${profile.lifecycle.terminal_stage}`);
  if (profile.lifecycle.forbidden_work_units.some((id) => profile.lifecycle.allowed_work_units.includes(id))) fail("allowed_work_units 与 forbidden_work_units 不得重叠");
  if (profile.lifecycle.terminal_work_unit !== "work-unit.strategic-design-handoff") fail("战略设计交付 profile 必须在 strategic-design-handoff 终止");
  if (profile.lifecycle.terminal_stage !== "stage.ticket-formalization") fail("战略设计交付 profile 必须在 Ticket 正式化阶段终止");
  const transition = lifecycleTransitionContract.profile_next_routes?.[profile.profile_id];
  if (!transition || JSON.stringify(transition[profile.lifecycle.terminal_work_unit]) !== "[]") fail("profile 终止工作单元必须没有下一路由");

  if (profile.handoff.downstream_skill !== "yss-tactical-design") fail("handoff.downstream_skill 必须为下游 yss-tactical-design");
  if (profile.handoff.downstream_output !== "tactical-design-contract") fail("handoff.downstream_output 必须为 tactical-design-contract");
  requireExistingRelative(profile.handoff.package_template, "handoff.package_template");
  requireExistingRelative(profile.handoff.package_schema, "handoff.package_schema");
  for (const artifact of profile.handoff.required_source_artifacts || []) {
    if (!(lifecycle.artifacts || []).some((item) => item.id === artifact)) fail(`handoff.required_source_artifacts 引用了未知产物: ${artifact}`);
  }
  if (!Array.isArray(profile.handoff.required_sections) || profile.handoff.required_sections.length < 6) fail("handoff.required_sections 不完整");
  if (!Array.isArray(profile.handoff.acceptance) || profile.handoff.acceptance.length < 4) fail("handoff.acceptance 不完整");
  return {
    profile_id: profile.profile_id,
    target_user_roles: [...profile.audience.target_user_roles],
    terminal_work_unit: profile.lifecycle.terminal_work_unit,
    downstream_skill: profile.handoff.downstream_skill,
  };
}

export const harnessProfileContract = Object.freeze({
  profile_id: STRATEGIC_PROFILE_ID,
  target_user_roles: TARGET_ROLES,
  control_plane_roles: CONTROL_ROLES,
  allowed_work_units: ALLOWED_WORK_UNITS,
});
