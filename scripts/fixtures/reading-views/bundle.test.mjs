import {loadOrchestrationContract} from '../../lib/orchestration-contract.mjs';
import test from 'node:test';
import {composeProfileTree} from '../../lib/profile-tree.mjs';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,cpSync} from 'node:fs';
import path from 'node:path';
import {readingFixture,repo} from './fixture.mjs';
const cp='.work/demo/checkpoint.yaml';
function registeredReading(profile='spec',checkpoint='intake-checkpoint.json'){
 const f=readingFixture(),owner=profile==='design'?composeProfileTree('design'):repo;
 if(profile==='spec')f.put('.template-spec/process/harness-profile.yaml',{schema_version:1,profile_id:'harness.spec-template'});else f.put('.template-spec/process/harness-profile.yaml',readFileSync(path.join(owner,'.template-spec/process/harness-profile.yaml'),'utf8'));
 const contract='.template-spec/process/orchestration-contract.yaml';f.put(contract,JSON.stringify(loadOrchestrationContract(ref=>readFileSync(path.join(owner,ref)),contract).value));
 f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
 const c=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));c.feature_id='feature.supplier';c.artifacts={};f.put(checkpoint,JSON.stringify(c));
 f.put('.work/supplier/map.md','---\ncheckpoint_ref: '+checkpoint+'\n---\n# 当前功能\n');
 return {...f,checkpoint};
}
test('current registered reading separates canonical ID and root Design checkpoint directory',async()=>{
 const {readingLocation}=await import('../../lib/reading-view-policy.mjs');const f=registeredReading('design');
 try{assert.deepEqual(readingLocation(f.root,f.checkpoint),{feature:'feature.supplier',base:'.work/supplier',directory:'.work/supplier/reading'});}finally{f.cleanup();}
});

test('registered reading refuses missing, duplicate and conflicting maps and unsupported declared policies',async()=>{
 const {readingLocation}=await import('../../lib/reading-view-policy.mjs');const {rmSync}=await import('node:fs');
 for(const scenario of ['missing','duplicate','wrong-checkpoint','wrong-tracker','unknown-version','null-policy']){
  const f=registeredReading();try{
   const contract='.template-spec/process/orchestration-contract.yaml';
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
  for(const ref of ['intake-checkpoint.json','.work/demo/中文 状态.json']){
   f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[ref]});assert.deepEqual(readingPolicy(f.root).checkpoints,[ref]);
  }
  for(const ref of ['../checkpoint.json','/checkpoint.json','a/../checkpoint.json','a\\checkpoint.json']){
   f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[ref]});assert.throws(()=>readingPolicy(f.root),/schema|Schema|pattern|不匹配/);
  }
 }finally{f.cleanup();}
});
function setup(){const f=readingFixture();const c=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));c.artifacts={'artifact.domain-strategy':{ref:'.work/demo/plan/domain-strategy.yaml',status:'draft',evidence_refs:[]}};f.put(cp,c);return f;}

// ---- managed 阅读视图：渲染、校验与启用由固定的 yss 完成，下面是对固定 yss 的集成用例 ----
const {readingInstance,checkpoint:icp,manifest:imanifest}=await import('./instance.mjs');
const {schemaBatch}=await import('../../lib/strategic-handoff-io.mjs');
const {spawnSync}=await import('node:child_process');
const {pathToFileURL}=await import('node:url');
const {writeFileSync,mkdtempSync,rmSync,symlinkSync,mkdirSync}=await import('node:fs');
const {tmpdir}=await import('node:os');
const bundleUrl=pathToFileURL(path.join(repo,'scripts/lib/reading-view-bundle.mjs')).href;
const managedPolicy=(f,checkpoints=[icp])=>f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints});
// 在子进程里运行：既能替换 yss 可执行文件，又不污染当前进程已缓存的能力协商结果。
function inChild(code,args,environment){
 const run=spawnSync(process.execPath,['--input-type=module','-e',`import * as bundle from ${JSON.stringify(bundleUrl)};const [root,checkpoint]=process.argv.slice(1);${code}`,...args],{encoding:'utf8',env:{...process.env,...environment}});
 assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);
}

