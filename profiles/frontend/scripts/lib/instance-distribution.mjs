import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./lifecycle-registry.mjs";
import { INSTANTIATION } from "./harness-profile.mjs";
import { isTemplateSource } from "./repository-mode.mjs";

export const DISTRIBUTION_MANIFEST = path.join(ROOT, INSTANTIATION.distribution_manifest);
export const HARNESS_CONTRACT = path.join(
  ROOT,
  ".template-source/contracts/create-yss-harness-dev-repository-mode-contract.md",
);
export const LEGACY_SPEC_CONTRACT = path.join(
  ROOT,
  ".template-source/contracts/create-yss-spec-repository-mode-contract.md",
);

const REQUIRED_ALLOW_ROOT_ENTRIES = [
  ".agents",
  ".codex",
  ".cursor",
  ".pi",
  ".template-spec",
  "scripts",
];
const REQUIRED_ALLOW_ROOT_FILES = [
  ".cursorrules",
  ".gitignore",
  ".nvmrc",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "README.md",
  "skills-lock.json",
  "yss-project.yaml",
  "yss-public-skills.json",
];
const REQUIRED_ALLOW_FILES = [".template-spec/adr/README.md"];
const REQUIRED_EXCLUDE_ROOT_ENTRIES = [
  ".git",
  ".codegraph",
  ".template-source",
  ".github",
  "wiki",
];
const REQUIRED_EXCLUDE_ROOT_FILES = [
  "package.json",
  "package-lock.json",
  ".gitmodules",
  "template.manifest.json",
  "template.snapshot.json",
];
const REQUIRED_EXCLUDE_PATHS = [
  ".cursor/environment.json",
  "docs/.scratch",
  "docs/reviews",
  "docs/adr",
  "scripts/instantiate-harness",
];
const REQUIRED_RENDER_PATHS = ["README.md", "yss-project.yaml"];

function fail(message) {
  throw new TypeError(message);
}

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") fail(`缺少实例化入口文件: ${relativePath}`);
    throw error;
  }
}

function requireStringArray(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) {
    fail(`${field} 必须是非空字符串数组`);
  }
}

function requireIncludes(actual, required, field) {
  requireStringArray(actual, field);
  for (const item of required) {
    if (!actual.includes(item)) fail(`${field} 缺少 ${item}`);
  }
}

export function loadDistributionManifest(filePath = DISTRIBUTION_MANIFEST) {
  if (!existsSync(filePath)) fail(`缺少分发清单: ${path.relative(ROOT, filePath)}`);
  let value;
  try {
    value = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`无法解析分发清单: ${error.message}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("分发清单必须是 JSON 对象");
  return value;
}

export function validateDistributionManifest(manifest = loadDistributionManifest()) {
  requireIncludes(manifest.allowRootEntries, REQUIRED_ALLOW_ROOT_ENTRIES, "allowRootEntries");
  requireIncludes(manifest.allowRootFiles, REQUIRED_ALLOW_ROOT_FILES, "allowRootFiles");
  requireIncludes(manifest.allowFiles, REQUIRED_ALLOW_FILES, "allowFiles");
  requireIncludes(manifest.excludeRootEntries, REQUIRED_EXCLUDE_ROOT_ENTRIES, "excludeRootEntries");
  requireIncludes(manifest.excludeRootFiles, REQUIRED_EXCLUDE_ROOT_FILES, "excludeRootFiles");
  requireIncludes(manifest.excludePaths, REQUIRED_EXCLUDE_PATHS, "excludePaths");
  requireIncludes(manifest.renderPaths, REQUIRED_RENDER_PATHS, "renderPaths");
  requireStringArray(manifest.exampleDocPaths || [], "exampleDocPaths");
  requireStringArray(manifest.initExcludeRootEntries || [], "initExcludeRootEntries");
  requireStringArray(manifest.initExcludeRootFiles || [], "initExcludeRootFiles");
  requireStringArray(manifest.initExcludePaths || [], "initExcludePaths");
  if (!(manifest.initExcludeRootFiles || []).includes("yss-public-skills.json")) {
    fail("initExcludeRootFiles 必须排除 yss-public-skills.json");
  }
  if ((manifest.allowRootEntries || []).includes(".template-source")) {
    fail("allowRootEntries 不得包含 .template-source");
  }
  if ((manifest.allowRootFiles || []).includes("package.json")) {
    fail("allowRootFiles 不得包含根 package.json");
  }
  return {
    allowRootEntries: [...manifest.allowRootEntries],
    excludeRootEntries: [...manifest.excludeRootEntries],
    renderPaths: [...manifest.renderPaths],
  };
}

export function validateInstantiationPointers(documents = {}) {
  const agents=documents.agents??read("AGENTS.md");
  const readme=documents.readme??read("README.md");
  const guide=documents.guide??read(".template-spec/user-guide/CLI使用说明.md");
  const command=`${INSTANTIATION.cli_package} init --profile ${INSTANTIATION.native_profile} --root`;
  if(!agents.includes(command)||!agents.includes(INSTANTIATION.metadata_file))fail("AGENTS.md 必须声明本家族原生初始化入口与 metadata");
  if(isTemplateSource(ROOT)&&!readme.includes(command))fail("README.md 必须提供本家族原生 CLI 初始化命令");
  if(!guide.includes(INSTANTIATION.metadata_file))fail("初始化指南必须绑定本端 metadata");
  if(!guide.includes(command))fail("初始化指南必须绑定本家族 profile 原生初始化入口");
  if([readme,guide].some(text=>/npm create yss-harness-dev/.test(text)))fail("专职入口不得路由通用 CLI");
  if(isTemplateSource(ROOT)&&existsSync(path.join(ROOT,"scripts/instantiate-harness")))fail("旧入口已退役，模板源不得保留 initializer 壳");
  return {cli_package:INSTANTIATION.cli_package,metadata_file:INSTANTIATION.metadata_file};
}

export function validateInstanceDistribution({
  checkManifest = isTemplateSource(ROOT),
} = {}) {
  const pointers = validateInstantiationPointers();
  if (!checkManifest) return { ...pointers, manifest: null };
  const manifest = validateDistributionManifest();
  return { ...pointers, manifest };
}
