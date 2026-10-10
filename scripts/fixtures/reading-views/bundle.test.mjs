import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {readingFixture,repo} from './fixture.mjs';
const cp='docs/.scratch/demo/checkpoint.yaml',manifest='docs/.scratch/demo/reading/.manifest.json';
function registeredReading(profile='spec',checkpoint='intake-checkpoint.json'){
 const f=readingFixture(),owner=profile==='design'?path.join(repo,'submodules/yss-harness-design-agent'):repo;
 if(profile==='spec')f.put('.template-spec/process/harness-profile.yaml',{schema_version:1,profile_id:'harness.spec-template'});else f.put('.template-spec/process/harness-profile.yaml',readFileSync(path.join(owner,'.template-spec/process/harness-profile.yaml'),'utf8'));
 const contract=profile==='design'?'.agents/skills/yss-strategic-design/references/orchestration-contract.yaml':'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';f.put(contract,readFileSync(path.join(owner,contract),'utf8'));
 f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
 const c=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));c.feature_id='feature.supplier';c.artifacts={};f.put(checkpoint,JSON.stringify(c));
 f.put('.work/supplier/map.md','---\ncheckpoint_ref: '+checkpoint+'\n---\n# 当前功能\n');
 return {...f,checkpoint};
}
test('current registered reading separates canonical ID and root Design checkpoint directory',async()=>{
 const {readingLocation}=await import('../../lib/reading-view-policy.mjs');const f=registeredReading('design');
 try{assert.deepEqual(readingLocation(f.root,f.checkpoint),{feature:'feature.supplier',base:'.work/supplier',directory:'.work/supplier/reading'});}finally{f.cleanup();}
});
test('registered root checkpoint renders an idempotent bundle without navigation self-dependency',async()=>{
 const {renderReadingBundle,checkReadingViews}=await import('../../lib/reading-view-bundle.mjs');
 for(const profile of ['spec','design']){
  const f=registeredReading(profile);try{
   f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[f.checkpoint]});
   f.put('.work/other/map.md','---\ncheckpoint_ref: .work/other/checkpoint.json\n---\n');f.put('.work/other/checkpoint.json',{feature_id:'feature.other'});
   assert.equal(renderReadingBundle(f.root,f.checkpoint).status,'rendered');
   const ref='.work/supplier/reading/.manifest.json',before=readFileSync(path.join(f.root,ref));
   const dependencies=JSON.parse(before).dependencies;
   assert.ok(!dependencies.some(row=>row.ref==='.work/supplier/map.md'));
   assert.ok(dependencies.some(row=>row.ref==='.work/other/map.md'));
   assert.equal(checkReadingViews(f.root,f.checkpoint,{required:true}).status,'current');
   assert.equal(renderReadingBundle(f.root,f.checkpoint).status,'unchanged');assert.deepEqual(readFileSync(path.join(f.root,ref)),before);
  }finally{f.cleanup();}
 }
});
test('root Design checkpoint review preparation retains managed missing and stale reading gaps',async()=>{
 const {prepareContractReview}=await import('../../lib/contract-views.mjs');
 const {readingCheckpointsForAsset,renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');
 const f=registeredReading('design');try{
  f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[f.checkpoint]});
  assert.deepEqual(readingCheckpointsForAsset(f.root,f.checkpoint,'checkpoint'),[f.checkpoint]);
  const prepare=()=>prepareContractReview(f.checkpoint,f.checkpoint,{root:f.root,kind:'checkpoint'});
  assert.ok(prepare().gaps.some(row=>row.code==='READING_VIEWS_STALE'),'missing managed bundle must block review preparation');
  renderReadingBundle(f.root,f.checkpoint);
  assert.ok(!prepare().gaps.some(row=>row.code==='READING_VIEWS_STALE'),'current managed bundle must remain usable');
  f.put(f.checkpoint,readFileSync(path.join(f.root,f.checkpoint),'utf8')+'\n');
  const before=readFileSync(path.join(f.root,f.checkpoint));
  assert.ok(prepare().gaps.some(row=>row.code==='READING_VIEWS_STALE'),'stale managed bundle must block review preparation');
  assert.deepEqual(readFileSync(path.join(f.root,f.checkpoint)),before);
 }finally{f.cleanup();}
});
test('registered reading refuses missing, duplicate and conflicting maps and unsupported declared policies',async()=>{
 const {readingLocation}=await import('../../lib/reading-view-policy.mjs');const {rmSync}=await import('node:fs');
 for(const scenario of ['missing','duplicate','wrong-checkpoint','wrong-tracker','unknown-version','null-policy']){
  const f=registeredReading();try{
   const contract='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
   if(scenario==='missing')rmSync(path.join(f.root,'.work/supplier/map.md'));
   if(scenario==='duplicate')f.put('.work/duplicate/map.md','---\ncheckpoint_ref: '+f.checkpoint+'\n---\n');
   if(scenario==='wrong-checkpoint'){f.put('other-checkpoint.json',readFileSync(path.join(f.root,f.checkpoint),'utf8'));f.put('.work/supplier/map.md','---\ncheckpoint_ref: other-checkpoint.json\n---\n');}
   if(scenario==='wrong-tracker')f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: elsewhere\n---\n');
   if(scenario==='unknown-version'||scenario==='null-policy'){
    const {parseSliceYaml}=await import('../../lib/slice-contract.mjs'),value=parseSliceYaml(readFileSync(path.join(f.root,contract)));
    if(scenario==='unknown-version')value.progression_target.schema_version=99;else value.progression_target=null;f.put(contract,value);
   }
   assert.throws(()=>readingLocation(f.root,f.checkpoint),/registration-not-unique|capability-unsupported/,scenario);
  }finally{f.cleanup();}
 }
});
test('reading policy root references retain traversal and absolute-path rejection',async()=>{
 const {readingPolicy}=await import('../../lib/reading-view-policy.mjs');const f=registeredReading('design');try{
  for(const ref of ['intake-checkpoint.json','docs/.scratch/demo/中文 状态.json']){
   f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[ref]});assert.deepEqual(readingPolicy(f.root).checkpoints,[ref]);
  }
  for(const ref of ['../checkpoint.json','/checkpoint.json','a/../checkpoint.json','a\\checkpoint.json']){
   f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[ref]});assert.throws(()=>readingPolicy(f.root),/schema|Schema|pattern|不匹配/);
  }
 }finally{f.cleanup();}
});
function setup(){const f=readingFixture();const c=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));c.artifacts={'artifact.domain-strategy':{ref:'docs/.scratch/demo/plan/domain-strategy.yaml',status:'draft',evidence_refs:[]}};f.put(cp,c);return f;}
test('explicit enable plan protects manual map and produces deterministic current bundle',()=>{
 const f=setup();try{
  f.put('docs/.scratch/demo/map.md','# 人工导航\n\n保持我的说明。\n');
  assert.equal(f.cli('check-views','--checkpoint',cp,'--json').status,0);
  let r=f.cli('plan-enable','--checkpoint',cp,'--output','enable.json','--json');assert.equal(r.status,0,r.stderr);
  assert.equal(existsSync(path.join(f.root,manifest)),false);
  r=f.cli('apply-enable','enable.json','--json');assert.equal(r.status,0,r.stderr+r.stdout);
  const before=readFileSync(path.join(f.root,manifest));assert.match(readFileSync(path.join(f.root,'docs/.scratch/demo/map.md'),'utf8'),/保持我的说明/);
  r=f.cli('check-views','--checkpoint',cp,'--json');assert.equal(r.status,0,r.stderr+r.stdout);assert.equal(JSON.parse(r.stdout).status,'current');
  r=f.cli('render','--checkpoint',cp,'--json');assert.equal(r.status,0,r.stderr);assert.deepEqual(readFileSync(path.join(f.root,manifest)),before);
  f.strategy.scenarios[0].failure_results=['被引用也允许删除'];f.put('docs/.scratch/demo/plan/domain-strategy.yaml',f.strategy);
  r=f.cli('check-views','--checkpoint',cp,'--json');assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).status,'stale');
  r=f.cli('render','--checkpoint',cp,'--json');assert.equal(r.status,0,r.stderr);
  f.put('docs/.scratch/demo/reading/domain-strategy.review.md','人工意见');
  r=f.cli('render','--checkpoint',cp,'--json');assert.equal(r.status,1);assert.match(r.stderr,/reading-output-conflict/);
  assert.equal(readFileSync(path.join(f.root,'docs/.scratch/demo/reading/domain-strategy.review.md'),'utf8'),'人工意见');
 }finally{f.cleanup();}
});
export {setup,cp,manifest};

