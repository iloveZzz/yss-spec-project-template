import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editedFile, runEditHook, SKIP_ENV } from "../scripts/lib/edit-hook.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = "/project";
const payload = (file) => ({ tool_name: "Write", tool_input: { file_path: file } });

/** 记录调用并返回给定 envelope 的桩，替代真实 yss。 */
function fakeRun(envelope, { error } = {}) {
  const calls = [];
  const run = (binary, args) => {
    calls.push([binary, ...args]);
    return error ? { error } : { status: 0, stdout: JSON.stringify(envelope) };
  };
  return { run, calls };
}

test("只选项目根内的 YAML/JSON 文件", () => {
  assert.equal(editedFile(payload("/project/.work/f1/approval.yaml"), root), ".work/f1/approval.yaml");
  assert.equal(editedFile(payload(".work/f1/cp.json"), root), ".work/f1/cp.json");
  assert.equal(editedFile(payload("/project/src/Main.java"), root), null);
  assert.equal(editedFile(payload("/elsewhere/a.yaml"), root), null);
  assert.equal(editedFile({ tool_input: {} }, root), null);
});

test("检查失败退出 2，发现带定位、修复与复现命令", () => {
  const { run, calls } = fakeRun({ command: "check", status: "error", code: "CHECK_FAILED", result: { findings: [{ code: "SCHEMA", file: ".work/f1/cr.yaml", pointer: "/a", fix: "修 a", command: "yss evidence verify" }] } });
  const result = runEditHook({ root, payload: payload("/project/.work/f1/cr.yaml"), env: {}, run });
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /\.work\/f1\/cr\.yaml#\/a SCHEMA：修 a/);
  assert.match(result.stderr, /复现：yss evidence verify/);
  assert.deepEqual(calls[0], ["yss", "check", ".work/f1/cr.yaml", "--root", root, "--json"]);
});

test("未完成只提示上下文，不阻断也不声称通过", () => {
  const { run } = fakeRun({ command: "check", status: "ok", code: "OK", result: { status: "incomplete", items: [{ file: "d.yaml", status: "not-evaluated", reason: "需要上下文", command: "yss evidence verify --checkpoint '<当前checkpoint>'" }] } });
  const result = runEditHook({ root, payload: payload("d.yaml"), env: {}, run });
  assert.equal(result.exitCode, 0);
  const context = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(context.hookEventName, "PostToolUse");
  assert.match(context.additionalContext, /未评估（不代表通过）/);
});

test("通过、CLI 缺失、旧 CLI 不认识 check、显式关闭：静默放行", () => {
  for (const [name, fake, env] of [
    ["通过", fakeRun({ command: "check", status: "ok", code: "OK", result: { status: "passed" } }), {}],
    ["CLI 缺失", fakeRun(null, { error: Object.assign(new Error("spawn yss ENOENT"), { code: "ENOENT" }) }), {}],
    ["旧 CLI", fakeRun({ command: "", status: "error", code: "ARGUMENT", result: { message: "未知命令: check" } }), {}],
    ["关闭", fakeRun({}), { [SKIP_ENV]: "off" }],
  ]) {
    const result = runEditHook({ root, payload: payload("a.yaml"), env, run: fake.run });
    assert.deepEqual(result, { exitCode: 0, stdout: "", stderr: "" }, name);
  }
});

test("可指定 yss 路径；脚本入口在无输入时放行", () => {
  const { run, calls } = fakeRun({ command: "check", status: "ok", code: "OK", result: { status: "passed" } });
  runEditHook({ root, payload: payload("a.json"), env: { YSS_BIN: "/opt/yss" }, run });
  assert.equal(calls[0][0], "/opt/yss");
  const entry = spawnSync(process.execPath, [path.join(ROOT, "scripts/edit-hook")], { input: "", encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT } });
  assert.equal(entry.status, 0, entry.stderr);
});
