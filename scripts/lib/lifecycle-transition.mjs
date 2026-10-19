import './slice-repositories.mjs'; // 登记多项目准备核验器（工作流层），见 slice-contract.mjs
import { readWorkLayout } from './work-layout.mjs';
import { BLOCKING_SIGNALS, allowedResult, blockedResult, hasText, isReadable, readDecompositionResult, artifactBindingReady, sameBackendDesignPrerequisites, validateImplementationRepositoriesReady, SLICE_REPOSITORY_PREPARATION_PROTOCOL } from './lifecycle-readiness.mjs';
export { validateImplementationRepositoriesReady, SLICE_REPOSITORY_PREPARATION_PROTOCOL };
import {assertProgressionEntry, readProgressionTarget} from './lifecycle-progression.mjs';
import {approvalExpectationForBoundAsset} from './native-approval.mjs';
import { assertBusinessApprovalBasis } from './business-ticket-lifecycle.mjs';
import { assertBusinessTicketTransition, assertImplementationTicket } from './business-tickets.mjs';
import {assertReadingTransition} from './reading-view-bundle.mjs';
import { assertTrackingTransition } from './stage-tracking.mjs';
import { assertScopeTransition, assertScopeWorkUnit, assertScopeImpacts, scopedNextRoutes } from './lifecycle-execution-scope.mjs';
import { existsSync, readFileSync } from "node:fs";
import { parseDocument } from "../vendor/yaml.mjs";
import { assertWorkUnitUserDecision, assertImplementationDecision } from "./native-user-decision.mjs";
import { validatePlanSpecEntry } from "./plan-spec-entry.mjs";
import path from "node:path";
import { validateApiContractDecision } from "./api-contract-decision.mjs";
import { loadApprovalRecord, validateApprovalRecord } from "./native-approval.mjs";
import { validateBackendReview } from "./backend-review.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
import { readRepositoryMode } from './repository-mode.mjs';
import { validateResearchCompletion } from './maintenance-research.mjs';

const IMPLEMENTATION_WORK_UNIT = "work-unit.slice-implementation";
const TICKET_DECOMPOSITION_WORK_UNIT = "work-unit.ticket-decomposition";
const REPOSITORY_PREPARATION_WORK_UNIT = "work-unit.implementation-repository-preparation";
const SERVICE_INITIALIZATION_WORK_UNIT = "work-unit.service-project-initialization";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const NEXT_ROUTES = deepFreeze({
  "work-unit.maintenance-research": ["work-unit.ssot-update"],
  "work-unit.entry-triage": ["work-unit.plan-opportunity", "work-unit.plan-requirements"],
  "work-unit.ssot-update": ["work-unit.skill-projection-sync", "work-unit.intensity-aware-verification-v2"],
  "work-unit.skill-projection-sync": ["work-unit.template-snapshot-build", "work-unit.intensity-aware-verification-v2"],
  "work-unit.template-snapshot-build": ["work-unit.attach-sync-integration", "work-unit.intensity-aware-verification-v2"],
  "work-unit.attach-sync-integration": ["work-unit.intensity-aware-verification-v2"],
  "work-unit.intensity-aware-verification-v2": ["work-unit.intensity-aware-review-v2"],
  "work-unit.intensity-aware-review-v2": ["work-unit.release-and-rollback"],
  "work-unit.release-and-rollback": [],
  "work-unit.plan-opportunity": ["work-unit.plan-requirements", "work-unit.domain-strategy-design", "work-unit.stage-decision", "work-unit.spec-synthesis"],
  "work-unit.plan-requirements": ["work-unit.domain-strategy-design", "work-unit.stage-decision", "work-unit.spec-synthesis"],
  "work-unit.domain-strategy-design": ["work-unit.stage-decision", "work-unit.spec-synthesis"],
  "work-unit.stage-decision": ["work-unit.spec-synthesis"],
  "work-unit.spec-synthesis": ["work-unit.prototype-design-v2", "work-unit.business-ticket-formalization", "work-unit.technical-analysis"],
  "work-unit.prototype-design-v2": ["work-unit.business-ticket-formalization", "work-unit.technical-analysis"],
  "work-unit.business-ticket-formalization": ["work-unit.technical-analysis", "work-unit.strategic-design-handoff"],
  "work-unit.strategic-design-handoff": ["work-unit.technical-analysis"],
  "work-unit.technical-analysis": [REPOSITORY_PREPARATION_WORK_UNIT],
  [REPOSITORY_PREPARATION_WORK_UNIT]: [TICKET_DECOMPOSITION_WORK_UNIT],
  [TICKET_DECOMPOSITION_WORK_UNIT]: [IMPLEMENTATION_WORK_UNIT],
  [IMPLEMENTATION_WORK_UNIT]: ["work-unit.code-review"],
  "work-unit.code-review": ["work-unit.release-and-retrospective", IMPLEMENTATION_WORK_UNIT, "work-unit.backend-delivery"],
  "work-unit.backend-delivery": ["work-unit.release-and-retrospective"],
  "work-unit.release-and-retrospective": [],
});

