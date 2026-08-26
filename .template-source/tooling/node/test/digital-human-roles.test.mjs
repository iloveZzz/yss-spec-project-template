import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");

test("digital human role registry rejects oversized groups and self-countersign", async () => {
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
  const lifecycle = loadRegistry();
  const deps = {
    skillIds: skillIdsFromRegistry(loadSkillRegistry()),
    stageIds: new Set(lifecycle.stages.map((item) => item.id)),
    gateIds: new Set(lifecycle.gates.map((item) => item.id)),
    artifactIds: new Set(lifecycle.artifacts.map((item) => item.id)),
    workUnitIds: new Set(lifecycle.work_units.map((item) => item.id))
  };
  const oversized = structuredClone(loadDigitalHumanRoles());
  oversized.stage_groups[0].members.push("role.frontend-engineer", "role.backend-engineer", "role.test-engineer");
  assert.throws(() => validateDigitalHumanRoles(oversized, deps), /成员数必须为 2–6/);
  const selfSign = structuredClone(loadDigitalHumanRoles());
  selfSign.gate_policy.dual_digital_human[0].countersigners = [selfSign.gate_policy.dual_digital_human[0].drafter];
  assert.throws(() => validateDigitalHumanRoles(selfSign, deps), /起草者不得会签自己/);
});
