import assert from "node:assert/strict";
import test from "node:test";
import { compileDefaultImplementationContract } from "../../../../scripts/lib/implementation-contract-compiler.mjs";
import { validateArchitectureIdentity } from "../../../../scripts/lib/backend-architecture.mjs";
import { loadSkillRegistry } from "../../../../scripts/lib/skill-registry.mjs";

const registry = loadSkillRegistry();
function input(name) {
  const profile = registry.architecture_profiles[name];
  const identity = { architecture_family: profile.architecture_family, architecture_profile: name,
    generator_skill: profile.generator_skill, requested_capabilities: [], resolved_modules: profile.core_modules,
    verification_database: "h2", production_database: "not-bound", contract_digest: "a".repeat(64) };
  return { architecture_identity: identity, architecture_evidence: {
    engineering_baseline: identity, repository_registration: identity, manifest: identity
  }};
}

for (const name of Object.keys(registry.architecture_profiles)) {
  test(`${name} selects architecture recipe and explicit Skill Profile`, () => {
    const data = input(name);
    const mvc = data.architecture_identity.architecture_family === "layered-mvc";
    const result = compileDefaultImplementationContract({ ...data,
      recipeIds: [mvc ? "backend.mvc-service-behavior" : "backend.ddd-domain-behavior", mvc ? "backend.mvc-http-api" : "backend.ddd-http-api"] });
    assert.equal(result.required_skills.includes("yss-domain"), !mvc);
    assert.equal(result.skill_profiles["yss-application"], name);
    assert.equal(result.skill_profiles["yss-web-controller"], name);
    assert.ok(result.readiness_blockers.includes("backend-profile-not-supported"));
  });
}

test("rejects missing identity, deprecated recipe, wrong family and stale evidence", () => {
  assert.throws(() => compileDefaultImplementationContract({ recipeIds: ["backend.mvc-http-api"] }), /architecture_identity/);
  assert.throws(() => compileDefaultImplementationContract({ recipeIds: ["backend.http-api"] }), /deprecated/);
  assert.throws(() => compileDefaultImplementationContract({ ...input("layered-mvc-service"), recipeIds: ["backend.ddd-http-api"] }), /架构族/);
  const stale = input("layered-mvc-service");
  stale.architecture_evidence.manifest = { ...stale.architecture_identity, contract_digest: "b".repeat(64) };
  assert.throws(() => compileDefaultImplementationContract({ ...stale, recipeIds: ["backend.mvc-http-api"] }), /stale/);
});

test("rejects unsupported capability closure and production driver defaults", () => {
  const identity = input("mvc-data-analysis-v1").architecture_identity;
  assert.throws(() => validateArchitectureIdentity({ ...identity, resolved_modules: ["server"] }), /模块闭包/);
  assert.throws(() => validateArchitectureIdentity({ ...identity, production_database: "oracle" }), /H2/);
  assert.throws(() => compileDefaultImplementationContract({ ...input("layered-mvc-service"), requiredCapabilities: ["layer.domain"] }), /不匹配/);
});