/** Retired records never grant new generation or lifecycle transitions. */
export function validateServiceProjectInitialization() {
  return blockedResult([BLOCKING_SIGNALS.serviceInitializationInvalid], ["retired: mvc-data-analysis-v1 仅允许历史只读审计；使用通用 MVC 脚手架，再按需单独使用 setup-yss-harness"]);
}

function validateTechnicalAnalysisCompletion(state, { exists = existsSync, read = (ref) => readFileSync(ref, "utf8"), root = ROOT } = {}) {
  const result = state?.technical_analysis_result;
  const resultRef = state?.technical_analysis_result_ref;
  const signals = [];
  const missing = [];
  const persisted = readDecompositionResult(resultRef, read);
  if (!result || result.result_schema !== "workflow-execution-result-v1" || result.work_unit !== "work-unit.technical-analysis" || result.result !== "completed" || result.current_version !== true) {
    signals.push(BLOCKING_SIGNALS.technicalAnalysisRequired);
    missing.push("completed current work-unit.technical-analysis result");
  }
  if (!isReadable(resultRef, exists) || !persisted || persisted.result_schema !== "workflow-execution-result-v1" || persisted.work_unit !== "work-unit.technical-analysis" || persisted.result !== "completed" || persisted.current_version !== true) {
    signals.push(BLOCKING_SIGNALS.technicalAnalysisRequired);
    missing.push("readable persisted technical_analysis_result_ref");
  }
  if (result?.context_reconciliation?.status !== "reconciled" || !isReadable(result?.context_reconciliation?.ref, exists)) {
    signals.push(BLOCKING_SIGNALS.technicalAnalysisRequired);
    missing.push("reconciled readable technical analysis context");
  }
  const evidenceRefs = Array.isArray(result?.evidence_refs) ? result.evidence_refs : [];
  if (!evidenceRefs.includes(resultRef) || evidenceRefs.some((ref) => !isReadable(ref, exists))) {
    signals.push(BLOCKING_SIGNALS.technicalAnalysisRequired);
    missing.push("readable technical analysis evidence including its persisted result");
  }
  try {
    const api = validateApiContractDecision(result?.api_contract_decision, { root: path.resolve(root) });
    if (!artifactBindingReady(result.api_contract_decision, exists)
      || !evidenceRefs.includes(result.api_contract_decision.ref)
      || !persisted?.api_contract_decision
      || !sameBackendDesignPrerequisites({ api_contract_decision: result.api_contract_decision }, { api_contract_decision: persisted.api_contract_decision })) {
      throw new TypeError("技术分析执行结果未一致绑定当前 API Contract Decision");
    }
    if (api.decision.current_version !== true || api.decision.status !== "approved") throw new TypeError("API Contract Decision 非当前批准版本");
  } catch (error) {
    signals.push(BLOCKING_SIGNALS.technicalAnalysisRequired);
    missing.push(error.message);
  }
  return signals.length ? blockedResult(signals, missing, evidenceRefs) : allowedResult(evidenceRefs);
}

