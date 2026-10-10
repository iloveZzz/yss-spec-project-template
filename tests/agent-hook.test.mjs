import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULES, changedPaths, formatFailures, parsePayload, selectChecks } from "../scripts/lib/agent-hook.mjs";
import { STEPS } from "../scripts/lib/ci-gate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = path.join(ROOT, "scripts/agent-hook");
const STUB = `#!/usr/bin/env bash
name="$(basename "$0")"
echo "$name $*" >>"$STUB_LOG"
if [[ " \${STUB_FAIL:-} " == *" $name "* ]]; then echo "$name 失败输出" >&2; exit 1; fi
echo "$name ok"
`;
const CHECK_SCRIPTS = ["sync-skills", "update-skill-lock", "verify-skill-registry", "verify-lifecycle-registry", "verify-agent-config", "verify-approval-record"];

function git(cwd, ...args) {
  const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function write(root, relative, content = "x\n") {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** 带桩检查脚本的最小模板源仓库：桩只记录调用，真实检查由各自的测试覆盖。 */
function fixture(t, { scripts = CHECK_SCRIPTS } = {}) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "yss-agent-hook-"))); // 维护存储拒绝穿越符号链接（macOS 的 /var）
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "repo");
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(root, "yss-project.yaml"), "schema_version: 1\nrepository_mode: template-source\n");
  for (const name of scripts) fs.writeFileSync(path.join(root, "scripts", name), STUB, { mode: 0o755 });
  write(root, "skills-lock.json", "{}\n");
  write(root, "docs/guide.md", "guide\n");
  write(root, ".agents/skills/demo/SKILL.md", "demo\n");
  write(root, ".codex/config.toml", "model = \"x\"\n");
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "fixture");
  const runtimeHome = path.join(directory, "runtime");
  const stubLog = path.join(directory, "stub.log");
  const calls = () => (fs.existsSync(stubLog) ? fs.readFileSync(stubLog, "utf8").trim().split("\n") : []);
  return { root, directory, runtimeHome, stubLog, calls };
}

function runHook(f, { payload = {}, env = {}, args = [] } = {}) {
  const started = process.hrtime.bigint();
  const result = spawnSync(process.execPath, [HOOK, ...args], {
    cwd: f.directory,
    input: JSON.stringify({ cwd: f.root, hook_event_name: "Stop", session_id: "s1", ...payload }),
    env: { ...process.env, STUB_LOG: f.stubLog, YSS_RUNTIME_HOME: f.runtimeHome, YSS_AGENT_HOOK: "", ...env },
    encoding: "utf8",
  });
  return { ...result, ms: Number(process.hrtime.bigint() - started) / 1e6 };
}

function lastRun(f) {
  const found = fs.readdirSync(f.runtimeHome, { recursive: true }).find((entry) => String(entry).endsWith("agent-hook/last-run.json"));
  return found ? JSON.parse(fs.readFileSync(path.join(f.runtimeHome, String(found)), "utf8")) : null;
}

test("每条规则引用的 ci-gate 步骤都存在，hook 的标题与修复建议与 ci-gate 一致", () => {
  const checks = selectChecks([".agents/skills/a/SKILL.md", ".template-spec/agents/yss-skill-registry.yaml", ".template-spec/process/lifecycle-registry.yaml", ".codex/config.toml", ".work/f/gates/g-approval.yaml"]);
  assert.deepEqual(checks.map((check) => check.id), ["sync-skills", "skill-lock", "skill-registry", "lifecycle-registry", "approval-record", "agent-config"]);
  const byId = new Map(STEPS.map((step) => [step.id, step]));
  for (const check of checks.filter((item) => item.id !== "approval-record")) {
    assert.equal(check.title, byId.get(check.id).title);
    assert.equal(check.fix, byId.get(check.id).fix);
  }
  assert.equal(RULES.length, 5);
});

