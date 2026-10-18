import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HYGIENE_ALLOW_FILE = ".template-source/process/distribution-hygiene-allow.json";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HOST_PATH = /(?:\/(?:Users|home|private)\/|(?:^|[\s"'(\[])[A-Za-z]:\\)/;
const SCOPE = [".agents/skills/", ".template-spec/"];
const ALWAYS_EXCLUDED = [".template-spec/engineering/evidence/"];

function fail(message) { throw new TypeError("DISTRIBUTION_HYGIENE: " + message); }

function readJson(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch (error) { fail(file + ": " + error.message); }
}

export function loadHygieneConfig({ root = ROOT } = {}) {
  const file = path.join(root, HYGIENE_ALLOW_FILE);
  if (!existsSync(file)) fail("缺少 " + HYGIENE_ALLOW_FILE);
  const config = readJson(file);
  if (!config || config.schema_version !== 1) fail("配置 schema_version 必须为 1");
  for (const key of ["allow", "exclude"]) {
    if (!Array.isArray(config[key])) fail(key + " 必须是数组");
    for (const entry of config[key]) {
      if (!entry || (!entry.path && !entry.prefix) || (entry.path && entry.prefix) || typeof entry.reason !== "string" || !entry.reason.trim()) fail(key + " 条目必须提供 path 或 prefix 与 reason");
    }
  }
  return config;
}

function gitFiles(root) {
  const result = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) fail(result.stderr || "无法读取 Git 文件清单");
  return result.stdout.split("\0").filter(Boolean);
}

function inScope(relative) {
  if (!SCOPE.some((prefix) => relative.startsWith(prefix))) return false;
  return !ALWAYS_EXCLUDED.some((prefix) => relative.startsWith(prefix));
}

function matches(entry, relative) {
  if (entry.path) return relative === entry.path;
  return relative.startsWith(entry.prefix);
}

export function scanDistributionHygiene({ root = ROOT } = {}) {
  const config = loadHygieneConfig({ root });
  const files = gitFiles(root).filter(inScope);
  const violations = [];
  const allowedReferences = [];
  for (const relative of files) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) continue;
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const bytes = readFileSync(absolute);
    if (bytes.includes(0)) continue;
    bytes.toString("utf8").split(/\r?\n/).forEach((line, index) => {
      if (!HOST_PATH.test(line)) return;
      const entry = "./" + relative + ":" + (index + 1) + ":" + line;
      if ([...config.allow, ...config.exclude].some((item) => matches(item, relative))) allowedReferences.push(entry);
      else violations.push(entry);
    });
  }
  const staleAllow = config.allow.filter((entry) => !files.some((relative) => matches(entry, relative))).map((entry) => entry.path ?? entry.prefix);
  return { config, files: files.length, violations, allowedReferences, staleAllow };
}
