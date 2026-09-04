import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MODULES = ["server", "core", "client", "repository", "adapter", "feign-client"];
export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const HARNESS_ROOT = findHarnessRoot();
export const SHARED_SKILLS_ROOT = path.join(HARNESS_ROOT, ".agents", "skills");
export const SKILL_UTILS_NAME = "skillUtils";
export const SKILL_UTILS_DIRECTORIES = [
  ".agents/skills", ".claude/skills", ".codex/skills", ".cursor/skills",
  ".hermes/skills", ".pi/skills", ".qoder/skills", ".trae/skills"
];
export const PROJECT_SCRIPT_FILES = [
  "check-agent-environment.mjs", "implementation-path-policy", "repository-mode", "repository-scope-policy",
  "generate-lifecycle-artifacts", "node-generate-lifecycle-artifacts.mjs", "node-verify-lifecycle-registry.mjs",
  "verify-lifecycle-registry", "verify-lifecycle-checkpoint", "verify-frontend-implementation-evidence",
  "verify-yss-dto-openapi-profile"
];

export function findHarnessRoot() {
  let candidate = SKILL_ROOT;
  while (true) {
    if (existsSync(path.join(candidate, ".agents", "skills")) && existsSync(path.join(candidate, "AGENTS.md"))) return candidate;
    const parent = path.dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }
  throw new Error(`未找到插件 Harness 根目录: ${SKILL_ROOT}`);
}

export function fail(message) { throw new Error(message); }

export function parseArgs(argv) {
  const options = { database: "oracle", withMock: false, dryRun: false };
  const fields = {
    "--project-name": "projectName", "--base-package": "basePackage", "--target-dir": "targetDir",
    "--database": "database", "--maven-settings": "mavenSettings"
  };
  for (let index = 0; index < argv.length; index += 1) {
    let token = argv[index];
    if (token === "--with-mock") { options.withMock = true; continue; }
    if (token === "--dry-run") { options.dryRun = true; continue; }
    if (token === "--help" || token === "-h") { options.help = true; continue; }
    const equals = token.indexOf("=");
    let value = equals >= 0 ? token.slice(equals + 1) : undefined;
    if (equals >= 0) token = token.slice(0, equals);
    if (!fields[token]) fail(`不支持的参数: ${token}`);
    if (value === undefined) value = argv[++index];
    if (!value || value.startsWith("--")) fail(`参数 ${token} 缺少值`);
    options[fields[token]] = value;
  }
  if (options.help) return options;
  if (!options.projectName || !/^[a-z][a-z0-9-]*$/.test(options.projectName)) fail("--project-name 必须是小写连字符名称");
  if (!options.basePackage || !/^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)+$/.test(options.basePackage)) fail("--base-package 不是合法 Java 包名");
  if (!options.targetDir) fail("必须提供 --target-dir");
  if (!["oracle", "oceanbase-oracle"].includes(options.database)) fail("--database 只支持 oracle 或 oceanbase-oracle");
  options.targetDir = path.resolve(options.targetDir);
  if (options.mavenSettings) options.mavenSettings = path.resolve(options.mavenSettings);
  return options;
}

export async function exists(target) {
  try { await stat(target); return true; } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export function xml(value) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
export function packagePath(name) { return name.replaceAll(".", "/"); }
export function generatedAtLocal() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function runGit(args, cwd) { return spawnSync("git", args, { cwd, encoding: "utf8" }); }
export function assertGitAvailable() {
  const result = runGit(["--version"], process.cwd());
  if (result.status !== 0) fail("未检测到可用的 Git，无法初始化独立项目仓库");
}
export function resolveGitAuthor() {
  const result = runGit(["config", "--get", "user.name"], process.cwd());
  const author = result.status === 0 ? result.stdout.trim() : "";
  if (!author) fail("未配置 Git user.name；请先执行 git config --global user.name \"你的姓名\"");
  if (/[\r\n]|\*\//.test(author)) fail("Git user.name 包含不能安全写入 Javadoc 的字符");
  return author;
}
export function initializeGit(root) {
  let result = runGit(["init", "--initial-branch=main"], root);
  if (result.status !== 0) {
    result = runGit(["init"], root);
    if (result.status === 0) result = runGit(["branch", "-M", "main"], root);
  }
  if (result.status !== 0) fail(`Git 仓库初始化失败: ${(result.stderr || result.stdout).trim()}`);
}

export async function resolveMavenSettings(options) {
  if (options.mavenSettings) {
    if (!await exists(options.mavenSettings)) fail(`Maven settings 不存在: ${options.mavenSettings}`);
    return { path: options.mavenSettings, source: "explicit", available: true };
  }
  if (process.env.YSS_MAVEN_SETTINGS) {
    const environmentPath = path.resolve(process.env.YSS_MAVEN_SETTINGS);
    if (!await exists(environmentPath)) fail(`Maven settings 不存在: ${environmentPath}`);
    return { path: environmentPath, source: "environment", available: true };
  }
  const userSettings = path.join(os.homedir(), ".m2", "settings.xml");
  if (await exists(userSettings)) return { path: userSettings, source: "user-home", available: true };
  return { path: null, source: "maven-default", available: false };
}
