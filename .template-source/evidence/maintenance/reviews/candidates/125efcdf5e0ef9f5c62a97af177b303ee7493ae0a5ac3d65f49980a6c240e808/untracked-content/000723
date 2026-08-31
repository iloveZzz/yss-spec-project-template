import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseDocument } from "../vendor/yaml.mjs";
import { lifecycleTransitionContract, validateImplementationEntry, validateNextRoute } from "./lifecycle-transition.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
function ensure(condition, message) { if (!condition) throw new TypeError(message); }
function exists(relative) { return existsSync(path.join(root, relative)); }
function includesAll(actual, expected) { return Array.isArray(actual) && expected.every((item) => actual.includes(item)); }
function hasText(value) { return typeof value === "string" && value.trim().length > 0; }
const virtualTicketDecompositionRef = "docs/.scratch/demo/evidence/ticket-decomposition-result.yaml";
const virtualTicketDecomposition = "result_schema: workflow-execution-result-v1\nwork_unit: work-unit.ticket-decomposition\nresult: completed\nevidence_refs:\n  - docs/.scratch/demo/evidence/ticket-decomposition-result.yaml\n";

function validateMattContract(data) {
  const direct = data.entry_routing?.direct_matt_entry;
  ensure(direct?.skill === "ask-matt" && direct?.delegate_to === "yss-strategic-design" && direct?.requires_valid_manifest === true && direct?.action === "navigate-only" && direct?.lifecycle_state_mutation === "forbidden" && direct?.lifecycle_artifact_write === "forbidden" && direct?.return_to_orchestrator === "required", "ask-matt 导航入口尚未形成验明身份、只导航、禁止生命周期写入并强制回交主控的完整契约");
  const formal = data.entry_routing?.formal_user_entry;
  ensure(JSON.stringify(formal?.skills) === JSON.stringify(["ask-matt", "grill-me", "grill-with-docs", "to-spec", "to-tickets", "triage", "wayfinder"]) && formal?.action === "lifecycle-validate-and-accept" && formal?.lifecycle_artifact_write === "conditional-explicit-user-entry" && formal?.return_to_orchestrator === "required", "正式用户入口未区分于 ask-matt 导航入口");
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
  const submodule = git?.git_submodule;
  ensure(submodule?.applies_when === "repository_scope=git-submodule" && submodule?.forbid_commit_on_detached_head === true && submodule?.empty_gitlink_scaffold === "blocked" && submodule?.treat_empty_gitlink_as_regular_dir === "blocked" && submodule?.treat_detached_head_as_regular_dir === "blocked" && submodule?.force_overlay_mount === "blocked" && submodule?.write_inside_detached_head === "blocked" && submodule?.require_git_entry_mode === "160000" && submodule?.working_tree_declared_scope_must_match === true && submodule?.copy_source_into_harness === "forbidden" && submodule?.clone_requires_recurse_submodules === true && submodule?.push_recurse_submodules === "check" && submodule?.delivery_order_must_include === "superproject-gitlink-update" && submodule?.nested_authorization === "per-repository" && submodule?.inspect_working_tree_writable === "explicit-boolean" && submodule?.empty_gitlink_writable === false && submodule?.force_overlay_regular_dir_path === "blocked", "git-submodule Git 授权契约不完整");
  ensure(JSON.stringify(submodule?.commit_order) === JSON.stringify(["submodule-repositories", "superproject-gitlink"]) && JSON.stringify(submodule?.push_order) === JSON.stringify(["submodule-repositories", "superproject-gitlink"]), "git-submodule 先子后父顺序不完整");
}

