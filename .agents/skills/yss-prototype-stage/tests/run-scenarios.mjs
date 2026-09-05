#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareFlowPrototype, prepareStaticPrototype, validatePrototypeEvidence, validatePrototypeProject } from "../scripts/prototype-contract.mjs";
import { sealVisualBaseline, validateVisualBaseline } from "../scripts/visual-baseline-contract.mjs";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "yss-prototype-contract-"));
const projectRoot = path.join(tempRoot, "project");
const feature = "order-review";
await mkdir(path.join(projectRoot, "docs/design/tokens"), { recursive: true });
await writeFile(path.join(projectRoot, "DESIGN.md"), "---\nversion: alpha\n---\n");
await writeFile(path.join(projectRoot, "docs/design/tokens/theme.json"), JSON.stringify({ token: { colorPrimary: "#3371ff", borderRadius: 6, controlHeight: 32 } }, null, 2));

const h1Root = path.join(projectRoot, "docs/.scratch", feature, "design/prototypes");
await prepareStaticPrototype({ projectRoot, root: h1Root, feature });
assert.match(await readFile(path.join(h1Root, "index.html"), "utf8"), /H1 · visual-review/);
const h1Styles = await readFile(path.join(h1Root, "styles.css"), "utf8");
for (const token of ["--brand-font-family", "--brand-color-text", "--brand-color-bg-layout", "--brand-color-bg-container", "--yss-color-primary-control", "--yss-control-height-compact", "--brand-size-lg", "--brand-size", "--brand-size-sm", "--brand-border-radius-lg", "--brand-border-radius"]) assert.match(h1Styles, new RegExp(token));
for (const staleAlias of ["--font-family", "--layout-background", "--container-background", "--brand-primary"]) assert.doesNotMatch(h1Styles, new RegExp(staleAlias));
for (const hardcodedDeclaration of ["padding:24px", "padding:20px", "min-height:32px", "border-radius:8px", "border-radius:6px"]) assert.doesNotMatch(h1Styles, new RegExp(hardcodedDeclaration));
assert.deepEqual((await validatePrototypeProject({ root: h1Root, profile: "H1" })).errors, []);
await writeFile(path.join(h1Root, "package.json"), "{}\n");
assert((await validatePrototypeProject({ root: h1Root, profile: "H1" })).errors.some((message) => message.includes("package.json")), "H1 必须拒绝伪构建依赖");

