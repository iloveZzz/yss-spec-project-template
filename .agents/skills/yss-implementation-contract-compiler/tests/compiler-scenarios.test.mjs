import assert from "node:assert/strict";
import test from "node:test";
import {
  compileImplementationContract,
  digestDocument,
  evaluateContractFreshness,
  loadCompilerContract,
  validateExecutionResult
} from "../../../../scripts/lib/implementation-contract-compiler.mjs";
import { loadSkillRegistry } from "../../../../scripts/lib/skill-registry.mjs";

const registry = loadSkillRegistry();
const compilerContract = loadCompilerContract();
const fixed = "2026-09-04T00:00:00.000Z";
const identity = { architecture_family: "domain-driven", architecture_profile: "target-domain-model", generator_skill: "yss-ddd-scaffold-generator", requested_capabilities: [], resolved_modules: ["domain", "application", "infrastructure", "adapter", "bootstrap"], verification_database: "h2", production_database: "not-bound", contract_digest: "a".repeat(64) };
const architecture = { architecture_identity: identity, architecture_evidence: { engineering_baseline: identity, repository_registration: identity, manifest: identity } };
const compile = (input) => compileImplementationContract({ registry, compilerContract, compiledAt: fixed, ...architecture, ...input });

test("combines narrow recipes once and preserves deterministic output", () => {
  const input = {
    recipeIds: ["backend.ddd-http-api", "backend.ddd-domain-behavior", "backend.ddd-persistence-mybatis"],
    conditions: ["mybatis", "conversion", "pojo", "request-validation", "error-mapping"]
  };
  const first = compile(input);
  const second = compile({ ...input, recipeIds: [...input.recipeIds].reverse(), conditions: [...input.conditions].reverse() });
  assert.deepEqual(first, second);
  assert.deepEqual(first.recipe_ids, ["backend.ddd-domain-behavior", "backend.ddd-persistence-mybatis", "backend.ddd-http-api"]);
  for (const skill of ["yss-domain", "yss-application", "yss-repository", "yss-mybatis", "yss-web-controller", "yss-dto", "yss-validation", "yss-exception", "mapstruct", "lombok", "alibaba-java-code-style"]) {
    assert.equal(first.required_skills.filter((candidate) => candidate === skill).length, 1, `${skill} should appear once`);
  }
});

test("does not promote conditional or component dependencies without explicit input", () => {
  const persistence = compile({ requiredCapabilities: ["layer.persistence"] });
  assert.deepEqual(persistence.required_skills, ["alibaba-java-code-style", "yss-repository"]);
  assert.equal(persistence.required_skills.includes("yss-mybatis"), false);
  assert.equal(persistence.required_skills.includes("mapstruct"), false);
  assert.equal(persistence.required_skills.includes("lombok"), false);

  const validation = compile({ requiredCapabilities: ["contract.request-validation"] });
  assert.deepEqual(validation.required_skills, ["yss-validation"]);
  assert.equal(validation.required_skills.includes("yss-exception"), false);
  assert.ok(validation.non_expanding_dependencies.some((edge) => edge.from === "yss-validation" && edge.skill === "yss-exception"));
});

test("loads only explicitly satisfied context-conditional dependencies", () => {
  const persistence = compile({ requiredCapabilities: ["layer.persistence"], conditions: ["mybatis"] });
  assert.equal(persistence.required_skills.includes("yss-mybatis"), true);
  assert.equal(persistence.required_skills.includes("mapstruct"), false);
  assert.equal(persistence.required_skills.includes("lombok"), false);
});

test("rejects recipes that reference skills and context-required cycles", () => {
  const invalidRecipeRegistry = structuredClone(registry);
  invalidRecipeRegistry.recipes[0].skills = ["yss-domain"];
  assert.throws(() => compileImplementationContract({ ...architecture, registry: invalidRecipeRegistry, compilerContract, recipeIds: [invalidRecipeRegistry.recipes[0].id] }), /不得直接引用 skills/);

  const cyclicRegistry = structuredClone(registry);
  cyclicRegistry.skill_dependencies["alibaba-java-code-style"] = [{ skill: "yss-domain", type: "context-required" }];
  assert.throws(() => compileImplementationContract({ ...architecture, registry: cyclicRegistry, compilerContract, requiredCapabilities: ["layer.domain"] }), /依赖循环/);
});

test("rejects removed ids and schema v1 without compatibility", () => {
  assert.throws(() => compile({ recipeIds: ["yss-router"] }), /已移除 skill id/);
  assert.throws(() => compileImplementationContract({ registry: { ...registry, schema_version: 1 }, compilerContract, requiredCapabilities: ["layer.domain"] }), /schema v1 已停止支持/);
  assert.throws(() => compileImplementationContract({ registry, compilerContract: { ...compilerContract, schema_version: 1 }, requiredCapabilities: ["layer.domain"] }), /schema v1 已停止支持/);
});

test("marks digest drift stale and validates v2 execution evidence", () => {
  const resolution = compile({ requiredCapabilities: ["contract.request-validation"], architecture_identity: undefined, architecture_evidence: undefined });
  const contract = { schema_version: 2, contract_id: "slice-1", contract_version: 1, resolution };
  assert.deepEqual(evaluateContractFreshness(contract, { registry, compilerContract }), { freshness: "current", reasons: [] });
  const changedRegistry = structuredClone(registry);
  changedRegistry.description += " changed";
  assert.equal(evaluateContractFreshness(contract, { registry: changedRegistry, compilerContract }).freshness, "stale");

  const result = {
    schema_version: 2,
    status: "implemented",
    consumed_contract: {
      contract_id: "slice-1",
      contract_version: 1,
      registry_digest: digestDocument(registry),
      compiler_contract_digest: digestDocument(compilerContract)
    },
    verification_results: [{ command: "./mvnw test", exit_code: 0, executed_at: fixed }],
    new_impacts: []
  };
  assert.deepEqual(validateExecutionResult(result, contract, { registry, compilerContract }), { status: "accepted", blockers: [] });
  assert.deepEqual(validateExecutionResult({ ...result, new_impacts: [{ impact_type: "cache" }] }, contract, { registry, compilerContract }), { status: "blocked", blockers: ["new-impacts"] });
});
