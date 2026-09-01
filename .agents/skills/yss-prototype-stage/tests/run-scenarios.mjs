#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  preparePrototype,
  validatePrototypeEvidence,
  validatePrototypeProject
} from "../scripts/prototype-contract.mjs";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "yss-prototype-contract-"));
const projectRoot = path.join(tempRoot, "project");
const feature = "order-review";
const prototypeRoot = path.join(projectRoot, "docs/.scratch", feature, "design/prototypes");
await mkdir(path.join(prototypeRoot, "src"), { recursive: true });
await mkdir(path.join(projectRoot, "docs/design/tokens"), { recursive: true });
await writeFile(path.join(prototypeRoot, "package.json"), JSON.stringify({
  name: "order-review-prototype",
  private: true,
  type: "module",
  scripts: { build: "vite build" },
  dependencies: { react: "19.2.0", "react-dom": "19.2.0", vite: "6.4.2" }
}, null, 2));
await writeFile(path.join(projectRoot, "docs/design/tokens/theme.json"), JSON.stringify({
  algorithm: "default",
  token: {
    colorPrimary: "#3371ff",
    borderRadius: 6,
    controlHeight: 32,
    layoutHeaderHeight: 64
  }
}, null, 2));

const before = await validatePrototypeProject({ root: prototypeRoot, targetAntdVersion: "6.6.2" });
assert(before.errors.some((message) => message.includes("antd")), "RED: starter without antd must fail");
assert(before.errors.some((message) => message.includes("pnpm-lock.yaml")), "RED: missing pnpm lockfile must fail");

await preparePrototype({ projectRoot, root: prototypeRoot, feature, targetAntdVersion: "6.6.2", pnpmVersion: "10.15.0" });
const pkg = JSON.parse(await readFile(path.join(prototypeRoot, "package.json"), "utf8"));
assert.equal(pkg.dependencies.antd, "6.6.2");
assert.equal(pkg.packageManager, "pnpm@10.15.0");
assert.match(await readFile(path.join(prototypeRoot, "src/yss-theme.js"), "utf8"), /compactAlgorithm/);

