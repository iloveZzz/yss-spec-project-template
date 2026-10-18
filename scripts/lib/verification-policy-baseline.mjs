import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BASELINE_FILE = ".template-source/process/verification-policy-baseline.json";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) { throw new TypeError("VERIFICATION_POLICY_BASELINE: " + message); }

export function loadPolicyBaseline({ root = ROOT } = {}) {
  const file = path.join(root, BASELINE_FILE);
  if (!existsSync(file)) fail("缺少 " + BASELINE_FILE);
  const baseline = JSON.parse(readFileSync(file, "utf8"));
  if (baseline?.schema_version !== 1) fail("schema_version 必须为 1");
  for (const key of ["required_checks", "gates", "ci_guard_check_ids"]) if (!Array.isArray(baseline[key])) fail(key + " 必须是数组");
  for (const gate of baseline.gates) if (!gate || typeof gate.id !== "string" || typeof gate.display_id !== "string" || typeof gate.required_at_release !== "boolean") fail("Gate 基线条目无效");
  if (!Number.isInteger(baseline.fast_check_count) || baseline.fast_check_count < 0) fail("fast_check_count 必须是非负整数");
  return baseline;
}

export function validatePolicyBaseline(config, baseline, { ciGuardIds = [] } = {}) {
  const issues = [];
  const required = new Set(config?.profiles?.release?.required_checks ?? []);
  for (const id of baseline.required_checks) if (!required.has(id)) issues.push("required-check-removed: " + id);
  const gates = new Map((config?.gates ?? []).map((gate) => [gate.id, gate]));
  for (const expected of baseline.gates) {
    const actual = gates.get(expected.id);
    if (!actual) { issues.push("gate-removed: " + expected.id); continue; }
    if (actual.display_id !== expected.display_id) issues.push("gate-display-changed: " + expected.id);
    if (actual.required_at_release !== expected.required_at_release) issues.push("gate-release-requirement-changed: " + expected.id);
  }
  const guards = new Set(ciGuardIds);
  for (const id of baseline.ci_guard_check_ids) if (!guards.has(id)) issues.push("ci-guard-removed: " + id);
  const fastCount = config?.profiles?.fast?.checks?.length ?? 0;
  if (fastCount !== baseline.fast_check_count) issues.push("fast-check-count-changed: " + baseline.fast_check_count + " -> " + fastCount);
  return issues;
}
