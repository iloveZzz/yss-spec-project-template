import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFileSync, rmSync } from "node:fs";
import { makeRoot } from "../../../../tests/helpers/yss-instance.mjs";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");

function depsFrom(lifecycle, skills, skillIdsFromRegistry) {
  return {
    skillIds: skillIdsFromRegistry(skills),
    stageIds: new Set(lifecycle.stages.map((item) => item.id)),
    gateIds: new Set(lifecycle.gates.map((item) => item.id)),
    checkIds: new Set(lifecycle.checks.map((item) => item.id)),
    artifactIds: new Set(lifecycle.artifacts.map((item) => item.id)),
    evidenceIds: new Set(lifecycle.evidence.map((item) => item.id)),
    workUnitIds: new Set(lifecycle.work_units.map((item) => item.id)),
    skillRegistry: skills
  };
}

test("historical digital human roles are runtime-agnostic and grok is only an adapter", async () => {
  const {
    loadDigitalHumanRoles,
    validateDigitalHumanRoles,
    skillIdsFromRegistry,
    taskPackageDefaults
  } = await import(path.join(repositoryRoot, "scripts/lib/digital-human-roles.mjs"));
  const { loadSkillRegistry } = await import(path.join(repositoryRoot, "scripts/lib/skill-registry.mjs"));
  const lifecycle = JSON.parse(readFileSync(path.join(repositoryRoot, "scripts/fixtures/role-independent-draft/legacy-spec-policy.json"))).registry;
  const skills = loadSkillRegistry();
  const deps = depsFrom(lifecycle, skills, skillIdsFromRegistry);
  const result = validateDigitalHumanRoles(loadDigitalHumanRoles(), deps);
  assert.equal(result.role_count, 6);
  assert.equal(result.runtime_count, 3);
  const legacy = structuredClone(loadDigitalHumanRoles());
  assert.equal(legacy.stage_groups, undefined, "stage_groups 已退役，注册表不再声明");
  legacy.stage_groups = [{ id: "group.plan", members: ["role.requirements-manager"] }];
  assert.doesNotThrow(() => validateDigitalHumanRoles(legacy, deps), "旧实例保留的 stage_groups 只读忽略");
  const coupled = structuredClone(loadDigitalHumanRoles());
  coupled.orchestrator.grok_title = "nope";
  assert.throws(() => validateDigitalHumanRoles(coupled, deps), /平台耦合字段/);
  const selfSign = structuredClone(loadDigitalHumanRoles());
  selfSign.gate_policy.dual_digital_human[0].countersigners = [selfSign.gate_policy.dual_digital_human[0].drafter];
  assert.throws(() => validateDigitalHumanRoles(selfSign, deps), /起草者不得会签自己/);
  const missingSigners = structuredClone(loadDigitalHumanRoles());
  missingSigners.gate_policy.digital_human_review[0].countersigners = [];
  assert.throws(() => validateDigitalHumanRoles(missingSigners, deps), /countersigners/);
  const defaults = taskPackageDefaults("role.frontend-engineer");
  assert.ok(defaults.core_skills.includes("yss-design-system"));
  assert.ok(defaults.forbidden_skills.includes("yss-domain"));
  const tester = taskPackageDefaults("role.test-engineer");
  assert.ok(tester.core_skills.includes("code-review"));
  assert.ok(tester.core_skills.includes("alibaba-java-code-style"));
  assert.ok(tester.core_skills.includes("yss-design-system"));
  assert.ok(tester.core_skills.includes("yss-domain"));
  assert.ok(!tester.core_skills.includes("implement"));
  const backend = taskPackageDefaults("role.backend-engineer");
  assert.ok(backend.core_skills.includes("alibaba-java-code-style"));
  assert.ok(backend.core_skills.includes("mapstruct"));
});

test("historical approval records reject the wrong signer and approved countersign gates need approval_ref", async (t) => {
  const { validateApprovalRecord, assertCheckpointApprovals } = await import(path.join(repositoryRoot, "scripts/lib/native-approval.mjs"));
  const root = makeRoot("historical-digital-human-roles-");
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => validateApprovalRecord({
    schema_version: 1,
    gate_id: "gate.spec-baseline-approved",
    decision: "approved",
    actor_kind: "digital-human",
    role_id: "role.frontend-engineer",
    runtime_id: "runtime.generic",
    principal_ref: "instance:fe"
  }, { root }), /APPROVAL_CURRENT_INVALID: 会签角色未获当前门禁政策授权/);
  assert.throws(() => validateApprovalRecord({
    schema_version: 1,
    gate_id: "gate.product-design-approved",
    decision: "approved",
    actor_kind: "digital-human",
    role_id: "role.test-engineer",
    runtime_id: "runtime.generic",
    principal_ref: "instance:qa"
  }, { root }), /必须由生物人会签/);
  assert.doesNotThrow(() => assertCheckpointApprovals({ gates: {} }, undefined, { root }));
  assert.throws(() => assertCheckpointApprovals({
    gates: {
      "gate.spec-baseline-approved": {
        status: "approved",
        reason: "signed",
        evidence_refs: []
      }
    }
  }, undefined, { root }), /EVIDENCE_REQUIRED: 缺少当前依据/);
});

test("current Spec keeps four stage gates and rejects retired countersign gates", async () => {
  const { loadRegistry } = await import(path.join(repositoryRoot, "scripts/lib/lifecycle-registry.mjs"));
  const { validateApprovalRecord } = await import(path.join(repositoryRoot, "scripts/lib/native-approval.mjs"));
  assert.deepEqual(loadRegistry().gates.map((gate) => gate.id).sort(), [
    "gate.plan-approved", "gate.spec-baseline-approved", "gate.implementation-admitted", "gate.delivery-accepted"
  ].sort());
  assert.throws(() => validateApprovalRecord({
    schema_version: 1,
    gate_id: "gate.product-design-approved",
    decision: "approved",
    actor_kind: "digital-human",
    role_id: "role.test-engineer",
    runtime_id: "runtime.generic",
    principal_ref: "instance:qa"
  }, { root: repositoryRoot }), /APPROVAL_CURRENT_INVALID: 未知或已退役门禁: gate.product-design-approved/);
});
