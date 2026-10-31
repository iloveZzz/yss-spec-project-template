import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");

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
