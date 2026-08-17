import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { generate, parseArgs } from "./generate_controller.mjs";

test("generates application-service controller with requested validation profile", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yss-controller-"));
  const metadata = path.join(root, "metadata.json");
  await writeFile(metadata, JSON.stringify({ tables: [{ table_name: "quality_rule", table_comment: "质量规则", columns: [{ name: "id", sql_type: "bigint", primary: true, nullable: false }, { name: "rule_name", sql_type: "varchar(64)", nullable: false }] }] }));
  await generate(parseArgs(["--metadata-file", metadata, "--base-package", "com.yss.demo", "--module-name", "demo", "--domain-segment", "quality", "--output-dir", path.join(root, "out"), "--application-service-package", "com.yss.demo.application.service", "--validation-namespace", "jakarta"]), { log() {}, warn() {} });
  const controller = await readFile(path.join(root, "out", "com", "yss", "demo", "rest", "QualityRuleController.java"), "utf8");
  assert.match(controller, /import com\.yss\.demo\.application\.service\.QualityRuleService;/);
  assert.match(controller, /import jakarta\.validation\.Valid;/);
  assert.doesNotMatch(controller, /Gateway/);
});

test("rejects missing required CLI arguments", () => assert.throws(() => parseArgs(["--module-name", "demo"]), /required/));
