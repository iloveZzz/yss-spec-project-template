// Wire capability marker: profile-local readiness rules are not interchangeable.
export const SLICE_REPOSITORY_PREPARATION_PROTOCOL = 1;
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseDocument } from "../vendor/yaml.mjs";
import { assertWorkUnitUserDecision, assertImplementationDecision } from "./user-decision.mjs";
import { enforceFrontendDelivery } from "./frontend-delivery-boundary.mjs";
import { validatePlanSpecEntry } from "./plan-spec-entry.mjs";
import path from "node:path";
import { validateApiContractDecision } from "./api-contract-decision.mjs";
import { loadApprovalRecord, validateApprovalRecord } from "./approval-record.mjs";
import { validateBackendReview } from "./backend-review.mjs";
import { ROOT } from "./lifecycle-registry.mjs";

const IMPLEMENTATION_WORK_UNIT = "work-unit.slice-implementation";
const TICKET_DECOMPOSITION_WORK_UNIT = "work-unit.ticket-decomposition";
const REPOSITORY_PREPARATION_WORK_UNIT = "work-unit.implementation-repository-preparation";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const NEXT_ROUTES = deepFreeze({
  "work-unit.entry-triage": ["work-unit.plan-opportunity", "work-unit.plan-requirements"],
  "work-unit.ssot-update": ["work-unit.skill-projection-sync", "work-unit.intensity-aware-verification"],
  "work-unit.skill-projection-sync": ["work-unit.template-snapshot-build", "work-unit.intensity-aware-verification"],
  "work-unit.template-snapshot-build": ["work-unit.attach-sync-integration", "work-unit.intensity-aware-verification"],
  "work-unit.attach-sync-integration": ["work-unit.intensity-aware-verification"],
  "work-unit.intensity-aware-verification": ["work-unit.intensity-aware-review"],
  "work-unit.intensity-aware-review": ["work-unit.release-and-rollback"],
  "work-unit.release-and-rollback": [],
  "work-unit.plan-opportunity": ["work-unit.plan-requirements", "work-unit.domain-strategy-design", "work-unit.stage-decision", "work-unit.spec-synthesis"],
  "work-unit.plan-requirements": ["work-unit.domain-strategy-design", "work-unit.stage-decision", "work-unit.spec-synthesis"],
  "work-unit.domain-strategy-design": ["work-unit.stage-decision", "work-unit.spec-synthesis"],
  "work-unit.stage-decision": ["work-unit.spec-synthesis"],
  "work-unit.spec-synthesis": ["work-unit.prototype-design", "work-unit.technical-analysis"],
  "work-unit.prototype-design": ["work-unit.technical-analysis"],
  "work-unit.technical-analysis": [REPOSITORY_PREPARATION_WORK_UNIT],
  [REPOSITORY_PREPARATION_WORK_UNIT]: [TICKET_DECOMPOSITION_WORK_UNIT],
  [TICKET_DECOMPOSITION_WORK_UNIT]: [IMPLEMENTATION_WORK_UNIT],
  [IMPLEMENTATION_WORK_UNIT]: ["work-unit.frontend-implementation-verification", "work-unit.code-review"],
  "work-unit.frontend-implementation-verification": ["work-unit.code-review"],
  "work-unit.code-review": ["work-unit.release-and-retrospective", IMPLEMENTATION_WORK_UNIT],
  "work-unit.release-and-retrospective": [],
});

