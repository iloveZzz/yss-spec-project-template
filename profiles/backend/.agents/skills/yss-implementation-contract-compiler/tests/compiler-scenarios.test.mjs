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
import { loadBackendPlatforms, platformBinding } from "../../../../scripts/lib/backend-platform.mjs";

const registry = loadSkillRegistry();
const compilerContract = loadCompilerContract();
const fixed = "2026-09-04T00:00:00.000Z";
const identity = { architecture_family: "domain-driven", architecture_profile: "target-domain-model", generator_skill: "yss-ddd-scaffold-generator", requested_capabilities: [], resolved_modules: ["domain", "application", "infrastructure", "adapter", "bootstrap"], verification_database: "h2", production_database: "not-bound", contract_digest: "a".repeat(64) };
const architecture = { architecture_identity: identity, architecture_evidence: { engineering_baseline: identity, repository_registration: identity, manifest: identity } };
const compile = (input) => compileImplementationContract({ registry, compilerContract, compiledAt: fixed, ...architecture, ...input });
const stableComponentError = code => error => error?.code === code && new RegExp(`^component-capability: ${code}:`).test(error.message);

test("combines narrow recipes once and preserves deterministic output", () => {
  const input = {
    recipeIds: ["backend.ddd-domain-behavior"],
    conditions: ["conversion", "pojo"]
  };
  const first = compile(input);
  const second = compile({ ...input, recipeIds: [...input.recipeIds].reverse(), conditions: [...input.conditions].reverse() });
  assert.deepEqual(first, second);
  assert.deepEqual(first.recipe_ids, ["backend.ddd-domain-behavior"]);
  for (const skill of ["yss-domain", "yss-application", "mapstruct", "lombok", "alibaba-java-code-style"]) {
    assert.equal(first.required_skills.filter((candidate) => candidate === skill).length, 1, `${skill} should appear once`);
  }
});

test("does not promote conditional or component dependencies without explicit input", () => {
  const persistence = compile({ requiredCapabilities: ["layer.persistence"] });
  assert.deepEqual(persistence.required_skills, ["alibaba-java-code-style", "yss-repository"]);
  assert.equal(persistence.required_skills.includes("yss-mybatis"), false);
  assert.equal(persistence.required_skills.includes("mapstruct"), false);
  assert.equal(persistence.required_skills.includes("lombok"), false);

  assert.throws(
    () => compile({ requiredCapabilities: ["contract.request-validation"], architecture_identity: undefined, architecture_evidence: undefined }),
    /component-platform-binding-required/
  );
});

test("loads only explicitly satisfied context-conditional dependencies", () => {
  const application = compile({ requiredCapabilities: ["layer.application"], conditions: ["conversion"] });
  assert.equal(application.required_skills.includes("mapstruct"), true);
  assert.equal(application.required_skills.includes("lombok"), false);
  assert.equal(application.required_skills.includes("yss-mybatis"), false);
});

test("requires a platform binding for every backend component capability", () => {
  for (const capability of ["contract.dto-wire", "contract.request-validation", "contract.error-mapping", "framework.mybatis", "component.cache", "component.current-user-context", "component.audit-log", "component.excel-import-export", "component.distributed-id", "component.security-algorithm", "component.gateway-resilience"]) {
    assert.throws(
      () => compile({ requiredCapabilities: [capability], architecture_identity: undefined, architecture_evidence: undefined }),
      stableComponentError("component-platform-binding-required"),
      capability
    );
  }
});

test("public compiler entry preserves stable component error codes", () => {
  const catalog = loadBackendPlatforms();
  const boot2Profile = catalog.profiles.find(item => item.id === "spring-boot-2.7-jdk8");
  const boot2Entry = catalog.compatibility.find(item => item.profile_id === boot2Profile.id);
  const boot2 = platformBinding(boot2Profile, boot2Entry);
  const withPlatform = platform_configuration => {
    const architecture_identity = { ...identity, platform_configuration };
    return { architecture_identity, architecture_evidence: { engineering_baseline: architecture_identity, repository_registration: architecture_identity, manifest: architecture_identity } };
  };
  assert.throws(() => compile({ requiredCapabilities: ["contract.dto-wire"], ...withPlatform(boot2) }), stableComponentError("component-evidence-missing"));
  assert.throws(() => compile({ requiredCapabilities: ["component.cache"], ...withPlatform(boot2) }), stableComponentError("component-platform-generation-mismatch"));
  const boot3Profile = catalog.profiles.find(item => item.id === "spring-boot-3.5-jdk17");
  const boot3 = { ...boot2, profile_id: boot3Profile.id, spring_boot_version: boot3Profile.spring_boot_version, java_version: boot3Profile.java_version, compatibility_id: "unavailable-boot3-components" };
  assert.throws(() => compile({ requiredCapabilities: ["contract.dto-wire"], ...withPlatform(boot3) }), stableComponentError("component-unavailable-for-platform"));
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
  assert.throws(() => compileImplementationContract({ registry: { ...registry, schema_version: 1 }, compilerContract, requiredCapabilities: ["layer.domain"] }), /schema v1\/v2 已停止支持/);
  assert.throws(() => compileImplementationContract({ registry, compilerContract: { ...compilerContract, schema_version: 1 }, requiredCapabilities: ["layer.domain"] }), /schema v1 已停止支持/);
});

test("marks digest drift stale and validates v2 execution evidence", () => {
  const resolution = compile({ requiredCapabilities: ["quality.java-code-style"], architecture_identity: undefined, architecture_evidence: undefined });
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

test("marks legacy component contracts without component bindings stale", () => {
  const resolution = compile({ requiredCapabilities: ["quality.java-code-style"], architecture_identity: undefined, architecture_evidence: undefined });
  resolution.required_capabilities = ["contract.dto-wire"];
  resolution.required_skills = ["yss-dto"];
  const contract = { schema_version: 2, contract_id: "legacy-component", contract_version: 1, resolution };
  assert.ok(evaluateContractFreshness(contract, { registry, compilerContract }).reasons.includes("component-binding-drift"));
});
