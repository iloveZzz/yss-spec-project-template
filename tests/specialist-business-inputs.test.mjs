import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from '../scripts/vendor/yaml.mjs';
import {enforceHarnessTaskScope} from '../scripts/lib/harness-execution-scope.mjs';
import {businessAuthoringEnabled} from '../scripts/lib/business-tickets.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=(base,ref)=>parse(fs.readFileSync(path.join(base,ref),'utf8'));
test('专职 Profile 本地 Plan/Spec 与上游路线共享唯一日常政策，不扩另一端实现',()=>{
 const canonical=read(root,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'),policy=canonical.request_triage;
 for(const side of ['backend','frontend']) {
  const base=path.join(root,`submodules/yss-harness-${side}-agent`),profile=read(base,'.template-spec/process/harness-profile.yaml'),contract=read(base,'.agents/skills/harness-orchestrator/references/orchestration-contract.yaml'),registry=read(base,'.template-spec/process/lifecycle-registry.yaml');
  assert.deepEqual(contract.request_triage,policy);
  for(const key of ['phase_boundary','checkpoint_policy'])assert.deepEqual(contract[key],canonical[key]);
  const roles=read(base,'.template-spec/agents/digital-human-roles.yaml');
  assert.ok(roles.user_decision_policy.required_capabilities.includes('business-ticket-approval-v1'));
  for(const id of ['gate.plan-approved','gate.spec-baseline-approved'])assert.ok(roles.user_decision_policy.gates.includes(id));
  assert.deepEqual(profile.business_input.modes,['standalone','upstream']);
  assert.equal(profile.business_input.analysis_grants_opposite_side_write,false);
  for(const id of ['work-unit.plan-requirements','work-unit.domain-strategy-design','work-unit.spec-synthesis']) {assert.ok(profile.lifecycle.allowed_work_units.includes(id));assert.ok(registry.work_units.some(x=>x.id===id));assert.ok(contract.work_unit_routes[id]);}
  assert.equal(contract.progression_target.local_implementation_inputs,'native-profile-current-feature-approved-assets');
  assert.ok(!contract.entry.required.includes('approved-upstream-inputs'));
  assert.ok(!contract.entry.required.includes('verified-strategy-and-backend-delivery'));
  assert.ok(contract.work_unit_routes[side==='backend'?'work-unit.technical-design':'work-unit.frontend-engineering-design']);
 }
});
test('业务分析角色不能 Worker；专职角色不能写另一端',t=>{
 const temporary=fs.mkdtempSync('/tmp/yss-specialist-business-');t.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
 const base=path.join(root,'submodules/yss-harness-backend-agent');fs.mkdirSync(path.join(temporary,'.template-spec/process'),{recursive:true});fs.copyFileSync(path.join(base,'.template-spec/process/harness-profile.yaml'),path.join(temporary,'.template-spec/process/harness-profile.yaml'));fs.writeFileSync(path.join(temporary,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');
 assert.throws(()=>enforceHarnessTaskScope({role_id:'role.product-manager',execution_state:'Worker',work_unit_id:'work-unit.spec-synthesis',allowed_write_paths:['src/']},{root:temporary}),/分析角色不能/);
 assert.throws(()=>enforceHarnessTaskScope({role_id:'role.backend-agent',execution_state:'Worker',work_unit_id:'work-unit.slice-implementation',allowed_write_paths:['apps/frontend/']},{root:temporary}),/另一端/);
 fs.copyFileSync(path.join(root,'submodules/yss-harness-frontend-agent/.template-spec/process/harness-profile.yaml'),path.join(temporary,'.template-spec/process/harness-profile.yaml'));
 enforceHarnessTaskScope({role_id:'role.product-manager',execution_state:'Drafter',work_unit_id:'work-unit.prototype-design-v2',allowed_write_paths:['design/']},{root:temporary});
 assert.throws(()=>enforceHarnessTaskScope({role_id:'role.product-manager',execution_state:'Worker',work_unit_id:'work-unit.prototype-design-v2',allowed_write_paths:['apps/frontend/']},{root:temporary}),/分析角色不能/);
 enforceHarnessTaskScope({role_id:'role.requirements-manager',execution_state:'Drafter',work_unit_id:'work-unit.spec-synthesis',allowed_write_paths:['docs/']},{root:temporary});
 fs.mkdirSync(path.join(temporary,'.template-spec/agents'));fs.writeFileSync(path.join(temporary,'.template-spec/agents/issue-tracker.md'),'---\ntracker:\n  business_ticket_version: 1\n---\n');
 assert.equal(businessAuthoringEnabled(temporary),true);
 fs.writeFileSync(path.join(temporary,'.template-spec/process/harness-profile.yaml'),'profile_id: harness.frontend-delivery\n');assert.equal(businessAuthoringEnabled(temporary),false);
});
