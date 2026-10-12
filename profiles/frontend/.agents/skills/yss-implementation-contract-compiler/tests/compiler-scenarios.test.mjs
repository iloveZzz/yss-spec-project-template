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
const compile = (input) => compileImplementationContract({ registry, compilerContract, compiledAt: fixed, ...input });

test("deduplicates frontend recipes without backend skills or architecture", () => {
  const first = compile({recipeIds:["frontend.ui-slice", "frontend.ui-slice"]});
  assert.deepEqual(first, compile({recipeIds:["frontend.ui-slice"]}));
  for (const skill of ["frontend-agent", "yss-ui", "yss-implementation-contract-compiler"]) {
    assert.equal(first.required_skills.filter(s => s === skill).length, 1);
  }
  assert.ok(!first.required_skills.some(s => ["yss-userinfo", "yss-validation", "yss-domain"].includes(s)));
  assert.throws(() => compile({recipeIds:["backend.ddd-http-api"]}), /未知 recipe/);
  assert.throws(() => compile({requiredCapabilities:["component.current-user-context"]}), /未知 capability/);
});

test("frontend API generation only expands its explicit regeneration condition", () => {
  const plain = compile({requiredCapabilities:["frontend.api-integration"]});
  assert.deepEqual(plain.required_skills, ["yss-api-integration"]);
  const regeneration = compile({requiredCapabilities:["frontend.api-integration"],conditions:["regeneration"]});
  assert.ok(regeneration.required_skills.includes("yss-openapi-governance"));
  assert.ok(!regeneration.required_skills.includes("yss-dto"));
});

test("rejects recipes that reference skills and context-required cycles", () => {
  const invalidRecipeRegistry = structuredClone(registry);
  invalidRecipeRegistry.recipes[0].skills = ["yss-ui"];
  assert.throws(() => compileImplementationContract({ registry: invalidRecipeRegistry, compilerContract, recipeIds: [invalidRecipeRegistry.recipes[0].id] }), /不得直接引用 skills/);

  const cyclicRegistry = structuredClone(registry);
  cyclicRegistry.skill_dependencies["yss-ui"] = [{ skill: "yss-api-integration", type: "context-required" }];
  cyclicRegistry.skill_dependencies["yss-api-integration"] = [{ skill: "yss-ui", type: "context-required" }];
  assert.throws(() => compileImplementationContract({ registry: cyclicRegistry, compilerContract, requiredCapabilities: ["frontend.ui"] }), /依赖循环/);
});

test("rejects removed ids and schema v1 without compatibility", () => {
  assert.throws(() => compile({ recipeIds: ["yss-router"] }), /已移除 skill id/);
  assert.throws(() => compileImplementationContract({ registry: { ...registry, schema_version: 1 }, compilerContract, requiredCapabilities: ["frontend.ui"] }), /schema v1\/v2 已停止支持/);
  assert.throws(() => compileImplementationContract({ registry, compilerContract: { ...compilerContract, schema_version: 1 }, requiredCapabilities: ["frontend.ui"] }), /schema v1 已停止支持/);
});

test("marks digest drift stale and validates v2 execution evidence", () => {
  const resolution = compile({ requiredCapabilities: ["frontend.api-integration"], architecture_identity: undefined, architecture_evidence: undefined });
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
    verification_results: [{ command: "pnpm test", exit_code: 0, executed_at: fixed }],
    new_impacts: []
  };
  assert.deepEqual(validateExecutionResult(result, contract, { registry, compilerContract }), { status: "accepted", blockers: [] });
  assert.deepEqual(validateExecutionResult({ ...result, new_impacts: [{ impact_type: "cache" }] }, contract, { registry, compilerContract }), { status: "blocked", blockers: ["new-impacts"] });
});
