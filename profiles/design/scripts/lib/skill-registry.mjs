import { existsSync, readFileSync } from "./validation-phase.mjs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { PROJECTION_ROOTS, ROOT } from "./skill-supply-chain.mjs";

export const DEFAULT_REGISTRY = path.join(ROOT, ".template-spec/agents/yss-skill-registry.yaml");
const LOCK_PATH = path.join(ROOT, "skills-lock.json");
const ROUTER_CONTRACT = null;
const LIFECYCLE_CONTRACT = path.join(ROOT, ".agents/skills/yss-strategic-design/references/orchestration-contract.yaml");
const LAYERS = new Set(["core", "specialist", "compatibility", "maintainer-only"]);
const MATURITIES = new Set(["draft", "verified", "supported", "deprecated"]);
const INVOCATION_MODES = new Set(["user", "model", "both"]);
const DEPENDENCY_TYPES = new Set(["context-required", "context-conditional", "coordination-only", "review-only", "component-dependency"]);
const TASK_MODES = new Set(["guidance", "integration", "slice-implementation", "troubleshooting", "component-maintenance", "review-input", "contract-compilation", "reroute", "result-validation", "source-index-refresh"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
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

function validateInvocationMetadata(registry, skill, source, skillMd) {
  // Opt in through the registry so existing instances keep their declared contract.
  if (registry.invocation_contract.runtime_metadata_version !== 1) return;
  let metadata = {};
  if (source !== null && source !== undefined) {
    const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
    if (document.errors.length) fail(`${skill.id} 的 agents/openai.yaml 无效: ${document.errors[0].message}`);
    metadata = document.toJS({ maxAliasCount: 0 });
    requireObject(metadata, `${skill.id}.agents/openai.yaml`);
  }
  if (metadata.policy !== undefined) requireObject(metadata.policy, `${skill.id}.policy`);
  const declared = metadata.policy?.allow_implicit_invocation;
  if (declared !== undefined && typeof declared !== 'boolean') {
    fail(`${skill.id}.allow_implicit_invocation 必须为布尔值`);
  }
  const expected = effectiveInvocationContract(registry, skill).invocation_mode !== 'user';
  if (skillMd !== undefined) {
    const match = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) fail(`${skill.id} 的 SKILL.md 缺少 frontmatter`);
    const document = parseDocument(match[1], { maxAliasCount: 0, uniqueKeys: true });
    if (document.errors.length) fail(`${skill.id} 的 frontmatter 无效`);
    const header = document.toJS({ maxAliasCount: 0 });
    requireObject(header, `${skill.id}.frontmatter`);
    const disabled = header['disable-model-invocation'];
    if (disabled !== undefined && typeof disabled !== 'boolean') fail(`${skill.id}.disable-model-invocation 必须为布尔值`);
    if ((disabled ?? false) === expected) fail(`${skill.id}.disable-model-invocation 与注册表调用意图不一致`);
  }
  if ((declared ?? true) !== expected) {
    fail(`${skill.id}.allow_implicit_invocation 与注册表调用意图不一致，应为 ${expected}`);
  }
}

function requireStringSet(value, expected, field) {
  if (!Array.isArray(value)) fail(`${field} 必须是数组`);
  const missing = expected.filter((item) => !value.includes(item));
  const extra = value.filter((item) => !expected.includes(item));
  if (missing.length || extra.length) fail(`${field} 必须恰好为 ${expected.join(", ")}`);
}

function effectiveInvocationContract(registry, skill) {
  const contract = registry.invocation_contract;
  return {
    ...contract.default,
    ...contract.layer_defaults[skill.layer],
    ...(contract.overrides[skill.id] ?? {})
  };
}

function validateInvocationContract(registry, skill) {
  const contract = registry.invocation_contract;
  requireObject(contract, "invocation_contract");
  if (contract.runtime_metadata_version !== undefined && contract.runtime_metadata_version !== 1) {
    fail('invocation_contract.runtime_metadata_version 必须为 1；省略时保持历史声明校验');
  }
  if (contract.schema_version !== 2) fail("invocation_contract.schema_version 必须为 2");
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
  if (!INVOCATION_MODES.has(contract.default.invocation_mode)) fail("invocation_contract.default.invocation_mode 无效");
  requireStringArray(contract.default.trigger_conditions, "invocation_contract.default.trigger_conditions", { nonEmpty: true });
  requireStringArray(contract.default.exclusion_conditions, "invocation_contract.default.exclusion_conditions", { nonEmpty: true });
  requireString(contract.default.primary_output, "invocation_contract.default.primary_output");
  const knownIds = new Set(registry.skills.map((item) => item?.id).filter(Boolean));
  for (const [skillId, override] of Object.entries(contract.overrides)) {
    requireObject(override, `invocation_contract.overrides.${skillId}`);
    if (!knownIds.has(skillId)) fail(`invocation_contract.overrides 引用了未登记技能: ${skillId}`);
    if (override.invocation_mode && !INVOCATION_MODES.has(override.invocation_mode)) fail(`${skillId}.invocation_mode 无效`);
    if (override.trigger_conditions) requireStringArray(override.trigger_conditions, `${skillId}.trigger_conditions`, { nonEmpty: true });
    if (override.exclusion_conditions) requireStringArray(override.exclusion_conditions, `${skillId}.exclusion_conditions`, { nonEmpty: true });
    if (override.primary_output) requireString(override.primary_output, `${skillId}.primary_output`);
  }
  const effective = effectiveInvocationContract(registry, skill);
  effective.trigger_conditions = [...new Set([...(effective.trigger_conditions ?? []), ...skill.impacts.map((impact) => `impact:${impact}`)])];
  if (!INVOCATION_MODES.has(effective.invocation_mode)) fail(`${skill.id}.invocation_mode 无效`);
  requireStringArray(effective.trigger_conditions, `${skill.id}.trigger_conditions`, { nonEmpty: true });
  requireStringArray(effective.exclusion_conditions, `${skill.id}.exclusion_conditions`, { nonEmpty: true });
  requireString(effective.primary_output, `${skill.id}.primary_output`);
}

export function validateSkillRegistry(registry, { lock, routerContract, lifecycleContract, skillSource, skillMetadata } = {}) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) fail("技能路由注册表必须是对象");
  if (registry.schema_version !== 2) fail("schema_version 必须为 2；v1 已停止支持，请迁移 capability、typed dependencies 与 recipes");
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
  if (runtime.consumed_by_compiler !== false) fail("战略设计 profile 不得被实现合同编译器消费");
  if (registry.status === "shadow" && (runtime.consumed_by_compiler || runtime.consumed_by_lifecycle || runtime.discovery_enforced)) {
    fail("shadow 注册表不得被生命周期或发现面强制消费");
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
    if (skillMetadata) validateInvocationMetadata(registry, skill, skillMetadata(skill.id), skillSource?.(skill.id));
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
  const capabilityContract = registry.capability_contract;
  requireObject(capabilityContract, "capability_contract");
  if (capabilityContract.schema_version !== 2) fail("capability_contract.schema_version 必须为 2");
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

  if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) fail("capabilities 不能为空");
  const capabilityIds = new Set();
  for (const [index, capability] of registry.capabilities.entries()) {
    const prefix = `capabilities[${index}]`;
    requireObject(capability, prefix);
    requireString(capability.id, `${prefix}.id`);
    if (!CAPABILITY_ID_PATTERN.test(capability.id)) fail(`${prefix}.id 必须使用 dotted namespace: ${capability.id}`);
    if (capabilityIds.has(capability.id)) fail(`重复 capability id: ${capability.id}`);
    capabilityIds.add(capability.id);
    requireString(capability.primary_skill, `${prefix}.primary_skill`);
    if (!ids.has(capability.primary_skill)) fail(`${capability.id} 的 primary_skill 未登记: ${capability.primary_skill}`);
    requireStringArray(capability.task_modes, `${prefix}.task_modes`, { nonEmpty: true });
    for (const mode of capability.task_modes) if (!TASK_MODES.has(mode)) fail(`${capability.id} 使用未知 task mode: ${mode}`);
  }

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
    if (!Array.isArray(dependencies)) fail(`skill_dependencies.${owner} 必须是数组`);
    const edgeKeys = new Set();
    for (const [index, dependency] of dependencies.entries()) {
      const prefix = `skill_dependencies.${owner}[${index}]`;
      requireObject(dependency, prefix);
      requireString(dependency.skill, `${prefix}.skill`);
      if (!registeredDependency(dependency.skill)) fail(`${owner} 的依赖引用了未登记技能: ${dependency.skill}`);
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
    const localRouteIds = new Set(lifecycle.profile_registry?.allowed_local_work_units || Object.keys(routes));
    for (const [routeId, route] of Object.entries(routes)) {
      if (!localRouteIds.has(routeId)) continue;
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
        if (!resolve(route.frontend_route.primary_skill) || !resolve(route.frontend_route.page_orchestration_skill)) {
          fail(`${routeId}.frontend_route 主入口引用了未登记技能`);
        }
      }
      if (routeId === "work-unit.prototype-design") {
        if (!route.skills.includes("prototype-review") || !route.supporting_skills.includes("prototype-review")) {
          fail("原型工作单元必须包含独立 prototype-review supporting skill");
        }
        if (route.primary_skill === "prototype-review") fail("prototype-review 必须作为独立 supporting skill，不得成为生命周期主技能");
      }
    }
  }

  return { skill_count: skills.length, platform_count: platform.length, status: registry.status };
}

export function validateDefaultSkillRegistry() {
  const registry = loadSkillRegistry();
  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  return validateSkillRegistry(registry, {
    lock,
    routerContract: null,
    lifecycleContract: yamlFromFile(LIFECYCLE_CONTRACT, "生命周期编排合同"),
    skillSource: (id) => readFileSync(path.join(ROOT, ".agents/skills", id, "SKILL.md"), "utf8"),
    skillMetadata: (id) => {
      const file = path.join(ROOT, '.agents/skills', id, 'agents/openai.yaml');
      return existsSync(file) ? readFileSync(file, 'utf8') : null;
    }
  });
}
