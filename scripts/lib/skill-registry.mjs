import { existsSync, readFileSync } from './validation-phase.mjs';
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { nestedSkillPaths, OBSOLETE, PROJECTION_ROOTS, ROOT, unregisteredNestedSkillPaths } from "./skill-supply-chain.mjs";

export const DEFAULT_REGISTRY = path.join(ROOT, ".template-spec/agents/yss-skill-registry.yaml");
const LOCK_PATH = path.join(ROOT, "skills-lock.json");
const COMPILER_CONTRACT = path.join(ROOT, ".agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml");
const LIFECYCLE_CONTRACT = [
  path.join(ROOT, ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml"),
  path.join(ROOT, ".agents/skills/harness-orchestrator/references/orchestration-contract.yaml"),
].find((candidate) => existsSync(candidate))
  ?? path.join(ROOT, ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml");
const BACKEND_PLATFORMS = path.join(ROOT, ".template-spec/engineering/backend-platforms.json");
const LAYERS = new Set(["core", "specialist", "compatibility", "maintainer-only"]);
const MATURITIES = new Set(["draft", "verified", "supported", "deprecated"]);
const INVOCATION_MODES = new Set(["user", "model", "both"]);
const DEPENDENCY_TYPES = new Set(["context-required", "context-conditional", "coordination-only", "review-only", "component-dependency"]);
const TASK_MODES = new Set(["guidance", "integration", "slice-implementation", "troubleshooting", "component-maintenance", "review-input", "contract-compilation", "reroute", "result-validation", "source-index-refresh"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const PLATFORM_ALIAS_PATTERN = /^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)?$/;
const PROVIDER_KINDS = new Set(["yss-component", "platform-managed", "none"]);
const BACKEND_SKILL_DOMAINS = new Set(["technical-design", "layered-implementation", "wire-framework-contract", "component-capability", "engineering-initialization", "platform-governance-migration"]);
const CLEANUP_STATUSES = new Set(["migration-only", "remove-ready"]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SKILL_LIFECYCLE_FAILURE_CODES = Object.freeze({
  deprecated: "skill-deprecated",
  retired: "skill-retired"
});

export class SkillLifecycleError extends TypeError {
  constructor(code, message, details = {}) {
    super(`${code}: ${message}`);
    this.name = "SkillLifecycleError";
    this.code = code;
    this.details = details;
  }
}

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

export function loadSkillRegistry(filePath = DEFAULT_REGISTRY) {
  return yamlFromFile(filePath, "技能路由注册表");
}

export function resolveSkillForNewUse(registry, requestedId) {
  requireString(requestedId, "requested skill id");
  if (OBSOLETE.has(requestedId)) {
    const replacementSkill = requestedId === "grill-me" ? "grilling" : null;
    throw new SkillLifecycleError(
      SKILL_LIFECYCLE_FAILURE_CODES.retired,
      replacementSkill
        ? `${requestedId} 已硬退役；请使用 ${replacementSkill}`
        : `${requestedId} 已硬退役；按迁移 tombstone 重新路由`,
      {
        skill: requestedId,
        migration_ref: ".template-spec/agents/skill-migrations.md",
        ...(replacementSkill ? { replacement_skill: replacementSkill } : {})
      }
    );
  }
  const aliases = new Map((registry.skills ?? []).flatMap((skill) => (skill.aliases ?? []).map((alias) => [alias, skill.id])));
  const canonicalId = aliases.get(requestedId) ?? requestedId;
  const skill = [...(registry.skills ?? []), ...(registry.external_skills ?? [])].find((item) => item.id === canonicalId);
  if (!skill) fail(`未知 skill: ${requestedId}`);
  if (skill.maturity === "deprecated") {
    throw new SkillLifecycleError(
      SKILL_LIFECYCLE_FAILURE_CODES.deprecated,
      `${canonicalId} 已停止新用法；必须重新编译并显式迁移到 ${skill.replacement_skill}`,
      {
        skill: canonicalId,
        replacement_skill: skill.replacement_skill,
        remove_after: skill.deprecation.remove_after,
        cleanup_status: skill.deprecation.cleanup_status
      }
    );
  }
  return skill;
}

function frontmatterName(skillMd) {
  const match = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) fail("SKILL.md 缺少 frontmatter");
  const name = match[1].match(/^name:\s*["']?([a-z0-9-]+)["']?\s*$/m);
  if (!name) fail("SKILL.md frontmatter 缺少 name");
  return name[1];
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`);
}

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${field} 必须是对象`);
}

function requireStringArray(value, field, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(`${field} 必须是${nonEmpty ? "非空" : ""}字符串数组`);
  }
}

function exactValuePaths(value, targets, current = "$", found = []) {
  if (typeof value === "string" && targets.has(value)) found.push(current);
  else if (Array.isArray(value)) value.forEach((item, index) => exactValuePaths(item, targets, `${current}[${index}]`, found));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) exactValuePaths(item, targets, `${current}.${key}`, found);
  return found;
}

function validateDeprecation(skill, prefix) {
  requireString(skill.replacement_skill, `${prefix}.replacement_skill`);
  requireObject(skill.deprecation, `${prefix}.deprecation`);
  if (skill.deprecation.new_use !== "forbidden") fail(`${prefix}.deprecation.new_use 必须为 forbidden`);
  if (!CLEANUP_STATUSES.has(skill.deprecation.cleanup_status)) {
    fail(`${prefix}.deprecation.cleanup_status 必须是 migration-only 或 remove-ready`);
  }
  requireString(skill.deprecation.remove_after, `${prefix}.deprecation.remove_after`);
  if (!ISO_DATE_PATTERN.test(skill.deprecation.remove_after) || Number.isNaN(Date.parse(`${skill.deprecation.remove_after}T00:00:00Z`))) {
    fail(`${prefix}.deprecation.remove_after 必须是有效 ISO 日期`);
  }
}

function effectiveInvocationContract(registry, skill) {
  const contract = registry.invocation_contract;
  return {
    ...contract.default,
    ...contract.layer_defaults[skill.layer],
    ...(contract.overrides[skill.id] ?? {})
  };
}

function sameStringSet(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function validateInvocationContract(registry, skill) {
  const contract = registry.invocation_contract;
  requireObject(contract, "invocation_contract");
  if (contract.schema_version !== 2) fail("invocation_contract.schema_version 必须为 2；v1 已停止支持");
  if (contract.scope !== "discovery-only") fail("invocation_contract.scope 必须限定为 discovery-only");
  requireStringArray(contract.required_fields, "invocation_contract.required_fields", { nonEmpty: true });
  const expected = ["invocation_mode", "trigger_conditions", "exclusion_conditions", "primary_output"];
  if (JSON.stringify(contract.required_fields) !== JSON.stringify(expected)) fail("invocation_contract.required_fields 顺序或字段不完整");
  requireStringArray(contract.allowed_invocation_modes, "invocation_contract.allowed_invocation_modes", { nonEmpty: true });
  if (![...INVOCATION_MODES].every((mode) => contract.allowed_invocation_modes.includes(mode))) {
    fail("invocation_contract.allowed_invocation_modes 必须包含 user、model、both");
  }
  if (contract.trigger_source !== "impacts" || contract.trigger_encoding !== "impact:<impact>") {
    fail("invocation_contract 必须从 impacts 生成 impact:<impact> 触发条件");
  }
  requireObject(contract.default, "invocation_contract.default");
  requireObject(contract.layer_defaults, "invocation_contract.layer_defaults");
  requireObject(contract.overrides, "invocation_contract.overrides");
  for (const layer of LAYERS) {
    const layerDefault = contract.layer_defaults[layer];
    requireObject(layerDefault, `invocation_contract.layer_defaults.${layer}`);
    if (!INVOCATION_MODES.has(layerDefault.invocation_mode)) fail(`${layer} 的 invocation_mode 无效`);
    requireString(layerDefault.primary_output, `invocation_contract.layer_defaults.${layer}.primary_output`);
  }
  const defaultMode = contract.default.invocation_mode;
  if (!INVOCATION_MODES.has(defaultMode)) fail("invocation_contract.default.invocation_mode 无效");
  requireStringArray(contract.default.trigger_conditions, "invocation_contract.default.trigger_conditions", { nonEmpty: true });
  requireStringArray(contract.default.exclusion_conditions, "invocation_contract.default.exclusion_conditions", { nonEmpty: true });
  requireString(contract.default.primary_output, "invocation_contract.default.primary_output");
  for (const [skillId, override] of Object.entries(contract.overrides)) {
    requireObject(override, `invocation_contract.overrides.${skillId}`);
    if (!ID_PATTERN.test(skillId)) fail(`invocation_contract.overrides id 非法: ${skillId}`);
    if (override.invocation_mode && !INVOCATION_MODES.has(override.invocation_mode)) fail(`${skillId}.invocation_mode 无效`);
    if (override.trigger_conditions) requireStringArray(override.trigger_conditions, `${skillId}.trigger_conditions`, { nonEmpty: true });
    if (override.exclusion_conditions) requireStringArray(override.exclusion_conditions, `${skillId}.exclusion_conditions`, { nonEmpty: true });
    if (override.primary_output) requireString(override.primary_output, `${skillId}.primary_output`);
  }
  const overrideIds = Object.keys(contract.overrides);
  const knownIds = new Set(registry.skills.map((item) => item?.id).filter(Boolean));
  for (const skillId of overrideIds) if (!knownIds.has(skillId)) fail(`invocation_contract.overrides 引用了未登记技能: ${skillId}`);
  const effective = effectiveInvocationContract(registry, skill);
  effective.trigger_conditions = [...new Set([...(effective.trigger_conditions ?? []), ...skill.impacts.map((impact) => `impact:${impact}`)])];
  if (!INVOCATION_MODES.has(effective.invocation_mode)) fail(`${skill.id}.invocation_mode 无效`);
  requireStringArray(effective.trigger_conditions, `${skill.id}.trigger_conditions`, { nonEmpty: true });
  requireStringArray(effective.exclusion_conditions, `${skill.id}.exclusion_conditions`, { nonEmpty: true });
  requireString(effective.primary_output, `${skill.id}.primary_output`);
  const impactTriggers = skill.impacts.map((impact) => `impact:${impact}`);
  if (!impactTriggers.every((trigger) => effective.trigger_conditions.includes(trigger))) {
    fail(`${skill.id} 的调用契约必须覆盖其 impacts 触发条件`);
  }
}

function requireStringSet(value, expected, field) {
  if (!Array.isArray(value)) fail(`${field} 必须是数组`);
  const missing = expected.filter((item) => !value.includes(item));
  const extra = value.filter((item) => !expected.includes(item));
  if (missing.length || extra.length) fail(`${field} 必须恰好为 ${expected.join(", ")}`);
}

function validateFindingDisposition(disposition) {
  requireObject(disposition, "review_standards_route.finding_disposition");
  requireStringSet(disposition.same_loop_for, ["product-slice", "template-maintenance"], "finding_disposition.same_loop_for");
  requireObject(disposition.intensity, "finding_disposition.intensity");
  if (disposition.intensity["product-slice"] !== "slice-contract") fail("产品切片审查强度必须绑定 slice-contract");
  if (disposition.intensity["template-maintenance"] !== "L1-L2-L3") fail("模板维护审查强度必须绑定 L1-L2-L3");
  if (disposition.reviewer_write_implementation !== "forbidden") fail("审查者不得写实现");
  const repair = disposition.repair_then_full_rereview;
  requireObject(repair, "finding_disposition.repair_then_full_rereview");
  requireStringSet(repair.kinds, ["violation", "machine_check_failure", "blank_applicable_row", "missing_evidence"], "finding_disposition.repair_then_full_rereview.kinds");
  if (repair.actor !== "implementer") fail("violation 类 finding 必须由实现者修复");
  if (repair.on_original_contract !== true) fail("violation 类 finding 必须在原合同允许路径内修复");
  if (repair.then !== "recapture_candidate_and_rerun_all_axes") fail("修复后必须重新捕获候选并全轴复审");
  const stale = disposition.stale_and_reroute;
  requireObject(stale, "finding_disposition.stale_and_reroute");
  requireStringSet(stale.kinds, ["drift", "new_impacts", "required_skills_mismatch"], "finding_disposition.stale_and_reroute.kinds");
  if (stale.mark_contract !== "stale") fail("drift / new_impacts 必须将合同标为 stale");
  if (stale.continue_coding_on_old_contract !== "forbidden") fail("合同 stale 后禁止在旧合同上继续编码");
  if (stale.next !== "compiler-or-earlier-lifecycle") fail("合同 stale 后必须回 实现合同编译器 或更早生命周期阶段");
  const exemption = disposition.exemption_policy;
  requireObject(exemption, "finding_disposition.exemption_policy");
  if (exemption.not_applicable !== "impact_not_triggered_only") fail("not-applicable 仅允许影响面未命中");
  if (exemption.mandatory_waiver !== "forbidden") fail("命中后的 mandatory 门禁不得豁免");
  requireStringSet(exemption.allowed_exits, ["repair", "seam-deferred-complete"], "finding_disposition.exemption_policy.allowed_exits");
  if (exemption.new_human_waiver_gate !== "forbidden") fail("禁止为日常 Alibaba/YSS 新增生物人豁免门禁");
  if (exemption.existing_human_gates_unchanged !== true) fail("既有 TODO-HUMAN-REVIEW / 生物人门禁不得被审查闭环改写");
}

function validateReviewInputFinding(reviewInput) {
  if (reviewInput.finding_disposition_required !== true) fail("review_input.finding_disposition_required 必须为 true");
  if (reviewInput.completed_requires_no_open_mandatory_violations !== true) fail("未关闭的 mandatory violation 不得 completed");
  if (reviewInput.completed_requires_no_blank_applicable_rows !== true) fail("适用报告行空白不得 completed");
  if (reviewInput.reviewer_write_implementation !== "forbidden") fail("review_input 禁止审查者写实现");
  requireObject(reviewInput.scope_resolution, "review_input.scope_resolution");
  requireStringSet(reviewInput.scope_resolution.sources, ["candidate-project-root", "implementation-repository-registry", "slice-project-roots", "allowed-write-paths"], "review_input.scope_resolution.sources");
  requireStringSet(reviewInput.scope_resolution.backend_includes, ["project-itself", "registered-backend-development-projects"], "review_input.scope_resolution.backend_includes");
  requireStringSet(reviewInput.scope_resolution.excludes, ["frontend-projects", "unrelated-submodules", "vendor", "unregistered-directories"], "review_input.scope_resolution.excludes");
}

function validateCodeReviewRoute(route, resolve) {
  if (route.primary_skill !== "code-review") fail("work-unit.code-review 的 primary_skill 必须是唯一默认审查技能 code-review");
  const standards = route.review_standards_route;
  if (!standards || typeof standards !== "object" || Array.isArray(standards)) {
    fail("work-unit.code-review 缺少 review_standards_route");
  }
  if (standards.unique_default_skill !== "code-review") fail("review_standards_route.unique_default_skill 必须为 code-review");
  if (standards.second_generic_review_skill !== "forbidden") fail("禁止叠加第二个通用审查 skill");
  if (standards.write_implementation !== "forbidden") fail("审查专项 skill 不得用于写实现");
  if (standards.contract_required_skills !== "required") fail("Standards 必须消费 Slice 合同 required_skills");
  requireString(standards.report_template, "review_standards_route.report_template");
  if (!existsSync(path.join(ROOT, standards.report_template))) fail(`审查报告模板不存在: ${standards.report_template}`);
  requireObject(standards.project_scope, "review_standards_route.project_scope");
  requireStringSet(standards.project_scope.sources, ["candidate-project-root", "implementation-repository-registry", "slice-project-roots", "allowed-write-paths"], "review_standards_route.project_scope.sources");
  requireStringSet(standards.project_scope.include, ["project-itself", "registered-backend-development-projects"], "review_standards_route.project_scope.include");
  requireStringSet(standards.project_scope.exclude, ["frontend-projects", "unrelated-submodules", "vendor", "unregistered-directories"], "review_standards_route.project_scope.exclude");
  if (standards.project_scope.fixed_apps_backend_assumption !== "forbidden") fail("code-review 不得把后端审查范围固定为 apps/backend");
  const conditional = standards.conditional_skills;
  if (!conditional || typeof conditional !== "object" || Array.isArray(conditional)) {
    fail("review_standards_route.conditional_skills 必须是对象");
  }
  const union = [];
  for (const [impact, names] of Object.entries(conditional)) {
    if (!Array.isArray(names) || names.length === 0) fail(`review_standards_route.conditional_skills.${impact} 必须是非空数组`);
    for (const name of names) {
      if (!resolve(name)) fail(`审查专项检查输入引用了未登记技能: ${impact} -> ${name}`);
      if (!union.includes(name)) union.push(name);
    }
    if (typeof standards.not_applicable_reasons?.[impact] !== "string") {
      fail(`review_standards_route.not_applicable_reasons.${impact} 必须是字符串`);
    }
  }
  for (const name of union) {
    if (!route.supporting_skills.includes(name)) fail(`work-unit.code-review.supporting_skills 缺少专项检查输入 ${name}`);
    if (!route.skills.includes(name)) fail(`work-unit.code-review.skills 缺少专项检查输入 ${name}`);
  }
  if (!route.skills.includes("code-review")) fail("work-unit.code-review.skills 必须包含 code-review");
  const machine = standards.machine_checks;
  if (!machine || typeof machine !== "object" || Array.isArray(machine)) fail("review_standards_route.machine_checks 必须是对象");
  if (machine.run_if_present !== true) fail("review_standards_route.machine_checks.run_if_present 必须为 true");
  if (machine.missing_tooling !== "not-applicable-with-reason") fail("缺少机器检查工具时必须记录 not-applicable 及原因");
  if (machine.checkable_rule_without_machine !== "not-a-pass") fail("可机器检查规则在未跑工具时不得记为 pass");
  validateFindingDisposition(standards.finding_disposition);
}

export function validateSkillRegistry(registry, { lock, compilerContract, lifecycleContract, skillSource, externalSkillSource, nestedSkillSources, backendPlatforms } = {}) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) fail("技能路由注册表必须是对象");
  if (registry.schema_version !== 3) fail("schema_version 必须为 3；v1/v2 已停止支持，请迁移 provider 与两阶段退役合同");
  if (registry.registry_id !== "yss.skill-routing") fail("registry_id 必须为 yss.skill-routing");
  if (!["shadow", "active"].includes(registry.status)) fail("status 必须是 shadow 或 active");
  requireString(registry.description, "description");
  requireString(registry.canonical_content_root, "canonical_content_root");
  if (registry.canonical_content_root !== ".agents/skills") fail("canonical_content_root 必须为 .agents/skills");
  const runtime = registry.runtime_policy;
  if (!runtime || typeof runtime !== "object") fail("缺少 runtime_policy");
  if (typeof runtime.consumed_by_compiler !== "boolean" || typeof runtime.consumed_by_lifecycle !== "boolean" || typeof runtime.discovery_enforced !== "boolean") {
    fail("runtime_policy 必须声明 consumed_by_compiler、consumed_by_lifecycle、discovery_enforced");
  }
  if (registry.status === "shadow" && (runtime.consumed_by_compiler || runtime.consumed_by_lifecycle || runtime.discovery_enforced)) {
    fail("shadow 注册表不得被实现合同编译器、生命周期或发现面强制消费");
  }
  const roots = registry.agent_runtime_roots;
  if (!roots || typeof roots !== "object" || Array.isArray(roots)) fail("缺少 agent_runtime_roots");
  const expected = {
    codex: ".codex/skills",
    cursor: ".cursor/skills",
    pi: ".pi/skills"
  };
  for (const [agent, root] of Object.entries(expected)) {
    if (roots[agent] !== root) fail(`agent_runtime_roots.${agent} 必须为 ${root}`);
  }
  const extraAgents = Object.keys(roots).filter((key) => !(key in expected));
  if (extraAgents.length) fail(`未知 Agent 运行时根: ${extraAgents.join(", ")}`);
  if (JSON.stringify(Object.values(expected).sort()) !== JSON.stringify([...PROJECTION_ROOTS].sort())) {
    fail("agent_runtime_roots 与投影根清单不一致");
  }

  const skills = registry.skills;
  if (!Array.isArray(skills) || skills.length === 0) fail("skills 不能为空");
  const ids = new Set();
  const aliases = new Map();
  for (const [index, skill] of skills.entries()) {
    const prefix = `skills[${index}]`;
    if (!skill || typeof skill !== "object" || Array.isArray(skill)) fail(`${prefix} 必须是对象`);
    requireString(skill.id, `${prefix}.id`);
    if (!ID_PATTERN.test(skill.id)) fail(`${prefix}.id 非法: ${skill.id}`);
    if (ids.has(skill.id)) fail(`重复 skill id: ${skill.id}`);
    ids.add(skill.id);
  }
  for (const [index, skill] of skills.entries()) {
    const prefix = `skills[${index}]`;
    if (!LAYERS.has(skill.layer)) fail(`${skill.id} 未知 layer: ${skill.layer}`);
    if (!MATURITIES.has(skill.maturity)) fail(`${skill.id} 未知 maturity: ${skill.maturity}`);
    if (typeof skill.instance_default_discoverable !== "boolean") fail(`${skill.id} 缺少 instance_default_discoverable`);
    if (skill.layer === "core" && skill.instance_default_discoverable !== true) fail(`${skill.id} 作为 core 必须默认可发现`);
    if (["specialist", "maintainer-only", "compatibility"].includes(skill.layer) && skill.instance_default_discoverable !== false) {
      fail(`${skill.id} 作为 ${skill.layer} 不得默认可发现`);
    }
    if (skill.maturity === "deprecated") {
      validateDeprecation(skill, prefix);
      if (registry.invocation_contract?.overrides?.[skill.id] !== undefined) fail(`${skill.id} 进入 deprecated 后不得保留 invocation override`);
    }
    else if (skill.replacement_skill !== undefined || skill.deprecation !== undefined) fail(`${skill.id} 仅 deprecated 技能可声明 replacement_skill/deprecation`);
    if (!Array.isArray(skill.aliases) || skill.aliases.some((alias) => typeof alias !== "string" || !ID_PATTERN.test(alias))) {
      fail(`${skill.id} aliases 必须是合法 id 数组`);
    }
    for (const alias of skill.aliases) {
      if (alias === skill.id) fail(`${skill.id} 不得把自身列为 alias`);
      if (aliases.has(alias) || ids.has(alias)) fail(`alias 冲突: ${alias}`);
      aliases.set(alias, skill.id);
    }
    if (!Array.isArray(skill.impacts) || skill.impacts.length === 0 || skill.impacts.some((item) => typeof item !== "string" || !item.trim())) {
      fail(`${skill.id} impacts 不能为空`);
    }
    validateInvocationContract(registry, skill);
  }
  for (const skill of skills) {
    if (skill.maturity === "deprecated") {
      if (!ids.has(skill.replacement_skill)) fail(`${skill.id}.replacement_skill 引用了未登记技能: ${skill.replacement_skill}`);
      if (skills.find((item) => item.id === skill.replacement_skill)?.maturity === "deprecated") fail(`${skill.id}.replacement_skill 不得指向 deprecated 技能`);
      if (skill.aliases.length) fail(`${skill.id} 进入 deprecated 后不得保留 alias`);
    }
  }

  requireObject(registry.retirement_contract, "retirement_contract");
  if (registry.retirement_contract.schema_version !== 1) fail("retirement_contract.schema_version 必须为 1");
  requireStringSet(registry.retirement_contract.stages, ["deprecated", "retired"], "retirement_contract.stages");
  if (registry.retirement_contract.deprecated_new_use !== "forbidden") fail("retirement_contract.deprecated_new_use 必须为 forbidden");
  requireStringSet(registry.retirement_contract.cleanup_statuses, [...CLEANUP_STATUSES], "retirement_contract.cleanup_statuses");
  if (registry.retirement_contract.hard_retirement_tombstone !== ".template-spec/agents/skill-migrations.md") fail("retirement_contract.hard_retirement_tombstone 必须指向技能迁移说明");
  if (registry.retirement_contract.retired_id_source !== "scripts/lib/skill-supply-chain.mjs#OBSOLETE") fail("retirement_contract.retired_id_source 必须指向统一 OBSOLETE 集");
  requireObject(registry.retirement_contract.failure_codes, "retirement_contract.failure_codes");
  if (registry.retirement_contract.failure_codes.deprecated !== SKILL_LIFECYCLE_FAILURE_CODES.deprecated || registry.retirement_contract.failure_codes.retired !== SKILL_LIFECYCLE_FAILURE_CODES.retired) {
    fail("retirement_contract.failure_codes 必须稳定为 skill-deprecated/skill-retired");
  }

  const platform = registry.platform_skills ?? [];
  if (!Array.isArray(platform)) fail("platform_skills 必须是数组");
  const platformIds = new Set();
  const platformAliases = new Map();
  for (const skill of platform) {
    requireString(skill.id, "platform_skills.id");
    requireString(skill.root, `${skill.id}.root`);
    if (!LAYERS.has(skill.layer)) fail(`${skill.id} 未知 layer`);
    if (typeof skill.instance_default_discoverable !== "boolean" || skill.instance_default_discoverable !== false) {
      fail(`${skill.id} 平台技能不得作为实例默认可发现`);
    }
    if (!Array.isArray(skill.aliases) || skill.aliases.some((alias) => typeof alias !== "string" || !PLATFORM_ALIAS_PATTERN.test(alias))) {
      fail(`${skill.id} aliases 必须是合法 id 数组`);
    }
    if (platformIds.has(`${skill.root}:${skill.id}`)) fail(`重复平台技能: ${skill.root}/${skill.id}`);
    platformIds.add(`${skill.root}:${skill.id}`);
  }
  const external = registry.external_skills ?? [];
  if (!Array.isArray(external)) fail("external_skills 必须是数组");
  const externalIds = new Set();
  const externalSources = new Set();
  for (const skill of external) {
    requireString(skill.id, "external_skills.id");
    requireString(skill.source, `${skill.id}.source`);
    if (skill.maturity !== undefined && skill.maturity !== "deprecated") fail(`${skill.id}.maturity 仅允许 deprecated`);
    if (skill.maturity === "deprecated") validateDeprecation(skill, `external_skills.${skill.id}`);
    else if (skill.replacement_skill !== undefined || skill.deprecation !== undefined) fail(`${skill.id} 仅 deprecated external skill 可声明 replacement_skill/deprecation`);
    if (externalIds.has(skill.id) || ids.has(skill.id) || aliases.has(skill.id) || platformAliases.has(skill.id)) fail(`external skill 冲突: ${skill.id}`);
    const canonicalExternalSource = skill.source.startsWith(`${registry.canonical_content_root}/`);
    if (canonicalExternalSource && externalSources.has(skill.source)) fail(`external skill source 重复: ${skill.source}`);
    if (externalSkillSource && canonicalExternalSource) {
      const discovered = frontmatterName(externalSkillSource(skill.source));
      if (discovered !== skill.id) fail(`${skill.id} 的 external SKILL.md name=${discovered} 与 id 不一致`);
    }
    externalIds.add(skill.id);
    externalSources.add(skill.source);
  }
  for (const skill of external.filter((item) => item.maturity === "deprecated")) {
    if (!ids.has(skill.replacement_skill)) fail(`${skill.id}.replacement_skill 引用了未登记技能: ${skill.replacement_skill}`);
    if (skills.find((item) => item.id === skill.replacement_skill)?.maturity === "deprecated") fail(`${skill.id}.replacement_skill 不得指向 deprecated 技能`);
  }
  const deprecatedSkillIds = new Set([
    ...skills.filter((item) => item.maturity === "deprecated").map((item) => item.id),
    ...external.filter((item) => item.maturity === "deprecated").map((item) => item.id)
  ]);
  for (const [profileId, profile] of Object.entries(registry.architecture_profiles ?? {})) {
    requireObject(profile, `architecture_profiles.${profileId}`);
    requireString(profile.generator_skill, `architecture_profiles.${profileId}.generator_skill`);
    if (!ids.has(profile.generator_skill)) fail(`${profileId}.generator_skill 引用了未登记技能: ${profile.generator_skill}`);
    if (deprecatedSkillIds.has(profile.generator_skill)) fail(`${profileId}.generator_skill 不得使用 deprecated skill: ${profile.generator_skill}`);
  }
  if (nestedSkillSources) {
    const unregistered = unregisteredNestedSkillPaths(nestedSkillSources, externalSources);
    if (unregistered.length) fail(`嵌套 SKILL.md 必须登记到 external_skills: ${unregistered.join(", ")}`);
  }
  for (const skill of platform) {
    for (const alias of skill.aliases) {
      if (ids.has(alias) || aliases.has(alias) || platformAliases.has(alias)) fail(`alias 冲突: ${alias}`);
      platformAliases.set(alias, `${skill.root}:${skill.id}`);
    }
  }

  const registeredDependency = (name) => ids.has(name)
    || aliases.has(name)
    || externalIds.has(name)
    || platformAliases.has(name)
    || [...platformIds].some((key) => key.endsWith(`:${name}`));
  const capabilityContract = registry.capability_contract;
  requireObject(capabilityContract, "capability_contract");
  if (capabilityContract.schema_version !== 3) fail("capability_contract.schema_version 必须为 3");
  requireStringSet(capabilityContract.dependency_types, [...DEPENDENCY_TYPES], "capability_contract.dependency_types");
  requireStringSet(capabilityContract.task_modes, [...TASK_MODES], "capability_contract.task_modes");
  requireObject(capabilityContract.closure, "capability_contract.closure");
  requireStringSet(capabilityContract.closure.recursive_types, ["context-required"], "capability_contract.closure.recursive_types");
  if (capabilityContract.closure.conditional_type !== "context-conditional") fail("条件依赖类型必须为 context-conditional");
  requireStringSet(capabilityContract.closure.non_expanding_types, ["coordination-only", "review-only", "component-dependency"], "capability_contract.closure.non_expanding_types");
  if (capabilityContract.closure.deduplicate_skills !== true || capabilityContract.closure.preserve_all_reasons !== true) {
    fail("capability closure 必须去重 skill 并保留全部原因链");
  }
  if (JSON.stringify(capabilityContract.deterministic_order) !== JSON.stringify(["recipe-declaration", "dependency-topology", "skill-id"])) {
    fail("capability_contract.deterministic_order 必须固定为 recipe-declaration、dependency-topology、skill-id");
  }
  requireObject(capabilityContract.platform_component_binding, "capability_contract.platform_component_binding");
  if (capabilityContract.platform_component_binding.marker !== "provider" || capabilityContract.platform_component_binding.required_kind !== "yss-component" || capabilityContract.platform_component_binding.catalog_source !== ".template-spec/engineering/backend-platforms.json") {
    fail("capability_contract.platform_component_binding 必须绑定中央后端平台目录");
  }
  requireStringSet(capabilityContract.provider_kinds, [...PROVIDER_KINDS], "capability_contract.provider_kinds");

  if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) fail("capabilities 不能为空");
  const capabilityIds = new Set();
  const capabilitySkills = new Set();
  for (const [index, capability] of registry.capabilities.entries()) {
    const prefix = `capabilities[${index}]`;
    requireObject(capability, prefix);
    requireString(capability.id, `${prefix}.id`);
    if (!CAPABILITY_ID_PATTERN.test(capability.id)) fail(`${prefix}.id 必须使用 dotted namespace: ${capability.id}`);
    if (capabilityIds.has(capability.id)) fail(`重复 capability id: ${capability.id}`);
    capabilityIds.add(capability.id);
    requireString(capability.primary_skill, `${prefix}.primary_skill`);
    if (!ids.has(capability.primary_skill)) fail(`${capability.id} 的 primary_skill 未登记: ${capability.primary_skill}`);
    if (skills.find((item) => item.id === capability.primary_skill)?.maturity === "deprecated") fail(`${capability.id} 不得由 deprecated skill 持有: ${capability.primary_skill}`);
    requireStringArray(capability.task_modes, `${prefix}.task_modes`, { nonEmpty: true });
    for (const mode of capability.task_modes) if (!TASK_MODES.has(mode)) fail(`${capability.id} 使用未知 task mode: ${mode}`);
    requireObject(capability.provider, `${prefix}.provider`);
    if (!PROVIDER_KINDS.has(capability.provider.kind)) fail(`${capability.id}.provider.kind 无效: ${capability.provider.kind}`);
    if (capability.provider.kind === "none") {
      if (capability.provider.binding_id !== undefined || capability.provider.new_adoption !== undefined || capability.provider.failure_code !== undefined) {
        fail(`${capability.id} 的 none provider 不得声明 binding_id/new_adoption/failure_code`);
      }
    } else requireString(capability.provider.binding_id, `${prefix}.provider.binding_id`);
    if (capability.provider.new_adoption !== undefined && capability.provider.new_adoption !== "forbidden") fail(`${capability.id}.provider.new_adoption 只能为 forbidden`);
    if (capability.provider.new_adoption === "forbidden" && capability.provider.failure_code !== "component-new-adoption-forbidden") {
      fail(`${capability.id}.provider.failure_code 必须为 component-new-adoption-forbidden`);
    }
    if (capability.provider.failure_code !== undefined && capability.provider.new_adoption !== "forbidden") fail(`${capability.id}.provider.failure_code 仅用于禁止新接入`);
    if (capability.component_binding !== undefined) fail(`${capability.id}.component_binding 已由 provider 取代`);
    capabilitySkills.add(capability.primary_skill);
  }
  if (backendPlatforms) {
    const catalogIds = new Set((backendPlatforms.compatibility ?? []).flatMap((item) => Object.keys(item.component_capabilities ?? {})));
    for (const capability of registry.capabilities.filter((item) => item.provider.kind === "yss-component")) {
      if (!catalogIds.has(capability.provider.binding_id)) fail(`${capability.id} 的 YSS component binding 未登记到后端平台目录: ${capability.provider.binding_id}`);
    }
  }
  for (const skill of skills.filter((item) => item.impacts.includes("backend") && item.maturity !== "deprecated")) {
    if (!capabilitySkills.has(skill.id)) fail(`backend skill 缺少 capability: ${skill.id}`);
  }

  const backendDomains = registry.backend_skill_domains;
  requireObject(backendDomains, "backend_skill_domains");
  if (backendDomains.schema_version !== 1 || backendDomains.scope !== "active-yss-backend-capability-owners") fail("backend_skill_domains 必须使用 schema v1 与 active-yss-backend-capability-owners scope");
  requireStringSet(backendDomains.domain_ids, [...BACKEND_SKILL_DOMAINS], "backend_skill_domains.domain_ids");
  requireObject(backendDomains.assignments, "backend_skill_domains.assignments");
  const backendCapabilityOwners = [...new Set(registry.capabilities
    .filter((capability) => capability.id !== "scaffold.frontend-vue3" && capability.primary_skill.startsWith("yss-"))
    .map((capability) => capability.primary_skill))];
  requireStringSet(Object.keys(backendDomains.assignments), backendCapabilityOwners, "backend_skill_domains.assignments");
  for (const [skillId, domainId] of Object.entries(backendDomains.assignments)) {
    if (!BACKEND_SKILL_DOMAINS.has(domainId)) fail(`backend skill ${skillId} 使用未知能力域: ${domainId}`);
    if (deprecatedSkillIds.has(skillId)) fail(`deprecated skill 不得进入 active backend domain: ${skillId}`);
  }
  requireStringSet(backendDomains.deprecated_skills, [...deprecatedSkillIds], "backend_skill_domains.deprecated_skills");

  if (!Array.isArray(registry.recipes) || registry.recipes.length === 0) fail("recipes 不能为空");
  const recipeIds = new Set();
  for (const [index, recipe] of registry.recipes.entries()) {
    const prefix = `recipes[${index}]`;
    requireObject(recipe, prefix);
    requireString(recipe.id, `${prefix}.id`);
    if (!CAPABILITY_ID_PATTERN.test(recipe.id)) fail(`${prefix}.id 必须使用 dotted namespace: ${recipe.id}`);
    if (recipeIds.has(recipe.id)) fail(`重复 recipe id: ${recipe.id}`);
    recipeIds.add(recipe.id);
    requireStringArray(recipe.capabilities, `${prefix}.capabilities`, { nonEmpty: true });
    for (const capabilityId of recipe.capabilities) if (!capabilityIds.has(capabilityId)) fail(`${recipe.id} 引用了未知 capability: ${capabilityId}`);
    if (recipe.skills !== undefined) fail(`${recipe.id} 只能引用 capabilities，不能直接引用 skills`);
  }

  requireObject(registry.skill_dependencies, "skill_dependencies");
  const requiredGraph = new Map([...ids].map((id) => [id, []]));
  for (const [owner, dependencies] of Object.entries(registry.skill_dependencies)) {
    if (!ids.has(owner)) fail(`skill_dependencies 使用未知 owner: ${owner}`);
    if (deprecatedSkillIds.has(owner)) fail(`deprecated skill 不得拥有 typed dependency: ${owner}`);
    if (!Array.isArray(dependencies)) fail(`skill_dependencies.${owner} 必须是数组`);
    const edgeKeys = new Set();
    for (const [index, dependency] of dependencies.entries()) {
      const prefix = `skill_dependencies.${owner}[${index}]`;
      requireObject(dependency, prefix);
      requireString(dependency.skill, `${prefix}.skill`);
      if (!registeredDependency(dependency.skill)) fail(`${owner} 的依赖引用了未登记技能: ${dependency.skill}`);
      if (deprecatedSkillIds.has(dependency.skill)) fail(`${owner} 不得依赖 deprecated skill: ${dependency.skill}`);
      if (dependency.skill === owner) fail(`${owner} 不得依赖自身`);
      if (!DEPENDENCY_TYPES.has(dependency.type)) fail(`${owner} 使用未知依赖类型: ${dependency.type}`);
      if (dependency.type === "context-conditional") requireString(dependency.when, `${prefix}.when`);
      if (dependency.when !== undefined) requireString(dependency.when, `${prefix}.when`);
      const edgeKey = `${dependency.skill}\0${dependency.type}\0${dependency.when ?? ""}`;
      if (edgeKeys.has(edgeKey)) fail(`${owner} 包含重复依赖: ${dependency.skill}`);
      edgeKeys.add(edgeKey);
      if (dependency.type === "context-required" && ids.has(dependency.skill)) requiredGraph.get(owner).push(dependency.skill);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (skillId, chain = []) => {
    if (visiting.has(skillId)) fail(`context-required 依赖存在循环: ${[...chain, skillId].join(" -> ")}`);
    if (visited.has(skillId)) return;
    visiting.add(skillId);
    for (const dependency of requiredGraph.get(skillId) ?? []) visit(dependency, [...chain, skillId]);
    visiting.delete(skillId);
    visited.add(skillId);
  };
  for (const skillId of ids) visit(skillId);

  if (lock) {
    const shared = Object.keys(lock.skills?.shared ?? {}).sort();
    const registered = [...ids].sort();
    const missing = shared.filter((name) => !ids.has(name));
    const extra = registered.filter((name) => !shared.includes(name));
    if (missing.length) fail(`注册表缺少锁文件共享技能: ${missing.join(", ")}`);
    if (extra.length) fail(`注册表包含未锁定共享技能: ${extra.join(", ")}`);
    const platformLock = lock.skills?.platform ?? {};
    for (const [root, group] of Object.entries(platformLock)) {
      for (const name of Object.keys(group)) {
        if (!platformIds.has(`${root}:${name}`)) fail(`注册表缺少平台技能 ${root}/${name}`);
      }
    }
    for (const key of platformIds) {
      const [root, name] = key.split(":");
      if (!platformLock[root]?.[name]) fail(`注册表平台技能未出现在锁文件: ${root}/${name}`);
    }
    if (JSON.stringify(lock.projectionRoots) !== JSON.stringify(PROJECTION_ROOTS)) {
      fail("skills-lock.json projectionRoots 与权威投影清单不一致");
    }
  }

  if (skillSource) {
    for (const skill of skills) {
      const skillMd = skillSource(skill.id);
      const discovered = frontmatterName(skillMd);
      if (discovered !== skill.id && aliases.get(discovered) !== skill.id) {
        fail(`${skill.id} 的 SKILL.md name=${discovered} 既不是 id 也不在 aliases 中`);
      }
    }
  }

  if (compilerContract) {
    const deprecatedCompilerRefs = exactValuePaths(compilerContract, deprecatedSkillIds);
    if (deprecatedCompilerRefs.length) fail(`实现合同编译器合同仍引用 deprecated skill: ${deprecatedCompilerRefs.join(", ")}`);
    if (compilerContract.schema_version !== 2) fail("compiler-contract.yaml schema_version 必须为 2；v1 已停止支持");
    if (compilerContract.compiled_by !== "yss-implementation-contract-compiler") fail("compiler-contract.yaml compiled_by 无效");
    if (compilerContract.capability_source !== ".template-spec/agents/yss-skill-registry.yaml") fail("compiler-contract.yaml capability_source 必须指向技能注册表");
    if (compilerContract.recipe_source !== ".template-spec/agents/yss-skill-registry.yaml") fail("compiler-contract.yaml recipe_source 必须指向技能注册表");
    requireObject(compilerContract.impact_to_capabilities, "compiler-contract.impact_to_capabilities");
    for (const [impact, mapped] of Object.entries(compilerContract.impact_to_capabilities)) {
      requireStringArray(mapped, `compiler-contract.impact_to_capabilities.${impact}`, { nonEmpty: true });
      for (const capabilityId of mapped) if (!capabilityIds.has(capabilityId)) fail(`${impact} 映射了未知 capability: ${capabilityId}`);
    }
    for (const forbidden of ["skill_aliases", "skill_dependencies", "capabilities", "recipes", "dependency_closure", "end_to_end_backend_required", "component_impact_routing"]) {
      if (compilerContract[forbidden] !== undefined) fail(`compiler-contract.yaml 不得重复注册表事实: ${forbidden}`);
    }
  }

  if (lifecycleContract || existsSync(LIFECYCLE_CONTRACT)) {
    const lifecycle = lifecycleContract ?? yamlFromFile(LIFECYCLE_CONTRACT, "生命周期编排合同");
    const deprecatedLifecycleRefs = exactValuePaths(lifecycle, deprecatedSkillIds);
    if (deprecatedLifecycleRefs.length) fail(`生命周期编排合同仍引用 deprecated skill: ${deprecatedLifecycleRefs.join(", ")}`);
    const routes = lifecycle.work_unit_routes;
    if (!routes || typeof routes !== "object" || Array.isArray(routes)) fail("生命周期编排合同缺少 work_unit_routes");
    const resolve = (name) => {
      if (deprecatedSkillIds.has(name)) return null;
      if (ids.has(name)) return name;
      if (aliases.has(name)) return aliases.get(name);
      if (platformAliases.has(name)) return platformAliases.get(name);
      if (externalIds.has(name)) return name;
      if ([...platformIds].some((key) => key.endsWith(`:${name}`))) return name;
      return null;
    };
    for (const [routeId, route] of Object.entries(routes)) {
      if (!route || typeof route !== "object") fail(`${routeId} 生命周期路由必须是对象`);
      requireString(route.primary_skill, `${routeId}.primary_skill`);
      if (!Array.isArray(route.supporting_skills)) fail(`${routeId}.supporting_skills 必须是数组`);
      if (!Array.isArray(route.skills) || route.skills.length === 0) fail(`${routeId}.skills 不能为空`);
      if (!route.applies_when || !route.not_applicable_reason) fail(`${routeId} 缺少 applies_when 或 not_applicable_reason`);
      for (const name of [route.primary_skill, ...route.supporting_skills, ...route.skills]) {
        if (deprecatedSkillIds.has(name)) fail(`生命周期路由不得引用 deprecated skill: ${routeId} -> ${name}`);
        if (!resolve(name)) fail(`生命周期路由引用了未登记技能: ${routeId} -> ${name}`);
      }
      if (route.frontend_route) {
        requireString(route.frontend_route.primary_skill, `${routeId}.frontend_route.primary_skill`);
        requireString(route.frontend_route.page_generation_skill, `${routeId}.frontend_route.page_generation_skill`);
        requireString(route.frontend_route.page_orchestration_skill, `${routeId}.frontend_route.page_orchestration_skill`);
        const conditional = route.frontend_route.conditional_skills;
        if (!conditional || typeof conditional !== "object" || Array.isArray(conditional)) fail(`${routeId}.frontend_route.conditional_skills 必须是对象`);
        for (const [impact, names] of Object.entries(conditional)) {
          if (!Array.isArray(names) || names.length === 0) fail(`${routeId}.frontend_route.conditional_skills.${impact} 必须是非空数组`);
          for (const name of names) if (!resolve(name)) fail(`前端条件路由引用了未登记技能: ${routeId}.${impact} -> ${name}`);
          if (route.frontend_route.not_applicable_reasons && typeof route.frontend_route.not_applicable_reasons[impact] !== "string") {
            fail(`${routeId}.frontend_route.not_applicable_reasons.${impact} 必须是字符串`);
          }
        }
        if (!resolve(route.frontend_route.primary_skill) || !resolve(route.frontend_route.page_generation_skill) || !resolve(route.frontend_route.page_orchestration_skill)) {
          fail(`${routeId}.frontend_route 主入口引用了未登记技能`);
        }
      }
      if (routeId === "work-unit.prototype-design") {
        if (!route.skills.includes("prototype-review") || !route.supporting_skills.includes("prototype-review")) {
          fail("原型工作单元必须包含独立 prototype-review supporting skill");
        }
        if (route.primary_skill === "prototype-review") fail("prototype-review 必须作为独立 supporting skill，不得成为生命周期主技能");
      }
      if (routeId === "work-unit.code-review") validateCodeReviewRoute(route, resolve);
    }
    if (lifecycle.review_input) validateReviewInputFinding(lifecycle.review_input);
  }

  return {
    schema_version: registry.schema_version,
    skill_count: skills.length,
    platform_count: platform.length,
    deprecated_count: deprecatedSkillIds.size,
    status: registry.status
  };
}

export function validateDefaultSkillRegistry() {
  const registry = loadSkillRegistry();
  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  const backendPlatforms = JSON.parse(readFileSync(BACKEND_PLATFORMS, "utf8"));
  const compilerContract = yamlFromFile(COMPILER_CONTRACT, "实现合同编译器合同");
  return validateSkillRegistry(registry, {
    lock,
    backendPlatforms,
    compilerContract,
    lifecycleContract: yamlFromFile(LIFECYCLE_CONTRACT, "生命周期编排合同"),
    skillSource: (id) => readFileSync(path.join(ROOT, ".agents/skills", id, "SKILL.md"), "utf8"),
    externalSkillSource: (source) => readFileSync(path.join(ROOT, source), "utf8"),
    nestedSkillSources: nestedSkillPaths().map((source) => `.agents/skills/${source}`)
  });
}
