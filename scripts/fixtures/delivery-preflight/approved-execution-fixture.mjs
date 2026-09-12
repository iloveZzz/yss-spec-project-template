// Synthetic local approval/decision sources for mechanism tests only; never pilot evidence.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fixture} from '../existing-backend/fixture.mjs';
import {buildDecisionFixture} from '../user-decision/build-fixture.mjs';
import {mvcFixture} from '../../../.agents/skills/yss-technical-design/tests/fixtures.mjs';
import {technicalDigest} from '../../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs';
import {compileDefaultImplementationContract,loadCompilerContract} from '../../lib/implementation-contract-compiler.mjs';
import {hash,read,sourceApprovalPolicy} from '../../lib/strategic-handoff-io.mjs';
import {countersignRuleForGate} from '../../lib/digital-human-roles.mjs';
import {context as fixtureContext} from '../strategic-handoff/fixture.mjs';

export function approvedFixture(family='layered-mvc',{withDesign=family==='layered-mvc'}={}) {
 const f=fixture(family),slice_id='slice.synthetic',ticket='tickets/synthetic.md';
 const roles=sourceApprovalPolicy(read(path.join(f.root,'docs/agents/digital-human-roles.yaml')));
 let design,technical_design;
 if(withDesign){
  design=mvcFixture(f.root);
  f.write('registration.json',f.registration);f.write('review.md','Synthetic architecture and technical review, not product evidence.\n');
  design.status='approved';design.architecture.project_id=f.identity.project_id;design.architecture.decision_digest=f.bindings.repository_registration.digest;
 }
 f.write('yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');
 f.write('CONTEXT.md',fixtureContext);
 f.write(ticket,'Synthetic Ticket only.');
 if(design){
  design.inputs=design.inputs.map(item=>({...item,digest:hash(readFileSync(path.join(f.root,item.ref)))}));design.digest=technicalDigest(design);
  technical_design={...f.write('technical-design.json',design),id:design.technical_design_id,version:design.version};
  const designGate=['gate.engineering-contract-approved','gate.technical-design-approved'].find(gate=>countersignRuleForGate(roles.gate_policy,gate));
  if(!designGate)throw new Error('Synthetic technical fixture requires installed source approval policy');
  const d=buildDecisionFixture(path.join(f.root,'design-decision'),{boundary:designGate,scope:[slice_id],subjectRef:path.join(f.root,technical_design.ref)});
  const proof={schema_version:1,gate_id:designGate,decision:'approved',actor_kind:'digital-human',role_id:countersignRuleForGate(roles.gate_policy,designGate).countersigners[0],runtime_id:'runtime.generic',principal_ref:'synthetic-product-reviewer',subject_ref:path.join(f.root,technical_design.ref),approval_scope:[slice_id],user_decision_ref:d.ref,artifact_bindings:[{id:technical_design.id,version:technical_design.version,digest:technical_design.digest}]};
  technical_design.approval_ref=f.write('technical-approval.json',proof).ref;
 }
 const resolution=compileDefaultImplementationContract({root:f.root,recipeIds:[family==='domain-driven'?'backend.ddd-http-api':'backend.mvc-http-api'],slice_id,architecture_identity:f.identity,architecture_evidence:f.bindings,...(technical_design?{technical_design}:{})});
 const definition=loadCompilerContract();
 const contract={};
 for(const [section,fields]of Object.entries(definition.slice_contract_required)){
  const target=section==='root'?contract:(contract[section]={});for(const key of fields)target[key]=[];
 }
 Object.assign(contract,{schema_version:2,contract_id:'contract.synthetic',contract_version:'v1',slice_id,status:'approved',resolution,work_units:[]});
 contract.lifecycle_refs={...contract.lifecycle_refs,ticket,engineering_baseline:f.bindings.engineering_baseline.ref};
 contract.common={...contract.common,project_roots:[f.project],allowed_write_paths:['src/main/java'],required_capabilities:resolution.required_capabilities,required_skills:resolution.required_skills};
 contract.readiness={...contract.readiness,blockers:[],stale_inputs:[],not_applicable:[]};
 contract.frontend.status='not-applicable';contract.backend.status='required';
 const binding={...f.write('slice.json',contract),id:contract.contract_id,version:contract.contract_version,approval_ref:'checkpoint.json'};
 const implementationScope={kind:'implementation-scope',slices:[{ticket_ref:ticket,contract:{ref:binding.ref,version:binding.version,digest:binding.digest},repositories:contract.common.project_roots,allowed_write_paths:contract.common.allowed_write_paths,baselines:[{...f.bindings.engineering_baseline,version:'v1'}]}]};
 f.write('implementation-scope.json',implementationScope);
 const decision=buildDecisionFixture(path.join(f.root,'implementation-decision'),{boundary:'implementation-scope',scope:[ticket],subjectRef:path.join(f.root,'implementation-scope.json')});
 const checkpoint={schema_version:1,repository_mode:'project-instance',mode:'orchestrate',status:'running',stage:'stage.ticket-formalization',artifacts:{},gates:{'gate.slice-contract-approved':{status:'approved',subject_ref:binding.ref,reason:'Synthetic orchestrator checkpoint with captured synthetic implementation-scope decision',evidence_refs:['implementation-scope.json']}},context_reconciliation:{status:'reconciled',ref:'CONTEXT.md',evidence_refs:['CONTEXT.md']},next_work_unit:'work-unit.slice-implementation',ticket_sync:{},verification:{},human_review:{implementation:{slice_contract_ref:binding.ref,vertical_slice_ticket_ref:ticket},user_decisions:[decision.requirement]},git_checkpoint:{},blockers:[],rollback:[]};
 const sliceRule=countersignRuleForGate(roles.gate_policy,'gate.slice-contract-approved');
 const approvalProtocol=sliceRule?'countersign':'checkpoint';
 const sliceApproval=sliceRule?{schema_version:1,gate_id:'gate.slice-contract-approved',decision:'approved',actor_kind:'digital-human',role_id:sliceRule.countersigners.at(-1),runtime_id:'runtime.generic',principal_ref:'synthetic-independent-slice-reviewer',artifact_bindings:[{id:contract.contract_id,version:contract.contract_version,digest:binding.digest}],evidence_refs:['review.md']}:checkpoint;
 f.write(binding.approval_ref,sliceApproval);
 return {...f,contract,binding,design,technical_design,checkpoint,decision,implementationScope,approvalProtocol,sliceApproval};
}
