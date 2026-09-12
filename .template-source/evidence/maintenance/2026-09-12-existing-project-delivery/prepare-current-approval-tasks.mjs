import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/strategy-governance';
const dir = 'docs/.scratch/target-preview-existing-ui/handoff-draft';
const { generateTaskPackageDefaults, validateTaskPackage } = await import(pathToFileURL(path.join(root, 'scripts/lib/task-package.mjs')));
const common = {
  schema_version: 1,
  runtime_id: 'runtime.skill-projection',
  execution_state: 'Reviewer',
  workflow_status: 'not-started',
  stage_id: 'stage.ticket-formalization',
  feature_id: 'target-preview-pilot',
  inputs: [
    `${dir}/current-request-snapshot.json`,
    `${dir}/current-review.md`,
    'docs/.scratch/target-preview-existing-ui/decisions/current-assets.json',
    `${dir}/portable-closure-final.json`,
    'CONTEXT.md',
  ],
  forbidden_actions: ['修改已确认主体原字节', '代替真实人类回复', '修改实现仓库', 'Git提交/推送/发布'],
  verification_results: [],
  downstream_consumers: ['harness-orchestrator'],
};
const tasks = [
  generateTaskPackageDefaults('role.product-manager', {
    ...common,
    task_id: 'current-spec-ui-countersign',
    work_unit_id: 'work-unit.spec-synthesis',
    plan_review_ref: `${dir}/plan-entry-review.json`,
    plan_user_decision_ref: 'docs/.scratch/target-preview-existing-ui/decisions/current-assets.json',
    actor_id: 'delivery-binding-reviewer-product',
    contract: { kind: 'lifecycle-work-unit', contract_id: 'current-spec-ui-countersign', contract_version: 1, status: 'issued', contract_ref: `${dir}/current-review.md`, lifecycle_ref: 'docs/process/lifecycle-registry.yaml' },
    objective: '独立复核当前真实用户决定与已固定 Spec/UI 原字节；按源角色策略分别形成 Spec 与 existing UI 会签。不得修改主体或把专业会签解释成 S0。',
    allowed_write_paths: [`${dir}/pending-approvals/spec_ref.json`, `${dir}/pending-approvals/existing_ui_baseline_ref.json`, `${dir}/current-spec-ui-review.json`],
    expected_outputs: ['当前 Spec 会签记录', '当前 existing UI 会签记录', '独立复核结果'],
    expected_evidence_files: [`${dir}/current-spec-ui-review.json`],
    verification_commands: [
      `node scripts/verify-approval-record --require-approved ${dir}/pending-approvals/spec_ref.json`,
      `node scripts/verify-approval-record --require-approved ${dir}/pending-approvals/existing_ui_baseline_ref.json`,
    ],
    review_context: { implementation_actor_id: 'maintenance-root-requirements' },
    convergence: { parent_work_unit: 'work-unit.spec-synthesis', convergence_ref: `${dir}/current-review-state.json` },
  }),
  generateTaskPackageDefaults('role.requirements-manager', {
    ...common,
    task_id: 'current-delivery-countersign',
    work_unit_id: 'work-unit.strategic-design-handoff',
    actor_id: 'delivery-binding-reviewer-requirements',
    contract: { kind: 'lifecycle-work-unit', contract_id: 'current-delivery-countersign', contract_version: 1, status: 'issued', contract_ref: `${dir}/delivery-scope.json`, lifecycle_ref: 'docs/process/lifecycle-registry.yaml' },
    objective: '在 Spec/UI 当前会签通过后，独立复核业务 Ticket、Handoff v5 与便携闭包；以当前交付范围形成人类决定绑定的终端会签，不执行导出或接收。',
    allowed_write_paths: [`${dir}/pending-approvals/business_ticket_set_ref.json`, `${dir}/pending-approvals/handoff.json`, `${dir}/current-delivery-review.json`],
    expected_outputs: ['业务 Ticket 集会签记录', 'Handoff 会签记录', '独立复核结果'],
    expected_evidence_files: [`${dir}/current-delivery-review.json`],
    verification_commands: [
      `node scripts/verify-approval-record --require-approved ${dir}/pending-approvals/business_ticket_set_ref.json`,
      `node scripts/verify-approval-record --require-approved ${dir}/pending-approvals/handoff.json`,
    ],
    review_context: { implementation_actor_id: 'target-preview-existing-ui-author' },
    convergence: { parent_work_unit: 'work-unit.strategic-design-handoff', convergence_ref: `${dir}/current-review-state.json` },
  }),
];
for (const task of tasks) {
  validateTaskPackage(task, { root });
  fs.writeFileSync(path.join(root, dir, `${task.task_id}-task.json`), `${JSON.stringify(task, null, 2)}\n`);
}
console.log('当前 Spec/UI 与交付终端独立会签任务包已验证。');
