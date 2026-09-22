import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { safe, hash } from './runtime.mjs';

/** Resolve an actual project-local handoff; never grant stage completion or execution approval. */
export function projectEntry(target, values, check, execute) {
  if (!check.binding) throw new Error('project-binding-required');
  const mode = values.mode;
  if (!['new', 'reuse', 'resume'].includes(mode)) throw new Error('entry-mode-required: new|reuse|resume');
  const input = values.input ? JSON.parse(readFileSync(values.input)) : {};
  if (!input || Array.isArray(input) || typeof input !== 'object'
      || Object.keys(input).some(key => !['checkpoint', 'artifact_refs', 'import_receipt_ref'].includes(key))) throw new Error('invalid-entry-input');
  if (existsSync(path.join(target, '.yss-backend-delivery.json'))) {
    const terminal = JSON.parse(execute(safe(target, 'scripts/complete-backend-delivery'), ['verify', '--root', target], target));
    return { ...check, result: 'backend-delivered', terminal, next_work_unit: null, execution_started: false };
  }
  if (mode === 'resume' && !input.checkpoint) throw new Error('checkpoint-required');
  const refs = input.artifact_refs || [];
  if (!Array.isArray(refs) || (mode === 'reuse' && !refs.length && !input.checkpoint && !input.import_receipt_ref)) throw new Error('upstream-artifacts-required');
  const artifacts = refs.map(ref => ({ ref, sha256: hash(readFileSync(safe(target, ref))) }));
  if (input.checkpoint) execute(safe(target, 'scripts/verify-lifecycle-checkpoint'), [safe(target, input.checkpoint)], target);
  if (mode === 'new' && input.import_receipt_ref) throw new Error('design-receipt-requires-reuse-or-resume');
  const design = input.import_receipt_ref ? JSON.parse(execute(safe(target, 'scripts/strategic-consumer-entry'), ['--root', target, '--receipt', input.import_receipt_ref], target)) : null;
  const workUnit = design?.next_work_unit || (mode === 'new' ? 'work-unit.plan-requirements' : 'work-unit.entry-triage');
  const query = JSON.parse(execute(safe(target, 'scripts/query-lifecycle-context'), ['--mode', 'route', '--work-unit', workUnit], target));
  return { ...check, result: 'project-local-handoff', mode, project_root: target,
    workflow_reference: { source: 'yss-product-lifecycle', skill: 'yss-product-lifecycle', invocation_mode: 'model-invoked' },
    next_work_unit: workUnit, design, artifacts, checkpoint: input.checkpoint || null, query,
    stage_verification_required: true, execution_started: false,
    next_action: '读取 effective_orchestrator 和项目根 CONTEXT.md，由项目本地主控核验上游阶段、批准与门禁后继续。' };
}
