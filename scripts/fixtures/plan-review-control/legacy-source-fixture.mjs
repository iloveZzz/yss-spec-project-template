// Synthetic source-policy compatibility evidence only; never authorizes a real Plan.
import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../../vendor/yaml.mjs';
import { decisionDigest } from '../../lib/user-decision.mjs';
import { fixture as buildStrategicFixture } from '../strategic-handoff/fixture.mjs';

export async function buildLegacyPlanSourceFixture(root) {
  fs.mkdirSync(root, { recursive: true });
  root = fs.realpathSync(root);
  const source = await buildStrategicFixture(root, { handoffVersion: 5, businessTickets: true });
  const read = ref => fs.readFileSync(path.resolve(root, ref));
  const document = ref => parseDocument(read(ref).toString('utf8')).toJS();
  const asset = ref => ({ ref, digest: decisionDigest(read(ref)).replace(/^sha256:/, '') });
  const rolesDoc = document('.template-spec/agents/digital-human-roles.yaml');
  const descriptor = source.handoff.source.domain_strategy_ref;
  const currentContext = structuredClone(descriptor.approval_context);
  const binding = { ref: descriptor.persisted_ref, digest: asset(descriptor.persisted_ref).digest, approval_context: currentContext };
  const approvalRef = source.handoff.package_export.approvals.domain_strategy_ref.record_ref;
  const record = document(approvalRef);
  const expected = { boundary: 'gate.plan-approved', ...currentContext, subject_digest: asset(currentContext.subject_ref).digest };
  const gate = { ...currentContext, status: 'approved', approval_ref: approvalRef, subject_digest: expected.subject_digest,
    basis: [...currentContext.basis, asset(currentContext.subject_ref), asset(approvalRef)] };
  // Isolate aggregate consumption: applicable-check coverage is exercised by the
  // complete Plan scenarios, and is not fabricated for this older source profile.
  const registry = { id_policy: { deprecated_ids: [] }, gates: [{ id: 'gate.plan-approved', requires_checks: [], evidence: [] }], checks: [] };
  const checkpoint = { feature_id: 'feature.supplier', checks: {}, gates: { 'gate.plan-approved': gate } };
  return { root, source, rolesDoc, binding, approvalRef, record, expected, gate, registry, checkpoint, read, asset, synthetic_fixture: true };
}
