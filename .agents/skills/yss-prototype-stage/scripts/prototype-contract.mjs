#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const antdSemver = /^6\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const exactSemver = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const DEFAULT_H2_COMPONENT_BASIS = "vue-antdv-next";
const DEFAULT_ANTDV_NEXT_VERSION = "1.5.2";
const DEFAULT_VUE_VERSION = "3.5.21";
const DEFAULT_VITE_VERSION = "6.4.2";
const DEFAULT_VUE_PLUGIN_VERSION = "5.2.4";
const H2_COMPONENT_BASES = new Set([DEFAULT_H2_COMPONENT_BASIS, "react-antd-6"]);
const PROFILE_KIND = { H1: "visual-review", H2: "flow-review" };
const PROFILE_BLOCK = { H1: "visual_review", H2: "flow_review" };

function required(data, field, parent, errors) {
  if (!object(data) || data[field] === undefined || data[field] === null) errors.push(`${parent}.${field} 缺失`);
}

function requiredString(data, field, parent, errors) {
  required(data, field, parent, errors);
  if (object(data) && data[field] !== undefined && !nonEmpty(data[field])) errors.push(`${parent}.${field} 必须是非空字符串`);
}

function requireArray(data, field, parent, errors, { nonEmpty: mustHaveValue = false } = {}) {
  required(data, field, parent, errors);
  if (object(data) && !Array.isArray(data[field])) errors.push(`${parent}.${field} 必须是数组`);
  else if (mustHaveValue && Array.isArray(data?.[field]) && data[field].length === 0) errors.push(`${parent}.${field} 必须是非空数组`);
}

function requiredPassed(data, field, parent, errors, allowTemplate) {
  requiredString(data, field, parent, errors);
  if (!allowTemplate && object(data) && nonEmpty(data[field]) && !["passed", "approved"].includes(data[field])) errors.push(`${parent}.${field} 必须为 passed/approved`);
}

function validateConditionalCheck(check, parent, errors, allowTemplate) {
  for (const field of ["applicable", "result", "evidence_ref"]) required(check, field, parent, errors);
  if (!object(check)) return;
  if (typeof check.applicable !== "boolean") errors.push(`${parent}.applicable 必须是 boolean`);
  if (check.applicable === true) requiredPassed(check, "result", parent, errors, allowTemplate);
  if (check.applicable === false && !allowTemplate && check.result !== "not-applicable") errors.push(`${parent}.result 必须为 not-applicable`);
  requiredString(check, "evidence_ref", parent, errors);
}