test("路径选择：无关路径为空，多个触发路径的检查去重，批准记录逐个文件校验", () => {
  assert.deepEqual(selectChecks(["docs/a.md", "README.md", "scripts/lib/foo.mjs"]), []);
  const skills = selectChecks([".agents/skills/a/SKILL.md", ".codex/skills/a/SKILL.md", "skills-lock.json"]);
  assert.deepEqual(skills.map((check) => check.command.join(" ")), ["scripts/sync-skills --check", "scripts/update-skill-lock --check", "scripts/verify-agent-config"]);
  const approvals = selectChecks([".work/a/gates/g1-approval.yaml", ".work/b/gates/g2-approval.json", ".work/a/gates/notes.md"]);
  assert.deepEqual(approvals.map((check) => check.command), [
    ["scripts/verify-approval-record", "--history", ".work/a/gates/g1-approval.yaml"],
    ["scripts/verify-approval-record", "--history", ".work/b/gates/g2-approval.json"],
  ]);
  assert.deepEqual(selectChecks(["submodules/yss-backend-agent/.codex/config.toml"]).map((check) => check.id), ["agent-config"]);
  assert.deepEqual(selectChecks([".claude/skills/x/SKILL.md"]).map((check) => check.id), ["sync-skills", "skill-lock"]);
});

test("changedPaths 覆盖已暂存、未暂存、未跟踪与重命名，并忽略子模块内部", (t) => {
  const f = fixture(t);
  assert.deepEqual(changedPaths(f.root), []);
  write(f.root, "docs/guide.md", "changed\n");
  write(f.root, "untracked/new file.md");
  write(f.root, "staged.md");
  git(f.root, "add", "staged.md");
  git(f.root, "mv", "skills-lock.json", "renamed-lock.json");
  assert.deepEqual(changedPaths(f.root), ["docs/guide.md", "renamed-lock.json", "skills-lock.json", "staged.md", "untracked/new file.md"]);
  assert.equal(changedPaths(path.join(f.directory, "missing")), null);
});

