import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prepareContractReview } from '../scripts/lib/contract-views.mjs';
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-review-prep-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'old.md'),'---\nversion: 1\n---\n风险：需要用户确认\n');fs.writeFileSync(path.join(root,'new.md'),'---\nversion: 2\n---\n风险：扩大权限\n未知约束：不得省略\n');return root;}
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
