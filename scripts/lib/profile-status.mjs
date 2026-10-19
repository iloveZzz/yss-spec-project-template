import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";

export const PROFILE_STATUS_FILE = ".template-source/process/profile-status.yaml";
export const STATUSES = ["kernel", "active"];
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENTRY_FIELDS = new Set(["status"]);

function fail(message) { throw new TypeError("PROFILE_STATUS: " + message); }

function profileDirectories(root) {
  const directory = path.join(root, "profiles");
  if (!existsSync(directory)) fail("缺少 profiles 目录");
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

export function loadProfileStatus({ root = ROOT } = {}) {
  const file = path.join(root, PROFILE_STATUS_FILE);
  if (!existsSync(file)) fail("缺少 " + PROFILE_STATUS_FILE);
  const document = parseDocument(readFileSync(file, "utf8"), { uniqueKeys: true });
  if (document.errors.length) fail(document.errors[0]?.message || "无法解析 " + PROFILE_STATUS_FILE);
  const data = document.toJS({ maxAliasCount: 0 });
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("状态文件必须是对象");
  if (data.schema_version !== 1) fail("schema_version 必须为 1");
  if (!data.profiles || typeof data.profiles !== "object" || Array.isArray(data.profiles)) fail("profiles 必须是对象");
  const required = ["spec", "backend"];
  for(const name of profileDirectories(root))if(name!=="backend")fail("未知 Profile 目录: "+name);
  const declared = Object.keys(data.profiles).sort();
  const missing = required.filter((name) => !declared.includes(name));
  const unknown = declared.filter((name) => !required.includes(name));
  if (missing.length) fail("缺少 Profile 条目: " + missing.join(", "));
  if (unknown.length) fail("未知 Profile 条目: " + unknown.join(", "));
  const profiles = {};
  for (const name of required) {
    const entry = data.profiles[name];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail(name + " 条目必须是对象");
    for (const key of Object.keys(entry)) if (!ENTRY_FIELDS.has(key)) fail(name + " 包含未知字段: " + key);
    if (!STATUSES.includes(entry.status)) fail(name + " 的 status 无效: " + entry.status);
    if (name === "spec" && entry.status !== "kernel") fail("spec 必须是 kernel");
    if (name !== "spec" && entry.status === "kernel") fail(name + " 不能是 kernel");
    profiles[name] = {};
    for (const key of ENTRY_FIELDS) if (entry[key] !== undefined) profiles[name][key] = entry[key];
  }
  return {
    schema_version: data.schema_version,
    profiles,
    kernel: required.filter((name) => profiles[name].status === "kernel"),
    active: required.filter((name) => profiles[name].status === "active"),
  };
}

export function profileStatusOf(status, name) {
  return status?.profiles?.[name]?.status ?? null;
}

export function activeProfileNames(status) {
  return [...status.active];
}
