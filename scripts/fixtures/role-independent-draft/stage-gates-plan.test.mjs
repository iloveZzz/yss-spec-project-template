import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {stageGatesFixture} from '../../lib/testing/stage-gates-fixture.mjs';
import {stageContentFixture} from '../../lib/testing/stage-content-fixture.mjs';
import {assertPlanSpecEntry} from '../../lib/plan-spec-entry.mjs';
const skill=path.resolve(import.meta.dirname,'../../../.agents/skills/yss-stage-decision');
test('content validation does not require a future decision',()=>{
 const f=stageGatesFixture();try{
  stageContentFixture(f);
  for(const [kind,ref] of [['domain-strategy','domain.json'],['stage-decision-package','stage-decision.json']]) {
   const run=spawnSync(process.execPath,[path.join(skill,`scripts/validate-${kind}.mjs`),path.join(f.root,ref),'--root',f.root],{encoding:'utf8'});
   assert.equal(run.status,0,run.stderr);
   const absent=spawnSync(process.execPath,[path.join(skill,`scripts/validate-${kind}.mjs`),path.join(f.root,ref),'--root',f.root,'--mode','stage'],{encoding:'utf8'});
   assert.equal(absent.status,1);assert.match(absent.stderr,/checkpoint/);
  }
 }finally{f.cleanup();}
});
test('Plan enters Spec with one stage result and no child approvals',()=>{
 const f=stageGatesFixture();try{
  f.record();
  const cp={schema_version:2,feature_id:'feature.demo',gates:{'gate.plan-approved':{record_ref:'stage.json',record_digest:f.asset('stage.json').digest}}};
  assert.equal(assertPlanSpecEntry(cp,{root:f.root}).result,'allowed');
  delete cp.gates['gate.plan-approved'];assert.throws(()=>assertPlanSpecEntry(cp,{root:f.root}));
 }finally{f.cleanup();}
});
test('Spec and applicable design share one confirmation',()=>{
 const f=stageGatesFixture();try{
  f.record({gateId:'gate.spec-baseline-approved'});
  const run=spawnSync(process.env.YSS_NATIVE_BINARY,['contract','verify','--kind','stage-result','--root',f.root,'--file','stage.json','--gate','gate.spec-baseline-approved','--json'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stdout);assert.equal(fs.existsSync(path.join(f.root,'prototype.html')),false);
 }finally{f.cleanup();}
});
