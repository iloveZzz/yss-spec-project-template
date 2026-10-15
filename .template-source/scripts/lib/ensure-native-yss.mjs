import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { readYssCliPin, platformKey } from "./yss-cli-pin.mjs";

// 本机一条命令得到「固定的 yss 二进制 + 固定源码目录」：按 yss-cli-pin.json 的提交在缓存目录构建一次，之后复用。
// 与 scripts/ci-setup --yss-commit pin 使用同一配方（tools/build-candidate.mjs），摘要必须等于固定文件登记的值。
const fail = (message) => { throw new TypeError(message); };
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

export function defaultCacheRoot(environment = process.env) {
  return environment.YSS_PIN_CACHE || path.join(os.homedir(), ".yss-harness", "pinned-yss");
}

export function defaultRun(command, args, { cwd, env } = {}) {
  const result = spawnSync(command, args, { cwd, env: env ?? process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status ?? 1, stdout: (result.stdout ?? "").trim(), stderr: (result.stderr ?? "").trim() };
}

/** 缓存命中条件：二进制摘要等于固定值，源码目录是干净的、提交等于固定提交。 */
export function lookupCache({ cacheRoot, pin, platform = platformKey(), run = defaultRun }) {
  const dir = path.join(cacheRoot, pin.commit), source = path.join(dir, "source"), binary = path.join(dir, "build", "yss");
  const expected = pin.binaries[platform]?.sha256;
  if (!expected || !fs.existsSync(binary) || !fs.existsSync(source)) return null;
  if (sha256(fs.readFileSync(binary)) !== expected) return null;
  const head = run("git", ["rev-parse", "HEAD"], { cwd: source });
  const dirty = run("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: source });
  if (head.status !== 0 || head.stdout !== pin.commit || dirty.status !== 0 || dirty.stdout !== "") return null;
  return { binary, source, sha256: expected, cached: true };
}

export function buildPinned({ cacheRoot, pin, platform = platformKey(), run = defaultRun, log = () => {} }) {
  const expected = pin.binaries[platform]?.sha256;
  if (!expected) fail(`yss-cli 固定文件没有登记 ${platform} 平台的二进制，无法在本机构建固定版本`);
  const go = run("go", ["version"]);
  if (go.status !== 0) fail("本机没有 go；固定版本的 yss 需要 Go " + pin.go_version);
  if (!go.stdout.includes(`go${pin.go_version} `)) fail(`本机 Go 为「${go.stdout}」，固定版本要求 go${pin.go_version}；摘要只在同一 Go 版本下可复现`);
  const dir = path.join(cacheRoot, pin.commit), source = path.join(dir, "source"), out = path.join(dir, "build");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(source, { recursive: true });
  const step = (command, args, message, options = {}) => { const result = run(command, args, options); if (result.status !== 0) fail(`${message}: ${result.stderr || result.stdout}`); return result; };
  log(`拉取 ${pin.repository} @ ${pin.commit.slice(0, 8)}`);
  step("git", ["init", "-q", source], "git init 失败");
  step("git", ["remote", "add", "origin", pin.repository], "git remote 失败", { cwd: source });
  step("git", ["-c", "protocol.version=2", "fetch", "-q", "--depth", "1", "origin", pin.commit], "拉取固定提交失败", { cwd: source });
  step("git", ["checkout", "-q", "--detach", "FETCH_HEAD"], "检出失败", { cwd: source });
  if (step("git", ["rev-parse", "HEAD"], "读取提交失败", { cwd: source }).stdout !== pin.commit) fail("检出的提交与固定提交不一致");
  const goMod = /^go (\d+\.\d+\.\d+)$/m.exec(fs.readFileSync(path.join(source, "go.mod"), "utf8"))?.[1];
  if (goMod !== pin.go_version) fail(`固定提交的 go.mod 要求 Go ${goMod}，与固定文件的 go_version ${pin.go_version} 不一致`);
  log("构建（tools/build-candidate.mjs）");
  step("node", [path.join(source, "tools/build-candidate.mjs"), "--root", source, "--out", out], "构建失败", { cwd: source, env: { ...process.env, CGO_ENABLED: "0" } });
  const binary = path.join(out, "yss"), actual = sha256(fs.readFileSync(binary));
  if (actual !== expected) { fs.rmSync(dir, { recursive: true, force: true }); fail(`构建出的 yss 与固定文件摘要不符：期望 ${expected}，实际 ${actual}（已清理缓存）`); }
  return { binary, source, sha256: actual, cached: false };
}

export function ensureNativeYss({ root, cacheRoot = defaultCacheRoot(), run = defaultRun, log = () => {}, platform = platformKey() } = {}) {
  const pin = readYssCliPin(root);
  if (!pin) fail("仓库没有 yss-cli 固定文件，无需构建固定版本");
  return { ...(lookupCache({ cacheRoot, pin, platform, run }) ?? buildPinned({ cacheRoot, pin, platform, run, log })), version: pin.version };
}

export function shellExports(result) {
  const quote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;
  return [`export YSS_NATIVE_BINARY=${quote(result.binary)}`, `export YSS_NATIVE_BINARY_SHA256=${quote(result.sha256)}`, `export YSS_NATIVE_SOURCE_ROOT=${quote(result.source)}`].join("\n");
}
