import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { PROJECTION_ROOTS, ROOT } from "./skill-supply-chain.mjs";

export const DEFAULT_REGISTRY = path.join(ROOT, "docs/agents/yss-skill-registry.yaml");
const LOCK_PATH = path.join(ROOT, "skills-lock.json");
const ROUTER_CONTRACT = path.join(ROOT, ".agents/skills/yss-router/references/router-contract.yaml");
const LIFECYCLE_CONTRACT = path.join(ROOT, ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml");
const LAYERS = new Set(["core", "specialist", "compatibility", "maintainer-only"]);
const MATURITIES = new Set(["draft", "verified", "supported", "deprecated"]);
const INVOCATION_MODES = new Set(["user", "model", "both"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const PLATFORM_ALIAS_PATTERN = /^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)?$/;

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
  if (contract.schema_version !== 1) fail("invocation_contract.schema_version 必须为 1");
  if (contract.scope !== "routing-and-dependencies-only") fail("invocation_contract.scope 必须限定为 routing-and-dependencies-only");
  requireStringArray(contract.required_fields, "invocation_contract.required_fields", { nonEmpty: true });
  const expected = ["invocation_mode", "trigger_conditions", "exclusion_conditions", "primary_output", "required_dependencies", "optional_dependencies"];
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
  requireStringArray(contract.default.required_dependencies, "invocation_contract.default.required_dependencies");
  requireStringArray(contract.default.optional_dependencies, "invocation_contract.default.optional_dependencies");
  for (const [skillId, override] of Object.entries(contract.overrides)) {
    requireObject(override, `invocation_contract.overrides.${skillId}`);
    if (!ID_PATTERN.test(skillId)) fail(`invocation_contract.overrides id 非法: ${skillId}`);
    if (override.invocation_mode && !INVOCATION_MODES.has(override.invocation_mode)) fail(`${skillId}.invocation_mode 无效`);
    if (override.trigger_conditions) requireStringArray(override.trigger_conditions, `${skillId}.trigger_conditions`, { nonEmpty: true });
    if (override.exclusion_conditions) requireStringArray(override.exclusion_conditions, `${skillId}.exclusion_conditions`, { nonEmpty: true });
    if (override.primary_output) requireString(override.primary_output, `${skillId}.primary_output`);
    if (override.required_dependencies) requireStringArray(override.required_dependencies, `${skillId}.required_dependencies`);
    if (override.optional_dependencies) requireStringArray(override.optional_dependencies, `${skillId}.optional_dependencies`);
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
  requireStringArray(effective.required_dependencies, `${skill.id}.required_dependencies`);
  requireStringArray(effective.optional_dependencies, `${skill.id}.optional_dependencies`);
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
  if (stale.next !== "router-or-earlier-lifecycle") fail("合同 stale 后必须回 Router 或更早生命周期阶段");
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

export function validateSkillRegistry(registry, { lock, routerContract, lifecycleContract, skillSource } = {}) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) fail("技能路由注册表必须是对象");
  if (registry.schema_version !== 1) fail("schema_version 必须为 1");
  if (registry.registry_id !== "yss.skill-routing") fail("registry_id 必须为 yss.skill-routing");
  if (!["shadow", "active"].includes(registry.status)) fail("status 必须是 shadow 或 active");
  requireString(registry.description, "description");
  requireString(registry.canonical_content_root, "canonical_content_root");
  if (registry.canonical_content_root !== ".agents/skills") fail("canonical_content_root 必须为 .agents/skills");
  const runtime = registry.runtime_policy;
  if (!runtime || typeof runtime !== "object") fail("缺少 runtime_policy");
  if (typeof runtime.consumed_by_router !== "boolean" || typeof runtime.consumed_by_lifecycle !== "boolean" || typeof runtime.discovery_enforced !== "boolean") {
    fail("runtime_policy 必须声明 consumed_by_router、consumed_by_lifecycle、discovery_enforced");
  }
  if (registry.status === "shadow" && (runtime.consumed_by_router || runtime.consumed_by_lifecycle || runtime.discovery_enforced)) {
    fail("shadow 注册表不得被 Router、生命周期或发现面强制消费");
  }
  const roots = registry.agent_runtime_roots;
  if (!roots || typeof roots !== "object" || Array.isArray(roots)) fail("缺少 agent_runtime_roots");
  const expected = {
    claude: ".claude/skills",
    codex: ".codex/skills",
    cursor: ".cursor/skills",
    pi: ".pi/skills",
    qoder: ".qoder/skills",
    trae: ".trae/skills"
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
      requireString(skill.replaced_by, `${skill.id}.replaced_by`);
      requireString(skill.migration_deadline, `${skill.id}.migration_deadline`);
      requireString(skill.cleanup_status, `${skill.id}.cleanup_status`);
    }
    if (skill.replaced_by && !ids.has(skill.replaced_by) && !skills.some((item) => item.id === skill.replaced_by)) {
      // resolved in second pass
    }
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
    if (skill.replaced_by && !ids.has(skill.replaced_by)) fail(`${skill.id}.replaced_by 引用了未登记技能: ${skill.replaced_by}`);
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
  for (const skill of external) {
    requireString(skill.id, "external_skills.id");
    requireString(skill.source, `${skill.id}.source`);
    if (externalIds.has(skill.id) || ids.has(skill.id) || aliases.has(skill.id) || platformAliases.has(skill.id)) fail(`external skill 冲突: ${skill.id}`);
    externalIds.add(skill.id);
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
  for (const skill of skills) {
    const effective = effectiveInvocationContract(registry, skill);
    const required = effective.required_dependencies ?? [];
    const optional = effective.optional_dependencies ?? [];
    for (const dependency of [...required, ...optional]) {
      if (!registeredDependency(dependency)) fail(`${skill.id} 的调用契约依赖引用了未登记技能: ${dependency}`);
      if (dependency === skill.id) fail(`${skill.id} 的调用契约不得依赖自身`);
    }
    const overlap = required.filter((dependency) => optional.includes(dependency));
    if (overlap.length) fail(`${skill.id} 的必需依赖与可选依赖重复: ${overlap.join(", ")}`);
  }

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

  if (routerContract) {
    const declared = routerContract.skill_aliases;
    if (!declared || typeof declared !== "object" || Array.isArray(declared)) fail("router-contract.yaml 缺少 skill_aliases");
    for (const [alias, canonical] of Object.entries(declared)) {
      if (aliases.get(alias) !== canonical) fail(`router-contract alias ${alias} -> ${canonical} 与注册表不一致`);
    }
    for (const [alias, canonical] of aliases.entries()) {
      if (declared[alias] !== canonical) fail(`注册表 alias ${alias} 未写入 router-contract.skill_aliases`);
    }
    const closures = Object.keys(routerContract.dependency_closure ?? {});
    for (const name of closures) {
      if (!ids.has(name) && !aliases.has(name) && !externalIds.has(name)) fail(`Router 闭包引用了未登记技能: ${name}`);
    }
    for (const dependencies of Object.values(routerContract.dependency_closure ?? {})) {
      for (const names of Object.values(dependencies ?? {})) {
        for (const name of names ?? []) if (!ids.has(name) && !aliases.has(name) && !externalIds.has(name)) fail(`Router 依赖引用了未登记技能: ${name}`);
      }
    }
    for (const skillId of Object.keys(registry.invocation_contract.overrides)) {
      const closure = routerContract.dependency_closure?.[skillId];
      if (!closure) fail(`Router dependency_closure 缺少注册表覆写技能: ${skillId}`);
      const skill = skills.find((item) => item.id === skillId);
      const effective = effectiveInvocationContract(registry, skill);
      const required = effective.required_dependencies ?? [];
      const optional = effective.optional_dependencies ?? [];
      const always = closure.always ?? [];
      const conditional = Object.entries(closure)
        .filter(([condition]) => condition !== "always")
        .flatMap(([, names]) => names ?? []);
      if (!sameStringSet(required, always)) {
        fail(`${skillId} 的静态必需依赖与 Router always 不一致`);
      }
      if (!sameStringSet(optional, conditional)) {
        fail(`${skillId} 的可选依赖与 Router 条件依赖不一致`);
      }
    }
  }

  if (lifecycleContract || existsSync(LIFECYCLE_CONTRACT)) {
    const lifecycle = lifecycleContract ?? yamlFromFile(LIFECYCLE_CONTRACT, "生命周期编排合同");
    const routes = lifecycle.work_unit_routes;
    if (!routes || typeof routes !== "object" || Array.isArray(routes)) fail("生命周期编排合同缺少 work_unit_routes");
    const resolve = (name) => {
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

  return { skill_count: skills.length, platform_count: platform.length, status: registry.status };
}

export function validateDefaultSkillRegistry() {
  const registry = loadSkillRegistry();
  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  const routerContract = yamlFromFile(ROUTER_CONTRACT, "Router 合同");
  return validateSkillRegistry(registry, {
    lock,
    routerContract,
    lifecycleContract: yamlFromFile(LIFECYCLE_CONTRACT, "生命周期编排合同"),
    skillSource: (id) => readFileSync(path.join(ROOT, ".agents/skills", id, "SKILL.md"), "utf8")
  });
}
