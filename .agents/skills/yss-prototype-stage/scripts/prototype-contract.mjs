#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const semver = /^6\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const pnpmSemver = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

function required(data, field, parent, errors) {
  if (!object(data) || data[field] === undefined || data[field] === null) errors.push(`${parent}.${field} 缺失`);
}

function requiredString(data, field, parent, errors) {
  required(data, field, parent, errors);
  if (object(data) && data[field] !== undefined && !nonEmpty(data[field])) errors.push(`${parent}.${field} 必须是非空字符串`);
}

function requiredPassed(data, field, parent, errors) {
  requiredString(data, field, parent, errors);
  if (object(data) && nonEmpty(data[field]) && !["passed", "approved"].includes(data[field])) errors.push(`${parent}.${field} 必须为 passed/approved`);
}

export function validatePrototypeEvidence(data, { allowTemplate = false, allowLegacy = false } = {}) {
  const errors = [];
  const warnings = [];
  if (!object(data)) return { errors: ["原型证据必须是对象"], warnings };
  if (data.schema_version === 1) {
    if (!allowLegacy) errors.push("schema_version 1 是旧证据；完成 gate.prototype-verified 前必须迁移到 2，或只读时显式 --allow-legacy");
    else warnings.push("legacy prototype evidence schema v1");
    return { errors, warnings };
  }
  if (data.schema_version !== 2) errors.push("schema_version 必须为 2");
  for (const field of ["feature", "prototype_ref", "prototype_stack", "design_baseline", "visual_semantic_mapping", "antd", "browser_verification", "design_qa", "accessibility_verification", "review", "user_confirmation", "blockers"]) required(data, field, "root", errors);

  const templateValue = (value) => allowTemplate && nonEmpty(value) && /<[^>]+>/.test(value);
  const stack = data.prototype_stack;
  if (object(stack)) {
    for (const field of ["framework", "package_manager", "package_manifest_ref", "lockfile_ref", "source_entry_ref", "build_entry_ref", "build_command", "build_result", "actual_antd_version"]) requiredString(stack, field, "prototype_stack", errors);
    if (stack.framework !== "react") errors.push("prototype_stack.framework 必须为 react");
    if (stack.package_manager !== "pnpm") errors.push("prototype_stack.package_manager 必须为 pnpm");
    if (nonEmpty(stack.lockfile_ref) && !stack.lockfile_ref.endsWith("pnpm-lock.yaml")) errors.push("prototype_stack.lockfile_ref 必须指向 pnpm-lock.yaml");
    if (!templateValue(stack.actual_antd_version) && nonEmpty(stack.actual_antd_version) && !semver.test(stack.actual_antd_version)) errors.push("prototype_stack.actual_antd_version 必须是明确的 antd 6.x semver");
    if (!allowTemplate) requiredPassed(stack, "build_result", "prototype_stack", errors);
  }

  const baseline = data.design_baseline;
  if (object(baseline)) {
    for (const field of ["design_standard", "project_design_ref", "project_token_refs", "theme_adapter_ref", "project_override_reviewed"]) required(baseline, field, "design_baseline", errors);
    if (baseline.design_standard !== "ant-design-v6") errors.push("design_baseline.design_standard 必须为 ant-design-v6");
    if (!Array.isArray(baseline.project_token_refs) || baseline.project_token_refs.length === 0) errors.push("design_baseline.project_token_refs 必须是非空数组");
    if (!allowTemplate && baseline.project_override_reviewed !== true) errors.push("design_baseline.project_override_reviewed 必须为 true");
  }

  const mapping = data.visual_semantic_mapping;
  if (object(mapping)) {
    if (mapping.runtime_component_library !== "ant-design-vue-4.x") errors.push("visual_semantic_mapping.runtime_component_library 必须为 ant-design-vue-4.x");
    if (mapping.runtime_version_source !== "implementation-lockfile") errors.push("visual_semantic_mapping.runtime_version_source 必须为 implementation-lockfile");
    if (!Array.isArray(mapping.components) || mapping.components.length === 0) errors.push("visual_semantic_mapping.components 必须是非空数组");
    for (const [index, component] of (mapping.components ?? []).entries()) {
      const parent = `visual_semantic_mapping.components[${index}]`;
      for (const field of ["semantic_role", "antd_v6_component", "project_token_refs", "yss_or_antdv_target", "state_mapping", "react_only_api_not_copied", "verification_ref"]) required(component, field, parent, errors);
      if (!Array.isArray(component?.project_token_refs) || component.project_token_refs.length === 0) errors.push(`${parent}.project_token_refs 必须是非空数组`);
      if (!Array.isArray(component?.state_mapping) || component.state_mapping.length === 0) errors.push(`${parent}.state_mapping 必须是非空数组`);
      if (!allowTemplate && component?.react_only_api_not_copied !== true) errors.push(`${parent}.React-only API 未确认隔离`);
    }
  }

  if (object(data.antd)) {
    requiredString(data.antd, "target_antd_version", "antd", errors);
    if (object(stack) && nonEmpty(data.antd.target_antd_version) && nonEmpty(stack.actual_antd_version) && !templateValue(data.antd.target_antd_version) && data.antd.target_antd_version !== stack.actual_antd_version) errors.push("antd.target_antd_version 必须与 prototype_stack.actual_antd_version 一致");
  }
  if (object(data.design_qa)) {
    requiredString(data.design_qa, "report_ref", "design_qa", errors);
    requiredString(data.design_qa, "result", "design_qa", errors);
    if (nonEmpty(data.design_qa.report_ref) && !/^docs\/\.scratch\/[^/]+\/verification\/design-qa\.md$/.test(data.design_qa.report_ref) && !templateValue(data.design_qa.report_ref)) errors.push("design_qa.report_ref 必须是 feature 级 verification/design-qa.md");
    if (!allowTemplate) requiredPassed(data.design_qa, "result", "design_qa", errors);
  }
  const accessibility = data.accessibility_verification;
  if (object(accessibility)) {
    for (const field of ["contrast_results_ref", "keyboard_navigation_result", "focus_visible_and_order_result", "semantic_label_dialog_result", "zoom_200_result", "reduced_motion_result", "target_size_result", "automated_scan"]) required(accessibility, field, "accessibility_verification", errors);
    requiredString(accessibility, "contrast_results_ref", "accessibility_verification", errors);
    if (!allowTemplate) for (const field of ["keyboard_navigation_result", "focus_visible_and_order_result", "semantic_label_dialog_result", "zoom_200_result", "reduced_motion_result", "target_size_result"]) requiredPassed(accessibility, field, "accessibility_verification", errors);
    if (object(accessibility.automated_scan)) for (const field of ["tool", "version", "result", "ref"]) requiredString(accessibility.automated_scan, field, "accessibility_verification.automated_scan", errors);
  }
  if (!Array.isArray(data.blockers)) errors.push("root.blockers 必须是数组");
  if (!allowTemplate && Array.isArray(data.blockers) && data.blockers.length > 0) errors.push("存在 blockers，不能通过原型验证");
  return { errors, warnings };
}

