// Synthetic protocol approvals and verification only; never product acceptance.
// A real native installation supplies unchanged policy, schemas, skills and identity.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {approvedSpecFixture} from './fixture.mjs';
import {terminalReviewFixture} from '../backend-standards/terminal-fixture.mjs';
import {buildDecisionFixture} from '../user-decision/build-fixture.mjs';
import {attachArtifactApproval} from '../backend-delivery/approval-fixture.mjs';
import {read,hash,files,json,parse} from '../../lib/strategic-handoff-io.mjs';
import {technicalDigest} from '../../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs';

const protectedRefs=['.yss.json','.template-spec/process/harness-profile.yaml',
 '.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/digital-human-roles.yaml',
 '.template-spec/agents/yss-skill-registry.yaml','.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'];
function portableDecision(root,ref,{subjectRef,boundary,scope}) {
 const d=buildDecisionFixture(path.join(root,ref),{subjectRef:path.join(root,subjectRef),boundary,scope});
 const relative=value=>path.relative(root,value).split(path.sep).join('/');
 d.record.request.items[0].subject.ref=subjectRef;
 d.record.request.requester_source.ref=relative(d.record.request.requester_source.ref);
 d.present();d.record.responses=[];d.respond();
 d.record.request.presented_source.ref=relative(d.record.request.presented_source.ref);
 d.record.responses[0].source.ref=relative(d.record.responses[0].source.ref);d.save();
 return {ref:relative(d.ref),requirement:{...d.requirement,subject_ref:subjectRef,user_decision_ref:relative(d.ref)}};
}
function gateFor(root,approved,{evidenceKind,checks=[]}={}) {
 const record=read(path.join(root,approved.binding.approval_ref)),context=approved.binding.approval_context;
 const basis=[...context.basis];
 for(const check of checks)for(const row of check.basis)if(!basis.some(x=>x.ref===row.ref))basis.push(row);
 // A changed aggregate basis receives a new captured synthetic original reply.
 const subject={gate_id:record.gate_id,approval_scope:context.approval_scope,basis,drafter_principal_ref:context.drafter_principal_ref};
 fs.writeFileSync(path.join(root,context.subject_ref),json(subject));
 record.basis=basis;record.subject_digest=hash(fs.readFileSync(path.join(root,context.subject_ref))).slice(7);
 if(record.user_decision_ref)record.user_decision_ref=portableDecision(root,'local-product-decision',{subjectRef:context.subject_ref,boundary:record.gate_id,scope:context.approval_scope}).ref;
 fs.writeFileSync(path.join(root,approved.binding.approval_ref),json(record));
 const file=ref=>({ref,digest:hash(fs.readFileSync(path.join(root,ref))).slice(7)});
 return {status:'approved',...context,subject_digest:record.subject_digest,approval_ref:approved.binding.approval_ref,
  basis:[...basis,file(context.subject_ref),file(approved.binding.approval_ref)],reason:'Synthetic independently reviewed protocol evidence; not product certification.',
  evidence:{[evidenceKind]:[approved.binding.approval_ref]},evidence_refs:[approved.binding.approval_ref]};
}

/** One native Spec root, current original Plan/Spec, approved mixed Slice and local backend evidence.
 * No strategic export/import, self Receipt or caller completion flag is used.
 */
