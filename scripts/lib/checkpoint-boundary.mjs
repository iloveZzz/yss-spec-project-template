import { readDocument, fileBinding } from './governance-io.mjs';

/** Validate existing lifecycle context evidence; never grants approval. */
export function assertCheckpointBoundary(value, {root, history=false}={}) {
  if(history) return {status:'historical-only',execution_authorization:'not-evaluated'};
  const canonical='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  const contract=readDocument(root,fileBinding(root,canonical)?canonical:'.template-spec/process/checkpoint-boundary.yaml');
  const registry=readDocument(root,'.template-spec/process/lifecycle-registry.yaml');
  const stages=new Set(registry.stages.map(x=>x.id));
  if(!stages.has(value.stage))throw new Error('checkpoint-boundary: 当前 stage 未登记');
  if(value.next_work_unit!=null&&!registry.work_units.some(x=>x.id===value.next_work_unit))throw new Error('checkpoint-boundary: next_work_unit 未登记');
  const required=(v,label)=>{if(typeof v!=='string'||!v.trim())throw new Error(`checkpoint-boundary: 缺少 ${label}`);};
  const reference=(ref,label)=>{required(ref,label);if(!fileBinding(root,ref))throw new Error(`checkpoint-boundary: 证据不可读 ${label}: ${ref}`);};
  const boundary=value.phase_boundary;
  if(boundary!==undefined) {
    if(!boundary||Array.isArray(boundary)||typeof boundary!=='object')throw new Error('checkpoint-boundary: phase_boundary 必须为对象');
    for(const key of contract.phase_boundary.evidence.required)required(boundary[key],`phase_boundary.${key}`);
    if(!contract.phase_boundary.choices.includes(boundary.decision))throw new Error('checkpoint-boundary: decision 非法');
    for(const key of contract.phase_boundary.evidence.conditional[boundary.decision]||[]) {
      required(boundary[key],`phase_boundary.${key}`);
      if(key.endsWith('_ref'))reference(boundary[key],key);
    }
    if(boundary.decision==='compact'&&!stages.has(boundary.next_phase))throw new Error('checkpoint-boundary: next_phase 必须为当前阶段 ID');
  }
  const atBoundary=['paused-human-gate','completed'].includes(value.status)||['handoff','subagent','compact'].includes(boundary?.decision)||
    (['orchestrate','resume'].includes(value.mode)&&(value.stage!=='stage.entry-triage'||Boolean(value.stage_trace?.completed_work_unit)));
  if(atBoundary&&!boundary)throw new Error('checkpoint-boundary: 当前边界缺少 phase_boundary');
  if(atBoundary&&!value.stage_trace)throw new Error('checkpoint-boundary: 当前边界缺少 stage_trace');
  if(value.stage_trace!==undefined) {
    const trace=value.stage_trace;
    if(!trace||Array.isArray(trace)||typeof trace!=='object')throw new Error('checkpoint-boundary: stage_trace 必须为对象');
    for(const key of contract.checkpoint_policy.required_stage_trace_fields) {
      if(key==='stage'){if(!stages.has(trace.stage)||trace.stage!==value.stage)throw new Error('checkpoint-boundary: stage_trace.stage 不一致');}
      else if(!Array.isArray(trace[key]))throw new Error(`checkpoint-boundary: stage_trace.${key} 必须为数组`);
    }
    if(trace.completed_work_unit!==undefined&&!registry.work_units.some(x=>x.id===trace.completed_work_unit))throw new Error('checkpoint-boundary: completed_work_unit 非法');
    for(const key of ['upstream_refs','artifact_refs'])for(const ref of trace[key])reference(typeof ref==='string'?ref:ref?.ref,key);
  }
  return {status:'passed',execution_authorization:'not-evaluated'};
}
