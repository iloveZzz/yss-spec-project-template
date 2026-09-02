import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");
const command = path.join(toolingRoot, "scripts/design-md.mjs");

test("DESIGN.md passes local and pinned upstream lint", () => {
  const output = execFileSync("node", [command, "lint", "DESIGN.md"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  const report = JSON.parse(output);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
});

test("DESIGN.md projection manifest is current", () => {
  const output = execFileSync("node", [command, "drift"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.match(output, /无漂移/);
  const manifest = JSON.parse(readFileSync(path.join(repositoryRoot, "docs/design/tokens/.design-md-projection.json"), "utf8"));
  assert.equal(manifest.source, "DESIGN.md");
  assert.equal(Object.keys(manifest.files).length, 6);
});

test("cross-repository design sync digest matches DESIGN.md", () => {
  const source = readFileSync(path.join(repositoryRoot, "DESIGN.md"));
  const sync = readFileSync(path.join(repositoryRoot, "docs/design/design-system-sync.yaml"), "utf8");
  const digest = createHash("sha256").update(source).digest("hex");
  assert.match(sync, new RegExp(`baseline_sha256: ${digest}`));
});
