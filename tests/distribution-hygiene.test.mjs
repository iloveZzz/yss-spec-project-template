import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { HYGIENE_ALLOW_FILE, loadHygieneConfig, scanDistributionHygiene } from "../scripts/lib/distribution-hygiene.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function fixture(t, config = null) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "yss-hygiene-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  git("init", "-q");
  fs.mkdirSync(path.dirname(path.join(root, HYGIENE_ALLOW_FILE)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, HYGIENE_ALLOW_FILE), path.join(root, HYGIENE_ALLOW_FILE));
  if (config) fs.writeFileSync(path.join(root, HYGIENE_ALLOW_FILE), JSON.stringify(config, null, 2) + "\n");
  return { root, git };
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

test("未允许的宿主路径失败，测试夹具与历史 evidence 不阻断", (t) => {
  const { root, git } = fixture(t);
  write(root, ".template-spec/process/sample.md", "本机路径 /Users/someone/work 不应进入实例。\n");
  write(root, ".agents/skills/archify/test/release-package-gates.test.mjs", "const bin = 'C:\\Program Files\\Git\\bin\\bash.exe';\n");
  write(root, ".template-spec/engineering/evidence/log.txt", "historical /Users/legacy/path\n");
  git("add", "-A");
  const result = scanDistributionHygiene({ root });
  assert.equal(result.violations.length, 1, result.violations.join("\n"));
  assert.match(result.violations[0], /\.template-spec\/process\/sample\.md:1:/);
  assert.ok(result.allowedReferences.some((entry) => entry.includes("archify/test/release-package-gates.test.mjs")));
  assert.ok(!result.allowedReferences.some((entry) => entry.includes("engineering/evidence")));
});

test("允许清单路径消失时报告 stale", (t) => {
  const config = { schema_version: 1, exclude: [], allow: [{ path: ".agents/skills/missing/SKILL.md", reason: "fixture" }] };
  const { root } = fixture(t, config);
  const loaded = loadHygieneConfig({ root });
  assert.equal(loaded.allow.length, 1);
  const result = scanDistributionHygiene({ root });
  assert.deepEqual(result.staleAllow, [".agents/skills/missing/SKILL.md"]);
});

test("当前模板源分发面无违规且允许清单无失效项", () => {
  const result = scanDistributionHygiene({ root: ROOT });
  assert.deepEqual(result.violations, [], result.violations.join("\n"));
  assert.deepEqual(result.staleAllow, [], result.staleAllow.join("\n"));
});
