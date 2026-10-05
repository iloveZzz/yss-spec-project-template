import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateQualification, qualificationPerformance,qualificationRunEvidence,validateQualificationPlanLedger} from '../.template-source/scripts/lib/verification-qualification.mjs';
import {runQualification} from '../.template-source/scripts/qualify-template-verification.mjs';
import {compileQualificationPlans} from '../.template-source/scripts/lib/verification-qualification-plan.mjs';
import {addVerificationExecutionTasks} from '../.template-source/scripts/lib/verification-execution-plan.mjs';
import {loadVerificationProfiles,ROOT} from '../scripts/lib/template-verification.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function observedProof(t) {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-observed-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const proof={schema_version:1,kind:'template-verification-qualification',scope:'pilot',status:'passed',bindings:{fixture:'source-bytes'},pairs:[],negative_cases:[],route_cases:[]};
  function execute(name,side,{failure=false,reused=false,missing=false}={}) {
    const output=path.join(directory,name);fs.mkdirSync(output);
    const source=failure?'console.error("refusal");process.exit(7)':`Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${side==='legacy'?75:5});console.log("observed")`;
    const start=performance.now(),result=spawnSync(process.execPath,['-e',source],{encoding:'utf8'}),wallMs=performance.now()-start;
    assert.equal(result.status,failure?7:0);assert.equal(result.signal,null);
    const stdoutFile=path.join(output,'stdout.log'),stderrFile=path.join(output,'stderr.log');fs.writeFileSync(stdoutFile,result.stdout);fs.writeFileSync(stderrFile,result.stderr);
    const task={id:'check.fixture',task_id:'legacy.fixture',group:'fixture',command:`node -e ${source}`,gate_ids:['check.fixture-gate']};
    const row={...task,index:0,code:result.status,actual_exit_code:result.status,actual_exit_signal:null,actual_exit_code_observed:true,stdoutFile,stderrFile};
    const report={schema_version:2,kind:'template-verification-report',purpose:'qualification',experimental:true,status:failure?'failed':'passed',plan:{strategy:side==='legacy'?'legacy-reference':'qualification-shadow',commands:[task]},environment:{node:process.version,platform:process.platform,arch:process.arch,cpus:2,load_average:[Math.random()],concurrency:side==='legacy'?1:2,tooling_mode:side==='legacy'?'legacy':'optimized'},input_sha256:'bound-input',input_after_sha256:'bound-input',input_drift:false,results:[row],unexecuted:[],final_exit:{code:result.status,signal:null,observed:true}};
    if(reused){const duplicate={...task,task_id:'legacy.duplicate'};report.plan.commands.push(duplicate);report.results.push({...row,...duplicate,index:1,reused:true,reused_from:{task_id:row.task_id},actual_exit_code:null,actual_exit_code_observed:false});}
    if(missing){const expensive={...task,task_id:'legacy.unexecuted',command:'expensive pending'};report.plan.commands.push(expensive);report.unexecuted.push({...expensive,reason:'preflight-failed'});}
    const reportFile=path.join(output,'report.json');fs.writeFileSync(reportFile,JSON.stringify(report));
    return qualificationRunEvidence({reportFile,observed:true,code:result.status,signal:result.signal},{directory,wallMs});
  }
  for(let index=0;index<5;index++) {
    const pair={pair_id:`actual.${index}`,order:index%2?['candidate','legacy']:['legacy','candidate']};
    for(const side of pair.order)pair[side]=execute(`${index}-${side}`,side,{reused:index===0});
    proof.pairs.push(pair);
  }
  proof.negative_cases.push({category:'environment-missing',covered_old_ids:['legacy.fixture'],expected_gate_ids:['check.fixture-gate'],legacy:execute('negative-legacy','legacy',{failure:true,missing:true}),candidate:execute('negative-candidate','candidate',{failure:true,missing:true})});
  const reportFile=path.join(directory,'qualification.json'),save=()=>fs.writeFileSync(reportFile,JSON.stringify(proof));save();
  const validate=()=>validateQualification({root:directory,config:{},reportFile,expectedBindings:proof.bindings,scope:'pilot'});
  return {directory,proof,reportFile,save,validate};
}

test('只有 passed 布尔值与虚构时间数组不能授予资格', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'qualification-contract-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const reportFile=path.join(root,'qualification.json');fs.writeFileSync(reportFile,JSON.stringify({kind:'verification-allowlist-qualification',status:'passed',negative_cases_passed:true,related_failures_omitted:0,timing:{baseline_samples:[100,101,102,103,104],candidate_samples:[10,11,12,13,14]}}));
  assert.equal(validateQualification({root,config:{},reportFile,expectedBindings:{}}).valid,false);
});

