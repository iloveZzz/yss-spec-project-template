import {loadOrchestrationContract} from '../../lib/orchestration-contract.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,cpSync} from 'node:fs';
import path from 'node:path';
import {readingFixture,repo} from './fixture.mjs';
const cp='.work/demo/checkpoint.yaml';
// 历史 stage-gates-v1 注册布局回归，不消费 matt-spec-v1 默认 Profile。
function registeredReading(checkpoint='intake-checkpoint.json'){
 const f=readingFixture(),owner=repo;
 const profile={schema_version:3,profile_id:'harness.spec-template',required_capabilities:['role-independent-governance-v1','stage-gates-v1']};
 f.put('.template-spec/process/harness-profile.yaml',profile);
 const contract='.template-spec/process/orchestration-contract.yaml';f.put(contract,JSON.stringify(loadOrchestrationContract(ref=>readFileSync(path.join(owner,ref)),contract).value));
 f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
 const c=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));c.schema_version=2;c.feature_id='feature.supplier';c.artifacts={};f.put(checkpoint,JSON.stringify(c));
 f.put('.work/supplier/map.md','---\ncheckpoint_ref: '+checkpoint+'\n---\n# 当前功能\n');
 return {...f,checkpoint};
}
test('historical stage-gates Spec reading separates canonical ID and checkpoint directory',async()=>{
 const {readingLocation}=await import('../../lib/reading-view-policy.mjs');const f=registeredReading();
 try{assert.deepEqual(readingLocation(f.root,f.checkpoint),{feature:'feature.supplier',base:'.work/supplier',directory:'.work/supplier/reading'});}finally{f.cleanup();}
});

test('historical registered reading refuses missing, duplicate and conflicting maps and unsupported declared policies',async()=>{
 const {readingLocation}=await import('../../lib/reading-view-policy.mjs');const {rmSync}=await import('node:fs');
 for(const scenario of ['missing','duplicate','wrong-checkpoint','wrong-tracker','unknown-version','null-policy','legacy-profile','legacy-checkpoint']){
  const f=registeredReading();try{
   const contract='.template-spec/process/orchestration-contract.yaml';
   if(scenario==='missing')rmSync(path.join(f.root,'.work/supplier/map.md'));
   if(scenario==='duplicate')f.put('.work/duplicate/map.md','---\ncheckpoint_ref: '+f.checkpoint+'\n---\n');
   if(scenario==='wrong-checkpoint'){f.put('other-checkpoint.json',readFileSync(path.join(f.root,f.checkpoint),'utf8'));f.put('.work/supplier/map.md','---\ncheckpoint_ref: other-checkpoint.json\n---\n');}
   if(scenario==='wrong-tracker')f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: elsewhere\n---\n');
   if(scenario==='legacy-profile')f.put('.template-spec/process/harness-profile.yaml',{schema_version:1,profile_id:'harness.spec-template'});
   if(scenario==='legacy-checkpoint'){const c=JSON.parse(readFileSync(path.join(f.root,f.checkpoint),'utf8'));c.schema_version=1;f.put(f.checkpoint,c);}
   if(scenario==='unknown-version'||scenario==='null-policy'){
    const {parseSliceYaml}=await import('../../lib/slice-contract.mjs'),value=parseSliceYaml(readFileSync(path.join(f.root,contract)));
    if(scenario==='unknown-version')value.progression_target.schema_version=99;else value.progression_target=null;f.put(contract,value);
   }
   const expected=['unknown-version','null-policy','legacy-profile'].includes(scenario)?/reading-capability-unsupported/:scenario==='legacy-checkpoint'?/reading-feature-identity/:/reading-feature-registration-not-unique/;
   assert.throws(()=>readingLocation(f.root,f.checkpoint),expected,scenario);
  }finally{f.cleanup();}
 }
});
test('historical reading policy root references retain traversal and absolute-path rejection',async()=>{
 const {readingPolicy}=await import('../../lib/reading-view-policy.mjs');const f=registeredReading();try{
  for(const ref of ['intake-checkpoint.json','.work/demo/中文 状态.json']){
   f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[ref]});assert.deepEqual(readingPolicy(f.root).checkpoints,[ref]);
  }
  for(const ref of ['../checkpoint.json','/checkpoint.json','a/../checkpoint.json','a\\checkpoint.json']){
   f.put('.template-spec/process/reading-policy.yaml',{schema_version:1,mode:'managed',checkpoints:[ref]});assert.throws(()=>readingPolicy(f.root),/schema|Schema|pattern|不匹配/);
  }
 }finally{f.cleanup();}
});
function setup(){const f=readingFixture();const c=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));c.artifacts={'artifact.domain-strategy':{ref:'.work/demo/plan/domain-strategy.yaml',status:'draft',evidence_refs:[]}};f.put(cp,c);return f;}
const {schemaBatch}=await import('../../lib/strategic-handoff-io.mjs');
const {spawnSync}=await import('node:child_process');
const {pathToFileURL}=await import('node:url');
const {writeFileSync,mkdtempSync,rmSync,symlinkSync,mkdirSync}=await import('node:fs');
const {tmpdir}=await import('node:os');
const bundleUrl=pathToFileURL(path.join(repo,'scripts/lib/reading-view-bundle.mjs')).href;
// 在子进程里运行：既能替换 yss 可执行文件，又不污染当前进程已缓存的能力协商结果。
function inChild(code,args,environment){
 const run=spawnSync(process.execPath,['--input-type=module','-e',`import * as bundle from ${JSON.stringify(bundleUrl)};const [root,checkpoint]=process.argv.slice(1);${code}`,...args],{encoding:'utf8',env:{...process.env,...environment}});
 assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);
}

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
