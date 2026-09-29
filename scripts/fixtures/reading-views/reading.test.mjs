import {hash} from '../../lib/strategic-handoff-io.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {readingFixture,repo} from './fixture.mjs';

test('领域阅读保留失败、例外、未知约束及零值，输出可读 Markdown 并保持源字节',()=>{
  const f=readingFixture();try{
    const ref='docs/.scratch/demo/plan/domain-strategy.yaml',before=readFileSync(path.join(f.root,ref));
    const result=f.cli('view',ref,'--kind','domain-strategy');
    assert.equal(result.status,0,result.stderr+result.stdout);
    for(const text of ['业务责任区','被任务引用时不得删除；须先解除引用。','仅管理员可以修改口令；开发者不可读取明文。','无引用时删除成功。','false'])assert.ok(result.stdout.includes(text),text);
    assert.doesNotMatch(result.stdout,/"responsibilities"\s*:/);
    assert.match(result.stdout,/批准有效性未核验/);
    const data=f.cli('view',ref,'--kind','domain-strategy','--json');
    assert.equal(data.status,0,data.stderr);const view=JSON.parse(data.stdout);
    assert.equal(view.execution_allowed,false);assert.equal(view.approval_validity,'not-checked');
    assert.equal(view.binding.id,f.strategy.domain_strategy_id);
    assert.equal(view.content.extra_constraint.threshold,0);
    assert.deepEqual(readFileSync(path.join(f.root,ref)),before);
    assert.equal(f.cli('view',ref,'--kind','domain-strategy').stdout,result.stdout);
  }finally{f.cleanup();}
});

test('checkpoint keeps declared state separate from unchecked approval and empty blockers',()=>{
 const f=readingFixture();try{
  f.put('docs/.scratch/demo/checkpoint.yaml',JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8')));
  const r=f.cli('view','docs/.scratch/demo/checkpoint.yaml','--kind','checkpoint');assert.equal(r.status,0,r.stderr+r.stdout);
  assert.match(r.stdout,/未登记阻塞/);assert.match(r.stdout,/不等于可执行/);assert.match(r.stdout,/work-unit.plan-opportunity/);
 }finally{f.cleanup();}
});

test('migration preview verifies embedded after and never invents missing before',()=>{
 const f=readingFixture();try{
  const after='规则：不得删除\n';const payload={schema_version:1,root:f.root,input:{checkpoint_ref:'docs/.scratch/demo/checkpoint.yaml'},gaps:[],observed:{},changes:[{ref:'docs/.scratch/demo/plan/rules.yaml',before:{digest:hash('旧规则')},after,after_digest:hash(after)}]};
  const plan={...payload,plan_id:hash(JSON.stringify(payload)).slice(7)};f.put('docs/.scratch/demo/migration.json',JSON.stringify(plan));
  let r=f.cli('view','docs/.scratch/demo/migration.json','--kind','tracking-migration');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/无法比较旧内容/);assert.match(r.stdout,/不得删除/);assert.doesNotMatch(r.stdout,/after_digest.*\\n/);
  plan.changes[0].after='篡改';f.put('docs/.scratch/demo/migration.json',JSON.stringify(plan));r=f.cli('view','docs/.scratch/demo/migration.json','--kind','tracking-migration');assert.equal(r.status,1);assert.match(r.stdout,/digest-mismatch/);
 }finally{f.cleanup();}
});

test('stable IDs align field changes while order and unknown constraints remain visible',()=>{
 const f=readingFixture();try{
  const before={scenarios:[{scenario_id:'one',failure_results:['不得删除']},{scenario_id:'two',quota:0}],unknown:{password_digest:'不得记录口令'}};
  const after={scenarios:[{scenario_id:'two',quota:0},{scenario_id:'one',failure_results:['允许删除']}],unknown:{password_digest:'允许记录口令'}};
  f.put('before.yaml',before);f.put('after.yaml',after);
  const r=f.cli('diff','before.yaml','after.yaml','--kind','plan','--json');assert.equal(r.status,0,r.stderr);const d=JSON.parse(r.stdout);
  assert.ok(d.semantic_changes.some(x=>x.path==='/scenarios/@one/failure_results'));
  assert.ok(d.semantic_changes.some(x=>x.change==='order-or-membership'));
  assert.ok(d.semantic_changes.some(x=>x.path==='/unknown/password_digest'&&x.category==='unclassified'));
 }finally{f.cleanup();}
});

test('unsupported version and duplicate stable IDs remain diagnostic, with unknown constraints visible',()=>{
 const f=readingFixture();try{
  f.strategy.schema_version=99;f.strategy.scenarios.push(structuredClone(f.strategy.scenarios[0]));f.strategy.extra_constraint.password_digest='不得缓存明文';f.put('invalid.yaml',f.strategy);
  const r=f.cli('view','invalid.yaml','--kind','domain-strategy','--json');assert.equal(r.status,1);const v=JSON.parse(r.stdout);
  assert.ok(v.blockers.some(x=>x.includes('duplicate-stable-id')));assert.match(v.markdown,/不得缓存明文/);assert.equal(v.execution_allowed,false);
  f.put('duplicate.yaml','schema_version: 2\nschema_version: 3\n');assert.equal(f.cli('view','duplicate.yaml','--kind','domain-strategy').status,1);
 }finally{f.cleanup();}
});

test('two business objects can share a context; foreign references are not duplicate identities',()=>{
 const f=readingFixture();try{
  const one=structuredClone(f.strategy.concept_candidates[0]);f.strategy.concept_candidates.push({...one,concept_id:'domain-concept.another'});f.put('shared-context.yaml',f.strategy);
  const r=f.cli('view','shared-context.yaml','--kind','domain-strategy','--json');assert.equal(r.status,0,r.stderr+r.stdout);assert.ok(!JSON.parse(r.stdout).blockers.some(x=>x.includes('duplicate-stable-id')));
 }finally{f.cleanup();}
});