test('yss renders an idempotent v2 bundle without navigation self-dependency for spec and design',async()=>{
 const {renderReadingBundle,checkReadingViews}=await import('../../lib/reading-view-bundle.mjs');
 for(const profile of ['spec','design']){
  const f=readingInstance({profile});managedPolicy(f);
  f.put('.work/other/map.md','---\ncheckpoint_ref: .work/other/checkpoint.json\n---\n');f.put('.work/other/checkpoint.json',{feature_id:'feature.other'});
  assert.equal(renderReadingBundle(f.root,icp).status,'rendered',profile);
  const before=readFileSync(path.join(f.root,imanifest)),m=JSON.parse(before);
  assert.equal(m.schema_version,2);assert.deepEqual(Object.keys(m.renderer),['id','rules_version']);assert.equal(m.renderer.id,'yss-reading');assert.ok(Number.isInteger(m.renderer.rules_version)&&m.renderer.rules_version>=1);
  assert.ok(!m.dependencies.some(row=>row.ref==='.work/demo/map.md'));assert.ok(m.dependencies.some(row=>row.ref==='.work/other/map.md'));
  assert.ok(m.dependencies.every(row=>row.scope==='project'),'v2 依赖只含项目文件');
  assert.equal(checkReadingViews(f.root,icp,{required:true}).status,'current');
  assert.equal(renderReadingBundle(f.root,icp).status,'unchanged');assert.deepEqual(readFileSync(path.join(f.root,imanifest)),before);
 }
});
test('an instance whose manifest schema is still v1-only keeps receiving v1 manifests from yss',async()=>{
 const {renderReadingBundle,checkReadingViews}=await import('../../lib/reading-view-bundle.mjs');
 const f=readingInstance({manifestSchema:'v1'});managedPolicy(f);
 assert.equal(renderReadingBundle(f.root,icp).status,'rendered');
 const m=JSON.parse(f.read(imanifest));assert.equal(m.schema_version,1);assert.ok(Object.values(m.renderer).every(value=>/^sha256:[a-f0-9]{64}$/.test(value)));
 assert.equal(checkReadingViews(f.root,icp,{required:true}).status,'current');
});
test('a v1 manifest whose Node renderer closure is gone must be migrated by yss, not accepted or downgraded',async()=>{
 const {renderReadingBundle,checkReadingViews}=await import('../../lib/reading-view-bundle.mjs');
 const f=readingInstance({manifestSchema:'v1'});managedPolicy(f);renderReadingBundle(f.root,icp);
 const v1=readFileSync(path.join(f.root,imanifest));
 assert.equal(JSON.parse(v1).schema_version,1);
 for(const ref of Object.keys(JSON.parse(v1).renderer))rmSync(path.join(f.root,ref),{force:true});
 const result=checkReadingViews(f.root,icp,{required:true});
 assert.equal(result.status,'stale');assert.ok(result.blockers.some(row=>/reading-manifest-migration-required/.test(row)),JSON.stringify(result));
 // 先升级模板的清单 schema，再由 yss 迁移：只重写清单，输出与导航保持字节不变。
 cpSync(path.join(repo,'.template-spec/process/schemas/reading-manifest.schema.json'),path.join(f.root,'.template-spec/process/schemas/reading-manifest.schema.json'));
 const outputs=Object.keys(JSON.parse(v1).outputs),keep=outputs.map(ref=>readFileSync(path.join(f.root,ref)));
 assert.deepEqual(renderReadingBundle(f.root,icp).changed_refs,[imanifest]);
 outputs.forEach((ref,index)=>assert.deepEqual(readFileSync(path.join(f.root,ref)),keep[index]));
 assert.equal(JSON.parse(f.read(imanifest)).schema_version,2);assert.equal(checkReadingViews(f.root,icp,{required:true}).status,'current');
});
test('explicit enable plan protects manual map text and produces a deterministic current bundle',()=>{
 const f=readingInstance();
 f.put('.work/demo/map.md',`---\ncheckpoint_ref: ${icp}\n---\n# 人工导航\n\n保持我的说明。\n`);
 assert.equal(f.cli('check-views','--checkpoint',icp,'--json').status,0);
 let r=f.cli('plan-enable','--checkpoint',icp,'--output','enable.json','--json');assert.equal(r.status,0,r.stderr);
 assert.equal(existsSync(path.join(f.root,imanifest)),false);assert.equal(JSON.parse(f.read('enable.json')).kind,'reading-enable-plan');
 r=f.cli('apply-enable','enable.json','--json');assert.equal(r.status,0,r.stderr+r.stdout);assert.equal(JSON.parse(r.stdout).status,'enabled');
 const before=readFileSync(path.join(f.root,imanifest));assert.match(f.read('.work/demo/map.md'),/保持我的说明/);
 r=f.cli('check-views','--checkpoint',icp,'--json');assert.equal(r.status,0,r.stderr+r.stdout);assert.equal(JSON.parse(r.stdout).status,'current');
 r=f.cli('render','--checkpoint',icp,'--json');assert.equal(r.status,0,r.stderr);assert.deepEqual(readFileSync(path.join(f.root,imanifest)),before);
 f.strategy.scenarios[0].failure_results=['被引用也允许删除'];f.put('.work/demo/plan/domain-strategy.yaml',f.strategy);
 r=f.cli('check-views','--checkpoint',icp,'--json');assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).status,'stale');
 r=f.cli('render','--checkpoint',icp,'--json');assert.equal(r.status,0,r.stderr);
 f.put('.work/demo/reading/domain-strategy.review.md','人工意见');
 r=f.cli('render','--checkpoint',icp,'--json');assert.equal(r.status,1);assert.match(r.stderr,/READING_OUTPUT_CONFLICT/);
 assert.equal(f.read('.work/demo/reading/domain-strategy.review.md'),'人工意见');
});
test('a stale enable plan, a Node-era journal, an unowned symlink and a hand-edited navigation block are refused and preserved',async()=>{
 const {renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');const f=readingInstance();
 assert.equal(f.cli('plan-enable','--checkpoint',icp,'--output','enable.json').status,0);f.put('CONTEXT.md',f.read('CONTEXT.md')+'\n新增说明。\n');
 // Context 不是批准，但它是阅读包的显式依赖：计划生成后来源变化，应用必须拒绝。
 const stalePlan=f.cli('apply-enable','enable.json');assert.equal(stalePlan.status,1);assert.match(stalePlan.stderr,/READING_ENABLE_PLAN_STALE/);
 const dir=path.join(f.root,'.work/demo/reading');mkdirSync(dir,{recursive:true});
 // Node 渲染器遗留的锁与日志：yss 只拒绝，不覆盖也不恢复，由原渲染器处理。
 f.put('.work/demo/reading/.lock',JSON.stringify({pid:process.pid}));assert.throws(()=>renderReadingBundle(f.root,icp),/READING_LEGACY_JOURNAL/);
 rmSync(path.join(dir,'.lock'));
 symlinkSync(path.join(f.root,'CONTEXT.md'),path.join(dir,'status.review.md'));assert.throws(()=>renderReadingBundle(f.root,icp),/拒绝符号链接/);
 rmSync(path.join(dir,'status.review.md'));
 managedPolicy(f);assert.equal(renderReadingBundle(f.root,icp).status,'rendered');
 const map='.work/demo/map.md';f.put(map,f.read(map).replace('## 阅读导航','## 人工改写'));
 assert.throws(()=>renderReadingBundle(f.root,icp),/READING_(OUTPUT|NAVIGATION)_CONFLICT/);assert.match(f.read(map),/人工改写/);
 f.put(imanifest,'broken');assert.throws(()=>renderReadingBundle(f.root,icp),/READING_MANIFEST_INVALID/);assert.equal(f.read(imanifest),'broken');
});
test('a leftover Node journal makes the bundle incomplete for validation as well',async()=>{
 const {renderReadingBundle,checkReadingViews}=await import('../../lib/reading-view-bundle.mjs');const f=readingInstance();managedPolicy(f);
 renderReadingBundle(f.root,icp);f.put('.work/demo/reading/.transaction.json','{}');
 const result=checkReadingViews(f.root,icp);assert.equal(result.status,'stale');assert.ok(result.blockers.some(row=>/reading-update-incomplete|READING_INCOMPLETE/.test(row)),JSON.stringify(result));
});
test('adding or changing project display names invalidates the reading bundle',async()=>{
 const {renderReadingBundle,checkReadingViews}=await import('../../lib/reading-view-bundle.mjs');const f=readingInstance();managedPolicy(f);
 renderReadingBundle(f.root,icp);assert.equal(checkReadingViews(f.root,icp,{required:true}).status,'current');
 const ref='.template-spec/process/lifecycle-registry.yaml';
 f.put(ref,f.read(ref).replace('name: 入口分诊','name: 名称已变'));
 assert.notEqual(checkReadingViews(f.root,icp,{required:true}).status,'current');
 renderReadingBundle(f.root,icp);assert.equal(checkReadingViews(f.root,icp,{required:true}).status,'current');
});
test('root Design checkpoint review preparation retains managed missing and stale reading gaps',async()=>{
 const {prepareContractReview}=await import('../../lib/contract-review-preparation.mjs');
 const {readingCheckpointsForAsset,renderReadingBundle}=await import('../../lib/reading-view-bundle.mjs');
 const f=readingInstance({profile:'design'});managedPolicy(f);
 assert.deepEqual(readingCheckpointsForAsset(f.root,icp,'checkpoint'),[icp]);
 const prepare=()=>prepareContractReview(icp,icp,{root:f.root,kind:'checkpoint'});
 assert.ok(prepare().gaps.some(row=>row.code==='READING_VIEWS_STALE'),'missing managed bundle must block review preparation');
 renderReadingBundle(f.root,icp);
 assert.ok(!prepare().gaps.some(row=>row.code==='READING_VIEWS_STALE'),'current managed bundle must remain usable');
 f.put(icp,f.read(icp)+'\n');
 const before=readFileSync(path.join(f.root,icp));
 assert.ok(prepare().gaps.some(row=>row.code==='READING_VIEWS_STALE'),'stale managed bundle must block review preparation');
 assert.deepEqual(readFileSync(path.join(f.root,icp)),before);
});
test('preparation rejects a stale managed bundle through the public API',async()=>{
 const {prepareContractReview}=await import('../../lib/contract-review-preparation.mjs');const f=readingInstance();
 const r0=f.enable();assert.equal(r0.plan.status,0,r0.plan.stderr);assert.equal(r0.apply.status,0,r0.apply.stderr);
 const ref='.work/demo/plan/domain-strategy.yaml';f.put('old.yaml',f.strategy);f.strategy.domain_version='v999';f.put(ref,f.strategy);
 const r=prepareContractReview('old.yaml',ref,{root:f.root,kind:'domain-strategy'});assert.ok(r.gaps.some(x=>x.code==='READING_VIEWS_STALE'));
});
test('successful tracking source transaction survives a presentation conflict and is not reapplied',async()=>{
 const {planTracking,applyTracking}=await import('../../lib/stage-tracking-migration.mjs');const {parseYaml}=await import('../../lib/stage-tracking.mjs');const f=readingInstance();
 const c=JSON.parse(f.read(icp));c.stage='stage.plan';c.next_work_unit='work-unit.plan-requirements';f.put(icp,JSON.stringify(c));
 const enabled=f.enable();assert.equal(enabled.apply.status,0,enabled.apply.stderr);
 f.put('.work/demo/reading/status.review.md','人工补充，不得覆盖');
 const plan=planTracking(f.root,{checkpoint_ref:icp,items:[{id:'review-rules',title:'规则',owner:'负责人',scope:'规则范围',stage:'stage.plan',work_unit:'work-unit.plan-requirements',acceptance:['确认失败场景']}]});
 const applied=applyTracking(f.root,plan);assert.equal(applied.source_operation,'applied');assert.equal(applied.reading_update.status,'failed');assert.match(applied.reading_update.error,/READING_OUTPUT_CONFLICT/);
 assert.equal(parseYaml(f.read(icp)).stage_tracking.items[0].id,'review-rules');
 const repeated=applyTracking(f.root,plan);assert.equal(repeated.source_operation,'unchanged');assert.equal(repeated.reading_update.status,'failed');
 assert.equal(f.read('.work/demo/reading/status.review.md'),'人工补充，不得覆盖');
});
test('registered handoff rejects stale reading and unmanaged checkpoints stay unaffected',async()=>{
 const {assertReadingTransition}=await import('../../lib/reading-view-bundle.mjs');const f=readingInstance();
 assert.equal(assertReadingTransition(f.root,{checkpoint_ref:icp}).status,'manual');
 const enabled=f.enable();assert.equal(enabled.apply.status,0,enabled.apply.stderr);
 assert.equal(assertReadingTransition(f.root,{checkpoint_ref:icp}).status,'current');
 f.put('CONTEXT.md','词汇正文变化');assert.throws(()=>assertReadingTransition(f.root,{checkpoint_ref:icp}),/reading-views-stale/);
});
test('a managed checkpoint in the legacy layout is refused by yss and fails closed instead of crashing',async()=>{
 const {checkReadingViews,renderReadingBundle,assertReadingTransition}=await import('../../lib/reading-view-bundle.mjs');const f=readingInstance();
 const legacy=JSON.parse(f.read(icp));delete legacy.feature_id;f.put(icp,JSON.stringify(legacy));managedPolicy(f);
 const result=checkReadingViews(f.root,icp);assert.equal(result.status,'stale');assert.ok(result.blockers.some(row=>/TRACKING_FEATURE/.test(row)),JSON.stringify(result));
 assert.throws(()=>assertReadingTransition(f.root,{checkpoint_ref:icp}),/reading-views-stale.*TRACKING_FEATURE/);
 assert.throws(()=>renderReadingBundle(f.root,icp),/TRACKING_FEATURE/);
 assert.equal(existsSync(path.join(f.root,imanifest)),false);
});

// ---- 薄壳边界：manual 实例不依赖 yss；缺少能力的 yss 对 managed 不可用且不回退 ----
test('manual instances never reach for yss: no negotiation, no reading command',async()=>{
 const f=readingInstance();
 const missing={YSS_NATIVE_BINARY:'/nonexistent/yss',YSS_BINARY:'',YSS_NATIVE_BINARY_SHA256:''};
 const code=`process.stdout.write(JSON.stringify({check:bundle.checkReadingViews(root,checkpoint).status,transition:bundle.assertReadingTransition(root,{checkpoint_ref:checkpoint}).status,finalized:bundle.finalizeReading(root,checkpoint,{status:'applied'}).reading_update.status,affected:process.argv[3]==='skip-affected'?[]:bundle.readingCheckpointsForAsset(root,checkpoint,'checkpoint')}));`;
 const expected={check:'manual',transition:'manual',finalized:'manual',affected:[]};
 assert.deepEqual(inChild(code,[f.root,icp],missing),expected,'默认策略');
 // managed 策略但没有列出这个 checkpoint：校验、流转与收尾同样不需要 yss；受影响查询在策略受管时需要 yss，只有列表为空时才短路。
 managedPolicy(f,['.work/elsewhere/checkpoint.json']);assert.deepEqual(inChild(code,[f.root,icp,'skip-affected'],missing),expected,'其他 checkpoint 受管');
 managedPolicy(f,[]);assert.deepEqual(inChild(code,[f.root,icp],missing),expected,'空 checkpoint 列表');
 const cli=spawnSync(process.execPath,[path.join(repo,'scripts/contract'),'check-views','--checkpoint',icp,'--root',f.root,'--json'],{encoding:'utf8',env:{...process.env,...missing}});
 assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).status,'manual');
});
test('a yss without the reading tokens is unusable for managed instances and never falls back to Node',()=>{
 const f=readingInstance();managedPolicy(f);f.put('enable.json','{}');
 const dir=mkdtempSync(path.join(tmpdir(),'yss-old-')),fake=path.join(dir,'yss');
 try{
  const nodeDelegation=['governance.validation-dependencies.v1','handoff.package-identity.v1'];
  writeFileSync(fake,`#!/usr/bin/env node\nconst args=process.argv.slice(2);if(args[0]==='capabilities'){process.stdout.write(JSON.stringify({outputVersion:1,protocolVersion:1,command:'capabilities',status:'ok',code:'OK',result:{nodeDelegation:${JSON.stringify(nodeDelegation)}}}));}else{process.stderr.write('旧 yss 不应被调用: '+args.join(' '));process.exit(9);}\n`,{mode:0o755});
  const code=`const attempt=run=>{try{return run();}catch(error){return {threw:error.message};}};
   process.stdout.write(JSON.stringify({check:attempt(()=>bundle.checkReadingViews(root,checkpoint)),render:attempt(()=>bundle.renderReadingBundle(root,checkpoint)),plan:attempt(()=>bundle.planEnableReading(root,checkpoint)),apply:attempt(()=>bundle.applyEnableReading(root,'enable.json')),affected:attempt(()=>bundle.readingCheckpointsForAsset(root,checkpoint,'checkpoint')),elsewhere:attempt(()=>bundle.checkReadingViews(root,'.work/elsewhere/checkpoint.json')).status}));`;
  const out=inChild(code,[f.root,icp],{YSS_NATIVE_BINARY:fake,YSS_BINARY:'',YSS_NATIVE_BINARY_SHA256:''});
  assert.equal(out.check.status,'stale');assert.match(out.check.blockers[0],/NATIVE_CAPABILITY.*reading\.views\.v1.*升级/);
  assert.match(out.render.threw,/NATIVE_CAPABILITY.*reading\.render\.v1.*升级/);
  assert.match(out.plan.threw,/NATIVE_CAPABILITY.*reading\.enable\.v1/);assert.match(out.apply.threw,/NATIVE_CAPABILITY.*reading\.enable\.v1/);
  assert.match(out.affected.threw,/NATIVE_CAPABILITY.*reading\.views\.v1/);
  assert.equal(out.elsewhere,'manual','未受管的 checkpoint 仍然可用');
  assert.equal(existsSync(path.join(f.root,imanifest)),false,'不得回退到 Node 渲染');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// ---- 清单 schema：oneOf(v1, v2)，与 yss 的 v2 校验保持一致 ----
test('reading manifest schema accepts exactly v1 (renderer closure) and v2 (yss renderer id and rules version)',()=>{
 const ref='.template-spec/process/schemas/reading-manifest.schema.json',digest='sha256:'+'0'.repeat(64);
 const base=(version,renderer)=>({schema_version:version,checkpoint_ref:'a/checkpoint.yaml',renderer,dependencies:[{scope:'project',ref:'a',digest},{scope:'project',ref:'b',digest:null}],outputs:{'a/reading/status.review.md':digest},navigation:{ref:'a/map.md',block_digest:digest},diagnostics:[]});
 const v1=renderer=>base(1,renderer),v2=renderer=>base(2,renderer),yss={id:'yss-reading',rules_version:1};
 const valid=(value,name)=>assert.doesNotThrow(()=>schemaBatch([[value,ref]]),name);
 const invalid=(value,name)=>assert.throws(()=>schemaBatch([[value,ref]]),/schema/,name);
 valid(v1({'scripts/contract':digest}),'v1');valid(v1({}),'v1 空闭包');valid(v2(yss),'v2');valid(v2({...yss,rules_version:7}),'v2 更高规则版本由 yss 判断');
 invalid(base(3,yss),'未知版本');invalid(base(0,yss),'版本 0');invalid(base('2',yss),'字符串版本');invalid({...v2(yss),schema_version:undefined},'缺版本');
 invalid(v1(yss),'v1 不接受 v2 渲染器');invalid(v2({'scripts/contract':digest}),'v2 不接受工具闭包');invalid(v2({}),'v2 空渲染器');
 invalid(v2({id:'yss-reading'}),'缺 rules_version');invalid(v2({rules_version:1}),'缺 id');invalid(v2({...yss,extra:1}),'渲染器多余键');
 invalid(v2({id:'node-reading',rules_version:1}),'错误的渲染器 id');
 for(const version of [0,-1,1.5,'1',null])invalid(v2({id:'yss-reading',rules_version:version}),`rules_version=${version}`);
 invalid({...v2(yss),extra:1},'顶层多余键');invalid({...v1({}),extra:1},'v1 顶层多余键');
 for(const key of ['checkpoint_ref','renderer','dependencies','outputs','navigation','diagnostics']){const value=v2(yss);delete value[key];invalid(value,`v2 缺 ${key}`);}
 invalid({...v2(yss),dependencies:[{scope:'other',ref:'a',digest}]},'依赖 scope');invalid({...v2(yss),dependencies:[{scope:'project',ref:'a'}]},'依赖缺 digest');
 invalid({...v2(yss),outputs:{x:'sha256:zz'}},'输出摘要');invalid({...v2(yss),navigation:{ref:'a/map.md'}},'导航缺摘要');invalid({...v2(yss),diagnostics:[{ref:'a'}]},'诊断缺 reason');
});

test('formal comparison is immutable and includes complete business and binding changes',()=>{
 const f=setup();try{
  const before='.work/demo/plan/before.yaml',after='.work/demo/plan/domain-strategy.yaml';f.put(before,f.strategy);f.strategy.domain_version='v999';f.strategy.scenarios[0].failure_results=['删除被引用对象必须拒绝'];f.put(after,f.strategy);
  const args=['prepare-review',before,after,'--kind','domain-strategy','--checkpoint',cp,'--json'];let r=f.cli(...args);assert.equal(r.status,0,r.stderr+r.stdout);
  const saved=JSON.parse(r.stdout).saved_comparison,text=readFileSync(path.join(f.root,saved.ref),'utf8');assert.match(text,/删除被引用对象必须拒绝/);
  r=f.cli(...args);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).saved_comparison.status,'unchanged');assert.equal(readFileSync(path.join(f.root,saved.ref),'utf8'),text);
 }finally{f.cleanup();}
});
