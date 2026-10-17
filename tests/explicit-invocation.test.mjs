import { loadOrchestrationContract } from "../scripts/lib/orchestration-contract.mjs";
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
const contract = loadOrchestrationContract(read, ".template-spec/process/orchestration-contract.yaml").value;

/** 显式 = 注册表有效调用意图为 user；与 validateInvocationMetadata 的判定一致。 */
function mode(skill) {
  const c = registry.invocation_contract;
  return { ...c.default, ...c.layer_defaults[skill.layer], ...c.overrides[skill.id] }.invocation_mode;
}
const explicit = registry.skills.filter((skill) => mode(skill) === "user").map((skill) => skill.id).sort();

test("显式技能集合固定：增减必须是有意的改动，并同步更新本清单", () => {
  assert.deepEqual(explicit, [
    "cross-repo-implementation-routing", "git-commit-core", "handoff", "implement", "implementation-repo-onboarding",
    "java-backend-commit", "llm-wiki", "prototype-review", "publish-skills-sh", "setup-matt-pocock-skills", "to-spec", "to-tickets", "triage",
    "wayfinder", "yss-backend-spec-review", "yss-implementation-contract-compiler", "yss-openapi-draft-review", "yss-prototype-stage",
    "yss-skill-source-index-refresh", "yss-stage-decision", "yss-tactical-design", "yss-technical-design",
  ]);
});

test("合同声明为生命周期可调用的模型调用技能永远不能是显式（lifecycle_may_invoke_user_invoked 为 false）", () => {
  assert.equal(contract.matt_invocation_boundary.lifecycle_may_invoke_user_invoked, false);
  for (const id of contract.matt_invocation_boundary.lifecycle_allowed_model_invoked_skills) {
    assert.ok(!explicit.includes(id), `${id} 是合同声明的生命周期模型调用技能，不能设为显式`);
  }
});

test("AC-013：注册表标为显式而 SKILL.md 缺 disable-model-invocation 时失败并指出技能名", () => {
  const source = (id) => read(`.agents/skills/${id}/SKILL.md`);
  const metadata = (id) => {
    const file = path.join(ROOT, ".agents/skills", id, "agents/openai.yaml");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  };
  assert.doesNotThrow(() => validateSkillRegistry(registry, { skillMetadata: metadata, skillSource: source }));
  for (const id of ["java-backend-commit", "publish-skills-sh", "yss-skill-source-index-refresh", "llm-wiki"]) {
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
