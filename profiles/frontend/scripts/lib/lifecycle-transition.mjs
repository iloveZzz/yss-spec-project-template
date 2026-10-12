import {assertReadingTransition} from './reading-view-bundle.mjs';
import { ROOT } from './lifecycle-registry.mjs';
import { assertTrackingTransition } from './stage-tracking.mjs';
import { enforceFrontendDelivery } from "./frontend-delivery-boundary.mjs";
const IMPLEMENTATION_WORK_UNIT = "work-unit.slice-implementation";
const CONTRACT_WORK_UNIT = "work-unit.slice-contract";
const VERIFICATION_WORK_UNIT = "work-unit.verification";

const NEXT_ROUTES = Object.freeze({
  "work-unit.harness-entry": ["work-unit.frontend-engineering-design", CONTRACT_WORK_UNIT],
  "work-unit.frontend-engineering-design": [CONTRACT_WORK_UNIT],
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

export function validateNextRoute(currentWorkUnit, nextRoute, state, options = {}) {
  try { assertReadingTransition(options.root || ROOT, state, currentWorkUnit); }
  catch (error) { return blockedResult(['reading-views-stale'], [error.message]); }
  try { assertTrackingTransition(currentWorkUnit, nextRoute, state, { root: options.root || ROOT }); }
  catch (error) { return blockedResult(['stage-tracking-blocked'], [error.message]); }
  if (["work-unit.frontend-engineering-design", CONTRACT_WORK_UNIT, IMPLEMENTATION_WORK_UNIT, VERIFICATION_WORK_UNIT].includes(nextRoute)) {
    try { enforceFrontendDelivery(state, { root: options.root, phase: nextRoute === IMPLEMENTATION_WORK_UNIT ? "implementation" : "inputs" }); }
    catch (error) { return blockedResult(["frontend-delivery-blocked"], [error.message]); }
  }
  const routes = NEXT_ROUTES[currentWorkUnit];
  if (!routes) return blockedResult([BLOCKING_SIGNALS.invalidRoute], ["known_current_work_unit"]);
  if (nextRoute === null && routes.length === 0) return allowedResult();
  if (typeof nextRoute !== "string" || !routes.includes(nextRoute)) {
    return blockedResult([BLOCKING_SIGNALS.invalidRoute], ["allowed_next_route"]);
  }
  return allowedResult();
}

export function validateSliceContractReadiness(state, options = {}) {
  try { enforceFrontendDelivery(state, { root: options.root, phase: "implementation" }); }
  catch (error) { return blockedResult(["frontend-delivery-blocked"], [error.message]); }
  const contract = state?.slice_contract || state;
  const required = [
    "upstream_inputs_current_and_approved",
    "frontend_engineering_design_current_and_approved",
    "api_freeze_or_no_api_impact_recorded",
    "data_architecture_or_no_data_impact_recorded",
    "ui_inputs_or_no_ui_impact_recorded",
    "implementation_repositories_and_commands_registered",
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
  verification_work_unit: VERIFICATION_WORK_UNIT,
  next_routes: NEXT_ROUTES,
  blocking_signals: BLOCKING_SIGNALS,
});