function safePrototypeRoot(projectRoot, root, feature) {
  const resolvedProject = path.resolve(projectRoot);
  const resolvedRoot = path.resolve(root);
  const expected = path.resolve(resolvedProject, "docs/.scratch", feature, "design/prototypes");
  if (resolvedRoot !== expected) throw new TypeError(`原型目录必须精确匹配 ${expected}`);
  if (!resolvedRoot.startsWith(`${resolvedProject}${path.sep}`)) throw new TypeError("原型目录越出项目根");
  return { resolvedProject, resolvedRoot };
}

export async function preparePrototype({ projectRoot, root, feature, targetAntdVersion, pnpmVersion }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(feature ?? "")) throw new TypeError("feature 必须是小写 kebab-case");
  if (!semver.test(targetAntdVersion ?? "")) throw new TypeError("targetAntdVersion 必须是明确的 antd 6.x semver");
  if (!pnpmSemver.test(pnpmVersion ?? "")) throw new TypeError("pnpmVersion 必须是明确 semver");
  const { resolvedProject, resolvedRoot } = safePrototypeRoot(projectRoot, root, feature);
  const packagePath = path.join(resolvedRoot, "package.json");
  if (!existsSync(packagePath)) throw new TypeError(`缺少 Product Design starter package.json: ${packagePath}`);
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  pkg.packageManager = `pnpm@${pnpmVersion}`;
  pkg.dependencies = { ...(pkg.dependencies ?? {}), "@ant-design/icons": "^6.0.0", antd: targetAntdVersion };
  await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  const themeSourcePath = path.join(resolvedProject, "docs/design/tokens/theme.json");
  if (!existsSync(themeSourcePath)) throw new TypeError(`缺少项目主题: ${themeSourcePath}`);
  const themeSource = JSON.parse(await readFile(themeSourcePath, "utf8"));
  const generated = [
    'import { theme } from "antd";',
    "",
    `const source = ${JSON.stringify(themeSource, null, 2)};`,
    'const layoutKeys = new Set(["layoutHeaderHeight", "layoutSiderBackground", "layoutBodyBackground"]);',
    "export const yssLayoutTokens = Object.fromEntries(Object.entries(source.token ?? {}).filter(([key]) => layoutKeys.has(key)));",
    "export const yssTheme = {",
    "  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],",
    "  token: Object.fromEntries(Object.entries(source.token ?? {}).filter(([key]) => !layoutKeys.has(key)))",
    "};",
    ""
  ].join("\n");
  await mkdir(path.join(resolvedRoot, "src"), { recursive: true });
  await writeFile(path.join(resolvedRoot, "src/yss-theme.js"), generated);
  const manifest = {
    schema_version: 1,
    feature,
    design_standard: "ant-design-v6",
    target_antd_version: targetAntdVersion,
    prototype_framework: "react",
    package_manager: `pnpm@${pnpmVersion}`,
    theme_source: "docs/design/tokens/theme.json",
    theme_adapter: `docs/.scratch/${feature}/design/prototypes/src/yss-theme.js`,
    production_runtime: { framework: "vue-3", component_library: "ant-design-vue-4.x", version_source: "implementation-lockfile" },
    next_commands: ["pnpm install", "pnpm build"]
  };
  await writeFile(path.join(resolvedRoot, "yss-prototype-adapter.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function validatePrototypeProject({ root, targetAntdVersion }) {
  const errors = [];
  const packagePath = path.join(root, "package.json");
  if (!existsSync(packagePath)) return { errors: ["缺少 package.json"] };
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  if (pkg.dependencies?.antd !== targetAntdVersion) errors.push(`package.json 必须精确锁定 antd ${targetAntdVersion}`);
  if (!String(pkg.packageManager ?? "").startsWith("pnpm@")) errors.push("package.json 必须记录实际 pnpm packageManager");
  if (!existsSync(path.join(root, "pnpm-lock.yaml"))) errors.push("缺少 pnpm-lock.yaml");
  if (!existsSync(path.join(root, "src/yss-theme.js"))) errors.push("缺少 src/yss-theme.js");
  const sourceFiles = ["src/App.jsx", "src/App.tsx", "src/main.jsx", "src/main.tsx"].filter((file) => existsSync(path.join(root, file)));
  const source = (await Promise.all(sourceFiles.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
  if (!/ConfigProvider/.test(source) || !/yssTheme/.test(source)) errors.push("原型入口必须通过 ConfigProvider 消费 yssTheme");
  if (!existsSync(path.join(root, "yss-prototype-adapter.json"))) errors.push("缺少 yss-prototype-adapter.json");
  return { errors };
}

function args(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) { result._.push(item); continue; }
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) result[key] = true;
    else { result[key] = value; index += 1; }
  }
  return result;
}

