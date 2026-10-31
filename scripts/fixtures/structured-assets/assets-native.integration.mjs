import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {installedFixture} from '../role-independent-draft/installed-fixture.mjs';
import {planAssetWrite, applyAssetWrite} from '../../lib/asset-transactions.mjs';
import {parseAsset, TOOL_ROOT} from '../../lib/structured-assets.mjs';
import {stageContentFixture} from '../../lib/testing/stage-content-fixture.mjs';

test('current task candidate is verified at its real project and target before writing', () => {
 const f=installedFixture('backend');
 try {
  f.write('input.json',{scope:{impacted_areas:['wording']},status:'draft'});
  const ref='docs/task.json';
  const task=f.draftTask({taskRef:ref,unit:'work-unit.technical-design',stage:'stage.technical-design',inputs:['input.json'],paths:['drafts']});
  f.write(task.provenance.execution_ref,{phase:'dispatch',dispatched_at:new Date().toISOString(),tool:task.provenance.tool,task_ref:ref,identity:task.provenance.identity,candidate:f.asset('input.json'),input_bindings:task.input_bindings,baseline:task.baseline,scope:task.allowed_write_paths,expected_outputs:task.expected_outputs});
  const spec={ref,kind:'task-package',value:task};
  const plan=planAssetWrite(f.root,[spec],{schemaRoot:f.root});
  assert.equal(fs.existsSync(path.join(f.root,ref)),false);
  const invalid=structuredClone(task);invalid.provenance.task_ref='docs/other.json';
  assert.throws(()=>planAssetWrite(f.root,[{...spec,value:invalid}],{schemaRoot:f.root}),/TASK_ORIGIN/);
  assert.equal(fs.existsSync(path.join(f.root,ref)),false);
  const input=f.read('input.json');f.write('input.json',{changed:true});
  assert.throws(()=>applyAssetWrite(f.root,plan),/VALIDATION_INPUT_CHANGED|DRIFT/);
  assert.equal(fs.existsSync(path.join(f.root,ref)),false);f.write('input.json',input);
  assert.equal(applyAssetWrite(f.root,plan).status,'applied');
  assert.equal(JSON.parse(f.read(ref)).provenance.task_ref,ref);
 } finally { f.cleanup(); }
});

test('domain and stage drafts use actual project dependencies', () => {
 const f=installedFixture('backend');
 try {
  const skill='.agents/skills/yss-stage-decision/scripts';
  for (const name of ['validate-domain-strategy.mjs','validate-stage-decision-package.mjs']) fs.copyFileSync(path.join(TOOL_ROOT,skill,name),path.join(f.root,skill,name));
  const [strategy,stage]=stageContentFixture(f);
  const first={ref:'docs/strategy.json',kind:'domain-strategy',value:strategy};
  const second={ref:'docs/stage.json',kind:'stage-decision-package',value:stage};
  const firstPlan=planAssetWrite(f.root,[first],{schemaRoot:f.root});
  assert.equal(applyAssetWrite(f.root,firstPlan).status,'applied');
  const secondPlan=planAssetWrite(f.root,[second],{schemaRoot:f.root});
  const invalid=structuredClone(stage);invalid.domain_strategy_ref.digest='sha256:'+'0'.repeat(64);
  assert.throws(()=>planAssetWrite(f.root,[{...second,value:invalid}],{schemaRoot:f.root}),/digest/);
  const domain=f.read('domain.json');f.write('domain.json',{changed:true});
  assert.throws(()=>applyAssetWrite(f.root,secondPlan),/VALIDATION_INPUT_CHANGED|DRIFT/);
  assert.equal(fs.existsSync(path.join(f.root,second.ref)),false);f.write('domain.json',domain);
  assert.equal(applyAssetWrite(f.root,secondPlan).status,'applied');
 } finally {f.cleanup();}
});

test('current self-check approval uses current checkpoint binding', () => {
 const f=installedFixture('backend');
 try {
  f.write('input.json',{scope:{impacted_areas:['wording']},status:'draft'});
  f.write('drafts/design.json',{title:'synthetic design',approval_scope:['drafts'],basis:[f.asset('input.json')]});
  f.write('reconciliation.json',{status:'reconciled'});
  const draft=f.draftTask({taskRef:'draft-task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',inputs:['input.json'],outputs:['drafts/design.json'],paths:['drafts']});
  f.finishTask(draft);
  const candidate=f.asset('drafts/design.json');
  const review=f.draftTask({taskRef:'review-task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',inputs:['input.json','draft-task.json'],outputs:['reviews/result.json'],paths:['reviews']});
  review.execution_state='Reviewer';
  review.review_context={candidate,policy:review.policy,check_ids:review.skill_source.check_ids,approval_scope:['drafts'],basis:[f.asset('draft-task.json'),f.asset('input.json')],review:{mode:'self-check',provenance:review.provenance}};
  f.write('reviews/result.json',{result:'passed',synthetic:true});
  f.finishTask(review,{candidate,scope:['drafts']});
  const value={schema_version:3,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'agent',subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:review.review_context.basis,evidence_refs:[review.provenance.execution_ref],review_task_ref:'review-task.json',review_task_digest:f.asset('review-task.json').digest,check_ids:review.skill_source.check_ids,policy:review.policy,review:review.review_context.review};
  const ref='docs/approval.json';
  const checkpoint=parseAsset(f.read('.template-spec/process/templates/lifecycle-checkpoint-template.yaml'));
  checkpoint.checks={[value.gate_id]:{status:'approved',approval_ref:ref,subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:value.basis}};
  f.write('.work/engineering/checkpoint.json',checkpoint);
  const spec={ref,kind:'approval-record',value};
  const plan=planAssetWrite(f.root,[spec],{schemaRoot:f.root});
  const invalid=structuredClone(value);invalid.subject_digest='0'.repeat(64);
  assert.throws(()=>planAssetWrite(f.root,[{...spec,value:invalid}],{schemaRoot:f.root}),/EVIDENCE_BINDING|APPROVAL_CURRENT_INVALID/);
  assert.equal(fs.existsSync(path.join(f.root,ref)),false);
  assert.equal(applyAssetWrite(f.root,plan).status,'applied');
  assert.throws(()=>planAssetWrite(f.root,[spec],{schemaRoot:f.root}),/IMMUTABLE_APPROVAL/);
 } finally {f.cleanup();}
});
