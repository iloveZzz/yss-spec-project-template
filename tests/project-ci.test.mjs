import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from '../scripts/vendor/yaml.mjs';

const source=process.cwd();
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'project-ci-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
  const write=(ref,bytes)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
  write('yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');
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
function tools(f) {
  for(const ref of ['scripts','.template-spec','.agents/skills']) {
    fs.cpSync(ref,path.join(f.root,ref),{recursive:true,filter:file=>!/(?:\/fixtures\/|\/tests\/|\/assets\/|\/node_modules\/)/.test(file)});
  }
  f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: docs/.scratch}\n---\n');
}
test('空实例与草案可检查，非法交接/虚假批准/缺能力失败且不执行业务命令',t=>{
  const f=fixture(t);tools(f);f.install();
  const check=()=>{const r=f.run('check','--json');return {...r,data:JSON.parse(r.stdout)};};
  assert.equal(check().status,0);
  f.write('docs/.scratch/a/spec.md','# 草案\n待确认');assert.equal(check().status,0);
  const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  cp.verification.commands=['touch DO-NOT-EXECUTE'];
  f.write('docs/.scratch/a/checkpoint.yaml',JSON.stringify(cp));assert.equal(check().status,0);
  assert.equal(fs.existsSync(path.join(f.root,'DO-NOT-EXECUTE')),false);
  f.write('docs/.scratch/a/checkpoint.yaml',JSON.stringify({...cp,phase_boundary:{decision:'handoff'}}));assert.equal(check().status,1);
  f.write('docs/.scratch/a/checkpoint.yaml',JSON.stringify({...cp,gates:{'gate.plan-approved':{status:'approved',reason:'fake',evidence_refs:[]}}}));assert.equal(check().status,1);
  fs.unlinkSync(path.join(f.root,'scripts/verify-lifecycle-checkpoint'));assert.equal(check().status,2);
});
test('PR 基线不能通过删除 checkpoint 或缩小 tracker 范围变绿',t=>{
  const f=fixture(t);tools(f);f.install();
  const cp=fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml');f.write('docs/.scratch/a/checkpoint.yaml',cp);
  const git=(...args)=>{const r=spawnSync('git',['-c','maintenance.auto=false','-c','gc.auto=0',...args],{cwd:f.root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@invalid','commit','-qm','fixture');const base=git('rev-parse','HEAD');
  fs.unlinkSync(path.join(f.root,'docs/.scratch/a/checkpoint.yaml'));
  const deleted=f.run('check','--json','--base',base);assert.equal(deleted.status,1,deleted.stdout);assert.ok(JSON.parse(deleted.stdout).diagnostics.some(x=>x.code==='checkpoint-deleted'));
  f.write('docs/.scratch/a/checkpoint.yaml',cp);f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: docs/new}\n---\n');
  const reduced=f.run('check','--json','--base',base);assert.equal(reduced.status,1);assert.ok(JSON.parse(reduced.stdout).diagnostics.some(x=>x.code==='scope-reduced'));
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
test('明确补充范围、重复 apply 的输入变化、预检能力缺失和普通查询区分',t=>{
  const f=fixture(t);tools(f);
  const p=JSON.parse(f.run('plan','--additional-path','aaa/custom').stdout);assert.deepEqual(new Set(p.roots),new Set(['docs/.scratch','aaa/custom']));
  f.write('plan.json',JSON.stringify(p));assert.equal(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
  const cp=fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml');f.write('docs/.scratch/a/checkpoint.yaml',cp);
  fs.unlinkSync(path.join(f.root,'scripts/verify-lifecycle-checkpoint'));
  const status=(...args)=>spawnSync(process.execPath,[path.join(f.root,'scripts/lifecycle-status'),'--root',f.root,'--checkpoint','docs/.scratch/a/checkpoint.yaml',...args],{encoding:'utf8'});
  assert.equal(status().status,0);assert.equal(status('--preflight').status,2);
  f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: docs/new}\n---\n');
  assert.notEqual(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
});
test('摘要漂移、未知批准和非法流转不能作为通过；运行中任务不重复派发',t=>{
  const f=fixture(t);tools(f);
  const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  cp.stage_trace.completed_work_unit='work-unit.entry-triage';cp.next_work_unit='work-unit.release-and-retrospective';
  f.write('docs/.scratch/a/checkpoint.yaml',JSON.stringify(cp));const transition=f.run('check');assert.equal(transition.status,1,transition.stdout);
  assert.ok(JSON.parse(transition.stdout).checks.some(x=>x.id==='transition'&&x.exit_code!==0));
  fs.unlinkSync(path.join(f.root,'docs/.scratch/a/checkpoint.yaml'));
  f.write('docs/.scratch/a/claim.json',JSON.stringify({status:'approved',input_ref:'business.md',input_digest:'sha256:'+'0'.repeat(64)}));
  const drift=f.run('check');assert.equal(drift.status,1);assert.ok(JSON.parse(drift.stdout).diagnostics.some(x=>x.code==='evidence-drift'));
  f.write('docs/.scratch/a/task.json',JSON.stringify({task_id:'task.test',work_unit_id:'work-unit.plan-opportunity',contract:{kind:'unknown'},workflow_status:'active'}));
  const task=spawnSync(process.execPath,[path.join(f.root,'scripts/lifecycle-status'),'--root',f.root,'--task','docs/.scratch/a/task.json','--preflight'],{encoding:'utf8'});
  const report=JSON.parse(task.stdout);assert.notEqual(task.status,0);assert.equal(report.recovery.dispatch,false);assert.ok(report.diagnostics.some(x=>x.code==='task-not-resolved'));
});
test('有效当前会签可通过，删除批准记录和间接依据对照基线失败',t=>{
  const f=fixture(t);tools(f);
  f.write('docs/.scratch/a/subject.json',JSON.stringify({evidence_refs:['business.md']}));
  const approval={schema_version:1,gate_id:'gate.delivery-accepted',decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'instance:test-reviewer',subject_ref:'docs/.scratch/a/subject.json',approval_scope:['fixture'],evidence_refs:['docs/.scratch/a/subject.json'],biological_veto:false};
  f.write('docs/.scratch/a/approval.json',JSON.stringify(approval));
  const valid=f.run('check');assert.equal(valid.status,0,valid.stdout);assert.ok(JSON.parse(valid.stdout).checks.some(x=>x.id==='approval'&&x.exit_code===0));
  const git=(...args)=>{const r=spawnSync('git',['-c','maintenance.auto=false','-c','gc.auto=0',...args],{cwd:f.root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@invalid','commit','-qm','synthetic approval fixture');const base=git('rev-parse','HEAD');
  fs.unlinkSync(path.join(f.root,'docs/.scratch/a/approval.json'));fs.unlinkSync(path.join(f.root,'business.md'));
  const r=f.run('check','--base',base);assert.equal(r.status,1,r.stdout);
  const refs=JSON.parse(r.stdout).diagnostics.filter(x=>x.code==='approved-evidence-deleted').map(x=>x.source_ref);assert.ok(refs.includes('business.md'));assert.ok(refs.includes('docs/.scratch/a/approval.json'));
});
test('显式预检输入不可被未知结构冒充',t=>{
  const f=fixture(t);tools(f);f.write('docs/.scratch/a/unknown.json','{"status":"draft"}');
  for(const option of ['--task','--checkpoint']) {
    const r=spawnSync(process.execPath,[path.join(f.root,'scripts/lifecycle-status'),'--root',f.root,option,'docs/.scratch/a/unknown.json','--preflight'],{encoding:'utf8'});
    assert.notEqual(r.status,0,r.stdout);
  }
});
test('稳定术语及运行时身份不会误作本地文件；当前文件引用仍须可读',t=>{
  const f=fixture(t);tools(f);
  const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  cp.verification.evidence_refs=['docs/.scratch/a/evidence.json'];
  f.write('docs/.scratch/a/checkpoint.yaml',JSON.stringify(cp));
  f.write('docs/.scratch/a/evidence.json',JSON.stringify({term_refs:['Global/Example'],principal_ref:'instance:reviewer',original_ref:'session://original',evidence_refs:['business.md']}));
  assert.equal(f.run('check').status,0);
  fs.unlinkSync(path.join(f.root,'business.md'));assert.equal(f.run('check').status,1);
});
test('应用中实际写入失败回滚，不留下半套 CI',t=>{
  const f=fixture(t),plan=JSON.parse(f.run('plan').stdout);f.write('plan.json',JSON.stringify(plan));
  const program=`import fs from 'node:fs';import {applyProjectCi} from ${JSON.stringify('file://'+source+'/scripts/lib/project-ci-install.mjs')};const rename=fs.renameSync;let n=0;fs.renameSync=(...args)=>{if(++n===2)throw new Error('injected write failure');return rename(...args);};try{applyProjectCi({root:process.argv[1],plan:JSON.parse(fs.readFileSync(process.argv[2]))});process.exitCode=7;}catch(e){if(!e.message.includes('injected write failure'))throw e;}`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',program,f.root,path.join(f.root,'plan.json')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  for(const row of plan.outputs)assert.equal(fs.existsSync(path.join(f.root,row.ref)),false);
  assert.equal(fs.existsSync(path.join(f.root,'.template-spec/process/.project-ci-transaction.json')),false);
});
test('字段不完整的运行中任务及流转声明不能伪装成草案',t=>{
  const f=fixture(t);tools(f);
  for(const value of [{task_id:'task.active',work_unit_id:'work-unit.plan-opportunity',workflow_status:'active'},{status:'running',kind:'unknown-flow'},{workflow_status:'resolved'}]) {
    f.write('docs/.scratch/a/incomplete.json',JSON.stringify(value));
    assert.notEqual(f.run('check').status,0,JSON.stringify(value));
  }
  f.write('docs/.scratch/a/incomplete.json',JSON.stringify({status:'draft',kind:'unknown-future-asset'}));assert.equal(f.run('check').status,0);
});
test('实例身份不能由 checkpoint 声明覆盖，未知阶段和工作单元拒绝',t=>{
  const f=fixture(t);tools(f);const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  const legacy={...cp};delete legacy.phase_boundary;delete legacy.stage_trace;
  for(const value of [
    {...cp,repository_mode:'template-source',context_reconciliation:{status:'not-applicable',ref:null,reason:'source fixture',evidence_refs:[]}},
    {...legacy,stage:'stage.unknown'},
    {...legacy,next_work_unit:'work-unit.unknown'},
    {...legacy,next_work_unit:'work-unit.ssot-update'}
  ]) {f.write('docs/.scratch/a/checkpoint.json',JSON.stringify(value));assert.notEqual(f.run('check').status,0,JSON.stringify(value));}
});
test('PR 基线保留中文路径，删除中文目录 checkpoint 不能变绿',t=>{
  const f=fixture(t);tools(f);f.write('docs/.scratch/中文/checkpoint.yaml',fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml'));
  const git=(...args)=>{const r=spawnSync('git',['-c','maintenance.auto=false','-c','gc.auto=0',...args],{cwd:f.root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@invalid','commit','-qm','Chinese filename fixture');const base=git('rev-parse','HEAD');
  fs.unlinkSync(path.join(f.root,'docs/.scratch/中文/checkpoint.yaml'));const r=f.run('check','--base',base);assert.equal(r.status,1,r.stdout);assert.ok(JSON.parse(r.stdout).diagnostics.some(x=>x.code==='checkpoint-deleted'&&x.source_ref.includes('中文')));
});
