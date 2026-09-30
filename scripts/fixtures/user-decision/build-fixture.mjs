// Synthetic sources for tests only. Never use these helpers to record a real user's approval.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { decisionDigest, requestDigest, renderDecisionRequest, scaffoldDecisionSnapshot } from "../../lib/user-decision.mjs";
import { platformProfile } from "../../lib/backend-platform.mjs";
import { buildDecisionFixture } from "../../lib/testing/user-decision-fixture.mjs";
export { buildDecisionFixture };
export function buildImplementationFixture(root, ticketRef) {
  mkdirSync(root, { recursive: true });
  const baselineRef = path.join(root, "engineering-baseline.md");
  const contractRef = path.join(root, "slice-contract.json");
  const scopeRef = path.join(root, "implementation-scope.json");
  writeFileSync(baselineRef, "已采纳工程基线 v1\n");
  const contract = { lifecycle_refs: { ticket: ticketRef, engineering_baseline: baselineRef }, common: { project_roots: ["external/demo"], allowed_write_paths: ["src/demo/**"] } };
  writeFileSync(contractRef, JSON.stringify(contract));
  const asset = (ref) => ({ ref, version: "v1", digest: decisionDigest(readFileSync(ref)) });
  writeFileSync(scopeRef, JSON.stringify({ kind: "implementation-scope", slices: [{ ticket_ref: ticketRef, contract: asset(contractRef), repositories: contract.common.project_roots, allowed_write_paths: contract.common.allowed_write_paths, baselines: [asset(baselineRef)] }] }));
  const fixture = buildDecisionFixture(root, { boundary: "implementation-scope", scope: [ticketRef], subjectRef: scopeRef });
  return { ...fixture, state: { slice_contract_ref: contractRef, vertical_slice_ticket_ref: ticketRef, user_decisions: [fixture.requirement] } };
}

export function attachScaffoldDecisionFixture(root, decision) {
  mkdirSync(root, { recursive: true });
  const { user_confirmation } = decision;
  const snapshot = scaffoldDecisionSnapshot(decision);
  const profile = platformProfile(decision.platform_profile, undefined, decision.platform_configuration?.spring_boot_version);
  const platformScope = `${profile.id}@${profile.spring_boot_version}/java${profile.java_version}`;
  const snapshotRef = path.join(root, "scaffold-inputs.json");
  writeFileSync(snapshotRef, JSON.stringify(snapshot));
  const f = buildDecisionFixture(root, { boundary: "gate.backend-architecture-platform-approved", subjectRef: snapshotRef, scope: [decision.project_id, decision.confirmed_architecture, platformScope, decision.decision_inputs_digest] });
  return { ...decision, user_confirmation: { ...user_confirmation, user_decision_ref: f.ref, decision_subject_ref: snapshotRef } };
}
if (process.argv[2] === "--scaffold") {
  const file = process.argv[3];
  const value = JSON.parse(readFileSync(file, "utf8"));
  value.decisions = value.decisions.map((decision) => attachScaffoldDecisionFixture(path.join(path.dirname(file), `user-decision-${decision.project_id}`), decision));
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