test('interrupted generation restores only owned outputs and never the source',async()=>{
 const {renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');
 const f=setup();try{
  renderReadingBundle(f.root,cp);const before=readFileSync(path.join(f.root,manifest));
  f.strategy.scenarios[0].failure_results=['异常后停止'];f.put('docs/.scratch/demo/plan/domain-strategy.yaml',f.strategy);
  assert.throws(()=>renderReadingBundle(f.root,cp,{afterWrite:()=>{throw Error('injected-failure');}}),/injected-failure/);
  assert.deepEqual(readFileSync(path.join(f.root,manifest)),before);assert.match(readFileSync(path.join(f.root,'docs/.scratch/demo/plan/domain-strategy.yaml'),'utf8'),/异常后停止/);
  assert.equal(renderReadingBundle(f.root,cp).status,'rendered');
 }finally{f.cleanup();}
});
test('input drift during write aborts mixed bundle and preserves concurrent edits',async()=>{
 const {renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');const f=setup();try{
  assert.throws(()=>renderReadingBundle(f.root,cp,{afterWrite:()=>{f.put(cp,'schema_version: 9\n');}}),/reading-input-drift/);
  assert.equal(existsSync(path.join(f.root,manifest)),false);assert.equal(readFileSync(path.join(f.root,cp),'utf8'),'schema_version: 9\n');
 }finally{f.cleanup();}
});

test('adding or changing project display names invalidates the reading bundle',async()=>{
 const {renderReadingBundle,checkReadingViews}=await import('../../lib/reading-view-bundle.mjs');const f=setup();try{
  renderReadingBundle(f.root,cp);
  const ref='.template-spec/process/lifecycle-registry.yaml';f.put(ref,readFileSync(path.join(repo,ref),'utf8'));
  assert.notEqual(checkReadingViews(f.root,cp,{required:true}).status,'current');
  renderReadingBundle(f.root,cp);
  assert.equal(checkReadingViews(f.root,cp,{required:true}).status,'current');
  f.put(ref,readFileSync(path.join(f.root,ref),'utf8').replace('name: 入口分诊','name: 名称已变'));
  assert.notEqual(checkReadingViews(f.root,cp,{required:true}).status,'current');
 }finally{f.cleanup();}
});
test('preparation rejects a stale managed bundle through the public API',async()=>{
 const {prepareContractReview}=await import('../../lib/contract-views.mjs');const f=setup();try{
  assert.equal(f.cli('plan-enable','--checkpoint',cp,'--output','enable.json').status,0);assert.equal(f.cli('apply-enable','enable.json').status,0);
  const ref='docs/.scratch/demo/plan/domain-strategy.yaml';f.put('old.yaml',f.strategy);f.strategy.domain_version='v999';f.put(ref,f.strategy);
  const r=prepareContractReview('old.yaml',ref,{root:f.root,kind:'domain-strategy'});assert.ok(r.gaps.some(x=>x.code==='READING_VIEWS_STALE'));
 }finally{f.cleanup();}
});

test('successful tracking source transaction survives a presentation conflict and is not reapplied',async()=>{
 const cp='docs/.scratch/demo/working-checkpoint.json';
 const {planTracking,applyTracking}=await import('../../lib/stage-tracking-migration.mjs');const {parseYaml}=await import('../../lib/stage-tracking.mjs');const f=setup();try{
  for(const ref of ['.template-spec/process/schemas/stage-tracking.schema.json','.template-spec/process/lifecycle-registry.yaml'])f.put(ref,readFileSync(path.join(repo,ref),'utf8'));
  f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: docs/.scratch\n---\n# Tracker\n');
  const c=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));c.stage='stage.plan';c.next_work_unit='work-unit.plan-requirements';f.put(cp,JSON.stringify(c));
  assert.equal(f.cli('plan-enable','--checkpoint',cp,'--output','enable.json').status,0);assert.equal(f.cli('apply-enable','enable.json').status,0);
  f.put('docs/.scratch/demo/reading/status.review.md','人工补充，不得覆盖');
  const plan=planTracking(f.root,{checkpoint_ref:cp,items:[{id:'review-rules',title:'规则',owner:'负责人',scope:'规则范围',stage:'stage.plan',work_unit:'work-unit.plan-requirements',acceptance:['确认失败场景']}]});
  const applied=applyTracking(f.root,plan);assert.equal(applied.source_operation,'applied');assert.equal(applied.reading_update.status,'failed');
  assert.equal(parseYaml(readFileSync(path.join(f.root,cp),'utf8')).stage_tracking.items[0].id,'review-rules');
  const repeated=applyTracking(f.root,plan);assert.equal(repeated.source_operation,'unchanged');assert.equal(repeated.reading_update.status,'failed');
  assert.equal(readFileSync(path.join(f.root,'docs/.scratch/demo/reading/status.review.md'),'utf8'),'人工补充，不得覆盖');
 }finally{f.cleanup();}
});

