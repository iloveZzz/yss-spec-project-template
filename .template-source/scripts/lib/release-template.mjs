import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

// 轻量模板发布（github-workflows.md「轻量模板发布」）：合入检查 + fast 报告 + 人工平台验收。
// 本库只做前置核对、证据与发行说明生成，以及（显式 execute）tag 与 GitHub Release；不构建、不装配、不验收任何平台。
export const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const fail = (message) => { throw new TypeError(message); };
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

export function parseVersion(version) {
  const match = VERSION_PATTERN.exec(version ?? "");
  if (!match) fail(`版本必须是不带 v 的 X.Y.Z: ${version}`);
  return match.slice(1).map(Number);
}

export function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  return 0;
}

// PATH 上的 gh 可能是本机跑不了的架构（例如没装 Rosetta 的 Apple Silicon 上的 x86_64 版，spawn 报 Bad CPU type）。
// 逐个候选试 --version，取第一个真能运行的；可用 YSS_GH_BIN 显式指定。
let resolvedGh;
export function resolveGh({ env = process.env, probe = (file) => spawnSync(file, ["--version"], { encoding: "utf8" }) } = {}) {
  if (env.YSS_GH_BIN) return env.YSS_GH_BIN;
  if (resolvedGh) return resolvedGh;
  const candidates = [...(env.PATH ?? "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "gh")), "/opt/homebrew/bin/gh", "/usr/local/bin/gh"];
  for (const file of [...new Set(candidates)]) {
    if (!fs.existsSync(file)) continue;
    const result = probe(file);
    if (!result.error && result.status === 0) { resolvedGh = file; return file; }
  }
  return "gh";
}

export function defaultRun(command, args, { cwd, env, timeoutMs } = {}) {
  const file = command === "gh" ? resolveGh({ env: env ?? process.env }) : command;
  const result = spawnSync(file, args, { cwd, env: env ?? process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...(timeoutMs ? { timeout: timeoutMs, killSignal: "SIGTERM" } : {}) });
  const timedOut = Boolean(timeoutMs) && (result.error?.code === "ETIMEDOUT" || result.signal === "SIGTERM");
  // 命令根本没能启动（架构不符、找不到等）时保留真实原因，不能留空消息。
  const spawnFailure = result.error && !timedOut ? `无法启动 ${file}: ${result.error.message}（错误码 ${result.error.errno ?? result.error.code}）` : "";
  return { status: result.status ?? 1, stdout: (result.stdout ?? "").trim(), stderr: [(result.stderr ?? "").trim(), spawnFailure].filter(Boolean).join("\n"), ...(timedOut ? { timedOut: true } : {}) };
}

/** 前置核对：全部通过才允许继续；返回将要发布的提交与上一个版本。 */
export function checkPreconditions({ root, version, base, run = defaultRun, fetch = true, resume = false }) {
  parseVersion(version);
  if (!/^[a-f0-9]{40}$/.test(base ?? "")) fail("base 必须是上一正式发行的完整 40 位 SHA");
  const git = (...args) => run("git", args, { cwd: root });
  const must = (args, message) => { const result = git(...args); if (result.status !== 0) fail(`${message}: ${result.stderr || result.stdout}`); return result.stdout; };
  const identity = path.join(root, "yss-project.yaml");
  if (!fs.existsSync(identity) || !/repository_mode:\s*template-source\s*$/m.test(fs.readFileSync(identity, "utf8"))) fail("只能在 template-source 仓库发布模板");
  if (must(["branch", "--show-current"], "无法读取当前分支") !== "main") fail("必须在 main 分支发布");
  if (must(["status", "--porcelain", "--untracked-files=normal"], "无法读取工作树状态") !== "") fail("工作树必须干净");
  if (fetch) must(["fetch", "--quiet", "--tags", "origin"], "无法同步 origin");
  const head = must(["rev-parse", "HEAD"], "无法读取 HEAD");
  const remote = must(["rev-parse", "origin/main"], "无法读取 origin/main");
  if (head !== remote) fail(`本地 main (${head.slice(0, 8)}) 与 origin/main (${remote.slice(0, 8)}) 不一致，先同步或推送`);
  if (git("merge-base", "--is-ancestor", base, head).status !== 0) fail("base 不是 HEAD 的祖先");
  const tag = `v${version}`;
  // resume：上次发布在 tag 之后失败（例如 Release 创建失败）时续做；已有 tag 必须指向本次发布提交，由 publish 再核对。
  if (!resume && must(["tag", "-l", tag], "无法读取 tag") !== "") fail(`tag ${tag} 已存在`);
  if (fetch) {
    const remoteTag = git("ls-remote", "--tags", "origin", `refs/tags/${tag}`);
    if (remoteTag.status !== 0) fail(`无法核对远端 tag: ${remoteTag.stderr}`);
    if (!resume && remoteTag.stdout) fail(`远端已存在 tag ${tag}`);
  }
  const tags = must(["tag", "-l", "v*"], "无法列出 tag").split("\n").filter((name) => VERSION_PATTERN.test(name.slice(1)) && !(resume && name === tag));
  const previous = tags.map((name) => name.slice(1)).sort(compareVersions).at(-1) ?? null;
  if (previous && compareVersions(version, previous) <= 0) fail(`版本 ${version} 必须大于已发行的最新版本 ${previous}`);
  return { commit: head, tag, previous };
}

/** 发行说明：维护者摘要在前；验证与未覆盖范围由证据生成，不接受自述。 */
export function buildNotes({ version, commit, base, summary, report }) {
  if (typeof summary !== "string" || !summary.trim()) fail("缺少维护者摘要");
  if (report?.status !== "passed") fail("fast 报告未通过，不能生成发行说明");
  const scope = report.scope?.kind ?? "unknown";
  return `${summary.trim()}

## 验证（如实）
- 发布提交 \`${commit.slice(0, 8)}\` 上执行 \`scripts/verify-template-fast --base ${base.slice(0, 8)}\`，结果 ${report.status}，范围 ${scope}，报告见 \`template-fast-verification-report.json\`。
- **未执行**：完整 \`scripts/verify-template\` release 档。
- **平台验收：人工，不在 CI 或发布门禁内。** 本发行不声称任何平台已验收。
`;
}

export function writeEvidence({ output, version, commit, base, summary, reportFile }) {
  if (!path.isAbsolute(output)) fail("output 必须是绝对路径");
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const notes = buildNotes({ version, commit, base, summary, report });
  fs.mkdirSync(path.join(output, "assets"), { recursive: true });
  const assets = path.join(output, "assets");
  const reportAsset = path.join(assets, "template-fast-verification-report.json");
  fs.copyFileSync(reportFile, reportAsset);
  fs.writeFileSync(path.join(assets, "SHA256SUMS"), `${sha256(fs.readFileSync(reportAsset))}  template-fast-verification-report.json\n`);
  const notesFile = path.join(output, "release-notes.md");
  fs.writeFileSync(notesFile, notes);
  return { notesFile, assets: [reportAsset, path.join(assets, "SHA256SUMS")] };
}

/** 对外动作：tag、推送、创建 Release、回读校验。只在显式 execute 时调用。 */
export function publish({ root, version, commit, notesFile, assets, run = defaultRun, repository }) {
  const tag = `v${version}`;
  const step = (command, args, message, options = {}) => { const result = run(command, args, { cwd: root, ...options }); if (result.status !== 0) fail(`${message}: ${result.stderr || result.stdout}`); return result; };
  const repoArgs = repository ? ["-R", repository] : [];
  // 每一步都可重试：已有的 tag / 远端 tag / Release 只在指向同一发布提交时复用，不重复创建、不移动。
  const localTag = run("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}^{commit}`], { cwd: root });
  if (localTag.status === 0) { if (localTag.stdout !== commit) fail(`本地 tag ${tag} 指向 ${localTag.stdout.slice(0, 8)}，不是发布提交 ${commit.slice(0, 8)}`); }
  else step("git", ["tag", "-a", tag, "-m", `模板 ${version}`, commit], "创建 tag 失败");
  const remoteTag = step("git", ["ls-remote", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`], "无法核对远端 tag");
  const remoteLines = remoteTag.stdout.split("\n").filter(Boolean).map((line) => line.split(/\s+/));
  if (remoteLines.length) {
    const peeled = remoteLines.find(([, ref]) => ref.endsWith("^{}")) ?? remoteLines[0];
    if (peeled[0] !== commit) fail(`远端 tag ${tag} 指向 ${peeled[0].slice(0, 8)}，不是发布提交 ${commit.slice(0, 8)}`);
  } else step("git", ["push", "origin", tag], "推送 tag 失败");
  const existing = run("gh", ["release", "view", tag, ...repoArgs], { cwd: root });
  if (existing.status !== 0) step("gh", ["release", "create", tag, "--verify-tag", "--title", `YSS 模板 v${version}`, "--notes-file", notesFile, ...assets, ...repoArgs], "创建 Release 失败");
  const download = fs.mkdtempSync(path.join(path.dirname(notesFile), "download-"));
  step("gh", ["release", "download", tag, "--dir", download, ...(repository ? ["-R", repository] : [])], "回读下载失败");
  const sums = fs.readFileSync(path.join(download, "SHA256SUMS"), "utf8").trim().split("\n");
  for (const line of sums) {
    const [digest, name] = line.split(/\s+/);
    if (sha256(fs.readFileSync(path.join(download, name))) !== digest) fail(`回读摘要不一致: ${name}`);
  }
  const tagCommit = step("git", ["rev-parse", `${tag}^{commit}`], "无法读取 tag 提交").stdout;
  if (tagCommit !== commit) fail("tag 指向的提交与发布提交不一致");
  return { tag, commit: tagCommit, verified_assets: sums.length };
}