function validateTicketReference(ref, trackerKind, root) {
  if (trackerKind === "github" || trackerKind === "gitlab") return /^(https?:\/\/|(?:github|gitlab):)[^\s]+$/.test(ref);
  return readWorkLayout(root).isTicket(ref);
}

/**
 * Validate a lifecycle work-unit transition without mutating state.
 * `nextRoute` is null only for a terminal work unit. A blocked or needs-human
 * Workflow Execution Result may omit a route; completed results are checked
 * by `validateWorkflowExecutionResult` before this function is called.
 */
export function validateNextRoute(currentWorkUnit, nextRoute, decisionState, options = {}) {
  if ([currentWorkUnit, nextRoute].includes('work-unit.strategic-design-handoff')) {
    try {
      const intent = readProgressionTarget({root: options.root || ROOT, checkpointRef: decisionState?.checkpoint_ref});
      if (!intent?.consumers.some(consumer => ['backend', 'frontend'].includes(consumer.profile) && path.resolve(consumer.root) !== intent.root)) throw Error('业务方案交接仅用于显式外部实现专职消费者；本地资产直接消费');
    } catch (error) { return blockedResult(['strategic-handoff-consumer-required'], [error.message]); }
  }
  let entryRoutes;
  if (currentWorkUnit === 'work-unit.entry-triage' || currentWorkUnit === 'work-unit.maintenance-research' || nextRoute === 'work-unit.maintenance-research') {
    try {
      const mode = readRepositoryMode(options.root || ROOT);
      if (currentWorkUnit === 'work-unit.entry-triage') entryRoutes = mode === 'template-source'
        ? ['work-unit.maintenance-research', 'work-unit.ssot-update'] : NEXT_ROUTES[currentWorkUnit];
      if ((currentWorkUnit === 'work-unit.maintenance-research' || nextRoute === 'work-unit.maintenance-research') && mode !== 'template-source') throw Error('template-research-requires-template-source');
      if (currentWorkUnit === 'work-unit.maintenance-research') {
        assertScopeTransition(currentWorkUnit, nextRoute, decisionState, options);
        if (nextRoute !== null && nextRoute !== 'work-unit.ssot-update') return blockedResult([BLOCKING_SIGNALS.invalidRoute]);
        validateResearchCompletion(decisionState, {root: options.root || ROOT, continuing: nextRoute !== null});
        return allowedResult(decisionState.evidence_refs);
      }
    } catch (error) { return blockedResult(['maintenance-research-boundary'], [error.message]); }
  }
  try { assertBusinessTicketTransition(options.root || ROOT, currentWorkUnit, nextRoute, decisionState); assertBusinessApprovalBasis(options.root || ROOT, decisionState, {required:currentWorkUnit === 'work-unit.business-ticket-formalization'}); }
  catch(error) { return blockedResult(["business-ticket-blocked"],[error.message]); }
  try { assertReadingTransition(options.root || ROOT, decisionState, currentWorkUnit); }
  catch(error){ return blockedResult(['reading-views-stale'],[error.message]); }
  try { assertTrackingTransition(currentWorkUnit, nextRoute, decisionState, { root: options.root || ROOT }); }
  catch (error) { return blockedResult(['stage-tracking-blocked'], [error.message]); }
  try { assertScopeTransition(currentWorkUnit, nextRoute, decisionState, options); }
  catch (error) { return blockedResult(['execution-scope-blocked'], [error.message]); }
  if (currentWorkUnit === "work-unit.code-review" && ["work-unit.release-and-retrospective", "work-unit.backend-delivery"].includes(nextRoute)) {
    try {
      if (decisionState?.review_input?.scope_kind !== "change") throw new Error("只读基线审计不能关闭实现审查");
      validateBackendReview(decisionState, { root: options.root || ROOT });
    }
    catch (error) { return blockedResult(["backend-review-incomplete"], [error.message]); }
  }


  const routes = NEXT_ROUTES[currentWorkUnit] && scopedNextRoutes(currentWorkUnit, entryRoutes || NEXT_ROUTES[currentWorkUnit], {...options, checkpointRef: decisionState?.checkpoint_ref});
  if (!routes) return blockedResult([BLOCKING_SIGNALS.invalidRoute], ["known_current_work_unit"]);
  if (nextRoute === REPOSITORY_PREPARATION_WORK_UNIT && !["work-unit.technical-analysis", SERVICE_INITIALIZATION_WORK_UNIT].includes(currentWorkUnit)) {
    return blockedResult([BLOCKING_SIGNALS.technicalAnalysisRequired], ["work-unit.technical-analysis predecessor"]);
  }
  if (nextRoute === null && routes.length === 0) {
    if (decisionState) return validateDecisionBoundary(currentWorkUnit, decisionState, options);
    return allowedResult();
  }
  if (!hasText(nextRoute) || !routes.includes(nextRoute)) {
    const signals = [BLOCKING_SIGNALS.invalidRoute];
    if (nextRoute === IMPLEMENTATION_WORK_UNIT && currentWorkUnit !== TICKET_DECOMPOSITION_WORK_UNIT) {
      signals.push(BLOCKING_SIGNALS.implementationBeforeTickets);
    }
    return blockedResult(signals, ["allowed_next_route"]);
  }
  if (nextRoute === SERVICE_INITIALIZATION_WORK_UNIT) {
    return validateServiceProjectInitialization(decisionState, { ...options, completed: false });
  }
  if (currentWorkUnit === SERVICE_INITIALIZATION_WORK_UNIT && nextRoute === REPOSITORY_PREPARATION_WORK_UNIT) {
    return validateServiceProjectInitialization(decisionState, { ...options, completed: true });
  }
  if (nextRoute === REPOSITORY_PREPARATION_WORK_UNIT) {
    const analysis = validateTechnicalAnalysisCompletion(decisionState, options);
    if (analysis.result === "blocked") return analysis;
  }
  if (nextRoute === 'work-unit.spec-synthesis' || currentWorkUnit === 'work-unit.spec-synthesis') {
    const entry = validatePlanSpecEntry(decisionState, options);
    if (entry.result === 'blocked' || nextRoute === 'work-unit.spec-synthesis') return entry;
  }
  if (nextRoute === TICKET_DECOMPOSITION_WORK_UNIT) {
    if (decisionState?.service_project_initialization) {
      const service = validateServiceProjectInitialization(decisionState, { ...options, completed: true });
      if (service.result === "blocked") return service;
    }
    const readiness = validateImplementationRepositoriesReady(decisionState, options);
    if (readiness.result === "blocked") return readiness;
  }
  return decisionState ? validateDecisionBoundary(currentWorkUnit, decisionState, options) : allowedResult();
}

