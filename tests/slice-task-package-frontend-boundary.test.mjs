import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {terminalReviewFixture} from '../scripts/fixtures/backend-standards/terminal-fixture.mjs';
import {compileSliceTaskPackage,assertSliceV3TaskPackage} from '../scripts/lib/slice-task-package.mjs';
import {parseSliceYaml,readSliceContract} from '../scripts/lib/slice-contract.mjs';
import {taskPackageDefaults} from '../scripts/lib/digital-human-roles.mjs';

test('直接Slice前端派发与复核均消费真实共享输入边界，换Drafter不能绕过生产准入',t=>{
  const f=terminalReviewFixture({refineContract:contract=>{
    // Synthetic approval protocol with a declared frontend work unit. It has
    // no accepted frontend inputs and cannot authorize implementation.
    contract.applicability.frontend={status:'required'};
    for(const key of ['requirement_freeze','low_fidelity_review','prototype_review','prototype_profile_decision','prototype_deliverable','prototype_deliverable_verification','prototype_confirmation','visual_baseline','state_matrix'])contract.basis[key]='spec';
    contract.extensions.frontend={visual_baseline_case_ids:['case.synthetic'],component_test_seams:['validate'],e2e_paths:['submit']};
    contract.resolution.required_skills.push('yss-ui');
    Object.assign(contract.work_units[0],{role_id:'role.frontend-engineer',primary_skill:'yss-ui',supporting_skills:[]});
  }});t.after(f.cleanup);
  const options={root:f.root,work_unit_id:'work-unit.slice-backend',task_id:'task.frontend-direct',actor_id:'synthetic.frontend',runtime_id:'runtime.generic'};
  assert.throws(()=>compileSliceTaskPackage(f.binding,options),/frontend-delivery-required/);
  assert.throws(()=>compileSliceTaskPackage(f.binding,{...options,execution_state:'Drafter'}),/frontend-delivery-required/);
  const contract=readSliceContract(f.binding.ref,{root:f.root}).contract;
  const unit=contract.work_units[0],defaults=taskPackageDefaults(unit.role_id,parseSliceYaml(fs.readFileSync(path.join(f.root,'.template-spec/agents/digital-human-roles.yaml'))));
  const review={role_id:unit.role_id,runtime_id:options.runtime_id,stage_id:'stage.vertical-slice-implementation',work_unit_id:unit.id,
    skill_source:{core_skills:defaults.core_skills,forbidden_skills:defaults.forbidden_skills},
    contract:{slice_contract_ref:f.binding.ref,contract_id:contract.contract_id,contract_version:contract.contract_version,gate_refs:[f.binding.approval_ref]},
    allowed_write_paths:unit.allowed_write_paths,verification_commands:unit.work_unit.verification_commands,
    expected_evidence_files:unit.work_unit.expected_evidence,forbidden_actions:unit.work_unit.forbidden_patterns,
    execution_state:'Reviewer'};
  assert.equal(assertSliceV3TaskPackage(review,contract,{root:f.root}),review);
  for(const execution_state of ['Worker','Drafter'])assert.throws(()=>assertSliceV3TaskPackage({...review,execution_state},contract,{root:f.root}),/frontend-delivery-required/);
  f.write('dispatch-input.json',{binding:f.binding,...options});
  const result=spawnSync(process.execPath,[new URL('../scripts/dispatch-slice-task',import.meta.url).pathname,'--root',f.root,'--input',path.join(f.root,'dispatch-input.json')],{encoding:'utf8'});
  assert.equal(result.status,1,result.stderr||result.stdout);
  assert.match(result.stderr,/frontend-delivery-required/);
  assert.equal(fs.existsSync(path.join(f.root,'frontend-acceptance.json')),false);
});
