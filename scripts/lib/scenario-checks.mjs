import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseDocument } from "../vendor/yaml.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
function ensure(condition, message) { if (!condition) throw new TypeError(message); }
function exists(relative) { return existsSync(path.join(root, relative)); }
function includesAll(actual, expected) { return Array.isArray(actual) && expected.every((item) => actual.includes(item)); }

function validateMattContract(data) {
  const direct = data.entry_routing?.direct_matt_entry;
  ensure(direct?.skill === "ask-matt" && direct?.delegate_to === "yss-product-lifecycle" && direct?.requires_valid_manifest === true && direct?.action === "navigate-only" && direct?.lifecycle_state_mutation === "forbidden" && direct?.lifecycle_artifact_write === "forbidden" && direct?.return_to_orchestrator === "required", "ask-matt 导航入口尚未形成验明身份、只导航、禁止生命周期写入并强制回交主控的完整契约");
  const formal = data.entry_routing?.formal_user_entry;
  ensure(includesAll(formal?.skills, ["setup-matt-pocock-skills", "grill-with-docs", "to-spec", "to-tickets", "implement"]) && formal?.action === "lifecycle-validate-and-accept" && formal?.lifecycle_artifact_write === "conditional-explicit-user-entry" && formal?.return_to_orchestrator === "required", "正式用户入口未区分于 ask-matt 导航入口");
  const setup = data.setup_readiness;
  ensure(setup?.missing_action === "needs-human" && setup?.requested_skill === "setup-matt-pocock-skills" && setup?.resume_route === "setup-readiness" && setup?.lifecycle_may_invoke_setup === false, "setup 缺失时未限制为显式用户入口暂停");
  ensure(includesAll(setup?.preserves, ["lifecycle.status", "gate.status", "ticket.role"]) && setup?.legacy_artifacts_detected?.action === "migration-check" && setup.legacy_artifacts_detected.setup === "forbidden" && setup.legacy_artifacts_detected.write === "paused", "setup 暂停或旧资产迁移暂停契约不完整");
  const grill = data.grill_exit;
  ensure(includesAll(grill?.required, ["frontier_empty", "facts_resolved_or_routed", "decisions_confirmed", "shared_understanding_confirmed", "no_unresolved_runnable_blocker"]) && grill?.user_confirmation_required === true, "grill_exit 缺少 frontier、事实路由、决策、共同理解、用户确认或 runnable blocker 条件");
  ensure(grill?.facts_resolved_or_routed?.technical_fact === "research" && grill.facts_resolved_or_routed.runnable_question === "handoff-prototype-handoff" && grill.facts_resolved_or_routed.external_decision === "external-input-required", "grill_exit 的事实、runnable 问题或外部决策路由不完整");
  const git = data.git_authorization;
  for (const action of ["commit", "push"]) {
    const prefix = action === "commit" ? "commit" : "push";
    const rule = git?.[action];
    ensure(git?.natural_language_intent_is_authorization === false && rule?.requires_explicit_user_authorization === true && rule?.authorized_value === true && rule?.unauthorized_action === "checkpoint-only", `${action} 授权边界不完整`);
    ensure(includesAll(rule?.required, [`${prefix}_authorized`, `${prefix}_scope`, `${prefix}_authorization_ref`]) && includesAll(rule?.non_empty, [`${prefix}_scope`, `${prefix}_authorization_ref`]), `${action} 授权必填字段不完整`);
  }
}

