import {usesStageGates,verifyStageResult} from './stage-result.mjs';
import {approvalExpectationForCheckpoint} from './native-approval.mjs';
import fs from 'node:fs';
import {businessAuthoringEnabled,businessPath,businessSetRef,checkBusinessTickets,assertBusinessDeferredApprovals} from './business-tickets.mjs';
import {yamlValue} from './plan-spec-markdown.mjs';
import {loadApprovalRecord,validateApprovalRecordFile} from './native-approval.mjs';

// Reuse existing approval protocols; this function creates no approval boundary.
export function assertBusinessApprovalBasis(root,state,{required=false}={}) {
  if(!businessAuthoringEnabled(root))return;
  if(state?.checkpoint_ref)state=yamlValue(fs.readFileSync(businessPath(root,state.checkpoint_ref),'utf8'));
  if(Object.hasOwn(state,'upstream_spec_baseline'))throw Error('PROFILE_REMOVED: Spec→Design 基线导入已移除');
  if(!required)return;
  const report=checkBusinessTickets({root,setRef:businessSetRef(state),mode:'formal'});
  if(report.status!=='passed')throw Error(`BUSINESS_FORMALIZATION_BLOCKED: ${report.diagnostics.map(x=>x.code).join(', ')}`);
  if(usesStageGates(root)){
   const stage=verifyStageResult({root,checkpoint:state,gateId:"gate.spec-baseline-approved",assetRef:report.spec.ref});
   return stage;
  }
  // approval3 不读取历史角色表；旧记录由 native-approval 按原政策自行解析。
  const proofRefs=[];
  for(const id of ['gate.spec-baseline-approved','gate.product-design-approved']) {
    const gate=state.gates?.[id];
    if(id==='gate.product-design-approved'&&gate?.status==='not-applicable'&&gate.reason?.trim()&&gate.evidence_refs?.length){for(const ref of gate.evidence_refs)fs.readFileSync(businessPath(root,ref));continue;}
    if(gate?.status!=='approved'||!gate.approval_ref)throw Error(`BUSINESS_APPROVAL_REQUIRED: ${id}`);
    const record=loadApprovalRecord(businessPath(root,gate.approval_ref),id);
    if(record.gate_id!==id||record.subject_ref!==gate.subject_ref||!gate.approval_scope?.length||JSON.stringify([...gate.approval_scope].sort())!==JSON.stringify([...(record.approval_scope||[])].sort()))throw Error(`BUSINESS_APPROVAL_SCOPE_MISMATCH: ${id}`);
    validateApprovalRecordFile(businessPath(root,gate.approval_ref),{gate:id,root,requireApproved:true,expected:approvalExpectationForCheckpoint(id,gate,{root})});
    if(id==='gate.spec-baseline-approved'&&record.subject_ref!==report.spec.ref) {
      // Existing approvals may cover a review package instead of the Spec itself.
      // Its signed bytes, rather than a mutable checkpoint label, bind the baseline.
      let subject;
      try {subject=yamlValue(fs.readFileSync(businessPath(root,record.subject_ref),'utf8'));}
      catch {throw Error('BUSINESS_SPEC_APPROVAL_MISMATCH: 批准主体不是当前 Spec 或可核验审阅包');}
      const bindings=[...(Array.isArray(subject?.basis)?subject.basis:[]),...(Array.isArray(subject?.assets)?subject.assets:[])];
      if(!bindings.some(x=>(x.ref||x.persisted_ref)===report.spec.ref&&String(x.digest).replace(/^sha256:/,'')===report.spec.digest.slice(7)))throw Error('BUSINESS_SPEC_APPROVAL_MISMATCH');
    }
    proofRefs.push(gate.approval_ref,record.user_decision_ref,record.continuation_ref);
  }
  assertBusinessDeferredApprovals(report,proofRefs);
}
