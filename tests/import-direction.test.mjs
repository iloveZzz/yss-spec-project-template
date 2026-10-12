import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkImportDirection, findCycles, scanImports } from "../scripts/lib/import-direction.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixture(t, modules, core) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "import-direction-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
  fs.mkdirSync(path.join(root, ".template-source/process"), { recursive: true });
  for (const [name, deps] of Object.entries(modules)) fs.writeFileSync(path.join(root, `scripts/lib/${name}.mjs`), `${deps.map((dep) => `import "./${dep}.mjs";`).join("\n")}\nexport const x = 1;\n`);
  fs.writeFileSync(path.join(root, ".template-source/process/node-core-layer.json"), JSON.stringify({ schema_version: 1, core }));
  return root;
}

test("AC-009：当前仓库没有导入环，core 层只导入 core 层，检查在 1 秒内完成", () => {
  const started = performance.now();
  const result = checkImportDirection(ROOT);
  const elapsed = performance.now() - started;
  assert.equal(result.ok, true, JSON.stringify(result.violations));
  assert.ok(elapsed < 1000, `耗时 ${elapsed.toFixed(0)} ms`);
  assert.deepEqual(findCycles(scanImports(ROOT)), []);
});

test("AC-009：core 层模块反向导入上层时失败，并指出这条边", (t) => {
  const root = fixture(t, { base: [], upper: ["base"] }, ["base"]);
  assert.equal(checkImportDirection(root).ok, true);
  fs.writeFileSync(path.join(root, "scripts/lib/base.mjs"), 'import "./upper.mjs";\nexport const x = 1;\n');
  const result = checkImportDirection(root);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((item) => item.kind === "core-imports-upper" && item.detail.startsWith("base -> upper")), JSON.stringify(result.violations));
  assert.ok(result.violations.some((item) => item.kind === "import-cycle" && item.detail.includes("base -> upper") && item.detail.includes("upper -> base")));
});

test("导入环无论是否登记在 core 层都失败；动态 import 与 re-export 也算导入", (t) => {
  const root = fixture(t, { a: ["b"], b: [], c: [] }, []);
  fs.writeFileSync(path.join(root, "scripts/lib/b.mjs"), 'export * from "./c.mjs";\nexport const y = 1;\n');
  fs.writeFileSync(path.join(root, "scripts/lib/c.mjs"), 'export async function load() { return import("./a.mjs"); }\n');
  const result = checkImportDirection(root);
  assert.equal(result.ok, false);
  assert.match(result.violations[0].detail, /3 个模块构成导入环/);
});

test("core 层登记缺失或指向不存在的模块时失败", (t) => {
  const root = fixture(t, { a: [] }, ["ghost"]);
  assert.ok(checkImportDirection(root).violations.some((item) => item.kind === "unknown-core-module"));
  fs.rmSync(path.join(root, ".template-source/process/node-core-layer.json"));
  assert.throws(() => checkImportDirection(root), /缺少 core 层登记/);
});

test("被切断的导入改为由入口注入：plan-review-control 入口提供决定核验器，decision-continuation 由 user-decision 注入原批准核验器", () => {
  const read = (ref) => fs.readFileSync(path.join(ROOT, ref), "utf8");
  assert.match(read("scripts/plan-review-control"), /verifyDecision:\s*verifyUserDecisionFile/);
  assert.match(read("scripts/lib/plan-review-control.mjs"), /typeof verifyDecision === 'function'/);
  assert.match(read("scripts/lib/user-decision.mjs"), /assertRequirement:\s*assertUserDecisionRequirement/);
  assert.match(read("scripts/lib/decision-continuation.mjs"), /typeof options\.assertRequirement !== 'function'/);
  const graph = scanImports(ROOT);
  assert.equal(graph.get("plan-review-control").includes("user-decision"), false);
  assert.equal(graph.get("decision-continuation").includes("user-decision"), false);
  assert.equal(graph.get("slice-contract").includes("slice-repositories"), false);
  assert.equal(graph.get("contract-views").includes("reading-view-bundle"), false);
});