const BLOCKING_SIGNALS = Object.freeze({
  invalidRoute: "illegal-next-route",
  implementationBeforeTickets: "ticket-formalization-required",
  invalidPredecessor: "invalid-implementation-predecessor",
  decompositionIncomplete: "ticket-decomposition-incomplete",
  decompositionRefMissing: "ticket-decomposition-result-ref-missing",
  missingSlice: "vertical-slice-ticket-required",
  sliceRefMissing: "vertical-slice-ticket-ref-missing",
  parentTicket: "parent-ticket-forbidden",
  wrongKind: "vertical-slice-ticket-kind-invalid",
  kindMissing: "vertical-slice-ticket-kind-missing",
  unreadableSlice: "vertical-slice-ticket-unreadable",
  wrongRole: "ticket-not-ready-for-agent",
  roleMissing: "vertical-slice-ticket-role-missing",
  contractMismatch: "slice-contract-ticket-mismatch",
  contractNotApproved: "slice-contract-not-approved",
  contractNotPersisted: "slice-contract-not-persisted",
  contractNotCurrent: "slice-contract-not-current",
  missingEvidence: "ticket-formalization-evidence-missing",
  stale: "ticket-formalization-stale",
  repositoryDecisionRequired: "implementation-repository-decision-required",
  repositoryLocationRequired: "implementation-repository-location-required",
  repositoryOnboardingIncomplete: "implementation-repository-onboarding-incomplete",
  scaffoldChoiceRequired: "scaffold-choice-required",
  scaffoldContractUnapproved: "scaffold-contract-unapproved",
  scaffoldGenerationIncomplete: "scaffold-generation-incomplete",
  scaffoldVerificationFailed: "scaffold-verification-failed",
  frontendTemplateUnavailable: "frontend-template-unavailable",
  implementationRepositoriesStale: "implementation-repositories-stale",
  technicalAnalysisRequired: "technical-analysis-required",
  backendDesignPrerequisitesMissing: "backend-design-prerequisites-missing",
  legacyScaffoldReconciliationRequired: "legacy-scaffold-reconciliation-required",
  prematureImplementationDetected: "premature-implementation-detected",
});

const allowedResult = (evidenceRefs = []) => ({
  result: "allowed",
  blocking_signals: [],
  missing_requirements: [],
  evidence_refs: evidenceRefs,
  next_work_unit: null,
});

const blockedResult = (signals, missing = [], evidenceRefs = []) => ({
  result: "blocked",
  blocking_signals: [...new Set(signals)],
  missing_requirements: [...new Set(missing)],
  evidence_refs: evidenceRefs,
  next_work_unit: null,
});

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isReadable(ref, exists) {
  return hasText(ref) && exists(ref);
}

