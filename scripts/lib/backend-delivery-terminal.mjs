import {inspectImplementationCandidate, candidateSourceCommit} from './implementation-candidate-current.mjs';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { inspectBackendDelivery, inspectLocalBackendDelivery, openBackendDelivery } from './backend-delivery.mjs';
import { validateBackendReview } from './backend-review.mjs';
import { readSliceContract } from './slice-contract.mjs';
import { assertGateChecks } from './lifecycle-controls.mjs';
import { loadRegistry } from './lifecycle-registry.mjs';
import { validateExecutionResult, loadCompilerContract } from './implementation-contract-compiler.mjs';
import { loadSkillRegistry } from './skill-registry.mjs';
import { read, safe, hash, json, write, ensure, project } from './strategic-handoff-io.mjs';
import { authorizeBackendDelivery } from './lifecycle-execution-scope.mjs';

async function inspect(root, record, {checkpointRef, readOnly = false} = {}) {
  project(root);
  ensure(!record.delivery_mode || record.delivery_mode === 'local-evidence', '未知后端终点模式');
  ensure(!checkpointRef || !record.checkpoint_ref || checkpointRef === record.checkpoint_ref, '终点 checkpoint 与当前功能不一致');
  const authorization = authorizeBackendDelivery({root, checkpointRef: checkpointRef ?? record.checkpoint_ref,
    assetRef: record.delivery?.ref, readOnly, deliveryMode: record.delivery_mode});
  const local = record.delivery_mode === 'local-evidence';
  if (authorization.mode !== 'execution-scope') ensure(record.checkpoint_ref === authorization.checkpoint_ref, '终点未绑定当前功能 checkpoint');
  ensure(!local || ['feature-target','backend-profile'].includes(authorization.mode), '本地后端证据只能登记到当前功能终点');
  ensure(record.schema_version === 1 && record.kind === 'backend-delivery-terminal'
    && record.business_completed === false && record.release_authorized === false, '后端终点不是业务完成或发布批准');
  for (const name of ['delivery', 'review_state']) {
    ensure(hash(readFileSync(safe(root, record[name]?.ref))) === record[name].digest, `${name} 原始字节变化`);
  }
  const state = read(safe(root, record.review_state.ref));
  const business = local && authorization.local_scope === 'business';
  const { delivery } = local ? await inspectLocalBackendDelivery(root, record.delivery.ref,
    {checkpointRef: authorization.checkpoint_ref, readOnly})
    : await inspectBackendDelivery(root, record.delivery.ref, {readOnly});
  const contract = readSliceContract(delivery.slice_contract.ref, {root});
  ensure(contract.contract.backend?.status === 'required', '后端交付缺少批准的后端实现范围');
  ensure(business || (contract.contract.frontend?.status === 'not-applicable'
    && !(contract.contract.common?.impacted_areas || []).some(item => ['ui','frontend'].includes(item))
    && !(contract.contract.work_units || []).some(unit => unit.role_id === 'role.frontend-engineer')), '后端终点不能扩大前端实现批准');
  const checkpoint = authorization.mode !== 'execution-scope' ? read(safe(root, authorization.checkpoint_ref)) : null;
  if (checkpoint) {
    const currentSlice = checkpoint.human_review?.implementation?.slice_contract_ref || checkpoint.review_input?.slice_contract_ref
      || checkpoint.artifacts?.['artifact.slice-implementation-contract']?.ref || checkpoint.slice_contract?.ref
      || checkpoint.gates?.['gate.slice-contract-approved']?.subject_ref;
    ensure(currentSlice === delivery.slice_contract.ref, '终点 Slice 不属于当前功能 checkpoint');
    if (local) {
      const spec = contract.sources.spec, current = checkpoint.artifacts?.['artifact.spec'];
      ensure(spec && current?.ref === spec.ref && (!current.digest || current.digest === spec.digest), '本地终点 Spec 未绑定当前功能 checkpoint');
    }
  }
  if (business) assertGateChecks('gate.slice-contract-approved', checkpoint,
    {root, registry: loadRegistry(path.join(root, '.template-spec/process/lifecycle-registry.yaml')),
      rolesDoc: read(safe(root, '.template-spec/agents/digital-human-roles.yaml'))});
  if (authorization.mode === 'backend-profile') {
    if (contract.raw.schema_version === 3) assertGateChecks('gate.slice-contract-approved', checkpoint,
      {root, registry: loadRegistry(path.join(root, '.template-spec/process/lifecycle-registry.yaml')),
        rolesDoc: read(safe(root, '.template-spec/agents/digital-human-roles.yaml'))});
    assertGateChecks('gate.fresh-verification-passed', checkpoint,
      {root, registry: loadRegistry(path.join(root, '.template-spec/process/lifecycle-registry.yaml')),
        rolesDoc: read(safe(root, '.template-spec/agents/digital-human-roles.yaml'))});
    const refs = checkpoint.gates['gate.fresh-verification-passed'].evidence?.['evidence.fresh-verification'];
    ensure(refs?.length, '后端专职终点缺少当前实际 Fresh Verification 报告');
    for (const ref of refs) {
      const saved = read(safe(root, ref)), report = saved.execution_result || saved;
      if (['backend-contract', 'backend-deployment'].includes(report.kind)) {
        const name = report.kind === 'backend-contract' ? 'contract' : 'deployment';
        ensure(ref === delivery.verification[name].ref, 'Fresh Verification 未绑定当前交付的实际契约或部署报告');
      } else {
        ensure(report.consumed_contract && report.work_unit_id, '未知 Fresh Verification 报告；不能使用状态或说明代替实际验证');
        const checked = validateExecutionResult(report, contract.raw, {root, approved_slice: delivery.slice_contract, readOnly: true,
          registry: loadSkillRegistry(path.join(root, '.template-spec/agents/yss-skill-registry.yaml')),
          compilerContract: loadCompilerContract(path.join(root, '.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml'))});
        ensure(report.status === 'implemented' && checked.status === 'accepted' && !checked.blockers.length, 'Fresh Verification 未闭合当前批准 Slice 的实际实现验证');
        ensure(report.verification_results.every(row => Number.isFinite(Date.parse(row.executed_at)) && Date.parse(row.executed_at) <= Date.now()+60000), 'Fresh Verification 执行时间无效');
      }
    }
  }
  ensure(state.review_input?.scope_kind === 'change' && state.review_input.slice_contract_ref === delivery.slice_contract.ref, '独立审查未绑定交付的 Slice');
  ensure(validateBackendReview(state, { root }).status === 'passed', '后端交付需要当前独立审查');
  const candidate = inspectImplementationCandidate(state.review_input, {root,projectRoot:path.resolve(root,state.review_input.project_root),assetRef:delivery.slice_contract.ref});
  const commit = candidateSourceCommit(candidate);
  ensure(state.review_input.review_mode === 'committed' && delivery.build.source_commit === commit, '终点需要与当前已提交审查候选一致的真实构建源码提交');
  ensure(record.downstream && ['owner', 'ticket_ref', 'verification_plan', 'target_version'].every(key => typeof record.downstream[key] === 'string' && record.downstream[key].trim()), '终点缺少下游接收责任和待办');
  const result = {result: 'backend-delivered', delivery_id: delivery.delivery_id, version: delivery.version,
    next_work_unit: checkpoint ? checkpoint.next_work_unit ?? null : null, business_completed: false,
    release_authorized: false, live_service_checked: false, downstream: record.downstream,
    terminal_ref: authorization.terminal_ref, ...(checkpoint ? {checkpoint_ref: authorization.checkpoint_ref} : {})};
  if (local) {
    ensure(record.bundle_ref === undefined && record.bundle_digest === undefined, '本地终点不接受战略或后端交付包字段');
    return {...result, delivery_mode: 'local-evidence'};
  }
  return openBackendDelivery(safe(root, record.bundle_ref), bundle => {
    ensure(record.bundle_digest === bundle.manifest.bundle_digest && bundle.manifest.delivery_ref === record.delivery.ref, '终点绑定的交付包不一致');
    // A different valid package must not be used to close the current source.
    for (const file of bundle.manifest.files) if (file.original_ref) {
      ensure(hash(readFileSync(safe(root, file.original_ref))) === file.sha256, `包与当前源不同: ${file.original_ref}`);
    }
    return {...result, bundle_digest: bundle.manifest.bundle_digest};
  });
}

