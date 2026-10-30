#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants, copyFileSync, existsSync, readFileSync, writeFileSync, realpathSync, statSync, lstatSync, mkdtempSync, renameSync, linkSync, rmSync, unlinkSync, chmodSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseDocument } from "./vendor/yaml.mjs";

function createDesignService(repositoryRoot) {
const designPath = path.join(repositoryRoot, "DESIGN.md");
const projectionDir = path.join(repositoryRoot, ".template-spec/design/tokens");
const manifestPath = path.join(projectionDir, ".design-md-projection.json");
const syncMetadataPath = path.join(repositoryRoot, ".template-source/design/design-system-sync.yaml");
const expectedSections = ["Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components", "Do's and Don'ts"];
const requiredFrontmatter = ["version", "name", "description", "colors", "typography", "rounded", "spacing", "components"];
const componentProperties = new Set(["backgroundColor", "textColor", "typography", "rounded", "padding", "size", "height", "width"]);

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function fail(message) { throw new Error(message); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function checkTemplateSync() {
  const identityPath = path.join(repositoryRoot, "yss-project.yaml");
  if (existsSync(identityPath)) {
    const document = parseDocument(readFileSync(identityPath, "utf8"), { uniqueKeys: true, maxAliasCount: 0 });
    if (document.errors.length) fail(`无法解析 yss-project.yaml: ${document.errors[0].message}`);
    const identity = document.toJS({ maxAliasCount: 0 });
    if (!identity || typeof identity !== "object" || Array.isArray(identity) ||
        JSON.stringify(Object.keys(identity).sort()) !== JSON.stringify(["repository_mode", "schema_version"]) ||
        ![1, 2].includes(identity.schema_version) ||
        !["template-source", "project-instance"].includes(identity.repository_mode) ||
        identity.schema_version === 2 && identity.repository_mode !== "project-instance") {
      fail("yss-project.yaml 必须声明受支持的 schema_version 和合法 repository_mode");
    }
    return identity.repository_mode === "template-source";
  }
  const nativePath = path.join(repositoryRoot, ".yss.json");
  if (existsSync(nativePath)) {
    let native;
    try { native = JSON.parse(readFileSync(nativePath, "utf8")); }
    catch { fail(".yss.json 无法解析，不能判断独立技能实例"); }
    const profileId = { spec: "harness.spec-template", backend: "harness.backend-delivery" }[native?.profile];
    if (![4, 5].includes(native?.schemaVersion) || !profileId || native.profileId !== profileId ||
        native.distribution?.installation !== "skills") fail(".yss.json 不是有效的独立技能实例");
    return false;
  }
  // 旧的独立使用没有身份文件：保留原有校验，不依据目录猜测实例身份。
  return true;
}

function resolveValue(value, frontmatter) {
  const match = typeof value === "string" ? value.match(/^\{(colors|typography|rounded|spacing)\.([\w-]+)\}$/) : null;
  return match ? frontmatter[match[1]]?.[match[2]] : value;
}

function projectedCssVariables(frontmatter) {
  const components = frontmatter.components;
  const kebab = key => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  const resolve = value => typeof value === "string" ? value.replace(/\{(colors|typography|rounded|spacing)\.([\w-]+)\}/g, (_, group, key) => {
    const target = frontmatter[group][key];
    if (typeof target === "object") fail("CSS 标量不能引用完整排版对象");
    return target;
  }) : value;
  const roles = {};
  for (const group of ["colors", "typography", "rounded", "spacing", "components"]) {
    for (const [name, value] of Object.entries(frontmatter[group])) {
      if (typeof value !== "object") roles[`yss-${group}-${name}`] = resolve(value);
      else for (const [property, scalar] of Object.entries(value)) {
        // A component typography reference expands to its named typography role.
        if (property === "typography") continue;
        roles[`yss-${group}-${name}-${kebab(property)}`] = resolve(scalar);
      }
    }
  }
  return {
    ...roles,
    "yss-color-primary-control": resolveValue(components["button-primary"].backgroundColor, frontmatter),
    "yss-color-primary-control-hover": resolveValue(components["button-primary-hover"].backgroundColor, frontmatter),
    "yss-color-on-primary": resolveValue(components["button-primary"].textColor, frontmatter),
    "yss-control-height": resolveValue(components["button-primary"].height, frontmatter),
    "yss-card-padding": resolveValue(components["card-default"].padding, frontmatter),
    "yss-control-height-compact": resolveValue(components["button-compact"].height, frontmatter),
    "yss-card-compact-padding": resolveValue(components["card-compact"].padding, frontmatter)
  };
}

function renderCssProjection(frontmatter, source) {
  for (const [name, value] of Object.entries(projectedCssVariables(frontmatter))) {
    const declaration = `  --${name}: ${value};`;
    const pattern = new RegExp(`^\\s*--${escapeRegExp(name)}:.*;$`, "m");
    source = pattern.test(source) ? source.replace(pattern, declaration) : source.replace(":root {\n", `:root {\n${declaration}\n`);
  }
  return source;
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
  const checkSync = file === designPath && checkTemplateSync();
  if (checkSync && existsSync(syncMetadataPath)) {
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

function assertSafeProjectionOutputs(files) {
  for (const file of files) {
    let current = repositoryRoot;
    const parts = path.relative(repositoryRoot, file).split(path.sep);
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      const info = lstatSync(current, { throwIfNoEntry: false });
      if (info?.isSymbolicLink()) fail(`写入路径不能包含符号链接: ${current}`);
      if (index < parts.length - 1 && !info?.isDirectory()) fail(`写入目录不可用: ${current}`);
      if (index === parts.length - 1 && info && !info.isFile()) fail(`写入目标不是普通文件: ${current}`);
    }
  }
}

function snapshotFiles(files) {
  return new Map(files.map(file => {
    const info = lstatSync(file, { throwIfNoEntry: false });
    return [file, info ? { bytes: readFileSync(file), mode: info.mode & 0o777 } : null];
  }));
}

function matchesSnapshot(file, original) {
  const info = lstatSync(file, { throwIfNoEntry: false });
  return Boolean(info) === Boolean(original) && (!info || (info.isFile() && (info.mode & 0o777) === original.mode && readFileSync(file).equals(original.bytes)));
}

function commitProjections(changes, originals) {
  if (!changes.size) return;
  const files = [...changes.keys()];
  assertSafeProjectionOutputs(files);
  const staging = mkdtempSync(path.join(projectionDir, ".design-md-"));
  const committed = [];
  let preserveStaging = false;
  try {
    for (const [index, file] of files.entries()) {
      const staged = path.join(staging, `new-${index}`), original = originals.get(file);
      writeFileSync(staged, changes.get(file), { flag: "wx", mode: original?.mode ?? 0o666 });
      if (original) chmodSync(staged, original.mode);
    }
    const probe = path.join(staging, "link-probe");
    linkSync(path.join(staging, "new-0"), probe);
    unlinkSync(probe);
    assertSafeProjectionOutputs(files);
    for (const [file, original] of originals) {
      if (!matchesSnapshot(file, original)) fail(`写入前文件发生变化: ${file}`);
    }
    for (const [index, file] of files.entries()) {
      const original = originals.get(file), backup = path.join(staging, `old-${index}`);
      const item = { file, backup, original, installed: false };
      if (original) renameSync(file, backup);
      committed.push(item);
      if (original && !matchesSnapshot(backup, original)) fail(`写入前文件发生变化: ${file}`);
      linkSync(path.join(staging, `new-${index}`), file);
      item.installed = true;
    }
    for (const item of committed) {
      if (item.original && !matchesSnapshot(item.backup, item.original)) fail(`写入时原文件发生变化: ${item.file}`);
    }
  } catch (error) {
    try {
      for (const item of committed.reverse()) {
        if (item.installed) {
          const displaced = `${item.backup}-installed`;
          renameSync(item.file, displaced);
          const info = lstatSync(displaced, { throwIfNoEntry: false });
          if (!info?.isFile() || !readFileSync(displaced).equals(Buffer.from(changes.get(item.file)))) {
            linkSync(displaced, item.file);
            unlinkSync(displaced);
            throw new Error(`回滚时目标发生变化: ${item.file}`);
          }
          unlinkSync(displaced);
        }
        if (item.original) {
          if (lstatSync(item.file, { throwIfNoEntry: false })) throw new Error(`回滚目标已被占用: ${item.file}`);
          try { linkSync(item.backup, item.file); }
          catch (linkError) {
            if (!lstatSync(item.backup).isFile()) throw linkError;
            copyFileSync(item.backup, item.file, constants.COPYFILE_EXCL);
          }
          unlinkSync(item.backup);
        }
      }
    } catch (rollbackError) {
      preserveStaging = true;
      throw new Error(`${error.message}；回滚未完成，备份保留于 ${staging}: ${rollbackError.message}`);
    }
    throw error;
  } finally {
    if (!preserveStaging) rmSync(staging, { recursive: true, force: true });
  }
}

function themeProjection(frontmatter) {
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
  return theme;
}

function loadAlgorithmTheme(toolchain) {
  if (!toolchain) fail("export --write 需要 --antd-toolchain <独立作者工具目录>，固定 antd 6.6.4");
  const require = createRequire(path.join(path.resolve(toolchain), "package.json"));
  if (require("antd/package.json").version !== "6.6.4") fail("主题算法需要 antd 6.6.4");
  const theme = require("antd").theme;
  if (!theme || ["defaultAlgorithm", "darkAlgorithm", "compactAlgorithm", "getDesignToken"].some(key => typeof theme[key] !== "function")) {
    fail("antd 6.6.4 主题算法不完整");
  }
  return theme;
}

function algorithmProjections(theme, config, readSnapshot) {
  const kebab = key => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  const snapshots = {};
  for (const [mode, algorithm] of Object.entries({ default: theme.defaultAlgorithm, dark: theme.darkAlgorithm, compact: theme.compactAlgorithm })) {
    const token = { ...config.token };
    // Let the dark algorithm derive neutral colors instead of pinning light aliases.
    if (mode === "dark") for (const key of ["colorBgBase", "colorTextBase", "colorBgLayout", "colorText", "colorTextSecondary", "colorBorder"]) delete token[key];
    snapshots[mode] = theme.getDesignToken({ token, algorithm });
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
  const css = readSnapshot(cssPath);
  const darkStart = css.indexOf('[data-theme="dark"]');
  const lightCss = darkStart < 0 ? rewrite(css, snapshots.default) : rewrite(css.slice(0, darkStart), snapshots.default) + rewrite(css.slice(darkStart), snapshots.dark);
  const darkPath = path.join(projectionDir, "variables.dark.css");
  return new Map([
    ...Object.entries(snapshots).map(([mode, token]) => [path.join(projectionDir, `tokens.${mode}.json`), JSON.stringify(token, null, 2) + "\n"]),
    [cssPath, lightCss],
    [darkPath, rewrite(readSnapshot(darkPath), snapshots.dark)]
  ]);
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

function runCommand(argv) {
  const [command, ...args] = argv;
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
    const { source, frontmatter } = readDesign();
    const outputs = [
      ...(args.includes("--write") ? projectionFiles() : []),
      ...(args.includes("--write-css") ? [path.join(projectionDir, "variables.css")] : []),
      ...(args.includes("--write-manifest") ? [manifestPath] : [])
    ];
    const inputs = args.includes("--write-manifest") ? projectionFiles() : [];
    const snapshotPaths = [...new Set([...outputs, ...inputs])];
    assertSafeProjectionOutputs(snapshotPaths);
    process.stdout.write(runUpstream(["export", "DESIGN.md", "--format", format]));
    const originals = snapshotFiles(snapshotPaths);
    const snapshotBytes = file => {
      const original = originals.get(file);
      if (!original) fail(`缺少投影输入: ${file}`);
      return original.bytes;
    };
    const readSnapshot = file => snapshotBytes(file).toString("utf8");
    const changes = new Map();
    const cssPath = path.join(projectionDir, "variables.css");
    if (args.includes("--write")) {
      const toolchain = args[args.indexOf("--antd-toolchain") + 1];
      if (!args.includes("--antd-toolchain") || !toolchain) fail("缺少 --antd-toolchain");
      const theme = loadAlgorithmTheme(toolchain);
      const config = themeProjection(frontmatter);
      changes.set(path.join(projectionDir, "theme.json"), `${JSON.stringify(config, null, 2)}\n`);
      for (const [file, value] of algorithmProjections(theme, config, readSnapshot)) changes.set(file, value);
      changes.set(cssPath, renderCssProjection(frontmatter, changes.get(cssPath)));
    }
    // Visual role aliases do not require rerunning a production theme algorithm.
    if (args.includes("--write-css") && !args.includes("--write")) changes.set(cssPath, renderCssProjection(frontmatter, readSnapshot(cssPath)));
    if (args.includes("--write-manifest")) {
      const files = Object.fromEntries(projectionFiles().map(file => [path.relative(repositoryRoot, file), sha256(changes.has(file) ? changes.get(file) : snapshotBytes(file))]));
      changes.set(manifestPath, `${JSON.stringify({ schema_version: 1, source: "DESIGN.md", source_sha256: sha256(source), files }, null, 2)}\n`);
    }
    commitProjections(changes, originals);
    return;
  }
  if (command === "drift") { driftCheck(); process.stdout.write("DESIGN.md 投影无漂移\n"); return; }
  fail("用法: design-md lint|diff|export|drift");
}

return runCommand;
}

export function main(argv = process.argv.slice(2)) {
  const args = [...argv];
  if (args.some(arg => arg.startsWith("--project-root="))) throw new Error("使用 --project-root <目录>");
  const index = args.indexOf("--project-root");
  let root;
  if (index >= 0) {
    const value = args[index + 1];
    if (!value || value.startsWith("-") || args.indexOf("--project-root", index + 1) >= 0) {
      throw new Error("--project-root 必须指定一次有效目录");
    }
    root = path.resolve(value);
    args.splice(index, 2);
    if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error("--project-root 目录不存在或不可用");
  } else {
    const skill = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    const skillRoot = path.dirname(path.dirname(skill));
    const candidate = path.dirname(skillRoot);
    const canonical = path.basename(skill) === "yss-design-system" &&
      path.basename(path.dirname(skill)) === "skills" && [".agents", ".workbuddy"].includes(path.basename(skillRoot));
    const identified = existsSync(path.join(candidate, "yss-project.yaml")) || existsSync(path.join(candidate, ".yss.json")) ||
      (existsSync(path.join(candidate, "DESIGN.md")) && existsSync(path.join(candidate, ".template-spec/design/tokens")));
    if (!canonical || !identified) throw new Error("无法确定项目根目录，请指定 --project-root <目录>");
    root = candidate;
  }
  return createDesignService(root)(args);
}

function isDirectExecution() {
  if (!process.argv[1] || process.execArgv.some(arg => ["-e", "--eval", "-p", "--print"].includes(arg) || /^--(?:eval|print)=/.test(arg))) return false;
  try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
}

if (isDirectExecution()) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