function validateCommonV3(data, errors, allowTemplate) {
  for (const field of ["feature", "prototype_ref", "prototype_profile", "profile_kind", "profile_decision", "upstream_refs", "source_visual", "design_baseline", "browser_delivery", "design_qa", "profile_evidence", "implementation_handoff", "review", "user_confirmation", "gaps", "blockers"]) required(data, field, "root", errors);
  requiredString(data, "feature", "root", errors);
  requiredString(data, "prototype_ref", "root", errors);
  if (!Object.hasOwn(PROFILE_KIND, data.prototype_profile)) errors.push("root.prototype_profile 必须为 H1/H2；真实组件验证不属于原型档位");
  if (PROFILE_KIND[data.prototype_profile] !== data.profile_kind) errors.push("root.profile_kind 必须与 prototype_profile 匹配");

  const decision = data.profile_decision;
  requiredString(decision, "decision_to_inform", "profile_decision", errors);
  requireArray(decision, "risk_assumptions", "profile_decision", errors, { nonEmpty: true });
  requireArray(decision, "trigger_results", "profile_decision", errors, { nonEmpty: true });
  requiredString(decision, "calculated_profile", "profile_decision", errors);
  if (object(decision) && decision.calculated_profile !== data.prototype_profile && decision.override?.applied !== true) errors.push("profile_decision.calculated_profile 与选择档位不同时必须记录 override");
  if (object(decision?.override)) {
    for (const field of ["applied", "direction", "reason", "evidence_ref"]) required(decision.override, field, "profile_decision.override", errors);
  } else errors.push("profile_decision.override 缺失");

  const upstream = data.upstream_refs;
  for (const field of ["spec_ref", "interaction_spec_ref", "low_fidelity_ref", "state_matrix_ref", "prototype_review_ref"]) requiredString(upstream, field, "upstream_refs", errors);
  const visual = data.source_visual;
  for (const field of ["ideation_status", "selected_ref", "reuse_reason"]) requiredString(visual, field, "source_visual", errors);
  if (object(visual) && !["required", "not-applicable"].includes(visual.ideation_status)) errors.push("source_visual.ideation_status 必须为 required/not-applicable");

  const baseline = data.design_baseline;
  requiredString(baseline, "canonical_design_ref", "design_baseline", errors);
  requiredString(baseline, "canonical_design_digest", "design_baseline", errors);
  if (object(baseline) && baseline.canonical_design_ref !== "DESIGN.md" && !(allowTemplate && /<[^>]+>/.test(baseline.canonical_design_ref ?? ""))) errors.push("design_baseline.canonical_design_ref 必须为 DESIGN.md");
  requiredString(baseline, "project_design_ref", "design_baseline", errors);
  requireArray(baseline, "project_token_refs", "design_baseline", errors, { nonEmpty: true });
  requiredString(baseline, "project_token_baseline_digest", "design_baseline", errors);
  required(baseline, "project_override_reviewed", "design_baseline", errors);
  if (!allowTemplate && baseline?.project_override_reviewed !== true) errors.push("design_baseline.project_override_reviewed 必须为 true");

  const browser = data.browser_delivery;
  for (const field of ["delivery_kind", "entry_ref", "rendered_nonblank", "prototype_digest", "viewports", "console_result", "console_ref"]) required(browser, field, "browser_delivery", errors);
  requiredString(browser, "delivery_kind", "browser_delivery", errors);
  requiredString(browser, "entry_ref", "browser_delivery", errors);
  requiredString(browser, "prototype_digest", "browser_delivery", errors);
  requireArray(browser, "viewports", "browser_delivery", errors, { nonEmpty: true });
  if (!allowTemplate && browser?.rendered_nonblank !== true) errors.push("browser_delivery.rendered_nonblank 必须为 true");
  if (!allowTemplate) requiredPassed(browser, "console_result", "browser_delivery", errors, allowTemplate);
  for (const requiredViewport of ["desktop", "narrow"]) {
    const viewport = Array.isArray(browser?.viewports) ? browser.viewports.find((item) => item?.name === requiredViewport) : null;
    if (!viewport) errors.push(`browser_delivery.viewports 缺少 ${requiredViewport}`);
    else {
      requiredString(viewport, "size", `browser_delivery.viewports.${requiredViewport}`, errors);
      requiredString(viewport, "screenshot_ref", `browser_delivery.viewports.${requiredViewport}`, errors);
      if (!allowTemplate) requiredPassed(viewport, "result", `browser_delivery.viewports.${requiredViewport}`, errors, allowTemplate);
    }
  }

  const qa = data.design_qa;
  requiredString(qa, "report_ref", "design_qa", errors);
  if (nonEmpty(qa?.report_ref) && !/^docs\/\.scratch\/[^/]+\/verification\/design-qa\.md$/.test(qa.report_ref) && !(allowTemplate && /<[^>]+>/.test(qa.report_ref))) errors.push("design_qa.report_ref 必须是 feature 级 verification/design-qa.md");
  if (!allowTemplate) requiredPassed(qa, "result", "design_qa", errors, allowTemplate);
  for (const axis of ["visual", "layout", "interaction", "content", "accessibility", "cross_platform"]) if (!allowTemplate) requiredPassed(qa?.axes, axis, "design_qa.axes", errors, allowTemplate); else required(qa?.axes, axis, "design_qa.axes", errors);

  const handoff = data.implementation_handoff;
  if (handoff?.prototype_code_reusable !== false) errors.push("implementation_handoff.prototype_code_reusable 必须为 false");
  requireArray(handoff, "production_component_assumptions", "implementation_handoff", errors);
  requireArray(handoff, "verification_targets", "implementation_handoff", errors);
  if (Array.isArray(handoff?.verification_targets)) {
    for (const [index, target] of handoff.verification_targets.entries()) {
      requiredString(target, "behavior", `implementation_handoff.verification_targets.${index}`, errors);
      requiredString(target, "target_stage", `implementation_handoff.verification_targets.${index}`, errors);
      if (!allowTemplate && !["frontend-implementation-plan", "frontend-implementation-verification"].includes(target?.target_stage)) errors.push(`implementation_handoff.verification_targets.${index}.target_stage 必须属于前端实现阶段`);
    }
  }

  if (!Array.isArray(data.gaps)) errors.push("root.gaps 必须是数组");
  if (!Array.isArray(data.blockers)) errors.push("root.blockers 必须是数组");
  if (!allowTemplate && Array.isArray(data.blockers) && data.blockers.length > 0) errors.push("存在 blockers，不能通过原型验证");
  if (!allowTemplate) {
    requiredPassed(data.review, "result", "review", errors, allowTemplate);
    requiredString(data.review, "review_ref", "review", errors);
    requiredPassed(data.user_confirmation, "result", "user_confirmation", errors, allowTemplate);
    for (const field of ["confirmation_ref", "confirmed_decision"]) requiredString(data.user_confirmation, field, "user_confirmation", errors);
    requireArray(data.user_confirmation, "operable_scope", "user_confirmation", errors, { nonEmpty: true });
    requireArray(data.user_confirmation, "simulations_or_gaps", "user_confirmation", errors);
  }

  for (const legacy of ["prototype_stack", "visual_semantic_mapping", "antd", "browser_verification", "accessibility_verification"]) if (data[legacy] !== undefined) errors.push(`schema v3 禁止旧字段 root.${legacy}`);
}

