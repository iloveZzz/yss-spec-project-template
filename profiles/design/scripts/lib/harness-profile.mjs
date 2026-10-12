import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadDigitalHumanRoles } from "./digital-human-roles.mjs";
import { loadRegistry, ROOT } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";
import { lifecycleTransitionContract } from "./lifecycle-transition.mjs";

export const DEFAULT_PROFILE = path.join(ROOT, ".template-spec/process/harness-profile.yaml");
export const STRATEGIC_PROFILE_ID = "harness.business-ddd-strategy-handoff";
export const INSTANTIATION = Object.freeze({
  cli_package: "yss",
  native_profile: "design",
  metadata_file: ".yss.json",
  template_source: "github:iloveZzz/yss-harness-design-agent",
  command: "yss init --profile design --root <directory>",
});
const LEGACY_INSTANTIATION = Object.freeze({
  legacy_cli_package: "create-yss-harness-design",
  legacy_metadata_file: ".yss-harness-design.json",
});

const TARGET_ROLES = ["role.product-manager", "role.requirements-manager", "role.business"];
const CONTROL_ROLES = ["role.lifecycle-orchestrator"];
const ALLOWED_WORK_UNITS = [
  "work-unit.plan-opportunity",
  "work-unit.plan-requirements",
  "work-unit.domain-strategy-design",
  "work-unit.stage-decision",
  "work-unit.spec-synthesis",
  "work-unit.prototype-design",
  "work-unit.business-ticket-formalization",
  "work-unit.strategic-design-handoff",
];
const ALLOWED_STAGES = [
  "stage.entry-triage",
  "stage.plan",
  "stage.spec-architecture",
  "stage.product-design",
  "stage.ticket-formalization",
];
const CONSUMER_CAPABILITIES = ["backend-technical-design", "frontend-engineering-design", "delivery-coordination"];

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

function resolveProjectRef(root, ref, field) {
  requireString(ref, field);
  const file=path.resolve(root,ref),relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!existsSync(file))fail(`${field} 不可读或越界: ${ref}`);
  if(realpathSync(file)!==path.resolve(realpathSync(root),relative))fail(`${field} 不能是 symlink: ${ref}`);
  return file;
}

function assertStrategicDelivery(value, root) {
  const terminal=value.status==='completed'||value.stage_trace?.completed_work_unit==='work-unit.strategic-design-handoff';
  if(!terminal)return;
  const artifact=value.artifacts?.['artifact.strategic-design-handoff'];
  if(!artifact||artifact.status!=='approved')fail('strategic-delivery: artifact.strategic-design-handoff 必须 approved');
  const handoffRef=artifact.ref,handoff=parseYaml(resolveProjectRef(root,handoffRef,'strategic-delivery handoff'),'Strategic Handoff');
  if(handoff.schema_version!==5||handoff.status!=='approved')fail('strategic-delivery: 完成只接受已批准的 Handoff v5');
  const evidenceRefs=artifact.evidence_refs||[];
  const deliveryRef=evidenceRefs.find(ref=>ref.endsWith('/delivery-record.json'));
  const verificationRef=evidenceRefs.find(ref=>ref.endsWith('/verification.json'));
  if(!deliveryRef||!verificationRef)fail('strategic-delivery: evidence_refs 必须包含 delivery-record.json 和 verification.json');
  const deliveryFile=resolveProjectRef(root,deliveryRef,'strategic-delivery record');
  const verificationFile=resolveProjectRef(root,verificationRef,'strategic-delivery verification');
  const record=JSON.parse(readFileSync(deliveryFile,'utf8')),verification=JSON.parse(readFileSync(verificationFile,'utf8'));
  if(record.kind!=='strategic-handoff-delivery-v1'||record.status!=='packaged'||record.handoff?.schema_version!==5||record.handoff?.ref!==handoffRef)fail('strategic-delivery: delivery record 未绑定当前 Handoff v5');
  if(path.dirname(deliveryFile)!==path.dirname(verificationFile)||record.verification_ref!=='verification.json')fail('strategic-delivery: delivery record 与 verification 不在同一不可变交付目录');
  if(verification.kind!=='strategic-delivery-verification-v1'||verification.result!=='verified'||verification.exit_code!==0||verification.bundle_digest!==record.bundle_digest)fail('strategic-delivery: verification 未通过或摘要不一致');
  const checkpoint=value.verification?.strategic_delivery;
  if(!checkpoint||typeof checkpoint.command!=='string'||!checkpoint.command.trim()||checkpoint.exit_code!==0||checkpoint.result!=='verified'||checkpoint.bundle_digest!==record.bundle_digest)fail('strategic-delivery: checkpoint.verification.strategic_delivery 缺失或与交付不一致');
  const checked=spawnSync(process.execPath,[path.join(ROOT,'scripts/strategic-handoff'),'verify','--bundle',path.dirname(deliveryFile)],{cwd:root,encoding:'utf8'});
  if(checked.status!==0)fail(`strategic-delivery: 整包 verify 失败: ${(checked.stderr||checked.stdout).trim()}`);
  const result=JSON.parse(checked.stdout);
  if(result.result!=='verified'||result.bundle_digest!==record.bundle_digest)fail('strategic-delivery: 整包 verify 结果与 checkpoint 不一致');
}

