import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OBSOLETE, PROJECTION_ROOTS } from "./skill-supply-chain.mjs";
import { parseDocument } from "../vendor/yaml.mjs";

export const POLICY_FILE = ".template-source/process/retired-skill-scan-policy.json";
export const POLICY_SOURCE = "scripts/lib/skill-supply-chain.mjs#OBSOLETE";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODES = ["exact", "contextual", "not-text-scanned"];

function fail(message) { throw new TypeError("SKILL_RETIREMENT: " + message); }

function readJson(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch (error) { fail(file + ": " + error.message); }
}

function readYaml(file) {
  const document = parseDocument(readFileSync(file, "utf8"), { uniqueKeys: true });
  if (document.errors.length) fail(file + ": " + (document.errors[0]?.message || "无法解析"));
  return document.toJS({ maxAliasCount: 0 });
}

function escapeId(id) { return id.replace(/[.*+?^()|[\]\\]/g, "\\$&"); }

function contextualPattern(id) {
  const escaped = escapeId(id);
  const token = "\x60" + escaped + "\x60";
  const slash = "(?<![\\w<])\\/" + escaped + "(?:\\/|\\s|$)";
  const list = "(?:^|[\\s,\\[])[\"']?" + escaped + "[\"']?\\s*(?=[,\\]])";
  const key = "\\b(?:id|name|skill)\\s*:\\s*[\"']?" + escaped + "[\"']?\\b";
  return [token, slash, list, key].join("|");
}

export function loadRetiredScanPolicy({ root = ROOT } = {}) {
  const file = path.join(root, POLICY_FILE);
  if (!existsSync(file)) fail("缺少 " + POLICY_FILE);
  const policy = readJson(file);
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) fail("策略必须是对象");
  if (policy.schema_version !== 1) fail("schema_version 必须为 1");
  if (policy.source !== POLICY_SOURCE) fail("source 必须为 " + POLICY_SOURCE);
  if (policy.default_mode !== "exact") fail("default_mode 必须为 exact");
  const obsolete = new Set(OBSOLETE);
  const modes = new Map([...obsolete].map((id) => [id, "exact"]));
  const seen = new Set();
  for (const mode of MODES) {
    if (mode === "exact") continue;
    const key = mode === "not-text-scanned" ? "not_text_scanned" : mode;
    const entries = policy[key];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) fail(mode + " 必须是数组");
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail(mode + " 条目必须是对象");
      if (!obsolete.has(entry.id)) fail(mode + " 包含未知退役 ID: " + entry.id);
      if (seen.has(entry.id)) fail("退役 ID 重复分类: " + entry.id);
      if (typeof entry.reason !== "string" || !entry.reason.trim()) fail(mode + " 条目必须写 reason: " + entry.id);
      seen.add(entry.id);
      modes.set(entry.id, mode);
    }
  }
  for (const id of obsolete) if (!modes.has(id)) fail("退役 ID 未分类: " + id);
  const exactIds = [...obsolete].filter((id) => modes.get(id) === "exact").sort();
  const contextualIds = [...obsolete].filter((id) => modes.get(id) === "contextual").sort();
  const notScannedIds = [...obsolete].filter((id) => modes.get(id) === "not-text-scanned").sort();
  if (!Array.isArray(policy.allow)) fail("allow 必须是数组");
  for (const entry of policy.allow) {
    if (!entry || typeof entry !== "object" || (!entry.path && !entry.prefix) || typeof entry.reason !== "string" || !entry.reason.trim()) fail("allow 条目必须提供 path/prefix 与 reason");
    if (entry.path && entry.prefix) fail("allow 条目不能同时提供 path 与 prefix");
  }
  return { ...policy, exactIds, contextualIds, notScannedIds, modes };
}

export function retiredSkillIds() {
  return [...OBSOLETE];
}