function validateProfileV3(data, errors, allowTemplate) {
  const blocks = object(data.profile_evidence) ? Object.keys(data.profile_evidence) : [];
  const expected = PROFILE_BLOCK[data.prototype_profile];
  if (blocks.length !== 1 || blocks[0] !== expected) errors.push(`profile_evidence 必须且只能包含 ${expected}`);
  const evidence = data.profile_evidence?.[expected];
  if (!object(evidence)) return;
  if (data.prototype_profile === "H1") {
    if (evidence.runtime_build_required !== false) errors.push("H1 runtime_build_required 必须为 false");
    for (const field of ["key_interactions_result", "keyboard_result", "focus_result", "contrast_result"]) requiredPassed(evidence, field, "profile_evidence.visual_review", errors, allowTemplate);
    validateConditionalCheck(evidence.zoom_200, "profile_evidence.visual_review.zoom_200", errors, allowTemplate);
    validateConditionalCheck(evidence.reduced_motion, "profile_evidence.visual_review.reduced_motion", errors, allowTemplate);
    for (const forbidden of ["package_manifest_ref", "lockfile_ref", "antd", "prototype_library_facts", "actual_antd_version"]) if (evidence[forbidden] !== undefined) errors.push(`H1 禁止字段 ${forbidden}`);
  }
  if (data.prototype_profile === "H2") {
    const implementation = evidence.implementation;
    for (const field of ["framework", "runtime_build_required"]) required(implementation, field, "profile_evidence.flow_review.implementation", errors);
    if (implementation?.runtime_build_required === true) {
      for (const field of ["package_manager", "package_manifest_ref", "lockfile_ref", "build_command"]) requiredString(implementation, field, "profile_evidence.flow_review.implementation", errors);
      requiredPassed(implementation, "build_result", "profile_evidence.flow_review.implementation", errors, allowTemplate);
    }
    for (const field of ["main_flow_result", "exceptional_state_result", "keyboard_result", "focus_result", "contrast_result", "zoom_200_result", "reduced_motion_result"]) requiredPassed(evidence, field, "profile_evidence.flow_review", errors, allowTemplate);
    requiredString(evidence, "exceptional_state_ref", "profile_evidence.flow_review", errors);
    validateConditionalCheck(evidence.visual_regression, "profile_evidence.flow_review.visual_regression", errors, allowTemplate);
    const facts = evidence.prototype_library_facts;
    required(facts, "applicable", "profile_evidence.flow_review.prototype_library_facts", errors);
    requiredString(facts, "component_basis", "profile_evidence.flow_review.prototype_library_facts", errors);
    if (facts?.applicable === true) {
      for (const field of ["source", "manifest_ref", "manifest_digest", "canonical_design_digest", "project_token_baseline_digest"]) requiredString(facts, field, "profile_evidence.flow_review.prototype_library_facts", errors);
      requireArray(facts, "components_covered", "profile_evidence.flow_review.prototype_library_facts", errors, { nonEmpty: true });
      if (facts.component_basis === "react-antd-6" && facts.actual_antd_version !== undefined) {
        if (!allowTemplate && !antdSemver.test(facts.actual_antd_version ?? "")) errors.push("H2 actual_antd_version 必须是明确 antd 6.x semver");
      } else {
        for (const field of ["library_package", "library_version"]) requiredString(facts, field, "profile_evidence.flow_review.prototype_library_facts", errors);
        if (!allowTemplate && !exactSemver.test(facts.library_version ?? "")) errors.push("H2 library_version 必须是明确 semver");
        if (facts.component_basis === "vue-antdv-next" && facts.library_package !== "antdv-next") errors.push("vue-antdv-next 必须使用 antdv-next package");
        if (facts.component_basis === "react-antd-6" && (facts.library_package !== "antd" || (!allowTemplate && !antdSemver.test(facts.library_version ?? "")))) errors.push("react-antd-6 必须使用明确的 antd 6.x 版本");
      }
      if (!["fact-pack", "cli-run"].includes(facts.source)) errors.push("H2 prototype_library_facts.source 必须为 fact-pack/cli-run");
      if (!allowTemplate && facts.project_token_baseline_digest !== data.design_baseline.project_token_baseline_digest) errors.push("H2 fact pack 的项目 Token digest 已失效");
      if (!allowTemplate && facts.canonical_design_digest !== data.design_baseline.canonical_design_digest) errors.push("H2 fact pack 的 DESIGN.md digest 已失效");
      if (!allowTemplate && facts.new_api_uncertainty !== false) errors.push("H2 fact pack 存在新 API 疑问，必须增量查询");
    }
    for (const forbidden of ["real_component_verified", "implementation_repo_ref", "component_library_version", "harness_ref", "story_refs"]) if (evidence[forbidden] !== undefined) errors.push(`H2 原型禁止生产组件字段 ${forbidden}`);
  }
}

