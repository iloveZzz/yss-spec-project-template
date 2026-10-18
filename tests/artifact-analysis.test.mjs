import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeArtifacts, discover, exitCodeFor } from "../scripts/lib/artifact-analysis.mjs";
import { makeRoot } from "./helpers/yss-instance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const digest = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

/** 真实旧 Spec 的冻结测试资产，写入一个功能包；spec 只登记 FR-001 / AC-001。 */
function project(t, { acceptance = "AC-001" } = {}) {
  const root = makeRoot("yss-analysis-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (ref, text) => { fs.mkdirSync(path.dirname(path.join(root, ref)), { recursive: true }); fs.writeFileSync(path.join(root, ref), text); return text; };
  const spec = write(".work/aa/spec.md", "---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-001 | 提交申请 |\n## 验收标准\n| ID | 需求引用 |\n|---|---|\n| AC-001 | FR-001 |\n");
  const bt = write(".work/aa/business-tickets/BT-001.md", `---\nschema_version: 1\nkind: business-ticket\nid: BT-001\nversion: v1\nstatus: draft\nspec:\n  ref: .work/aa/spec.md\n  version: v1\n  digest: ${digest(spec)}\nrequirement_refs: [FR-001]\nacceptance_refs: [${acceptance}]\ndependencies: []\nsource_refs: []\nopen_questions: []\n---\n# 提交\n## 业务结果\n提交成功\n## 范围\n申请\n## 非目标\n无\n## 验收\n${acceptance}\n## 风险\n无\n`);
  write(".work/aa/business-tickets.yaml", `schema_version: 1\nkind: business-ticket-set\nid: business-ticket-set.aa\nversion: v1\nstatus: draft\nspec:\n  ref: .work/aa/spec.md\n  version: v1\n  digest: ${digest(spec)}\ntickets:\n  - id: BT-001\n    ref: .work/aa/business-tickets/BT-001.md\n    version: v1\n    digest: ${digest(bt)}\ncoverage_deferred: []\n`);
  write(".work/aa/issues/01-a.md", "---\nkind: vertical-slice-ticket\nstatus: ready-for-human\nbusiness_ticket_refs: [BT-001]\nacceptance_refs: [AC-001]\n---\n");
  write(".work/aa/slice.yaml", "schema_version: 3\ncontract_id: c\nslice_id: S1\nverification: {test: {command: t, cwd: ., expected_evidence: [l], acceptance_refs: [AC-001]}}\n");
  write(".work/aa/notes.md", "无 front matter\n");
  return root;
}

test("按内容识别功能包资产", (t) => {
  const root = project(t);
  const found = discover(root, ".work/aa");
  assert.equal(found.spec, ".work/aa/spec.md");
  assert.equal(found.plan, null);
  assert.equal(found.businessTickets, ".work/aa/business-tickets.yaml");
  assert.deepEqual(found.sliceTickets, [".work/aa/issues/01-a.md"]);
  assert.deepEqual(found.slices, [".work/aa/slice.yaml"]);
});

test("跨资产不一致进入统一发现，阶段覆盖未提供时不适用", async (t) => {
  const root = project(t, { acceptance: "AC-009" });
  const report = await analyzeArtifacts({ root, feature: "aa" });
  assert.equal(report.diagnostic_only, true);
  assert.equal(report.execution_authorization, "not-granted");
  assert.equal(report.sections.stage_coverage.status, "not-applicable");
  const dangling = report.findings.find((f) => f.check === "business_tickets" && /AC-009/.test(f.message));
  assert.ok(dangling, JSON.stringify(report.findings, null, 1));
  for (const f of report.findings) for (const key of ["check", "code", "message", "fix"]) assert.ok(f[key], `${key} 缺失: ${JSON.stringify(f)}`);
  assert.equal(report.status, "findings");
  assert.equal(exitCodeFor(report), 1);
});

test("输入异常记为未评估而不是通过；脚本入口退出码", async (t) => {
  const root = project(t);
  const report = await analyzeArtifacts({ root, feature: "aa", decisions: "missing.md", package: "missing.json", plan: ".work/aa/spec.md" });
  assert.equal(report.sections.stage_coverage.status, "unassessed");
  assert.equal(report.status, "incomplete");
  assert.equal(exitCodeFor(report), 2);
  await assert.rejects(analyzeArtifacts({ root, feature: "../x" }), /--feature/);
  const cli = spawnSync(process.execPath, [path.join(ROOT, "scripts/analyze-artifacts"), "--root", root, "--feature", "nope"], { encoding: "utf8" });
  assert.equal(cli.status, 2, cli.stderr);
});