test("AC-008：只改普通文档时无输出、立即成功，且不运行任何检查脚本", (t) => {
  const f = fixture(t);
  write(f.root, "docs/guide.md", "changed\n");
  const result = runHook(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  assert.deepEqual(f.calls(), []);
  assert.ok(result.ms < 1000, `耗时 ${result.ms}ms`);
});

test("没有任何变更时成功且不运行检查", (t) => {
  const f = fixture(t);
  const result = runHook(f);
  assert.equal(result.status, 0);
  assert.deepEqual(f.calls(), []);
});

test("AC-007：改了 skills-lock.json 且检查失败时阻止结束，给出命令与修复；修复后再次结束成功", (t) => {
  const f = fixture(t);
  write(f.root, "skills-lock.json", "{\"drift\":true}\n");
  const blocked = runHook(f, { env: { STUB_FAIL: "update-skill-lock" } });
  assert.equal(blocked.status, 2);
  assert.equal(blocked.stdout, "");
  assert.match(blocked.stderr, /技能锁与分发内容一致（scripts\/update-skill-lock --check）/);
  assert.match(blocked.stderr, /update-skill-lock 失败输出/);
  assert.match(blocked.stderr, /修复：scripts\/update-skill-lock/);
  assert.match(blocked.stderr, /YSS_AGENT_HOOK=off/);
  assert.deepEqual(f.calls().sort(), ["sync-skills --check", "update-skill-lock --check"]);
  assert.equal(lastRun(f).status, "blocked");

  const fixed = runHook(f, { payload: { stop_hook_active: true } });
  assert.equal(fixed.status, 0);
  assert.equal(fixed.stdout, "");
  assert.equal(lastRun(f).status, "passed");
});

test("上一次阻断后仍失败：放行并用 systemMessage 声明，避免 agent 无法结束会话", (t) => {
  const f = fixture(t);
  write(f.root, "skills-lock.json", "{\"drift\":true}\n");
  const result = runHook(f, { payload: { stop_hook_active: true }, env: { STUB_FAIL: "sync-skills" } });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.match(output.systemMessage, /技能投影与 canonical 一致/);
  assert.match(output.systemMessage, /ci-gate 仍会拦截/);
  assert.equal(lastRun(f).status, "released-after-block");
});

test("未跟踪的新技能与 Codex 投影根同样触发检查", (t) => {
  const f = fixture(t);
  write(f.root, ".agents/skills/new-skill/SKILL.md", "new\n");
  assert.equal(runHook(f).status, 0);
  assert.deepEqual(f.calls().sort(), ["sync-skills --check", "update-skill-lock --check"]);
});

test("生命周期注册表只触发注册表检查；技能注册表额外触发注册表校验", (t) => {
  const f = fixture(t);
  write(f.root, ".template-spec/process/lifecycle-registry.yaml");
  assert.equal(runHook(f).status, 0);
  assert.deepEqual(f.calls(), ["verify-lifecycle-registry"]);
  fs.rmSync(f.stubLog);
  git(f.root, "add", "-A");
  git(f.root, "commit", "-q", "-m", "registry");
  write(f.root, ".template-spec/agents/yss-skill-registry.yaml");
  assert.equal(runHook(f).status, 0);
  assert.deepEqual(f.calls().sort(), ["sync-skills --check", "update-skill-lock --check", "verify-skill-registry"]);
});

test("批准记录变化时逐个文件做结构校验，失败信息带文件路径", (t) => {
  const f = fixture(t);
  write(f.root, ".work/feature/gates/g1-approval.yaml");
  const result = runHook(f, { env: { STUB_FAIL: "verify-approval-record" } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /批准记录结构（scripts\/verify-approval-record --history \.work\/feature\/gates\/g1-approval\.yaml）/);
  assert.deepEqual(f.calls(), ["verify-approval-record --history .work/feature/gates/g1-approval.yaml"]);
});

test(".codex/ 变化触发配置安全检查，失败时阻止结束", (t) => {
  const f = fixture(t);
  write(f.root, ".codex/config.toml", "sandbox_mode = \"danger-full-access\"\n");
  const result = runHook(f, { env: { STUB_FAIL: "verify-agent-config" } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Agent 配置安全/);
  assert.deepEqual(f.calls(), ["verify-agent-config"]);
});

test("YSS_AGENT_HOOK=off 跳过检查、在输出中声明，并写入仓外 bypass 记录", (t) => {
  const f = fixture(t);
  write(f.root, "skills-lock.json", "{\"drift\":true}\n");
  const result = runHook(f, { env: { YSS_AGENT_HOOK: "off", STUB_FAIL: "update-skill-lock" } });
  assert.equal(result.status, 0);
  assert.match(JSON.parse(result.stdout).systemMessage, /YSS_AGENT_HOOK=off 跳过本次检查/);
  assert.deepEqual(f.calls(), []);
  const bypass = fs.readdirSync(f.runtimeHome, { recursive: true }).find((entry) => String(entry).endsWith("agent-hook/bypass.jsonl"));
  assert.ok(bypass, "bypass 记录应写入仓外维护目录");
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.runtimeHome, String(bypass)), "utf8").trim()).session_id, "s1");
  assert.deepEqual(changedPaths(f.root), ["skills-lock.json"], "仓内不得新增文件");
});

test("缺少检查脚本时跳过该项并记录，不阻断", (t) => {
  const f = fixture(t, { scripts: CHECK_SCRIPTS.filter((name) => name !== "verify-agent-config") });
  write(f.root, ".codex/config.toml", "model = \"y\"\n");
  const result = runHook(f);
  assert.equal(result.status, 0);
  const report = lastRun(f);
  assert.equal(report.status, "passed");
  assert.deepEqual(report.checks.map((check) => [check.id, check.status, check.reason]), [["agent-config", "skipped", "缺少 scripts/verify-agent-config"]]);
});

