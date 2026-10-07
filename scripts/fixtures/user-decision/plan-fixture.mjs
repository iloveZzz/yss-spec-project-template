// Synthetic test evidence only; never import to produce real project approval.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../lib/lifecycle-registry.mjs';
import { parseContextContract, resolveContextTermRefs } from '../../lib/context-contract.mjs';
import { decisionDigest } from '../../lib/user-decision.mjs';
import { planEntryPolicy } from '../../lib/plan-spec-entry.mjs';
import { buildDecisionFixture } from './build-fixture.mjs';
import { initializePlanReview } from '../../lib/plan-review-control.mjs';

export function buildPlanFixture(root) {
  mkdirSync(path.join(root, '.template-spec/process'), { recursive: true });
  const write = (ref, value) => { const file = path.resolve(root, ref); mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
  write('yss-project.yaml', 'schema_version: 1\nrepository_mode: project-instance\n');
  mkdirSync(path.join(root, '.template-spec/agents'), { recursive: true });
  write('.template-spec/agents/issue-tracker.md', '---\ntracker:\n  platform: local-markdown\n  root: docs/.scratch\n---\n# Legacy Plan fixture\n');
  for (const ref of ['CONTEXT.md', '.template-spec/process/lifecycle-registry.yaml', '.template-spec/process/schemas/plan-review-control.schema.json', '.template-spec/agents/digital-human-roles.yaml', '.template-spec/agents/yss-skill-registry.yaml', '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml']) write(ref, readFileSync(path.join(ROOT, ref), 'utf8'));
  write('plan.md', '测试规划：小范围修订，不改变业务边界或关键规则。\n');
  const c = parseContextContract({ root });
  write('reconciliation.json', { schema_version: 1, repository_mode: 'project-instance', stage: 'stage.plan', work_unit: 'work-unit.plan-requirements', status: 'reconciled', context_snapshot: { context_ref: c.context_ref, context_schema_version: c.context_schema_version, document_digest: c.document_digest, referenced_terms_digest: resolveContextTermRefs(c, []).referenced_terms_digest, term_refs: [] }, changes: { added: [], updated: [], deprecated: [] }, unresolved_terms: [], evidence_refs: ['CONTEXT.md'] });
  const policy = planEntryPolicy({ root });
  const review = { schema_version: 1, kind: 'plan-entry-review', gate_id: 'gate.plan-approved', feature_id: 'feature.demo', drafter_principal_ref: 'synthetic.plan-drafter', plan_ref: 'plan.md', context_reconciliation_ref: 'reconciliation.json', basis: ['plan.md', 'CONTEXT.md', '.template-spec/process/lifecycle-registry.yaml', 'reconciliation.json'].map(ref => ({ ref, digest: decisionDigest(readFileSync(path.join(root, ref))) })), checks: Object.fromEntries(policy.required_checks.map(id => [id, { status: 'passed', evidence_refs: ['plan.md'] }])), open_items: [], impacts: { domain_strategy: false, stage_decision: false }, internal_checks: Object.fromEntries(Object.keys(policy.check_impacts).map(id => [id, { status: 'not-applicable', reason: '本次仅修订已确认范围内的细节，不改变边界、规则或阶段合同', evidence_refs: ['plan.md'] }])) };
  const reviewRef = path.join(root, 'review.json');
  const save = () => write(reviewRef, review);
  save();
  const approval = buildDecisionFixture(path.join(root, 'approval'), { boundary: 'gate.plan-approved', subjectRef: reviewRef });
  const origin = { feature_id: review.feature_id, checks: {}, gates: {} };
  write('origin-checkpoint.json', origin);
  const control = initializePlanReview(origin, { feature_id: review.feature_id, scope_ids: [review.feature_id], scope_digest: decisionDigest(readFileSync(path.join(root, 'plan.md'))), provenance: { kind: 'new-feature', source_ref: 'origin-checkpoint.json', source_digest: decisionDigest(readFileSync(path.join(root, 'origin-checkpoint.json'))) } }, { root });
  const state = { feature_id: review.feature_id, plan_review_ref: reviewRef, plan_user_decision_ref: approval.ref, user_decisions: [approval.requirement], plan_review_control: control, plan_approval_ref: path.join(root, 'plan-approval.json') };
  let aggregateContext = null;
  const saveAggregate = () => write(state.plan_approval_ref, { schema_version: aggregateContext ? 2 : 1, gate_id: 'gate.plan-approved', decision: 'approved', actor_kind: 'digital-human', role_id: aggregateContext?.bundle.role_id || 'role.product-manager', runtime_id: aggregateContext?.bundle.runtime_id || 'runtime.generic', principal_ref: aggregateContext?.bundle.principal_ref || 'synthetic.plan-reviewer', drafter_principal_ref: review.drafter_principal_ref, subject_ref: reviewRef, subject_digest: decisionDigest(readFileSync(reviewRef)), approval_scope: [review.feature_id], basis: review.basis.map(row => ({ ...row, digest: row.digest.replace(/^sha256:/, '') })), evidence_refs: review.basis.map(row => row.ref), user_decision_ref: state.plan_user_decision_ref, ...(aggregateContext ? { review_bundle_ref: aggregateContext.approvedRef, review_session_id: aggregateContext.bundle.review_session_id, review_task_ref: aggregateContext.bundle.review_task_ref, review_task_digest: aggregateContext.bundle.review_task_digest, capability_ids: aggregateContext.bundle.capability_ids, plan_review_binding: aggregateContext.bundle.plan_review_binding } : {}) });
  const reapprove = () => {
    save();
    approval.record.request.items[0].subject.digest = decisionDigest(readFileSync(reviewRef));
    approval.present(); approval.record.responses = []; approval.respond(); approval.save();
    saveAggregate();
  };
  saveAggregate();
  return { root, review, save, write, approval, reapprove, state, setAggregateContext: context => { aggregateContext = context; } };
}