async function loadYaml(file) {
  const document = parseDocument(await readFile(file, "utf8"), { uniqueKeys: true });
  if (document.errors.length > 0) throw new TypeError(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}

async function main(argv) {
  const parsed = args(argv);
  const command = parsed._[0];
  if (command === "prepare") {
    const result = await preparePrototype({ projectRoot: parsed["project-root"], root: parsed.root, feature: parsed.feature, targetAntdVersion: parsed["target-antd-version"], pnpmVersion: parsed["pnpm-version"] });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "validate-project") {
    const result = await validatePrototypeProject({ root: parsed.root, targetAntdVersion: parsed["target-antd-version"] });
    if (result.errors.length > 0) throw new TypeError(result.errors.join("\n"));
    process.stdout.write("prototype project contract passed\n");
    return;
  }
  if (command === "validate-evidence") {
    const result = validatePrototypeEvidence(await loadYaml(parsed._[1]), { allowTemplate: Boolean(parsed["allow-template"]), allowLegacy: Boolean(parsed["allow-legacy"]) });
    if (result.errors.length > 0) throw new TypeError(result.errors.join("\n"));
    process.stdout.write(`prototype evidence passed${result.warnings.length ? ` with warnings: ${result.warnings.join(", ")}` : ""}\n`);
    return;
  }
  throw new TypeError("usage: prototype-contract.mjs prepare|validate-project|validate-evidence ...");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
