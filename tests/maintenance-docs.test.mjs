import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { MAINTENANCE_DOCS_CONFIG, checkMaintenanceDocs, loadMaintenanceDocsConfig } from "../scripts/lib/maintenance-docs.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "yss-maintenance-docs-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  fs.mkdirSync(path.dirname(path.join(root, MAINTENANCE_DOCS_CONFIG)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, MAINTENANCE_DOCS_CONFIG), path.join(root, MAINTENANCE_DOCS_CONFIG));
  fs.mkdirSync(path.join(root, "docs/superpowers/specs"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs/superpowers/plans"), { recursive: true });
  fs.mkdirSync(path.join(root, ".template-source/contracts"), { recursive: true });
  fs.writeFileSync(path.join(root, "seed.md"), "seed\n");
  git("add", "-A");
  git("commit", "-qm", "seed");
  return { root, git, baseline: git("rev-parse", "HEAD") };
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function metadata({ type = "maintenance-design", status = "draft", baseline, movedTo = null } = {}) {
  const lines = ["---", "doc_type: " + type, "status: " + status, "baseline_commit: " + baseline, "created_at: 2026-10-19"];
  if (movedTo) lines.push("moved_to: " + movedTo);
  lines.push("---", "");
  return lines.join("\n");
}

test("合法维护文档与 contracts 索引通过", (t) => {
  const { root, baseline } = fixture(t);
  write(root, "docs/superpowers/specs/good.md", metadata({ baseline }) + "# good\n");
  write(root, "docs/superpowers/plans/plan.md", metadata({ type: "maintenance-plan", status: "active", baseline }) + "# plan\n");
  write(root, ".template-source/contracts/sample.md", "# sample\n");
  write(root, ".template-source/contracts/README.md", "# index\n\n- sample.md\n");
  assert.deepEqual(checkMaintenanceDocs({ root }), []);
  assert.equal(loadMaintenanceDocsConfig({ root }).schema_version, 1);
});

test("缺少 frontmatter、非法状态、非 40 位基线与非祖先分别失败", (t) => {
  const { root, baseline } = fixture(t);
  write(root, "docs/superpowers/specs/none.md", "# no metadata\n");
  write(root, "docs/superpowers/specs/status.md", metadata({ status: "paused", baseline }) + "# x\n");
  write(root, "docs/superpowers/specs/short.md", metadata({ baseline: "abc" }) + "# x\n");
  write(root, "docs/superpowers/specs/unknown.md", metadata({ baseline: "f".repeat(40) }) + "# x\n");
  write(root, ".template-source/contracts/README.md", "# index\n");
  const rules = checkMaintenanceDocs({ root }).map((finding) => finding.rule);
  assert.ok(rules.includes("missing-frontmatter"));
  assert.ok(rules.includes("invalid-status"));
  assert.ok(rules.includes("invalid-baseline"));
  const unknown = checkMaintenanceDocs({ root }).find((finding) => finding.file.endsWith("unknown.md"));
  assert.equal(unknown.rule, "invalid-baseline");
});

test("completed 必须有迁移目标，contracts 索引必须覆盖全部文件", (t) => {
  const { root, baseline } = fixture(t);
  write(root, "docs/superpowers/plans/done.md", metadata({ type: "maintenance-plan", status: "completed", baseline }) + "# done\n");
  write(root, "docs/superpowers/plans/moved.md", metadata({ type: "maintenance-plan", status: "completed", baseline, movedTo: "archive/done.md" }) + "# moved\n");
  write(root, "archive/done.md", "archived\n");
  write(root, ".template-source/contracts/a.md", "# a\n");
  write(root, ".template-source/contracts/b.md", "# b\n");
  write(root, ".template-source/contracts/README.md", "# index\n\n- a.md\n");
  const findings = checkMaintenanceDocs({ root });
  assert.ok(findings.some((finding) => finding.rule === "missing-transition" && finding.file.endsWith("done.md")));
  assert.ok(findings.some((finding) => finding.rule === "missing-contract" && finding.detail.includes("b.md")));
});
