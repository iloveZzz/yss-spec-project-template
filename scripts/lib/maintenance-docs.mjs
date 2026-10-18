import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";
import { resolveMaintenanceReference } from "./maintenance-storage.mjs";

export const MAINTENANCE_DOCS_CONFIG = ".template-source/process/maintenance-docs.json";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) { throw new TypeError("MAINTENANCE_DOCS: " + message); }
function readJson(file) { try { return JSON.parse(readFileSync(file, "utf8")); } catch (error) { fail(file + ": " + error.message); } }

export function loadMaintenanceDocsConfig({ root = ROOT } = {}) {
  const file = path.join(root, MAINTENANCE_DOCS_CONFIG);
  if (!existsSync(file)) fail("缺少 " + MAINTENANCE_DOCS_CONFIG);
  const config = readJson(file);
  if (!config || config.schema_version !== 1) fail("schema_version 必须为 1");
  for (const key of ["directories", "statuses", "doc_types", "transition_fields"]) {
    if (!Array.isArray(config[key]) || !config[key].length || config[key].some((value) => typeof value !== "string" || !value)) fail(key + " 必须是非空字符串数组");
  }
  if (!config.contracts?.directory || !config.contracts?.index) fail("contracts.directory 与 contracts.index 必填");
  return config;
}

function git(root, args) {
  return spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function frontmatter(file) {
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(readFileSync(file, "utf8"));
  if (!match) return null;
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) return { error: document.errors[0]?.message || "frontmatter 无法解析" };
  return document.toJS({ maxAliasCount: 0 }) ?? {};
}

function resolveTransitionTarget(root, reference) {
  if (typeof reference !== "string" || !reference.trim() || reference.includes("\0") || reference.includes("\\")) return false;
  if (reference.startsWith("maintenance:")) {
    try { resolveMaintenanceReference(reference, { root, directory: false }); return true; } catch { return false; }
  }
  const absolute = path.resolve(root, reference);
  if (!absolute.startsWith(root + path.sep)) return false;
  return existsSync(absolute);
}

export function checkMaintenanceDocs({ root = ROOT } = {}) {
  const config = loadMaintenanceDocsConfig({ root });
  const findings = [];
  for (const directory of config.directories) {
    const absolute = path.join(root, directory);
    if (!existsSync(absolute)) continue;
    const files = readdirSync(absolute).filter((name) => name.endsWith(".md")).sort();
    for (const name of files) {
      const relative = path.posix.join(directory, name);
      const metadata = frontmatter(path.join(root, relative));
      const add = (rule, detail) => findings.push({ file: relative, rule, detail });
      if (!metadata) { add("missing-frontmatter", "维护文档必须写 frontmatter"); continue; }
      if (metadata.error) { add("invalid-frontmatter", metadata.error); continue; }
      for (const key of ["doc_type", "status", "baseline_commit", "created_at"]) if (typeof metadata[key] !== "string" || !metadata[key].trim()) add("missing-field", "缺少 " + key);
      if (metadata.doc_type && !config.doc_types.includes(metadata.doc_type)) add("invalid-doc-type", "未知 doc_type: " + metadata.doc_type);
      if (metadata.status && !config.statuses.includes(metadata.status)) add("invalid-status", "未知 status: " + metadata.status);
      if (metadata.baseline_commit) {
        if (!/^[0-9a-f]{40}$/.test(metadata.baseline_commit)) add("invalid-baseline", "baseline_commit 必须是完整 40 位 SHA");
        else {
          const exists = git(root, ["cat-file", "-e", metadata.baseline_commit + "^{commit}"]);
          if (exists.status !== 0) add("invalid-baseline", "baseline_commit 不存在: " + metadata.baseline_commit);
          else {
            const ancestor = git(root, ["merge-base", "--is-ancestor", metadata.baseline_commit, "HEAD"]);
            if (ancestor.status !== 0) add("invalid-baseline", "baseline_commit 不是 HEAD 的祖先: " + metadata.baseline_commit);
          }
        }
      }
      if (["completed", "superseded"].includes(metadata.status)) {
        const target = config.transition_fields.map((field) => metadata[field]).find((value) => typeof value === "string" && value.trim());
        if (!target) add("missing-transition", metadata.status + " 文档必须记录 moved_to 或 superseded_by");
        else if (!resolveTransitionTarget(root, target)) add("invalid-transition", "迁移目标不存在: " + target);
      }
    }
  }
  const contractsDirectory = path.join(root, config.contracts.directory);
  const contractsIndex = path.join(root, config.contracts.index);
  if (!existsSync(contractsIndex)) findings.push({ file: config.contracts.index, rule: "missing-index", detail: "缺少 contracts 索引" });
  else {
    const indexText = readFileSync(contractsIndex, "utf8");
    if (existsSync(contractsDirectory)) {
      for (const name of readdirSync(contractsDirectory).filter((entry) => entry.endsWith(".md") && entry !== "README.md").sort()) {
        if (!indexText.includes(name)) findings.push({ file: config.contracts.index, rule: "missing-contract", detail: "索引缺少 " + name });
      }
    }
  }
  return findings;
}
