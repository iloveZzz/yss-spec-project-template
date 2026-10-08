import {assertSliceBusinessSources,checkBusinessTickets,ticketMetadata} from '../../lib/business-tickets.mjs';
import {assertBusinessApprovalBasis} from '../../lib/business-ticket-lifecycle.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fixture} from '../strategic-handoff/fixture.mjs';
import {inspectSource,exportBundle,openBundle,importBundle,finalizeDelivery} from '../../lib/strategic-handoff.mjs';
import {hash,read,json,sourceApprovalPolicy} from '../../lib/strategic-handoff-io.mjs';
const setup=async t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'business-handoff-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,...await fixture(root,{handoffVersion:5,businessTickets:true})};};
// Current checkpoint inputs come from the separately bound source context,
// never from the approval record whose authority the consumer is validating.
const currentGate=(f,key)=>{
  const approval=f.handoff.package_export.approvals[key];
  const {subject_ref,approval_scope,basis,drafter_principal_ref}=structuredClone(f.handoff.source[key].approval_context);
  return {status:'approved',reason:'Synthetic current source approval reuse; not a real decision.',approval_ref:approval.record_ref,subject_ref,subject_digest:hash(fs.readFileSync(path.join(f.root,subject_ref))).slice(7),approval_scope,basis,drafter_principal_ref,evidence_refs:basis.map(asset=>asset.ref)};
};
test('新能力将业务票绑定当前战略交接，Plan 不含晚生成资产',async t=>{const f=await setup(t);const r=await inspectSource(f.root,'handoff.yaml');assert.equal(r.business.status,'passed');assert.equal(f.handoff.package_export.approvals.business_ticket_set_ref.gate_id,'gate.strategic-design-handoff-approved');assert.equal(read(path.join(f.root,'source/plan-review-package.json')).assets.some(x=>x.id.startsWith('business-ticket-set.')),false);});
test('新能力拒绝借用早期 Plan 批准',async t=>{const f=await setup(t);f.handoff.package_export.approvals.business_ticket_set_ref.gate_id='gate.plan-approved';f.sign();await assert.rejects(inspectSource(f.root,'handoff.yaml'),/错误批准门禁/);});
test('业务导出包含票据、审查和全部来源闭包且重读成功',async t=>{const f=await setup(t);const dest=path.join(f.root,'bundle');await exportBundle({sourceRoot:f.root,handoffRef:'handoff.yaml',output:dest});await openBundle(dest,async pack=>{assert.equal(pack.business.tickets.length,1);const files=pack.manifest.files.map(x=>x.original_ref);for(const ref of ['source/business-tickets/BT-001.md','source/business-review.yaml','source/strategy.yaml'])assert.ok(files.includes(ref));});});
test('Context 来源在只读包和导入集合中解析快照，普通源仓不隐式回退',async t=>{
  const f=await setup(t),ticketRef='source/business-tickets/BT-001.md';
  const text=fs.readFileSync(path.join(f.root,ticketRef),'utf8'),ticket=ticketMetadata(text);
  ticket.source_refs.push({ref:'CONTEXT.md',version:'v1',digest:hash(fs.readFileSync(path.join(f.root,'CONTEXT.md')))});
  f.put(ticketRef,'---\n'+json(ticket)+'---\n'+text.split(/\n---\n/)[1]);
  const set=read(path.join(f.root,'source/tickets.yaml'));
  set.tickets[0].digest=hash(fs.readFileSync(path.join(f.root,ticketRef)));f.put('source/tickets.yaml',set);
  const review=read(path.join(f.root,'source/business-review.yaml'));
  review.subject_digest=hash(fs.readFileSync(path.join(f.root,'source/tickets.yaml')));f.put('source/business-review.yaml',review);
  f.handoff.source.business_ticket_set_ref.digest=review.subject_digest;f.sign();
  const prefix='docs/handoffs/strategic-design-handoff.supplier/v1/package/',dest=path.join(f.root,prefix);
  await exportBundle({sourceRoot:f.root,handoffRef:'handoff.yaml',output:dest});
  const snapshot=path.join(dest,'payload/files/source-context.snapshot.md'),before=fs.readFileSync(snapshot);
  await openBundle(dest,async pack=>{assert.equal(pack.business.status,'passed');},{readOnly:true});
  const report=checkBusinessTickets({root:f.root,setRef:prefix+'payload/files/source/tickets.yaml',mode:'formal'});
  assert.equal(report.status,'passed',JSON.stringify(report.diagnostics));
  assert.ok(report.inputs.some(x=>x.ref===prefix+'payload/files/source-context.snapshot.md'));
  assert.ok(report.inputs.every(x=>fs.existsSync(path.join(f.root,x.ref))));
  assert.equal(fs.existsSync(path.join(dest,'payload/files/CONTEXT.md')),false);
  assert.deepEqual(fs.readFileSync(snapshot),before);
  fs.renameSync(path.join(f.root,'CONTEXT.md'),path.join(f.root,'source-context.snapshot.md'));
  assert.equal(checkBusinessTickets({root:f.root,setRef:'source/tickets.yaml',mode:'formal'}).status,'blocked');
});
test('未知源策略能力拒绝，不静默按旧批准解释',()=>{assert.throws(()=>sourceApprovalPolicy({user_decision_policy:{required_capabilities:['business-ticket-approval-v99']},gate_policy:{}}),/不支持/);});