function validateInvocationBoundary(data) {
  const boundary = data.matt_invocation_boundary;
  const expectedUserInvoked = ["ask-matt", "batch-grill-me", "grill-me", "grill-with-docs", "handoff", "implement", "improve-codebase-architecture", "loop-me", "setup-matt-pocock-skills", "setup-ts-deep-modules", "teach", "to-questionnaire", "to-spec", "to-tickets", "triage", "wait-what", "wayfinder", "writing-beats", "writing-fragments", "writing-shape"];
  ensure(JSON.stringify(boundary?.user_invoked_skills) === JSON.stringify(expectedUserInvoked), "Matt user-invoked skills 清单不完整或已漂移");
  ensure(JSON.stringify(boundary?.lifecycle_managed_user_entries) === JSON.stringify(["setup-matt-pocock-skills", "grill-with-docs", "to-spec", "to-tickets", "implement"]), "生命周期管理的显式用户入口清单不完整");
  ensure(boundary?.lifecycle_may_invoke_user_invoked === false && boundary?.formal_artifact_owner === "explicit-user-entry", "生命周期仍可能自动调用 user-invoked skill 或产出其正式资产");
  ensure(JSON.stringify(boundary?.model_invoked_skills) === JSON.stringify(["grilling", "domain-modeling", "code-review"]) && boundary?.continuous_orchestration === "prepare-and-validate-only", "连续编排未被限制为允许的 model-invoked 原语与准备/校验动作");
  validateInvocationMetadata(boundary, (skill) => read(`.agents/skills/${skill}/SKILL.md`));
  const setup = data.setup_readiness;
  ensure(setup?.missing_action === "needs-human" && setup?.requested_skill === "setup-matt-pocock-skills" && setup?.resume_route === "setup-readiness" && setup?.preserves?.includes("lifecycle.status"), "readiness=missing 未形成显式用户 setup 的结构化暂停");
  const result = data.workflow_execution_result;
  ensure(data.matt_skill_result?.status === "compatibility-read-only" && data.matt_skill_result?.may_influence_routing === false && data.matt_skill_result?.normalize_to === "workflow-execution-result-v1", "旧 Matt Skill Result 未限制为只读兼容 adapter");
  ensure(result?.canonical_output_schema === "workflow-execution-result-v1" && JSON.stringify(result?.accepted_input_schemas) === JSON.stringify(["workflow-execution-result-v1"]) && result?.legacy?.["matt-skill-result-v1"]?.status === "compatibility-read-only" && result.legacy["matt-skill-result-v1"].may_influence_routing === false && result.legacy["matt-skill-result-v1"].normalize_to === "workflow-execution-result-v1", "Workflow Execution Result 未将旧 Matt Skill Result 限制为只读兼容");
  ensure(includesAll(result?.required, ["result_schema", "work_unit", "workflow_reference", "result", "evidence_refs", "changed_artifacts", "new_impacts", "stale_candidates", "next_route", "blocking_signals"]) && includesAll(result?.result_values, ["completed", "blocked", "needs-human", "failed"]) && includesAll(result?.blocking_signals, ["drift", "new_impacts", "violation", "missing_evidence", "stale_candidates"]) && includesAll(result?.completed_requires_empty, ["new_impacts", "stale_candidates"]) && includesAll(result?.completed_requires_non_empty, ["evidence_refs"]) && result?.completed_requires_readable_evidence_refs === true && result?.evidence_ref_validation === "readable-or-resolvable" && result?.completed_requires_no_blocking_signals === true && includesAll(result?.workflow_reference?.required, ["source", "skill", "invocation_mode"]), "Workflow Execution Result 的完成态证据、阻断信号或 workflow_reference 契约不完整");
  const units = data.lifecycle_workflow_references;
  ensure(units?.["work-unit.discovery-interview"]?.invocation_mode === "model-invoked" && includesAll(units["work-unit.discovery-interview"].skills, ["grilling", "domain-modeling"]), "Discovery work unit 未调用允许的原语");
  ensure(units?.["work-unit.code-review"]?.invocation_mode === "model-invoked" && units["work-unit.code-review"].skill === "code-review", "Code review work unit 未使用 model-invoked code-review");
  for (const id of ["work-unit.spec-synthesis", "work-unit.ticket-decomposition", "work-unit.slice-implementation"]) {
    ensure(units?.[id]?.invocation_mode === "reference" && units[id].formal_artifact_owner === "explicit-user-entry", `${id} 未限制为 workflow reference 与显式正式入口`);
  }
}

