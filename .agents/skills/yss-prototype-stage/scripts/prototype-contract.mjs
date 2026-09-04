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
      for (const field of ["source", "actual_antd_version", "manifest_ref", "manifest_digest", "project_token_baseline_digest"]) requiredString(facts, field, "profile_evidence.flow_review.prototype_library_facts", errors);
      requireArray(facts, "components_covered", "profile_evidence.flow_review.prototype_library_facts", errors, { nonEmpty: true });
      if (!allowTemplate && !antdSemver.test(facts.actual_antd_version ?? "")) errors.push("H2 actual_antd_version 必须是明确 antd 6.x semver");
      if (!["fact-pack", "cli-run"].includes(facts.source)) errors.push("H2 prototype_library_facts.source 必须为 fact-pack/cli-run");
      if (!allowTemplate && facts.project_token_baseline_digest !== data.design_baseline.project_token_baseline_digest) errors.push("H2 fact pack 的项目 Token digest 已失效");
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
  await writeFile(path.join(resolvedRoot, "styles.css"), `@import url("../../../../design/tokens/variables.css");\n:root{font-family:var(--font-family,system-ui,sans-serif);color:var(--text-color,#1f2329);background:var(--layout-background,#f0f2f5)}*{box-sizing:border-box}body{margin:0}main{max-width:1440px;margin:auto;padding:24px}.eyebrow{color:var(--brand-primary,#3371ff)}.surface{padding:20px;border-radius:8px;background:var(--container-background,#fff);box-shadow:0 1px 3px rgb(0 0 0/.08)}button{min-height:32px;padding:0 16px;border:0;border-radius:6px;color:#fff;background:var(--brand-primary,#3371ff)}button:focus-visible{outline:3px solid color-mix(in srgb,var(--brand-primary,#3371ff),white 55%);outline-offset:2px}@media(max-width:576px){main{padding:12px}.surface{padding:12px}}\n`);
  const manifest = { schema_version: 1, feature, prototype_profile: "H1", profile_kind: "visual-review", runtime_build_required: false, entry: `docs/.scratch/${feature}/design/prototypes/index.html`, theme_source: "docs/design/tokens/variables.css" };
  await writeFile(path.join(resolvedRoot, "yss-prototype-adapter.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function prepareFlowPrototype({ projectRoot, root, feature, targetAntdVersion, pnpmVersion }) {
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

export const preparePrototype = prepareFlowPrototype;

export async function validatePrototypeProject({ root, profile = "H2", targetAntdVersion }) {
  const errors = [];
  if (!Object.hasOwn(PROFILE_KIND, profile)) return { errors: ["profile 必须为 H1/H2"] };
  if (!existsSync(path.join(root, "index.html"))) errors.push("缺少浏览器入口 index.html");
  if (!existsSync(path.join(root, "yss-prototype-adapter.json"))) errors.push("缺少 yss-prototype-adapter.json");
  if (profile === "H1") {
    for (const forbidden of ["package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock"] ) if (existsSync(path.join(root, forbidden))) errors.push(`H1 不得依赖 ${forbidden}`);
    if (!existsSync(path.join(root, "styles.css"))) errors.push("H1 缺少 styles.css");
    return { errors };
  }
  const packagePath = path.join(root, "package.json");
  if (!existsSync(packagePath)) return { errors: [...errors, "缺少 package.json"] };
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  if (profile === "H2") {
    if (targetAntdVersion) {
      if (pkg.dependencies?.antd !== targetAntdVersion) errors.push(`package.json 必须精确锁定 antd ${targetAntdVersion}`);
      if (!antdSemver.test(targetAntdVersion)) errors.push("targetAntdVersion 必须是 antd 6.x semver");
      if (!existsSync(path.join(root, "src/yss-theme.js"))) errors.push("React/AntD H2 缺少 src/yss-theme.js");
      const sourceFiles = ["src/App.jsx", "src/App.tsx", "src/main.jsx", "src/main.tsx"].filter((file) => existsSync(path.join(root, file)));
      const source = (await Promise.all(sourceFiles.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
      if (!/ConfigProvider/.test(source) || !/yssTheme/.test(source)) errors.push("React/AntD H2 入口必须通过 ConfigProvider 消费 yssTheme");
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
    process.stdout.write(`${JSON.stringify(await prepareFlowPrototype({ projectRoot: parsed["project-root"], root: parsed.root, feature: parsed.feature, targetAntdVersion: parsed["target-antd-version"], pnpmVersion: parsed["pnpm-version"] }), null, 2)}\n`);
    return;
  }
  if (command === "validate-project") {
    const result = await validatePrototypeProject({ root: parsed.root, profile: parsed.profile ?? "H2", targetAntdVersion: parsed["target-antd-version"] });
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
