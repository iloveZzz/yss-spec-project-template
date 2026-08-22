import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { PROJECTION_ROOTS, ROOT } from "./skill-supply-chain.mjs";

export const DEFAULT_REGISTRY = path.join(ROOT, "docs/agents/yss-skill-registry.yaml");
const LOCK_PATH = path.join(ROOT, "skills-lock.json");
const ROUTER_CONTRACT = path.join(ROOT, ".agents/skills/yss-router/references/router-contract.yaml");
const LAYERS = new Set(["core", "specialist", "compatibility", "maintainer-only"]);
const MATURITIES = new Set(["draft", "verified", "supported", "deprecated"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

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

export function validateSkillRegistry(registry, { lock, routerContract, skillSource } = {}) {
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
    hermes: ".hermes/skills",
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
    if ((skill.layer === "specialist" || skill.layer === "maintainer-only") && skill.instance_default_discoverable !== false) {
      fail(`${skill.id} 作为 ${skill.layer} 不得默认可发现`);
    }
    if (skill.maturity === "deprecated") requireString(skill.replaced_by, `${skill.id}.replaced_by`);
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
  }
  for (const skill of skills) {
    if (skill.replaced_by && !ids.has(skill.replaced_by)) fail(`${skill.id}.replaced_by 引用了未登记技能: ${skill.replaced_by}`);
  }

  const platform = registry.platform_skills ?? [];
  if (!Array.isArray(platform)) fail("platform_skills 必须是数组");
  const platformIds = new Set();
  for (const skill of platform) {
    requireString(skill.id, "platform_skills.id");
    requireString(skill.root, `${skill.id}.root`);
    if (!LAYERS.has(skill.layer)) fail(`${skill.id} 未知 layer`);
    if (typeof skill.instance_default_discoverable !== "boolean" || skill.instance_default_discoverable !== false) {
      fail(`${skill.id} 平台技能不得作为实例默认可发现`);
    }
    if (platformIds.has(`${skill.root}:${skill.id}`)) fail(`重复平台技能: ${skill.root}/${skill.id}`);
    platformIds.add(`${skill.root}:${skill.id}`);
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
      if (!ids.has(name) && !aliases.has(name)) fail(`Router 闭包引用了未登记技能: ${name}`);
    }
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
    skillSource: (id) => readFileSync(path.join(ROOT, ".agents/skills", id, "SKILL.md"), "utf8")
  });
}