function validateWorkflowExecutionResult(payload, contract) {
  for (const field of contract.required) ensure(Object.hasOwn(payload, field), `Workflow Execution Result 缺少 ${field}`);
  ensure(contract.result_values.includes(payload.result), "Workflow Execution Result result 无效");
  for (const field of contract.workflow_reference.required) ensure(typeof payload.workflow_reference?.[field] === "string" && payload.workflow_reference[field].trim(), `workflow_reference.${field} 无效`);
  if (payload.result !== "completed") return;
  for (const field of contract.completed_requires_empty) ensure(Array.isArray(payload[field]) && payload[field].length === 0, `completed 的 ${field} 必须为空`);
  for (const field of contract.completed_requires_non_empty) ensure(Array.isArray(payload[field]) && payload[field].length > 0, `completed 的 ${field} 不能为空`);
  if (contract.completed_requires_readable_evidence_refs) {
    for (const reference of payload.evidence_refs) ensure(typeof reference === "string" && reference.trim() && exists(reference), `completed 证据不可读取: ${reference}`);
  }
  if (contract.completed_requires_no_blocking_signals) ensure(Array.isArray(payload.blocking_signals) && payload.blocking_signals.length === 0, "completed 不得携带 blocking_signals");
}

function validateInvocationMetadata(boundary, skillContents) {
  for (const skill of boundary.user_invoked_skills) ensure(skillContents(skill).includes("disable-model-invocation: true"), `${skill} 未声明为 user-invoked skill`);
  for (const skill of boundary.lifecycle_managed_user_entries) ensure(skillContents(skill).includes("disable-model-invocation: true"), `${skill} 未声明为生命周期管理的 user-invoked skill`);
  for (const skill of boundary.model_invoked_skills) ensure(!skillContents(skill).includes("disable-model-invocation: true"), `${skill} 不应出现在 model-invoked 白名单`);
}

function validateMattProse(skill, adapter) {
  ensure(skill.includes("不得写生命周期资产或改变门禁/Ticket 状态") && skill.includes("任何写入前回交本编排器"), "主技能缺少 direct Matt 只导航并回交的说明");
  ensure(adapter.includes("仅发现旧路径资产") && adapter.includes("不得调用 `setup-matt-pocock-skills`"), "适配器缺少 setup 旧资产迁移或显式用户入口条件");
  ensure(adapter.includes("frontier 为空") && adapter.includes("双方共同理解已确认"), "适配器缺少 grill_exit 的 frontier 或共同理解条件");
  ensure(skill.includes("自然语言意向不构成上述结构化 Git 授权") && adapter.includes("本身不是结构化授权"), "主技能或适配器缺少自然语言 Git 意向不是授权的说明");
}

function validateInvocationProse(skill, adapter, orchestration) {
  ensure(skill.includes("不得自动调用它们或代替其创建正式资产") && skill.includes("Workflow Execution Result"), "主技能未限制 user-invoked 调用或未采用新结果协议");
  ensure(adapter.includes("workflow reference 不表示调用") && adapter.includes("正式 Spec、Ticket 或实现资产仍只能由对应显式用户入口创建"), "适配器未限制 workflow reference 的正式资产所有权");
  ensure(orchestration.includes("只实际调用允许的 model-invoked skill") && orchestration.includes("用户显式启动"), "编排协议未区分 model-invoked 原语和显式用户入口");
}

