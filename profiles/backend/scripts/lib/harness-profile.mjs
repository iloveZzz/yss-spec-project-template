import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadDigitalHumanRoles } from "./digital-human-roles.mjs";
import { loadRegistry, ROOT } from "./lifecycle-registry.mjs";
import { isTemplateSource } from "./repository-mode.mjs";

export const DEFAULT_PROFILE = path.join(ROOT, ".template-spec/process/harness-profile.yaml");
export const DEV_AGENT_PROFILE_ID = "harness.backend-delivery";
export const TARGET_ROLES = [
  "role.architecture-agent",
  "role.backend-agent",
  "role.test-agent",
];
export const CONTROL_ROLES = ["role.harness-orchestrator"];
export const ALLOWED_WORK_UNITS = [
  "work-unit.harness-entry",
  "work-unit.technical-design",
  "work-unit.implementation-repository-preparation",
  "work-unit.slice-contract",
  "work-unit.slice-implementation",
  "work-unit.verification",
];
export const ALLOWED_STAGES = ["stage.harness-entry", "stage.technical-design", "stage.implementation-repository-preparation", "stage.slice-contract", "stage.slice-implementation", "stage.verification"];
export const CONSUMER_CAPABILITIES = ["backend-technical-design"];
export const FORBIDDEN_WORK_UNITS = [
  "work-unit.ssot-update",
  "work-unit.skill-projection-sync",
  "work-unit.intensity-aware-verification",
  "work-unit.intensity-aware-review",
  "work-unit.release-and-rollback",
];
export const INSTANTIATION = Object.freeze({
  cli_package: "yss",
  native_profile: "backend",
  metadata_file: ".yss.json",
  foreign_metadata_files: [".yss-template.json", ".yss-harness-dev.json", ".yss-harness-frontend.json"],
  template_source: "github:iloveZzz/yss-harness-backend-agent",
  distribution_manifest: ".template-source/distribution/template.manifest.json",
  command: "yss init --profile backend --root <directory>",
});

const LEGACY_INSTANTIATION = Object.freeze({
  legacy_cli_package: "create-yss-harness-backend",
  legacy_metadata_file: ".yss-harness-backend.json",
});

function fail(message) {
  throw new TypeError(message);
}

