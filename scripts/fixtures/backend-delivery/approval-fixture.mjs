// Synthetic local lifecycle approval only. Never use to record a real person's decision.
import path from 'node:path';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {read,json,hash,files} from '../../lib/strategic-handoff-io.mjs';
import {countersignRuleForGate} from '../../lib/digital-human-roles.mjs';
import {buildDecisionFixture} from '../user-decision/build-fixture.mjs';
export function attachSliceApproval(root,contractRef) {
 const put=(ref,value)=>{mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});writeFileSync(path.join(root,ref),typeof value==='string'?value:json(value));};
 const contract=read(path.join(root,contractRef));
 const roles=read(path.join(root,'docs/agents/digital-human-roles.yaml'));
 const sliceRule=countersignRuleForGate(roles.gate_policy,'gate.slice-contract-approved');
 if(sliceRule) {
  const binding={ref:contractRef,digest:hash(readFileSync(path.join(root,contractRef))),id:contract.contract_id,version:contract.contract_version,approval_ref:'approvals/slice-countersign.json'};
  const evidence='approvals/synthetic-slice-review.md';put(evidence,'Synthetic independent Slice review; not a real product approval.');
  put(binding.approval_ref,{schema_version:1,gate_id:'gate.slice-contract-approved',decision:'approved',actor_kind:'digital-human',role_id:sliceRule.countersigners.at(-1),runtime_id:'runtime.generic',principal_ref:'synthetic-independent-reviewer',artifact_bindings:[{id:binding.id,version:binding.version,digest:binding.digest}],evidence_refs:[evidence]});
  return {binding,supportingFiles:[evidence]};
 }
 const ticket='approvals/synthetic-ticket.md',baseline='approvals/synthetic-baseline.md',scopeRef='approvals/implementation-scope.json';
 put(ticket,'Synthetic Ticket for portable protocol regression only.');put(baseline,'Synthetic engineering baseline for protocol regression only.');
 contract.lifecycle_refs={...contract.lifecycle_refs,ticket,engineering_baseline:baseline};contract.common={...contract.common,project_roots:['synthetic-project'],allowed_write_paths:['src/synthetic']};put(contractRef,contract);
 const asset=ref=>({ref,digest:hash(readFileSync(path.join(root,ref))),version:'v1'});
 const binding={...asset(contractRef),id:contract.contract_id,version:contract.contract_version,approval_ref:'approvals/slice-checkpoint.json'};
 put(scopeRef,{kind:'implementation-scope',slices:[{ticket_ref:ticket,contract:asset(contractRef),repositories:contract.common.project_roots,allowed_write_paths:contract.common.allowed_write_paths,baselines:[asset(baseline)]}]});
 const decisionRoot='approvals/implementation-decision';
 const decision=buildDecisionFixture(path.join(root,decisionRoot),{boundary:'implementation-scope',scope:[ticket],subjectRef:path.join(root,scopeRef)});
 const relative=ref=>path.relative(root,ref).split(path.sep).join('/');
 decision.record.request.items[0].subject.ref=scopeRef;decision.record.request.requester_source.ref=relative(decision.record.request.requester_source.ref);decision.present();decision.record.responses=[];decision.respond();decision.record.request.presented_source.ref=relative(decision.record.request.presented_source.ref);decision.record.responses[0].source.ref=relative(decision.record.responses[0].source.ref);decision.save();
 const checkpoint={schema_version:1,repository_mode:'project-instance',mode:'orchestrate',status:'running',stage:'stage.ticket-formalization',artifacts:{},gates:{'gate.slice-contract-approved':{status:'approved',subject_ref:contractRef,reason:'Synthetic lifecycle checkpoint backed by synthetic original scope decision',evidence_refs:[scopeRef]}},context_reconciliation:{status:'reconciled',ref:'CONTEXT.md',evidence_refs:['CONTEXT.md']},next_work_unit:'work-unit.slice-implementation',ticket_sync:{},verification:{},human_review:{implementation:{slice_contract_ref:contractRef,vertical_slice_ticket_ref:ticket},user_decisions:[{boundary:'implementation-scope',subject_ref:scopeRef,scope:[ticket],user_decision_ref:relative(decision.ref)}]},git_checkpoint:{},blockers:[],rollback:[]};
 put(binding.approval_ref,checkpoint);
 return {binding,supportingFiles:[ticket,baseline,scopeRef,...files(root,decisionRoot)]};
}

// Use the actual synthetic source's policy, including portable original replies for human gates.
export function attachArtifactApproval(root,ref,id,gate) {
 const roles=read(path.join(root,'docs/agents/digital-human-roles.yaml')),rule=countersignRuleForGate(roles.gate_policy,gate);
 if(!rule)throw new Error(`Synthetic source has no approval rule for ${gate}`);
 const binding={ref,id,version:'v1',digest:hash(readFileSync(path.join(root,ref))),approval_ref:`approvals/${id}.json`};
 const biological=rule.bucket==='biological_human',supportingFiles=[];
 const proof={schema_version:1,gate_id:gate,decision:'approved',actor_kind:biological?'biological-human':'digital-human',role_id:biological?'role.biological-human':rule.countersigners.at(-1),runtime_id:'runtime.generic',principal_ref:biological?'person.requester':'synthetic-independent-reviewer',artifact_bindings:[{id,version:binding.version,digest:binding.digest}]};
 if(biological||roles.user_decision_policy.gates.includes(gate)) {
  const decisionRoot=`approvals/decision-${id}`;
  const decision=buildDecisionFixture(path.join(root,decisionRoot),{boundary:gate,scope:[id],subjectRef:path.join(root,ref)});
  const relative=value=>path.relative(root,value).split(path.sep).join('/');
  decision.record.request.items[0].subject.ref=ref;decision.record.request.requester_source.ref=relative(decision.record.request.requester_source.ref);decision.present();decision.record.responses=[];decision.respond();decision.record.request.presented_source.ref=relative(decision.record.request.presented_source.ref);decision.record.responses[0].source.ref=relative(decision.record.responses[0].source.ref);decision.save();
  Object.assign(proof,{subject_ref:ref,approval_scope:[id],user_decision_ref:relative(decision.ref)});supportingFiles.push(...files(root,decisionRoot));
 }
 mkdirSync(path.dirname(path.join(root,binding.approval_ref)),{recursive:true});writeFileSync(path.join(root,binding.approval_ref),json(proof));
 return {binding,supportingFiles};
}
