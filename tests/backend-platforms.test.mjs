// Stable validation entry point for the backend platform and component matrix.
import '../scripts/fixtures/backend-scaffold/platform-scenarios.test.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const platformConfigurations = value => {
  const result = [];
  const visit = current => {
    if (Array.isArray(current)) return current.forEach(visit);
    if (!current || typeof current !== "object") return;
    for (const [key, child] of Object.entries(current)) {
      if (key === "platform_configuration") result.push(child);
      visit(child);
    }
  };
  visit(value);
  return result;
};

test("platform configuration schemas persist the normalized component platform line", async () => {
  const refs = [
    "docs/process/schemas/backend-architecture-identity.schema.json",
    "docs/process/schemas/project-scaffold-contract.schema.json",
    "docs/process/schemas/scaffold-architecture-decisions.schema.json",
    "docs/process/schemas/slice-implementation-contract-v3.schema.json",
  ];
  for (const ref of refs) {
    const schema = JSON.parse(await readFile(new URL(`../${ref}`, import.meta.url), "utf8"));
    const configurations = platformConfigurations(schema);
    assert.ok(configurations.length > 0, `${ref} must declare platform_configuration`);
    for (const configuration of configurations) {
      assert.deepEqual(configuration.properties?.component_platform_line?.enum, ["boot2-java8", "boot3-java17"], ref);
      assert.equal(configuration.required?.includes("component_platform_line"), true, `${ref} must require component_platform_line`);
    }
  }
});