export async function verifyBackendDeliveryTerminal(root, {checkpointRef, assetRef} = {}) {
  root = path.resolve(root);
  const authorization = authorizeBackendDelivery({root, checkpointRef, assetRef, readOnly: true});
  return inspect(root, read(safe(root, authorization.terminal_ref)), {checkpointRef: authorization.checkpoint_ref, readOnly: true});
}

/** This closes only the backend responsibility after real package and review validation. */
export async function completeBackendDelivery(root, input, {checkpointRef} = {}) {
  root = path.resolve(root);
  ensure(!checkpointRef || !input.checkpoint_ref || checkpointRef === input.checkpoint_ref, '终点 checkpoint 与当前功能不一致');
  const authorization = authorizeBackendDelivery({root, checkpointRef: checkpointRef ?? input.checkpoint_ref,
    assetRef: input.delivery?.ref, deliveryMode: input.delivery_mode});
  ensure(authorization.local_scope !== 'business' || input.delivery_mode === 'local-evidence', '本地业务交付仅登记本地证据；不能自导出交付包');
  const record = { ...input, schema_version: 1, kind: 'backend-delivery-terminal', business_completed: false, release_authorized: false };
  if (authorization.mode !== 'execution-scope') record.checkpoint_ref = authorization.checkpoint_ref;
  ensure(!existsSync(path.join(root, authorization.terminal_ref)), '终点已存在；只能复验，不覆盖旧终点');
  const result = await inspect(root, record, {checkpointRef: authorization.checkpoint_ref});
  const bytes = json(record);
  write(root, authorization.terminal_ref, bytes);
  try { await verifyBackendDeliveryTerminal(root, {checkpointRef: authorization.checkpoint_ref}); }
  catch (error) { if (readFileSync(safe(root, authorization.terminal_ref), 'utf8') === bytes) rmSync(safe(root, authorization.terminal_ref)); throw error; }
  return result;
}