test("报告写在仓外且不含检查输出；非模板源仓库不写报告也不影响结论", (t) => {
  const f = fixture(t);
  write(f.root, "skills-lock.json", "{\"drift\":true}\n");
  assert.equal(runHook(f).status, 0);
  const report = lastRun(f);
  assert.equal(report.changed_paths, 1);
  assert.ok(report.checks.every((check) => !("output" in check) && check.exit_code === 0 && Number.isFinite(check.duration_ms)));
  assert.deepEqual(changedPaths(f.root), ["skills-lock.json"], "仓内不得新增文件");

  const plain = fixture(t);
  fs.rmSync(path.join(plain.root, "yss-project.yaml"));
  git(plain.root, "add", "-A");
  git(plain.root, "commit", "-q", "-m", "plain");
  write(plain.root, "skills-lock.json", "{\"drift\":true}\n");
  const result = runHook(plain, { env: { STUB_FAIL: "sync-skills" } });
  assert.equal(result.status, 2, "阻断结论不依赖报告");
  assert.equal(fs.existsSync(plain.runtimeHome), false);
});

test("不在 Git 仓库、payload 缺失或损坏、未知参数时都不阻断会话", (t) => {
  const f = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "yss-agent-hook-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  assert.equal(runHook(f, { payload: { cwd: outside } }).status, 0);
  assert.deepEqual(parsePayload(""), {});
  assert.deepEqual(parsePayload("not json"), {});
  assert.deepEqual(parsePayload("[1]"), {});
  const garbled = spawnSync(process.execPath, [HOOK, "--root", f.root], { input: "{broken", encoding: "utf8", env: { ...process.env, STUB_LOG: f.stubLog, YSS_RUNTIME_HOME: f.runtimeHome } });
  assert.equal(garbled.status, 0);
  const bad = spawnSync(process.execPath, [HOOK, "--unknown"], { input: "{}", encoding: "utf8" });
  assert.equal(bad.status, 0);
  assert.match(bad.stderr, /agent-hook 错误（已放行）/);
});

test("--help 说明触发路径与退出码，退出 0", () => {
  const result = spawnSync(process.execPath, [HOOK, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /退出 2/);
  assert.match(result.stdout, /YSS_AGENT_HOOK=off/);
});

test("formatFailures 限制每项输出的行数并保留修复命令", () => {
  const text = formatFailures([{ title: "t", command: "c", fix: "f", output: Array.from({ length: 40 }, (_, index) => `line${index}`).join("\n") }]);
  assert.match(text, /line11/);
  assert.doesNotMatch(text, /line12/);
  assert.match(text, /修复：f/);
});

test("两个运行时的 Stop hook 配置：同一入口脚本、只注册 Stop、带超时", () => {
  for (const [file, expected] of [[".claude/settings.json", /CLAUDE_PROJECT_DIR.*scripts\/agent-hook/], [".codex/hooks.json", /scripts\/agent-hook/]]) {
    const config = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
    assert.deepEqual(Object.keys(config.hooks), ["Stop"], file);
    const handlers = config.hooks.Stop.flatMap((group) => group.hooks);
    assert.equal(handlers.length, 1, file);
    assert.equal(handlers[0].type, "command", file);
    assert.match(handlers[0].command, expected, file);
    assert.ok(handlers[0].timeout > 0 && handlers[0].timeout <= 120, file);
  }
});

test("hook 文件不进入实例分发：入口脚本、库与 Claude 设置都在 bundle 排除列表", () => {
  const profile = JSON.parse(fs.readFileSync(path.join(ROOT, ".template-source/distribution/bundle-profile.json"), "utf8"));
  for (const file of ["scripts/agent-hook", "scripts/lib/agent-hook.mjs", ".claude/settings.json", ".codex/hooks.json"]) {
    assert.ok(profile.manifest.excludePaths.includes(file), `${file} 应排除出实例分发`);
  }
});
