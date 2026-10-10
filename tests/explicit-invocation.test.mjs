import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillRegistry, validateSkillRegistry } from "../scripts/lib/skill-registry.mjs";
import { parseDocument } from "../scripts/vendor/yaml.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const yaml = (relative) => parseDocument(read(relative), { uniqueKeys: true, maxAliasCount: 0 }).toJS({ maxAliasCount: 0 });

const registry = loadSkillRegistry();
const contract = yaml(".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml");

/** 显式 = 注册表有效调用意图为 user；与 validateInvocationMetadata 的判定一致。 */
function mode(skill) {
  const c = registry.invocation_contract;
  return { ...c.default, ...c.layer_defaults[skill.layer], ...c.overrides[skill.id] }.invocation_mode;
}
const explicit = registry.skills.filter((skill) => mode(skill) === "user").map((skill) => skill.id).sort();

/** 被生命周期编排器路由或合同声明为模型调用的技能。 */
function routedSkills() {
  const ids = new Set();
  for (const route of Object.values(contract.work_unit_routes ?? {})) {
    for (const id of [route.primary_skill, ...(route.skills ?? []), ...(route.supporting_skills ?? [])]) if (id) ids.add(id);
  }
  for (const route of Object.values(contract.generator_routes ?? {})) if (route.generator_skill) ids.add(route.generator_skill);
  if (contract.service_project_initialization?.skill) ids.add(contract.service_project_initialization.skill);
  if (contract.planning?.clarification_policy?.skill) ids.add(contract.planning.clarification_policy.skill);
  for (const id of [...contract.matt_invocation_boundary.model_invoked_skills, ...contract.matt_invocation_boundary.lifecycle_allowed_model_invoked_skills]) ids.add(id);
  ids.delete(contract.work_unit_routes?.["work-unit.implementation-repository-preparation"]?.native?.skill);
  return ids;
}

/**
 * AC-024：被编排器路由的技能只有在 Claude Code 与 Codex 的路由测试都通过后才能设为显式。
 * 通过后在这里登记技能 id，并在计划第 6 节附测试证据；空列表表示尚无任何技能通过。
 */
const ROUTE_TESTED = [];

test("显式技能集合固定：增减必须是有意的改动，并同步更新本清单", () => {
  assert.deepEqual(explicit, [
    "frontend-commit", "git-commit-core", "handoff", "implement", "java-backend-commit", "llm-wiki",
    "publish-skills-sh", "setup-matt-pocock-skills", "to-spec", "to-tickets", "triage", "wayfinder", "yss-skill-source-index-refresh",
  ]);
});

test("AC-024：被编排器路由的技能不得显式，除非已登记路由测试通过", () => {
  const routed = routedSkills();
  assert.ok(routed.has("grilling") && routed.has("prototype") && routed.has("yss-ddd-scaffold-generator"), "应识别出合同里的路由技能");
  const violations = explicit.filter((id) => routed.has(id) && !ROUTE_TESTED.includes(id));
  assert.deepEqual(violations, [], `这些技能被生命周期编排器路由，设为显式前须通过 AC-024：${violations.join(", ")}`);
});

test("合同声明为生命周期可调用的模型调用技能永远不能是显式（lifecycle_may_invoke_user_invoked 为 false）", () => {
  assert.equal(contract.matt_invocation_boundary.lifecycle_may_invoke_user_invoked, false);
  for (const id of contract.matt_invocation_boundary.lifecycle_allowed_model_invoked_skills) {
    assert.ok(!explicit.includes(id), `${id} 是合同声明的生命周期模型调用技能，不能设为显式`);
    assert.ok(!ROUTE_TESTED.includes(id), `${id} 不能通过路由测试来豁免合同冲突`);
  }
});

test("AC-013：注册表标为显式而 SKILL.md 缺 disable-model-invocation 时失败并指出技能名", () => {
  const source = (id) => read(`.agents/skills/${id}/SKILL.md`);
  const metadata = (id) => {
    const file = path.join(ROOT, ".agents/skills", id, "agents/openai.yaml");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  };
  assert.doesNotThrow(() => validateSkillRegistry(registry, { skillMetadata: metadata, skillSource: source }));
  for (const id of ["frontend-commit", "java-backend-commit", "publish-skills-sh", "yss-skill-source-index-refresh", "llm-wiki"]) {
    assert.throws(() => validateSkillRegistry(registry, {
      skillMetadata: metadata,
      skillSource: (target) => (target === id ? source(target).replace(/^disable-model-invocation: true\r?\n/m, "") : source(target)),
    }), new RegExp(`${id}.*disable-model-invocation`), `${id} 缺标记应被拒绝`);
    assert.throws(() => validateSkillRegistry(registry, {
      skillMetadata: (target) => (target === id ? null : metadata(target)),
      skillSource: source,
    }), new RegExp(`${id}.*allow_implicit_invocation`), `${id} 缺 openai.yaml 策略应被拒绝`);
  }
});
