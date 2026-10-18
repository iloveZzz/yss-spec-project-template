import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadVerificationProfiles } from "../scripts/lib/template-verification.mjs";
import { ciVerificationCheckIds } from "../scripts/lib/ci-gate.mjs";
import { loadPolicyBaseline, validatePolicyBaseline } from "../scripts/lib/verification-policy-baseline.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load() {
  return { config: loadVerificationProfiles(), baseline: loadPolicyBaseline({ root: ROOT }), ciGuardIds: ciVerificationCheckIds() };
}

test("当前策略满足冻结基线", () => {
  const { config, baseline, ciGuardIds } = load();
  assert.deepEqual(validatePolicyBaseline(config, baseline, { ciGuardIds }), []);
});

test("删除 required check、Gate、CI 守卫或减少 fast 数量时失败", () => {
  const { config, baseline, ciGuardIds } = load();
  const removedRequired = structuredClone(config);
  removedRequired.profiles.release.required_checks = removedRequired.profiles.release.required_checks.slice(1);
  assert.ok(validatePolicyBaseline(removedRequired, baseline, { ciGuardIds }).some((item) => item.startsWith("required-check-removed:")));

  const removedGate = structuredClone(config);
  removedGate.gates = removedGate.gates.filter((gate) => gate.id !== baseline.gates[0].id);
  assert.ok(validatePolicyBaseline(removedGate, baseline, { ciGuardIds }).some((item) => item.startsWith("gate-removed:")));

  const removedGuard = baseline.ci_guard_check_ids[0];
  assert.ok(validatePolicyBaseline(config, baseline, { ciGuardIds: ciGuardIds.filter((id) => id !== removedGuard) }).some((item) => item.startsWith("ci-guard-removed:")));

  const fewerChecks = structuredClone(config);
  fewerChecks.profiles.fast.checks = fewerChecks.profiles.fast.checks.slice(1);
  assert.ok(validatePolicyBaseline(fewerChecks, baseline, { ciGuardIds }).some((item) => item.startsWith("fast-check-count-changed:")));
});
