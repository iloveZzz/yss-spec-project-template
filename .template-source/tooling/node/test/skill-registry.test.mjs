import assert from "node:assert/strict";
import test from "node:test";

import { loadSkillRegistry, validateSkillRegistry } from "../../../../scripts/lib/skill-registry.mjs";

function registry(overrides = {}) {
  const base = loadSkillRegistry();
  return { ...base, ...overrides, runtime_policy: { ...base.runtime_policy, ...overrides.runtime_policy } };
}

test("unknown layer is rejected", () => {
  const data = registry();
  data.skills = data.skills.map((skill) => skill.id === "tdd" ? { ...skill, layer: "misc" } : skill);
  assert.throws(() => validateSkillRegistry(data), /未知 layer/);
});

test("shadow registry cannot be marked as runtime consumed", () => {
  const data = registry({ runtime_policy: { consumed_by_router: true, consumed_by_lifecycle: false, discovery_enforced: false } });
  assert.throws(() => validateSkillRegistry(data), /shadow 注册表不得被 Router/);
});

test("alias that collides with another id is rejected", () => {
  const data = registry();
  data.skills = data.skills.map((skill) => skill.id === "yss-api-integration" ? { ...skill, aliases: ["tdd"] } : skill);
  assert.throws(() => validateSkillRegistry(data), /alias 冲突/);
});

test("missing Cursor runtime root is rejected", () => {
  const data = registry();
  const { cursor, ...rest } = data.agent_runtime_roots;
  data.agent_runtime_roots = rest;
  assert.throws(() => validateSkillRegistry(data), /agent_runtime_roots.cursor/);
});