function allowedReference(policy, relative) {
  for (const entry of policy.allow) {
    if (entry.path && relative === entry.path) return true;
    if (entry.prefix && relative.startsWith(entry.prefix)) return true;
  }
  return false;
}

function registryNames(file) {
  if (!existsSync(file)) return [];
  const data = readYaml(file);
  return Array.isArray(data?.skills) ? data.skills.map((entry) => entry?.directory ?? entry?.name ?? entry?.id).filter(Boolean) : [];
}

function lockNames(file) {
  if (!existsSync(file)) return [];
  const data = readJson(file);
  return [...Object.keys(data?.skills?.shared ?? {}), ...Object.values(data?.skills?.platform ?? {}).flatMap((group) => Object.keys(group ?? {}))];
}

function hardViolations(root) {
  const found = [];
  const obsolete = new Set(OBSOLETE);
  for (const base of [".agents/skills", ...PROJECTION_ROOTS]) {
    for (const name of obsolete) if (existsSync(path.join(root, base, name))) found.push("physical:" + base + "/" + name);
  }
  for (const name of registryNames(path.join(root, ".template-spec/agents/yss-skill-registry.yaml"))) {
    if (obsolete.has(name)) found.push("registry:" + name);
  }
  for (const name of lockNames(path.join(root, "skills-lock.json"))) if (obsolete.has(name)) found.push("lock:" + name);
  const publicFile = path.join(root, "yss-public-skills.json");
  if (existsSync(publicFile)) for (const name of readJson(publicFile).skills ?? []) if (obsolete.has(name)) found.push("public:" + name);
  const statusFile = path.join(root, ".template-source/process/profile-status.yaml");
  if (existsSync(statusFile)) {
    const status = readYaml(statusFile);
    for (const [name, entry] of Object.entries(status?.profiles ?? {})) {
      if (entry?.status !== "active") continue;
      const base = "profiles/" + name;
      for (const skill of obsolete) if (existsSync(path.join(root, base, ".agents/skills", skill))) found.push("physical:" + base + "/.agents/skills/" + skill);
      for (const skill of registryNames(path.join(root, base, ".template-spec/agents/yss-skill-registry.yaml"))) if (obsolete.has(skill)) found.push("registry:" + base + ":" + skill);
      for (const skill of lockNames(path.join(root, base, "skills-lock.json"))) if (obsolete.has(skill)) found.push("lock:" + base + ":" + skill);
    }
  }
  return [...new Set(found)];
}

function gitFiles(root) {
  const result = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ".", ":(exclude).codegraph/**", ":(exclude)submodules/**"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) fail(result.stderr || "无法读取 Git 文件清单");
  return result.stdout.split("\0").filter(Boolean).filter((relative) => !relative.startsWith(".git/") && !relative.startsWith(".codegraph/") && !relative.startsWith("submodules/"));
}

export function scanRetiredSkillIds({ root = ROOT } = {}) {
  const policy = loadRetiredScanPolicy({ root });
  const exact = new RegExp("(?<![a-z0-9-])(?:" + policy.exactIds.map(escapeId).join("|") + ")(?![a-z0-9-])", "u");
  const contextual = policy.contextualIds.length ? new RegExp("(?:" + policy.contextualIds.map(contextualPattern).join("|") + ")", "u") : null;
  const hard = hardViolations(root);
  const violations = [];
  const allowedReferences = [];
  for (const relative of gitFiles(root)) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) continue;
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const bytes = readFileSync(absolute);
    if (bytes.includes(0)) continue;
    bytes.toString("utf8").split(/\r?\n/).forEach((line, index) => {
      const hit = exact.test(line) || (contextual && contextual.test(line));
      if (!hit) return;
      const entry = "./" + relative + ":" + (index + 1) + ":" + line;
      if (allowedReference(policy, relative)) allowedReferences.push(entry);
      else violations.push(entry);
    });
  }
  return { policy, hard, violations, allowedReferences, retiredIds: [...OBSOLETE] };
}
