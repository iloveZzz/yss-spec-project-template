#!/usr/bin/env node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = dirname(fileURLToPath(import.meta.url));
const validator = join(root, "..", "scripts", "validate-tactical-design.mjs");
const fixture = (name) => join(root, "fixtures", name);
const run = (file) => spawnSync(process.execPath, [validator, file], { encoding: "utf8" });
const pass = run(fixture("valid-tactical-design.yaml"));
if (pass.status !== 0) throw new Error(`valid tactical design should pass: ${pass.stderr}`);

const blockedCases = [
  ["invalid-missing-invariant.yaml", "invariant_refs 必须是至少 1 项的数组"],
  ["invalid-api-leaks-aggregate.yaml", "api_exposure 必须为 internal-only"],
  ["invalid-stale-upstream-ref.yaml", "status 必须为 stale"],
  ["invalid-strategic-as-tactical.yaml", "不得直接把战略概念当作 Aggregate"],
  ["invalid-missing-consistency-policy.yaml", "consistency_policy.transaction_boundary 缺失"]
];
for (const [name, message] of blockedCases) {
  const result = run(fixture(name));
  if (result.status === 0 || !result.stderr.includes(message)) throw new Error(`${name} should be blocked: ${result.stderr}`);
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "yss-tactical-design-pressure-"));
try {
  const source = await readFile(fixture("valid-tactical-design.yaml"), "utf8");
  const escalated = join(temporaryRoot, "missing-standalone-ref.yaml");
  await writeFile(escalated, `${source}\ncomplexity:\n  escalate_to_standalone: true\n`);
  const result = run(escalated);
  if (result.status === 0 || !result.stderr.includes("standalone_ref")) throw new Error("complexity escalation without standalone_ref should be blocked");

  const wrongGateway = join(temporaryRoot, "wrong-gateway-layer.yaml");
  await writeFile(wrongGateway, source.replace("layer: Domain", "layer: Infrastructure"));
  const gatewayResult = run(wrongGateway);
  if (gatewayResult.status === 0 || !gatewayResult.stderr.includes("layer 必须为 Domain")) throw new Error("Infrastructure gateway should be blocked");

  const crossAggregateRoot = join(temporaryRoot, "cross-aggregate-root.yaml");
  await writeFile(crossAggregateRoot, source.replace("aggregate_id: aggregate.example\n    identity", "aggregate_id: aggregate.other\n    identity"));
  const crossAggregateResult = run(crossAggregateRoot);
  if (crossAggregateResult.status === 0 || !crossAggregateResult.stderr.includes("root_entity 的 aggregate_id 必须与当前 Aggregate 一致")) throw new Error("cross-aggregate root should be blocked");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
process.stdout.write("DDD tactical design scenarios passed\n");
