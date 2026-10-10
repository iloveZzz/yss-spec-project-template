import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// 候选、发布与 qualified-gates 计划的后置检查：脚本里不得残留已退役的旧运行时。
// 这两项检查原先直接调用外部 ripgrep，缺该二进制的机器（托管 runner、干净 Linux）上必然失败。
// 这里用 Node 实现同样的语义，不再依赖任何外部二进制。
//
// 本文件位于被扫描的根里，所以不能把被禁止的词写成字面量，这里和调用方一样用拼接得到。
const WORD = ["ru", "by"].join("");
const CALL = new RegExp(`^#!.*${WORD}|\\b${WORD}\\b`);
const LEGACY_SUFFIX = [".r", "b"].join("");
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules"]);

function insideGitWorkTree(cwd) {
  const result = spawnSync("git", ["-C", cwd, "rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() === "true";
}

function walk(directory, cwd, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(absolute, cwd, files);
    } else if (entry.isFile()) {
      files.push(path.relative(cwd, absolute));
    }
  }
}

/** 与 ripgrep 一致：Git 工作树里只看已跟踪与未被忽略的文件；否则遍历目录。符号链接不跟随。 */
function listFiles(roots, cwd) {
  const targets = roots.length > 0 ? roots : ["."];
  if (insideGitWorkTree(cwd)) {
    const result = spawnSync("git", ["-C", cwd, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...targets], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`git ls-files 失败: ${result.stderr.trim()}`);
    return result.stdout.split("\0").filter(Boolean).filter((file) => fs.lstatSync(path.join(cwd, file), { throwIfNoEntry: false })?.isFile());
  }
  const files = [];
  for (const target of targets) {
    const absolute = path.resolve(cwd, target);
    const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
    if (stat?.isDirectory()) walk(absolute, cwd, files);
    else if (stat?.isFile()) files.push(path.relative(cwd, absolute));
  }
  return files;
}

function isBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0);
}

/**
 * kind=call：非 Markdown 文本里出现旧运行时的 shebang 或独立单词，返回 `文件:行号:内容`。
 * kind=path：存在旧运行时的源文件，返回文件路径。
 */
export function scanLegacyRuntime(kind, roots = [], cwd = process.cwd()) {
  if (kind !== "call" && kind !== "path") throw new TypeError("kind 必须是 call 或 path");
  const files = listFiles(roots, cwd).sort();
  if (kind === "path") return files.filter((file) => file.endsWith(LEGACY_SUFFIX));
  const matches = [];
  for (const file of files) {
    if (file.endsWith(".md")) continue;
    const bytes = fs.readFileSync(path.join(cwd, file));
    if (isBinary(bytes)) continue;
    bytes.toString("utf8").split(/\r?\n/).forEach((line, index) => {
      if (CALL.test(line)) matches.push(`${file}:${index + 1}:${line}`);
    });
  }
  return matches;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [kind, ...roots] = process.argv.slice(2);
    const found = scanLegacyRuntime(kind, roots);
    if (found.length > 0) process.stdout.write(`${found.join("\n")}\n`);
    process.exitCode = found.length > 0 ? 1 : 0;
  } catch (error) {
    process.stderr.write(`legacy-runtime-scan 错误: ${error.message}\n`);
    process.exitCode = 2;
  }
}
