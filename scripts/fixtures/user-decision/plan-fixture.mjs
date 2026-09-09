// Synthetic test evidence only; never import to produce real project approval.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../lib/lifecycle-registry.mjs';
import { parseContextContract, resolveContextTermRefs } from '../../lib/context-contract.mjs';
import { decisionDigest } from '../../lib/user-decision.mjs';
import { planEntryPolicy } from '../../lib/plan-spec-entry.mjs';
import { buildDecisionFixture } from './build-fixture.mjs';

export function buildPlanFixture(root) {
  mkdirSync(path.join(root, 'docs/process'), { recursive: true });
  const write = (ref, value) => writeFileSync(path.resolve(root, ref), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  write('yss-project.yaml', 'schema_version: 1\nrepository_mode: project-instance\n');
  for (const ref of ['CONTEXT.md', 'docs/process/lifecycle-registry.yaml']) write(ref, readFileSync(path.join(ROOT, ref), 'utf8'));
  write('plan.md', '测试规划：小范围修订，不改变业务边界或关键规则。\n');
  const c = parseContextContract({ root });
  write('reconciliation.json', { schema_version: 1, repository_mode: 'project-instance', stage: 'stage.plan', work_unit: 'work-unit.plan-requirements', status: 'reconciled', context_snapshot: { context_ref: c.context_ref, context_schema_version: c.context_schema_version, document_digest: c.document_digest, referenced_terms_digest: resolveContextTermRefs(c, []).referenced_terms_digest, term_refs: [] }, changes: { added: [], updated: [], deprecated: [] }, unresolved_terms: [], evidence_refs: ['CONTEXT.md'] });
  const policy = planEntryPolicy({ root });
  const review = { schema_version: 1, kind: 'plan-entry-review', feature_id: 'feature.demo', plan_ref: 'plan.md', context_reconciliation_ref: 'reconciliation.json', basis: ['plan.md', 'CONTEXT.md', 'docs/process/lifecycle-registry.yaml', 'reconciliation.json'].map(ref => ({ ref, digest: decisionDigest(readFileSync(path.join(root, ref))) })), checks: Object.fromEntries(policy.required_checks.map(id => [id, { status: 'passed', evidence_refs: ['plan.md'] }])), open_items: [], impacts: { domain_strategy: false, stage_decision: false }, gates: Object.fromEntries(Object.keys(policy.gate_impacts).map(id => [id, { status: 'not-applicable', reason: '本次仅修订已确认范围内的细节，不改变边界、规则或阶段合同', evidence_refs: ['plan.md'] }])) };
  const reviewRef = path.join(root, 'review.json');
  const save = () => write(reviewRef, review);
  save();
  const approval = buildDecisionFixture(path.join(root, 'approval'), { boundary: 'plan-conclusion', subjectRef: reviewRef });
  const reapprove = () => {
    save();
    approval.record.request.items[0].subject.digest = decisionDigest(readFileSync(reviewRef));
    approval.present(); approval.record.responses = []; approval.respond(); approval.save();
  };
  return { root, review, save, write, approval, reapprove, state: { feature_id: review.feature_id, plan_review_ref: reviewRef, plan_user_decision_ref: approval.ref, user_decisions: [approval.requirement] } };
}