function readDecompositionResult(ref, read) {
  if (!hasText(ref)) return null;
  try {
    const document = parseDocument(read(ref), { maxAliasCount: 0, uniqueKeys: true });
    if (document.errors.length > 0) return null;
    const value = document.toJS({ maxAliasCount: 0 });
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function artifactBindingReady(binding, exists) {
  return hasText(binding?.ref) && /^v[1-9][0-9]*$/.test(binding?.version ?? "") && /^sha256:[a-f0-9]{64}$/.test(binding?.digest ?? "") && isReadable(binding.ref, exists);
}

function approvalHasBinding(approval, expected) {
  return Array.isArray(approval?.artifact_bindings) && approval.artifact_bindings.some((binding) =>
    binding?.id === expected.id && binding.version === expected.version && binding.digest === expected.digest);
}

function loadBoundArtifact(root, binding, idField, versionField) {
  const file = path.isAbsolute(binding.ref) ? binding.ref : path.resolve(root, binding.ref);
  const bytes = readFileSync(file);
  if (`sha256:${createHash("sha256").update(bytes).digest("hex")}` !== binding.digest) throw new TypeError(`${binding.ref} 原始字节摘要漂移`);
  const document = parseDocument(bytes.toString("utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(`${binding.ref} 无法解析`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || value.status !== "approved" || value[versionField] !== binding.version || !hasText(value[idField])) throw new TypeError(`${binding.ref} 不是当前批准资产`);
  return { value, expected: { id: value[idField], version: value[versionField], digest: binding.digest } };
}

function samePackageBinding(actual, expected, includeImpact = false) {
  return actual?.ref === expected.ref && actual.version === expected.version && actual.digest === expected.digest
    && (!includeImpact || actual.impact === expected.impact);
}

function approvalPackageReady(approval, prerequisites, technical, data, api, root, projectId) {
  const file = path.isAbsolute(approval.subject_ref) ? approval.subject_ref : path.resolve(root, approval.subject_ref);
  const document = parseDocument(readFileSync(file, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) return false;
  const value = document.toJS({ maxAliasCount: 0 });
  if (value?.schema_version !== 1 || value?.kind !== "engineering-contract-package" || value?.project_id !== projectId) return false;
  if (!samePackageBinding(value.technical_design, { ...prerequisites.technical_design, version: technical.value.version })) return false;
  if (!samePackageBinding(value.data_architecture_decision, { ...prerequisites.data_architecture_decision, version: data.value.decision_version, impact: data.value.impact }, true)) return false;
  if (!samePackageBinding(value.api_contract_decision, { ...prerequisites.api_contract_decision, version: api.decision.decision_version, impact: api.decision.impact }, true)) return false;
  if (api.decision.impact === "required") return samePackageBinding(value.frozen_openapi, api.decision.openapi) && value.frozen_openapi.id === api.decision.openapi.id;
  return !Object.hasOwn(value, "frozen_openapi");
}

function backendDesignPrerequisitesReady(prerequisites, exists, root, projectId) {
  const structurallyReady = artifactBindingReady(prerequisites?.technical_design, exists)
    && artifactBindingReady(prerequisites?.data_architecture_decision, exists)
    && ["required", "not-applicable"].includes(prerequisites?.data_architecture_decision?.impact)
    && artifactBindingReady(prerequisites?.api_contract_decision, exists)
    && ["required", "not-applicable"].includes(prerequisites?.api_contract_decision?.impact)
    && isReadable(prerequisites?.engineering_contract_approval_ref, exists);
  if (!structurallyReady) return false;
  try {
    const technical = loadBoundArtifact(root, prerequisites.technical_design, "technical_design_id", "version");
    const data = loadBoundArtifact(root, prerequisites.data_architecture_decision, "decision_id", "decision_version");
    const api = validateApiContractDecision(prerequisites.api_contract_decision, { root });
    const approvalFile = path.isAbsolute(prerequisites.engineering_contract_approval_ref)
      ? prerequisites.engineering_contract_approval_ref
      : path.resolve(root, prerequisites.engineering_contract_approval_ref);
    const approval = loadApprovalRecord(approvalFile, 'gate.engineering-contract-approved');
    validateApprovalRecord(approval, { requireApproved: true, root });
    if (approval.gate_id !== "gate.engineering-contract-approved" || !approval.approval_scope?.includes(projectId)) return false;
    if (!approvalHasBinding(approval, technical.expected) || !approvalHasBinding(approval, data.expected)) return false;
    if (!approvalHasBinding(approval, { id: api.decision.decision_id, version: api.decision.decision_version, digest: prerequisites.api_contract_decision.digest })) return false;
    if (api.decision.impact === "required" && !approvalHasBinding(approval, api.decision.openapi)) return false;
    return approvalPackageReady(approval, prerequisites, technical, data, api, root, projectId);
  } catch {
    return false;
  }
}

function sameBackendDesignPrerequisites(expected, actual) {
  return ["technical_design", "data_architecture_decision", "api_contract_decision"].every((key) =>
    expected?.[key]?.ref === actual?.[key]?.ref
    && expected?.[key]?.version === actual?.[key]?.version
    && expected?.[key]?.digest === actual?.[key]?.digest)
    && expected?.engineering_contract_approval_ref === actual?.engineering_contract_approval_ref;
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

function validateTicketPath(ref) {
  if (!hasText(ref)) return false;
  return /^docs\/\.scratch\/[^/]+\/issues\/[^/]+\.md$/.test(ref);
}

function validateTicketReference(ref, trackerKind) {
  if (trackerKind === "github" || trackerKind === "gitlab") {
    return /^(https?:\/\/|(?:github|gitlab):)[^\s]+$/.test(ref);
  }
  return validateTicketPath(ref);
}

/**
 * Validate a lifecycle work-unit transition without mutating state.
 * `nextRoute` is null only for a terminal work unit. A blocked or needs-human
 * Workflow Execution Result may omit a route; completed results are checked
 * by `validateWorkflowExecutionResult` before this function is called.
 */
export function validateNextRoute(currentWorkUnit, nextRoute, decisionState, options = {}) {
  if (currentWorkUnit === "work-unit.code-review" && nextRoute === "work-unit.release-and-retrospective") {
    try { validateBackendReview(decisionState, { root: options.root || ROOT }); }
    catch (error) { return blockedResult(["backend-review-incomplete"], [error.message]); }
  }


  if (["work-unit.technical-analysis", TICKET_DECOMPOSITION_WORK_UNIT, IMPLEMENTATION_WORK_UNIT, "work-unit.frontend-implementation-verification"].includes(nextRoute)) {
    try { enforceFrontendDelivery(decisionState, { root: options.root, phase: nextRoute === IMPLEMENTATION_WORK_UNIT ? "implementation" : "inputs" }); }
    catch (error) { return blockedResult(["frontend-delivery-blocked"], [error.message]); }
  }
  const routes = NEXT_ROUTES[currentWorkUnit];
  if (!routes) return blockedResult([BLOCKING_SIGNALS.invalidRoute], ["known_current_work_unit"]);
  if (nextRoute === REPOSITORY_PREPARATION_WORK_UNIT && currentWorkUnit !== "work-unit.technical-analysis") {
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
  if (nextRoute === REPOSITORY_PREPARATION_WORK_UNIT) {
    const analysis = validateTechnicalAnalysisCompletion(decisionState, options);
    if (analysis.result === "blocked") return analysis;
  }
  if (nextRoute === 'work-unit.spec-synthesis' || currentWorkUnit === 'work-unit.spec-synthesis') {
    const entry = validatePlanSpecEntry(decisionState, options);
    if (entry.result === 'blocked' || nextRoute === 'work-unit.spec-synthesis') return entry;
  }
  if (nextRoute === TICKET_DECOMPOSITION_WORK_UNIT) {
    const readiness = validateImplementationRepositoriesReady(decisionState, options);
    if (readiness.result === "blocked") return readiness;
  }
  return decisionState ? validateDecisionBoundary(currentWorkUnit, decisionState, options) : allowedResult();
}

/**
 * Validate the aggregate stage-5 repository-preparation result. Every affected
 * delivery role must resolve to an onboarded existing repository or a freshly
 * generated and verified scaffold. Unaffected roles need an explicit reason.
 */
export function validateImplementationRepositoriesReady(state, { exists = existsSync, read = (ref) => readFileSync(ref, "utf8"), root = ROOT } = {}) {
  const preparation = state?.implementation_repository_preparation;
  const impacts = state?.delivery_impacts;
  const signals = [];
  const missing = [];
  const evidenceRefs = Array.isArray(preparation?.evidence_refs) ? preparation.evidence_refs : [];

  if (!preparation || preparation.schema_version !== 2 || preparation.kind !== "implementation-repository-preparation-result" || preparation.result !== "completed" || !Array.isArray(preparation.projects)) {
    return blockedResult([BLOCKING_SIGNALS.repositoryDecisionRequired], ["completed implementation_repository_preparation with projects"]);
  }
  if (preparation.current_version !== true || state?.implementation_repositories_stale === true) {
    signals.push(BLOCKING_SIGNALS.implementationRepositoriesStale);
    missing.push("implementation repository preparation is current");
  }
  if (evidenceRefs.length === 0 || evidenceRefs.some((ref) => !isReadable(ref, exists))) {
    signals.push(BLOCKING_SIGNALS.repositoryOnboardingIncomplete);
    missing.push("readable implementation_repository_preparation.evidence_refs");
  }

  for (const role of ["backend", "frontend"]) {
    const affected = impacts?.[role] === true;
    const projects = preparation.projects.filter((project) => project?.delivery_role === role);
    if (affected && projects.length === 0) {
      signals.push(BLOCKING_SIGNALS.repositoryDecisionRequired);
      missing.push(`${role} repository decision`);
    }
    if (!affected && projects.length === 0) {
      signals.push(BLOCKING_SIGNALS.repositoryDecisionRequired);
      missing.push(`${role} not-applicable decision with reason`);
    }
    for (const project of projects) {
      if (!hasText(project.project_id) || !hasText(project.status)) {
        signals.push(BLOCKING_SIGNALS.repositoryDecisionRequired);
        missing.push(`${role} project_id and status`);
        continue;
      }
      if (project.status === "not-applicable") {
        if (affected || !hasText(project.reason)) {
          signals.push(BLOCKING_SIGNALS.repositoryDecisionRequired);
          missing.push(`${project.project_id} not-applicable reason for an unaffected role`);
        }
        continue;
      }
      if (!hasText(project.repository_ref) || !hasText(project.project_root) || !hasText(project.repository_scope)) {
        signals.push(BLOCKING_SIGNALS.repositoryLocationRequired);
        missing.push(`${project.project_id} repository_ref, project_root and repository_scope`);
      }
      if (role === "backend" && !backendDesignPrerequisitesReady(project.design_prerequisites, exists, path.resolve(root), project.project_id)) {
        signals.push(BLOCKING_SIGNALS.backendDesignPrerequisitesMissing);
        missing.push(`${project.project_id} readable Technical Design, Data Architecture Decision, API Contract Decision and atomic engineering approval bindings`);
      }
      if (project.status === "existing-and-onboarded") {
        if (project.onboarding_result?.status !== "completed" || !isReadable(project.onboarding_result?.ref, exists)) {
          signals.push(BLOCKING_SIGNALS.repositoryOnboardingIncomplete);
          missing.push(`${project.project_id} readable completed onboarding result`);
        }
      } else if (project.status === "initialized-and-verified") {
        if (role === "backend" && !hasText(project.architecture_family)) {
          signals.push(BLOCKING_SIGNALS.scaffoldChoiceRequired);
          missing.push(`${project.project_id} confirmed backend architecture_family`);
        }
        const contract = project.scaffold_contract;
        if (![3, 4].includes(contract?.schema_version) || contract?.status !== "approved" || contract?.persisted !== true || contract?.current_version !== true || (role === "frontend" && contract?.schema_version !== 4)) {
          signals.push(BLOCKING_SIGNALS.scaffoldContractUnapproved);
          missing.push(`${project.project_id} approved persisted current scaffold contract`);
        }
        if (!isReadable(project.scaffold_manifest_ref, exists)) {
          signals.push(BLOCKING_SIGNALS.scaffoldGenerationIncomplete);
          missing.push(`${project.project_id} readable scaffold manifest`);
        }
        const manifest = readDecompositionResult(project.scaffold_manifest_ref, read);
        if (role === "backend" && contract?.schema_version === 4) {
          if (manifest?.schema_version !== 4 || manifest?.completion_level !== "empty-scaffold-verified" || !sameBackendDesignPrerequisites(project.design_prerequisites, manifest?.design_prerequisites)) {
            signals.push(BLOCKING_SIGNALS.scaffoldGenerationIncomplete);
            missing.push(`${project.project_id} v4 Manifest with empty-scaffold-verified and matching design prerequisites`);
          }
        }
        if (role === "backend" && contract?.schema_version === 3) {
          const legacy = project.legacy_reconciliation;
          let digestMatches = false;
          try { digestMatches = legacy?.manifest_digest === `sha256:${createHash("sha256").update(read(project.scaffold_manifest_ref)).digest("hex")}`; } catch {}
          if (manifest?.schema_version !== 3 || manifest?.completion_level !== "empty-scaffold-verified" || legacy?.status !== "approved" || legacy?.ownership_state !== "unchanged-mechanical-scaffold" || legacy?.premature_implementation !== false || legacy?.manifest_ref !== project.scaffold_manifest_ref || !digestMatches || !isReadable(legacy?.ownership_check_ref, exists) || !isReadable(legacy?.recovery_approval_ref, exists)) {
            signals.push(legacy?.premature_implementation === true ? BLOCKING_SIGNALS.prematureImplementationDetected : BLOCKING_SIGNALS.legacyScaffoldReconciliationRequired);
            missing.push(`${project.project_id} approved legacy v3 reconciliation with unchanged mechanical ownership and recovery approval`);
          }
        }
        if (project.scaffold_verification?.status !== "passed" || !isReadable(project.scaffold_verification?.ref, exists)) {
          signals.push(BLOCKING_SIGNALS.scaffoldVerificationFailed);
          missing.push(`${project.project_id} readable passed scaffold verification`);
        }
        if (role === "frontend" && project.template_available !== true) {
          signals.push(BLOCKING_SIGNALS.frontendTemplateUnavailable);
          missing.push(`${project.project_id} verified frontend template source`);
        }
      } else {
        signals.push(BLOCKING_SIGNALS.repositoryDecisionRequired);
        missing.push(`${project.project_id} supported repository preparation status`);
      }
    }
  }
  return signals.length === 0 ? allowedResult(evidenceRefs) : blockedResult(signals, missing, evidenceRefs);
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
  try { enforceFrontendDelivery(state, { root: decisionOptions.root, phase: "implementation" }); }
  catch (error) { return blockedResult(["frontend-delivery-blocked"], [error.message]); }
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
    if (!validateTicketReference(ticket.ref, trackerKind)) {
      signals.push(ticket.kind === "parent-ticket" || ticket.ref.endsWith("/parent-ticket.md") ? BLOCKING_SIGNALS.parentTicket : BLOCKING_SIGNALS.missingSlice);
      missing.push(trackerKind === "local-markdown" ? "vertical_slice_ticket.ref under docs/.scratch/<feature>/issues/" : "remote tracker Ticket reference");
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
    assertImplementationDecision(state, { ...decisionOptions, read });
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
