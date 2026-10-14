import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
import { loadApprovalRecord, validateApprovalRecord } from "./native-approval.mjs";
import { assertScopeImpacts } from './lifecycle-execution-scope.mjs';
import { approvalExpectationForBoundAsset } from './native-approval.mjs';
import { validateApiContractDecision } from './api-contract-decision.mjs';

// 工作流校验与「多项目准备」共用的就绪判定。放在 lifecycle-transition 之下，slice-repositories 才不必回头导入整个流转模块。
// Wire capability marker: profile-local readiness rules are not interchangeable.
export const SLICE_REPOSITORY_PREPARATION_PROTOCOL = 1;

export const BLOCKING_SIGNALS = Object.freeze({
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
  serviceInitializationInvalid: "service-project-initialization-invalid",
  serviceInitializationIncomplete: "service-project-initialization-incomplete",
});

export const allowedResult = (evidenceRefs = []) => ({
  result: "allowed",
  blocking_signals: [],
  missing_requirements: [],
  evidence_refs: evidenceRefs,
  next_work_unit: null,
});

export const blockedResult = (signals, missing = [], evidenceRefs = []) => ({
  result: "blocked",
  blocking_signals: [...new Set(signals)],
  missing_requirements: [...new Set(missing)],
  evidence_refs: evidenceRefs,
  next_work_unit: null,
});

export function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isReadable(ref, exists) {
  return hasText(ref) && exists(ref);
}

export function readDecompositionResult(ref, read) {
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


export function artifactBindingReady(binding, exists) {
  return hasText(binding?.ref) && /^v[1-9][0-9]*$/.test(binding?.version ?? "") && /^sha256:[a-f0-9]{64}$/.test(binding?.digest ?? "") && isReadable(binding.ref, exists);
}

export function approvalHasBinding(approval, expected) {
  return Array.isArray(approval?.artifact_bindings) && approval.artifact_bindings.some((binding) =>
    binding?.id === expected.id && binding.version === expected.version && binding.digest === expected.digest);
}

export function loadBoundArtifact(root, binding, idField, versionField) {
  const file = path.isAbsolute(binding.ref) ? binding.ref : path.resolve(root, binding.ref);
  const bytes = readFileSync(file);
  if (`sha256:${createHash("sha256").update(bytes).digest("hex")}` !== binding.digest) throw new TypeError(`${binding.ref} 原始字节摘要漂移`);
  const document = parseDocument(bytes.toString("utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(`${binding.ref} 无法解析`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || value.status !== "approved" || value[versionField] !== binding.version || !hasText(value[idField])) throw new TypeError(`${binding.ref} 不是当前批准资产`);
  return { value, expected: { id: value[idField], version: value[versionField], digest: binding.digest } };
}

export function samePackageBinding(actual, expected, includeImpact = false) {
  return actual?.ref === expected.ref && actual.version === expected.version && actual.digest === expected.digest
    && (!includeImpact || actual.impact === expected.impact);
}

export function approvalPackageReady(approval, prerequisites, technical, data, api, root, projectId) {
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

export function backendDesignPrerequisitesReady(prerequisites, exists, root, projectId) {
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
    validateApprovalRecord(approval, { requireApproved: true, root, expected: approvalExpectationForBoundAsset('gate.engineering-contract-approved',prerequisites.technical_design,{root}) });
    if (approval.gate_id !== "gate.engineering-contract-approved" || !approval.approval_scope?.includes(projectId)) return false;
    if (!approvalHasBinding(approval, technical.expected) || !approvalHasBinding(approval, data.expected)) return false;
    if (!approvalHasBinding(approval, { id: api.decision.decision_id, version: api.decision.decision_version, digest: prerequisites.api_contract_decision.digest })) return false;
    if (api.decision.impact === "required" && !approvalHasBinding(approval, api.decision.openapi)) return false;
    return approvalPackageReady(approval, prerequisites, technical, data, api, root, projectId);
  } catch {
    return false;
  }
}

export function sameBackendDesignPrerequisites(expected, actual) {
  return ["technical_design", "data_architecture_decision", "api_contract_decision"].every((key) =>
    expected?.[key]?.ref === actual?.[key]?.ref
    && expected?.[key]?.version === actual?.[key]?.version
    && expected?.[key]?.digest === actual?.[key]?.digest)
    && expected?.engineering_contract_approval_ref === actual?.engineering_contract_approval_ref;
}


/**
 * Validate the aggregate stage-5 repository-preparation result. Every affected
 * delivery role must resolve to an onboarded existing repository or a freshly
 * generated and verified scaffold. Unaffected roles need an explicit reason.
 */
export function validateImplementationRepositoriesReady(state, { exists = existsSync, read = (ref) => readFileSync(ref, "utf8"), root = ROOT } = {}) {
  try { assertScopeImpacts(state, { root }); }
  catch (error) { return blockedResult(['execution-scope-blocked'], [error.message]); }
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
        if (![3, 4, 5].includes(contract?.schema_version) || contract?.status !== "approved" || contract?.persisted !== true || contract?.current_version !== true || (role === "frontend" && contract?.schema_version !== 4)) {
          signals.push(BLOCKING_SIGNALS.scaffoldContractUnapproved);
          missing.push(`${project.project_id} approved persisted current scaffold contract`);
        }
        if (!isReadable(project.scaffold_manifest_ref, exists)) {
          signals.push(BLOCKING_SIGNALS.scaffoldGenerationIncomplete);
          missing.push(`${project.project_id} readable scaffold manifest`);
        }
        const manifest = readDecompositionResult(project.scaffold_manifest_ref, read);
        if (role === "backend" && contract?.schema_version >= 4) {
          if (manifest?.schema_version !== contract.schema_version || manifest?.architecture_profile === "mvc-data-analysis-v1" || manifest?.completion_level !== "empty-scaffold-verified" || !sameBackendDesignPrerequisites(project.design_prerequisites, manifest?.design_prerequisites)) {
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

