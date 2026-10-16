#!/usr/bin/env node
// 轻量模板发布入口，两步：
//   1) 准备：前置核对 + fast 验证 + 生成证据与发行说明（不改动远端）。
//   2) 发布：--publish-from <准备目录>，重新核对前置后打 tag、创建 Release 并回读校验。
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { parseArgs } from "node:util";
import { checkPreconditions, writeEvidence, publish, cliVersionOf, defaultRun } from "./lib/release-template.mjs";

const USAGE = `用法:
  准备: node .template-source/scripts/release-template.mjs --version X.Y.Z --base <上一正式发行完整SHA> --summary <维护者摘要文件> --output <仓库外新绝对目录>
  发布: node .template-source/scripts/release-template.mjs --version X.Y.Z --base <上一正式发行完整SHA> --publish-from <准备目录> [--repository owner/repo]`;
try {
  const { values } = parseArgs({ options: { version: { type: "string" }, base: { type: "string" }, summary: { type: "string" }, output: { type: "string" }, "publish-from": { type: "string" }, repository: { type: "string" }, "max-seconds": { type: "string", default: "200" } }, strict: true });
  if (!values.version || !values.base || !(values["publish-from"] || (values.summary && values.output))) throw new TypeError(USAGE);
  const root = path.resolve(import.meta.dirname, "../..");
  const outside = (dir) => path.relative(root, dir).startsWith("..");
  const maxSeconds = Number(values["max-seconds"]);
  if (!Number.isInteger(maxSeconds) || maxSeconds < 30) throw new TypeError("--max-seconds 必须是不小于 30 的整数");
  const plan = checkPreconditions({ root, version: values.version, base: values.base, resume: Boolean(values["publish-from"]) });
  process.stdout.write(`前置核对通过：${plan.tag}（上一版本 ${plan.previous ?? "无"}），提交 ${plan.commit.slice(0, 8)}\n`);
  if (values["publish-from"]) {
    const dir = path.resolve(values["publish-from"]);
    const saved = JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8"));
    if (saved.version !== values.version || saved.base !== values.base || saved.commit !== plan.commit) throw new TypeError("准备目录与当前版本、base 或 HEAD 不一致，请重新准备");
    const done = publish({ root, version: values.version, commit: plan.commit, notesFile: path.join(dir, "release-notes.md"), assets: saved.assets, repository: values.repository });
    process.stdout.write(`已发布 ${done.tag}（${done.commit.slice(0, 8)}），回读校验 ${done.verified_assets} 项通过。\n`);
  } else {
    const output = path.resolve(values.output);
    if (!outside(output)) throw new TypeError("output 必须在仓库外");
    if (fs.existsSync(output)) throw new TypeError("output 已存在，拒绝复用");
    fs.mkdirSync(output, { recursive: true });
    const reportDir = path.join(output, "verification");
    const startedAt = Date.now();
    const fast = defaultRun(path.join(root, "scripts/verify-template-fast"), ["--base", values.base, "--report-dir", reportDir, "--concurrency", String(Math.max(2, Math.min(6, Math.floor(os.cpus().length / 2))))], { cwd: root, timeoutMs: maxSeconds * 1000 });
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    fs.writeFileSync(path.join(output, "verify-template-fast.log"), `${fast.stdout}\n${fast.stderr}\n`);
    if (fast.timedOut) throw new TypeError(`准备超过 ${maxSeconds} 秒预算，已中止（用时 ${elapsedSeconds} 秒）；日志 ${path.join(output, "verify-template-fast.log")}。调大 --max-seconds 只能由维护者显式决定`);
    if (fast.status !== 0) throw new TypeError(`verify-template-fast 失败，日志 ${path.join(output, "verify-template-fast.log")}`);
    const evidence = writeEvidence({ output, version: values.version, commit: plan.commit, base: values.base, summary: fs.readFileSync(path.resolve(values.summary), "utf8"), reportFile: path.join(reportDir, "report.json"), cliVersion: cliVersionOf(root) });
    fs.writeFileSync(path.join(output, "plan.json"), JSON.stringify({ version: values.version, base: values.base, commit: plan.commit, assets: evidence.assets, prepare_seconds: elapsedSeconds, budget_seconds: maxSeconds }, null, 2) + "\n");
    process.stdout.write(`准备完成，用时 ${elapsedSeconds} 秒（预算 ${maxSeconds} 秒），未改动远端。发行说明：${evidence.notesFile}\n确认后发布：node .template-source/scripts/release-template.mjs --version ${values.version} --base ${values.base} --publish-from ${output}\n`);
  }
} catch (error) {
  process.stderr.write(`模板发布失败: ${error.message}\n`);
  process.exitCode = 1;
}
