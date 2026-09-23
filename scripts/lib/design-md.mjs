#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { parseDocument } from "../vendor/yaml.mjs";

const repositoryRoot = path.resolve(new URL("../..", import.meta.url).pathname);
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
    "yss-control-height": resolveValue(components["button-primary"].height, frontmatter),
    "yss-card-padding": resolveValue(components["card-default"].padding, frontmatter),
    "yss-control-height-compact": resolveValue(components["button-compact"].height, frontmatter),
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
  const theme = { token: {}, algorithm: "default" };
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
    controlHeight: Number.parseInt(frontmatter.components["button-primary"].height, 10),
    controlHeightSM: Number.parseInt(frontmatter.components["button-small"].height, 10),
    controlHeightLG: Number.parseInt(frontmatter.components["button-large"].height, 10),
    fontSizeSM: Number.parseInt(typography.caption.fontSize, 10),
    borderRadiusSM: Number.parseInt(rounded.sm, 10),
    borderRadiusLG: Number.parseInt(rounded.lg, 10),
    padding: Number.parseInt(spacing.md, 10),
    paddingSM: Number.parseInt(spacing.sm, 10),
    paddingXS: Number.parseInt(spacing.xs, 10),
    paddingLG: Number.parseInt(spacing.card, 10)
  });
  theme.components = { Card: { borderRadiusLG: token.borderRadiusLG, paddingLG: token.paddingLG } };
  writeFileSync(themeFile, `${JSON.stringify(theme, null, 2)}\n`);
}

function writeAlgorithmProjections(toolchain) {
  if (!toolchain) fail("export --write 需要 --antd-toolchain <独立作者工具目录>，固定 antd 6.6.4");
  const require = createRequire(path.join(path.resolve(toolchain), "package.json"));
  if (require("antd/package.json").version !== "6.6.4") fail("主题算法需要 antd 6.6.4");
  const { theme } = require("antd");
  const config = JSON.parse(readFileSync(path.join(projectionDir, "theme.json")));
  const kebab = key => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  const snapshots = {};
  for (const [mode, algorithm] of Object.entries({ default: theme.defaultAlgorithm, dark: theme.darkAlgorithm, compact: theme.compactAlgorithm })) {
    const token = { ...config.token };
    // Let the dark algorithm derive neutral colors instead of pinning light aliases.
    if (mode === "dark") for (const key of ["colorBgBase", "colorTextBase", "colorBgLayout", "colorText", "colorTextSecondary", "colorBorder"]) delete token[key];
    snapshots[mode] = theme.getDesignToken({ token, algorithm });
    writeFileSync(path.join(projectionDir, `tokens.${mode}.json`), JSON.stringify(snapshots[mode], null, 2) + "\n");
  }
  const rewrite = (css, token) => {
    const values = Object.fromEntries(Object.entries(token).map(([key,value]) => [kebab(key),value]));
    return css.replace(/(--brand-([\w-]+):\s*)([^;]+);/g, (all, prefix, key, old) => {
      const value = values[key];
      if (value === undefined || typeof value === "object") return all;
      const unit = typeof value === "number" ? old.trim().match(/(?:px|ms|s)$/)?.[0] || "" : "";
      return `${prefix}${value}${unit};`;
    });
  };
  const cssPath = path.join(projectionDir, "variables.css");
  const css = readFileSync(cssPath, "utf8");
  const darkStart = css.indexOf('[data-theme="dark"]');
  writeFileSync(cssPath, darkStart < 0 ? rewrite(css, snapshots.default) : rewrite(css.slice(0, darkStart), snapshots.default) + rewrite(css.slice(darkStart), snapshots.dark));
  const darkPath = path.join(projectionDir, "variables.dark.css");
  writeFileSync(darkPath, rewrite(readFileSync(darkPath, "utf8"), snapshots.dark));
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
      const toolchain = args[args.indexOf("--antd-toolchain") + 1];
      if (!args.includes("--antd-toolchain") || !toolchain) fail("缺少 --antd-toolchain");
      writeThemeProjection(frontmatter);
      writeAlgorithmProjections(toolchain);
      writeCssProjection(frontmatter);
    }
    if (args.includes("--write-manifest")) writeProjectionManifest();
    return;
  }
  if (command === "drift") { driftCheck(); process.stdout.write("DESIGN.md 投影无漂移\n"); return; }
  fail("用法: design-md lint|diff|export|drift");
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
