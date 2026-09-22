import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadExecutionScope, assertScopeWorkUnit, assertScopeImpacts, assertScopeSlice, scopedNextRoutes } from '../../../../scripts/lib/lifecycle-execution-scope.mjs';
import { validateNextRoute, validateImplementationEntry } from '../../../../scripts/lib/lifecycle-transition.mjs';
import { enforceHarnessTaskScope, enforceHarnessSkillScope } from '../../../../scripts/lib/harness-execution-scope.mjs';
import { completeBackendDelivery } from '../../../../scripts/lib/backend-delivery-terminal.mjs';
import { createApprovedExecutionContext, assertApprovedExecutionContext } from '../../../../scripts/lib/approved-execution-context.mjs';
import { approvedFixture } from '../../../../scripts/fixtures/delivery-preflight/approved-execution-fixture.mjs';

const ROOT=path.resolve(import.meta.dirname,'../../../..');
function fixture(t) {
  const root=fs.mkdtempSync(path.join(tmpdir(),'yss-scope-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const put=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));};
  put('yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');
  put('.yss-execution-scope.yaml',{schema_version:1,scope_id:'plan-to-backend'});
  put('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync(path.join(ROOT,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'),'utf8'));
  return {root,put};
}
test('scope opt-in cannot silently disappear or accept a custom work-unit allowlist',t=>{
  const f=fixture(t);assert.equal(loadExecutionScope(f.root).scope_id,'plan-to-backend');
  f.put('.yss-plugin.json',{plugin:'yss-backend-delivery',execution_scope:'plan-to-backend'});
  fs.rmSync(path.join(f.root,'.yss-execution-scope.yaml'));
  assert.throws(()=>loadExecutionScope(f.root),/缺少职责/);
  f.put('.yss-execution-scope.yaml',{schema_version:1,scope_id:'plan-to-backend',allowed_work_units:['work-unit.release-and-retrospective']});
  assert.throws(()=>loadExecutionScope(f.root),/被扩大/);
});
test('backend scope keeps product design while forbidding frontend implementation and release routes',t=>{
  const {root}=fixture(t);
  assert.doesNotThrow(()=>assertScopeWorkUnit('work-unit.prototype-design',{root}));
  assert.deepEqual(scopedNextRoutes('work-unit.code-review',['work-unit.release-and-retrospective'],{root}),['work-unit.slice-implementation','work-unit.backend-delivery']);
  for(const next of ['work-unit.frontend-implementation-verification','work-unit.release-and-retrospective'])assert.equal(validateNextRoute('work-unit.code-review',next,{}, {root}).result,'blocked');
  assert.throws(()=>assertScopeImpacts({ui_impact:true},{root}),/下游/);
  const downstream_frontend={owner:'frontend-team',ticket_ref:'tickets/frontend.md',verification_plan:'receiver test',target_version:'v1'};
  assert.doesNotThrow(()=>assertScopeImpacts({ui_impact:true,delivery_impacts:{backend:true,frontend:false},downstream_frontend},{root}));
  assert.throws(()=>assertScopeImpacts({delivery_impacts:{frontend:true}},{root}),/生产前端/);
});
test('scope does not bypass Plan approval, formal Ticket, implementation approval or code review',t=>{
  const {root}=fixture(t);
  assert.equal(validateNextRoute('work-unit.plan-requirements','work-unit.spec-synthesis',{}, {root}).result,'blocked');
  assert.equal(validateImplementationEntry({ready_for_agent:true},{root}).result,'blocked');
  assert.equal(validateNextRoute('work-unit.code-review','work-unit.backend-delivery',{}, {root}).result,'blocked');
  assert.throws(()=>createApprovedExecutionContext({}, {root}),/EXECUTION_APPROVAL_REQUIRED/);
});
test('dispatch and compiler deny frontend roles and recipes; project paths cannot supply permission',t=>{
  const {root}=fixture(t);
  assert.throws(()=>enforceHarnessTaskScope({contract:{kind:'slice-implementation'},role_id:'role.frontend-engineer',allowed_write_paths:['external/project/src']},{root}),/前端/);
  assert.throws(()=>enforceHarnessSkillScope(['frontend-example'],{skills:[{id:'frontend-example',impacts:['frontend']}]},{root}),/前端技能/);
  assert.throws(()=>assertScopeSlice({backend:{status:'required'},frontend:{status:'required'}},{root}),/后端 Slice/);
});
test('missing or forged terminal cannot close a lifecycle or restart implementation',async t=>{
  const {root,put}=fixture(t);
  assert.equal(validateNextRoute('work-unit.backend-delivery',null,{}, {root}).result,'blocked');
  await assert.rejects(completeBackendDelivery(root,{}));
  assert.equal(fs.existsSync(path.join(root,'.yss-backend-delivery.json')),false);
  put('.yss-backend-delivery.json',{result:'completed',bundle_digest:'fake'});
  assert.equal(validateImplementationEntry({ready_for_agent:true},{root}).result,'blocked');
  assert.throws(()=>assertScopeWorkUnit('work-unit.plan-requirements',{root,readOnly:true}),/execution-scope-blocked/);
});
test('unscoped projects retain their existing route and cannot select the scoped terminal',t=>{
  const {root}=fixture(t);fs.rmSync(path.join(root,'.yss-execution-scope.yaml'));
  assert.deepEqual(scopedNextRoutes('work-unit.code-review',['work-unit.release-and-retrospective'],{root}),['work-unit.release-and-retrospective']);
  assert.equal(validateNextRoute('work-unit.backend-delivery',null,{}, {root}).result,'blocked');
});
test('approved read-only inspection context cannot be used as implementation authority',t=>{
  const f=approvedFixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const context=createApprovedExecutionContext(f.binding,{root:f.root,readOnly:true});
  assert.throws(()=>assertApprovedExecutionContext(context,{root:f.root}),/EXECUTION_CONTEXT_READ_ONLY/);
  assert.doesNotThrow(()=>assertApprovedExecutionContext(context,{root:f.root,readOnly:true}));
});
