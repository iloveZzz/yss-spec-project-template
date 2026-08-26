import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");

function depsFrom(lifecycle, skills, skillIdsFromRegistry) {
  return {
    skillIds: skillIdsFromRegistry(skills),
    stageIds: new Set(lifecycle.stages.map((item) => item.id)),
    gateIds: new Set(lifecycle.gates.map((item) => item.id)),
    artifactIds: new Set(lifecycle.artifacts.map((item) => item.id)),
    workUnitIds: new Set(lifecycle.work_units.map((item) => item.id)),
    skillRegistry: skills
  };
}

test("digital human roles are runtime-agnostic and grok is only an adapter", async () => {
  const {
    loadDigitalHumanRoles,
    validateDigitalHumanRoles,
    skillIdsFromRegistry,
    validateDefaultDigitalHumanRoles
  } = await import(path.join(repositoryRoot, "scripts/lib/digital-human-roles.mjs"));
  const { loadRegistry } = await import(path.join(repositoryRoot, "scripts/lib/lifecycle-registry.mjs"));
  const { loadSkillRegistry } = await import(path.join(repositoryRoot, "scripts/lib/skill-registry.mjs"));
  const result = validateDefaultDigitalHumanRoles();
  assert.equal(result.role_count, 7);
  assert.equal(result.runtime_count, 3);
  const lifecycle = loadRegistry();
  const skills = loadSkillRegistry();
  const deps = depsFrom(lifecycle, skills, skillIdsFromRegistry);
  const seven = structuredClone(loadDigitalHumanRoles());
  seven.stage_groups[0].members.push("role.frontend-engineer", "role.backend-engineer", "role.test-engineer");
  assert.doesNotThrow(() => validateDigitalHumanRoles(seven, deps));
  seven.runtimes.find((runtime) => runtime.id === "runtime.grok").overflow = "forbid";
  assert.throws(() => validateDigitalHumanRoles(seven, deps), /禁止超过 6 人/);
  const coupled = structuredClone(loadDigitalHumanRoles());
  coupled.orchestrator.grok_title = "nope";
  assert.throws(() => validateDigitalHumanRoles(coupled, deps), /平台耦合字段/);
  const selfSign = structuredClone(loadDigitalHumanRoles());
  selfSign.gate_policy.dual_digital_human[0].countersigners = [selfSign.gate_policy.dual_digital_human[0].drafter];
  assert.throws(() => validateDigitalHumanRoles(selfSign, deps), /起草者不得会签自己/);
});
