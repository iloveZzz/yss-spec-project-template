import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { inspectBackendDelivery, openBackendDelivery } from './backend-delivery.mjs';
import { validateBackendReview } from './backend-review.mjs';
import { read, safe, hash, json, write, ensure, project } from './strategic-handoff-io.mjs';
import { loadExecutionScope, TERMINAL_REF } from './lifecycle-execution-scope.mjs';

async function inspect(root, record) {
  project(root);
  ensure(loadExecutionScope(root)?.scope_id === 'plan-to-backend', '需要 plan-to-backend 职责范围');
  ensure(record.schema_version === 1 && record.kind === 'backend-delivery-terminal'
    && record.business_completed === false && record.release_authorized === false, '后端终点不是业务完成或发布批准');
  for (const name of ['delivery', 'review_state']) {
    ensure(hash(readFileSync(safe(root, record[name]?.ref))) === record[name].digest, `${name} 原始字节变化`);
  }
  const state = read(safe(root, record.review_state.ref));
  const { delivery } = await inspectBackendDelivery(root, record.delivery.ref);
  ensure(state.review_input?.scope_kind === 'change' && state.review_input.slice_contract_ref === delivery.slice_contract.ref, '独立审查未绑定交付的 Slice');
  ensure(validateBackendReview(state, { root }).status === 'passed', '后端交付需要当前独立审查');
  const commit = execFileSync('git', ['-C', path.resolve(root, state.review_input.project_root), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  ensure(state.review_input.review_mode === 'committed' && delivery.build.source_commit === commit, '终点需要与当前已提交审查候选一致的真实构建源码提交');
  ensure(record.downstream && ['owner', 'ticket_ref', 'verification_plan', 'target_version'].every(key => typeof record.downstream[key] === 'string' && record.downstream[key].trim()), '终点缺少下游接收责任和待办');
  return openBackendDelivery(safe(root, record.bundle_ref), bundle => {
    ensure(record.bundle_digest === bundle.manifest.bundle_digest && bundle.manifest.delivery_ref === record.delivery.ref, '终点绑定的交付包不一致');
    // A different valid package must not be used to close the current source.
    for (const file of bundle.manifest.files) if (file.original_ref) {
      ensure(hash(readFileSync(safe(root, file.original_ref))) === file.sha256, `包与当前源不同: ${file.original_ref}`);
    }
    return { result: 'backend-delivered', delivery_id: delivery.delivery_id, version: delivery.version,
      bundle_digest: bundle.manifest.bundle_digest, next_work_unit: null, business_completed: false,
      release_authorized: false, live_service_checked: false, downstream: record.downstream };
  });
}

export async function verifyBackendDeliveryTerminal(root) {
  return inspect(root, read(safe(root, TERMINAL_REF)));
}

/** This closes only the backend responsibility after real package and review validation. */
export async function completeBackendDelivery(root, input) {
  root = path.resolve(root);
  const record = { ...input, schema_version: 1, kind: 'backend-delivery-terminal', business_completed: false, release_authorized: false };
  ensure(!existsSync(path.join(root, TERMINAL_REF)), '终点已存在；只能复验，不覆盖旧终点');
  const result = await inspect(root, record);
  const bytes = json(record);
  write(root, TERMINAL_REF, bytes);
  try { await verifyBackendDeliveryTerminal(root); }
  catch (error) { if (readFileSync(safe(root, TERMINAL_REF), 'utf8') === bytes) rmSync(safe(root, TERMINAL_REF)); throw error; }
  return result;
}