const profiles = {
  lifecycle: {
    message: "六类生命周期压力场景验证通过",
    files: [".agents/skills/yss-product-lifecycle/SKILL.md", ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml", "docs/process/lifecycle-registry.yaml"],
    markers: [[".agents/skills/yss-product-lifecycle/SKILL.md", "template-source-product-artifact-forbidden"], [".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml", "ready-for-agent"]]
  },
  matt: {
    message: "Matt/YSS 集成压力场景验证通过",
    files: [".agents/skills/yss-product-lifecycle/references/matt-yss-adapter.md", ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml"],
    markers: [[".agents/skills/yss-product-lifecycle/SKILL.md", "Workflow Execution Result"]]
  },
  prototype: {
    message: "原型到后端脚手架及后续 YSS 代码生成压力场景验证通过",
    files: [".agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs", ".agents/skills/yss-router/references/router-contract.yaml"],
    markers: [[".agents/skills/yss-product-lifecycle/SKILL.md", "controlled-generation"]]
  },
  router: {
    message: "YSS Router stage 7 scenarios passed",
    files: [".agents/skills/yss-router/references/router-contract.yaml", ".agents/skills/yss-router/SKILL.md"],
    markers: [[".agents/skills/yss-router/references/router-contract.yaml", "slice_contract_required"]]
  },
  openapiYaml: {
    message: "OpenAPI YAML-first 场景验证通过",
    files: ["docs/templates/openapi-spec-template.yaml", ".agents/skills/yss-openapi-governance/SKILL.md"],
    markers: [["docs/templates/openapi-spec-template.yaml", "openapi: 3.1.0"], [".agents/skills/yss-openapi-governance/SKILL.md", "YAML-first"]]
  },
  openapiJson: {
    message: "OpenAPI YAML-first JSON handoff scenarios passed",
    files: ["docs/api/templates/openapi-json-export-record-template.md", ".agents/skills/yss-api-integration/SKILL.md"],
    markers: [[".agents/skills/yss-api-integration/SKILL.md", "SHA-256"]]
  },
  yssDtoWire: {
    message: "YSS DTO OpenAPI wire-shape scenarios passed",
    files: [
      ".agents/skills/yss-dto/references/openapi-wire-profile.yaml",
      ".agents/skills/yss-dto/SKILL.md",
      ".agents/skills/yss-openapi-governance/SKILL.md",
      ".agents/skills/yss-openapi-draft-review/SKILL.md",
      "docs/api/templates/openapi-draft-review-checklist.md",
      "scripts/verify-yss-dto-openapi-profile"
    ],
    markers: [
      [".agents/skills/yss-dto/SKILL.md", "x-yss-response-wrapper"],
      [".agents/skills/yss-openapi-governance/SKILL.md", "verify-yss-dto-openapi-profile"],
      [".agents/skills/yss-openapi-draft-review/SKILL.md", "offset`, `needTotalCount`, and `tempTotalCount"],
      ["docs/api/templates/openapi-draft-review-checklist.md", "DTO wire shape"]
    ]
  }
};

export function runScenario(name) {
  const profile = profiles[name];
  if (!profile) throw new TypeError(`未知 Node 场景: ${name}`);
  for (const file of profile.files) ensure(exists(file), `缺少场景资产: ${file}`);
  for (const [file, marker] of profile.markers) ensure(read(file).includes(marker), `场景资产缺少标记 ${marker}: ${file}`);
  if (name === "lifecycle") {
    const result = spawnSync("scripts/verify-lifecycle-registry", [], { cwd: root, encoding: "utf8" });
    ensure(result.status === 0, result.stderr || result.stdout);
  }
  if (name === "matt") {
    const contract = parseDocument(read(".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml"), { uniqueKeys: true });
    ensure(contract.errors.length === 0, contract.errors[0]?.message || "生命周期编排契约无法解析");
    const data = contract.toJS({ maxAliasCount: 0 });
    validateMattContract(data);
    validateInvocationBoundary(data);
    const validResult = {
      result_schema: "workflow-execution-result-v1",
      work_unit: "work-unit.spec-synthesis",
      workflow_reference: { source: "mattpocock/skills", skill: "to-spec", invocation_mode: "reference" },
      result: "completed",
      evidence_refs: ["docs/process/lifecycle-registry.yaml"],
      changed_artifacts: [],
      new_impacts: [],
      stale_candidates: [],
      next_route: "work-unit.ticket-decomposition",
      blocking_signals: []
    };
    validateWorkflowExecutionResult(validResult, data.workflow_execution_result);
    for (const mutate of [
      (item) => { delete item.workflow_reference; },
      (item) => { item.evidence_refs = []; },
      (item) => { item.evidence_refs = ["docs/process/not-found.md"]; },
      (item) => { item.blocking_signals = ["drift"]; },
      (item) => { item.new_impacts = ["new-api"]; }
    ]) {
      const invalid = structuredClone(validResult); mutate(invalid);
      let rejected = false;
      try { validateWorkflowExecutionResult(invalid, data.workflow_execution_result); } catch { rejected = true; }
      ensure(rejected, "Workflow Execution Result 完成态变异未被拒绝");
    }
    let metadataRejected = false;
    try {
      validateInvocationMetadata(data.matt_invocation_boundary, (skill) => skill === "grill-with-docs" ? read(`.agents/skills/${skill}/SKILL.md`).replace("disable-model-invocation: true\n", "") : read(`.agents/skills/${skill}/SKILL.md`));
    } catch { metadataRejected = true; }
    ensure(metadataRejected, "user-invoked front matter 变异未被 baseline oracle 拒绝");
    const mutations = [
      (item) => { delete item.entry_routing.direct_matt_entry.return_to_orchestrator; },
      (item) => { item.entry_routing.formal_user_entry.lifecycle_artifact_write = "forbidden"; },
      (item) => { item.matt_invocation_boundary.user_invoked_skills.push("unexpected-user-entry"); },
      (item) => { item.setup_readiness.lifecycle_may_invoke_setup = true; },
      (item) => { item.grill_exit.user_confirmation_required = false; },
      (item) => { delete item.git_authorization.push; }
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(data); mutate(candidate);
      let rejected = false;
      try { validateMattContract(candidate); validateInvocationBoundary(candidate); } catch { rejected = true; }
      ensure(rejected, "Matt/YSS 契约变异未被 baseline oracle 拒绝");
    }
    const skill = read(".agents/skills/yss-product-lifecycle/SKILL.md");
    const adapter = read(".agents/skills/yss-product-lifecycle/references/matt-yss-adapter.md");
    const orchestration = read(".agents/skills/yss-product-lifecycle/references/orchestration.md");
    validateMattProse(skill, adapter);
    validateInvocationProse(skill, adapter, orchestration);
    let proseRejected = false;
    try { validateMattProse(skill.replace("任何写入前回交本编排器", "允许直接写入"), adapter); } catch { proseRejected = true; }
    ensure(proseRejected, "Matt/YSS prose 变异未被 baseline oracle 拒绝");
    let invocationProseRejected = false;
    try { validateInvocationProse(skill.replace("不得自动调用它们或代替其创建正式资产", "可以自动调用并创建正式资产"), adapter, orchestration); } catch { invocationProseRejected = true; }
    ensure(invocationProseRejected, "调用边界 prose 变异未被 baseline oracle 拒绝");
    for (const relative of ["SKILL.md", "references/matt-yss-adapter.md", "references/orchestration-contract.yaml"]) {
      ensure(read(`.agents/skills/yss-product-lifecycle/${relative}`) === read(`.codex/skills/yss-product-lifecycle/${relative}`), `YSS 生命周期投影未同步: ${relative}`);
    }
  }
  if (name === "yssDtoWire") {
    const result = spawnSync("scripts/verify-yss-dto-openapi-profile", [], { cwd: root, encoding: "utf8" });
    ensure(result.status === 0, result.stderr || result.stdout);
  }
  process.stdout.write(`${profile.message}\n`);
}