test('配对性能验收要求至少五轮、20% 中位降幅与最慢样本不回退', () => {
  assert.throws(()=>qualificationPerformance([100,100,100],[10,10,10]),/five/);
  assert.equal(qualificationPerformance([100,100,100,100,100],[79,80,80,80,100]).passed,true);
  assert.equal(qualificationPerformance([100,100,100,100,100],[79,80,80,80,101]).passed,false);
  assert.equal(qualificationPerformance([100,100,100,100,100],[79,81,81,81,100]).passed,false);
});

test('真实五对进程与失败日志建立 pilot 资格，负载观测变化和同轮复用不伪造退出',t=>{
  const f=observedProof(t);assert.deepEqual(f.validate().reasons,[]);assert.equal(f.validate().valid,true);
  const run=f.proof.negative_cases[0].candidate,file=path.join(f.directory,run.report_ref),report=JSON.parse(fs.readFileSync(file));
  report.unexecuted[0].command='forged pending';fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();
  assert.ok(f.validate().reasons.includes('qualification-run-task-missing'));
});

test('配对顺序、瞬时真实退出、结果及日志被篡改均不能继承资格',t=>{
  const f=observedProof(t);
  f.proof.pairs[1].order=['legacy','candidate'];f.save();assert.ok(f.validate().reasons.includes('qualification-pair-order-invalid'));
  f.proof.pairs[1].order=['candidate','legacy'];
  const run=f.proof.pairs[1].candidate,file=path.join(f.directory,run.report_ref),report=JSON.parse(fs.readFileSync(file));
  report.results[0].actual_exit_code_observed=false;fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();assert.ok(f.validate().reasons.includes('qualification-task-close-not-observed'));
  report.results[0].actual_exit_code_observed=true;report.results=[];fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();assert.ok(f.validate().reasons.includes('qualification-run-task-missing'));
  report.results=[{...report.plan.commands[0],index:0,code:0,actual_exit_code:0,actual_exit_code_observed:true,actual_exit_signal:null,stdoutFile:path.join(path.dirname(file),'stdout.log'),stderrFile:path.join(path.dirname(file),'stderr.log')}];fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();fs.appendFileSync(report.results[0].stdoutFile,'tampered');assert.ok(f.validate().reasons.includes('qualification-evidence-digest-mismatch'));
});

test('缺少可信 bootstrap baseline 时资格 driver 在创建输出和执行前拒绝',async t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-bootstrap-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const output=path.join(directory,'evidence');let executed=false;
  await assert.rejects(()=>runQualification({root:directory,config:{},output,executePairSide:async()=>{executed=true;}}),/bootstrap-baseline-invalid/);
  assert.equal(executed,false);assert.equal(fs.existsSync(output),false);
});

test('独立资格编译器拒绝成对删除 syntax、preflight、prepare、cleanup 与 Gate 台账',t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-ledger-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).stdout.trim(),config=loadVerificationProfiles(),proof={baseline:{base_sha:commit},representative_commit:commit,representative_changed_files:['README.md']};
  const plans=compileQualificationPlans({root:ROOT,config,changedFiles:['README.md'],commit});
  for(const side of ['legacy','candidate']) {
    const plan=addVerificationExecutionTasks(plans[side],{root:ROOT,reportDir:directory,purpose:'qualification',reference:side==='legacy'}),report={root:ROOT,plan};
    const validate=value=>validateQualificationPlanLedger({root:ROOT,config,proof,report:value,reportDirectory:directory,side});
    assert.equal(validate(report).valid,true);
    for(const kind of ['syntax','preflight','artifact-prepare','cleanup']) {
      const tampered=structuredClone(report),removed=tampered.plan.commands.find(task=>task.kind===kind);assert.ok(removed,kind);
      tampered.plan.commands=tampered.plan.commands.filter(task=>task.task_id!==removed.task_id);tampered.results=[];
      assert.ok(validate(tampered).reasons.includes('qualification-independent-plan-ledger-mismatch'),kind);
    }
    if(side==='candidate'){const tampered=structuredClone(report);tampered.plan.gates=[];assert.equal(validate(tampered).valid,false);}
    const drifted=structuredClone(report);drifted.plan.changed_files=[];assert.equal(validate(drifted).valid,false);
  }
});
