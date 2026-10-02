// Real registration shape and temporary Git repositories; approvals remain synthetic.
import fs from 'node:fs';
import path from 'node:path';
import {pilotFixture} from './pilot-fixture.mjs';
import {hash,digest,read} from '../../lib/strategic-handoff-io.mjs';
import {technicalDigest} from '../../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs';
import {buildDecisionFixture} from '../user-decision/build-fixture.mjs';
import {prepareSliceImplementationContract} from '../../lib/slice-contract-preparation.mjs';
export function crossRepoFixture() {
 const f=pilotFixture();try {
  const rawBinding=b=>({ref:b.ref,digest:b.digest.replace(/^sha256:/,'')});
  const decide=(directory,boundary,scope,subject)=>{
    const d=buildDecisionFixture(path.join(f.root,directory),{boundary,scope,subjectRef:path.join(f.root,subject.ref)});
    d.record.request.items[0].subject.ref=subject.ref;d.present();d.record.responses=[];d.respond();d.save();return d;
  };
  const peer=path.join(f.root,'peer');fs.cpSync(f.project,peer,{recursive:true});
  const identity={...f.identity,repository_id:'synthetic-peer',project_id:'synthetic-peer'};
  const manifest={...structuredClone(f.manifest),repository_id:identity.repository_id,project_id:identity.project_id,architecture_identity:identity};
  const baseline={...structuredClone(f.baseline),id:'engineering.peer',repository_id:identity.repository_id,project_id:identity.project_id,architecture_identity:identity};delete baseline.boundary_review;
  const architectureEvidence=f.write('peer-architecture-review.log','Synthetic current peer boundary comparison; never a real approval.');
  const architectureScope=[baseline.id,...baseline.boundary_scope],architectureDrafter=baseline.author;
  const evidenceBasis=[rawBinding(architectureEvidence)];
  // Embed only the independently selected locator and external evidence in the
  // raw asset. Freeze its final bytes in the separate packet to avoid a cycle.
  manifest.approval_context={subject_ref:'peer-architecture-review-package.json',approval_scope:architectureScope,basis:evidenceBasis,drafter_principal_ref:architectureDrafter};
  const mb=f.write('peer-manifest.json',manifest),architectureBasis=[...evidenceBasis,rawBinding(mb)];
  const architectureSubject=f.write('peer-architecture-review-package.json',{gate_id:f.review.gate_id,approval_scope:architectureScope,basis:architectureBasis,drafter_principal_ref:architectureDrafter});
  const review={...structuredClone(f.review),subject_ref:architectureSubject.ref,subject_digest:architectureSubject.digest.slice(7),approval_scope:architectureScope,basis:architectureBasis,drafter_principal_ref:architectureDrafter,evidence_refs:[architectureEvidence.ref],artifact_bindings:[{id:baseline.id,version:baseline.version,digest:digest(baseline)}]};
  baseline.boundary_review=f.write('peer-review.json',review);
  const bb=f.write('peer-baseline.json',baseline);
  const registration={...structuredClone(f.registration),repository_id:identity.repository_id,project_id:identity.project_id,architecture_identity:identity,local_worktree:peer,architecture_evidence:{engineering_baseline:bb,manifest:mb}};
  const rb=f.write('peer-registration.json',registration);
  const design=structuredClone(f.design);design.technical_design_id='technical-design.peer';design.architecture.project_id=identity.project_id;design.architecture.decision_digest=rb.digest;design.architecture.decision_ref=rb.ref;
  // The design observation uses the same public behavior but binds the peer registration.
  for(const item of design.inputs)if(item.ref==='registration.json'){item.ref=rb.ref;item.digest=rb.digest;}
  design.digest=technicalDigest(design);
  const td={...f.write('peer-design.json',design),version:design.version};
  const proof=read(path.join(f.root,f.technical_design.approval_ref));
  const technicalEvidence=f.write('peer-technical-review.log','Synthetic current peer Technical Design comparison; never a real approval.');
  const technicalScope=[f.contract.slice_id],technicalDrafter='synthetic-peer-design-drafter',technicalBasis=[rawBinding(td),rawBinding(rb),rawBinding(technicalEvidence)];
  const technicalSubject=f.write('peer-technical-review-package.json',{gate_id:proof.gate_id,approval_scope:technicalScope,basis:technicalBasis,drafter_principal_ref:technicalDrafter});
  td.approval_context={subject_ref:technicalSubject.ref,subject_digest:technicalSubject.digest.slice(7),approval_scope:technicalScope,basis:technicalBasis,drafter_principal_ref:technicalDrafter};
  const decision=decide('peer-design-decision',proof.gate_id,technicalScope,technicalSubject);
  td.approval_ref=f.write('peer-design-approval.json',{...proof,subject_ref:technicalSubject.ref,subject_digest:technicalSubject.digest.slice(7),approval_scope:technicalScope,basis:technicalBasis,drafter_principal_ref:technicalDrafter,evidence_refs:[technicalEvidence.ref],user_decision_ref:decision.ref,artifact_bindings:[{id:design.technical_design_id,version:td.version,digest:td.digest}]}).ref;
  const rows=[[f.project,f.registration,f.bindings.repository_registration,f.technical_design],[peer,registration,rb,td]].map(([project_root,r,b,t],index)=>{
    const prefix=`cross-${index}`;
    const assessment=f.write(`${prefix}-impact.json`,{schema_version:1,backend:true,data:false,api:false,project_id:r.project_id});
    const decisions=Object.fromEntries(['data-architecture','api-contract'].map(kind=>{
      const value={schema_version:1,kind:`${kind}-decision`,decision_id:`${kind}.${r.project_id}`,decision_version:'v1',status:'approved',current_version:true,impact:'not-applicable',assessment_ref:assessment.ref,assessment_digest:assessment.digest,evidence_refs:['review.md'],reason:'Synthetic cross-repository internal behavior only; no data or API changes'};
      return [kind,{...f.write(`${prefix}-${kind}.json`,value),version:'v1',impact:'not-applicable',id:value.decision_id}];
    }));
    const strip=({ref,version,digest,impact})=>({ref,version,digest,...(impact?{impact}:{})});
    const prerequisites={technical_design:strip(t),data_architecture_decision:strip(decisions['data-architecture']),api_contract_decision:strip(decisions['api-contract'])};
    const scope=[r.project_id];
    const evidence=f.write(`${prefix}-engineering-review.log`,'Synthetic current project engineering comparison; never a real approval.');
    const drafter=`synthetic-${prefix}-engineering-drafter`,basis=[rawBinding(t),rawBinding(assessment),...Object.values(decisions).map(rawBinding),rawBinding(evidence)];
    const pkg=f.write(`${prefix}-package.json`,{schema_version:1,kind:'engineering-contract-package',project_id:r.project_id,gate_id:'gate.engineering-contract-approved',approval_scope:scope,basis,drafter_principal_ref:drafter,...prerequisites});
    prerequisites.technical_design.approval_context={subject_ref:pkg.ref,subject_digest:pkg.digest.slice(7),approval_scope:scope,basis,drafter_principal_ref:drafter};
    const response=decide(`${prefix}-decision`,'gate.engineering-contract-approved',scope,pkg);
    const approval={...proof,gate_id:'gate.engineering-contract-approved',subject_ref:pkg.ref,subject_digest:pkg.digest.slice(7),approval_scope:scope,basis,drafter_principal_ref:drafter,evidence_refs:[evidence.ref],user_decision_ref:response.ref,artifact_bindings:[{id:read(path.join(f.root,t.ref)).technical_design_id,version:t.version,digest:t.digest},...Object.values(decisions).map(d=>({id:d.id,version:d.version,digest:d.digest}))]};
    prerequisites.engineering_contract_approval_ref=f.write(`${prefix}-approval.json`,approval).ref;
    const onboarding=f.write(`${prefix}-onboarding.json`,{status:'completed',repository_ref:b.ref});
    return {project_id:r.project_id,delivery_role:'backend',status:'existing-and-onboarded',repository_ref:b.ref,project_root,repository_scope:'external-repository',onboarding_result:{status:'completed',ref:onboarding.ref},architecture_family:'layered-mvc',design_prerequisites:prerequisites};
  });
  rows.push({project_id:'no-frontend',delivery_role:'frontend',status:'not-applicable',reason:'No frontend changes'});
  const prep=f.write('repository-preparation.json',{schema_version:2,kind:'implementation-repository-preparation-result',result:'completed',current_version:true,projects:rows,evidence_refs:['review.md']});
  const sources={...f.sources,peer_registration:rb,peer_baseline:bb,peer_manifest:mb,peer_design:td,repository_preparation:prep};
  const refinements=structuredClone(f.refinements);
  delete sources.openapi_freeze;sources.no_api_impact_record=f.write('no-api.md','No external API changes in this cross-repository mechanism fixture.');
  refinements.scope.impacted_areas=['backend'];refinements.applicability.api={status:'not-applicable',reason:'No API changes'};delete refinements.extensions.api;refinements.recipe_ids=['backend.mvc-service-behavior'];
  refinements.work_units[0].primary_skill='yss-application';refinements.work_units[0].supporting_skills=[];
  refinements.scope.project_roots=[f.project,peer];refinements.scope.impacted_areas.push('cross-repo');
  refinements.applicability.cross_repo={status:'required'};
  refinements.extensions.cross_repo={repository_bindings:{[f.project]:{implementation_repository:'implementation_repository',engineering_baseline:'engineering_baseline',manifest:'manifest',technical_design:'technical_design'},[peer]:{implementation_repository:'peer_registration',engineering_baseline:'peer_baseline',manifest:'peer_manifest',technical_design:'peer_design'}},delivery_order:[f.project,peer],rollback_order:[peer,f.project],integration_verification:['joint']};
  refinements.verification.peer={...structuredClone(refinements.verification.test),cwd:peer};
  refinements.verification.joint={command:'node integration.mjs',cwd:f.project,dependency_roots:[peer],expected_evidence:['results/joint.log'],test_seams:['test-seam.cross-repo'],acceptance_refs:['AC-1']};
  refinements.work_units[0].project_root=f.project;refinements.work_units[0].verification_refs.push('joint');
  refinements.work_units.push({...structuredClone(refinements.work_units[0]),id:'work-unit.peer',project_root:peer,verification_refs:['peer']});
  const result=prepareSliceImplementationContract({root:f.root,ticket_ref:f.ticket,sources,refinements});
  if(result.report.blockers.length)throw new Error(JSON.stringify(result.report.blockers));
  for(const key of Object.keys(f.contract))delete f.contract[key];Object.assign(f.contract,result.slice_contract);
  return {...f,peer,sources,refinements,prepared:result};
 }catch(error){f.cleanup();throw error;}
}
