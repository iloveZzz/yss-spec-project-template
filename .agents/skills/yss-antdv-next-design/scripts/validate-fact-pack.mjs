#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[a-f0-9]{64}$/;
const P0_COMPONENTS = ["Button", "DatePicker", "Form", "Modal", "Select", "Table"];

function fail(message) {
  throw new TypeError(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`);
}

function requireExactVersion(value, field) {
  if (typeof value !== "string" || !EXACT_SEMVER.test(value)) fail(`${field} 必须是精确 semver`);
}

function resolveContainedFile(root, ref, field) {
  requireString(ref, field);
  if (path.isAbsolute(ref)) fail(`${field} 必须是相对路径`);
  const target = path.resolve(root, ref);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail(`${field} 路径越界`);
  if (!existsSync(target) || !lstatSync(target).isFile() || lstatSync(target).isSymbolicLink()) fail(`${field} 必须引用普通文件`);
  const realRelative = path.relative(realpathSync(root), realpathSync(target));
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) fail(`${field} symlink 越界`);
  return target;
}

function verifyArtifact(packRoot, artifact, field) {
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) fail(`${field} 必须是对象`);
  const target = resolveContainedFile(packRoot, artifact.ref, `${field}.ref`);
  if (!SHA256.test(artifact.sha256 ?? "")) fail(`${field}.sha256 非法`);
  const buffer = readFileSync(target);
  if (sha256(buffer) !== artifact.sha256) fail(`${field} digest 不匹配`);
  let value;
  try {
    value = JSON.parse(buffer.toString("utf8"));
  } catch {
    fail(`${field} 不是有效 JSON`);
  }
  return value;
}

function findProjectRoot(start) {
  let current = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(current, "yss-project.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) fail("无法定位包含 yss-project.yaml 的项目根");
    current = parent;
  }
}

function verifyProjectArtifact(projectRoot, item, field) {
  if (!item || typeof item !== "object" || Array.isArray(item)) fail(`${field} 必须是对象`);
  const target = resolveContainedFile(projectRoot, item.ref, `${field}.ref`);
  if (!SHA256.test(item.sha256 ?? "") || sha256(readFileSync(target)) !== item.sha256) fail(`${field} digest 不匹配`);
}

export function validateFactPack(manifestPath) {
  const absoluteManifest = path.resolve(manifestPath);
  if (!existsSync(absoluteManifest) || !lstatSync(absoluteManifest).isFile()) fail(`manifest 不存在: ${manifestPath}`);
  const packRoot = path.dirname(absoluteManifest);
  const projectRoot = findProjectRoot(packRoot);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(absoluteManifest, "utf8"));
  } catch {
    fail("manifest 不是有效 JSON");
  }
  if (manifest.schema_version !== 1) fail("schema_version 必须为 1");
  if (manifest.provider_id !== "vue-antdv-next") fail("provider_id 必须为 vue-antdv-next");
  if (!["supported", "draft"].includes(manifest.maturity)) fail("maturity 必须为 supported；历史 P0 draft 只读兼容");
  if (!["selected-components", "p0-reference"].includes(manifest.collection_profile)) fail("collection_profile 无效");

  const library = manifest.library;
  if (!library || library.package !== "antdv-next") fail("library.package 必须为 antdv-next");
  requireExactVersion(library.requested_version, "library.requested_version");
  requireExactVersion(library.resolved_snapshot_version, "library.resolved_snapshot_version");
  if (library.requested_version !== library.resolved_snapshot_version) fail("library resolved snapshot 与 requested version 不一致");
  requireString(library.integrity, "library.integrity");
  requireString(library.tarball, "library.tarball");

  const cli = manifest.cli;
  if (!cli || cli.package !== "@antdv-next/cli") fail("cli.package 必须为 @antdv-next/cli");
  requireExactVersion(cli.version, "cli.version");
  requireString(cli.integrity, "cli.integrity");
  requireString(cli.tarball, "cli.tarball");
  const helpPath = resolveContainedFile(packRoot, cli.help_ref, "cli.help_ref");
  if (!SHA256.test(cli.help_sha256 ?? "") || sha256(readFileSync(helpPath)) !== cli.help_sha256) fail("cli help digest 不匹配");
  if (!readFileSync(helpPath, "utf8").includes(`@antdv-next/cli v${cli.version}`)) fail("CLI help banner 与 cli.version 不一致");

  const probe = manifest.resolution_probe;
  if (!probe || probe.exact_match !== true) fail("resolution_probe.exact_match 必须为 true");
  const probeValue = verifyArtifact(packRoot, probe.output, "resolution_probe.output");
  if (probeValue.from !== library.requested_version || probeValue.to !== library.requested_version) fail("resolution probe 发生版本回退");
  if (probe.from !== probeValue.from || probe.to !== probeValue.to) fail("resolution probe manifest 与输出不一致");

  const design = manifest.design_baseline;
  if (!design || design.version_scope !== "static-alpha-not-exact") fail("design_baseline 必须声明 static-alpha-not-exact");
  const designValue = verifyArtifact(packRoot, design.output, "design_baseline.output");
  if (typeof designValue.doc !== "string" || !/^version:\s*alpha$/m.test(designValue.doc) || !/^name:\s*Antdv Next$/m.test(designValue.doc)) {
    fail("design.md 输出缺少 Antdv Next alpha 声明");
  }

  const baseline = manifest.project_baseline;
  if (!baseline || baseline.override_precedence !== "project-first") fail("project_baseline.override_precedence 必须为 project-first");
  if (typeof baseline.override_reviewed !== "boolean") fail("project_baseline.override_reviewed 必须是 boolean");
  if (baseline.canonical_design?.ref !== "DESIGN.md") fail("project_baseline.canonical_design.ref 必须为 DESIGN.md");
  verifyProjectArtifact(projectRoot, baseline.canonical_design, "project_baseline.canonical_design");
  verifyProjectArtifact(projectRoot, baseline.design, "project_baseline.design");
  verifyProjectArtifact(projectRoot, baseline.tokens, "project_baseline.tokens");

  if (!Array.isArray(manifest.components) || manifest.components.length === 0) fail("components 不能为空");
  const names = manifest.components.map((component) => component?.name);
  if (new Set(names).size !== names.length) fail("components 不得重复");
  if (names.some((name) => typeof name !== "string" || !/^[A-Z][A-Za-z0-9]*$/.test(name))) fail("component name 非法");
  if (manifest.collection_profile === "p0-reference" && JSON.stringify([...names].sort()) !== JSON.stringify(P0_COMPONENTS)) {
    fail(`p0-reference 必须恰好覆盖 ${P0_COMPONENTS.join(", ")}`);
  }
  const componentList = verifyArtifact(packRoot, manifest.component_list, "component_list");
  if (!Array.isArray(componentList) || !names.every((name) => componentList.some((entry) => entry?.name === name))) {
    fail("component_list 未覆盖全部选用组件");
  }
  for (const [index, component] of manifest.components.entries()) {
    const prefix = `components[${index}]`;
    const info = verifyArtifact(packRoot, component.info, `${prefix}.info`);
    const demo = verifyArtifact(packRoot, component.demo, `${prefix}.demo`);
    const token = verifyArtifact(packRoot, component.token, `${prefix}.token`);
    const semantic = verifyArtifact(packRoot, component.semantic, `${prefix}.semantic`);
    if (info.name !== component.name) fail(`${prefix}.info 组件名不一致`);
    if (demo.component !== component.name || typeof demo.code !== "string" || !demo.code.includes("<template>")) fail(`${prefix}.demo 不是匹配的 Vue SFC`);
    if (!Array.isArray(token.token)) fail(`${prefix}.token 缺少 token 数组`);
    if (semantic.name !== component.name || !Array.isArray(semantic.semanticStructure)) fail(`${prefix}.semantic 结构无效`);
  }

  return {
    provider_id: manifest.provider_id,
    library_version: library.requested_version,
    cli_version: cli.version,
    components: names.length,
    profile: manifest.collection_profile
  };
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) fail("用法: validate-fact-pack.mjs <manifest.json>");
  const result = validateFactPack(manifestPath);
  process.stdout.write(`Antdv Next fact pack valid (${result.library_version}, ${result.components} components, ${result.profile})\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
