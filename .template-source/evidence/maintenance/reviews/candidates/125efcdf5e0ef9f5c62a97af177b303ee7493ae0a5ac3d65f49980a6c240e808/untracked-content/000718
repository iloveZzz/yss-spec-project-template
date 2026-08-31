import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { STRATEGIC_PROFILE_ID } from "./harness-profile.mjs";
import { ROOT } from "./lifecycle-registry.mjs";

export const DEFAULT_MANIFEST = path.join(ROOT, "docs/process/instance-distribution-manifest.yaml");
export const REQUIRED_FORBIDDEN_MARKERS = Object.freeze([
  ".template-source",
  ".github",
  "wiki",
  "docs/templates/openapi-spec-template.yaml",
  "docs/templates/vertical-slice-ticket-template.md",
  "docs/process/implementation-repo-integration.md",
  "scripts/verify-yss-router-scenarios",
]);
export const REQUIRED_RENDER_PATHS = Object.freeze([
  "AGENTS.md",
  "README.md",
  "yss-project.yaml",
]);
export const REQUIRED_ROOT_FILES = Object.freeze([
  "AGENTS.md",
  "CONTEXT.md",
  "README.md",
  "yss-project.yaml",
  "skills-lock.json",
]);

function fail(message) {
  throw new TypeError(message);
}