export async function localImplementationFixture({nativeSeed,backendRequired=true,nativeFrontendSeed}={}) {
 if(!nativeSeed)throw new Error('localImplementationFixture requires a real native Spec asset seed');
 nativeSeed=path.resolve(nativeSeed);
 const identity=read(path.join(nativeSeed,'.yss.json'));
 if(identity.profile!=='spec'||identity.profileId!=='harness.spec-template')throw new Error('local implementation seed must be native Spec');
 const preserved=new Map(protectedRefs.map(ref=>[ref,{bytes:fs.readFileSync(path.join(nativeSeed,ref)),mode:fs.statSync(path.join(nativeSeed,ref)).mode}]));
 const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-local-approved-spec-')));
 const load=(root,ref)=>import(pathToFileURL(path.join(root,ref)));
 let f;
 try {
  const spec=await approvedSpecFixture(scratch,{nativeSeed:nativeFrontendSeed||nativeSeed,productDesign:true});
  if(!backendRequired){
   Object.assign(spec.strategic.stage.impact_assessment,{backend:false,api:false,data:false,frontend:true,ui:true});
   spec.strategic.put('source/stage.yaml',spec.strategic.stage);
   spec.strategic.handoff.source.stage_decision_package_ref.digest=(await load(nativeSeed,'scripts/lib/strategic-handoff-io.mjs')).digest(spec.strategic.stage);
   spec.strategic.sign();
   const specGate=spec.state.gates['gate.spec-baseline-approved'];
   specGate.basis=specGate.basis.map(row=>({...row,digest:hash(fs.readFileSync(path.join(scratch,row.ref))).slice(7)}));
  }
  const nativeReaders={compiler:await load(nativeSeed,'scripts/lib/implementation-contract-compiler.mjs'),
   preparation:await load(nativeSeed,'scripts/lib/slice-contract-preparation.mjs'),
   slice:await load(nativeSeed,'scripts/lib/slice-contract.mjs')};
  let checkpoint,checkpointRef,specProof;
  f=terminalReviewFixture({nativeSeed,nativeReaders,apiRequired:backendRequired,
   specText:'---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-1 | 提交材料 |\n## 验收标准\n| ID | 需求引用 |\n|---|---|\n| AC-1 | FR-1 |\n',
   refineContract:(contract,owner)=>{
    f=owner;
    if(nativeFrontendSeed) {
      if(backendRequired)throw Error('native Frontend fixture does not implement Backend');
      const metadata=read(path.join(nativeFrontendSeed,'.yss.json'));
      if(metadata.profile!=='frontend'||metadata.profileId!=='harness.frontend-delivery')throw Error('native frontend authority mismatch');
      for(const ref of ['.yss.json','.template-spec/process','.template-spec/agents','.agents/skills','scripts','skills-lock.json'])fs.cpSync(path.join(nativeFrontendSeed,ref),path.join(owner.root,ref),{recursive:true});
    }
    const root=owner.root,bind=ref=>({ref,digest:hash(fs.readFileSync(path.join(root,ref)))});
    // Copy only business source facts. Native assets and transaction journals stay at their original roots.
    for(const ref of files(scratch)) {
     if(ref.startsWith('.agents/')||ref.startsWith('.template-spec/')||ref.startsWith('.yss/')||['.yss.json','yss-project.yaml','handoff.yaml','review.json'].includes(ref))continue;
     const target=path.join(root,ref);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(scratch,ref),target);
    }
    owner.write('local-plan-review.json',read(path.join(scratch,'review.json')));
    const planReview=read(path.join(root,'local-plan-review.json'));
    planReview.basis=planReview.basis.map(row=>({...row,digest:bind(row.ref).digest}));
    owner.write('local-plan-review.json',planReview);
    const reply=portableDecision(root,'local-plan-decision',{subjectRef:'local-plan-review.json',boundary:'gate.plan-approved',scope:['feature.supplier']});
    const aggregate=read(path.join(root,'plan-approval.json'));
    for(const binding of aggregate.artifact_bindings || [])if(binding.id===spec.strategic.stage.stage_decision_id)binding.digest=spec.strategic.handoff.source.stage_decision_package_ref.digest;
    Object.assign(aggregate,{subject_ref:'local-plan-review.json',subject_digest:bind('local-plan-review.json').digest.slice(7),
     basis:planReview.basis.map(row=>({...row,digest:row.digest.slice(7)})),user_decision_ref:reply.ref});
    owner.write('plan-approval.json',aggregate);
    checkpoint=structuredClone(spec.state);
    Object.assign(checkpoint,{plan_review_ref:'local-plan-review.json',plan_user_decision_ref:reply.ref});
    checkpoint.artifacts['artifact.plan'].evidence_refs=['local-plan-review.json'];
    checkpoint.human_review.user_decisions=[reply.requirement];
    const planGate=checkpoint.gates['gate.plan-approved'];
    Object.assign(planGate,{subject_ref:'local-plan-review.json',subject_digest:bind('local-plan-review.json').digest.slice(7),
     basis:[...aggregate.basis,{ref:'local-plan-review.json',digest:bind('local-plan-review.json').digest.slice(7)},{ref:'plan-approval.json',digest:bind('plan-approval.json').digest.slice(7)}]});
    planGate.evidence_refs=planGate.basis.map(row=>row.ref);
    for(const check of Object.values(checkpoint.checks))check.basis=check.basis.map(row=>({...row,digest:bind(row.ref).digest.slice(7)}));
    const trackerText=fs.readFileSync(path.join(root,'.template-spec/agents/issue-tracker.md'),'utf8');
    const tracker=parse(trackerText.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || trackerText);
    const trackerRoot=tracker.tracker?.root;
    if(typeof trackerRoot!=='string')throw new Error('real native seed requires registered tracker root');
    checkpointRef=`${trackerRoot}/supplier/checkpoint.json`;
    owner.write(checkpointRef,checkpoint);
    owner.write(`${trackerRoot}/supplier/map.md`,`---\ncheckpoint_ref: ${checkpointRef}\n---\n# Synthetic local current feature\n`);
    const prototypeReview=attachArtifactApproval(root,'preview/index.html','prototype.local-review','check.prototype-reviewed');
    const reviewed={...gateFor(root,prototypeReview,{evidenceKind:'evidence.prototype-review-result'}),applicable:true};
    owner.write('local-prototype-profile.json',{profile:'H2',synthetic_fixture:true,source_ref:'prototype-src',preview_ref:'preview/index.html'});
    const verified={status:'passed',applicable:true,basis:['local-prototype-profile.json','evidence/offline.json'].map(ref=>({ref,digest:bind(ref).digest.slice(7)})),
     evidence:{'evidence.prototype-profile-decision':['local-prototype-profile.json'],'evidence.prototype-deliverable-verification':['evidence/offline.json']}};
    Object.assign(checkpoint.checks,{'check.prototype-reviewed':reviewed,'check.prototype-verified':verified});
    const product=attachArtifactApproval(root,'source/visual-baseline-v1/visual-baseline.yaml','prototype.local-product','gate.product-design-approved');
    checkpoint.gates['gate.product-design-approved']=gateFor(root,product,{evidenceKind:'evidence.prototype-confirmation',checks:[reviewed,verified]});
    const originalSpec='source/spec.md';
    const technical=read(path.join(root,owner.technical_design.ref));
    technical.inputs=technical.inputs.map(row=>row.kind==='spec'?{...row,ref:originalSpec,digest:bind(originalSpec).digest}:row);
    const sourceIds={'rule.valid':'FR-001','scenario.submit':'AC-001'};
    technical.source_items=technical.source_items.map(row=>({...row,source_id:sourceIds[row.source_id]||row.source_id,source_ref:originalSpec}));
    technical.traceability=technical.traceability.map(row=>({...row,source_id:sourceIds[row.source_id]||row.source_id,evidence_refs:[originalSpec]}));
    technical.digest=technicalDigest(technical);
    const technicalBinding=owner.write(owner.technical_design.ref,technical);
    owner.technical_design.digest=technicalBinding.digest;
    owner.technical_design.approval_context.basis=owner.technical_design.approval_context.basis.map(row=>row.ref===technicalBinding.ref?{...row,digest:technicalBinding.digest.slice(7)}:row);
    const technicalApproval=read(path.join(root,owner.technical_design.approval_ref));
    const technicalSubject=read(path.join(root,technicalApproval.subject_ref));
    technicalSubject.basis=owner.technical_design.approval_context.basis;
    owner.write(technicalApproval.subject_ref,technicalSubject);
    Object.assign(technicalApproval,{basis:technicalSubject.basis,subject_digest:bind(technicalApproval.subject_ref).digest.slice(7),
     user_decision_ref:portableDecision(root,'local-technical-decision',{subjectRef:technicalApproval.subject_ref,boundary:technicalApproval.gate_id,scope:technicalApproval.approval_scope}).ref});
    for(const binding of technicalApproval.artifact_bindings)if(binding.id===owner.technical_design.id)binding.digest=technicalBinding.digest;
    owner.write(owner.technical_design.approval_ref,technicalApproval);
    contract.basis.technical_design={ref:owner.technical_design.ref,version:owner.technical_design.version,digest:technicalBinding.digest,approval_ref:owner.technical_design.approval_ref};
    contract.basis.spec={...bind(originalSpec),version:'v1'};
    contract.basis.business_ticket_set={...bind('source/tickets.yaml'),version:'v1'};
    owner.write(owner.ticket,`---\nkind: vertical-slice-ticket\nstatus: ready-for-human\nrequirement_version: v1\nbusiness_ticket_set_ref: source/tickets.yaml\nbusiness_ticket_refs: [BT-001]\nacceptance_refs: [AC-001]\n---\n## 验收标准\n- AC-001 提交成功或必填校验失败。\n`);
    contract.basis.ticket={...bind(owner.ticket),version:'v1'};
    contract.acceptance={'AC-001':{source:'spec',locator:'AC-001'}};
    if(backendRequired){contract.scope.impacted_areas.push('frontend');contract.scope.allowed_write_paths.push('src/frontend');}
    else{contract.scope.impacted_areas=['frontend','ui'];contract.scope.allowed_write_paths=['src/frontend'];contract.applicability.backend={status:'not-applicable',reason:'Synthetic approved UI-only scope has no backend/API/data implementation.'};delete contract.extensions.backend;}
    contract.applicability.frontend={status:'required'};
    const frontendSources={requirement_freeze:originalSpec,low_fidelity_review:'source/product-design-review-package.json',
     prototype_review:prototypeReview.binding.approval_ref,prototype_profile_decision:'local-prototype-profile.json',
     prototype_deliverable:'preview/index.html',prototype_deliverable_verification:'evidence/offline.json',
     prototype_confirmation:'preview/index.html',state_matrix:'source/visual-baseline-v1/sources/states.md'};
    for(const [key,ref]of Object.entries(frontendSources))contract.basis[key]={...bind(ref),version:'v1'};
    contract.basis.visual_baseline={...bind('source/visual-baseline-v1/visual-baseline.yaml'),version:'v1'};
    contract.extensions.frontend={visual_baseline_case_ids:['primary-desktop','primary-narrow'],component_test_seams:['submit'],e2e_paths:['submit']};
    for(const row of Object.values(contract.verification))row.acceptance_refs=['AC-001'];
    for(const unit of contract.work_units){unit.acceptance_refs=['AC-001'];unit.allowed_write_paths=['src/main/java'];unit.project_root=owner.project;}
    if(!backendRequired){contract.work_units=[];contract.verification={};}
    contract.verification.frontend={command:'pnpm test',cwd:owner.project,expected_evidence:['frontend/pnpm.log'],test_seams:['submit'],acceptance_refs:['AC-001']};
    contract.work_units.push({id:'work-unit.slice-frontend',behavior:'提交供应商材料并验证成功与失败状态',role_id:nativeFrontendSeed?'role.frontend-agent':'role.frontend-engineer',
     primary_skill:'yss-frontend-scaffold-generator',supporting_skills:[],tdd_mode:'behavior-tdd',project_root:owner.project,
     allowed_write_paths:['src/frontend'],verification_refs:['frontend'],acceptance_refs:['AC-001']});
    const compiled=nativeReaders.compiler.compileDefaultImplementationContract({root,recipeIds:[...(backendRequired?contract.resolution.recipe_ids:[]),'frontend.vue3-scaffold'],
     slice_id:contract.slice_id,checkpoint_ref:checkpointRef,architecture_identity:owner.identity,architecture_evidence:owner.bindings,technical_design:owner.technical_design});
    if(compiled.frontend_delivery)throw Error('Local approved assets must not manufacture a frontend acceptance receipt');
    for(const key of ['required_capabilities','required_skills','recipe_ids','registry_digest','compiler_contract_digest','component_bindings','component_bindings_digest'])if(compiled[key]!==undefined)contract.resolution[key]=compiled[key];
   }});
  const file=ref=>({ref,digest:hash(fs.readFileSync(path.join(f.root,ref)))});
  const modules={spec:await load(f.root,'scripts/lib/spec-baseline.mjs'),controls:await load(f.root,'scripts/lib/lifecycle-controls.mjs'),
   registry:await load(f.root,'scripts/lib/lifecycle-registry.mjs'),producer:await load(f.root,'scripts/lib/backend-delivery.mjs'),
   terminal:await load(f.root,'scripts/lib/backend-delivery-terminal.mjs')};
  const registry=modules.registry.loadRegistry(path.join(f.root,'.template-spec/process/lifecycle-registry.yaml'));
  const rolesDoc=read(path.join(f.root,'.template-spec/agents/digital-human-roles.yaml'));
  const sliceCP=read(path.join(f.root,f.binding.approval_ref)),sliceCheck=sliceCP.checks['check.design-reviewed'];
  sliceCheck.applicable=true;sliceCheck.evidence={'evidence.design-review-result':[sliceCheck.approval_ref],'evidence.contract-approval':[sliceCheck.approval_ref],'evidence.approval-record':[sliceCheck.approval_ref]};
  sliceCheck.basis.push({ref:sliceCheck.subject_ref,digest:file(sliceCheck.subject_ref).digest.slice(7)},{ref:sliceCheck.approval_ref,digest:file(sliceCheck.approval_ref).digest.slice(7)});
  Object.assign(sliceCP.gates['gate.slice-contract-approved'],{basis:sliceCheck.basis,evidence:{'evidence.contract-approval':[sliceCheck.approval_ref]}});
  f.write(f.binding.approval_ref,sliceCP);
  Object.assign(checkpoint.checks,sliceCP.checks);Object.assign(checkpoint.gates,sliceCP.gates);
  checkpoint.human_review.implementation=sliceCP.human_review.implementation;
  checkpoint.human_review.user_decisions.push(...sliceCP.human_review.user_decisions);
  const {sliceImplementationStage}=await load(f.root,'scripts/lib/slice-task-package.mjs');
  Object.assign(checkpoint,{stage:sliceImplementationStage(f.root),next_work_unit:'work-unit.slice-implementation'});
  checkpoint.artifacts['artifact.slice-implementation-contract']={ref:f.binding.ref,digest:f.binding.digest,status:'approved',evidence_refs:[f.binding.approval_ref]};
  f.write(checkpointRef,checkpoint);
  specProof=modules.spec.inspectSpecBaselineSource(f.root,checkpointRef,undefined,{localFrontend:!!nativeFrontendSeed});
  modules.controls.assertGateChecks('gate.product-design-approved',checkpoint,{root:f.root,registry,rolesDoc});
  modules.controls.assertGateChecks('gate.slice-contract-approved',checkpoint,{root:f.root,registry,rolesDoc});
  const api=backendRequired?attachArtifactApproval(f.root,'api.yaml','api.local-implementation','gate.engineering-contract-approved'):null;
  f.write('local-data.md','Synthetic data preparation.');f.write('local-deployment.log','Synthetic contract/deployment observation, not real service execution.');
  const delivery={schema_version:1,delivery_mode:'local-evidence',delivery_id:'backend-delivery.local-implementation',version:'v1',status:'verified',
   scope:{slice_id:f.contract.slice_id,source_ids:['FR-001','AC-001'],operation_ids:['submitSupplier']},openapi:api?.binding,slice_contract:f.binding,
   build:{source_commit:f.git('rev-parse','HEAD'),artifact_digest:`sha256:${'b'.repeat(64)}`},
   environment:{id:'synthetic-local',base_url:'http://127.0.0.1:1',deployment_id:'synthetic-local-v1',revision_path:'/version',
    revision_pointers:{deployment_id:'/deployment_id',source_commit:'/source_commit',openapi_digest:'/openapi_digest',artifact_digest:'/artifact_digest',test_data_digest:'/test_data_digest'},test_data:file('local-data.md')},
   verification:{},supporting_files:api?.supportingFiles};
  let result=null;
  if(backendRequired){
  for(const [key,kind]of [['contract','backend-contract'],['deployment','backend-deployment']]){
   f.write(`local-${key}.json`,{schema_version:1,kind,subject_digest:modules.producer.backendDeliveryBasis(delivery),
    results:[{command:'synthetic-current-local-verification',executed_at:new Date().toISOString(),exit_code:0,evidence:[file('local-deployment.log')]}],
    operation_ids:delivery.scope.operation_ids,coverage:['AC-001'].flatMap(source_id=>['success','failure'].map(outcome=>({source_id,outcome})))});
   delivery.verification[key]=file(`local-${key}.json`);
  }
  f.write('local-delivery.json',delivery);
  f.state.review_input.work_unit_id='work-unit.slice-backend';f.refreshCoverage();f.save();f.write('local-review-state.json',f.state);
  result=await modules.terminal.completeBackendDelivery(f.root,{delivery_mode:'local-evidence',checkpoint_ref:checkpointRef,
   delivery:file('local-delivery.json'),review_state:file('local-review-state.json'),
   downstream:{owner:'synthetic-local-spec',ticket_ref:'synthetic-frontend-followup',verification_plan:'synthetic independent frontend and business validation',target_version:'v1'}},{checkpointRef});
  }
  const frontendPlanRef='frontend/implementation-plan.json',frontendVerificationRef='frontend/implementation-verification.json';
  const visual=spec.strategic.handoff.source.visual_baseline_ref,visual_baseline={baseline_id:visual.baseline_id,version:visual.version,digest:visual.digest,
   manifest_ref:`${visual.persisted_ref}/${visual.manifest_ref}`,status:'approved',case_ids:visual.case_ids};
  const base={schema_version:2,template:false,status:'approved',prototype_ref:'preview/index.html',spec_ref:'source/spec.md',slice_id:f.contract.slice_id,slice_contract_ref:f.binding.ref,visual_baseline,
   route_and_page_inventory:[{route:'/supplier',page:'SupplierPage',case_ids:visual.case_ids}],pnpm_commands:['pnpm test']};
  const plan={...base,kind:'plan',baseline_case_ids:visual.case_ids,desktop_viewport:'1440x900',narrow_viewport:'390x844',state_cases:['normal']};
  f.write(frontendPlanRef,plan);
  f.write('frontend/pnpm.log','Synthetic pnpm test observation, not browser execution.');f.write('frontend/console.json','[]');f.write('frontend/review.md','Synthetic independent frontend review.');
  const verification={...base,kind:'verification',implementation_plan:file(frontendPlanRef),console_warning_check:'pass',console_evidence:file('frontend/console.json'),
   actual_verification:[{command:'pnpm test',exit_code:0,executed_at:new Date().toISOString(),evidence_ref:'frontend/pnpm.log',evidence_digest:file('frontend/pnpm.log').digest}],
   uncovered_differences:[],difference_owner:null,independent_review:{reviewer:'synthetic.frontend-reviewer',candidate_digest:hash(f.git('rev-parse','HEAD^{tree}')),status:'approved',findings_ref:'frontend/review.md'},
   case_results:[],interaction_results:[]};
  for(const id of visual.case_ids){
   const baseline_image_ref=`${visual.persisted_ref}/images/${id}.png`,image=`frontend/${id}.png`,diff=`frontend/${id}-diff.png`;
   fs.mkdirSync(path.dirname(path.join(f.root,image)),{recursive:true});fs.copyFileSync(path.join(f.root,baseline_image_ref),path.join(f.root,image));fs.copyFileSync(path.join(f.root,baseline_image_ref),path.join(f.root,diff));
   f.write(`frontend/${id}-interaction.json`,{synthetic_fixture:true,state:'normal',result:'pass'});
   const interaction=file(`frontend/${id}-interaction.json`);
   verification.case_results.push({case_id:id,baseline_image_ref,implementation_image_ref:image,implementation_image_digest:file(image).digest,diff_ref:diff,diff_digest:file(diff).digest,
    mask_ref:'not-applicable',result:'pass',uncovered_difference:false,explanation:'Synthetic identical baseline image protocol, not visual certification.'});
   verification.interaction_results.push({case_id:id,state:'normal',result:'pass',evidence_ref:interaction.ref,evidence_digest:interaction.digest});
  }
  f.write(frontendVerificationRef,verification);
  checkpoint.artifacts['artifact.frontend-implementation-plan']={ref:frontendPlanRef,status:'approved',evidence_refs:[frontendPlanRef]};
  checkpoint.artifacts['artifact.frontend-implementation-verification']={ref:frontendVerificationRef,status:'ready-for-human',evidence_refs:[frontendVerificationRef]};
  f.write(checkpointRef,checkpoint);
  specProof=modules.spec.inspectSpecBaselineSource(f.root,checkpointRef,undefined,{localFrontend:!!nativeFrontendSeed});
  for(const [ref,saved]of preserved)if(!fs.readFileSync(path.join(nativeSeed,ref)).equals(saved.bytes)||fs.statSync(path.join(nativeSeed,ref)).mode!==saved.mode)throw Error('native Spec seed authority mutated: '+ref);
  const finalSeed=nativeFrontendSeed||nativeSeed;
  for(const original of protectedRefs) {
    const ref=nativeFrontendSeed&&original.startsWith('.agents/skills/yss-product-lifecycle/')?original.replace('yss-product-lifecycle','harness-orchestrator'):original;
    if(!fs.readFileSync(path.join(f.root,ref)).equals(fs.readFileSync(path.join(finalSeed,ref))))throw Error('native receiver authority mutated: '+ref);
  }
  return {...f,checkpoint,checkpointRef,sliceRef:f.binding.ref,sliceID:f.contract.slice_id,specRef:'source/spec.md',specProof,
   backendTerminalRef:result?.terminal_ref||null,frontendPlanRef,frontendVerificationRef,frontendWorkUnitId:'work-unit.slice-frontend',taskBinding:f.binding,
   sourceSeed:nativeSeed,backendRequired,synthetic_fixture:true,result};
 }catch(error){if(f)f.cleanup();throw error;}finally{fs.rmSync(scratch,{recursive:true,force:true});}
}
