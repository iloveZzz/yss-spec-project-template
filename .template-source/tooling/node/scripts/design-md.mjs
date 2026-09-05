#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseDocument } from "../vendor-entry-yaml.mjs";

const repositoryRoot = path.resolve(new URL("../../../..", import.meta.url).pathname);
const designPath = path.join(repositoryRoot, "DESIGN.md");
const projectionDir = path.join(repositoryRoot, "docs/design/tokens");
const manifestPath = path.join(projectionDir, ".design-md-projection.json");
const syncMetadataPath = path.join(repositoryRoot, "docs/design/design-system-sync.yaml");
const expectedSections = ["Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components", "Do's and Don'ts"];
const requiredFrontmatter = ["version", "name", "description", "colors", "typography", "rounded", "spacing", "components"];
const componentProperties = new Set(["backgroundColor", "textColor", "typography", "rounded", "padding", "size", "height", "width"]);

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function fail(message) { throw new Error(message); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function resolveValue(value, frontmatter) {
  const match = typeof value === "string" ? value.match(/^\{(colors|typography|rounded|spacing)\.([\w-]+)\}$/) : null;
  return match ? frontmatter[match[1]]?.[match[2]] : value;
}

function projectedCssVariables(frontmatter) {
  const components = frontmatter.components;
  return {
    "yss-color-primary-control": resolveValue(components["button-primary"].backgroundColor, frontmatter),
    "yss-color-primary-control-hover": resolveValue(components["button-primary-hover"].backgroundColor, frontmatter),
    "yss-color-on-primary": resolveValue(components["button-primary"].textColor, frontmatter),
    "yss-control-height-compact": resolveValue(components["button-primary"].height, frontmatter),
    "yss-card-compact-padding": resolveValue(components["card-compact"].padding, frontmatter)
  };
}

function writeCssProjection(frontmatter) {
  const cssPath = path.join(projectionDir, "variables.css");
  let source = readFileSync(cssPath, "utf8");
  for (const [name, value] of Object.entries(projectedCssVariables(frontmatter))) {
    const declaration = `  --${name}: ${value};`;
    const pattern = new RegExp(`^\\s*--${escapeRegExp(name)}:.*;$`, "m");
    source = pattern.test(source) ? source.replace(pattern, declaration) : source.replace(":root {\n", `:root {\n${declaration}\n`);
  }
  writeFileSync(cssPath, source);
}

function validateCssProjection(frontmatter) {
  const source = readFileSync(path.join(projectionDir, "variables.css"), "utf8");
  for (const [name, value] of Object.entries(projectedCssVariables(frontmatter))) {
    if (!new RegExp(`^\\s*--${escapeRegExp(name)}: ${escapeRegExp(String(value))};$`, "m").test(source)) fail(`variables.css 的 --${name} 与 DESIGN.md 不一致`);
  }
}

function readDesign(file = designPath) {
  const source = readFileSync(file, "utf8");
  if (!source.startsWith("---\n")) fail(`${path.relative(repositoryRoot, file)} 缺少 YAML frontmatter`);
  const end = source.indexOf("\n---", 4);
  if (end < 0) fail(`${path.relative(repositoryRoot, file)} frontmatter 未闭合`);
  const document = parseDocument(source.slice(4, end), { uniqueKeys: true, maxAliasCount: 0 });
  if (document.errors.length) fail(document.errors[0].message);
  const frontmatter = document.toJS({ maxAliasCount: 0 });
  for (const field of requiredFrontmatter) if (!frontmatter?.[field]) fail(`frontmatter 缺少 ${field}`);
  const body = source.slice(end + 4);
  const headings = [...body.matchAll(/^## ([^\n]+)$/gm)].map((match) => match[1].trim());
  const actual = headings.slice(0, expectedSections.length);
  if (JSON.stringify(actual) !== JSON.stringify(expectedSections)) fail(`canonical H2 章节顺序必须为: ${expectedSections.join(" → ")}`);
  for (const section of expectedSections) {
    if (headings.filter((heading) => heading === section).length !== 1) fail(`canonical H2 章节必须且只能出现一次: ${section}`);
  }
  const canonicalH1 = [...body.matchAll(/^# ([^\n]+)$/gm)].map((match) => match[1].trim()).filter((heading) => expectedSections.includes(heading));
  if (canonicalH1.length > 0) fail(`canonical 正文章节必须使用 H2，不能使用 H1: ${canonicalH1.join(", ")}`);
  for (const [name, component] of Object.entries(frontmatter.components)) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) fail(`组件变体名称非法: ${name}`);
    for (const key of Object.keys(component)) if (!componentProperties.has(key)) fail(`组件 ${name} 使用不支持的属性: ${key}`);
  }
  const references = [...source.matchAll(/\{(colors|typography|rounded|spacing)\.([\w-]+)\}/g)].map((match) => match[0]);
  for (const reference of references) {
    const [, group, token] = reference.match(/^\{([^}]+)\.([^}]+)\}$/);
    if (frontmatter[group]?.[token] === undefined) fail(`悬空 token 引用: ${reference}`);
  }
  if (file === designPath && existsSync(syncMetadataPath)) {
    const syncDocument = parseDocument(readFileSync(syncMetadataPath, "utf8"), { uniqueKeys: true, maxAliasCount: 0 });
    if (syncDocument.errors.length) fail(syncDocument.errors[0].message);
    const sync = syncDocument.toJS({ maxAliasCount: 0 })?.design_system_sync;
    if (!sync?.baseline_sha256 || sync.baseline_sha256 !== sha256(source)) {
      fail("design-system-sync.yaml 的 baseline_sha256 与 DESIGN.md 不一致，请更新跨仓同步摘要");
    }
    if (!Array.isArray(sync.synchronized_sections) || sync.synchronized_sections.length === 0) {
      fail("design-system-sync.yaml 缺少 synchronized_sections");
    }
  }
  return { source, frontmatter };
}

function runUpstream(args) {
  const result = spawnSync("npx", ["--yes", "@google/design.md@0.4.0", ...args], { cwd: repositoryRoot, encoding: "utf8" });
  if (result.error || result.status !== 0) fail(result.stderr?.trim() || result.stdout?.trim() || "design.md CLI 执行失败");
  return result.stdout;
}

function projectionFiles() {
  return ["theme.json", "tokens.default.json", "tokens.dark.json", "tokens.compact.json", "variables.css", "variables.dark.css"].map((file) => path.join(projectionDir, file));
}

function writeProjectionManifest() {
  const { source } = readDesign();
  const files = Object.fromEntries(projectionFiles().map((file) => [path.relative(repositoryRoot, file), sha256(readFileSync(file))]));
  writeFileSync(manifestPath, `${JSON.stringify({ schema_version: 1, source: "DESIGN.md", source_sha256: sha256(source), files }, null, 2)}\n`);
}

function writeThemeProjection(frontmatter) {
  const themeFile = path.join(projectionDir, "theme.json");
  const theme = existsSync(themeFile) ? JSON.parse(readFileSync(themeFile, "utf8")) : { token: {}, algorithm: "default" };
  const token = theme.token || (theme.token = {});
  const colors = frontmatter.colors;
  const typography = frontmatter.typography;
  const rounded = frontmatter.rounded;
  const spacing = frontmatter.spacing;
  Object.assign(token, {
    colorPrimary: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info ?? colors.primary,
    colorTextBase: "#000000",
    colorBgBase: colors.surface ?? "#ffffff",
    colorBgLayout: colors["canvas-layout"] ?? "#f0f2f5",
    colorText: colors.text,
    colorTextSecondary: colors["text-secondary"],
    colorBorder: colors.border ?? "#d9d9d9",
    fontFamily: typography.body.fontFamily,
    fontSize: Number.parseInt(typography.body.fontSize, 10),
    borderRadius: Number.parseInt(rounded.md, 10),
    sizeUnit: Number.parseInt(spacing.xxs, 10),
    sizeStep: Number.parseInt(spacing.xxs, 10),
    controlHeight: 32
  });
  writeFileSync(themeFile, `${JSON.stringify(theme, null, 2)}\n`);
}

function driftCheck() {
  const { source, frontmatter } = readDesign();
  validateCssProjection(frontmatter);
  if (!existsSync(manifestPath)) fail(`缺少 ${path.relative(repositoryRoot, manifestPath)}，请先执行 export --write-manifest`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.source_sha256 !== sha256(source)) fail("DESIGN.md 已变化但投影未重新生成（source_sha256 漂移）");
  for (const [relative, digest] of Object.entries(manifest.files || {})) {
    const file = path.join(repositoryRoot, relative);
    if (!existsSync(file) || sha256(readFileSync(file)) !== digest) fail(`派生文件漂移: ${relative}`);
  }
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "lint") {
    const file = args.find((arg) => !arg.startsWith("-")) || designPath;
    readDesign(path.resolve(repositoryRoot, file));
    process.stdout.write(`${runUpstream(["lint", file, "--format", "json"])}`);
    return;
  }
  if (command === "diff") {
    if (args.length < 2) fail("用法: design-md diff <before> <after>");
    process.stdout.write(runUpstream(["diff", ...args.slice(0, 2), "--format", "json"]));
    return;
  }
  if (command === "export") {
    const format = args[0] || "dtcg";
    const { frontmatter } = readDesign();
    process.stdout.write(runUpstream(["export", "DESIGN.md", "--format", format]));
    if (args.includes("--write")) {
      writeThemeProjection(frontmatter);
      writeCssProjection(frontmatter);
    }
    if (args.includes("--write-manifest")) writeProjectionManifest();
    return;
  }
  if (command === "drift") { driftCheck(); process.stdout.write("DESIGN.md 投影无漂移\n"); return; }
  fail("用法: design-md lint|diff|export|drift");
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