function parseYaml(filePath, label) {
  const document = parseDocument(readFileSync(filePath, "utf8"), {
    maxAliasCount: 0,
    uniqueKeys: true,
  });
  if (document.errors.length > 0) fail(`无法解析${label}: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label}必须是对象`);
  return value;
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`);
}

function requireStringArray(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(`${field} 必须是非空字符串数组`);
  }
  if (new Set(value).size !== value.length) fail(`${field} 不得重复`);
}

function matchesPrefix(relativePath, candidate) {
  return relativePath === candidate || relativePath.startsWith(`${candidate}/`);
}

function isAllowedException(relativePath, allowFiles) {
  return allowFiles.some(
    (allowed) =>
      allowed === relativePath ||
      allowed.startsWith(`${relativePath}/`) ||
      relativePath.startsWith(`${allowed}/`),
  );
}

export function loadInstanceDistributionManifest(filePath = DEFAULT_MANIFEST) {
  if (!existsSync(filePath)) fail(`缺少实例分发清单: ${filePath}`);
  return parseYaml(filePath, "实例分发清单");
}

export function shouldDistribute(relativePath, manifest) {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized === ".") return false;
  const segments = normalized.split("/");
  const allowFiles = manifest.allow_files || [];
  if (isAllowedException(normalized, allowFiles)) return true;

  const rootName = segments[0];
  if (segments.length === 1) {
    if ((manifest.exclude_root_files || []).includes(normalized)) return false;
    if ((manifest.init_exclude_root_files || []).includes(normalized)) return false;
    return (manifest.allow_root_files || []).includes(normalized);
  }

  if ((manifest.exclude_root_entries || []).includes(rootName)) return false;
  if ((manifest.init_exclude_root_entries || []).includes(rootName)) return false;
  if (!(manifest.allow_root_entries || []).includes(rootName)) return false;

  const excluded = [...(manifest.exclude_paths || []), ...(manifest.init_exclude_paths || [])].some(
    (excludedPath) =>
      matchesPrefix(normalized, excludedPath) && !isAllowedException(normalized, allowFiles),
  );
  return !excluded;
}

export function toCliManifest(manifest = loadInstanceDistributionManifest()) {
  return {
    profileId: manifest.profile_id,
    allowRootEntries: [...(manifest.allow_root_entries || [])],
    allowRootFiles: [...(manifest.allow_root_files || [])],
    allowFiles: [...(manifest.allow_files || [])],
    excludeRootEntries: [...(manifest.exclude_root_entries || [])],
    excludeRootFiles: [...(manifest.exclude_root_files || [])],
    excludePaths: [...(manifest.exclude_paths || [])],
    renderPaths: [...(manifest.render_paths || [])],
    initExcludeRootEntries: [...(manifest.init_exclude_root_entries || [])],
    initExcludeRootFiles: [...(manifest.init_exclude_root_files || [])],
    initExcludePaths: [...(manifest.init_exclude_paths || [])],
    instanceForbiddenPaths: [...(manifest.instance_forbidden_paths || [])],
  };
}

export function validateInstanceDistribution(
  {
    root = ROOT,
    mode,
    manifest = loadInstanceDistributionManifest(),
  } = {},
) {
  if (manifest.schema_version !== 1) fail("实例分发清单 schema_version 必须为 1");
  if (manifest.profile_id !== STRATEGIC_PROFILE_ID) {
    fail(`实例分发清单 profile_id 必须为 ${STRATEGIC_PROFILE_ID}`);
  }
  requireString(manifest.template_source, "template_source");
  if (manifest.template_source !== "github:iloveZzz/yss-harness-design-agent") {
    fail("template_source 必须指向 yss-harness-design-agent");
  }
  if (manifest.cli_package !== "create-yss-harness-design") {
    fail("cli_package 必须为 create-yss-harness-design");
  }
  requireStringArray(manifest.allow_root_entries, "allow_root_entries");
  requireStringArray(manifest.allow_root_files, "allow_root_files");
  requireStringArray(manifest.allow_files, "allow_files");
  requireStringArray(manifest.exclude_root_entries, "exclude_root_entries");
  requireStringArray(manifest.exclude_root_files, "exclude_root_files");
  requireStringArray(manifest.exclude_paths, "exclude_paths");
  requireStringArray(manifest.render_paths, "render_paths");
  requireStringArray(manifest.instance_forbidden_paths, "instance_forbidden_paths");

  for (const required of REQUIRED_ROOT_FILES) {
    if (!manifest.allow_root_files.includes(required)) fail(`allow_root_files 缺少 ${required}`);
  }
  for (const required of REQUIRED_RENDER_PATHS) {
    if (!manifest.render_paths.includes(required)) fail(`render_paths 缺少 ${required}`);
  }
  if (!manifest.allow_root_entries.includes("docs") || !manifest.allow_root_entries.includes("scripts")) {
    fail("allow_root_entries 必须包含 docs 与 scripts");
  }
  for (const marker of REQUIRED_FORBIDDEN_MARKERS) {
    const listed =
      manifest.instance_forbidden_paths.some((item) => matchesPrefix(marker, item) || matchesPrefix(item, marker)) ||
      manifest.exclude_root_entries.includes(marker) ||
      manifest.exclude_paths.some((item) => matchesPrefix(marker, item) || matchesPrefix(item, marker));
    if (!listed) fail(`实例禁止路径未登记: ${marker}`);
  }
  if (shouldDistribute("docs/templates/openapi-spec-template.yaml", manifest)) {
    fail("OpenAPI 模板不得进入实例分发面");
  }
  if (shouldDistribute("docs/templates/vertical-slice-ticket-template.md", manifest)) {
    fail("垂直切片 Ticket 模板不得进入实例分发面");
  }
  if (shouldDistribute(".template-source/README.md", manifest)) {
    fail("模板源治理区不得进入实例分发面");
  }
  if (!shouldDistribute("docs/process/harness-profile.yaml", manifest)) {
    fail("Harness profile 必须进入实例分发面");
  }
  if (!shouldDistribute("docs/templates/strategic-design-handoff-template.yaml", manifest)) {
    fail("Strategic Design Handoff 模板必须进入实例分发面");
  }

  if (mode === "project-instance") {
    for (const relativePath of manifest.instance_forbidden_paths) {
      if (existsSync(path.join(root, relativePath))) {
        fail(`project-instance 不得包含禁止分发路径: ${relativePath}`);
      }
    }
  }

  return {
    profile_id: manifest.profile_id,
    cli_package: manifest.cli_package,
    forbidden_count: manifest.instance_forbidden_paths.length,
  };
}
