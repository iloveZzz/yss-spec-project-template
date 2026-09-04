#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareFlowPrototype, prepareStaticPrototype, validatePrototypeEvidence, validatePrototypeProject } from "../scripts/prototype-contract.mjs";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "yss-prototype-contract-"));
const projectRoot = path.join(tempRoot, "project");
const feature = "order-review";
await mkdir(path.join(projectRoot, "docs/design/tokens"), { recursive: true });
await writeFile(path.join(projectRoot, "docs/design/tokens/theme.json"), JSON.stringify({ token: { colorPrimary: "#3371ff", borderRadius: 6, controlHeight: 32 } }, null, 2));

const h1Root = path.join(projectRoot, "docs/.scratch", feature, "design/prototypes");
await prepareStaticPrototype({ projectRoot, root: h1Root, feature });
assert.match(await readFile(path.join(h1Root, "index.html"), "utf8"), /H1 · visual-review/);
assert.deepEqual((await validatePrototypeProject({ root: h1Root, profile: "H1" })).errors, []);
await writeFile(path.join(h1Root, "package.json"), "{}\n");
assert((await validatePrototypeProject({ root: h1Root, profile: "H1" })).errors.some((message) => message.includes("package.json")), "H1 必须拒绝伪构建依赖");

const h2Feature = "approval-flow";
const h2Root = path.join(projectRoot, "docs/.scratch", h2Feature, "design/prototypes");
await mkdir(path.join(h2Root, "src"), { recursive: true });
await writeFile(path.join(h2Root, "index.html"), "<!doctype html><div id=app></div>\n");
await writeFile(path.join(h2Root, "package.json"), JSON.stringify({ name: "approval-flow-prototype", private: true, type: "module", scripts: { build: "vite build" }, dependencies: { react: "19.2.0", "react-dom": "19.2.0", vite: "6.4.2" } }, null, 2));
await prepareFlowPrototype({ projectRoot, root: h2Root, feature: h2Feature, targetAntdVersion: "6.6.2", pnpmVersion: "10.15.0" });
await writeFile(path.join(h2Root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
await writeFile(path.join(h2Root, "src/App.jsx"), 'import { ConfigProvider } from "antd"; import { yssTheme } from "./yss-theme.js"; export function App(){return <ConfigProvider theme={yssTheme}/>;}\n');
assert.deepEqual((await validatePrototypeProject({ root: h2Root, profile: "H2", targetAntdVersion: "6.6.2" })).errors, []);
assert((await validatePrototypeProject({ root: h2Root, profile: "H2", targetAntdVersion: "6.6.1" })).errors.some((message) => message.includes("精确锁定")));

function common(profile, kind, block) {
  return {
    schema_version: 3,
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
    design_baseline: { project_design_ref: "docs/design/design.md", project_token_refs: ["docs/design/tokens/theme.json"], project_token_baseline_digest: "sha256:tokens", project_override_reviewed: true },
    browser_delivery: {
      delivery_kind: "static-directory", entry_ref: `docs/.scratch/${feature}/design/prototypes/index.html`, rendered_nonblank: true, prototype_digest: "sha256:prototype",
      viewports: [
        { name: "desktop", size: "1440x900", result: "passed", screenshot_ref: "desktop.png" },
        { name: "narrow", size: "390x844", result: "passed", screenshot_ref: "narrow.png" }
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
const fakeH1 = structuredClone(h1Evidence);
fakeH1.profile_evidence.visual_review.lockfile_ref = "pnpm-lock.yaml";
assert(validatePrototypeEvidence(fakeH1).errors.some((message) => message.includes("H1 禁止字段")));

const h2Evidence = common("H2", "flow-review", { flow_review: {
  implementation: { framework: "react", runtime_build_required: true, package_manager: "pnpm", package_manifest_ref: "package.json", lockfile_ref: "pnpm-lock.yaml", build_command: "pnpm build", build_result: "passed" },
  main_flow_result: "passed", exceptional_state_result: "passed", exceptional_state_ref: "conflict.png", keyboard_result: "passed", focus_result: "passed", contrast_result: "passed", zoom_200_result: "passed", reduced_motion_result: "passed",
  visual_regression: { applicable: true, result: "passed", evidence_ref: "visual.json" },
  prototype_library_facts: { applicable: true, component_basis: "react-antd-6", source: "fact-pack", actual_antd_version: "6.6.2", manifest_ref: "docs/design/facts/antd/6.6.2/manifest.json", manifest_digest: "sha256:facts", components_covered: ["Button"], project_token_baseline_digest: "sha256:tokens", new_api_uncertainty: false }
} });
assert.deepEqual(validatePrototypeEvidence(h2Evidence).errors, []);
const staleFacts = structuredClone(h2Evidence);
staleFacts.profile_evidence.flow_review.prototype_library_facts.project_token_baseline_digest = "sha256:old";
assert(validatePrototypeEvidence(staleFacts).errors.some((message) => message.includes("Token digest")));
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

assert(validatePrototypeEvidence({ schema_version: 2 }).errors.some((message) => message.includes("只读旧证据")));
assert.deepEqual(validatePrototypeEvidence({ schema_version: 2 }, { allowLegacy: true }).errors, []);

process.stdout.write("YSS prototype profile contract scenarios passed\n");