export function loadHarnessProfile(filePath = DEFAULT_PROFILE) {
  return parseYaml(filePath, "Harness profile");
}

export function validateHarnessProfile(profile = loadHarnessProfile(), {
  lifecycle = loadRegistry(),
  roles = loadDigitalHumanRoles(),
  skills = loadSkillRegistry(),
} = {}) {
  if (profile.schema_version !== 2) fail("Harness profile schema_version 必须为 2");
  if (profile.profile_id !== STRATEGIC_PROFILE_ID) fail(`只支持 ${STRATEGIC_PROFILE_ID}`);
  if (profile.status !== "active") fail("Harness profile status 必须为 active");
  requireString(profile.name, "profile.name");
  requireString(profile.purpose, "profile.purpose");
  const instantiation = profile.instantiation || {};
  for (const [field, expected] of Object.entries(INSTANTIATION)) {
    if (instantiation[field] !== expected) fail(`instantiation.${field} 必须为 ${expected}`);
  }
  for (const [field, expected] of Object.entries(LEGACY_INSTANTIATION)) {
    if (instantiation[field] !== undefined && instantiation[field] !== expected) fail(`instantiation.${field} 历史来源不匹配`);
  }
  for (const field of ["npm_create", "pin_env"]) if (field in instantiation) fail(`instantiation.${field} 是历史 CLI 默认入口，不属于原生合同`);


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
  if (!equalArray(profile.lifecycle.allowed_stages, ALLOWED_STAGES)) fail("lifecycle.allowed_stages 与策略 profile 不一致");
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

  if (!equalArray(profile.handoff.accepted_schema_versions, [5]) || profile.handoff.current_schema_version !== 5) fail("新战略交付只接受 Handoff v5；v3/v4 仅由历史 verify/import 兼容");
  if (!equalArray(profile.handoff.consumer_capabilities, CONSUMER_CAPABILITIES)) fail("handoff.consumer_capabilities 必须覆盖后端、前端与协调路由");
  requireExistingRelative(profile.handoff.package_template, "handoff.package_template");
  requireExistingRelative(profile.handoff.package_schema, "handoff.package_schema");
  for (const artifact of profile.handoff.required_source_artifacts || []) {
    if (!(lifecycle.artifacts || []).some((item) => item.id === artifact)) fail(`handoff.required_source_artifacts 引用了未知产物: ${artifact}`);
  }
  if (!Array.isArray(profile.handoff.required_sections) || profile.handoff.required_sections.length < 6) fail("handoff.required_sections 不完整");
  for (const section of ["source-context-snapshot", "context-delta", "consumer-routes"]) if (!profile.handoff.required_sections.includes(section)) fail(`handoff.required_sections 缺少 ${section}`);
  if (!Array.isArray(profile.handoff.acceptance) || profile.handoff.acceptance.length < 4) fail("handoff.acceptance 不完整");
  for (const condition of ["source-context-snapshot-and-context-delta-are-current", "active-consumer-routes-require-target-context-reconciliation", "immutable-delivery-directory-is-packaged-and-verified"]) if (!profile.handoff.acceptance.includes(condition)) fail(`handoff.acceptance 缺少 ${condition}`);
  return {
    profile_id: profile.profile_id,
    cli_package: instantiation.cli_package,
    native_profile: instantiation.native_profile,
    metadata_file: instantiation.metadata_file,
    target_user_roles: [...profile.audience.target_user_roles],
    terminal_work_unit: profile.lifecycle.terminal_work_unit,
    consumer_capabilities: [...profile.handoff.consumer_capabilities],
  };
}