function validateInvocationBoundary(data) {
  const boundary = data.matt_invocation_boundary;
  const expectedUserInvoked = ["ask-matt", "grill-me", "grill-with-docs", "handoff", "to-spec", "to-tickets", "triage", "wayfinder"];
  const expectedModelInvoked = ["competitive-intelligence", "domain-modeling", "grilling", "prototype-review", "research", "writing-for-agents"];
  const expectedLifecycleModelInvoked = ["domain-modeling", "grilling", "prototype-review", "research"];
  ensure(JSON.stringify(boundary?.user_invoked_skills) === JSON.stringify(expectedUserInvoked), "Matt user-invoked skills 清单不完整或已漂移");
  ensure(JSON.stringify(boundary?.lifecycle_managed_user_entries) === JSON.stringify(["ask-matt", "grill-me", "grill-with-docs", "to-spec", "to-tickets", "triage", "wayfinder"]), "生命周期管理的显式用户入口清单不完整");
  ensure(boundary?.lifecycle_may_invoke_user_invoked === false && boundary?.formal_artifact_owner === "explicit-user-entry", "生命周期仍可能自动调用 user-invoked skill 或产出其正式资产");
  ensure(JSON.stringify(boundary?.model_invoked_skills) === JSON.stringify(expectedModelInvoked) && JSON.stringify(boundary?.lifecycle_allowed_model_invoked_skills) === JSON.stringify(expectedLifecycleModelInvoked) && boundary?.continuous_orchestration === "compatibility-prepare-and-validate-only", "Matt invocation inventory 或生命周期 model-invoked 白名单不完整");
  ensure(JSON.stringify(data.skill_source_contract?.source_revisions_required) === JSON.stringify(["mattpocock/skills"]) && data.skill_source_contract?.adaptation_ref_required_when_effective_diff === true && data.skill_source_contract?.retired_shared_skills?.includes("batch-grill-me"), "上游来源或退役 skill 供应链契约不完整");
  validateInvocationMetadata(boundary, (skill) => read(`.agents/skills/${skill}/SKILL.md`));
  const setup = data.setup_readiness;
  ensure(setup?.missing_action === "needs-human" && setup?.requested_skill === "setup-matt-pocock-skills" && setup?.resume_route === "setup-readiness" && setup?.preserves?.includes("lifecycle.status"), "readiness=missing 未形成显式用户 setup 的结构化暂停");
  const result = data.workflow_execution_result;
  ensure(data.matt_skill_result?.status === "compatibility-read-only" && data.matt_skill_result?.may_influence_routing === false && data.matt_skill_result?.normalize_to === "workflow-execution-result-v1", "旧 Matt Skill Result 未限制为只读兼容 adapter");
  ensure(result?.canonical_output_schema === "workflow-execution-result-v1" && JSON.stringify(result?.accepted_input_schemas) === JSON.stringify(["workflow-execution-result-v1"]) && result?.legacy?.["matt-skill-result-v1"]?.status === "compatibility-read-only" && result.legacy["matt-skill-result-v1"].may_influence_routing === false && result.legacy["matt-skill-result-v1"].normalize_to === "workflow-execution-result-v1", "Workflow Execution Result 未将旧 Matt Skill Result 限制为只读兼容");
  ensure(includesAll(result?.required, ["result_schema", "work_unit", "workflow_reference", "result", "evidence_refs", "changed_artifacts", "new_impacts", "stale_candidates", "next_route", "blocking_signals"]) && includesAll(result?.result_values, ["completed", "blocked", "needs-human", "failed"]) && includesAll(result?.blocking_signals, ["drift", "new_impacts", "violation", "missing_evidence", "stale_candidates"]) && includesAll(result?.completed_requires_empty, ["new_impacts", "stale_candidates"]) && includesAll(result?.completed_requires_non_empty, ["evidence_refs"]) && result?.completed_requires_readable_evidence_refs === true && result?.evidence_ref_validation === "readable-or-resolvable" && result?.completed_requires_no_blocking_signals === true && includesAll(result?.workflow_reference?.required, ["source", "skill", "invocation_mode"]), "Workflow Execution Result 的完成态证据、阻断信号或 workflow_reference 契约不完整");
  const native = data.lifecycle_native_entries;
  ensure(native?.default_entry === "yss-strategic-design" && native?.formal_artifact_owner === "yss-strategic-design", "战略编排原生入口未持有默认正式资产所有权");
  ensure(JSON.stringify(native?.user_confirmation_required_at) === JSON.stringify(["spec-baseline", "prototype-confirmation"]), "战略设计人工门禁集合已漂移");
  const routes = data.work_unit_routes;
  ensure(routes?.["work-unit.discovery-requirements"]?.skills?.includes("grilling") && routes?.["work-unit.discovery-requirements"]?.skills?.includes("domain-modeling"), "需求分析工作单元缺少 grilling/domain-modeling");
  ensure(routes?.["work-unit.discovery-opportunity"]?.route_by?.market_or_competitor_fact === "competitive-intelligence" && routes["work-unit.discovery-opportunity"].route_by.technical_or_standard_fact === "research", "机会调研事实路由不准确");
  ensure(routes?.["work-unit.business-ticket-formalization"]?.native?.skill === "yss-strategic-design" && routes?.["work-unit.business-ticket-formalization"]?.compatibility?.skill === "to-tickets", "业务 Ticket 正式化未绑定战略编排与兼容入口");
  ensure(routes?.["work-unit.slice-implementation"]?.downstream === true && routes?.["work-unit.technical-analysis"]?.downstream === true, "下游技术工作单元未明确标记为 downstream");
  for (const id of ["work-unit.spec-synthesis", "work-unit.prototype-design", "work-unit.business-ticket-formalization"]) {
    ensure(routes?.[id]?.native?.source === "yss-strategic-design", `${id} 未绑定战略编排器`);
  }
  for (const route of Object.values(routes ?? {})) {
    for (const skill of route.skills ?? []) ensure(!boundary.user_invoked_skills.includes(skill), `工作单元不能自动调用 user-invoked skill: ${skill}`);
    for (const skill of route.skills ?? []) if (boundary.model_invoked_skills.includes(skill)) ensure(boundary.lifecycle_allowed_model_invoked_skills.includes(skill), `工作单元调用了未进入生命周期白名单的 model-invoked skill: ${skill}`);
  }
}

