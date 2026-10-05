// Portable synthetic Plan source references; never use to obtain real approval.
import fs from 'node:fs';
import path from 'node:path';
import { decisionDigest } from '../../lib/user-decision.mjs';

export function localizeSyntheticPlanSource(plan) {
  const relative = ref => path.relative(plan.root, path.resolve(plan.root, ref)).split(path.sep).join('/');
  for (const key of ['plan_review_ref', 'plan_user_decision_ref', 'plan_approval_ref']) plan.state[key] = relative(plan.state[key]);
  for (const requirement of plan.state.user_decisions) {
    requirement.subject_ref = relative(requirement.subject_ref);
    requirement.user_decision_ref = relative(requirement.user_decision_ref);
  }
  plan.approval.record.request.items[0].subject.ref = plan.state.plan_review_ref;
  plan.approval.record.request.requester_source.ref = relative(plan.approval.record.request.requester_source.ref);
  plan.reapprove();
  plan.approval.record.request.presented_source.ref = relative(plan.approval.record.request.presented_source.ref);
  for (const response of plan.approval.record.responses) response.source.ref = relative(response.source.ref);
  plan.approval.save();
  // The old reusable fixture retains an absolute closure variable for its subject.
  const record = JSON.parse(fs.readFileSync(path.resolve(plan.root, plan.state.plan_approval_ref)));
  record.subject_ref = plan.state.plan_review_ref;
  record.user_decision_ref = plan.state.plan_user_decision_ref;
  plan.write(plan.state.plan_approval_ref, record);
}

export function syntheticPlanSourceContext(plan, aggregateRef = plan.state.plan_approval_ref) {
  const asset = ref => ({ ref, digest: decisionDigest(fs.readFileSync(path.resolve(plan.root, ref))).replace(/^sha256:/, '') });
  const context = { subject_ref: plan.state.plan_review_ref, subject_digest: asset(plan.state.plan_review_ref).digest,
    approval_scope: [plan.state.feature_id], drafter_principal_ref: plan.review.drafter_principal_ref,
    basis: plan.review.basis.map(row => ({ ...row, digest: row.digest.replace(/^sha256:/, '') })) };
  const gate = { ...context, status: 'approved', approval_ref: aggregateRef,
    basis: [...context.basis, asset(plan.state.plan_review_ref), asset(aggregateRef)] };
  const binding = { ref: plan.review.plan_ref, approval_ref: aggregateRef, approval_context: context };
  return { binding, gate, asset, synthetic_fixture: true };
}
