import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse } from '../scripts/vendor/yaml.mjs';
import {initializeNative} from '../.template-source/scripts/lib/native-yss.mjs';
import {makeRoot} from './helpers/yss-instance.mjs';
import {installedFixture} from '../scripts/fixtures/role-independent-draft/installed-fixture.mjs';
import {checkProjectGovernance} from '../scripts/lib/project-governance.mjs';
import {generateTaskPackageDefaults} from '../scripts/lib/task-package.mjs';

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
function tools(f) {
  for(const ref of ['scripts','.template-spec','.agents/skills']) {
    fs.cpSync(ref,path.join(f.root,ref),{recursive:true,filter:file=>!/(?:\/fixtures\/|\/tests\/|\/assets\/|\/node_modules\/)/.test(file)});
  }
  f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: .work}\n---\n');
}
test('空实例与草案可检查，非法交接/虚假批准/缺能力失败且不执行业务命令',t=>{
  const f=fixture(t);tools(f);f.install();
  const check=()=>{const r=f.run('check','--json');return {...r,data:JSON.parse(r.stdout)};};
  assert.equal(check().status,0);
  f.write('.work/a/spec.md','# 草案\n待确认');assert.equal(check().status,0);
  const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  cp.verification.commands=['touch DO-NOT-EXECUTE'];
  f.write('.work/a/checkpoint.yaml',JSON.stringify(cp));assert.equal(check().status,0);
  assert.equal(fs.existsSync(path.join(f.root,'DO-NOT-EXECUTE')),false);
  f.write('.work/a/checkpoint.yaml',JSON.stringify({...cp,phase_boundary:{decision:'handoff'}}));assert.equal(check().status,1);
  f.write('.work/a/checkpoint.yaml',JSON.stringify({...cp,gates:{'gate.plan-approved':{status:'approved',reason:'fake',evidence_refs:[]}}}));assert.equal(check().status,1);
  fs.unlinkSync(path.join(f.root,'scripts/verify-lifecycle-checkpoint'));assert.equal(check().status,2);
});
test('PR 基线不能通过删除 checkpoint 或缩小 tracker 范围变绿',t=>{
  const f=fixture(t);tools(f);f.install();
  const cp=fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml');f.write('.work/a/checkpoint.yaml',cp);
  const git=(...args)=>{const r=spawnSync('git',['-c','maintenance.auto=false','-c','gc.auto=0',...args],{cwd:f.root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@invalid','commit','-qm','fixture');const base=git('rev-parse','HEAD');
  fs.unlinkSync(path.join(f.root,'.work/a/checkpoint.yaml'));
  const deleted=f.run('check','--json','--base',base);assert.equal(deleted.status,1,deleted.stdout);assert.ok(JSON.parse(deleted.stdout).diagnostics.some(x=>x.code==='checkpoint-deleted'));
  f.write('.work/a/checkpoint.yaml',cp);f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: docs/new}\n---\n');
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
  const p=JSON.parse(f.run('plan','--additional-path','aaa/custom').stdout);assert.deepEqual(new Set(p.roots),new Set(['.work','aaa/custom']));
  f.write('plan.json',JSON.stringify(p));assert.equal(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
  const cp=fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml');f.write('.work/a/checkpoint.yaml',cp);
  fs.unlinkSync(path.join(f.root,'scripts/verify-lifecycle-checkpoint'));
  const status=(...args)=>spawnSync(process.execPath,[path.join(f.root,'scripts/lifecycle-status'),'--root',f.root,'--checkpoint','.work/a/checkpoint.yaml',...args],{encoding:'utf8'});
  assert.equal(status().status,0);assert.equal(status('--preflight').status,2);
  f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: docs/new}\n---\n');
  assert.notEqual(f.run('apply','--plan',path.join(f.root,'plan.json')).status,0);
});
test('摘要漂移、未知批准和非法流转不能作为通过；运行中任务不重复派发',t=>{
  const f=fixture(t);tools(f);
  const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  cp.stage_trace.completed_work_unit='work-unit.entry-triage';cp.next_work_unit='work-unit.release-and-retrospective';
  f.write('.work/a/checkpoint.yaml',JSON.stringify(cp));const transition=f.run('check');assert.equal(transition.status,1,transition.stdout);
  assert.ok(JSON.parse(transition.stdout).checks.some(x=>x.id==='transition'&&x.exit_code!==0));
  fs.unlinkSync(path.join(f.root,'.work/a/checkpoint.yaml'));
  f.write('.work/a/claim.json',JSON.stringify({status:'approved',input_ref:'business.md',input_digest:'sha256:'+'0'.repeat(64)}));
  const drift=f.run('check');assert.equal(drift.status,1);assert.ok(JSON.parse(drift.stdout).diagnostics.some(x=>x.code==='evidence-drift'));
  f.write('.work/a/task.json',JSON.stringify({task_id:'task.test',work_unit_id:'work-unit.plan-opportunity',contract:{kind:'unknown'},workflow_status:'active'}));
  const task=spawnSync(process.execPath,[path.join(f.root,'scripts/lifecycle-status'),'--root',f.root,'--task','.work/a/task.json','--preflight'],{encoding:'utf8'});
  const report=JSON.parse(task.stdout);assert.notEqual(task.status,0);assert.equal(report.recovery.dispatch,false);assert.ok(report.diagnostics.some(x=>x.code==='task-not-resolved'));
});
test('真实当前 Task3 无岗位注册表仍可只读检查',t=>{
  const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'project-ci-roleless-'))),root=path.join(scratch,'spec');
  t.after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
  initializeNative('spec',root);
  for(const args of [['init','-q'],['-c','user.name=fixture','-c','user.email=fixture@invalid','commit','--allow-empty','-qm','baseline']])assert.equal(spawnSync('git',args,{cwd:root}).status,0);
  const f=installedFixture('spec',{existingRoot:root});
  f.write('input.json',{status:'draft',scope:{impacted_areas:['wording']}});
  const task=f.draftTask({taskRef:'roleless-task.json'}),p=task.provenance;
  f.write(p.execution_ref,{phase:'dispatch',dispatched_at:new Date().toISOString(),tool:p.tool,task_ref:p.task_ref,identity:p.identity,candidate:f.asset('input.json'),input_bindings:task.input_bindings,baseline:task.baseline,scope:task.allowed_write_paths,expected_outputs:task.expected_outputs});
  f.write(p.task_ref,task);
  f.run('actual-current-task3',['contract','verify','--kind','task','--file',p.task_ref]);
  assert.equal(fs.existsSync(path.join(root,'.template-spec/agents/digital-human-roles.yaml')),false);
  const before=fs.readFileSync(path.join(root,p.task_ref)),{report,exitCode}=checkProjectGovernance({root,taskRef:p.task_ref});
  assert.equal(report.status,'passed',JSON.stringify(report.diagnostics));assert.equal(exitCode,0);
  assert.ok(report.checks.some(x=>x.id==='task-package'&&x.exit_code===0));assert.deepEqual(report.scope.missing_capabilities,[]);
  assert.deepEqual(fs.readFileSync(path.join(root,p.task_ref)),before);
  const partRef='.template-spec/process/orchestration/core/identity.yaml';
  assert.ok(report.inputs.some(x=>x.ref===partRef));
  const dispatch=JSON.parse(f.read(p.execution_ref)),rawTask=structuredClone(task),policyRef=task.policy.ref;
  rawTask.inputs.push(policyRef);rawTask.input_bindings.push(f.asset(policyRef));
  f.write(p.execution_ref,{...dispatch,input_bindings:rawTask.input_bindings});f.write(p.task_ref,rawTask);
  const rawValid=checkProjectGovernance({root,taskRef:p.task_ref});assert.equal(rawValid.exitCode,0,JSON.stringify(rawValid.report.diagnostics));
  rawTask.input_bindings.at(-1).digest=task.policy.digest;
  f.write(p.execution_ref,{...dispatch,input_bindings:rawTask.input_bindings});f.write(p.task_ref,rawTask);
  const rawWrong=checkProjectGovernance({root,taskRef:p.task_ref});assert.notEqual(rawWrong.exitCode,0);
  assert.ok(rawWrong.report.diagnostics.some(x=>x.code==='evidence-drift'&&x.message.includes(policyRef)));
  f.write(p.execution_ref,dispatch);f.write(p.task_ref,task);
  const part=f.read(partRef);fs.appendFileSync(path.join(root,partRef),'\n# changed policy bytes\n');
  const changedPart=checkProjectGovernance({root,taskRef:p.task_ref});assert.notEqual(changedPart.exitCode,0);
  assert.ok(changedPart.report.checks.some(x=>x.id==='task-package'&&x.exit_code!==0));
  assert.ok(changedPart.report.diagnostics.some(x=>x.code==='evidence-drift'));f.write(partRef,part);
  task.policy.digest='0'.repeat(64);f.write(p.task_ref,task);
  const rejected=checkProjectGovernance({root,taskRef:p.task_ref});assert.notEqual(rejected.exitCode,0);
  assert.ok(rejected.report.checks.some(x=>x.id==='task-package'&&x.exit_code!==0));assert.ok(rejected.report.diagnostics.some(x=>x.code==='evidence-drift'));
});
test('冻结历史岗位会签可读，删除批准记录和间接依据对照基线失败',t=>{
  // 只验证原 CLI 2.4.0 的冻结身份/Profile/政策/岗位协议，不代表当前治理批准。
  const f=fixture(t),historical=makeRoot('project-ci-history-','spec');
  fs.cpSync(historical,f.root,{recursive:true});fs.rmSync(historical,{recursive:true,force:true});
  f.write('.template-spec/agents/issue-tracker.md','---\ntracker: {platform: local-markdown, root: .work}\n---\n');
  const bound=ref=>({ref,digest:createHash('sha256').update(fs.readFileSync(path.join(f.root,ref))).digest('hex')});
  const boundary='check.design-reviewed',subject_ref='.work/a/subject.json',approval_ref='.work/a/approval.json';
  const current={subject_ref,approval_scope:['fixture'],basis:[bound('business.md')],drafter_principal_ref:'instance:test-drafter'};
  f.write(subject_ref,JSON.stringify({gate_id:boundary,...current,evidence_refs:['business.md']}));
  current.subject_digest=bound(subject_ref).digest;
  const approval={schema_version:1,gate_id:boundary,decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'instance:test-reviewer',...current,evidence_refs:[subject_ref],biological_veto:false};
  f.write('.work/a/approval.json',JSON.stringify(approval));
  const unowned=f.run('check');assert.equal(unowned.status,1,unowned.stdout);assert.ok(JSON.parse(unowned.stdout).diagnostics.some(x=>x.code==='approval-context-required'));
  const checkpoint=parse(fs.readFileSync(path.join(f.root,'.template-spec/process/templates/lifecycle-checkpoint-template.yaml'),'utf8'));
  checkpoint.checks={[boundary]:{status:'approved',applicable:true,reason:'Synthetic current independent design review; not a delivery or release approval.',...current,approval_ref,basis:[...current.basis,bound(subject_ref),bound(approval_ref)],evidence_refs:[subject_ref],evidence:{'evidence.design-review-result':[subject_ref]}}};
  f.write('.work/a/checkpoint.json',JSON.stringify(checkpoint));
  const valid=f.run('check');assert.equal(valid.status,0,valid.stdout);assert.ok(JSON.parse(valid.stdout).checks.some(x=>x.id==='approval'&&x.exit_code===0));
  const rolesRef='.template-spec/agents/digital-human-roles.yaml',roles=fs.readFileSync(path.join(f.root,rolesRef));
  f.write('.work/a/task-evidence.json','{"result":"fixture input"}');
  const legacyTask=generateTaskPackageDefaults('role.requirements-manager',{task_id:'LEGACY-TASK',work_unit_id:'work-unit.plan-opportunity',actor_id:'role.requirements-manager.instance-1',stage_id:'stage.plan',runtime_id:'runtime.skill-projection',execution_state:'Drafter',workflow_status:'failed',contract:{kind:'lifecycle-work-unit',contract_id:'legacy-read',contract_version:1,status:'issued',contract_ref:'.template-spec/process/lifecycle-registry.yaml',lifecycle_ref:'.template-spec/process/lifecycle-registry.yaml',artifact_refs:[],gate_refs:[]},inputs:['CONTEXT.md'],objective:'只读核验冻结岗位任务协议',allowed_write_paths:['docs/.scratch'],forbidden_actions:['不得越过主控门禁'],expected_outputs:['结构化工作结果'],expected_evidence_files:['.work/a/task-evidence.json'],verification_commands:['node --version'],verification_results:[],downstream_consumers:['role.lifecycle-orchestrator'],convergence:{parent_work_unit:'work-unit.plan-opportunity',convergence_ref:'.work/a/task-evidence.json',conflict_escalation:'返回主控'}},{root:f.root,rolesDoc:parse(roles.toString())});
  f.write('.work/a/legacy-task.json',JSON.stringify(legacyTask));
  const legacyValid=spawnSync(process.env.YSS_NATIVE_BINARY,['contract','verify','--kind','task','--file','.work/a/legacy-task.json','--root',f.root,'--json'],{encoding:'utf8'});assert.equal(legacyValid.status,0,legacyValid.stdout||legacyValid.stderr);
  fs.unlinkSync(path.join(f.root,rolesRef));
  const missing=f.run('check');assert.equal(missing.status,2,missing.stdout);
  const missingReport=JSON.parse(missing.stdout);
  for(const id of ['task-package','approval'])assert.ok(missingReport.checks.some(x=>x.id===id&&x.exit_code===2),JSON.stringify(missingReport.diagnostics));
  assert.ok(missingReport.diagnostics.some(x=>x.code==='capability-unavailable'));
  t.diagnostic('历史 roles 缺失：project-ci=2，原生 task-package=2、approval=2，capability-unavailable；有 roles 时原生历史任务=0。');
  f.write(rolesRef,roles);fs.unlinkSync(path.join(f.root,'.work/a/legacy-task.json'));fs.unlinkSync(path.join(f.root,'.work/a/task-evidence.json'));
  const git=(...args)=>{const r=spawnSync('git',['-c','maintenance.auto=false','-c','gc.auto=0',...args],{cwd:f.root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@invalid','commit','-qm','synthetic approval fixture');const base=git('rev-parse','HEAD');
  fs.unlinkSync(path.join(f.root,'.work/a/approval.json'));fs.unlinkSync(path.join(f.root,'business.md'));
  const r=f.run('check','--base',base);assert.equal(r.status,1,r.stdout);
  const refs=JSON.parse(r.stdout).diagnostics.filter(x=>x.code==='approved-evidence-deleted').map(x=>x.source_ref);assert.ok(refs.includes('business.md'));assert.ok(refs.includes('.work/a/approval.json'));
});
test('显式预检输入不可被未知结构冒充',t=>{
  const f=fixture(t);tools(f);f.write('.work/a/unknown.json','{"status":"draft"}');
  for(const option of ['--task','--checkpoint']) {
    const r=spawnSync(process.execPath,[path.join(f.root,'scripts/lifecycle-status'),'--root',f.root,option,'.work/a/unknown.json','--preflight'],{encoding:'utf8'});
    assert.notEqual(r.status,0,r.stdout);
  }
});
test('稳定术语及运行时身份不会误作本地文件；当前文件引用仍须可读',t=>{
  const f=fixture(t);tools(f);
  const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  cp.verification.evidence_refs=['.work/a/evidence.json'];
  f.write('.work/a/checkpoint.yaml',JSON.stringify(cp));
  f.write('.work/a/evidence.json',JSON.stringify({term_refs:['Global/Example'],principal_ref:'instance:reviewer',original_ref:'session://original',evidence_refs:['business.md']}));
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
    f.write('.work/a/incomplete.json',JSON.stringify(value));
    assert.notEqual(f.run('check').status,0,JSON.stringify(value));
  }
  f.write('.work/a/incomplete.json',JSON.stringify({status:'draft',kind:'unknown-future-asset'}));assert.equal(f.run('check').status,0);
});
test('实例身份不能由 checkpoint 声明覆盖，未知阶段和工作单元拒绝',t=>{
  const f=fixture(t);tools(f);const cp=parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml','utf8'));
  const legacy={...cp};delete legacy.phase_boundary;delete legacy.stage_trace;
  for(const value of [
    {...cp,repository_mode:'template-source',context_reconciliation:{status:'not-applicable',ref:null,reason:'source fixture',evidence_refs:[]}},
    {...legacy,stage:'stage.unknown'},
    {...legacy,next_work_unit:'work-unit.unknown'},
    {...legacy,next_work_unit:'work-unit.ssot-update'}
  ]) {f.write('.work/a/checkpoint.json',JSON.stringify(value));assert.notEqual(f.run('check').status,0,JSON.stringify(value));}
});
test('PR 基线保留中文路径，删除中文目录 checkpoint 不能变绿',t=>{
  const f=fixture(t);tools(f);f.write('.work/中文/checkpoint.yaml',fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml'));
  const git=(...args)=>{const r=spawnSync('git',['-c','maintenance.auto=false','-c','gc.auto=0',...args],{cwd:f.root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@invalid','commit','-qm','Chinese filename fixture');const base=git('rev-parse','HEAD');
  fs.unlinkSync(path.join(f.root,'.work/中文/checkpoint.yaml'));const r=f.run('check','--base',base);assert.equal(r.status,1,r.stdout);assert.ok(JSON.parse(r.stdout).diagnostics.some(x=>x.code==='checkpoint-deleted'&&x.source_ref.includes('中文')));
});

test('真实 CI Context 消费路径拒绝缺二进制、错误协议、非零退出与摘要漂移',t=>{
  const f=fixture(t);tools(f);
  const success={outputVersion:1,protocolVersion:1,command:'context',status:'ok',code:'OK',result:{context_snapshot:{context_ref:'CONTEXT.md',context_schema_version:1,document_digest:'sha256:'+'a'.repeat(64),referenced_terms_digest:'sha256:'+'b'.repeat(64),term_refs:[]}}};
  const binaries=[
    {name:'absent',file:path.join(f.root,'absent')},
    {name:'wrong-protocol',output:{...success,protocolVersion:2},exit:0},
    {name:'nonzero',output:{...success,status:'error',code:'CONTEXT',result:{message:'synthetic rejected'}},exit:1},
    {name:'digest-drift',output:success,exit:0,mutate:true}
  ];
  for(const item of binaries) {
    const binary=item.file||path.join(f.root,item.name);
    if(!item.file) {fs.writeFileSync(binary,`#!/usr/bin/env node\n${item.mutate?"require('node:fs').appendFileSync(__filename,'// drift\\n');":""}\nprocess.stdout.write(${JSON.stringify(JSON.stringify(item.output))});process.exit(${item.exit});\n`);fs.chmodSync(binary,0o755);}
    const result=spawnSync(process.execPath,[path.join(source,'scripts/project-ci'),'check','--root',f.root,'--json'],{encoding:'utf8',env:{...process.env,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:''}});
    assert.notEqual(result.status,0,item.name+result.stdout);
    const report=JSON.parse(result.stdout);assert.notEqual(report.status,'passed');
    assert.ok(report.checks.some(check=>check.id==='context'&&check.status==='failed'),item.name+result.stdout);
    if(item.exit===1)assert.equal(report.checks.find(check=>check.id==='context').exit_code,1);
  }
});
