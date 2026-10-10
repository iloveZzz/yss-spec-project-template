import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS, checkNodeEngines, runGate, satisfiesNodeRange, validateOptions } from "../scripts/lib/ci-gate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CI_GATE = path.join(ROOT, "scripts/ci-gate");
const CI_SETUP = path.join(ROOT, "scripts/ci-setup");
const STUB = `#!/usr/bin/env bash
name="$(basename "$0")"
[ -n "\${STUB_LOG:-}" ] && echo "$name $*" >>"$STUB_LOG"
if [[ " \${STUB_FAIL:-} " == *" $name "* ]]; then echo "$name 失败输出" >&2; exit 1; fi
if [ "\${STUB_WRITE_FROM:-}" = "$name" ]; then echo x >"$STUB_WRITE"; fi
echo "$name ok"
`;
const SETUP_MARKER = `#!/usr/bin/env bash\nYSS_CI_NODE_MAJOR="\${YSS_CI_NODE_MAJOR:-24}"\n`;

function sink() {
  return { text: "", write(chunk) { this.text += chunk; return true; } };
}

function sh(cwd, ...args) {
  const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

/** 带桩脚本的最小仓库：每个 STEPS 命令都是只记录参数的 bash 桩，真实检查由各自的测试覆盖。 */
function fixture(t, { engines = ">=22", nvmrc = "22", write, commits = 2 } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yss-ci-gate-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "repo");
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({ name: "fixture", private: true, ...(engines ? { engines: { node: engines } } : {}) })}\n`);
  if (nvmrc !== null) fs.writeFileSync(path.join(root, ".nvmrc"), `${nvmrc}\n`);
  fs.writeFileSync(path.join(root, "scripts/ci-setup"), SETUP_MARKER);
  const commands = new Set(["scripts/verify-template-candidate", "scripts/verify-template-fast"]);
  for (const step of STEPS) if (Array.isArray(step.command)) commands.add(step.command[0]);
  for (const command of commands) {
    fs.writeFileSync(path.join(root, command), STUB, { mode: 0o755 });
  }
  sh(root, "init", "-q");
  sh(root, "add", "-A");
  sh(root, "commit", "-q", "-m", "fixture");
  const base = sh(root, "rev-parse", "HEAD");
  if (commits > 1) {
    fs.writeFileSync(path.join(root, "CHANGE.md"), "change\n");
    sh(root, "add", "-A");
    sh(root, "commit", "-q", "-m", "change");
  }
  const reportDir = path.join(directory, "reports", "run");
  const stubLog = path.join(directory, "stub.log");
  return { root, base, reportDir, stubLog, directory, write: write ? path.join(root, write) : undefined };
}

async function gate(t, options = {}, env = {}) {
  const f = fixture(t, options.fixture);
  const out = sink();
  const err = sink();
  const result = await runGate({
    root: f.root,
    mode: options.mode ?? "push",
    base: options.mode === "pr" ? f.base : undefined,
    reportDir: f.reportDir,
    steps: options.steps,
    env: { ...process.env, STUB_LOG: f.stubLog, ...(f.write ? { STUB_WRITE: f.write } : {}), ...env },
    stdout: out,
    stderr: err,
  });
  const calls = fs.existsSync(f.stubLog) ? fs.readFileSync(f.stubLog, "utf8").trim().split("\n") : [];
  return { ...f, ...result, out: out.text, err: err.text, calls };
}

test("步骤集中在一个数组里，顺序固定，后续工作包只追加", () => {
  assert.deepEqual(STEPS.map((step) => step.id), [
    "agent-config", "sync-skills", "skill-lock", "lifecycle-registry", "skill-registry", "doc-facts", "node-engines", "verify-template", "verify-candidate",
  ]);
  assert.equal(new Set(STEPS.map((step) => step.id)).size, STEPS.length);
  assert.ok(STEPS.every((step) => step.title && (step.command || step.run)));
});

test("engines.node 范围：支持的写法按语义判断，不支持的写法直接拒绝", () => {
  const at = (range, version) => satisfiesNodeRange(range, version);
  assert.equal(at(">=22", [22, 0, 0]), true);
  assert.equal(at(">=22", [21, 9, 0]), false);
  assert.equal(at(">=22 <25", [24, 0, 0]), true);
  assert.equal(at(">=22 <25", [25, 0, 0]), false);
  assert.equal(at("22", [22, 3, 0]), true);
  assert.equal(at("22.x", [23, 0, 0]), false);
  assert.equal(at("^22.1.0", [22, 0, 0]), false);
  assert.equal(at("^22.1.0", [22, 5, 0]), true);
  assert.equal(at(">22", [22, 9, 0]), false);
  assert.equal(at(">22", [23, 0, 0]), true);
  assert.equal(at("<=22", [22, 9, 0]), true);
  assert.equal(at("20 || >=22", [21, 0, 0]), false);
  assert.equal(at("20 || >=22", [24, 0, 0]), true);
  for (const bad of ["lts/*", "~22.1", "", ">=22 - 24", "^0.3.0"]) {
    assert.throws(() => at(bad, [22, 0, 0]), TypeError, bad);
  }
});

test("三处 Node 版本声明一致时通过，并报告各自的取值", (t) => {
  const { root } = fixture(t);
  const result = checkNodeEngines(root);
  assert.deepEqual(result.findings, []);
  assert.equal(result.range, ">=22");
  assert.deepEqual(result.declared.map((item) => item.file), [".nvmrc", "scripts/ci-setup"]);
});

test("AC-012：engines.node 与 .nvmrc 不一致时同时指出两处", (t) => {
  const { root } = fixture(t, { engines: ">=24", nvmrc: "22" });
  const [finding, ...rest] = checkNodeEngines(root).findings;
  assert.equal(rest.length, 0);
  assert.equal(finding.file, ".nvmrc");
  assert.match(finding.detail, /engines\.node \(">=24"\)/);
  assert.match(finding.detail, /\.nvmrc \(22\)/);
});

test("运行器 Node 主版本超出 engines.node 时报告 scripts/ci-setup", (t) => {
  const { root } = fixture(t, { engines: ">=22 <24" });
  const findings = checkNodeEngines(root).findings;
  assert.deepEqual(findings.map((finding) => finding.file), ["scripts/ci-setup"]);
  assert.match(findings[0].detail, /YSS_CI_NODE_MAJOR 24/);
});

test("缺少声明或写法不受支持时失败而不是静默放行", (t) => {
  assert.match(checkNodeEngines(fixture(t, { engines: null }).root).findings[0].detail, /未声明 engines\.node/);
  assert.match(checkNodeEngines(fixture(t, { nvmrc: null }).root).findings[0].detail, /缺少 \.nvmrc/);
  assert.match(checkNodeEngines(fixture(t, { nvmrc: "lts/*" }).root).findings[0].detail, /不支持的写法/);
  assert.match(checkNodeEngines(fixture(t, { engines: "~22.1" }).root).findings[0].detail, /不支持的 engines\.node 写法/);
});

test("AC-004：推送模式全部通过，报告在仓外，仓内没有新增文件", async (t) => {
  const run = await gate(t);
  assert.equal(run.exitCode, 0, run.err);
  assert.equal(run.report.status, "passed");
  assert.deepEqual(run.report.steps.map((step) => step.id), [...STEPS.map((step) => step.id).filter((id) => id !== "verify-candidate"), "repository-unchanged"]);
  assert.ok(run.report.steps.every((step) => step.status === "passed" && step.exit_code === 0 && fs.existsSync(step.log)));
  assert.equal(run.reportPath, path.join(run.reportDir, "report.json"));
  assert.ok(path.relative(run.root, run.reportDir).startsWith(".."));
  assert.equal(sh(run.root, "status", "--porcelain", "--untracked-files=all"), "");
  assert.equal(run.report.head, sh(run.root, "rev-parse", "HEAD"));
  const parent = sh(run.root, "rev-parse", "HEAD^");
  assert.equal(run.report.scope_base, parent);
  assert.ok(run.calls.some((line) => line.startsWith("verify-template-fast ") && line.includes(`--base ${parent} --report-dir ${path.join(run.reportDir, "verification")}`)));
  assert.ok(!run.calls.some((line) => line.startsWith("verify-template-candidate")));
});

test("推送模式的 fast 以 HEAD^ 为范围基准，没有上一提交时不带 --base", async (t) => {
  const single = await gate(t, { fixture: { commits: 1 } });
  assert.equal(single.exitCode, 0, single.err);
  assert.equal(single.report.scope_base, null);
  const fast = single.calls.find((line) => line.startsWith("verify-template-fast "));
  assert.ok(fast && !fast.includes("--base"), fast);
});

test("PR 模式把完整 base SHA 交给 fast（阻断）与 candidate（非阻断）", async (t) => {
  const run = await gate(t, { mode: "pr" });
  assert.equal(run.exitCode, 0, run.err);
  assert.equal(run.report.base, run.base);
  assert.equal(run.report.scope_base, run.base);
  const fast = run.calls.filter((line) => line.startsWith("verify-template-fast "));
  assert.equal(fast.length, 1);
  assert.match(fast[0], new RegExp(`--base ${run.base} --report-dir ${path.join(run.reportDir, "verification").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  const candidate = run.calls.filter((line) => line.startsWith("verify-template-candidate "));
  assert.equal(candidate.length, 1);
  assert.match(candidate[0], new RegExp(`--base ${run.base} --report-dir ${path.join(run.reportDir, "candidate").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  assert.equal(run.report.steps.find((step) => step.id === "verify-candidate").status, "passed");
});

test("PR 模式 candidate 失败只记录，退出码仍由阻断步骤决定", async (t) => {
  const run = await gate(t, { mode: "pr" }, { STUB_FAIL: "verify-template-candidate" });
  assert.equal(run.exitCode, 0, run.err);
  assert.equal(run.report.status, "passed");
  const candidate = run.report.steps.find((step) => step.id === "verify-candidate");
  assert.equal(candidate.status, "failed-nonblocking");
  assert.equal(candidate.exit_code, 1);
  assert.match(run.err, /步骤: verify-candidate/);
});

test("AC-003：投影检查失败时输出步骤名、命令、日志与修复命令，并继续跑其它便宜检查", async (t) => {
  const run = await gate(t, { mode: "pr" }, { STUB_FAIL: "sync-skills" });
  assert.equal(run.exitCode, 1);
  assert.match(run.err, /步骤: sync-skills/);
  assert.match(run.err, /命令: scripts\/sync-skills --check/);
  assert.match(run.err, /修复: scripts\/sync-skills\n/);
  const failed = run.report.steps.find((step) => step.id === "sync-skills");
  assert.equal(failed.status, "failed");
  assert.equal(failed.exit_code, 1);
  assert.match(fs.readFileSync(failed.log, "utf8"), /sync-skills 失败输出/);
  assert.match(run.err, new RegExp(failed.log.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(run.report.steps.find((step) => step.id === "skill-registry").status, "passed");
  for (const id of ["verify-template", "verify-candidate"]) assert.equal(run.report.steps.find((step) => step.id === id).status, "skipped", id);
  assert.ok(!run.calls.some((line) => line.startsWith("verify-template-")));
  assert.match(run.out, /ci-gate 失败：sync-skills/);
});

test("每个检查脚本失败都会让整体失败并落在报告里", async (t) => {
  for (const name of ["verify-agent-config", "update-skill-lock", "verify-lifecycle-registry", "verify-skill-registry", "verify-doc-facts"]) {
    const run = await gate(t, {}, { STUB_FAIL: name });
    assert.equal(run.exitCode, 1, name);
    assert.deepEqual(run.report.steps.filter((step) => step.status === "failed").map((step) => step.command.split(" ")[0]), [`scripts/${name}`], name);
  }
});

test("fast 失败时报告失败并保留退出码，PR 模式下 candidate 随之跳过", async (t) => {
  const run = await gate(t, { mode: "pr" }, { STUB_FAIL: "verify-template-fast" });
  assert.equal(run.exitCode, 1);
  assert.equal(run.report.steps.find((step) => step.id === "verify-template").exit_code, 1);
  assert.equal(run.report.steps.find((step) => step.id === "verify-candidate").status, "skipped");
});

test("非阻断步骤失败只记录，不改变退出码", async (t) => {
  const steps = [
    { id: "required", title: "必需", command: ["scripts/verify-doc-facts"] },
    { id: "observed", title: "观察", command: ["scripts/verify-skill-registry"], blocking: false, fix: "仅供观察" },
  ];
  const run = await gate(t, { steps }, { STUB_FAIL: "verify-skill-registry" });
  assert.equal(run.exitCode, 0);
  assert.equal(run.report.status, "passed");
  assert.equal(run.report.steps.find((step) => step.id === "observed").status, "failed-nonblocking");
});

test("检查步骤向仓内写文件时失败并指出文件", async (t) => {
  const run = await gate(t, { fixture: { write: "stray.txt" } }, { STUB_WRITE_FROM: "verify-doc-facts" });
  assert.equal(run.exitCode, 1);
  const guard = run.report.steps.at(-1);
  assert.equal(guard.id, "repository-unchanged");
  assert.equal(guard.status, "failed");
  assert.match(fs.readFileSync(guard.log, "utf8"), /stray\.txt/);
  assert.match(run.err, /repository-unchanged/);
});

test("缺失的命令记录为 127 而不是崩溃", async (t) => {
  const steps = [{ id: "missing", title: "缺失", command: ["scripts/does-not-exist"], fix: "补齐脚本" }];
  const run = await gate(t, { steps });
  assert.equal(run.exitCode, 1);
  assert.equal(run.report.steps[0].exit_code, 127);
});

test("选项校验：模式、base 与报告目录", (t) => {
  const f = fixture(t);
  const ok = { root: f.root, mode: "pr", base: f.base, reportDir: f.reportDir };
  assert.doesNotThrow(() => validateOptions(ok));
  assert.throws(() => validateOptions({ ...ok, mode: undefined }), /--mode/);
  assert.throws(() => validateOptions({ ...ok, base: undefined }), /需要 --base/);
  assert.throws(() => validateOptions({ ...ok, base: "main" }), /40 位/);
  assert.throws(() => validateOptions({ ...ok, base: f.base.slice(0, 12) }), /40 位/);
  assert.throws(() => validateOptions({ ...ok, base: "0".repeat(40) }), /找不到 base 提交/);
  assert.throws(() => validateOptions({ ...ok, mode: "push" }), /只用于 PR/);
  assert.throws(() => validateOptions({ ...ok, reportDir: "relative/dir" }), /绝对路径/);
  assert.throws(() => validateOptions({ ...ok, reportDir: path.join(f.root, "reports") }), /必须在仓库外/);
  fs.mkdirSync(f.reportDir, { recursive: true });
  fs.writeFileSync(path.join(f.reportDir, "old.json"), "{}");
  assert.throws(() => validateOptions(ok), /新目录或空目录/);
});

test("命令行：用法错误退出 2，帮助退出 0，仓库失败退出 1", (t) => {
  const f = fixture(t);
  const run = (...args) => spawnSync(CI_GATE, ["--root", f.root, ...args], { encoding: "utf8", env: { ...process.env, STUB_LOG: f.stubLog } });
  const noMode = run();
  assert.equal(noMode.status, 2);
  assert.match(noMode.stderr, /用法: scripts\/ci-gate/);
  assert.equal(run("--mode", "pr").status, 2);
  assert.equal(run("--mode", "push", "--bogus").status, 2);
  const help = run("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--mode pr --base/);
  const pass = run("--mode", "push", "--report-dir", f.reportDir);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /ci-gate 通过/);
  const failing = spawnSync(CI_GATE, ["--root", f.root, "--mode", "push", "--report-dir", `${f.reportDir}-2`], { encoding: "utf8", env: { ...process.env, STUB_FAIL: "verify-skill-registry" } });
  assert.equal(failing.status, 1);
});

test("ci-setup：dry-run 只打印计划，覆盖子模块、yss 构建、pnpm 与 Python", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const result = spawnSync(CI_SETUP, ["--dry-run", "--submodules", "--yss-commit", sha], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(result.status, 0, result.stderr);
  for (const expected of [/Node 主版本必须是 24/, /repository-mode/, /submodule update --init --depth=1 -- submodules\/yss-cli\n/, /submodule update --init -- submodules\/yss-harness-design-agent /, new RegExp(sha), /pnpm --dir \.template-source\/tooling\/node install --frozen-lockfile/, /jsonschema==4\.23\.0/, /环境准备完成/]) {
    assert.match(result.stdout, expected);
  }
  assert.doesNotMatch(result.stdout, /--depth=1 -- submodules\/yss-harness/, "构建 yss 需要 Profile 仓库的完整历史");
  const shallow = spawnSync(CI_SETUP, ["--dry-run", "--submodules"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.match(shallow.stdout, /submodule update --init --depth=1 -- submodules\/yss-harness-design-agent /);
  assert.match(shallow.stdout, /submodule update --init --depth=1 -- submodules\/yss-cli\n/);
  const minimal = spawnSync(CI_SETUP, ["--dry-run", "--no-python"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(minimal.status, 0, minimal.stderr);
  assert.doesNotMatch(minimal.stdout, /jsonschema|submodule update|yss-cli/);
});

test("ci-setup：--print-versions 打印可直接追加到 GITHUB_OUTPUT 的目标版本，且不要求 CI 环境", () => {
  const result = spawnSync(CI_SETUP, ["--print-versions"], { encoding: "utf8", env: { ...process.env, CI: "", YSS_CI_NODE_MAJOR: "", YSS_CI_PYTHON_MINOR: "" } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^node=\d+\npython=\d+\.\d+\n$/);
  const overridden = spawnSync(CI_SETUP, ["--print-versions"], { encoding: "utf8", env: { ...process.env, CI: "", YSS_CI_NODE_MAJOR: "26", YSS_CI_PYTHON_MINOR: "3.13" } });
  assert.equal(overridden.stdout, "node=26\npython=3.13\n");
});

test("ci-setup：Python 必须恰为目标版本，缺失时的补装与 Go 的补装都写进 dry-run 计划", () => {
  const plan = spawnSync(CI_SETUP, ["--dry-run", "--submodules"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /不是 3\.12 时，在 root 容器内经 uv==\d+\.\d+\.\d+ 补装/);
  assert.match(plan.stdout, /Go：版本取自 submodules\/yss-cli\/go\.mod/);
  assert.match(plan.stdout, /go\.dev 公布的 sha256/);
  const source = fs.readFileSync(CI_SETUP, "utf8");
  assert.doesNotMatch(source, /PYTHON_FLOOR/);
  assert.match(source, /sha256sum -c/);
});

test("ci-setup：本机非 dry-run 拒绝执行，非法参数退出 2", () => {
  const local = spawnSync(CI_SETUP, [], { encoding: "utf8", env: { ...process.env, CI: "", YSS_CI_ALLOW_LOCAL: "" } });
  assert.equal(local.status, 2);
  assert.match(local.stderr, /只在 CI 环境运行/);
  assert.equal(spawnSync(CI_SETUP, ["--dry-run", "--yss-commit", "main"], { encoding: "utf8" }).status, 2);
  const pinned = spawnSync(CI_SETUP, ["--dry-run", "--yss-commit", "gitlink"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(pinned.status, 0, pinned.stderr);
  const gitlink = spawnSync("git", ["-C", ROOT, "rev-parse", "HEAD:submodules/yss-cli"], { encoding: "utf8" }).stdout.trim();
  assert.match(pinned.stdout, new RegExp(`从固定提交 ${gitlink} 构建 yss`));
  assert.equal(spawnSync(CI_SETUP, ["--bogus"], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync("bash", ["-n", CI_SETUP], { encoding: "utf8" }).status, 0);
});

test("仓库自身的 Node 版本声明三处一致", () => {
  assert.deepEqual(checkNodeEngines(ROOT).findings, []);
});
