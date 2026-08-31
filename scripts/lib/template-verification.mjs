import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PROFILE_FILE = path.join(ROOT, "docs/process/template-verification-profiles.yaml");

function fail(message) { throw new TypeError(message); }
function ensure(condition, message) { if (!condition) fail(message); }

function globRegex(pattern) {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

function matches(file, pattern) { return globRegex(pattern).test(file); }

export function loadVerificationProfiles(source = readFileSync(PROFILE_FILE, "utf8")) {
  const document = parseDocument(source, { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "核验 profile 无法解析");
  const config = document.toJS({ maxAliasCount: 0 });
  ensure(config?.schema_version === 1, "核验 profile schema_version 必须为 1");
  ensure(config.profiles?.fast && config.profiles?.candidate && config.profiles?.release, "必须声明 fast、candidate、release profile");
  ensure(config.groups && typeof config.groups === "object", "核验 profile 缺少 groups");
  for (const [name, group] of Object.entries(config.groups)) ensure(Array.isArray(group.commands), `检查组 ${name} 缺少 commands`);
  return config;
}

function matchedGroups(config, changedFiles) {
  const groups = new Set();
  const unknown = [];
  for (const file of changedFiles) {
    let routed = false;
    for (const rule of config.routing || []) {
      if ((rule.patterns || []).some((pattern) => matches(file, pattern))) {
        routed = true;
        for (const group of rule.groups || []) groups.add(group);
      }
    }
    if (!routed) unknown.push(file);
  }
  return { groups, unknown };
}

export function planTemplateVerification({ profile = "fast", changedFiles = [], config = loadVerificationProfiles() } = {}) {
  ensure(Object.hasOwn(config.profiles, profile), `未知核验 profile: ${profile}`);
  ensure(Array.isArray(changedFiles), "changedFiles 必须是数组");
  const normalized = [...new Set(changedFiles.map((file) => file.replaceAll("\\", "/")).filter(Boolean))].sort();
  const routed = matchedGroups(config, normalized);
  const coreChange = normalized.find((file) => (config.core_escalation_patterns || []).some((pattern) => matches(file, pattern)));
  let effectiveProfile = profile;
  let escalationReason = null;
  if (profile !== "release" && coreChange) {
    effectiveProfile = "release";
    escalationReason = `核心核验资产变化: ${coreChange}`;
  } else if (profile !== "release" && routed.unknown.length > 0) {
    effectiveProfile = "release";
    escalationReason = `存在未映射路径: ${routed.unknown.join(", ")}`;
  }
  const groups = new Set();
  if (config.profiles[effectiveProfile].all_groups) Object.keys(config.groups).forEach((group) => groups.add(group));
  else {
    (config.profiles[effectiveProfile].always_groups || []).forEach((group) => groups.add(group));
    routed.groups.forEach((group) => groups.add(group));
  }
  const orderedGroups = Object.keys(config.groups).filter((group) => groups.has(group));
  const commands = [];
  for (const group of orderedGroups) {
    for (const entry of config.groups[group].commands) {
      const command = typeof entry === "string" ? entry : entry.run;
      const when = typeof entry === "string" ? null : entry.when ?? null;
      ensure(typeof command === "string" && command, `检查组 ${group} 包含无效命令`);
      commands.push({ group, command, when });
    }
  }
  return { requested_profile: profile, effective_profile: effectiveProfile, escalation_reason: escalationReason, changed_files: normalized, unknown_files: routed.unknown, groups: orderedGroups, commands, required_files: config.required_files || [], syntax_files: config.syntax_files || [], max_concurrency: config.max_concurrency || 4 };
}

export function assertRequiredFiles(plan, root = ROOT) {
  const missing = plan.required_files.filter((file) => !existsSync(path.join(root, file)));
  ensure(missing.length === 0, `缺少模板必需文件: ${missing.join(", ")}`);
}