const h2Feature = "approval-flow";
const h2Root = path.join(projectRoot, "docs/.scratch", h2Feature, "design/prototypes");
const h2Manifest = await prepareFlowPrototype({ projectRoot, root: h2Root, feature: h2Feature, pnpmVersion: "10.15.0" });
await writeFile(path.join(h2Root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
assert.equal(h2Manifest.component_basis, "vue-antdv-next");
assert.equal(h2Manifest.library.version, "1.5.2");
assert.match(await readFile(path.join(h2Root, "src/App.vue"), "utf8"), /a-config-provider/);
assert.match(await readFile(path.join(h2Root, "src/yss-theme.js"), "utf8"), /compactAlgorithm/);
assert.deepEqual((await validatePrototypeProject({ root: h2Root, profile: "H2" })).errors, []);
assert((await validatePrototypeProject({ root: h2Root, profile: "H2", componentBasis: "vue-antdv-next", libraryVersion: "1.5.1" })).errors.some((message) => message.includes("精确锁定")));

const reactFeature = "legacy-react-flow";
const reactRoot = path.join(projectRoot, "docs/.scratch", reactFeature, "design/prototypes");
await mkdir(path.join(reactRoot, "src"), { recursive: true });
await writeFile(path.join(reactRoot, "index.html"), "<!doctype html><div id=app></div>\n");
await writeFile(path.join(reactRoot, "package.json"), JSON.stringify({ name: "legacy-react-flow-prototype", private: true, type: "module", scripts: { build: "vite build" }, dependencies: { react: "19.2.0", "react-dom": "19.2.0", vite: "6.4.2" } }, null, 2));
await prepareFlowPrototype({ projectRoot, root: reactRoot, feature: reactFeature, targetAntdVersion: "6.6.2", pnpmVersion: "10.15.0" });
await writeFile(path.join(reactRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
await writeFile(path.join(reactRoot, "src/App.jsx"), 'import { ConfigProvider } from "antd"; import { yssTheme } from "./yss-theme.js"; export function App(){return <ConfigProvider theme={yssTheme}/>;}\n');
assert.deepEqual((await validatePrototypeProject({ root: reactRoot, profile: "H2", targetAntdVersion: "6.6.2" })).errors, []);

function common(profile, kind, block) {
  return {
    schema_version: 4,
    feature,
    prototype_ref: `docs/.scratch/${feature}/design/prototypes/index.html`,
    prototype_profile: profile,
    profile_kind: kind,
    profile_decision: {
      decision_to_inform: "确认审批交互与状态",
      risk_assumptions: ["状态必须可理解"],
      trigger_results: [{ trigger: "visual-only", matched: profile === "H1", evidence_ref: "design/review.md" }],
      calculated_profile: profile,
      override: { applied: false, direction: "none", reason: "not-applicable", evidence_ref: "not-applicable" }
    },
    upstream_refs: { spec_ref: "spec.md", interaction_spec_ref: "interaction.md", low_fidelity_ref: "low.md", state_matrix_ref: "states.md", prototype_review_ref: "review.md" },
    source_visual: { ideation_status: "not-applicable", selected_ref: "approved-pattern.md", reuse_reason: "复用已批准模式" },
    design_baseline: { canonical_design_ref: "DESIGN.md", canonical_design_digest: "sha256:design", project_design_ref: "docs/design/design.md", project_token_refs: ["docs/design/tokens/theme.json"], project_token_baseline_digest: "sha256:tokens", project_override_reviewed: true },
    visual_baseline: { manifest_ref: `docs/.scratch/${feature}/handoff/visual-baseline-v1/visual-baseline.yaml`, baseline_id: `visual-baseline.${feature}`, version: "v1", digest: `sha256:${"a".repeat(64)}`, status: "approved", case_ids: ["primary-desktop", "primary-narrow"] },
    browser_delivery: {
      delivery_kind: "static-directory", entry_ref: `docs/.scratch/${feature}/design/prototypes/index.html`, rendered_nonblank: true, prototype_digest: "sha256:prototype",
      viewports: [
        { name: "desktop", size: "1440x900", result: "passed", case_ids: ["primary-desktop"] },
        { name: "narrow", size: "390x844", result: "passed", case_ids: ["primary-narrow"] }
      ],
      console_result: "passed", console_ref: "console.txt"
    },
    design_qa: { report_ref: `docs/.scratch/${feature}/verification/design-qa.md`, result: "passed", axes: { visual: "passed", layout: "passed", interaction: "passed", content: "passed", accessibility: "passed", cross_platform: "passed" } },
    profile_evidence: block,
    implementation_handoff: {
      prototype_code_reusable: false,
      production_component_assumptions: ["YSS 组件可以表达已确认的交互语义"],
      verification_targets: [{ behavior: "核验目标组件的真实 props/slots/events 与状态", target_stage: "frontend-implementation-plan" }]
    },
    review: { result: "approved", review_ref: "review.md" },
    user_confirmation: { result: "approved", confirmation_ref: "confirmation.md", confirmed_decision: "接受当前设计", operable_scope: ["主操作"], simulations_or_gaps: [] },
    gaps: [], blockers: []
  };
}

const h1Evidence = common("H1", "visual-review", { visual_review: {
  runtime_build_required: false, key_interactions_result: "passed", keyboard_result: "passed", focus_result: "passed", contrast_result: "passed",
  zoom_200: { applicable: false, result: "not-applicable", evidence_ref: "not-applicable" },
  reduced_motion: { applicable: false, result: "not-applicable", evidence_ref: "not-applicable" }
} });
assert.deepEqual(validatePrototypeEvidence(h1Evidence).errors, []);
const missingCanonicalDesign = structuredClone(h1Evidence);
delete missingCanonicalDesign.design_baseline.canonical_design_ref;
delete missingCanonicalDesign.design_baseline.canonical_design_digest;
assert(validatePrototypeEvidence(missingCanonicalDesign).errors.some((message) => message.includes("canonical_design")), "schema v4 必须绑定根 DESIGN.md 及其 digest");
const fakeH1 = structuredClone(h1Evidence);
fakeH1.profile_evidence.visual_review.lockfile_ref = "pnpm-lock.yaml";
assert(validatePrototypeEvidence(fakeH1).errors.some((message) => message.includes("H1 禁止字段")));

const h2Evidence = common("H2", "flow-review", { flow_review: {
  implementation: { framework: "vue", runtime_build_required: true, package_manager: "pnpm", package_manifest_ref: "package.json", lockfile_ref: "pnpm-lock.yaml", build_command: "pnpm build", build_result: "passed" },
  main_flow_result: "passed", exceptional_state_result: "passed", exceptional_state_ref: "conflict.png", keyboard_result: "passed", focus_result: "passed", contrast_result: "passed", zoom_200_result: "passed", reduced_motion_result: "passed",
  visual_regression: { applicable: true, result: "passed", evidence_ref: "visual.json" },
  prototype_library_facts: { applicable: true, component_basis: "vue-antdv-next", source: "fact-pack", library_package: "antdv-next", library_version: "1.5.2", manifest_ref: "docs/design/facts/antdv-next/1.5.2/manifest.json", manifest_digest: "sha256:facts", components_covered: ["Button"], canonical_design_digest: "sha256:design", project_token_baseline_digest: "sha256:tokens", new_api_uncertainty: false }
} });
assert.deepEqual(validatePrototypeEvidence(h2Evidence).errors, []);
const legacyReactEvidence = structuredClone(h2Evidence);
legacyReactEvidence.profile_evidence.flow_review.implementation.framework = "react";
legacyReactEvidence.profile_evidence.flow_review.prototype_library_facts = { applicable: true, component_basis: "react-antd-6", source: "fact-pack", actual_antd_version: "6.6.2", manifest_ref: "docs/design/facts/antd/6.6.2/manifest.json", manifest_digest: "sha256:facts", components_covered: ["Button"], canonical_design_digest: "sha256:design", project_token_baseline_digest: "sha256:tokens", new_api_uncertainty: false };
assert.deepEqual(validatePrototypeEvidence(legacyReactEvidence).errors, []);
const staleFacts = structuredClone(h2Evidence);
staleFacts.profile_evidence.flow_review.prototype_library_facts.project_token_baseline_digest = "sha256:old";
assert(validatePrototypeEvidence(staleFacts).errors.some((message) => message.includes("Token digest")));
const staleCanonicalDesign = structuredClone(h2Evidence);
staleCanonicalDesign.profile_evidence.flow_review.prototype_library_facts.canonical_design_digest = "sha256:old-design";
assert(validatePrototypeEvidence(staleCanonicalDesign).errors.some((message) => message.includes("DESIGN.md digest")));
const fakeH3Claim = structuredClone(h2Evidence);
fakeH3Claim.profile_evidence.flow_review.real_component_verified = true;
assert(validatePrototypeEvidence(fakeH3Claim).errors.some((message) => message.includes("禁止生产组件字段")));

const h3Evidence = common("H3", "component-contract", { component_contract: {
  implementation_repo_ref: "repo:frontend", lockfile_ref: "pnpm-lock.yaml", framework: "vue-3", component_library: "@yss-ui/components", component_library_version: "4.2.1", harness_ref: "storybook-static/index.html", story_refs: ["stories/approval.stories.ts"], real_component_verified: true,
  main_flow_result: "passed", exceptional_state_result: "passed", keyboard_result: "passed", focus_result: "passed", contrast_result: "passed", zoom_200_result: "passed", reduced_motion_result: "passed", automated_visual_regression: { result: "passed", evidence_ref: "visual-regression.json" }
} });
assert(validatePrototypeEvidence(h3Evidence).errors.some((message) => message.includes("H1/H2")), "H3 必须被原型合同拒绝");

const invalidHandoff = structuredClone(h2Evidence);
invalidHandoff.implementation_handoff.verification_targets[0].target_stage = "prototype";
assert(validatePrototypeEvidence(invalidHandoff).errors.some((message) => message.includes("前端实现阶段")));

assert(validatePrototypeEvidence({ schema_version: 3 }).errors.some((message) => message.includes("只读旧证据")));
assert.deepEqual(validatePrototypeEvidence({ schema_version: 3 }, { allowLegacy: true }).errors, []);

function pngHeader(width, height) {
  const value = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(value, 0);
  value.writeUInt32BE(13, 8); value.write("IHDR", 12, "ascii"); value.writeUInt32BE(width, 16); value.writeUInt32BE(height, 20);
  return value;
}
const bundleRoot = path.join(projectRoot, "docs/.scratch", feature, "handoff/visual-baseline-v1");
await mkdir(path.join(bundleRoot, "images"), { recursive: true });
await mkdir(path.join(bundleRoot, "sources"), { recursive: true });
await mkdir(path.join(bundleRoot, "capture"), { recursive: true });
await writeFile(path.join(bundleRoot, "images/primary-desktop.png"), pngHeader(1440, 900));
await writeFile(path.join(bundleRoot, "images/primary-narrow.png"), pngHeader(390, 844));
await writeFile(path.join(bundleRoot, "sources/prototype.snapshot.html"), "<!doctype html><main>order review</main>\n");
await writeFile(path.join(bundleRoot, "sources/interaction-spec.snapshot.md"), "# Interaction\n");
await writeFile(path.join(bundleRoot, "sources/state-matrix.snapshot.md"), "# States\n");
await writeFile(path.join(bundleRoot, "capture/capture.mjs"), "// deterministic capture\n");
await writeFile(path.join(bundleRoot, "capture/result.json"), "{\"result\":\"passed\"}\n");
const baselineFile = path.join(bundleRoot, "visual-baseline.yaml");
const baseline = {
  schema_version: 1, baseline_id: `visual-baseline.${feature}`, feature, version: "v1", status: "approved",
  bundle: { format: "portable-directory", root_ref: `docs/.scratch/${feature}/handoff/visual-baseline-v1`, digest: `sha256:${"0".repeat(64)}`, size_bytes: 0, max_image_bytes: 5242880, max_bundle_bytes: 104857600 },
  source: { prototype_ref: "sources/prototype.snapshot.html", prototype_digest: `sha256:${"1".repeat(64)}`, interaction_spec_ref: "sources/interaction-spec.snapshot.md", interaction_spec_digest: `sha256:${"2".repeat(64)}`, state_matrix_ref: "sources/state-matrix.snapshot.md", state_matrix_digest: `sha256:${"3".repeat(64)}` },
  capture_environment: { browser: "chromium", browser_version: "140.0.0", operating_system: "linux", fonts_digest: `sha256:${"4".repeat(64)}`, device_scale_factor: 1, color_space: "srgb", locale: "zh-CN", timezone: "Asia/Shanghai", animations_disabled: true, cursor_hidden: true, capture_script_ref: "capture/capture.mjs", capture_script_digest: `sha256:${"5".repeat(64)}`, capture_result_ref: "capture/result.json", capture_result_digest: `sha256:${"6".repeat(64)}` },
  cases: [
    { case_id: "primary-desktop", route: "/orders", page: "OrderPage", state: "normal", viewport: { name: "desktop", width: 1440, height: 900, scroll_mode: "viewport", scroll_position: 0 }, theme: "compact-light", locale: "zh-CN", data_scenario: "primary", image_ref: "images/primary-desktop.png", image_digest: `sha256:${"0".repeat(64)}`, image_size_bytes: 1, mask_ref: "not-applicable", mask_digest: "not-applicable", mask_size_bytes: 0, semantic_refs: ["sources/prototype.snapshot.html", "sources/interaction-spec.snapshot.md"], allowed_differences: [], result: "passed" },
    { case_id: "primary-narrow", route: "/orders", page: "OrderPage", state: "normal", viewport: { name: "narrow", width: 390, height: 844, scroll_mode: "viewport", scroll_position: 0 }, theme: "compact-light", locale: "zh-CN", data_scenario: "primary", image_ref: "images/primary-narrow.png", image_digest: `sha256:${"0".repeat(64)}`, image_size_bytes: 1, mask_ref: "not-applicable", mask_digest: "not-applicable", mask_size_bytes: 0, semantic_refs: ["sources/state-matrix.snapshot.md"], allowed_differences: [], result: "passed" }
  ]
};
await writeFile(baselineFile, JSON.stringify(baseline, null, 2));
const sealed = await sealVisualBaseline(baselineFile, bundleRoot);
assert.deepEqual((await validateVisualBaseline(sealed, { bundleRoot })).errors, []);
const tamperedDigest = structuredClone(sealed);
tamperedDigest.cases[0].image_digest = `sha256:${"f".repeat(64)}`;
assert((await validateVisualBaseline(tamperedDigest, { bundleRoot })).errors.some((message) => message.includes("image_digest 与文件不一致")));
const missingNarrow = structuredClone(sealed);
missingNarrow.cases = missingNarrow.cases.slice(0, 1);
assert((await validateVisualBaseline(missingNarrow)).errors.some((message) => message.includes("390x844")));
const badDpr = structuredClone(sealed);
badDpr.capture_environment.device_scale_factor = 2;
assert((await validateVisualBaseline(badDpr)).errors.some((message) => message.includes("device_scale_factor")));
const traversal = structuredClone(sealed);
traversal.source.prototype_ref = "../prototype.html";
assert((await validateVisualBaseline(traversal)).errors.some((message) => message.includes("source.prototype_ref")));
await writeFile(path.join(bundleRoot, "capture/unregistered.log"), "unexpected\n");
assert((await validateVisualBaseline(sealed, { bundleRoot })).errors.some((message) => message.includes("未登记 payload")));

process.stdout.write("YSS prototype profile contract scenarios passed\n");
