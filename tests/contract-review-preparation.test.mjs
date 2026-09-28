import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prepareContractReview, viewContract } from '../scripts/lib/contract-views.mjs';
import { approvedFixture } from '../scripts/fixtures/delivery-preflight/approved-execution-fixture.mjs';
import { pilotFixture } from '../scripts/fixtures/slice-contract-v3/pilot-fixture.mjs';
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-review-prep-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'old.md'),'---\nversion: 1\n---\n风险：需要用户确认\n');fs.writeFileSync(path.join(root,'new.md'),'---\nversion: 2\n---\n风险：扩大权限\n未知约束：不得省略\n');return root;}
for (const version of [2, 3]) test(`default Slice review retains v${version} global and nested unknown constraints`, t => {
 const f = version === 3 ? pilotFixture() : approvedFixture();
 t.after(() => f.cleanup());
 const scope = version === 3 ? f.contract.scope : f.contract.common;
 scope.human_review_points = ['必须由数据负责人确认导出范围'];
 scope.full_reroute_triggers = ['发现新的导出字段时必须重新分析影响'];
 scope.doubt_driven_review = {unknown_constraint: '未知审批约束必须回到负责人'};
 scope.context_plan = {unknown_input: '不得省略来源中的额外读取约束'};
 f.write('review-constraints.yaml', JSON.stringify({slice_contract: f.contract}));
 const review = viewContract('review-constraints.yaml', {root: f.root, kind: 'slice'});
 assert.deepEqual(review.blockers, []);
 for (const constraint of [...scope.human_review_points, ...scope.full_reroute_triggers, scope.doubt_driven_review.unknown_constraint, scope.context_plan.unknown_input]) {
  assert.ok(JSON.stringify(review.content).includes(constraint), constraint);
  assert.ok(review.markdown.includes(constraint), constraint);
 }
 assert.equal(review.execution_allowed, false);
 assert.equal(review.approval_validity, 'not-checked');
});
test('mechanical preparation keeps versions, risks, unknown constraints, and grants no approval', t=>{
 const root=fixture(t),result=prepareContractReview('old.md','new.md',{root,kind:'spec'});
 assert.equal(result.before.version,1);assert.equal(result.after.version,2);assert.equal(result.approval_reusable,false);assert.equal(result.execution_allowed,false);
 assert.equal(result.decision_status,'not-provided');assert.equal(result.review_required.length,7);
 assert.match(JSON.stringify(result.source_views),/未知约束/);assert.ok(result.diff.changes.length);assert.equal(result.gaps[0].code,'DECISION_NOT_PROVIDED');assert.deepEqual(result.blockers,[]);
});
test('missing originals and decisions give actionable gaps without fabricated approval',t=>{
 const root=fixture(t),result=prepareContractReview('missing.md','new.md',{root,kind:'spec',decision_ref:'missing-decision.yaml'});
 assert.ok(result.gaps.some(x=>x.code==='SOURCE_UNREADABLE'));assert.ok(result.gaps.some(x=>x.code==='DECISION_UNAVAILABLE'));
 assert.equal(result.original_decision,null);assert.equal(result.diff,null);assert.equal(result.next_action,'repair-source-gaps');
});
test('stale source bindings remain visible in preparation',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'new.md'),'---\nversion: 2\nsource:\n  ref: old.md\n  digest: sha256:bad\n---\n正文\n');
 const result=prepareContractReview('old.md','new.md',{root,kind:'spec'});assert.ok(result.gaps.some(x=>x.code==='SOURCE_INVALID'));assert.equal(result.approval_reusable,false);
});

 test('same version changed bytes is a conflict',t=>{const root=fixture(t);fs.writeFileSync(path.join(root,'new.md'),'---\nversion: 1\n---\nchanged');assert.ok(prepareContractReview('old.md','new.md',{root,kind:'spec'}).gaps.some(x=>x.code==='VERSION_CONFLICT'));});
 test('valid original decision remains unapproved; stale reply source produces a gap',async t=>{const root=fixture(t);const {buildDecisionFixture}=await import('../scripts/fixtures/user-decision/build-fixture.mjs');const f=buildDecisionFixture(root);f.record=JSON.parse(JSON.stringify(f.record).replaceAll(root+'/',''));fs.writeFileSync(f.ref,JSON.stringify(f.record));const result=prepareContractReview('old.md','new.md',{root,kind:'spec',decision_ref:'decision.json'});assert.equal(result.decision_status,'requires-validation');assert.equal(result.approval_reusable,false);assert.deepEqual(result.blockers,[]);fs.appendFileSync(path.join(root,f.record.responses[0].source.ref),' ');assert.ok(prepareContractReview('old.md','new.md',{root,kind:'spec',decision_ref:'decision.json'}).gaps.some(x=>x.code==='DECISION_SOURCE_STALE'));});
