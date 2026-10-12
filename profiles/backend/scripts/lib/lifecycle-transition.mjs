import {approvalExpectationForBoundAsset} from './approval-consumption.mjs';
import {assertReadingTransition} from './reading-view-bundle.mjs';
import { assertTrackingTransition } from './stage-tracking.mjs';
import { validateBackendReview } from "./backend-review.mjs";
import { enforceFrontendDelivery } from "./frontend-delivery-boundary.mjs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadApprovalRecord, validateApprovalRecord } from "./approval-record.mjs";
import { validateApiContractDecision } from "./api-contract-decision.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
const IMPLEMENTATION_WORK_UNIT = "work-unit.slice-implementation";
const CONTRACT_WORK_UNIT = "work-unit.slice-contract";
const REPOSITORY_WORK_UNIT = "work-unit.implementation-repository-preparation";
const VERIFICATION_WORK_UNIT = "work-unit.verification";

const NEXT_ROUTES = Object.freeze({
  "work-unit.harness-entry": ["work-unit.technical-design"],
  "work-unit.technical-design": [REPOSITORY_WORK_UNIT],
  [REPOSITORY_WORK_UNIT]: [CONTRACT_WORK_UNIT],
  [CONTRACT_WORK_UNIT]: [IMPLEMENTATION_WORK_UNIT],
  [IMPLEMENTATION_WORK_UNIT]: [VERIFICATION_WORK_UNIT],
  [VERIFICATION_WORK_UNIT]: [],
  "work-unit.ssot-update": ["work-unit.skill-projection-sync", "work-unit.intensity-aware-verification"],
  "work-unit.skill-projection-sync": ["work-unit.intensity-aware-verification"],
  "work-unit.intensity-aware-verification": ["work-unit.intensity-aware-review"],
  "work-unit.intensity-aware-review": ["work-unit.release-and-rollback"],
  "work-unit.release-and-rollback": [],
});

