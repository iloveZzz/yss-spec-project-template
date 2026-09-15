#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildDecisionFixture } from "../../../../scripts/fixtures/user-decision/build-fixture.mjs";
import { mkdtemp, mkdir, readFile, writeFile, rm, cp, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareFlowPrototype, prepareStaticPrototype, validatePrototypeEvidence, validatePrototypeProject, prototypeDecisionSnapshot } from "../scripts/prototype-contract.mjs";
import { sealVisualBaseline, validateVisualBaseline } from "../scripts/visual-baseline-contract.mjs";

import { sealOfflineHtml } from "../scripts/offline-html.mjs";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "yss-prototype-contract-"));
const projectRoot = path.join(tempRoot, "project");
const feature = "order-review";
await mkdir(path.join(projectRoot, "docs/design/tokens"), { recursive: true });
await writeFile(path.join(projectRoot, "DESIGN.md"), "---\nversion: alpha\n---\n");
await writeFile(path.join(projectRoot, "docs/design/tokens/theme.json"), JSON.stringify({ token: { colorPrimary: "#3371ff", borderRadius: 6, controlHeight: 32 } }, null, 2));

await cp(new URL("../../../../docs/design/tokens/variables.css", import.meta.url), path.join(projectRoot, "docs/design/tokens/variables.css"));

const h1Root = path.join(projectRoot, "docs/.scratch", feature, "design/prototypes");
await prepareStaticPrototype({ projectRoot, root: h1Root, feature });
assert.deepEqual((await validatePrototypeProject({ root: h1Root, profile: "H1" })).errors, []);
const originalHtml = await readFile(path.join(h1Root, "index.html"), "utf8");
await assert.rejects(prepareStaticPrototype({ projectRoot, root: h1Root, feature }), /已有内容|已存在内容/);
assert.equal(await readFile(path.join(h1Root, "index.html"), "utf8"), originalHtml);
await writeFile(path.join(h1Root, "package.json"), "{}\n");
assert((await validatePrototypeProject({ root: h1Root, profile: "H1" })).errors.some(message => message.includes("package.json")));
await rm(path.join(h1Root, "package.json"));

const h2Feature = "approval-flow";
const h2Root = path.join(projectRoot, "docs/.scratch", h2Feature, "design/prototypes");
const h2Manifest = await prepareFlowPrototype({ projectRoot, root: h2Root, feature: h2Feature });
assert.equal(h2Manifest.component_basis, "html-css-js");
assert.equal(h2Manifest.runtime_build_required, false);
assert.deepEqual((await validatePrototypeProject({ root: h2Root, profile: "H2" })).errors, []);
await assert.rejects(prepareFlowPrototype({ projectRoot, root: h2Root, feature: h2Feature, componentBasis: "vue-antdv-next" }), /已退役/);
await assert.rejects(prepareFlowPrototype({ projectRoot, root: h2Root, feature: h2Feature, targetAntdVersion: "6.6.2" }), /已退役/);
const portableRoot = path.join(tempRoot, "portable");
await cp(h2Root, portableRoot, { recursive: true });
assert.deepEqual((await validatePrototypeProject({ root: portableRoot, profile: "H2" })).errors, [], "脱离源仓后仍可校验");
const styles = await readFile(path.join(portableRoot, "styles.css"), "utf8");
await writeFile(path.join(portableRoot, "styles.css"), styles + '\n@import "../outside.css";');
await assert.rejects(sealOfflineHtml(portableRoot, "H2"), /资源缺失或越出交付包/);
await writeFile(path.join(portableRoot, "styles.css"), styles);
await writeFile(path.join(portableRoot, "tokens.css"), "/* tampered */");
await assert.rejects(sealOfflineHtml(portableRoot, "H2"), /Token 来源摘要/);
await cp(path.join(h2Root, "tokens.css"), path.join(portableRoot, "tokens.css"));
await symlink(path.join(projectRoot, "DESIGN.md"), path.join(portableRoot, "escaped.md"));
assert((await validatePrototypeProject({ root: portableRoot, profile: "H2" })).errors.some(message => message.includes("符号链接")));
await rm(path.join(portableRoot, "escaped.md"));
const html = await readFile(path.join(portableRoot, "index.html"), "utf8");
for (const addition of ['<script type="module" src="./app.js"></script>', '<script src="https://example.test/app.js"></script>', '<script>fetch("./data.json")</script>']) {
  await writeFile(path.join(portableRoot, "index.html"), html + addition);
  await assert.rejects(sealOfflineHtml(portableRoot, "H2"));
}
await writeFile(path.join(portableRoot, "index.html"), html + "<!-- changed -->");
assert((await validatePrototypeProject({ root: portableRoot, profile: "H2" })).errors.some(message => message.includes("摘要")));
await sealOfflineHtml(portableRoot, "H2");
assert.deepEqual((await validatePrototypeProject({ root: portableRoot, profile: "H2" })).errors, []);

