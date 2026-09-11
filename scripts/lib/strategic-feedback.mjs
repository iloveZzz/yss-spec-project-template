import { readFileSync } from 'node:fs';
import { openBundle } from './strategic-handoff.mjs';
import { read, safe, ensure, hash, schema, project } from './strategic-handoff-io.mjs';

export async function verifyConsumerFeedback({root=process.cwd(),feedbackRef}={}) {
  project(root);const file=safe(root,feedbackRef),feedback=read(file);
  schema(feedback,'docs/process/schemas/strategic-consumer-feedback.schema.json');
  const receipt=read(safe(root,feedback.import_receipt_ref));
  ensure(receipt.schema_version===2,'Consumer Feedback v1 只接受 Handoff v4 的 Import Receipt v2');
  const base=`docs/handoffs/${receipt.bundle_id}/${receipt.version}`;
  ensure(feedback.import_receipt_ref===`${base}/import-receipt.json`&&receipt.package_ref===`${base}/package`,'Consumer Feedback 导入收据路径无效');
  ensure(feedback.bundle.id===receipt.bundle_id&&feedback.bundle.version===receipt.version&&feedback.bundle.digest===receipt.bundle_digest,'Consumer Feedback 绑定的 bundle 身份或摘要不一致');
  const route=receipt.routes.find(item=>item.route_id===feedback.route_id);ensure(route&&route.activation!=='not-applicable','Consumer Feedback route_id 未被当前消费者激活');
  for(const ref of feedback.evidence_refs)ensure(readFileSync(safe(root,ref)).length>0,`Consumer Feedback evidence 为空: ${ref}`);
  return openBundle(safe(root,receipt.package_ref),bundle=>{
    ensure(bundle.handoff.schema_version===4&&bundle.manifest.bundle_digest===receipt.bundle_digest,'Consumer Feedback 必须绑定当前 Handoff v4 包');
    const source=[...bundle.indexes.rules.map(item=>({id:item.rule_id,digest:item.source_digest})),...bundle.indexes.scenarios.map(item=>({id:item.scenario_id,digest:item.source_digest}))].find(item=>item.id===feedback.source.id);
    ensure(source&&source.digest===feedback.source.digest,'Consumer Feedback source ID 或摘要不是当前包内容');
    return {result:'feedback-verified',feedback_ref:feedbackRef,feedback_digest:hash(readFileSync(file)),severity:feedback.severity,route_id:feedback.route_id,bundle_digest:receipt.bundle_digest};
  });
}

export async function verifyFeedbackAdjudication({root=process.cwd(),adjudicationRef}={}) {
  project(root);const file=safe(root,adjudicationRef),adjudication=read(file);
  schema(adjudication,'docs/process/schemas/strategic-feedback-adjudication.schema.json');
  const feedbackFile=safe(root,adjudication.feedback.ref);ensure(hash(readFileSync(feedbackFile))===adjudication.feedback.digest,'Feedback Adjudication 绑定的 feedback digest 已失效');
  const verified=await verifyConsumerFeedback({root,feedbackRef:adjudication.feedback.ref});
  for(const ref of adjudication.evidence_refs)ensure(readFileSync(safe(root,ref)).length>0,`Feedback Adjudication evidence 为空: ${ref}`);
  if(adjudication.approval_ref)ensure(readFileSync(safe(root,adjudication.approval_ref)).length>0,'Feedback Adjudication approval_ref 为空');
  if(adjudication.decision==='amend')return {result:'blocked',decision:'amend',requires_new_handoff:true,invalidated_bundle_digest:verified.bundle_digest,next_work_unit:adjudication.return_work_unit,target_version:adjudication.target_version};
  if(adjudication.decision==='defer'&&verified.severity==='blocking')return {result:'blocked',decision:'defer',requires_new_handoff:false,next_work_unit:adjudication.return_work_unit,target_version:adjudication.target_version};
  return {result:'adjudicated',decision:adjudication.decision,may_continue:true,bundle_digest:verified.bundle_digest,target_version:adjudication.target_version};
}
