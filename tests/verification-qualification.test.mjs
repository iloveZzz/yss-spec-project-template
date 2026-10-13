import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planTemplateVerification,ROOT} from '../scripts/lib/template-verification.mjs';
import {validateVerificationArguments,executeVerificationPlan} from '../.template-source/scripts/lib/template-verification-worker.mjs';
test('已退役的资格材料即使自述 passed 也不能重新启用任何执行权限',async()=>{
  for(const profile of ['fast','release']){
    assert.throws(()=>planTemplateVerification({profile,qualificationReport:'old-proof.json',qualificationReportDigest:'a'.repeat(64)}),/QUALIFICATION_RETIRED/);
    assert.throws(()=>validateVerificationArguments({profile,'qualification-report':'old-proof.json','qualification-report-sha256':'a'.repeat(64)}),/QUALIFICATION_RETIRED/);
  }
  await assert.rejects(()=>executeVerificationPlan({purpose:'qualification'}),/只允许 diagnostic/);
  for(const ref of ['scripts/verify-template-candidate','.template-source/scripts/qualify-template-verification.mjs','.template-source/scripts/lib/verification-qualification.mjs','.template-source/scripts/lib/verification-qualification-plan.mjs','.template-source/process/template-verification-legacy.json','scripts/verify-strategic-context-import','tests/scenarios/verify-frontend-delivery-scenarios.mjs','tests/scenarios/verify-frontend-implementation-evidence-scenarios.mjs','tests/scenarios/verify-strategic-context-import-scenarios.mjs'])assert.equal(fs.existsSync(`${ROOT}/${ref}`),false,ref);
});
