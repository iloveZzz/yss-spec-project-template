import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPlanSpec } from '../scripts/lib/plan-spec-quality.mjs';

test('权威 Plan/Spec 模板的正式章节能被内容诊断识别', async () => {
  for (const [kind, ref] of [['plan','.template-spec/plan/templates/plan-template.md'],['spec','.template-spec/templates/spec-template.md']]) {
    const result=await inspectPlanSpec({command:'check',root:process.cwd(),[kind]:ref});
    assert.equal(result.exitCode,0);
    assert.deepEqual(result.report.findings.filter(x=>['SECTION_UNPARSED','SECTION_MISSING'].includes(x.code)),[]);
    assert.ok(!result.report.unevaluated.some(x=>x.code==='LEGACY_OR_UNKNOWN_PROFILE'));
  }
});
