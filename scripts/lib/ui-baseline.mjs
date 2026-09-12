import { readFileSync } from 'node:fs';
import { ensure, read, safe, hash } from './strategic-handoff-io.mjs';
import { validateVisualBaseline } from '../../.agents/skills/yss-prototype-stage/scripts/visual-baseline-contract.mjs';
import { validateExistingUiBaseline } from './existing-ui-baseline.mjs';

export function hasConsumerRoutes(handoff) { return [4,5].includes(handoff?.schema_version); }
export function uiBaselineKind(handoff) {
  ensure([3,4,5].includes(handoff?.schema_version),'未知 Strategic Handoff schema_version');
  if(handoff.schema_version<5)return 'prototype';
  ensure(['prototype','existing-ui-baseline'].includes(handoff.ui_baseline_kind),'未知 ui_baseline_kind');
  return handoff.ui_baseline_kind;
}
export function uiBaselineRef(handoff) {
  const kind=uiBaselineKind(handoff),ref=handoff.source?.[kind==='prototype'?'visual_baseline_ref':'existing_ui_baseline_ref'];
  ensure(ref,'缺少 UI 基线引用');return ref;
}
export function uiBaselineCaseIds(handoff) { return uiBaselineRef(handoff).case_ids; }
export function uiBaselineSourceKeys(handoff) { return uiBaselineKind(handoff)==='prototype'?['prototype_ref','visual_baseline_ref']:['existing_ui_baseline_ref']; }
export async function validateHandoffUiBaseline(root,handoff) {
  const kind=uiBaselineKind(handoff),ref=uiBaselineRef(handoff),file=safe(root,`${ref.persisted_ref}/${ref.manifest_ref}`),baseline=read(file);
  const result=kind==='prototype'?await validateVisualBaseline(baseline,{bundleRoot:safe(root,ref.persisted_ref)}):validateExistingUiBaseline(baseline,{bundleRoot:safe(root,ref.persisted_ref)});
  ensure(!result.errors.length,`UI 基线无效: ${result.errors.join('; ')}`);
  // The immutable existing manifest records readiness; the caller verifies its current approval chain.
  ensure((kind==='existing-ui-baseline'||baseline.status==='approved')&&baseline.baseline_id===ref.baseline_id&&baseline.version===ref.version&&JSON.stringify([...ref.case_ids].sort())===JSON.stringify(baseline.cases.map(item=>item.case_id).sort()),'UI 基线身份不一致');
  return {kind,ref,baseline,digest:kind==='prototype'?baseline.bundle.digest:hash(readFileSync(file))};
}
