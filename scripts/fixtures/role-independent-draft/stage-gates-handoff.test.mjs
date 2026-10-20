import test from 'node:test';
import assert from 'node:assert/strict';
import {stageGatesFixture} from '../../lib/testing/stage-gates-fixture.mjs';
import {nativeEvidenceVerify,nativeCoverage,NEEDS} from '../../lib/native-evidence.mjs';
test('source consumer accepts stage membership and rejects an unreviewed or stale member',()=>{
 const f=stageGatesFixture();try {
  f.record();
  const verify=ref=>nativeCoverage(nativeEvidenceVerify({root:f.root,group:'handoff',kind:'source-approval',document:{ref,approval_ref:'stage.json',digest_kind:'sha256-bytes'},extra:['--gate','gate.plan-approved'],needs:[...NEEDS.sourceApproval,...NEEDS.stageResult]}),'source_approval');
  assert.equal(verify('subject.md').result,'passed');
  f.write('outside.md','unreviewed');assert.throws(()=>verify('outside.md'));
  f.write('subject.md','changed');assert.throws(()=>verify('subject.md'));
 }finally{f.cleanup();}
});