test('研发可直接绑定导入包内的不可变业务集合和原始 Spec',async t=>{const f=await setup(t);const prefix='docs/handoffs/strategic-design-handoff.supplier/v1/package';await exportBundle({sourceRoot:f.root,handoffRef:'handoff.yaml',output:path.join(f.root,prefix)});const base=prefix+'/payload/files/';const bind=ref=>({ref,digest:hash(fs.readFileSync(path.join(f.root,ref)))});assert.doesNotThrow(()=>assertSliceBusinessSources({root:f.root,ticketText:'---\nkind: vertical-slice-ticket\nbusiness_ticket_refs: [BT-001]\nacceptance_refs: [AC-001]\n---\n',setBinding:bind(base+'source/tickets.yaml'),specBinding:bind(base+'source/spec.md'),acceptance:{a:{source:'spec',locator:'AC-001'}}}));});
test('全生命周期正式化复用已有效 Spec/Design 批准，不增加门禁',async t=>{const f=await setup(t);f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  business_ticket_version: 1\n---\n');const gates={};for(const key of ['spec_ref','prototype_ref']){const a=f.handoff.package_export.approvals[key];gates[a.gate_id]=currentGate(f,key);}const state={gates,business_ticket_set_ref:'source/tickets.yaml'};assert.doesNotThrow(()=>assertBusinessApprovalBasis(f.root,state,{required:true}));delete gates['gate.spec-baseline-approved'];assert.throws(()=>assertBusinessApprovalBasis(f.root,state,{required:true}),/APPROVAL_REQUIRED/);});
test('业务正式化允许有证据的无产品设计影响判断',async t=>{const f=await setup(t);f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  business_ticket_version: 1\n---\n');const a=f.handoff.package_export.approvals.spec_ref;const state={business_ticket_set_ref:'source/tickets.yaml',gates:{[a.gate_id]:currentGate(f,'spec_ref'),'gate.product-design-approved':{status:'not-applicable',reason:'本次仅业务规则澄清，无 UI/产品设计影响',evidence_refs:['evidence/offline.log']}}};assert.doesNotThrow(()=>assertBusinessApprovalBasis(f.root,state,{required:true}));state.gates['gate.product-design-approved'].evidence_refs=[];assert.throws(()=>assertBusinessApprovalBasis(f.root,state,{required:true}),/APPROVAL_REQUIRED/);});
test('有效的另一个 Spec 批准不能正式化当前业务集合',async t=>{
  const f=await setup(t);f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  business_ticket_version: 1\n---\n');
  const a=f.handoff.package_export.approvals.spec_ref;
  const state={business_ticket_set_ref:'source/tickets.yaml',gates:{[a.gate_id]:currentGate(f,'spec_ref'),'gate.product-design-approved':{status:'not-applicable',reason:'无产品设计影响',evidence_refs:['evidence/offline.log']}}};
  f.put('source/other-spec.md',fs.readFileSync(path.join(f.root,'source/spec.md'),'utf8'));
  const set=read(path.join(f.root,'source/tickets.yaml'));set.spec.ref='source/other-spec.md';
  const ref=set.tickets[0].ref,text=fs.readFileSync(path.join(f.root,ref),'utf8'),ticket=ticketMetadata(text);ticket.spec=set.spec;
  f.put(ref,'---\n'+json(ticket)+'---\n'+text.split(/\n---\n/)[1]);set.tickets[0].digest=hash(fs.readFileSync(path.join(f.root,ref)));f.put('source/tickets.yaml',set);
  const review=read(path.join(f.root,'source/business-review.yaml'));review.subject_digest=hash(fs.readFileSync(path.join(f.root,'source/tickets.yaml')));f.put('source/business-review.yaml',review);
  assert.equal(checkBusinessTickets({root:f.root,setRef:'source/tickets.yaml',mode:'formal'}).status,'passed');
  assert.throws(()=>assertBusinessApprovalBasis(f.root,state,{required:true}),/BUSINESS_SPEC_APPROVAL_MISMATCH/);
});

test('导入同时给 Backend/Frontend 起草业务票映射且不授予实现权限',async t=>{const f=await setup(t),bundle=(await finalizeDelivery({sourceRoot:f.root,handoffRef:'handoff.yaml'})).delivery,target=path.join(f.root,'target');f.put('target/yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');f.put('target/CONTEXT.md',fs.readFileSync(path.join(f.root,'CONTEXT.md'),'utf8'));const imported=await importBundle({bundle,targetRoot:target});const base=path.dirname(imported.receipt_ref);assert.equal(read(path.join(target,imported.receipt_ref)).schema_version,3);for(const file of ['backend-technical-traceability-draft.json','frontend-traceability-draft.json']){const draft=read(path.join(target,base,file));const row=draft.rows.find(x=>x.source_id==='BT-001');assert.equal(row.disposition,'pending');assert.equal(row.dependency_status,'unknown');assert.ok(row.business_ticket_ref.includes('/package/payload/files/'));}const preflight=read(path.join(target,base,'frontend-strategic-preflight-draft.json'));assert.equal(preflight.ready_for_agent,false);assert.ok(!preflight.source_rule_refs.includes('BT-001'));});
