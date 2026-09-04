import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { DEFAULT_REGISTRY, loadSkillRegistry } from "./skill-registry.mjs";
import { ROOT } from "./skill-supply-chain.mjs";

export const DEFAULT_COMPILER_CONTRACT = path.join(
  ROOT,
  ".agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml"
);

const REMOVED_SKILL_IDS = new Set(["yss-router", "yss-source-index"]);
const EXPANDING_TYPES = new Set(["context-required", "context-conditional"]);
const EXECUTION_STATUSES = new Set(["implemented", "seam-deferred", "drift", "violation", "not-applicable"]);

function fail(message) {
  throw new TypeError(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

export function digestDocument(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function loadYaml(filePath, label) {
  const document = parseDocument(readFileSync(filePath, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) fail(`${label} 无法解析: ${document.errors[0].message}`);
  return document.toJS({ maxAliasCount: 0 });
}

export function loadCompilerContract(filePath = DEFAULT_COMPILER_CONTRACT) {
  return loadYaml(filePath, "实现合同编译器合同");
}

function assertV2(registry, compilerContract) {
  if (registry?.schema_version !== 2) fail("技能注册表 schema v1 已停止支持；请迁移到 capability/typed-dependency v2");
  if (compilerContract?.schema_version !== 2) fail("实现合同编译器合同 schema v1 已停止支持；请迁移到 v2");
}

function assertNoRemovedId(value, field) {
  for (const id of value) if (REMOVED_SKILL_IDS.has(id)) fail(`${field} 使用已移除 skill id ${id}；不提供兼容 alias`);
}

/**
 * 把多个窄 Recipe 与显式 capability 合并为一个确定性的最小 skill 闭包。
 */
export function compileImplementationContract({
  registry,
  compilerContract,
  recipeIds = [],
  requiredCapabilities = [],
  conditions = [],
  compiledAt = new Date().toISOString(),
  registryDigest,
  compilerContractDigest
}) {
  assertV2(registry, compilerContract);
  if (!Array.isArray(recipeIds) || !Array.isArray(requiredCapabilities) || !Array.isArray(conditions)) {
    fail("recipeIds、requiredCapabilities 与 conditions 必须是数组");
  }
  assertNoRemovedId(recipeIds, "recipeIds");
  assertNoRemovedId(requiredCapabilities, "requiredCapabilities");

  const requestedRecipes = new Set(recipeIds);
  const knownRecipes = new Map(registry.recipes.map((recipe) => [recipe.id, recipe]));
  for (const recipeId of requestedRecipes) if (!knownRecipes.has(recipeId)) fail(`未知 recipe: ${recipeId}`);
  const orderedRecipes = registry.recipes.filter((recipe) => requestedRecipes.has(recipe.id));

  const capabilitySources = new Map();
  const orderedCapabilities = [];
  const addCapability = (capabilityId, source) => {
    if (!capabilitySources.has(capabilityId)) {
      capabilitySources.set(capabilityId, []);
      orderedCapabilities.push(capabilityId);
    }
    capabilitySources.get(capabilityId).push(source);
  };
  for (const recipe of orderedRecipes) {
    if (recipe.skills !== undefined) fail(`recipe ${recipe.id} 不得直接引用 skills`);
    for (const capabilityId of recipe.capabilities) addCapability(capabilityId, { kind: "recipe", recipe_id: recipe.id });
  }
  for (const capabilityId of requiredCapabilities) addCapability(capabilityId, { kind: "explicit-capability" });
  if (!orderedCapabilities.length) fail("至少需要一个 recipe 或 required capability");

  const capabilities = new Map(registry.capabilities.map((capability) => [capability.id, capability]));
  for (const capabilityId of orderedCapabilities) if (!capabilities.has(capabilityId)) fail(`未知 capability: ${capabilityId}`);
  const knownSkills = new Set(registry.skills.map((skill) => skill.id));
  const conditionSet = new Set(conditions);
  const reasons = new Map();
  const nonExpanding = [];
  const excludedConditional = [];
  const addReason = (skill, reason) => {
    if (!reasons.has(skill)) reasons.set(skill, []);
    const encoded = JSON.stringify(reason);
    if (!reasons.get(skill).some((item) => JSON.stringify(item) === encoded)) reasons.get(skill).push(reason);
  };

  const roots = [];
  for (const capabilityId of orderedCapabilities) {
    const skill = capabilities.get(capabilityId).primary_skill;
    if (!knownSkills.has(skill)) fail(`${capabilityId} 解析到未知 skill: ${skill}`);
    if (!roots.includes(skill)) roots.push(skill);
    for (const source of capabilitySources.get(capabilityId)) addReason(skill, { ...source, capability: capabilityId });
  }

  const visiting = new Set();
  const visited = new Set();
  const orderedSkills = [];
  const visit = (skill, chain = []) => {
    if (visiting.has(skill)) fail(`依赖循环: ${[...chain, skill].join(" -> ")}`);
    if (visited.has(skill)) return;
    visiting.add(skill);
    const dependencies = [...(registry.skill_dependencies?.[skill] ?? [])]
      .sort((left, right) => left.skill.localeCompare(right.skill));
    for (const dependency of dependencies) {
      const conditionMatches = !dependency.when || conditionSet.has(dependency.when);
      if (dependency.type === "context-conditional" && !conditionMatches) {
        excludedConditional.push({ from: skill, ...dependency });
        continue;
      }
      const reason = { kind: "dependency", from: skill, type: dependency.type, ...(dependency.when ? { condition: dependency.when } : {}) };
      if (!EXPANDING_TYPES.has(dependency.type)) {
        if (conditionMatches) nonExpanding.push({ skill: dependency.skill, ...reason });
        continue;
      }
      addReason(dependency.skill, reason);
      if (knownSkills.has(dependency.skill)) visit(dependency.skill, [...chain, skill]);
      else if (!orderedSkills.includes(dependency.skill)) orderedSkills.push(dependency.skill);
    }
    visiting.delete(skill);
    visited.add(skill);
    orderedSkills.push(skill);
  };
  for (const root of roots) visit(root);

  return {
    schema_version: 2,
    status: "draft",
    recipe_ids: orderedRecipes.map((recipe) => recipe.id),
    conditions: [...conditionSet].sort(),
    required_capabilities: orderedCapabilities,
    required_skills: orderedSkills,
    reason_chains: Object.fromEntries(orderedSkills.map((skill) => [skill, reasons.get(skill) ?? []])),
    non_expanding_dependencies: nonExpanding,
    excluded_conditional_dependencies: excludedConditional,
    registry_digest: registryDigest ?? digestDocument(registry),
    compiler_contract_digest: compilerContractDigest ?? digestDocument(compilerContract),
    compiled_at: compiledAt,
    freshness: "current"
  };
}

export function compileDefaultImplementationContract(input = {}) {
  return compileImplementationContract({
    ...input,
    registry: loadSkillRegistry(DEFAULT_REGISTRY),
    compilerContract: loadCompilerContract()
  });
}

export function evaluateContractFreshness(contract, { registry, compilerContract }) {
  assertV2(registry, compilerContract);
  if (contract?.schema_version !== 2) fail("Slice Implementation Contract schema v1 已停止支持；必须重新编译 v2 合同");
  const resolution = contract.resolution ?? contract;
  const reasons = [];
  if (resolution.registry_digest !== digestDocument(registry)) reasons.push("registry-digest-changed");
  if (resolution.compiler_contract_digest !== digestDocument(compilerContract)) reasons.push("compiler-contract-digest-changed");
  return { freshness: reasons.length ? "stale" : "current", reasons };
}

export function validateExecutionResult(result, contract, current) {
  if (result?.schema_version !== 2) fail("YSS Skill Execution Result schema v1 已停止支持；请迁移到 v2");
  if (contract?.schema_version !== 2) fail("Slice Implementation Contract schema v1 已停止支持；必须重新编译 v2 合同");
  if (!EXECUTION_STATUSES.has(result.status)) fail(`未知 execution result status: ${result.status}`);
  const freshness = evaluateContractFreshness(contract, current);
  if (freshness.freshness === "stale") return { status: "stale", blockers: freshness.reasons };
  const consumed = result.consumed_contract ?? {};
  const resolution = contract.resolution ?? contract;
  const blockers = [];
  if (consumed.contract_id !== contract.contract_id || consumed.contract_version !== contract.contract_version) blockers.push("contract-version-mismatch");
  if (consumed.registry_digest !== resolution.registry_digest || consumed.compiler_contract_digest !== resolution.compiler_contract_digest) blockers.push("resolution-digest-mismatch");
  if (!Array.isArray(result.verification_results) || !result.verification_results.length) blockers.push("verification-not-executed");
  else for (const item of result.verification_results) {
    if (!item?.command || item.exit_code === undefined || !item.executed_at) blockers.push("verification-result-incomplete");
  }
  if (Array.isArray(result.new_impacts) && result.new_impacts.length) blockers.push("new-impacts");
  return { status: blockers.length ? "blocked" : "accepted", blockers: [...new Set(blockers)] };
}