export const harnessProfileContract = Object.freeze({
  profile_id: STRATEGIC_PROFILE_ID,
  instantiation: INSTANTIATION,
  target_user_roles: TARGET_ROLES,
  control_plane_roles: CONTROL_ROLES,
  allowed_work_units: ALLOWED_WORK_UNITS,
  allowed_stages: ALLOWED_STAGES,
  consumer_capabilities: CONSUMER_CAPABILITIES,
});

// Profile restrictions apply to instances, never template maintenance fixtures.
export function assertStrategicCheckpointScope(value, { profile = loadHarnessProfile(), root = ROOT, checkpointPath } = {}) {
  if (value.repository_mode !== 'project-instance') return;
  for (const id of Object.keys(value.artifacts || {})) {
    if (profile.lifecycle.forbidden_artifacts.includes(id)) fail(`strategic-profile-artifact: ${id}`);
  }
  const ticketStates = object => {
    if (!object || typeof object !== 'object') return;
    for (const [key, item] of Object.entries(object)) {
      if (key === 'status' && item === 'ready-for-agent') fail('strategic-profile-ticket-status: ready-for-agent');
      ticketStates(item);
    }
  };
  ticketStates(value.ticket_sync);
  if (value.status === 'completed' && (value.stage !== profile.lifecycle.terminal_stage || value.next_work_unit !== null)) fail('strategic-profile-terminal: 完成状态必须位于交接终点且 next_work_unit=null');
  if (value.stage_trace?.completed_work_unit === profile.lifecycle.terminal_work_unit && value.next_work_unit !== null) fail('strategic-profile-terminal: next_work_unit 必须为 null');
  const allowedStages = new Set(loadDigitalHumanRoles().orchestrator.stages);
  if (!allowedStages.has(value.stage)) fail(`strategic-profile-stage: ${value.stage}`);
  const allowed = new Set([profile.lifecycle.entry_work_unit, ...profile.lifecycle.allowed_work_units]);
  for (const unit of [value.next_work_unit, value.stage_trace?.current_work_unit, value.stage_trace?.completed_work_unit]) {
    if (unit != null && !allowed.has(unit)) fail(`strategic-profile-work-unit: ${unit}`);
  }
  assertStrategicDelivery(value,root);
  const active = new Set();
  const visited = new Set();
  const refs = [...(value.ticket_sync?.refs || [])];
  if (value.ticket_sync?.parent_ticket) refs.push(value.ticket_sync.parent_ticket);
  function visit(ref) {
    if (typeof ref !== 'string' || !ref.trim()) fail('strategic-profile-reference: 引用必须非空');
    const file = path.resolve(root, ref);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) fail(`strategic-profile-reference: 越界 ${ref}`);
    if (active.has(file)) fail(`strategic-profile-reference: 循环 ${ref}`);
    if (visited.has(file)) return;
    if (!existsSync(file)) fail(`strategic-profile-reference: 不可读 ${ref}`);
    const real = realpathSync(file);
    if (real !== path.resolve(realpathSync(root), relative)) fail(`strategic-profile-reference: symlink ${ref}`);
    active.add(file);
    const source = readFileSync(file, 'utf8');
    if (/^Status:\s*ready-for-agent\s*$/mi.test(source)) fail(`strategic-profile-ticket-status: ${ref}`);
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const content = /\.md$/i.test(file) ? (frontmatter ? parseDocument(frontmatter[1]).toJS() : {}) : parseYaml(file, '状态引用');
    ticketStates(content);
    if (ref === value.ticket_sync?.parent_ticket && !content?.checkpoint_ref) fail(`strategic-profile-reference: 旧索引缺少明确 checkpoint_ref ${ref}`);
    if (content?.checkpoint_ref) {
      const target = path.resolve(root, content.checkpoint_ref);
      if (!checkpointPath || target !== path.resolve(checkpointPath)) fail(`strategic-profile-reference: checkpoint 冲突 ${ref}`);
    }
    for (const child of content?.index_refs || []) visit(child);
    active.delete(file); visited.add(file);
  }
  refs.forEach(visit);
}