function validateDecisionBoundary(workUnit, state, options) {
  try { assertWorkUnitUserDecision(workUnit, state, options); return allowedResult(); }
  catch (error) { return blockedResult([error.code || "user-decision-invalid"], [error.message]); }
}

/**
 * Validate that Ticket formalization produced a real, implementable vertical slice.
 * `exists` is injectable so external adapters can resolve their own tracker refs.
 */
export function validateTicketFormalization(state, { exists = existsSync, read = (ref) => readFileSync(ref, "utf8"), ...decisionOptions } = {}) {
  if ((state?.tracker_kind ?? "local-markdown") === "local-markdown" && state?.vertical_slice_ticket?.ref && isReadable(state.vertical_slice_ticket.ref, exists)) {
    try {
      assertImplementationTicket(read(state.vertical_slice_ticket.ref),state.vertical_slice_ticket.ref);
      const header = read(state.vertical_slice_ticket.ref).match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const kind = header ? parseDocument(header[1], { uniqueKeys: true }).toJS({ maxAliasCount: 0 })?.kind : null;
      if (kind === "stage-work-item") return blockedResult(["stage-work-item-not-implementable"], ["vertical-slice-ticket required"]);
    } catch(error) { return blockedResult([error.message.includes("stage-work-item")?"stage-work-item-not-implementable":error.message.includes("business-ticket")?"business-ticket-not-implementable":"ticket-content-unreadable"], [error.message]); }
  }
  const repositoryResult = validateImplementationRepositoriesReady(state, { exists, read, ...decisionOptions });
  if (repositoryResult.result === "blocked") return repositoryResult;
  const decomposition = state?.ticket_decomposition_result;
  const ticket = state?.vertical_slice_ticket;
  const contract = state?.slice_contract;
  const decompositionRef = state?.ticket_decomposition_result_ref;
  const sliceRef = state?.vertical_slice_ticket_ref;
  const sliceRole = state?.vertical_slice_ticket_role;
  const sliceKind = state?.vertical_slice_ticket_kind;
  const trackerKind = state?.tracker_kind ?? "local-markdown";
  const evidenceRefs = decomposition?.evidence_refs ?? [];
  const persistedDecomposition = readDecompositionResult(decompositionRef, read);
  const signals = [];
  const missing = [];

  if (decomposition?.result !== "completed") {
    signals.push(BLOCKING_SIGNALS.decompositionIncomplete);
    missing.push("ticket_decomposition_result.result=completed");
  }
  if (!persistedDecomposition || persistedDecomposition.result_schema !== "workflow-execution-result-v1" || persistedDecomposition.result !== "completed" || persistedDecomposition.work_unit !== TICKET_DECOMPOSITION_WORK_UNIT) {
    signals.push(BLOCKING_SIGNALS.decompositionIncomplete);
    missing.push("ticket_decomposition_result_ref must contain completed work-unit.ticket-decomposition result");
  }
  if (persistedDecomposition && Array.isArray(persistedDecomposition.evidence_refs)) {
    if (persistedDecomposition.evidence_refs.some((ref) => !isReadable(ref, exists))) {
      signals.push(BLOCKING_SIGNALS.missingEvidence);
      missing.push("persisted decomposition result evidence_refs must be readable");
    }
  }
  if (!isReadable(decompositionRef, exists) || !evidenceRefs.includes(decompositionRef)) {
    signals.push(BLOCKING_SIGNALS.decompositionRefMissing);
    missing.push("readable ticket_decomposition_result_ref included in evidence_refs");
  }
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0 || evidenceRefs.some((ref) => !isReadable(ref, exists))) {
    signals.push(BLOCKING_SIGNALS.missingEvidence);
    missing.push("readable ticket_decomposition_result.evidence_refs");
  }
  if (!hasText(sliceRef)) {
    signals.push(BLOCKING_SIGNALS.sliceRefMissing);
    missing.push("vertical_slice_ticket_ref");
  }
  if (!hasText(sliceKind)) {
    signals.push(BLOCKING_SIGNALS.kindMissing);
    missing.push("vertical_slice_ticket_kind");
  }
  if (!hasText(sliceRole)) {
    signals.push(BLOCKING_SIGNALS.roleMissing);
    missing.push("vertical_slice_ticket_role");
  }
  if (!ticket || !hasText(ticket.ref)) {
    signals.push(BLOCKING_SIGNALS.missingSlice);
    missing.push("vertical_slice_ticket.ref");
  } else {
    if (sliceRef !== ticket.ref) {
      signals.push(BLOCKING_SIGNALS.contractMismatch);
      missing.push("vertical_slice_ticket_ref=vertical_slice_ticket.ref");
    }
    if (sliceKind !== ticket.kind) {
      signals.push(BLOCKING_SIGNALS.wrongKind);
      missing.push("vertical_slice_ticket_kind=vertical_slice_ticket.kind");
    }
    if (sliceRole !== ticket.role) {
      signals.push(BLOCKING_SIGNALS.wrongRole);
      missing.push("vertical_slice_ticket_role=vertical_slice_ticket.role");
    }
    let validTicket = false;
    try {validTicket = validateTicketReference(ticket.ref, trackerKind, decisionOptions.root || ROOT);}
    catch (error) {missing.push(error.message);}
    if (!validTicket) {
      signals.push(ticket.kind === "parent-ticket" || ticket.ref.endsWith("/parent-ticket.md") ? BLOCKING_SIGNALS.parentTicket : BLOCKING_SIGNALS.missingSlice);
      missing.push(trackerKind === "local-markdown" ? "vertical_slice_ticket.ref under configured feature root/issues/" : "remote tracker Ticket reference");
    }
    if (ticket.kind === "parent-ticket" || ticket.ref.endsWith("/parent-ticket.md")) {
      signals.push(BLOCKING_SIGNALS.parentTicket);
      missing.push("vertical_slice_ticket.kind=vertical-slice-ticket");
    } else if (ticket.kind !== "vertical-slice-ticket") {
      signals.push(BLOCKING_SIGNALS.wrongKind);
      missing.push("vertical_slice_ticket.kind=vertical-slice-ticket");
    }
    if (ticket.role !== "ready-for-agent") {
      signals.push(BLOCKING_SIGNALS.wrongRole);
      missing.push("vertical_slice_ticket.role=ready-for-agent");
    }
    if (trackerKind === "local-markdown" && !isReadable(ticket.ref, exists)) {
      signals.push(BLOCKING_SIGNALS.unreadableSlice);
      missing.push("readable vertical_slice_ticket.ref");
    }
  }
  if (!contract || !hasText(contract.ticket_ref) || contract.ticket_ref !== ticket?.ref) {
    signals.push(BLOCKING_SIGNALS.contractMismatch);
    missing.push("slice_contract.ticket_ref=vertical_slice_ticket.ref");
  }
  if (contract?.status !== "approved") {
    signals.push(BLOCKING_SIGNALS.contractNotApproved);
    missing.push("slice_contract.status=approved");
  }
  if (contract?.persisted !== true) {
    signals.push(BLOCKING_SIGNALS.contractNotPersisted);
    missing.push("slice_contract.persisted=true");
  }
  if (contract?.current_version !== true) {
    signals.push(BLOCKING_SIGNALS.contractNotCurrent);
    missing.push("slice_contract.current_version=true");
  }
  if (state?.stale === true || (Array.isArray(state?.stale_inputs) && state.stale_inputs.length > 0)) {
    signals.push(BLOCKING_SIGNALS.stale);
    missing.push("ticket formalization inputs are current");
  }

  try {
    assertImplementationDecision(state, decisionOptions);
  } catch (error) {
    signals.push(error.code || "user-decision-invalid");
    missing.push(error.message);
  }
  return signals.length === 0 ? allowedResult(evidenceRefs) : blockedResult(signals, missing, evidenceRefs);
}