function validateWorkflowExecutionResult(payload, contract, workUnitRoutes) {
  for (const field of contract.required) ensure(Object.hasOwn(payload, field), `Workflow Execution Result 缺少 ${field}`);
  ensure(contract.result_values.includes(payload.result), "Workflow Execution Result result 无效");
  if (Object.hasOwn(payload, "unavailable_skill")) {
    ensure(payload.result === contract.unavailable_skill.blocking_result, "技能不可用必须将 Workflow Execution Result 标记为 blocked");
    for (const field of contract.unavailable_skill.required) {
      ensure(typeof payload.unavailable_skill?.[field] === "string" && payload.unavailable_skill[field].trim(), `unavailable_skill.${field} 无效`);
    }
  }
  for (const field of contract.workflow_reference.required) ensure(typeof payload.workflow_reference?.[field] === "string" && payload.workflow_reference[field].trim(), `workflow_reference.${field} 无效`);
  const workUnit = workUnitRoutes?.[payload.work_unit];
  ensure(workUnit, `未知 Workflow Execution Result work_unit: ${payload.work_unit}`);
  if (payload.result === "completed") {
    const routeResult = validateNextRoute(payload.work_unit, payload.next_route, { profileId: payload.profile_id });
    ensure(routeResult.result === "allowed", `Workflow Execution Result next_route 非法: ${routeResult.blocking_signals.join(", ")}`);
  }
  const accepted = [workUnit.native, workUnit.compatibility].filter(Boolean);
  ensure(contract.workflow_reference.allowed_sources.includes(payload.workflow_reference.source) && accepted.some((route) => route.source === payload.workflow_reference.source && route.skill === payload.workflow_reference.skill && route.invocation_mode === payload.workflow_reference.invocation_mode), "Workflow Execution Result workflow_reference 与 work_unit route 不匹配");
  const workUnitRequirements = contract.work_unit_requirements?.[payload.work_unit];
  if (workUnitRequirements && payload.result === "completed") {
    for (const field of [...(workUnitRequirements.required ?? []), ...(workUnitRequirements.completed_requires ?? [])]) {
      ensure(hasText(payload[field]), `Workflow Execution Result ${payload.work_unit} 缺少 ${field}`);
    }
    for (const field of workUnitRequirements.boolean_required ?? []) {
      ensure(typeof payload[field] === "boolean", `Workflow Execution Result ${payload.work_unit} 缺少布尔字段 ${field}`);
    }
  }
  if (payload.work_unit === "work-unit.slice-implementation" && payload.result === "completed") {
    const implementationState = {
      tracker_kind: payload.tracker_kind,
      predecessor_work_unit: payload.predecessor_work_unit,
      ready_for_agent: payload.ready_for_agent,
      ticket_decomposition_result_ref: payload.ticket_decomposition_result_ref,
      vertical_slice_ticket_ref: payload.vertical_slice_ticket_ref,
      vertical_slice_ticket_role: payload.vertical_slice_ticket_role,
      vertical_slice_ticket_kind: payload.vertical_slice_ticket_kind,
      ticket_decomposition_result: { result: payload.ticket_decomposition_result_status, evidence_refs: payload.evidence_refs },
      vertical_slice_ticket: { ref: payload.vertical_slice_ticket_ref, role: payload.vertical_slice_ticket_role, kind: payload.vertical_slice_ticket_kind },
      slice_contract: {
        ticket_ref: payload.slice_contract_ticket_ref,
        status: payload.slice_contract_status,
        persisted: payload.slice_contract_persisted,
        current_version: payload.slice_contract_current_version,
      },
    };
    const semantic = validateImplementationEntry(implementationState, {
      // The scenario uses one explicit virtual fixture; arbitrary local refs
      // must still pass the real readability check and cannot use a fallback.
      exists: (ref) => exists(ref) || ref === "docs/.scratch/demo/issues/01-valid-slice.md" || ref === virtualTicketDecompositionRef,
      read: (ref) => ref === virtualTicketDecompositionRef ? virtualTicketDecomposition : readFileSync(path.join(root, ref), "utf8"),
    });
    ensure(semantic.result === "allowed", `Workflow Execution Result implementation Ticket 语义非法: ${semantic.blocking_signals.join(", ")}`);
  }
  if (payload.result !== "completed") return;
  for (const field of contract.completed_requires_empty) ensure(Array.isArray(payload[field]) && payload[field].length === 0, `completed 的 ${field} 必须为空`);
  for (const field of contract.completed_requires_non_empty) ensure(Array.isArray(payload[field]) && payload[field].length > 0, `completed 的 ${field} 不能为空`);
  if (contract.completed_requires_readable_evidence_refs) {
    for (const reference of payload.evidence_refs) ensure(typeof reference === "string" && reference.trim() && (exists(reference) || reference === virtualTicketDecompositionRef), `completed 证据不可读取: ${reference}`);
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
  ensure(adapter.includes("禁止 detached HEAD 提交") && adapter.includes("先推子仓再更新父仓 gitlink"), "适配器缺少 git-submodule 嵌套 Git 授权说明");
}

function validateInvocationProse(skill, adapter, orchestration) {
  ensure(skill.includes("不得自动调用它们或代替其创建正式资产") && skill.includes("Workflow Execution Result"), "主技能未限制 user-invoked 调用或未采用新结果协议");
  ensure(adapter.includes("workflow reference 不表示调用") && adapter.includes("正式 Spec、Ticket 或实现资产仍只能由对应显式用户入口创建"), "适配器未限制 workflow reference 的正式资产所有权");
  ensure(orchestration.includes("只实际调用允许的 model-invoked skill") && orchestration.includes("用户显式启动"), "编排协议未区分 model-invoked 原语和显式用户入口");
}

const profiles = {
  lifecycle: {
    message: "六类生命周期压力场景验证通过",
    files: [".agents/skills/yss-strategic-design/SKILL.md", ".agents/skills/yss-strategic-design/references/orchestration-contract.yaml", "docs/process/lifecycle-registry.yaml"],
    markers: [[".agents/skills/yss-strategic-design/SKILL.md", "template-source-product-artifact-forbidden"], [".agents/skills/yss-strategic-design/references/orchestration-contract.yaml", "strategic-design-handoff"]]
  },
  matt: {
    message: "Matt/YSS 集成压力场景验证通过",
    files: [".agents/skills/yss-strategic-design/references/matt-yss-adapter.md", ".agents/skills/yss-strategic-design/references/orchestration-contract.yaml", "docs/process/templates/lifecycle-checkpoint-template.yaml"],
    markers: [[".agents/skills/yss-strategic-design/SKILL.md", "Workflow Execution Result"]]
  },
  prototype: {
    message: "原型到后端脚手架及后续 YSS 代码生成压力场景验证通过",
    files: [".agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs", ".agents/skills/yss-router/references/router-contract.yaml"],
    markers: [[".agents/skills/yss-strategic-design/SKILL.md", "Strategic Design Handoff"]]
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
    const registry = parseDocument(read("docs/process/lifecycle-registry.yaml"), { uniqueKeys: true }).toJS({ maxAliasCount: 0 });
    const releaseGate = registry.gates.find((gate) => gate.id === "gate.release-ready");
    ensure(releaseGate?.requires_gates?.includes("gate.frontend-implementation-verified"), "发布就绪未依赖前端实现还原门禁");
    const contract = parseDocument(read(".agents/skills/yss-strategic-design/references/orchestration-contract.yaml"), { uniqueKeys: true }).toJS({ maxAliasCount: 0 });
    ensure(contract.profile_registry?.terminal_work_unit === "work-unit.strategic-design-handoff" && contract.profile_registry?.terminal_next_route === null, "战略设计 profile 终点契约缺失");
    ensure(contract.work_unit_routes?.["work-unit.business-ticket-formalization"]?.native?.skill === "yss-strategic-design", "业务 Ticket 正式化未绑定战略编排器");
    ensure(contract.work_unit_routes?.["work-unit.slice-implementation"]?.downstream === true, "实现工作单元未声明下游接管");
  }
  if (name === "matt") {
    const contract = parseDocument(read(".agents/skills/yss-strategic-design/references/orchestration-contract.yaml"), { uniqueKeys: true });
    ensure(contract.errors.length === 0, contract.errors[0]?.message || "生命周期编排契约无法解析");
    const data = contract.toJS({ maxAliasCount: 0 });
    validateMattContract(data);
    validateInvocationBoundary(data);
    const validResult = {
      result_schema: "workflow-execution-result-v1",
      work_unit: "work-unit.spec-synthesis",
      workflow_reference: { source: "yss-strategic-design", skill: "yss-strategic-design", invocation_mode: "model-invoked" },
      result: "completed",
      evidence_refs: ["docs/process/lifecycle-registry.yaml"],
      changed_artifacts: [],
      new_impacts: [],
      stale_candidates: [],
      next_route: "work-unit.prototype-design",
      blocking_signals: []
    };
    validateWorkflowExecutionResult(validResult, data.workflow_execution_result, data.work_unit_routes);
    const validPrototypeResult = {
      ...validResult,
      work_unit: "work-unit.prototype-design",
      next_route: "work-unit.business-ticket-formalization",
    };
    validateWorkflowExecutionResult(validPrototypeResult, data.workflow_execution_result, data.work_unit_routes);
    const validBusinessTicketResult = {
      ...validResult,
      work_unit: "work-unit.business-ticket-formalization",
      next_route: "work-unit.strategic-design-handoff",
    };
    validateWorkflowExecutionResult(validBusinessTicketResult, data.workflow_execution_result, data.work_unit_routes);
    const validHandoffResult = { ...validBusinessTicketResult, work_unit: "work-unit.strategic-design-handoff", next_route: null };
    validateWorkflowExecutionResult(validHandoffResult, data.workflow_execution_result, data.work_unit_routes);
    const unavailableResult = structuredClone(validResult);
    unavailableResult.result = "blocked";
    unavailableResult.unavailable_skill = { skill: "yss-prototype-stage", provider: "codex", fallback: "manual-review", resolution: "needs-human" };
    unavailableResult.blocking_signals = ["missing_evidence"];
    validateWorkflowExecutionResult(unavailableResult, data.workflow_execution_result, data.work_unit_routes);
    const malformedUnavailable = structuredClone(unavailableResult);
    delete malformedUnavailable.unavailable_skill.fallback;
    let unavailableRejected = false;
    try { validateWorkflowExecutionResult(malformedUnavailable, data.workflow_execution_result, data.work_unit_routes); } catch { unavailableRejected = true; }
    ensure(unavailableRejected, "技能不可用结果缺少 fallback 时未被拒绝");
    const compatibleResult = structuredClone(validResult);
    compatibleResult.workflow_reference = { source: "mattpocock/skills", skill: "to-spec", invocation_mode: "reference" };
    validateWorkflowExecutionResult(compatibleResult, data.workflow_execution_result, data.work_unit_routes);
    for (const mutate of [
      (item) => { delete item.workflow_reference; },
      (item) => { item.evidence_refs = []; },
      (item) => { item.evidence_refs = ["docs/process/not-found.md"]; },
      (item) => { item.blocking_signals = ["drift"]; },
      (item) => { item.new_impacts = ["new-api"]; },
      (item) => { item.workflow_reference.source = "untrusted/source"; },
      (item) => { item.workflow_reference.skill = "implement"; },
      (item) => { item.workflow_reference.invocation_mode = "reference"; },
      (item) => { item.next_route = "work-unit.slice-implementation"; }
    ]) {
      const invalid = structuredClone(validResult); mutate(invalid);
      let rejected = false;
      try { validateWorkflowExecutionResult(invalid, data.workflow_execution_result, data.work_unit_routes); } catch { rejected = true; }
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
      (item) => { delete item.git_authorization.push; },
      (item) => { delete item.git_authorization.git_submodule; },
      (item) => { item.git_authorization.git_submodule.forbid_commit_on_detached_head = false; },
      (item) => { item.git_authorization.git_submodule.force_overlay_mount = "allowed"; },
      (item) => { item.git_authorization.git_submodule.write_inside_detached_head = "allowed"; },
      (item) => { item.git_authorization.git_submodule.empty_gitlink_writable = true },
      (item) => { item.git_authorization.git_submodule.force_overlay_regular_dir_path = "allowed"; }
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(data); mutate(candidate);
      let rejected = false;
      try { validateMattContract(candidate); validateInvocationBoundary(candidate); } catch { rejected = true; }
      ensure(rejected, "Matt/YSS 契约变异未被 baseline oracle 拒绝");
    }
    const skill = read(".agents/skills/yss-strategic-design/SKILL.md");
    const adapter = read(".agents/skills/yss-strategic-design/references/matt-yss-adapter.md");
    const orchestration = read(".agents/skills/yss-strategic-design/references/orchestration.md");
    validateMattProse(skill, adapter);
    validateInvocationProse(skill, adapter, orchestration);
    let proseRejected = false;
    try { validateMattProse(skill.replace("任何写入前回交本编排器", "允许直接写入"), adapter); } catch { proseRejected = true; }
    ensure(proseRejected, "Matt/YSS prose 变异未被 baseline oracle 拒绝");
    let invocationProseRejected = false;
    try { validateInvocationProse(skill.replace("不得自动调用它们或代替其创建正式资产", "可以自动调用并创建正式资产"), adapter, orchestration); } catch { invocationProseRejected = true; }
    ensure(invocationProseRejected, "调用边界 prose 变异未被 baseline oracle 拒绝");
    for (const relative of ["SKILL.md", "references/matt-yss-adapter.md", "references/orchestration-contract.yaml"]) {
      ensure(read(`.agents/skills/yss-strategic-design/${relative}`) === read(`.codex/skills/yss-strategic-design/${relative}`), `YSS 战略设计投影未同步: ${relative}`);
    }
  }
  if (name === "yssDtoWire") {
    const result = spawnSync("scripts/verify-yss-dto-openapi-profile", [], { cwd: root, encoding: "utf8" });
    ensure(result.status === 0, result.stderr || result.stdout);
  }
  process.stdout.write(`${profile.message}\n`);
}
