import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {approvalExpectationForBoundAsset} from '../../../../scripts/lib/approval-consumption.mjs';
import {validateApprovalRecord} from '../../../../scripts/lib/approval-record.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(run) {
 const root=mkdtempSync(path.join(tmpdir(),'yss-consumer-current-'));
 try {
  const put=(ref,data)=>writeFileSync(path.join(root,ref),typeof data==='string'?data:JSON.stringify(data));
  const basis=ref=>({ref,digest:hash(readFileSync(path.join(root,ref)))});
  put('asset.md','actual current contract');put('evidence.log','synthetic independent comparison');
  const context={subject_ref:'review.json',approval_scope:['feature.current'],basis:[basis('evidence.log')],drafter_principal_ref:'drafter.current'};
  const binding={ref:'asset.md',approval_context:context};
  const subject={gate_id:'check.design-reviewed',approval_scope:context.approval_scope,drafter_principal_ref:context.drafter_principal_ref,basis:[...context.basis,basis('asset.md')]};put('review.json',subject);
  const record={schema_version:1,gate_id:subject.gate_id,decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'reviewer.current',drafter_principal_ref:context.drafter_principal_ref,subject_ref:'review.json',subject_digest:basis('review.json').digest,approval_scope:[...context.approval_scope],basis:subject.basis};
  const verify=()=>validateApprovalRecord(record,{root,requireApproved:true,expected:approvalExpectationForBoundAsset(subject.gate_id,binding,{root})});
  run({root,put,basis,context,binding,subject,record,verify});
 } finally {rmSync(root,{recursive:true,force:true});}
}
test('consumer selects independent package and freezes raw asset even for embedded contexts',()=>fixture(f=>{assert.equal(f.verify().bucket,'check_reviews');assert.equal(f.context.basis.length,1);}));
test('approval cannot choose another self-consistent package or wider scope',()=>fixture(f=>{f.put('other.json',{...f.subject,approval_scope:['feature.other']});f.record.subject_ref='other.json';f.record.subject_digest=f.basis('other.json').digest;f.record.approval_scope=['feature.other'];assert.throws(f.verify,/对象不匹配|范围不匹配/);}));
test('changing raw asset and unsigned-context digest cannot reuse old frozen approval',()=>fixture(f=>{f.put('asset.md','different contract');f.binding.digest=f.basis('asset.md').digest;assert.throws(f.verify,/证据过期|未覆盖证据/);}));
test('a raw asset without consumer-owned approval context cannot derive authority from record',()=>fixture(f=>{delete f.binding.approval_context;assert.throws(f.verify,/APPROVAL_CONTEXT_REQUIRED/);}));