/**
 * Validate the complete implementation entry seam after ready-for-agent promotion.
 */
export function validateImplementationEntry(state, options = {}) {
  try { assertProgressionEntry(IMPLEMENTATION_WORK_UNIT, {root: options.root || ROOT, checkpointRef: state?.checkpoint_ref, assetRef: state?.vertical_slice_ticket_ref}); }
  catch (error) { return blockedResult(['progression-target-blocked'], [error.message]); }
  try { assertScopeWorkUnit(IMPLEMENTATION_WORK_UNIT, options); assertScopeImpacts(state, options); }
  catch (error) { return blockedResult(['execution-scope-blocked'], [error.message]); }
  const ticketResult = validateTicketFormalization(state, options);
  if (ticketResult.result === "blocked") return ticketResult;
  if (state?.predecessor_work_unit !== TICKET_DECOMPOSITION_WORK_UNIT) {
    return blockedResult([BLOCKING_SIGNALS.invalidPredecessor], ["predecessor_work_unit=work-unit.ticket-decomposition"], ticketResult.evidence_refs);
  }
  if (state?.ready_for_agent !== true) {
    return blockedResult([BLOCKING_SIGNALS.wrongRole], ["ready_for_agent=true"], ticketResult.evidence_refs);
  }
  return ticketResult;
}

export const lifecycleTransitionContract = Object.freeze({
  implementation_work_unit: IMPLEMENTATION_WORK_UNIT,
  ticket_decomposition_work_unit: TICKET_DECOMPOSITION_WORK_UNIT,
  repository_preparation_work_unit: REPOSITORY_PREPARATION_WORK_UNIT,
  next_routes: NEXT_ROUTES,
  blocking_signals: BLOCKING_SIGNALS,
});