test('stale enable plans, unowned files, symlinks and active writers are refused',async()=>{
 const {symlinkSync,mkdirSync}=await import('node:fs');const {renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');const f=setup();try{
  assert.equal(f.cli('plan-enable','--checkpoint',cp,'--output','enable.json').status,0);f.put('CONTEXT.md','词汇变化');
  // Context is not interpreted as approval; it remains an explicit dependency of the reading package.
  assert.equal(f.cli('apply-enable','enable.json').status,1);
  const dir=path.join(f.root,'docs/.scratch/demo/reading');mkdirSync(dir,{recursive:true});f.put('docs/.scratch/demo/reading/.lock',JSON.stringify({pid:process.pid}));assert.throws(()=>renderReadingBundle(f.root,cp),/reading-busy/);
  const {unlinkSync}=await import('node:fs');unlinkSync(path.join(dir,'.lock'));symlinkSync(path.join(f.root,'CONTEXT.md'),path.join(dir,'status.review.md'));assert.throws(()=>renderReadingBundle(f.root,cp),/symlink|symbolic/i);
 }finally{f.cleanup();}
});

test('changed navigation block and broken manifest are retained for explicit recovery',async()=>{
 const {renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');const f=setup();try{
  renderReadingBundle(f.root,cp);const map='docs/.scratch/demo/map.md';f.put(map,readFileSync(path.join(f.root,map),'utf8').replace('## 阅读导航','## 人工改写'));
  assert.throws(()=>renderReadingBundle(f.root,cp),/reading-output-conflict/);assert.match(readFileSync(path.join(f.root,map),'utf8'),/人工改写/);
  f.put(manifest,'broken');assert.throws(()=>renderReadingBundle(f.root,cp),/reading-manifest-invalid/);assert.equal(readFileSync(path.join(f.root,manifest),'utf8'),'broken');
 }finally{f.cleanup();}
});
test('registered handoff rejects stale reading and legacy handoff stays unaffected',async()=>{
 const {assertReadingTransition}=await import('../../lib/reading-view-bundle.mjs');const f=setup();try{
  assert.equal(assertReadingTransition(f.root,{checkpoint_ref:cp}).status,'manual');
  assert.equal(f.cli('plan-enable','--checkpoint',cp,'--output','enable.json').status,0);assert.equal(f.cli('apply-enable','enable.json').status,0);
  f.put('CONTEXT.md','词汇正文变化');assert.throws(()=>assertReadingTransition(f.root,{checkpoint_ref:cp}),/reading-views-stale/);
 }finally{f.cleanup();}
});

