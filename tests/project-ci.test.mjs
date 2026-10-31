import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse } from '../scripts/vendor/yaml.mjs';
import {initializeNative} from '../.template-source/scripts/lib/native-yss.mjs';

const source=process.cwd();
let nativeMetadata, nativeProfile, nativeIdentity;
function fixture(t) {
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'project-ci-test-')));
  if(!nativeMetadata) {
    const seed=path.join(root,'seed');
    initializeNative('spec',seed);
    nativeMetadata=fs.readFileSync(path.join(seed,'.yss.json'));
    nativeProfile=fs.readFileSync(path.join(seed,'.template-spec/process/harness-profile.yaml'));
    nativeIdentity=fs.readFileSync(path.join(seed,'yss-project.yaml'));
    fs.rmSync(seed,{recursive:true});
  }
  fs.writeFileSync(path.join(root,'.yss.json'),nativeMetadata);
  t.after(()=>fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
  const write=(ref,bytes)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
  write('.template-spec/process/harness-profile.yaml',nativeProfile);
  write('yss-project.yaml',nativeIdentity);
  for(const ref of ['CONTEXT.md','.template-spec/agents/issue-tracker.md'])write(ref,fs.readFileSync(ref));
  write('business.md','用户业务原文');write('.github/workflows/user.yml','name: user-owned\n');
  const run=(...args)=>spawnSync(process.execPath,[path.join(source,'scripts/project-ci'),...args,'--root',root],{encoding:'utf8',maxBuffer:16*1024*1024});
  const install=()=>{const r=run('plan','--provider','github','--branch','main');assert.equal(r.status,0,r.stderr);write('plan.json',r.stdout);const a=run('apply','--plan',path.join(root,'plan.json'));assert.equal(a.status,0,a.stderr);return JSON.parse(r.stdout);};
  return {root,write,run,install};
}
test('CI 显式接入只管理自身文件，重复应用幂等，人工修改保留',t=>{
  const f=fixture(t),before=fs.readFileSync(path.join(f.root,'.github/workflows/user.yml'));
  const p=f.install();assert.equal(p.kind,'project-ci-plan');
  const workflow=fs.readFileSync(path.join(f.root,'.github/workflows/yss-governance.yml'),'utf8');
  assert.match(workflow,/YSS governance/);assert.match(workflow,/pull_request/);assert.match(workflow,/BASE_SHA/);
  assert.equal(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
  assert.deepEqual(fs.readFileSync(path.join(f.root,'.github/workflows/user.yml')),before);
  f.write('.github/workflows/yss-governance.yml',workflow+'# 人工修改\n');
  assert.notEqual(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
  assert.match(fs.readFileSync(path.join(f.root,'.github/workflows/yss-governance.yml'),'utf8'),/人工修改/);
});
test('当前治理身份可接入，缺失、未知、非法、模板源或链接身份拒绝且只读',t=>{
  const f=fixture(t),identity=path.join(f.root,'yss-project.yaml');
  assert.equal(parse(fs.readFileSync(identity,'utf8')).schema_version,2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,'.yss.json'))).distribution.installation,'governed');
  const plan=f.run('plan');assert.equal(plan.status,0,plan.stderr);f.write('plan.json',plan.stdout);
  const tree=()=>fs.readdirSync(f.root,{recursive:true}).sort().map(ref=>{
    const file=path.join(f.root,ref),stat=fs.lstatSync(file);
    return [ref,stat.mode&0o777,stat.isSymbolicLink()?fs.readlinkSync(file):stat.isFile()?createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null];
  });
  const invalid=[null,{schema_version:3,repository_mode:'project-instance'},{schema_version:'2',repository_mode:'project-instance'},{schema_version:2,repository_mode:'unknown'},{schema_version:1,repository_mode:'project-instance',extra:true},{schema_version:1,repository_mode:'template-source'},{schema_version:2,repository_mode:'template-source'},'linked'];
  for(const value of invalid){
    fs.rmSync(identity,{force:true});
    if(value==='linked'){f.write('identity-source.yaml',nativeIdentity);fs.symlinkSync(path.join(f.root,'identity-source.yaml'),identity);}
    else if(value!==null)f.write('yss-project.yaml',JSON.stringify(value));
    const before=tree();
    for(const args of [['plan'],['apply','--plan',path.join(f.root,'plan.json')],['apply','--recover'],['check','--json']]){
      const result=f.run(...args);assert.notEqual(result.status,0,`${JSON.stringify(value)}: ${args.join(' ')}`);assert.deepEqual(tree(),before);
    }
  }
});
test('同名未托管文件、过期计划和篡改计划不写入',t=>{
  const f=fixture(t);f.write('.github/workflows/yss-governance.yml','manual');
  const conflict=f.run('plan','--provider','github');assert.equal(conflict.status,1);assert.ok(JSON.parse(conflict.stdout).conflicts.length);
  fs.unlinkSync(path.join(f.root,'.github/workflows/yss-governance.yml'));
  const plan=JSON.parse(f.run('plan','--provider','github').stdout);
  f.write('plan.json',JSON.stringify({...plan,branch:'evil'}));assert.notEqual(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
  f.write('plan.json',JSON.stringify(plan));f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: docs/other}\n---\n');
  assert.notEqual(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
  assert.equal(fs.existsSync(path.join(f.root,'.github/workflows/yss-governance.yml')),false);
});

test('事务中断恢复与恢复冲突保留已有文件',t=>{
  const f=fixture(t),plan=JSON.parse(f.run('plan').stdout);
  const journal={schema_version:1,kind:'project-ci-transaction',plan_digest:plan.plan_digest,files:plan.outputs.map(x=>({ref:x.ref,before:null,before_digest:null,after_digest:x.sha256}))};
  f.write('.template-spec/process/.project-ci-transaction.json',JSON.stringify(journal));
  f.write(plan.outputs[0].ref,plan.outputs[0].content);
  assert.equal(f.run('apply','--recover').status,0);
  assert.equal(fs.existsSync(path.join(f.root,plan.outputs[0].ref)),false);
  assert.equal(fs.readFileSync(path.join(f.root,'.github/workflows/user.yml'),'utf8'),'name: user-owned\n');
  f.write('.template-spec/process/.project-ci-transaction.json',JSON.stringify(journal));
  f.write(plan.outputs[0].ref,'人工后续修改');
  assert.notEqual(f.run('apply','--recover').status,0);
  assert.equal(fs.readFileSync(path.join(f.root,plan.outputs[0].ref),'utf8'),'人工后续修改');
  assert.equal(fs.existsSync(path.join(f.root,'.template-spec/process/.project-ci-transaction.json')),true);
});
test('应用中实际写入失败回滚，不留下半套 CI',t=>{
  const f=fixture(t),plan=JSON.parse(f.run('plan').stdout);f.write('plan.json',JSON.stringify(plan));
  const program=`import fs from 'node:fs';import {applyProjectCi} from ${JSON.stringify('file://'+source+'/scripts/lib/project-ci-install.mjs')};const rename=fs.renameSync;let n=0;fs.renameSync=(...args)=>{if(++n===2)throw new Error('injected write failure');return rename(...args);};try{applyProjectCi({root:process.argv[1],plan:JSON.parse(fs.readFileSync(process.argv[2]))});process.exitCode=7;}catch(e){if(!e.message.includes('injected write failure'))throw e;}`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',program,f.root,path.join(f.root,'plan.json')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  for(const row of plan.outputs)assert.equal(fs.existsSync(path.join(f.root,row.ref)),false);
  assert.equal(fs.existsSync(path.join(f.root,'.template-spec/process/.project-ci-transaction.json')),false);
});
