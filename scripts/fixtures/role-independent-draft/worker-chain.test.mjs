// Synthetic business sources exercise real Git, execution, approval and native consumer bindings.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {installedFixture,hash} from './installed-fixture.mjs';
import {fixture as existingFixture} from '../existing-backend/fixture.mjs';
import {verifyExistingArchitecture,existingArchitectureDigest} from '../../lib/existing-backend-architecture.mjs';
import {loadSkillRegistry} from '../../lib/skill-registry.mjs';
import {parseContextContract,resolveContextTermRefs} from '../../lib/context-contract.mjs';

test('installed Backend consumes a role-free current engineering source',()=>{
 const f=installedFixture('backend'),e=existingFixture(),{root,write,read,asset,run}=f;
 try {
  for(const ref of ['.template-spec/engineering/backend-platforms.json','docs/engineering/evidence'])fs.cpSync(path.join(e.root,ref),path.join(root,ref),{recursive:true});
  const feature='feature.engineering',cpRef='.work/engineering/checkpoint.json';
  const baseline=structuredClone(e.baseline);delete baseline.author;delete baseline.boundary_review;
  write('input.json',{feature_id:feature,scope:{impacted_areas:['wording']},status:'draft'});
  const context=parseContextContract({root});
  write('reconciliation.json',{schema_version:1,repository_mode:'project-instance',stage:'stage.slice-contract',work_unit:'work-unit.slice-contract',status:'reconciled',context_snapshot:{context_ref:context.context_ref,context_schema_version:context.context_schema_version,document_digest:context.document_digest,referenced_terms_digest:resolveContextTermRefs(context,[]).referenced_terms_digest,term_refs:[]},changes:{added:[],updated:[],deprecated:[]},unresolved_terms:[],evidence_refs:['CONTEXT.md']});
  write('engineering-drafts/baseline.json',baseline);
  const cp={feature_id:feature,repository_mode:'project-instance',checks:{},gates:{}};write(cpRef,cp);
  const prep=f.draftTask({taskRef:'architecture-prepare.json',unit:'work-unit.technical-design',stage:'stage.technical-design',checkpointRef:cpRef,featureId:feature,paths:['engineering-drafts'],outputs:['engineering-drafts/baseline.json']});
  f.finishTask(prep);run('actual-engineering-preparation',['contract','verify','--kind','task','--file',prep.provenance.task_ref]);
  const manifest={...e.manifest,approval_context:{subject_ref:'engineering-drafts/baseline.json',approval_scope:[feature],basis:[asset('input.json'),asset(prep.provenance.task_ref)]}};write('manifest.json',manifest);
  const review=f.draftTask({taskRef:'architecture-review-task.json',unit:'work-unit.slice-contract',stage:'stage.slice-contract',checkpointRef:cpRef,featureId:feature,inputs:['input.json',prep.provenance.task_ref,'manifest.json'],paths:['architecture-reports'],outputs:['architecture-reports/result.json']});
  review.execution_state='Reviewer';review.review_context={candidate:asset('engineering-drafts/baseline.json'),policy:review.policy,check_ids:review.skill_source.check_ids,approval_scope:[feature],basis:review.input_bindings,review:{mode:'self-check',provenance:review.provenance}};
  write('architecture-reports/result.json',{status:'passed',scope:feature,subject:asset('engineering-drafts/baseline.json')});
  f.finishTask(review,{scope:[feature],candidate:review.review_context.candidate});
  run('actual-engineering-self-check',['contract','verify','--kind','task','--file',review.provenance.task_ref]);
  const proof={schema_version:3,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'agent',subject_ref:'engineering-drafts/baseline.json',subject_digest:asset('engineering-drafts/baseline.json').digest,approval_scope:[feature],basis:review.input_bindings,evidence_refs:[review.provenance.execution_ref],review_task_ref:review.provenance.task_ref,review_task_digest:asset(review.provenance.task_ref).digest,check_ids:review.review_context.check_ids,policy:review.policy,review:review.review_context.review};
  write('architecture-review.json',proof);
  cp.checks['check.design-reviewed']={status:'approved',subject_ref:proof.subject_ref,subject_digest:proof.subject_digest,approval_scope:proof.approval_scope,basis:proof.basis,approval_ref:'architecture-review.json'};write(cpRef,cp);
  baseline.boundary_review={...asset('architecture-review.json'),digest:'sha256:'+asset('architecture-review.json').digest};write('baseline.json',baseline);
  const bound=ref=>({...asset(ref),digest:'sha256:'+asset(ref).digest});
  const registration={...e.registration,local_worktree:fs.realpathSync(e.project),architecture_evidence:{engineering_baseline:bound('baseline.json'),manifest:bound('manifest.json')}};write('registration.json',registration);
  const bindings={...registration.architecture_evidence,repository_registration:bound('registration.json')};
  write('architecture-input.json',{architecture_identity:e.identity,architecture_evidence:bindings});
  run('native-role-free-engineering-source',['contract','verify','--kind','architecture-evidence','--file','architecture-input.json']);
  assert.equal(verifyExistingArchitecture(e.identity,bindings,{root,registry:loadSkillRegistry(path.join(root,'.template-spec/agents/yss-skill-registry.yaml'))}).source_kind,'existing-registration');
  assert.equal(fs.existsSync(path.join(root,'.template-spec/agents/digital-human-roles.yaml')),false);
  // Continue with the same source below; no role fixture is transplanted into the installed root.
 } finally {e.cleanup();f.cleanup();}
});
