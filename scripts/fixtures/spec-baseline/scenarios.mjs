import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {approvedSpecFixture,designFixture,reconcile,localPlanFixture,bindLocalPlanHandoff} from './fixture.mjs';
import {inspectSpecBaselineSource,verifySpecBaselineBinding,importedApprovalOrigin} from '../../lib/spec-baseline.mjs';
import {exportSpecBaseline,importSpecBaseline} from './package.mjs';
import {exportBundle,openBundle} from '../../lib/strategic-handoff.mjs';
import {assertBusinessApprovalBasis} from '../../lib/business-ticket-lifecycle.mjs';
import {read,json,hash,digest,safe,write} from '../../lib/strategic-handoff-io.mjs';
import {validateNextRoute} from '../../../submodules/yss-harness-design-agent/scripts/lib/lifecycle-transition.mjs';
import {assertCheckpointBoundary} from '../../lib/checkpoint-boundary.mjs';
import {parseContextContract,resolveContextTermRefs} from '../../lib/context-contract.mjs';

const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-spec-baseline-chain-'))),src=path.join(root,'spec'),dst=path.join(root,'design'),pkg=path.join(root,'baseline');
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const nativeCLI=process.env.YSS_SPEC_BASELINE_NATIVE_CLI;
const noDesign=process.env.YSS_SPEC_BASELINE_NO_DESIGN==='1';
const native=(args)=>{try{const envelope=JSON.parse(execFileSync(nativeCLI,['handoff',...args,'--json'],{encoding:'utf8',timeout:120000,maxBuffer:32*1024*1024}));return envelope.result;}catch(error){if(error.stdout)console.error(error.stdout);throw error;}};
const verifyTerminal=(targetRoot,bundle)=>{const relative='native-terminal-package';fs.cpSync(bundle,path.join(targetRoot,relative),{recursive:true,errorOnExist:true,force:false});native(['verify','--root',targetRoot,'--kind','package','--package',relative]);checks++;};
const approvedGate=(owner,key)=>{
 const context=owner.handoff.source[key].approval_context,approvalRef=owner.handoff.package_export.approvals[key].record_ref;
 const bound=ref=>({ref,digest:hash(fs.readFileSync(path.join(owner.root,ref))).slice(7)});
 const basis=[...context.basis,bound(context.subject_ref),bound(approvalRef)];
 const gate={status:'approved',approval_ref:approvalRef,...context,basis,reason:'合成当前本地批准记录与独立回复已核验，仅测试使用',evidence_refs:basis.map(row=>row.ref),evidence:{'evidence.approval-record':[approvalRef]}};delete gate.review_package;return gate;
};
try {
 const source=await approvedSpecFixture(src,{productDesign:!noDesign,nativeSeed:process.env.YSS_SPEC_BASELINE_NATIVE_SEED}),target=await designFixture(dst,{productDesign:!noDesign,nativeSeed:process.env.YSS_DESIGN_BASELINE_NATIVE_SEED});
 const sourceCheckpointBytes=fs.readFileSync(path.join(src,source.checkpointRef)),missingPlan=structuredClone(source.state);delete missingPlan.plan_review_ref;
 try{source.plan.write(source.checkpointRef,missingPlan);assert.throws(()=>inspectSpecBaselineSource(src,source.checkpointRef),/plan_review_ref/);checks++;}finally{fs.writeFileSync(path.join(src,source.checkpointRef),sourceCheckpointBytes);}
 const rejectSource=(candidate,label)=>{
  try{
   source.plan.write(source.checkpointRef,candidate);
   assert.throws(()=>inspectSpecBaselineSource(src,source.checkpointRef),undefined,label);checks++;
   if(nativeCLI){assert.throws(()=>execFileSync(nativeCLI,['handoff','export','--root',src,'--kind','spec-baseline','--checkpoint',source.checkpointRef,'--out',path.join(root,'invalid-source-'+checks),'--json'],{encoding:'utf8',timeout:120000,stdio:'pipe'}),undefined,label);checks++;}
  }finally{fs.writeFileSync(path.join(src,source.checkpointRef),sourceCheckpointBytes);}
 };
 const draftSpec=structuredClone(source.state);draftSpec.artifacts['artifact.spec'].status='draft';rejectSource(draftSpec,'批准gate不能覆盖draft当前Spec');
 const conflictingSpec=structuredClone(source.state);conflictingSpec.spec_ref='source/strategy.yaml';rejectSource(conflictingSpec,'当前Spec两指针不能矛盾');
 const conflictingPlan=structuredClone(source.state);conflictingPlan.artifacts['artifact.plan'].ref='source/strategy.yaml';rejectSource(conflictingPlan,'当前Plan必须为实际批准审阅包的Plan');
 const strategyAsStage=structuredClone(source.state);strategyAsStage.artifacts['artifact.stage-decision-package'].ref='source/strategy.yaml';rejectSource(strategyAsStage,'批准策略不能冒充阶段决策包');
 const stageAsStrategy=structuredClone(source.state);stageAsStrategy.artifacts['artifact.domain-strategy'].ref='source/stage.yaml';rejectSource(stageAsStrategy,'批准阶段决策包不能冒充领域策略');
 const missingStrategy=structuredClone(source.state);delete missingStrategy.domain_strategy_ref;delete missingStrategy.artifacts['artifact.domain-strategy'];rejectSource(missingStrategy,'阶段决策必须绑定当前声明的领域策略');
 const unapprovedStageRef='source/unapproved-stage.yaml',unapprovedStage=read(path.join(src,'source/stage.yaml'));unapprovedStage.impact_assessment.ui=false;unapprovedStage.impact_assessment.product_design=false;source.strategic.put(unapprovedStageRef,unapprovedStage);
 try{
  const uncoveredStage=structuredClone(source.state);uncoveredStage.artifacts['artifact.stage-decision-package'].ref=unapprovedStageRef;rejectSource(uncoveredStage,'未批准阶段决策不能跳过Design');
  const assertedStage=structuredClone(uncoveredStage);assertedStage.gates['gate.plan-approved'].basis.push({ref:unapprovedStageRef,digest:hash(fs.readFileSync(path.join(src,unapprovedStageRef))).slice(7)});rejectSource(assertedStage,'checkpoint自报basis不能扩大实际批准范围');
 }finally{fs.rmSync(path.join(src,unapprovedStageRef));}
 let imported;
 if(nativeCLI) {
  native(['export','--root',src,'--kind','spec-baseline','--checkpoint',source.checkpointRef,'--out',pkg]);
  const planRef=path.join(root,'native-import-plan.json');
  const plan=native(['import','--root',dst,'--kind','spec-baseline','--package',pkg,'--plan','--out',planRef]);
  native(['import','--root',dst,'--kind','spec-baseline','--apply','--plan-file',planRef]);
  const receiptRef=`docs/spec-baselines/${plan.baseline_id}/${plan.version}/receipt.json`;
  imported={receipt_ref:receiptRef,receipt_digest:hash(fs.readFileSync(path.join(dst,receiptRef)))};
 } else {
  await exportSpecBaseline({sourceRoot:src,checkpointRef:source.checkpointRef,output:pkg});
  imported=importSpecBaseline({bundle:pkg,targetRoot:dst});
 }
 const state={repository_mode:'project-instance',feature_id:source.state.feature_id,profile_id:'harness.business-ddd-strategy-handoff',upstream_spec_baseline:{receipt_ref:imported.receipt_ref,receipt_digest:imported.receipt_digest},context_reconciliation:{ref:'intake-context.json'}};
 assert.throws(()=>verifySpecBaselineBinding(state,{root:dst}),/不可读|ENOENT/);checks++;
 const receipt=read(path.join(dst,imported.receipt_ref)),prefix=`${receipt.package_ref}/payload/files/`;
 reconcile(dst,'intake-context.json',{receiptRef:imported.receipt_ref,sourceContextRef:prefix+'source-context.snapshot.md'});
 const proof=verifySpecBaselineBinding(state,{root:dst});
 assert.throws(()=>verifySpecBaselineBinding({...state,feature_id:'feature.other'},{root:dst}),/feature_id/);checks++;
 const reconciliationBytes=fs.readFileSync(path.join(dst,'intake-context.json'));
 const emptyTerms=read(path.join(dst,'intake-context.json'));emptyTerms.context_snapshot.term_refs=[];emptyTerms.context_snapshot.referenced_terms_digest=resolveContextTermRefs(parseContextContract({root:dst}),[]).referenced_terms_digest;target.put('intake-context.json',emptyTerms);
 assert.throws(()=>verifySpecBaselineBinding(state,{root:dst}),/digest|术语|快照/);checks++;
 fs.writeFileSync(path.join(dst,'intake-context.json'),reconciliationBytes);
 const contextBytes=fs.readFileSync(path.join(dst,'CONTEXT.md')),firstTerm=parseContextContract({root:dst}).business_terms[0];
 const changed=contextBytes.toString().replace(firstTerm.meaning,firstTerm.meaning+' 合成含义冲突');assert.notEqual(changed,contextBytes.toString());fs.writeFileSync(path.join(dst,'CONTEXT.md'),changed);
 reconcile(dst,'intake-context.json',{receiptRef:imported.receipt_ref,sourceContextRef:prefix+'source-context.snapshot.md'});
 assert.throws(()=>verifySpecBaselineBinding(state,{root:dst}),/术语冲突/);checks++;
 fs.writeFileSync(path.join(dst,'CONTEXT.md'),contextBytes);fs.writeFileSync(path.join(dst,'intake-context.json'),reconciliationBytes);
 check(proof.next_work_unit===(noDesign?'work-unit.business-ticket-formalization':'work-unit.prototype-design'),'接入当前影响登记的Design单元');
 check(validateNextRoute('work-unit.entry-triage',proof.next_work_unit,state,{root:dst}).result==='allowed','entry-triage跳过已批准Plan/Spec');
 check(validateNextRoute('work-unit.entry-triage','work-unit.plan-requirements',state,{root:dst}).result==='blocked','绑定导入基线不重复Plan');
 const working=read(path.join(dst,receipt.working_set_ref)),set=read(path.join(dst,working.business_ticket_set_ref));
 const checkpoint={schema_version:1,repository_mode:'project-instance',mode:'route',status:'routing',stage:'stage.entry-triage',feature_id:source.state.feature_id,artifacts:{'artifact.spec':{status:'approved',ref:proof.specRef,evidence_refs:[imported.receipt_ref]},'artifact.business-ticket-set':{status:'ready-for-human',ref:working.business_ticket_set_ref,evidence_refs:[imported.receipt_ref]}},gates:{},context_reconciliation:{status:'reconciled',ref:'intake-context.json',evidence_refs:[imported.receipt_ref]},next_work_unit:proof.next_work_unit,ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[],upstream_spec_baseline:state.upstream_spec_baseline};target.put('intake-checkpoint.json',checkpoint);
 check(set.tickets[0].id==='BT-001','保留业务票稳定ID');
 check(set.spec.ref===proof.specRef&&set.spec.digest===proof.source.spec_digest,'原Spec字节与引用保持可核验');
 // Product/design review remains local and must bind the current editable set.
 const reviewRef='source/imported-business-review.yaml';set.review_ref=reviewRef;
 fs.writeFileSync(safe(dst,working.business_ticket_set_ref),json(set));
 const setDigest=hash(fs.readFileSync(safe(dst,working.business_ticket_set_ref)));
 target.put(reviewRef,{schema_version:1,kind:'business-ticket-review',result:'passed',subject_ref:working.business_ticket_set_ref,subject_digest:setDigest,drafter:'synthetic.design-drafter',reviewer:'synthetic.independent-business-reviewer',evidence:[{ref:'evidence/offline.log',digest:hash(fs.readFileSync(path.join(dst,'evidence/offline.log'))),version:'v1'}]});
 target.handoff.source.business_ticket_set_ref.persisted_ref=working.business_ticket_set_ref;target.handoff.source.business_ticket_set_ref.digest=setDigest;
 target.sign();
 const localProduct=target.handoff.source.prototype_ref?.approval_context;
 const productRef=target.handoff.package_export.approvals.prototype_ref?.record_ref;
 state.artifacts={'artifact.spec':{ref:proof.specRef},'artifact.business-ticket-set':{ref:working.business_ticket_set_ref}};
 state.gates={'gate.product-design-approved':noDesign?{status:'not-applicable',reason:'已批准方案无 UI/Frontend 影响',evidence_refs:[prefix+source.strategic.handoff.source.stage_decision_package_ref.persisted_ref]}:{status:'approved',approval_ref:productRef,...localProduct}};
 assertBusinessApprovalBasis(dst,state,{required:true});checks++;
 // Real local approvals supersede inherited prerequisite evidence; provenance stays bound.
 const localSpecContext=target.handoff.source.spec_ref.approval_context,localSpecApproval=target.handoff.package_export.approvals.spec_ref.record_ref;
 const localState={...state,stage:'stage.entry-triage',context_reconciliation:{status:'reconciled',ref:'intake-context.json'},next_work_unit:proof.next_work_unit,artifacts:{...state.artifacts,'artifact.spec':{ref:target.handoff.source.spec_ref.persisted_ref}},gates:{...state.gates,'gate.spec-baseline-approved':approvedGate(target,'spec_ref')}};
 check(assertCheckpointBoundary(localState,{root:dst}).status==='passed','checkpoint保留来源但接受实际本地Spec批准');
 const localSpecBytes=fs.readFileSync(path.join(dst,localState.artifacts['artifact.spec'].ref));fs.appendFileSync(path.join(dst,localState.artifacts['artifact.spec'].ref),'\n未批准的本地变化');
 assert.throws(()=>verifySpecBaselineBinding(localState,{root:dst}),/漂移|过期|digest|basis|依据/);checks++;
 fs.writeFileSync(path.join(dst,localState.artifacts['artifact.spec'].ref),localSpecBytes);
 // Preserve the source approval context and its independent origin binding.
 for(const key of ['domain_strategy_ref','stage_decision_package_ref','spec_ref']) {
  const original=source.strategic.handoff.source[key],gate=key==='spec_ref'?'gate.spec-baseline-approved':'gate.plan-approved';
  const context=gate==='gate.plan-approved'?source.gates?.[gate] || source.state.gates[gate]:original.approval_context;
  const originalContext=gate==='gate.plan-approved'?{subject_ref:context.subject_ref,approval_scope:context.approval_scope,basis:source.plan.review.basis,drafter_principal_ref:context.drafter_principal_ref}:context;
  target.handoff.source[key]={...original,persisted_ref:prefix+original.persisted_ref,approval_context:{...originalContext,source_baseline:{receipt_ref:imported.receipt_ref,receipt_digest:imported.receipt_digest,source_ref:original.persisted_ref,context_reconciliation_ref:'intake-context.json'}}};
  target.handoff.package_export.approvals[key]={...target.handoff.package_export.approvals[key],record_ref:prefix+source.state.gates[gate].approval_ref};
 }
 target.put('handoff.yaml',target.handoff);
 const terminal=target.handoff.package_export.approvals.handoff,terminalRecord=read(path.join(dst,terminal.record_ref)),review=read(path.join(dst,terminalRecord.subject_ref));
 review.basis=review.basis.map(row=>row.ref==='handoff.yaml'?{...row,digest:hash(fs.readFileSync(path.join(dst,'handoff.yaml'))).slice(7)}:row);target.put(terminalRecord.subject_ref,review);
 terminalRecord.subject_digest=hash(fs.readFileSync(path.join(dst,terminalRecord.subject_ref))).slice(7);terminalRecord.basis=review.basis;terminalRecord.artifact_bindings[0].digest=hash(fs.readFileSync(path.join(dst,'handoff.yaml')));target.put(terminal.record_ref,terminalRecord);
 const out=path.join(root,'final-handoff');await exportBundle({sourceRoot:dst,handoffRef:'handoff.yaml',output:out});
 await openBundle(out,b=>{check(b.manifest.bundle_digest&&b.business.status==='passed','最终Handoff导出可独立读回验包');},{readOnly:true});
 if(noDesign){
  await openBundle(out,b=>{check(b.handoff.ui_baseline_kind==='not-applicable'&&!b.handoff.package_export.prototype&&!Object.keys(b.handoff.source).some(key=>['prototype_ref','visual_baseline_ref','existing_ui_baseline_ref'].includes(key))&&!Object.values(b.handoff.package_export.approvals).some(approval=>approval.gate_id==='gate.product-design-approved'),'无设计影响终点不要求产品设计批准');},{readOnly:true});
  const unsupported=structuredClone(target.handoff);unsupported.ui_baseline_kind='prototype';target.put('unsupported-handoff.yaml',unsupported);
  await assert.rejects(()=>exportBundle({sourceRoot:dst,handoffRef:'unsupported-handoff.yaml',output:path.join(root,'invalid-no-ui')}),/schema|Schema|不匹配|缺少/);checks++;
  if(nativeCLI){native(['verify','--root',dst,'--kind','spec-baseline','--package',pkg]);checks++;native(['verify','--root',dst,'--kind','spec-baseline','--file',imported.receipt_ref,'--checkpoint','intake-checkpoint.json']);checks++;verifyTerminal(dst,out);}
  console.log(JSON.stringify({result:'passed',checks,synthetic_fixture:true,native_intake:Boolean(nativeCLI),no_design:true,root,source_root:src,checkpoint_ref:source.checkpointRef,design_root:dst,design_checkpoint_ref:'intake-checkpoint.json',baseline_package:pkg,handoff_package:out}));process.exit(0);
 }
 const specFile=safe(dst,proof.specRef),bytes=fs.readFileSync(specFile),mode=fs.statSync(specFile).mode&0o777;
 // Synthetic negative only: native packages are read-only, so simulate disk tampering explicitly.
 try{fs.chmodSync(specFile,mode|0o200);fs.appendFileSync(specFile,'\nchanged');assert.throws(()=>verifySpecBaselineBinding(state,{root:dst}),/漂移/);checks++;}finally{fs.writeFileSync(specFile,bytes);fs.chmodSync(specFile,mode);}
 // A changed local meaning needs current local strategic/Spec approvals, not an origin exemption.
 const localRoot=path.join(root,'local-design'),local=await designFixture(localRoot,{nativeSeed:process.env.YSS_DESIGN_BASELINE_NATIVE_SEED});
 const localImported=importSpecBaseline({bundle:pkg,targetRoot:localRoot}),localReceipt=read(path.join(localRoot,localImported.receipt_ref));
 const localContextBytes=fs.readFileSync(path.join(localRoot,'CONTEXT.md'),'utf8'),localTerm=parseContextContract({root:localRoot}).business_terms[0];
 fs.writeFileSync(path.join(localRoot,'CONTEXT.md'),localContextBytes.replace(localTerm.meaning,localTerm.meaning+'（本地重新确认的职责）'));
 const currentContext=parseContextContract({root:localRoot}),currentTerms=resolveContextTermRefs(currentContext,[localTerm.term_ref]);
 const currentSnapshot={context_ref:'CONTEXT.md',context_schema_version:1,document_digest:currentContext.document_digest,referenced_terms_digest:currentTerms.referenced_terms_digest,term_refs:[localTerm.term_ref]};
 const oldLocalStrategyBytesDigest=hash(fs.readFileSync(path.join(localRoot,'source/strategy.yaml')));
 local.strategy.context_snapshot=currentSnapshot;local.put('source/strategy.yaml',local.strategy);
 local.stage.context_snapshot=currentSnapshot;local.stage.domain_strategy_ref.digest=digest(local.strategy);local.put('source/stage.yaml',local.stage);
 local.handoff.source.domain_strategy_ref.digest=digest(local.strategy);local.handoff.source.stage_decision_package_ref.digest=digest(local.stage);
 local.handoff.source_context_snapshot=currentSnapshot;local.handoff.context_delta.added=currentTerms.terms.map(({term_ref,term,meaning,english_identifier,context_id,forbidden_aliases})=>({term_ref,term,meaning,english_identifier,context_id,forbidden_aliases}));
 const localSetRef=local.handoff.source.business_ticket_set_ref.persisted_ref,localSet=read(path.join(localRoot,localSetRef));
 for(const ticket of localSet.tickets){const file=path.join(localRoot,ticket.ref);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll(oldLocalStrategyBytesDigest,hash(fs.readFileSync(path.join(localRoot,'source/strategy.yaml')))));ticket.digest=hash(fs.readFileSync(file));}
 local.put(localSetRef,localSet);const localSetDigest=hash(fs.readFileSync(path.join(localRoot,localSetRef)));
 const localReview=read(path.join(localRoot,localSet.review_ref));localReview.subject_digest=localSetDigest;local.put(localSet.review_ref,localReview);local.handoff.source.business_ticket_set_ref.digest=localSetDigest;
 local.sign({bindPlanChecks:true});reconcile(localRoot,'local-intake-context.json',{receiptRef:localImported.receipt_ref,sourceContextRef:localReceipt.package_ref+'/payload/files/source-context.snapshot.md'});
 const localCurrent={feature_id:source.state.feature_id,stage:'stage.entry-triage',upstream_spec_baseline:{receipt_ref:localImported.receipt_ref,receipt_digest:localImported.receipt_digest},context_reconciliation:{status:'reconciled',ref:'local-intake-context.json',evidence_refs:[localImported.receipt_ref,'local-intake-context.json']},artifacts:{'artifact.spec':{status:'approved',ref:local.handoff.source.spec_ref.persisted_ref,evidence_refs:[local.handoff.package_export.approvals.spec_ref.record_ref]}},checks:{},gates:{'gate.plan-approved':approvedGate(local,'domain_strategy_ref'),'gate.spec-baseline-approved':approvedGate(local,'spec_ref')}};
 const currentPlan=localPlanFixture(local);if(local.nativeSeed)bindLocalPlanHandoff(local,currentPlan);Object.assign(localCurrent,currentPlan.state);localCurrent.gates['gate.spec-baseline-approved']=approvedGate(local,'spec_ref');
 check(assertCheckpointBoundary(localCurrent,{root:localRoot}).status==='passed','本地当前批准可以承接新Context并保留Receipt来源');
 assert.throws(()=>verifySpecBaselineBinding({...localCurrent,plan_review_ref:undefined},{root:localRoot}),/plan_review_ref/);checks++;
 local.put('local-intake-checkpoint.json',{...checkpoint,...localCurrent});
 const inherited=structuredClone(target.handoff.source.domain_strategy_ref);inherited.approval_context.source_baseline.context_reconciliation_ref='local-intake-context.json';
 assert.throws(()=>importedApprovalOrigin(localRoot,inherited),/术语冲突/);checks++;
 const localOut=path.join(root,'local-final-handoff');await exportBundle({sourceRoot:localRoot,handoffRef:'handoff.yaml',output:localOut});
 await openBundle(localOut,b=>{check(!Object.values(b.handoff.source).some(asset=>asset.approval_context?.source_baseline),'重新批准的本地终点不借用旧来源marker');},{readOnly:true});
 if(nativeCLI){native(['verify','--root',dst,'--kind','spec-baseline','--package',pkg]);checks++;native(['verify','--root',dst,'--kind','spec-baseline','--file',imported.receipt_ref,'--checkpoint','intake-checkpoint.json']);checks++;verifyTerminal(dst,out);}
 if(nativeCLI){native(['verify','--root',localRoot,'--kind','spec-baseline','--file',localImported.receipt_ref,'--checkpoint','local-intake-checkpoint.json']);checks++;verifyTerminal(localRoot,localOut);}
 console.log(JSON.stringify({result:'passed',checks,synthetic_fixture:true,native_intake:Boolean(nativeCLI),root,source_root:src,checkpoint_ref:source.checkpointRef,design_root:dst,baseline_package:pkg,handoff_package:out,local_design_root:localRoot,local_handoff_package:localOut}));
}catch(error){console.error(error.stack);console.error('fixture_root='+root);process.exitCode=1;}
