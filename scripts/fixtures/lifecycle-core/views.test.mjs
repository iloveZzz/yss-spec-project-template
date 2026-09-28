import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {viewContract} from '../../lib/contract-views.mjs';
import {lifecycleStatus} from '../../lib/lifecycle-status.mjs';
import {stringify} from '../../vendor/yaml.mjs';
test('focused task includes unit and universal acceptance, preserves constraints and offers full reference',()=>{
 const f=pilotFixture();try{
  f.contract.acceptance['AC-2']=structuredClone(f.contract.acceptance['AC-1']);f.contract.acceptance['AC-3']=structuredClone(f.contract.acceptance['AC-1']);
  f.contract.verification.other={...structuredClone(f.contract.verification.test),acceptance_refs:['AC-2']};
  f.contract.verification.global={...structuredClone(f.contract.verification.test),acceptance_refs:['AC-3'],required_for_all:true};
  f.contract.work_units.push({...structuredClone(f.contract.work_units[0]),id:'work-unit.other',acceptance_refs:['AC-2','AC-3'],verification_refs:['other']});
  f.write('view.yaml',stringify({slice_contract:f.contract}));
  const options={root:f.root,kind:'slice',profile:'task',unit_id:'work-unit.slice-backend'};
  const legacy=viewContract('view.yaml',options),focused=viewContract('view.yaml',{...options,task_layout:'focused'});
  assert.deepEqual(Object.keys(legacy.content.验收),['AC-1','AC-2','AC-3']);
  assert.deepEqual(Object.keys(focused.content.验收),['AC-1','AC-3']);
  assert.deepEqual(focused.content.完整验收引用.omitted_acceptance_ids,['AC-2']);
  assert.deepEqual(focused.content.全局约束.forbidden_patterns,legacy.content.全局约束.forbidden_patterns);
  assert.deepEqual(focused.binding,legacy.binding);assert.equal(focused.execution_allowed,false);
  assert.match(focused.markdown,/mvnw test/);assert.match(focused.markdown,/重复派发/);
  assert.deepEqual(Object.keys(viewContract('view.yaml',{root:f.root,kind:'slice'}).content.验收),['AC-1','AC-2','AC-3']);
 }finally{f.cleanup();}
});
test('recovery view binds task and contract, refuses unknown or mismatched task and remains readonly',()=>{
 const f=pilotFixture();try{
  f.write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml','utf8'));
  f.write('slice.yaml',stringify({slice_contract:f.contract}));
  f.write('lifecycle.json',{schema_version:1,repository_mode:'project-instance',stage:'stage.vertical-slice-implementation',next_work_unit:'work-unit.slice-implementation',status:'running',blockers:[]});
  const task={work_unit_id:'work-unit.slice-backend',workflow_status:'active',convergence:{parent_work_unit:'work-unit.slice-implementation'},contract:{kind:'slice-implementation',slice_contract_ref:'slice.yaml',contract_id:f.contract.contract_id,contract_version:f.contract.contract_version},verification_results:[]};
  f.write('task.json',task);
  const options={root:f.root,checkpointRef:'lifecycle.json',taskPackageRef:'task.json'};
  const before=fs.readFileSync(f.root+'/task.json'),view=lifecycleStatus(options);
  assert.equal(view.next_step.action_type,'inspect');assert.match(view.next_action,/不得重复派发/);
  assert.deepEqual(view.recovery.contract_view.command.slice(-2),['--unit',task.work_unit_id]);assert.ok(view.source_digests.task.digest);
  assert.equal(view.recovery.verification_items[0].id,'test');assert.equal(view.recovery.verification_items[0].status,'not-checked');
  assert.ok(view.recovery.prechecks.some(x=>x.command.includes('scripts/slice-contract')));
  assert.equal(view.execution_authorization,'not-evaluated');assert.deepEqual(fs.readFileSync(f.root+'/task.json'),before);
  task.workflow_status='unknown';f.write('task.json',task);assert.equal(lifecycleStatus(options).next_step.action_type,'repair');
  task.workflow_status='resolved';task.contract.contract_version='other';f.write('task.json',task);assert.equal(lifecycleStatus(options).next_step.action_type,'repair');
 }finally{f.cleanup();}
});