await writeFile(path.join(prototypeRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
await writeFile(path.join(prototypeRoot, "src/App.jsx"), [
  'import { ConfigProvider, Button } from "antd";',
  'import { yssTheme } from "./yss-theme.js";',
  'export function App() { return <ConfigProvider theme={yssTheme}><Button type="primary">提交</Button></ConfigProvider>; }'
].join("\n"));
const after = await validatePrototypeProject({ root: prototypeRoot, targetAntdVersion: "6.6.2" });
assert.deepEqual(after.errors, []);

const wrongTarget = await validatePrototypeProject({ root: prototypeRoot, targetAntdVersion: "6.6.1" });
assert(wrongTarget.errors.some((message) => message.includes("精确锁定 antd 6.6.1")), "target 与实际 antd 版本不一致必须失败");

const npmPackage = structuredClone(pkg);
npmPackage.packageManager = "npm@11.0.0";
await writeFile(path.join(prototypeRoot, "package.json"), JSON.stringify(npmPackage, null, 2));
const npmProject = await validatePrototypeProject({ root: prototypeRoot, targetAntdVersion: "6.6.2" });
assert(npmProject.errors.some((message) => message.includes("packageManager")), "原型包管理器漂移到 npm 必须失败");
await writeFile(path.join(prototypeRoot, "package.json"), JSON.stringify(pkg, null, 2));

await assert.rejects(
  preparePrototype({
    projectRoot,
    root: path.join(projectRoot, "prototypes", feature),
    feature,
    targetAntdVersion: "6.6.2",
    pnpmVersion: "10.15.0"
  }),
  /docs\/.scratch/,
  "非标准原型目录必须被拒绝"
);

const validEvidence = {
  schema_version: 2,
  feature,
  prototype_ref: `docs/.scratch/${feature}/design/prototypes/index.html`,
  prototype_stack: {
    framework: "react",
    package_manager: "pnpm",
    package_manifest_ref: `docs/.scratch/${feature}/design/prototypes/package.json`,
    lockfile_ref: `docs/.scratch/${feature}/design/prototypes/pnpm-lock.yaml`,
    source_entry_ref: `docs/.scratch/${feature}/design/prototypes/src/App.jsx`,
    build_entry_ref: `docs/.scratch/${feature}/design/prototypes/dist/index.html`,
    build_command: "pnpm build",
    build_result: "passed",
    actual_antd_version: "6.6.2"
  },
  design_baseline: {
    design_standard: "ant-design-v6",
    project_design_ref: "docs/design/design.md",
    project_token_refs: ["docs/design/tokens/theme.json"],
    theme_adapter_ref: `docs/.scratch/${feature}/design/prototypes/src/yss-theme.js`,
    project_override_reviewed: true
  },
  visual_semantic_mapping: {
    runtime_component_library: "ant-design-vue-4.x",
    runtime_version_source: "implementation-lockfile",
    components: [{
      semantic_role: "primary-action",
      antd_v6_component: "Button",
      project_token_refs: ["colorPrimary"],
      yss_or_antdv_target: "YButton",
      state_mapping: ["default", "hover", "active", "disabled", "loading"],
      react_only_api_not_copied: true,
      verification_ref: "verification/button-states.png"
    }]
  },
  antd: { target_antd_version: "6.6.2", queries: { design_md: "verification/antd-design.json", components: [] } },
  browser_verification: { rendered_nonblank: true, viewports: [], main_flow_result: "passed", failure_permission_or_conflict_result: "passed", console_error_ref: "verification/console.txt" },
  design_qa: { report_ref: `docs/.scratch/${feature}/verification/design-qa.md`, result: "passed" },
  accessibility_verification: {
    contrast_results_ref: "verification/contrast.json",
    keyboard_navigation_result: "passed",
    focus_visible_and_order_result: "passed",
    semantic_label_dialog_result: "passed",
    zoom_200_result: "passed",
    reduced_motion_result: "passed",
    target_size_result: "passed",
    automated_scan: { tool: "axe", version: "4", result: "passed", ref: "verification/axe.json" }
  },
  review: { prototype_review_ref: "design/review.md", result: "approved" },
  user_confirmation: { confirmation_ref: "design/confirmation.md", result: "approved" },
  blockers: []
};
assert.deepEqual(validatePrototypeEvidence(validEvidence).errors, []);

const missingMapping = structuredClone(validEvidence);
delete missingMapping.visual_semantic_mapping;
assert(validatePrototypeEvidence(missingMapping).errors.some((message) => message.includes("visual_semantic_mapping")));

const copiedReactApi = structuredClone(validEvidence);
copiedReactApi.visual_semantic_mapping.components[0].react_only_api_not_copied = false;
assert(validatePrototypeEvidence(copiedReactApi).errors.some((message) => message.includes("React-only")));

const inaccessible = structuredClone(validEvidence);
inaccessible.accessibility_verification.contrast_results_ref = "";
assert(validatePrototypeEvidence(inaccessible).errors.some((message) => message.includes("contrast_results_ref")));

const wrongQaRoot = structuredClone(validEvidence);
wrongQaRoot.design_qa.report_ref = "docs/design/design-qa.md";
assert(validatePrototypeEvidence(wrongQaRoot).errors.some((message) => message.includes("design_qa.report_ref")));

const versionMismatch = structuredClone(validEvidence);
versionMismatch.antd.target_antd_version = "6.6.1";
assert(validatePrototypeEvidence(versionMismatch).errors.some((message) => message.includes("target_antd_version")));

const unresolvedBlocker = structuredClone(validEvidence);
unresolvedBlocker.blockers = ["缺少权限失败态"];
assert(validatePrototypeEvidence(unresolvedBlocker).errors.some((message) => message.includes("blockers")));

process.stdout.write("YSS prototype contract scenarios passed\n");