test('a killed writer leaves an incomplete bundle which the next render recovers',async()=>{
 const {spawnSync}=await import('node:child_process');const {pathToFileURL}=await import('node:url');const {renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');const f=setup();try{
  const script=`import {renderReadingBundle} from ${JSON.stringify(pathToFileURL(path.join(repo,'scripts/lib/reading-view-bundle.mjs')).href)};renderReadingBundle(process.argv[1],process.argv[2],{afterWrite(){process.exit(97)}});`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',script,f.root,cp],{encoding:'utf8'});assert.equal(r.status,97,r.stderr);
  assert.ok(existsSync(path.join(f.root,'docs/.scratch/demo/reading/.transaction.json')));assert.equal(existsSync(path.join(f.root,manifest)),false);
  assert.equal(renderReadingBundle(f.root,cp).status,'rendered');assert.ok(existsSync(path.join(f.root,manifest)));assert.equal(existsSync(path.join(f.root,'docs/.scratch/demo/reading/.transaction.json')),false);
 }finally{f.cleanup();}
});
test('formal comparison is immutable and includes complete business and binding changes',()=>{
 const f=setup();try{
  const before='docs/.scratch/demo/plan/before.yaml',after='docs/.scratch/demo/plan/domain-strategy.yaml';f.put(before,f.strategy);f.strategy.domain_version='v999';f.strategy.scenarios[0].failure_results=['删除被引用对象必须拒绝'];f.put(after,f.strategy);
  const args=['prepare-review',before,after,'--kind','domain-strategy','--checkpoint',cp,'--json'];let r=f.cli(...args);assert.equal(r.status,0,r.stderr+r.stdout);
  const saved=JSON.parse(r.stdout).saved_comparison,text=readFileSync(path.join(f.root,saved.ref),'utf8');assert.match(text,/删除被引用对象必须拒绝/);
  r=f.cli(...args);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).saved_comparison.status,'unchanged');assert.equal(readFileSync(path.join(f.root,saved.ref),'utf8'),text);
 }finally{f.cleanup();}
});
