import { spawnSync } from "node:child_process";
import { runScenario } from "../../scripts/lib/scenario-checks.mjs";
try {
  runScenario("openapiYaml");
  const result = spawnSync(process.execPath, ["tests/scenarios/verify-openapi-draft-validation-scenarios.mjs"], { encoding: "utf8" });
  if (result.status !== 0) throw new TypeError(`${result.stdout}${result.stderr}`.trim());
  process.stdout.write(result.stdout);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