const BLOCKING_SIGNALS = Object.freeze({
  invalidRoute: "illegal-next-route",
  missingReadiness: "readiness-requirement-missing",
  contractNotApproved: "slice-contract-not-approved",
  contractNotCurrent: "slice-contract-not-current",
  wrongPredecessor: "invalid-implementation-predecessor",
  blockingSignals: "contract-has-blocking-signals",
  missingSection: "slice-contract-section-missing",
  versionMismatch: "contract-version-mismatch",
  verifierConflict: "verifier-worker-conflict",
  technicalDesignRequired: "technical-design-required",
  repositoryPreparationRequired: "implementation-repository-preparation-required",
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

const text = (value) => typeof value === "string" && value.trim().length > 0;
const binding = (value, exists) => value?.status === "approved" && value?.current_version === true && text(value.ref) && /^v[1-9][0-9]*$/.test(value.version ?? "") && /^sha256:[a-f0-9]{64}$/.test(value.digest ?? "") && exists(value.ref);

function loadBoundArtifact(root, artifact, idField, versionField) {
  const file = path.isAbsolute(artifact.ref) ? artifact.ref : path.resolve(root, artifact.ref);
  const bytes = readFileSync(file);
  if (`sha256:${createHash("sha256").update(bytes).digest("hex")}` !== artifact.digest) throw new TypeError(`${artifact.ref} 原始字节摘要漂移`);
  const document = parseDocument(bytes.toString("utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(`${artifact.ref} 无法解析`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || value.status !== "approved" || value[versionField] !== artifact.version || !text(value[idField])) throw new TypeError(`${artifact.ref} 不是当前批准资产`);
  return { value, expected: { id: value[idField], version: value[versionField], digest: artifact.digest } };
}

function samePackageBinding(actual, expected, includeImpact = false) {
  return actual?.ref === expected.ref && actual.version === expected.version && actual.digest === expected.digest
    && (!includeImpact || actual.impact === expected.impact);
}

function apiApprovalReady(prerequisites, approvalRef, { root, projectId } = {}) {
  try {
    const technical = loadBoundArtifact(root, prerequisites.technical_design, "technical_design_id", "version");
    const data = loadBoundArtifact(root, prerequisites.data_architecture_decision, "decision_id", "decision_version");
    const apiBinding = prerequisites.api_contract_decision;
    const api = validateApiContractDecision(apiBinding, { root });
    const approvalFile = path.isAbsolute(approvalRef) ? approvalRef : path.resolve(root, approvalRef);
    const approval = loadApprovalRecord(approvalFile);
    validateApprovalRecord(approval, { requireApproved: true, root, expected:approvalExpectationForBoundAsset('gate.engineering-contract-approved',prerequisites.technical_design,{root}) });
    const bound = (expected) => approval.artifact_bindings?.some((item) => item?.id === expected.id && item.version === expected.version && item.digest === expected.digest);
    if (approval.gate_id !== "gate.engineering-contract-approved" || (projectId && !approval.approval_scope?.includes(projectId))) return false;
    if (!bound(technical.expected) || !bound(data.expected)) return false;
    if (!bound({ id: api.decision.decision_id, version: api.decision.decision_version, digest: apiBinding.digest })) return false;
    if (api.decision.impact === "required" && !bound(api.decision.openapi)) return false;
    const subjectFile = path.isAbsolute(approval.subject_ref) ? approval.subject_ref : path.resolve(root, approval.subject_ref);
    const packageDocument = parseDocument(readFileSync(subjectFile, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
    if (packageDocument.errors.length) return false;
    const value = packageDocument.toJS({ maxAliasCount: 0 });
    if (value?.schema_version !== 1 || value?.kind !== "engineering-contract-package" || (projectId && value?.project_id !== projectId)) return false;
    if (!samePackageBinding(value.technical_design, { ...prerequisites.technical_design, version: technical.value.version })) return false;
    if (!samePackageBinding(value.data_architecture_decision, { ...prerequisites.data_architecture_decision, version: data.value.decision_version, impact: data.value.impact }, true)) return false;
    if (!samePackageBinding(value.api_contract_decision, { ...apiBinding, version: api.decision.decision_version, impact: api.decision.impact }, true)) return false;
    if (api.decision.impact === "required") return samePackageBinding(value.frozen_openapi, api.decision.openapi) && value.frozen_openapi.id === api.decision.openapi.id;
    return !Object.hasOwn(value, "frozen_openapi");
  } catch {
    return false;
  }
}

export function validateTechnicalDesignCompletion(state, { exists = () => false, root = ROOT } = {}) {
  const handoff = state?.strategic_handoff_consumption;
  const spec = state?.approved_spec;
  const upstreamReady = (handoff?.result === "inputs-verified" && handoff?.ready_for_agent === false && text(handoff.ref) && exists(handoff.ref))
    || (spec?.status === "approved" && spec?.current_version === true && text(spec.ref) && exists(spec.ref));
  const reconciliationReady = state?.context_reconciliation?.status === "reconciled" && text(state.context_reconciliation.ref) && exists(state.context_reconciliation.ref);
  const technicalReady = binding(state?.technical_design, exists);
  const data = state?.data_architecture_decision;
  const dataReady = binding(data, exists) && ["required", "not-applicable"].includes(data.impact);
  const approvalReady = text(state?.engineering_contract_approval_ref) && exists(state.engineering_contract_approval_ref);
  const api = state?.api_contract_decision;
  const apiReady = binding(api, exists) && ["required", "not-applicable"].includes(api.impact)
    && apiApprovalReady({ technical_design: state.technical_design, data_architecture_decision: data, api_contract_decision: api }, state.engineering_contract_approval_ref, { root: path.resolve(root), projectId: state.project_id ?? "backend" });
  const missing = [];
  if (!upstreamReady) missing.push("approved Spec or Strategic Handoff consumption receipt with ready_for_agent=false");
  if (!reconciliationReady) missing.push("reconciled readable Context");
  if (!technicalReady) missing.push("approved current Technical Design binding");
  if (!dataReady) missing.push("approved current Data Architecture Decision required/not-applicable binding");
  if (!apiReady) missing.push("approved current API Contract Decision with atomic engineering approval binding");
  if (!approvalReady) missing.push("readable gate.engineering-contract-approved record");
  return missing.length ? blockedResult([BLOCKING_SIGNALS.technicalDesignRequired], missing) : allowedResult([handoff?.ref ?? spec?.ref, state.context_reconciliation.ref, state.technical_design.ref, data.ref, api.ref, state.engineering_contract_approval_ref]);
}

export function validateImplementationRepositoriesReady(state, { exists = () => false, root = ROOT } = {}) {
  const preparation = state?.implementation_repository_preparation;
  const missing = [];
  if (preparation?.schema_version !== 2 || preparation?.kind !== "implementation-repository-preparation-result" || preparation?.result !== "completed" || preparation?.current_version !== true || !Array.isArray(preparation?.projects)) {
    return blockedResult([BLOCKING_SIGNALS.repositoryPreparationRequired], ["completed current Implementation Repository Preparation Result v2"]);
  }
  if (!Array.isArray(preparation.evidence_refs) || preparation.evidence_refs.length === 0 || preparation.evidence_refs.some((ref) => !exists(ref))) missing.push("readable repository preparation evidence");
  const backend = preparation.projects.filter((project) => project?.delivery_role === "backend" && project.status !== "not-applicable");
  if (backend.length === 0) missing.push("backend repository preparation project");
  for (const project of backend) {
    const prerequisites = project.design_prerequisites;
    if (!binding({ ...prerequisites?.technical_design, status: "approved", current_version: true }, exists)
      || !binding({ ...prerequisites?.data_architecture_decision, status: "approved", current_version: true }, exists)
      || !["required", "not-applicable"].includes(prerequisites?.data_architecture_decision?.impact)
      || !binding({ ...prerequisites?.api_contract_decision, status: "approved", current_version: true }, exists)
      || !["required", "not-applicable"].includes(prerequisites?.api_contract_decision?.impact)
      || !apiApprovalReady(prerequisites, prerequisites?.engineering_contract_approval_ref, { root: path.resolve(root), projectId: project.project_id })
      || !text(prerequisites?.engineering_contract_approval_ref) || !exists(prerequisites.engineering_contract_approval_ref)) missing.push(`${project.project_id} design prerequisites`);
    if (!text(project.repository_ref) || !text(project.project_root) || !text(project.repository_scope)) missing.push(`${project.project_id} repository identity`);
    if (project.status === "existing-and-onboarded") {
      if (project.onboarding_result?.status !== "completed" || !exists(project.onboarding_result?.ref)) missing.push(`${project.project_id} onboarding result`);
    } else if (project.status === "initialized-and-verified") {
      const contract = project.scaffold_contract;
      if (contract?.schema_version === 4) {
        if (contract.status !== "approved" || contract.persisted !== true || contract.current_version !== true) missing.push(`${project.project_id} approved current Scaffold Contract v4`);
      } else if (contract?.schema_version === 3) {
        const legacy = project.legacy_reconciliation;
        if (legacy?.status !== "approved" || legacy?.ownership_state !== "unchanged-mechanical-scaffold" || legacy?.premature_implementation !== false || !exists(legacy?.ownership_check_ref) || !exists(legacy?.recovery_approval_ref)) missing.push(`${project.project_id} approved legacy reconciliation`);
      } else missing.push(`${project.project_id} supported scaffold contract`);
      if (!exists(project.scaffold_manifest_ref) || project.scaffold_verification?.status !== "passed" || !exists(project.scaffold_verification?.ref)) missing.push(`${project.project_id} scaffold Manifest and verification`);
    } else missing.push(`${project.project_id} supported repository status`);
  }
  return missing.length ? blockedResult([BLOCKING_SIGNALS.repositoryPreparationRequired], missing, preparation.evidence_refs ?? []) : allowedResult(preparation.evidence_refs);
}

export function validateNextRoute(currentWorkUnit, nextRoute, state, options = {}) {
  try { assertReadingTransition(options.root || ROOT, state, currentWorkUnit); }
  catch (error) { return blockedResult(['reading-views-stale'], [error.message]); }
  try { assertTrackingTransition(currentWorkUnit, nextRoute, state, { root: options.root || ROOT }); }
  catch (error) { return blockedResult(['stage-tracking-blocked'], [error.message]); }
  if (currentWorkUnit === VERIFICATION_WORK_UNIT && nextRoute === null) {
    try { validateBackendReview(state, { root: options.root || ROOT }); }
    catch (error) { return blockedResult(["backend-review-incomplete"], [error.message]); }
  }

  if (["work-unit.technical-design", CONTRACT_WORK_UNIT, IMPLEMENTATION_WORK_UNIT, VERIFICATION_WORK_UNIT].includes(nextRoute)) {
    try { enforceFrontendDelivery(state, { root: options.root, phase: nextRoute === IMPLEMENTATION_WORK_UNIT ? "implementation" : "inputs" }); }
    catch (error) { return blockedResult(["frontend-delivery-blocked"], [error.message]); }
  }
  const routes = NEXT_ROUTES[currentWorkUnit];
  if (!routes) return blockedResult([BLOCKING_SIGNALS.invalidRoute], ["known_current_work_unit"]);
  if (nextRoute === null && routes.length === 0) return allowedResult();
  if (typeof nextRoute !== "string" || !routes.includes(nextRoute)) {
    return blockedResult([BLOCKING_SIGNALS.invalidRoute], ["allowed_next_route"]);
  }
  if (nextRoute === REPOSITORY_WORK_UNIT) return validateTechnicalDesignCompletion(state, options);
  if (nextRoute === CONTRACT_WORK_UNIT) return validateImplementationRepositoriesReady(state, options);
  return allowedResult();
}

export function validateSliceContractReadiness(state, options = {}) {
  try { enforceFrontendDelivery(state, { root: options.root, phase: "implementation" }); }
  catch (error) { return blockedResult(["frontend-delivery-blocked"], [error.message]); }
  const contract = state?.slice_contract || state;
  const required = [
    "upstream_inputs_current_and_approved",
    "tactical_design_current_or_not_applicable_recorded",
    "api_freeze_or_no_api_impact_recorded",
    "data_architecture_or_no_data_impact_recorded",
    "ui_inputs_or_no_ui_impact_recorded",
    "implementation_repositories_and_commands_registered",
    "implementation_repository_preparation_completed",
    "allowed_write_paths_registered",
    "test_seams_and_acceptance_executable",
    "task_packages_share_contract_version",
  ];
  const missing = required.filter((key) => contract?.readiness?.[key] !== true);
  const signals = [];
  if (contract?.status !== "approved") signals.push(BLOCKING_SIGNALS.contractNotApproved);
  if (contract?.current_version !== true) signals.push(BLOCKING_SIGNALS.contractNotCurrent);
  if (missing.length) signals.push(BLOCKING_SIGNALS.missingReadiness);
  const sections = ["architecture", "frontend", "backend", "testing"];
  const missingSections = sections.filter((section) => !contract?.[section] || typeof contract[section] !== "object");
  if (missingSections.length) signals.push(BLOCKING_SIGNALS.missingSection);
  if (Array.isArray(contract?.readiness?.blockers) && contract.readiness.blockers.length) {
    signals.push(BLOCKING_SIGNALS.blockingSignals);
  }
  if (contract?.blocking_signals?.length) signals.push(BLOCKING_SIGNALS.blockingSignals);
  return signals.length === 0
    ? allowedResult(contract.evidence_refs || [])
    : blockedResult(signals, [...missing, ...missingSections.map((section) => "section:" + section)], contract.evidence_refs || []);
}

export function validateImplementationEntry(state, options = {}) {
  try { enforceFrontendDelivery(state, { root: options.root, phase: "implementation" }); }
  catch (error) { return blockedResult(["frontend-delivery-blocked"], [error.message]); }
  const repositories = validateImplementationRepositoriesReady(state, options);
  if (repositories.result === "blocked") return repositories;
  const readiness = validateSliceContractReadiness(state, options);
  if (readiness.result === "blocked") return readiness;
  if (state?.predecessor_work_unit !== CONTRACT_WORK_UNIT) {
    return blockedResult([BLOCKING_SIGNALS.wrongPredecessor], ["predecessor_work_unit=" + CONTRACT_WORK_UNIT], readiness.evidence_refs);
  }
  if (state?.ready_for_agent !== true) {
    return blockedResult([BLOCKING_SIGNALS.missingReadiness], ["ready_for_agent=true"], readiness.evidence_refs);
  }
  return readiness;
}

export const lifecycleTransitionContract = Object.freeze({
  implementation_work_unit: IMPLEMENTATION_WORK_UNIT,
  contract_work_unit: CONTRACT_WORK_UNIT,
  repository_work_unit: REPOSITORY_WORK_UNIT,
  verification_work_unit: VERIFICATION_WORK_UNIT,
  next_routes: NEXT_ROUTES,
  blocking_signals: BLOCKING_SIGNALS,
});
