// Explicitly synthetic approvals and replies for protocol tests only.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,loadRegistry} from '../../lib/lifecycle-registry.mjs';
import {fixture as strategicFixture} from '../strategic-handoff/fixture.mjs';
import {buildPlanFixture} from '../user-decision/plan-fixture.mjs';
import {localizeSyntheticPlanSource,syntheticPlanSourceContext} from '../plan-review-control/source-consumption-fixture.mjs';
import {read,json,hash,digest} from '../../lib/strategic-handoff-io.mjs';
import {parseContextContract,resolveContextTermRefs} from '../../lib/context-contract.mjs';
import {initializePlanReview} from '../../lib/plan-review-control.mjs';
import {planEntryPolicy,assertPlanAggregateApproval} from '../../lib/plan-spec-entry.mjs';

export function writeIdentity(root,profile) {
 const profileId={spec:'harness.spec-template',design:'harness.business-ddd-strategy-handoff'}[profile];
 fs.writeFileSync(path.join(root,'.yss.json'),json({schemaVersion:1,protocolVersion:1,cliVersion:'1.0.0',templateVersion:'1.0.0',legacyCliVersion:'1.0.0',profile,profileId,templateSourceState:'committed',templateCommit:'1'.repeat(40),snapshotHash:'2'.repeat(64),manifestHash:'3'.repeat(64),variables:{},distribution:{},managedFiles:{},baselineDigest:hash('{}').slice(7)}));
}
export function reconcile(root,ref,{receiptRef,sourceContextRef,stage='stage.entry-triage',workUnit='work-unit.entry-triage'}={}) {
 const c=parseContextContract({root}),termRefs=receiptRef?c.business_terms.map(term=>term.term_ref):[],record={schema_version:1,repository_mode:'project-instance',stage,work_unit:workUnit,status:'reconciled',context_snapshot:{context_ref:c.context_ref,context_schema_version:c.context_schema_version,document_digest:c.document_digest,referenced_terms_digest:resolveContextTermRefs(c,termRefs).referenced_terms_digest,term_refs:termRefs},changes:{added:[],updated:[],deprecated:[]},unresolved_terms:[],evidence_refs:['CONTEXT.md',...([receiptRef,sourceContextRef].filter(Boolean))]};
 fs.writeFileSync(path.join(root,ref),json(record));return record;
}
export function copyNativeIdentity(root,seed,profile) {
 const metadata=read(path.join(seed,'.yss.json')),installed=read(path.join(seed,'.template-spec/process/harness-profile.yaml'));
 if(metadata.profile!==profile||installed.profile_id!==metadata.profileId)throw Error('合成测试原生安装seed Profile不匹配');
 fs.copyFileSync(path.join(seed,'.yss.json'),path.join(root,'.yss.json'));
 fs.copyFileSync(path.join(seed,'.template-spec/process/harness-profile.yaml'),path.join(root,'.template-spec/process/harness-profile.yaml'));
}
export function localPlanFixture(owner,{featureId='feature.supplier'}={}) {
 const root=owner.root,refs=['CONTEXT.md','.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/digital-human-roles.yaml','.template-spec/agents/yss-skill-registry.yaml','.template-spec/agents/issue-tracker.md'];
 const fullPolicy=path.join(root,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'),fullPolicyBytes=fs.existsSync(fullPolicy)?fs.readFileSync(fullPolicy):null;
 const saved=new Map(refs.map(ref=>[ref,fs.readFileSync(path.join(root,ref))]));
 const plan=buildPlanFixture(root);for(const [ref,bytes]of saved)fs.writeFileSync(path.join(root,ref),bytes);
 if(fullPolicyBytes)fs.writeFileSync(fullPolicy,fullPolicyBytes);else fs.rmSync(fullPolicy);
 plan.review.feature_id=featureId;plan.state.feature_id=featureId;
 reconcile(root,'reconciliation.json');
 const policy=planEntryPolicy({root});plan.review.checks=Object.fromEntries(policy.required_checks.map(id=>[id,{status:'passed',evidence_refs:['plan.md']}]));
 plan.review.basis=[...plan.review.basis.map(row=>({...row,digest:hash(fs.readFileSync(path.join(root,row.ref)))})),...['source/strategy.yaml','source/stage.yaml'].map(ref=>({ref,digest:hash(fs.readFileSync(path.join(root,ref)))}))];
 const origin={feature_id:featureId,checks:{},gates:{}};plan.write('local-plan-origin.json',origin);
 plan.state.plan_review_control=initializePlanReview(origin,{feature_id:featureId,scope_ids:[featureId],scope_digest:hash(fs.readFileSync(path.join(root,'plan.md'))),provenance:{kind:'new-feature',source_ref:'local-plan-origin.json',source_digest:hash(fs.readFileSync(path.join(root,'local-plan-origin.json')))}},{root});
 plan.approval.record.request.items[0].scope=[featureId];plan.approval.requirement.scope=[featureId];localizeSyntheticPlanSource(plan);
 const {gate}=syntheticPlanSourceContext(plan);gate.reason='合成当前本地Plan审阅、依据与独立回复已验证，仅测试使用';gate.evidence_refs=gate.basis.map(row=>row.ref);gate.evidence={'evidence.approval-record':[plan.state.plan_approval_ref]};
 const registry=read(path.join(root,'.template-spec/process/lifecycle-registry.yaml')),checks={};
 for(const id of registry.gates.find(row=>row.id==='gate.plan-approved').requires_checks)checks[id]={status:'not-applicable',applicable:false,reason:'当前范围细化的完整Plan审阅已明确专业检查不适用',basis:gate.basis.slice(0,1)};
 const state={...plan.state,gates:{'gate.plan-approved':gate},checks};delete state.user_decisions;
 assertPlanAggregateApproval(state,{root});return {plan,state,synthetic_fixture:true};
}
export async function approvedSpecFixture(root,{productDesign=true,nativeSeed}={}) {
 fs.mkdirSync(root,{recursive:true});
 const strategic=await strategicFixture(root,{handoffVersion:5,businessTickets:true,...(!productDesign?{impacts:{ui:false,api:true,data:true,backend:true,frontend:false,cross_repo:false,high_risk:false}}:{})});
 const businessRef=strategic.handoff.source.business_ticket_set_ref.persisted_ref,business=read(path.join(root,businessRef));
 const firstTicket=business.tickets[0],ticketFile=path.join(root,firstTicket.ref);
 fs.appendFileSync(ticketFile,'\n[Spec](../spec.md#approved)\n[External reference](https://example.invalid/spec?view=1#approved)\n');
 firstTicket.digest=hash(fs.readFileSync(ticketFile));strategic.put(businessRef,business);
 const businessDigest=hash(fs.readFileSync(path.join(root,businessRef))),businessReview=read(path.join(root,business.review_ref));
 businessReview.subject_digest=businessDigest;strategic.put(business.review_ref,businessReview);
 strategic.handoff.source.business_ticket_set_ref.digest=businessDigest;strategic.sign();
 const context=fs.readFileSync(path.join(root,'CONTEXT.md')),sourceRoles=fs.readFileSync(path.join(root,'.template-spec/agents/digital-human-roles.yaml'));
 const plan=buildPlanFixture(root);fs.writeFileSync(path.join(root,'CONTEXT.md'),context);
 plan.write('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: docs/.scratch\n  business_ticket_version: 1\n---\n# Synthetic source tracker\n');
 plan.review.feature_id='feature.supplier';plan.state.feature_id='feature.supplier';
 plan.state.plan_review_control.feature_id='feature.supplier';plan.state.plan_review_control.scope_ids=['feature.supplier'];
 plan.review.basis=plan.review.basis.map(row=>({...row,digest:hash(fs.readFileSync(path.join(root,row.ref)))}));
 reconcile(root,'reconciliation.json',{stage:'stage.plan',workUnit:'work-unit.plan-requirements'});
 plan.review.basis=plan.review.basis.map(row=>({...row,digest:hash(fs.readFileSync(path.join(root,row.ref)))}));
 plan.approval.record.request.items[0].scope=['feature.supplier'];plan.approval.requirement.scope=['feature.supplier'];
 localizeSyntheticPlanSource(plan);
 fs.writeFileSync(path.join(root,'.template-spec/agents/digital-human-roles.yaml'),sourceRoles);
 fs.cpSync(path.join(ROOT,'.template-spec/process/schemas'),path.join(root,'.template-spec/process/schemas'),{recursive:true});
 // Plan's approved review independently binds these unchanged strategic assets.
 for(const ref of ['source/strategy.yaml','source/stage.yaml'])plan.review.basis.push({ref,digest:hash(fs.readFileSync(path.join(root,ref)))});
 localizeSyntheticPlanSource(plan);
 const source=syntheticPlanSourceContext(plan),registry=loadRegistry();
 const state={schema_version:1,repository_mode:'project-instance',mode:'route',status:'routing',stage:'stage.spec-architecture',artifacts:{},checks:{},gates:{'gate.plan-approved':source.gate},context_reconciliation:{status:'reconciled',ref:'reconciliation.json',evidence_refs:['reconciliation.json']},next_work_unit:'work-unit.prototype-design-v2',ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[],...plan.state};
 state.gates['gate.plan-approved'].evidence={'evidence.approval-record':[plan.state.plan_approval_ref]};
 for(const id of registry.gates.find(row=>row.id==='gate.plan-approved').requires_checks)state.checks[id]={status:'not-applicable',applicable:false,reason:'合成当前Plan仅细化范围，既有战略合同不变',basis:source.gate.basis.slice(0,1)};
 const ids={domain_strategy_ref:'artifact.domain-strategy',stage_decision_package_ref:'artifact.stage-decision-package',spec_ref:'artifact.spec',business_ticket_set_ref:'artifact.business-ticket-set'};
 for(const [key,id]of Object.entries(ids))state.artifacts[id]={ref:strategic.handoff.source[key].persisted_ref,status:key==='business_ticket_set_ref'?'ready-for-human':'approved',evidence_refs:['evidence/offline.log']};
 state.artifacts['artifact.plan']={ref:'plan.md',status:'approved',evidence_refs:['review.json']};
 delete state.user_decisions;state.human_review.user_decisions=plan.state.user_decisions;
 const specContext=structuredClone(strategic.handoff.source.spec_ref.approval_context),specApproval=strategic.handoff.package_export.approvals.spec_ref.record_ref;
 state.gates['gate.spec-baseline-approved']={...specContext,status:'approved',approval_ref:specApproval,subject_digest:hash(fs.readFileSync(path.join(root,specContext.subject_ref))).slice(7),basis:[...specContext.basis,{ref:specContext.subject_ref,digest:hash(fs.readFileSync(path.join(root,specContext.subject_ref))).slice(7)},{ref:specApproval,digest:hash(fs.readFileSync(path.join(root,specApproval))).slice(7)}],evidence:{'evidence.approval-record':[specApproval]}};
 for(const gate of Object.values(state.gates)){gate.reason='合成独立审查与真实合成回复已验证，仅测试使用';gate.evidence_refs=gate.basis.map(row=>row.ref);delete gate.review_package;}
 const aggregate=read(path.join(root,plan.state.plan_approval_ref));aggregate.artifact_bindings=['domain_strategy_ref','stage_decision_package_ref'].map(key=>({id:strategic.handoff.source[key].id,version:'v1',digest:strategic.handoff.source[key].digest}));plan.write(plan.state.plan_approval_ref,aggregate);
 state.gates['gate.plan-approved'].basis=state.gates['gate.plan-approved'].basis.map(row=>row.ref===plan.state.plan_approval_ref?{...row,digest:hash(fs.readFileSync(path.join(root,row.ref))).slice(7)}:row);
 writeIdentity(root,'spec');
 plan.write('.template-spec/process/harness-profile.yaml',{schema_version:2,profile_id:'harness.spec-template',instantiation:{cli_package:'yss',metadata_file:'.yss.json',native_profile:'spec',template_source:'github:iloveZzz/yss-spec-project-template'}});
 if(nativeSeed)copyNativeIdentity(root,nativeSeed,'spec');
 const checkpointRef='docs/.scratch/feature.supplier/checkpoint.json';plan.write(checkpointRef,state);
 // The design selector is read from approved stage bytes, rather than a caller flag.
 // This fixture exercises the required prototype route by default.
 return {root,state,checkpointRef,plan,strategic,synthetic_fixture:true};
}

export async function designFixture(root,{nativeSeed,productDesign=true}={}) {
 fs.mkdirSync(root,{recursive:true});
 const target=await strategicFixture(root,{handoffVersion:5,businessTickets:true,...(!productDesign?{impacts:{ui:false,api:true,data:true,backend:true,frontend:false,cross_repo:false,high_risk:false}}:{})});
 fs.cpSync(path.join(ROOT,'submodules/yss-harness-design-agent/.template-spec/process/schemas'),path.join(root,'.template-spec/process/schemas'),{recursive:true});
 fs.copyFileSync(path.join(ROOT,'submodules/yss-harness-design-agent/.template-spec/agents/yss-skill-registry.yaml'),path.join(root,'.template-spec/agents/yss-skill-registry.yaml'));
 for(const ref of ['.template-spec/process/lifecycle-registry.yaml','.template-spec/process/harness-profile.yaml','.template-spec/process/checkpoint-boundary.yaml','.agents/skills/yss-strategic-design/references/orchestration-contract.yaml']) {
  const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(ROOT,'submodules/yss-harness-design-agent',ref),file);
 }
 fs.mkdirSync(path.join(root,'.template-spec/agents'),{recursive:true});
 fs.writeFileSync(path.join(root,'.template-spec/agents/issue-tracker.md'),'---\ntracker:\n  platform: local-markdown\n  root: docs/.scratch\n  business_ticket_version: 1\n---\n# Synthetic Design tracker\n');
 writeIdentity(root,'design');if(nativeSeed)copyNativeIdentity(root,nativeSeed,'design');return {root,...target,synthetic_fixture:true};
}
