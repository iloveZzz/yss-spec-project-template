import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {stringify} from '../../vendor/yaml.mjs';
const cli=path.resolve('scripts/contract');
test('review is compact, retains acceptance, and never authorizes execution; task retains every constraint',()=>{
 const f=pilotFixture();try{
  f.write('slice.yaml',stringify({slice_contract:f.contract}));
  const run=(...args)=>{const r=spawnSync(process.execPath,[cli,'view','slice.yaml','--kind','slice','--root',f.root,...args,'--json'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
  const review=run();assert.equal(review.execution_allowed,false);assert.match(review.markdown,/AC-1/);assert.doesNotMatch(review.markdown,/<details>|完整工程约束与来源/);assert.ok(review.binding.digest.startsWith('sha256:'));
  const task=run('--profile','task','--unit','work-unit.slice-backend');assert.match(task.markdown,/不得绕过持久化约束/);assert.match(task.markdown,/mvnw test/);assert.match(task.markdown,/src\/main\/java/);
  const invalid=spawnSync(process.execPath,[cli,'view','slice.yaml','--kind','slice','--profile','task','--unit','unknown','--root',f.root],{encoding:'utf8'});assert.notEqual(invalid.status,0);
 }finally{f.cleanup();}
});

test('all lifecycle asset groups remain readable and preserve unclassified constraints without granting execution',async()=>{
 const {viewContract,contractKinds,diffContract}=await import('../../lib/contract-views.mjs');
 const f=pilotFixture();try{
 const raw={id:'synthetic.asset',version:'v1',goal:'交付目标',non_goals:['不迁移数据'],acceptance:['验收甲'],risks:['风险乙'],pending_decisions:['决定丙'],constraints:{paths:['src/a'],verification:['pnpm test'],unknown_rule:'未分类丁'},resolution:{additional_constraint:'内部约束戊'}};
 f.write('generic.json',raw);
 for(const kind of Object.keys(contractKinds).filter(k=>k!=='slice')){
  const review=viewContract('generic.json',{root:f.root,kind});assert.equal(review.execution_allowed,false);assert.equal(review.approval_validity,'not-checked');
  for(const text of ['交付目标','不迁移数据','验收甲','风险乙','决定丙','未分类丁'])assert.ok(review.markdown.includes(text),`${kind} omitted ${text}`);
  const task=viewContract('generic.json',{root:f.root,kind,profile:'task'});assert.ok(task.markdown.includes('内部约束戊'));assert.ok(task.markdown.includes('pnpm test'));
 }
 f.write('blocked.json',{...raw,resolution:{blockers:['nested blocker must remain visible']}});const blocked=viewContract('blocked.json',{root:f.root,kind:'plan'});assert.ok(blocked.blockers.some(x=>x.includes('nested blocker')));assert.match(blocked.markdown,/nested blocker/);
 f.write('other.json',{...raw,acceptance:['验收甲','新增验收']});const delta=diffContract('generic.json','other.json',{root:f.root,kind:'spec'});assert.equal(delta.approval_reusable,false);assert.ok(delta.changes.some(x=>x.path==='acceptance'));
 }finally{f.cleanup();}
});

test('compact review achieves the byte target without hiding required review information; task includes verification cwd and evidence',async()=>{
 const {viewContract}=await import('../../lib/contract-views.mjs');const {renderSliceContractView}=await import('../../lib/slice-contract-views.mjs');
 const f=pilotFixture();try{
 f.write('slice.yaml',stringify({slice_contract:f.contract}));
 const original=renderSliceContractView('slice.yaml',{root:f.root}),review=viewContract('slice.yaml',{root:f.root,kind:'slice'}),task=viewContract('slice.yaml',{root:f.root,kind:'slice',profile:'task',unit_id:'work-unit.slice-backend'});
 assert.ok(Buffer.byteLength(review.markdown)<=Buffer.byteLength(original.markdown)*.3);
 for(const text of ['提交完整材料','无新增审批规则','AC-1','关键取舍','风险','待决定','来源或批准过期'])assert.ok(review.markdown.includes(text),text);
 for(const text of [f.project,'./mvnw test','results/test.log','test-seam.failure','yss-web-controller','不得绕过持久化约束'])assert.ok(task.markdown.includes(text),text);
 }finally{f.cleanup();}
});