function common(profile, kind, block) {
  const data = {
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
  const f = buildDecisionFixture(path.join(tempRoot, `decision-${profile}-${kind}`), { boundary: "gate.product-design-approved", scope: data.user_confirmation.operable_scope, subjectContent: JSON.stringify(prototypeDecisionSnapshot(data)) });
  data.user_confirmation.user_decision_ref = f.ref;
  data.user_confirmation.decision_subject_ref = f.requirement.subject_ref;
  return data;
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
assert(validatePrototypeEvidence(h2Evidence).errors.some(message => message.includes("Provider 已退役")));
assert.deepEqual(validatePrototypeEvidence(h2Evidence, { allowLegacy: true }).errors, []);
const legacyReactEvidence = structuredClone(h2Evidence);
legacyReactEvidence.profile_evidence.flow_review.implementation.framework = "react";
legacyReactEvidence.profile_evidence.flow_review.prototype_library_facts = { applicable: true, component_basis: "react-antd-6", source: "fact-pack", actual_antd_version: "6.6.2", manifest_ref: "docs/design/facts/antd/6.6.2/manifest.json", manifest_digest: "sha256:facts", components_covered: ["Button"], canonical_design_digest: "sha256:design", project_token_baseline_digest: "sha256:tokens", new_api_uncertainty: false };
assert.deepEqual(validatePrototypeEvidence(legacyReactEvidence, { allowLegacy: true }).errors, []);
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


const htmlEvidence = common("H2", "flow-review", { flow_review: {
  implementation: { framework: "html-css-js", runtime_build_required: false },
  main_flow_result: "passed", exceptional_state_result: "passed", exceptional_state_ref: "exceptions.md",
  keyboard_result: "passed", focus_result: "passed", contrast_result: "passed", zoom_200_result: "passed", reduced_motion_result: "passed",
  scenario_replay_ref: "replay.json", scenario_reset_result: "passed",
  visual_regression: { applicable: false, result: "not-applicable", evidence_ref: "first-version.md" },
  prototype_library_facts: { applicable: false, component_basis: "html-css-js" }
} });
htmlEvidence.source_visual = { kind: "design-system", ideation_status: "not-applicable", selected_ref: "DESIGN.md", reuse_reason: "已有规范覆盖当前页面模式" };
htmlEvidence.design_qa.mode = "design-contract";
Object.assign(htmlEvidence.browser_delivery, { delivery_contract: "offline-html-v1", resource_manifest_ref: "yss-prototype-adapter.json", offline_verification_ref: "offline.json", offline_verification_result: "passed" });
assert.deepEqual(validatePrototypeEvidence(htmlEvidence).errors, []);
for (const field of ["offline_verification_result", "offline_verification_ref", "resource_manifest_ref"]) {
  const invalid = structuredClone(htmlEvidence); delete invalid.browser_delivery[field];
  assert(validatePrototypeEvidence(invalid).errors.some(message => message.includes(field)));
}
const selfComparison = structuredClone(htmlEvidence); selfComparison.design_qa.mode = "visual-comparison";
assert(validatePrototypeEvidence(selfComparison).errors.some(message => message.includes("source_visual.kind")));
const incompleteFlow = structuredClone(htmlEvidence); incompleteFlow.profile_evidence.flow_review.scenario_reset_result = "pending";
assert(validatePrototypeEvidence(incompleteFlow).errors.some(message => message.includes("scenario_reset_result")));

const prebuiltEvidence = structuredClone(htmlEvidence);
Object.assign(prebuiltEvidence.profile_evidence.flow_review.implementation, { framework: "react-antd-prebuilt", selection_reason: "日期与受控表单影响评审结论" });
prebuiltEvidence.profile_evidence.flow_review.prototype_library_facts = { applicable: true, component_basis: "react-antd-prebuilt", library_package: "antd", library_version: "6.6.4", source: "fact-pack", manifest_ref: "reference/manifest.json", manifest_digest: "sha256:" + "c".repeat(64), canonical_design_digest: prebuiltEvidence.design_baseline.canonical_design_digest, project_token_baseline_digest: prebuiltEvidence.design_baseline.project_token_baseline_digest, new_api_uncertainty: false, components_covered: ["Table", "Select"], build_provenance_ref: "build-provenance.json" };
assert.deepEqual(validatePrototypeEvidence(prebuiltEvidence).errors, []);
for (const field of ["build_provenance_ref", "library_version"]) {
  const invalid = structuredClone(prebuiltEvidence); delete invalid.profile_evidence.flow_review.prototype_library_facts[field];
  assert(validatePrototypeEvidence(invalid).errors.length > 0);
}
const noPrebuiltReason = structuredClone(prebuiltEvidence); delete noPrebuiltReason.profile_evidence.flow_review.implementation.selection_reason;
assert(validatePrototypeEvidence(noPrebuiltReason).errors.some(x => x.includes("selection_reason")));

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
