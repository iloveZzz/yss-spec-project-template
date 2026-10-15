import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { readYssCliPin } from "./yss-cli-pin.mjs";

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

export function defaultRun(command, args, { cwd, env } = {}) {
  const result = spawnSync(command, args, { cwd, env: env ?? process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status ?? 1, stdout: (result.stdout ?? "").trim(), stderr: (result.stderr ?? "").trim() };
}

/** 前置核对：全部通过才允许继续；返回将要发布的提交与上一个版本。 */
export function checkPreconditions({ root, version, base, run = defaultRun, fetch = true }) {
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
  if (must(["tag", "-l", tag], "无法读取 tag") !== "") fail(`tag ${tag} 已存在`);
  if (fetch) {
    const remoteTag = git("ls-remote", "--tags", "origin", `refs/tags/${tag}`);
    if (remoteTag.status !== 0) fail(`无法核对远端 tag: ${remoteTag.stderr}`);
    if (remoteTag.stdout) fail(`远端已存在 tag ${tag}`);
  }
  const tags = must(["tag", "-l", "v*"], "无法列出 tag").split("\n").filter((name) => VERSION_PATTERN.test(name.slice(1)));
  const previous = tags.map((name) => name.slice(1)).sort(compareVersions).at(-1) ?? null;
  if (previous && compareVersions(version, previous) <= 0) fail(`版本 ${version} 必须大于已发行的最新版本 ${previous}`);
  return { commit: head, tag, previous };
}

/** 发行说明：维护者摘要在前；验证与未覆盖范围由证据生成，不接受自述。 */
export function buildNotes({ version, commit, base, summary, report, cliVersion }) {
  if (typeof summary !== "string" || !summary.trim()) fail("缺少维护者摘要");
  if (report?.status !== "passed") fail("fast 报告未通过，不能生成发行说明");
  const scope = report.scope?.kind ?? "unknown";
  return `${summary.trim()}

## 验证（如实）
- 发布提交 \`${commit.slice(0, 8)}\` 上执行 \`scripts/verify-template-fast --base ${base.slice(0, 8)}\`，结果 ${report.status}，范围 ${scope}，报告见 \`template-fast-verification-report.json\`。
- **未执行**：完整 \`scripts/verify-template\` release 档、CLI Bundle 与本模板提交的绑定。
- **平台验收：人工，不在 CI 或发布门禁内。** 本发行不声称任何平台已验收。
- 配套 CLI：${cliVersion ? `v${cliVersion}（固定文件 yss-cli-pin.json）` : "未登记"}；本发行不含新的 CLI 发行。
`;
}

export function writeEvidence({ output, version, commit, base, summary, reportFile, cliVersion }) {
  if (!path.isAbsolute(output)) fail("output 必须是绝对路径");
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const notes = buildNotes({ version, commit, base, summary, report, cliVersion });
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
  step("git", ["tag", "-a", tag, "-m", `模板 ${version}`, commit], "创建 tag 失败");
  step("git", ["push", "origin", tag], "推送 tag 失败");
  step("gh", ["release", "create", tag, "--verify-tag", "--title", `YSS 模板 v${version}`, "--notes-file", notesFile, ...assets, ...(repository ? ["-R", repository] : [])], "创建 Release 失败");
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

export function cliVersionOf(root) { return readYssCliPin(root)?.version ?? null; }
