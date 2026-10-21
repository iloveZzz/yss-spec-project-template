import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { OBSOLETE } from "../scripts/lib/skill-supply-chain.mjs";
import { POLICY_FILE, loadRetiredScanPolicy, retiredSkillIds, scanRetiredSkillIds } from "../scripts/lib/skill-retirement.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "yss-retired-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  git("init", "-q");
  fs.mkdirSync(path.join(root, ".template-source/process"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, POLICY_FILE), path.join(root, POLICY_FILE));
  return { root, git };
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

test("策略分区覆盖 OBSOLETE 全集且与 retiredSkillIds 同源", () => {
  const policy = loadRetiredScanPolicy({ root: ROOT });
  const ids = retiredSkillIds();
  assert.equal(ids.length, OBSOLETE.size);
  const modes = new Map([...ids].map((id) => [id, policy.modes.get(id)]));
  assert.equal(modes.size, ids.length);
  for (const id of ids) assert.ok(["exact", "contextual", "not-text-scanned"].includes(modes.get(id)), id);
  assert.deepEqual(policy.contextualIds, ["teach", "yss-components"]);
  assert.deepEqual(policy.notScannedIds, ["qa", "research", "wizard"]);
  assert.equal(policy.exactIds.length, ids.length - 5);
});

test("当前模板源扫描无硬违规与未允许的文本引用", () => {
  const result = scanRetiredSkillIds({ root: ROOT });
  assert.deepEqual(result.hard, []);
  assert.deepEqual(result.violations, []);
  assert.ok(result.allowedReferences.length > 0);
});

test("活跃文件中的退役 ID 被检出，历史说明与通用词不误报", (t) => {
  const { root, git } = fixture(t);
  write(root, ".agents/skills/active-sample/SKILL.md", "# Sample\n\nUse yss-ui for this flow.\n");
  write(root, ".template-spec/agents/skill-migrations.md", "# 迁移\n\nyss-ui 已退役。\n");
  write(root, "notes.md", "research, qa and wizard are generic words.\n");
  git("add", "-A");
  const result = scanRetiredSkillIds({ root });
  assert.ok(result.hard.length === 0);
  assert.equal(result.violations.length, 1, result.violations.join("\n"));
  assert.match(result.violations[0], /\.agents\/skills\/active-sample\/SKILL\.md:3:/);
});

test("物理退役技能目录与现役 Profile 锁由硬检查发现", (t) => {
  const { root, git } = fixture(t);
  write(root, ".agents/skills/yss-ui/SKILL.md", "# retired\n");
  write(root, ".template-source/process/profile-status.yaml", "schema_version: 1\nprofiles:\n  spec:\n    status: kernel\n  backend:\n    status: active\n");
  write(root, "profiles/backend/skills-lock.json", JSON.stringify({ version: 3, skills: { shared: { "yss-ui": {} } } }) + "\n");
  write(root, "profiles/backend/.workbuddy/skills/yss-ui/SKILL.md", "# retired\n");
  git("add", "-A");
  const result = scanRetiredSkillIds({ root });
  assert.ok(result.hard.some((entry) => entry.includes("physical:.agents/skills/yss-ui")), result.hard.join("\n"));
  assert.ok(result.hard.some((entry) => entry.includes("lock:profiles/backend:yss-ui")), result.hard.join("\n"));
  assert.ok(result.hard.includes("physical:profiles/backend/.workbuddy/skills/yss-ui"), result.hard.join("\n"));
});

test("策略包含未知退役 ID 或未写原因时失败", (t) => {
  const { root } = fixture(t);
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, POLICY_FILE), "utf8"));
  write(root, POLICY_FILE, JSON.stringify({ ...base, not_text_scanned: [...base.not_text_scanned, { id: "not-a-retired-skill", reason: "x" }] }) + "\n");
  assert.throws(() => loadRetiredScanPolicy({ root }), /包含未知退役 ID/);
  write(root, POLICY_FILE, JSON.stringify({ ...base, contextual: [{ id: "teach" }] }) + "\n");
  assert.throws(() => loadRetiredScanPolicy({ root }), /必须写 reason/);
});
