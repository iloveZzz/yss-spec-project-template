import assert from 'node:assert/strict';
import {approvedFixture} from '../../../../../scripts/fixtures/delivery-preflight/approved-execution-fixture.mjs';
import {pilotFixture} from '../../../../../scripts/fixtures/slice-contract-v3/pilot-fixture.mjs';
import {viewContract} from '../../../../../scripts/lib/contract-views.mjs';
import {stringify} from '../../../../../scripts/vendor/yaml.mjs';
for(const version of [2,3]){
const f=version===3?pilotFixture():approvedFixture();try{
const scope=version===3?f.contract.scope:f.contract.common;
scope.human_review_points=['必须由数据负责人确认导出范围'];
scope.full_reroute_triggers=['发现新的导出字段时必须重新分析影响'];
scope.doubt_driven_review={unknown_constraint:'未知审批约束必须回到负责人'};
f.write('review-gap.yaml',JSON.stringify({slice_contract:f.contract}));
const review=viewContract('review-gap.yaml',{root:f.root,kind:'slice',profile:'review'});
const full=viewContract('review-gap.yaml',{root:f.root,kind:'slice',profile:'full'});
const needles=['必须由数据负责人确认导出范围','发现新的导出字段时必须重新分析影响','未知审批约束必须回到负责人'];
const result={schema_version:version,blockers:review.blockers,checks:needles.map(text=>({text,in_review:JSON.stringify(review).includes(text),in_full:JSON.stringify(full).includes(text)}))};
console.log(JSON.stringify(result,null,2));assert.deepEqual(review.blockers,[]);assert.ok(result.checks.every(x=>!x.in_review&&x.in_full),'当前缺失已复现');
}finally{f.cleanup();}
}