function parseYaml(filePath, label) {
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

function equalArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`);
}

export function loadHarnessProfile(filePath = DEFAULT_PROFILE) {
  return parseYaml(filePath, "Harness profile");
}

export function validateHarnessProfile(profile = loadHarnessProfile(), {
  lifecycle = loadRegistry(),
  roles = loadDigitalHumanRoles(),
} = {}) {
  if (profile.schema_version !== 2) fail("Harness profile schema_version 必须为 2");
  if (profile.profile_id !== DEV_AGENT_PROFILE_ID) fail(`只支持 ${DEV_AGENT_PROFILE_ID}`);
  if (profile.status !== "active") fail("Harness profile status 必须为 active");
  requireString(profile.name, "profile.name");
  requireString(profile.purpose, "profile.purpose");

  const roleIds = new Set([roles.orchestrator?.id, ...(roles.roles || []).map((role) => role.id)]);
  for (const [field, values] of [["target_user_roles", TARGET_ROLES], ["control_plane_roles", CONTROL_ROLES]]) {
    if (!equalArray(profile.audience?.[field], values)) fail(`audience.${field} 必须严格匹配后端专职角色边界`);
    for (const role of values) {
      if (!roleIds.has(role)) fail(`audience.${field} 引用了未知角色: ${role}`);
    }
  }
  if (new Set(profile.audience.target_user_roles).size !== profile.audience.target_user_roles.length) {
    fail("target_user_roles 不得重复");
  }
  requireString(profile.audience.non_target_role_policy, "audience.non_target_role_policy");
  requireString(profile.audience.boundary, "audience.boundary");

  const stageIds = new Set((lifecycle.stages || []).map((stage) => stage.id));
  const workUnitIds = new Set((lifecycle.work_units || []).map((unit) => unit.id));
  if (!equalArray(profile.lifecycle?.allowed_work_units, ALLOWED_WORK_UNITS)) {
    fail("lifecycle.allowed_work_units 必须是包含仓库准备的开发落地工作单元");
  }
  if (!equalArray(profile.lifecycle?.allowed_stages, ALLOWED_STAGES)) fail("lifecycle.allowed_stages 必须严格匹配后端交付阶段");
  if (!equalArray(profile.lifecycle?.forbidden_work_units, FORBIDDEN_WORK_UNITS)) {
    fail("lifecycle.forbidden_work_units 必须是 template-source 维护工作单元");
  }
  if (!equalArray(profile.lifecycle?.repository_modes, ["project-instance"])) {
    fail("profile 只适用于 project-instance");
  }
  if (profile.lifecycle.entry_work_unit !== "work-unit.harness-entry") {
    fail("lifecycle.entry_work_unit 必须为 work-unit.harness-entry");
  }
  if (profile.lifecycle.terminal_work_unit !== "work-unit.verification") {
    fail("lifecycle.terminal_work_unit 必须为 work-unit.verification");
  }
  if (profile.lifecycle.terminal_stage !== "stage.verification") {
    fail("lifecycle.terminal_stage 必须为 stage.verification");
  }
  for (const id of [
    profile.lifecycle.entry_work_unit,
    profile.lifecycle.terminal_work_unit,
    ...profile.lifecycle.allowed_work_units,
    ...profile.lifecycle.forbidden_work_units,
  ]) {
    if (!workUnitIds.has(id)) fail(`lifecycle 引用了未知工作单元: ${id}`);
  }
  if (!stageIds.has(profile.lifecycle.terminal_stage)) {
    fail(`lifecycle.terminal_stage 引用了未知阶段: ${profile.lifecycle.terminal_stage}`);
  }
  if (profile.lifecycle.allowed_work_units.some((id) => profile.lifecycle.forbidden_work_units.includes(id))) {
    fail("allowed_work_units 与 forbidden_work_units 不得重叠");
  }
  const activeProjectUnits=(lifecycle.work_units || []).filter((item)=>item.scope==="project-instance").map((item)=>item.id).sort();
  if (!equalArray(activeProjectUnits, [...ALLOWED_WORK_UNITS].sort())) fail("lifecycle 存在 profile 外活动工作单元");
  for (const item of [...(lifecycle.gates || []), ...(lifecycle.artifacts || [])]) if (item.stage && !ALLOWED_STAGES.includes(item.stage)) fail(`lifecycle 存在 profile 外活动阶段引用: ${item.id} -> ${item.stage}`);
  const published=new Set([...(lifecycle.stages || []).map((item)=>item.id), ...(lifecycle.gates || []).map((item)=>item.id), ...(lifecycle.artifacts || []).map((item)=>item.id), ...(lifecycle.work_units || []).map((item)=>item.id)]);
  for (const id of lifecycle.id_policy?.deprecated_ids || []) if (published.has(id)) fail(`deprecated ID 仍在活动注册表: ${id}`);

  if (profile.upstream?.kind !== "approved-spec-or-strategic-design") {
    fail("upstream.kind 必须为 approved-spec-or-strategic-design");
  }
  if (profile.upstream?.discovery_is_default !== false) {
    fail("upstream.discovery_is_default 必须为 false");
  }
  if (profile.upstream?.default_entry !== "work-unit.harness-entry") {
    fail("upstream.default_entry 必须为 work-unit.harness-entry");
  }
  const handoff = profile.upstream?.strategic_design_handoff;
  if (handoff?.schema_ref !== ".template-spec/process/schemas/strategic-design-handoff.schema.json"
    || !equalArray(handoff?.accepted_schema_versions, [3, 4, 5])
    || handoff?.current_schema_version !== 5
    || handoff?.current_import_receipt_schema_version !== 3
    || handoff?.accepted_next_work_unit !== "work-unit.technical-design"
    || handoff?.ready_for_agent !== false) {
    fail("upstream.strategic_design_handoff 必须兼容 v3/v4、以 Handoff v5/Import Receipt v3 为当前版本，接收后进入技术设计并保持 ready_for_agent=false");
  }
  if (handoff?.ui_impact_requires_visual_baseline_schema_version !== 1) {
    fail("upstream.strategic_design_handoff 的 UI 影响必须绑定 Visual Baseline v1");
  }
  if (handoff?.stale_baseline_policy !== "block-and-reroute") {
    fail("upstream.strategic_design_handoff 的过期 Visual Baseline 必须 block-and-reroute");
  }
  if (!equalArray(profile.handoff?.consumer_capabilities, CONSUMER_CAPABILITIES)) fail("handoff.consumer_capabilities 必须为 backend-technical-design");

  const instantiation = profile.instantiation || {};
  for (const [field, expected] of Object.entries(INSTANTIATION)) {
    if (Array.isArray(expected)) {
      if (!equalArray(instantiation[field], expected)) fail(`instantiation.${field} 必须为 ${JSON.stringify(expected)}`);
    } else if (instantiation[field] !== expected) {
      fail(`instantiation.${field} 必须为 ${expected}`);
    }
  }
  for (const [field, expected] of Object.entries(LEGACY_INSTANTIATION)) {
    if (instantiation[field] !== undefined && instantiation[field] !== expected) fail(`instantiation.${field} 历史来源不匹配`);
  }
  for (const field of ["npm_create", "pin_env"]) if (field in instantiation) fail(`instantiation.${field} 是历史 CLI 默认入口，不属于原生合同`);
  if (isTemplateSource(ROOT)) {
    const manifestPath = path.resolve(ROOT, instantiation.distribution_manifest);
    if (!existsSync(manifestPath)) {
      fail(`instantiation.distribution_manifest 不可读: ${instantiation.distribution_manifest}`);
    }
  }

  return {
    profile_id: profile.profile_id,
    target_user_roles: [...profile.audience.target_user_roles],
    terminal_work_unit: profile.lifecycle.terminal_work_unit,
    cli_package: instantiation.cli_package,
    native_profile: instantiation.native_profile,
    metadata_file: instantiation.metadata_file,
  };
}

export const harnessProfileContract = Object.freeze({
  profile_id: DEV_AGENT_PROFILE_ID,
  target_user_roles: TARGET_ROLES,
  control_plane_roles: CONTROL_ROLES,
  allowed_work_units: ALLOWED_WORK_UNITS,
  allowed_stages: ALLOWED_STAGES,
  consumer_capabilities: CONSUMER_CAPABILITIES,
  forbidden_work_units: FORBIDDEN_WORK_UNITS,
  strategic_design_handoff: Object.freeze({
    accepted_schema_versions: [3, 4, 5],
    current_schema_version: 5,
    import_receipt_schema_version: 3,
    accepted_next_work_unit: "work-unit.technical-design",
    ready_for_agent: false,
    visual_baseline_schema_version: 1,
    stale_baseline_policy: "block-and-reroute",
  }),
  instantiation: INSTANTIATION,
});