export function validatePrototypeEvidence(data, { allowTemplate = false, allowLegacy = false } = {}) {
  const errors = [];
  const warnings = [];
  if (!object(data)) return { errors: ["原型证据必须是对象"], warnings };
  if ([1, 2].includes(data.schema_version)) {
    if (!allowLegacy) errors.push(`schema_version ${data.schema_version} 是只读旧证据；在途工作关闭 gate.prototype-verified 前必须迁移到 3`);
    else warnings.push(`legacy prototype evidence schema v${data.schema_version}; read-only`);
    return { errors, warnings };
  }
  if (data.schema_version !== 3) return { errors: ["schema_version 必须为 3"], warnings };
  validateCommonV3(data, errors, allowTemplate);
  validateProfileV3(data, errors, allowTemplate);
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

export async function prepareStaticPrototype({ projectRoot, root, feature }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(feature ?? "")) throw new TypeError("feature 必须是小写 kebab-case");
  const { resolvedRoot } = safePrototypeRoot(projectRoot, root, feature);
  await mkdir(resolvedRoot, { recursive: true });
  for (const forbidden of ["package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock"]) if (existsSync(path.join(resolvedRoot, forbidden))) throw new TypeError(`H1 静态适配器拒绝已有 ${forbidden}`);
  await writeFile(path.join(resolvedRoot, "index.html"), `<!doctype html>\n<html lang="zh-CN">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <title>${feature} · H1 visual review</title>\n  <link rel="stylesheet" href="./styles.css">\n</head>\n<body>\n  <main id="prototype" aria-labelledby="page-title">\n    <header><p class="eyebrow">H1 · visual-review</p><h1 id="page-title">${feature}</h1></header>\n    <section class="surface" aria-label="原型内容"><p>请在此实现已评审的视觉布局与少量关键交互。</p><button type="button" id="prototype-action">关键操作</button><p role="status" id="prototype-status"></p></section>\n  </main>\n  <script>document.querySelector('#prototype-action').addEventListener('click',()=>{document.querySelector('#prototype-status').textContent='交互已触发';});</script>\n</body>\n</html>\n`);
  await writeFile(path.join(resolvedRoot, "styles.css"), `@import url("../../../../design/tokens/variables.css");\n:root{font-family:var(--brand-font-family,system-ui,sans-serif);color:var(--brand-color-text);background:var(--brand-color-bg-layout)}*{box-sizing:border-box}body{margin:0}main{max-width:1440px;margin:auto;padding:var(--brand-size-lg)}.eyebrow{color:var(--brand-color-primary)}.surface{padding:var(--yss-card-compact-padding,var(--brand-size));border-radius:var(--brand-border-radius-lg);background:var(--brand-color-bg-container);box-shadow:0 1px 3px rgb(0 0 0/.08)}button{min-height:var(--yss-control-height-compact);padding:var(--brand-size-xxs) var(--brand-size-sm);border:0;border-radius:var(--brand-border-radius);color:var(--yss-color-on-primary,var(--brand-color-bg-container));background:var(--yss-color-primary-control,var(--brand-color-primary))}button:hover{background:var(--yss-color-primary-control-hover,var(--brand-color-primary-hover))}button:focus-visible{outline:3px solid color-mix(in srgb,var(--yss-color-primary-control,var(--brand-color-primary)),white 55%);outline-offset:2px}@media(max-width:576px){main{padding:var(--brand-size-sm)}.surface{padding:var(--brand-size-sm)}}\n`);
  const manifest = { schema_version: 1, feature, prototype_profile: "H1", profile_kind: "visual-review", runtime_build_required: false, entry: `docs/.scratch/${feature}/design/prototypes/index.html`, theme_source: "docs/design/tokens/variables.css" };
  await writeFile(path.join(resolvedRoot, "yss-prototype-adapter.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function writeIfMissing(file, content) {
  if (!existsSync(file)) await writeFile(file, content);
}

async function prepareVueFlowPrototype({ projectRoot, root, feature, libraryVersion, pnpmVersion, vueVersion, viteVersion, vuePluginVersion, factPackRef }) {
  for (const [field, version] of Object.entries({ libraryVersion, pnpmVersion, vueVersion, viteVersion, vuePluginVersion })) {
    if (!exactSemver.test(version ?? "")) throw new TypeError(`${field} 必须是明确 semver`);
  }
  const { resolvedProject, resolvedRoot } = safePrototypeRoot(projectRoot, root, feature);
  const themeSourcePath = path.join(resolvedProject, "docs/design/tokens/theme.json");
  if (!existsSync(themeSourcePath)) throw new TypeError(`缺少项目主题: ${themeSourcePath}`);
  const themeSource = JSON.parse(await readFile(themeSourcePath, "utf8"));
  await mkdir(path.join(resolvedRoot, "src"), { recursive: true });
  const packagePath = path.join(resolvedRoot, "package.json");
  const pkg = existsSync(packagePath) ? JSON.parse(await readFile(packagePath, "utf8")) : {};
  if (pkg.dependencies?.react || pkg.dependencies?.antd) throw new TypeError("Vue/Antdv Next H2 不得静默覆盖 React/AntD starter；请显式选择 react-antd-6 或使用新的原型目录");
  pkg.name ??= `${feature}-prototype`;
  pkg.version ??= "0.0.0";
  pkg.private = true;
  pkg.type = "module";
  pkg.packageManager = `pnpm@${pnpmVersion}`;
  pkg.scripts = { dev: "vite --host 127.0.0.1", build: "vite build", preview: "vite preview --host 127.0.0.1", ...(pkg.scripts ?? {}) };
  pkg.dependencies = { ...(pkg.dependencies ?? {}), "@vitejs/plugin-vue": vuePluginVersion, "antdv-next": libraryVersion, vite: viteVersion, vue: vueVersion };
  await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  await writeIfMissing(path.join(resolvedRoot, "index.html"), `<!doctype html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${feature} · H2 flow review</title>\n</head>\n<body>\n  <div id="app"></div>\n  <script type="module" src="/src/main.js"></script>\n</body>\n</html>\n`);
  await writeIfMissing(path.join(resolvedRoot, "vite.config.mjs"), `import { defineConfig } from "vite";\nimport vue from "@vitejs/plugin-vue";\n\nexport default defineConfig({ plugins: [vue()] });\n`);
  await writeIfMissing(path.join(resolvedRoot, "src/main.js"), `import { createApp } from "vue";\nimport Antdv from "antdv-next";\nimport App from "./App.vue";\nimport "antdv-next/dist/reset.css";\nimport "./styles.css";\n\ncreateApp(App).use(Antdv).mount("#app");\n`);
  await writeIfMissing(path.join(resolvedRoot, "src/App.vue"), `<script setup>\nimport { computed, ref } from "vue";\nimport { createYssTheme } from "./yss-theme.js";\n\nconst dark = ref(false);\nconst yssTheme = computed(() => createYssTheme({ dark: dark.value }));\n</script>\n\n<template>\n  <a-config-provider :theme="yssTheme">\n    <main aria-labelledby="page-title">\n      <p class="eyebrow">H2 · flow-review</p>\n      <h1 id="page-title">${feature}</h1>\n      <p>请在此实现已评审的主流程与关键异常状态。</p>\n      <a-button type="primary" @click="dark = !dark">切换主题以验证反馈</a-button>\n    </main>\n  </a-config-provider>\n</template>\n`);
  await writeIfMissing(path.join(resolvedRoot, "src/styles.css"), `:root{font-family:system-ui,sans-serif;color:var(--text-color,#1f2329);background:var(--layout-background,#f0f2f5)}*{box-sizing:border-box}body{margin:0}main{max-width:1440px;margin:auto;padding:24px}.eyebrow{color:var(--brand-primary,#3371ff)}@media(max-width:576px){main{padding:12px}}\n`);
  const generated = ['import { theme } from "antdv-next";', "", `const source = ${JSON.stringify(themeSource, null, 2)};`, 'const layoutKeys = new Set(["layoutHeaderHeight", "layoutSiderBackground", "layoutBodyBackground"]);', "export const yssLayoutTokens = Object.fromEntries(Object.entries(source.token ?? {}).filter(([key]) => layoutKeys.has(key)));", "const seed = Object.fromEntries(Object.entries(source.token ?? {}).filter(([key]) => !layoutKeys.has(key)));", "export function createYssTheme({ dark = false } = {}) {", "  return { algorithm: dark ? [theme.darkAlgorithm, theme.compactAlgorithm] : [theme.defaultAlgorithm, theme.compactAlgorithm], token: seed };", "}", ""].join("\n");
  await writeFile(path.join(resolvedRoot, "src/yss-theme.js"), generated);
  const manifest = { schema_version: 3, feature, prototype_profile: "H2", profile_kind: "flow-review", design_standard: "yss-antdv-next", component_basis: "vue-antdv-next", framework: "vue", library: { package: "antdv-next", version: libraryVersion }, framework_packages: { vue: vueVersion, vite: viteVersion, "@vitejs/plugin-vue": vuePluginVersion }, package_manager: `pnpm@${pnpmVersion}`, fact_pack_ref: factPackRef, theme_source: "docs/design/tokens/theme.json", theme_adapter: `docs/.scratch/${feature}/design/prototypes/src/yss-theme.js`, next_commands: ["pnpm install", "pnpm build"] };
  await writeFile(path.join(resolvedRoot, "yss-prototype-adapter.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function prepareReactFlowPrototype({ projectRoot, root, feature, targetAntdVersion, pnpmVersion }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(feature ?? "")) throw new TypeError("feature 必须是小写 kebab-case");
  if (!antdSemver.test(targetAntdVersion ?? "")) throw new TypeError("targetAntdVersion 必须是明确的 antd 6.x semver");
  if (!exactSemver.test(pnpmVersion ?? "")) throw new TypeError("pnpmVersion 必须是明确 semver");
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
  const generated = ['import { theme } from "antd";', "", `const source = ${JSON.stringify(themeSource, null, 2)};`, 'const layoutKeys = new Set(["layoutHeaderHeight", "layoutSiderBackground", "layoutBodyBackground"]);', "export const yssLayoutTokens = Object.fromEntries(Object.entries(source.token ?? {}).filter(([key]) => layoutKeys.has(key)));", "export const yssTheme = {", "  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],", "  token: Object.fromEntries(Object.entries(source.token ?? {}).filter(([key]) => !layoutKeys.has(key)))", "};", ""].join("\n");
  await mkdir(path.join(resolvedRoot, "src"), { recursive: true });
  await writeFile(path.join(resolvedRoot, "src/yss-theme.js"), generated);
  const manifest = { schema_version: 2, feature, prototype_profile: "H2", profile_kind: "flow-review", design_standard: "ant-design-v6", target_antd_version: targetAntdVersion, prototype_framework: "react", package_manager: `pnpm@${pnpmVersion}`, theme_source: "docs/design/tokens/theme.json", theme_adapter: `docs/.scratch/${feature}/design/prototypes/src/yss-theme.js`, next_commands: ["pnpm install", "pnpm build"] };
  await writeFile(path.join(resolvedRoot, "yss-prototype-adapter.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function prepareFlowPrototype({ projectRoot, root, feature, componentBasis, libraryVersion, targetAntdVersion, pnpmVersion, vueVersion = DEFAULT_VUE_VERSION, viteVersion = DEFAULT_VITE_VERSION, vuePluginVersion = DEFAULT_VUE_PLUGIN_VERSION, factPackRef }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(feature ?? "")) throw new TypeError("feature 必须是小写 kebab-case");
  const resolvedBasis = componentBasis ?? (targetAntdVersion ? "react-antd-6" : DEFAULT_H2_COMPONENT_BASIS);
  if (!H2_COMPONENT_BASES.has(resolvedBasis)) throw new TypeError(`componentBasis 必须为 ${[...H2_COMPONENT_BASES].join("/")}`);
  if (resolvedBasis === "react-antd-6") return prepareReactFlowPrototype({ projectRoot, root, feature, targetAntdVersion: targetAntdVersion ?? libraryVersion, pnpmVersion });
  const resolvedLibraryVersion = libraryVersion ?? DEFAULT_ANTDV_NEXT_VERSION;
  return prepareVueFlowPrototype({ projectRoot, root, feature, libraryVersion: resolvedLibraryVersion, pnpmVersion, vueVersion, viteVersion, vuePluginVersion, factPackRef: factPackRef ?? `docs/design/facts/antdv-next/${resolvedLibraryVersion}/manifest.json` });
}

export const preparePrototype = prepareFlowPrototype;

export async function validatePrototypeProject({ root, profile = "H2", componentBasis, libraryVersion, targetAntdVersion }) {
  const errors = [];
  if (!Object.hasOwn(PROFILE_KIND, profile)) return { errors: ["profile 必须为 H1/H2"] };
  if (!existsSync(path.join(root, "index.html"))) errors.push("缺少浏览器入口 index.html");
  if (!existsSync(path.join(root, "yss-prototype-adapter.json"))) errors.push("缺少 yss-prototype-adapter.json");
  if (profile === "H1") {
    for (const forbidden of ["package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock"] ) if (existsSync(path.join(root, forbidden))) errors.push(`H1 不得依赖 ${forbidden}`);
    const stylesPath = path.join(root, "styles.css");
    if (!existsSync(stylesPath)) errors.push("H1 缺少 styles.css");
    else {
      const styles = await readFile(stylesPath, "utf8");
      for (const token of ["--brand-font-family", "--brand-color-text", "--brand-color-bg-layout", "--brand-color-bg-container", "--yss-color-primary-control", "--yss-control-height-compact"]) if (!styles.includes(token)) errors.push(`H1 styles.css 未消费项目 Token ${token}`);
      for (const staleAlias of ["--font-family", "--layout-background", "--container-background", "--brand-primary"]) if (styles.includes(staleAlias)) errors.push(`H1 styles.css 使用过时变量 ${staleAlias}`);
      for (const hardcodedDeclaration of ["padding:24px", "padding:20px", "min-height:32px", "border-radius:8px", "border-radius:6px"]) if (styles.includes(hardcodedDeclaration)) errors.push(`H1 styles.css 硬编码视觉基线 ${hardcodedDeclaration}`);
    }
    return { errors };
  }
  const packagePath = path.join(root, "package.json");
  if (!existsSync(packagePath)) return { errors: [...errors, "缺少 package.json"] };
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  if (profile === "H2") {
    const adapterPath = path.join(root, "yss-prototype-adapter.json");
    const adapter = existsSync(adapterPath) ? JSON.parse(await readFile(adapterPath, "utf8")) : {};
    const resolvedBasis = componentBasis ?? (targetAntdVersion ? "react-antd-6" : adapter.component_basis ?? (adapter.prototype_framework === "react" ? "react-antd-6" : DEFAULT_H2_COMPONENT_BASIS));
    if (resolvedBasis === "react-antd-6") {
      const resolvedVersion = targetAntdVersion ?? libraryVersion ?? adapter.target_antd_version;
      if (pkg.dependencies?.antd !== resolvedVersion) errors.push(`package.json 必须精确锁定 antd ${resolvedVersion}`);
      if (!antdSemver.test(resolvedVersion ?? "")) errors.push("React H2 libraryVersion 必须是 antd 6.x semver");
      if (!existsSync(path.join(root, "src/yss-theme.js"))) errors.push("React/AntD H2 缺少 src/yss-theme.js");
      const sourceFiles = ["src/App.jsx", "src/App.tsx", "src/main.jsx", "src/main.tsx"].filter((file) => existsSync(path.join(root, file)));
      const source = (await Promise.all(sourceFiles.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
      if (!/ConfigProvider/.test(source) || !/yssTheme/.test(source)) errors.push("React/AntD H2 入口必须通过 ConfigProvider 消费 yssTheme");
    } else if (resolvedBasis === "vue-antdv-next") {
      const resolvedVersion = libraryVersion ?? adapter.library?.version ?? DEFAULT_ANTDV_NEXT_VERSION;
      if (pkg.dependencies?.["antdv-next"] !== resolvedVersion) errors.push(`package.json 必须精确锁定 antdv-next ${resolvedVersion}`);
      if (!exactSemver.test(resolvedVersion ?? "")) errors.push("Vue H2 libraryVersion 必须是明确 semver");
      for (const [name, expected] of Object.entries(adapter.framework_packages ?? {})) if (pkg.dependencies?.[name] !== expected) errors.push(`package.json 必须精确锁定 ${name} ${expected}`);
      for (const file of ["vite.config.mjs", "src/main.js", "src/App.vue", "src/yss-theme.js"]) if (!existsSync(path.join(root, file))) errors.push(`Vue/Antdv Next H2 缺少 ${file}`);
      const sourceFiles = ["src/App.vue", "src/main.js", "src/yss-theme.js"].filter((file) => existsSync(path.join(root, file)));
      const source = (await Promise.all(sourceFiles.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
      if (!/a-config-provider/.test(source) || !/yssTheme/.test(source)) errors.push("Vue/Antdv Next H2 必须通过 ConfigProvider 消费 yssTheme");
      if (!/compactAlgorithm/.test(source)) errors.push("Vue/Antdv Next H2 主题必须消费 compactAlgorithm");
      if (adapter.schema_version !== 3 || adapter.component_basis !== "vue-antdv-next" || adapter.framework !== "vue") errors.push("Vue/Antdv Next H2 adapter manifest 必须使用 provider-neutral schema v3");
    } else {
      errors.push(`不支持的 H2 component basis: ${resolvedBasis}`);
    }
    if (!String(pkg.packageManager ?? "").startsWith("pnpm@")) errors.push("H2 package.json 必须记录实际 pnpm packageManager");
    if (!existsSync(path.join(root, "pnpm-lock.yaml"))) errors.push("H2 缺少 pnpm-lock.yaml");
  }
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
  if (command === "prepare-static") {
    process.stdout.write(`${JSON.stringify(await prepareStaticPrototype({ projectRoot: parsed["project-root"], root: parsed.root, feature: parsed.feature }), null, 2)}\n`);
    return;
  }
  if (["prepare", "prepare-flow"].includes(command)) {
    process.stdout.write(`${JSON.stringify(await prepareFlowPrototype({ projectRoot: parsed["project-root"], root: parsed.root, feature: parsed.feature, componentBasis: parsed["component-basis"], libraryVersion: parsed["library-version"], targetAntdVersion: parsed["target-antd-version"], pnpmVersion: parsed["pnpm-version"], vueVersion: parsed["vue-version"] ?? DEFAULT_VUE_VERSION, viteVersion: parsed["vite-version"] ?? DEFAULT_VITE_VERSION, vuePluginVersion: parsed["vue-plugin-version"] ?? DEFAULT_VUE_PLUGIN_VERSION, factPackRef: parsed["fact-pack-ref"] }), null, 2)}\n`);
    return;
  }
  if (command === "validate-project") {
    const result = await validatePrototypeProject({ root: parsed.root, profile: parsed.profile ?? "H2", componentBasis: parsed["component-basis"], libraryVersion: parsed["library-version"], targetAntdVersion: parsed["target-antd-version"] });
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
  throw new TypeError("usage: prototype-contract.mjs prepare-static|prepare-flow|validate-project|validate-evidence ...");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
