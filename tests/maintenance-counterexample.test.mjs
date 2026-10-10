import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateMaintenanceCheckpoint, minimumIntensity} from '../scripts/lib/maintenance-intensity.mjs';
import {digest} from '../scripts/lib/governance-io.mjs';
const base={schema_version:2,intensity:'L2',classification_reason:'test',triggers:['core-validator'],changed_assets:['scripts/verify-maintenance-checkpoint'],review_mode:'self-check',escalation:'none',target_state:'implementation-ready',current_state:'implementation-ready',verification_profile:'fast',review_round:0,candidate_digest:null,verification_evidence:['self-check','fresh-verification'].map(kind=>({kind,command:'test',result:'pass'}))};
test('精简后的两级维护保留具体影响，普通 L2 不强制反例，L3 仅历史读取',()=>{
  for(const trigger of ['local-rule','template-structure','non-core-validator','lifecycle-gate','permission-boundary','generation-semantics','release-semantics','cross-repo-contract','core-validator']) assert.equal(minimumIntensity([trigger]),'L2');
  assert.equal(minimumIntensity([]),'L2');
  for(const trigger of ['textual-only','link-only','deterministic-projection']) assert.equal(minimumIntensity([trigger]),'L1');
  validateMaintenanceCheckpoint({...base,intensity:'L2'});
  const legacy={...base,intensity:'L3'};
  assert.throws(()=>validateMaintenanceCheckpoint(legacy),/L3.*历史/);
  assert.equal(validateMaintenanceCheckpoint(legacy,{history:true}).current_state,'historical-only');
  for(const kind of ['self-check','fresh-verification']) assert.throws(()=>validateMaintenanceCheckpoint({...base,intensity:'L2',verification_evidence:base.verification_evidence.filter(x=>x.kind!==kind)}),new RegExp(kind));
  assert.throws(()=>minimumIntensity(['unknown-trigger']),/未知 trigger/);
});
test('四项旧判级标签在当前 L2 中拒绝，历史 L3 仍只读兼容',()=>{
  for(const trigger of ['ticket-state','historical-important-escape','aggregate-behavior-change','release-candidate']) {
    const cp={...base,triggers:[trigger]};
    assert.throws(()=>validateMaintenanceCheckpoint(cp),new RegExp(`未知 trigger: ${trigger}`));
    assert.equal(validateMaintenanceCheckpoint({...cp,intensity:'L3'},{history:true}).current_state,'historical-only');
    assert.throws(()=>validateMaintenanceCheckpoint(cp,{history:true}),/至少要求 L3/);
  }
});
test('三类高风险 L2 逐项强制实际反例，历史仅只读',()=>{
  validateMaintenanceCheckpoint(base);
  validateMaintenanceCheckpoint({...base,intensity:'L2',triggers:[]});
  for(const trigger of ['permission-boundary','lifecycle-gate','release-semantics']) {
    const cp={...base,triggers:[trigger]};assert.throws(()=>validateMaintenanceCheckpoint(cp),/counterexample/);
    assert.throws(()=>validateMaintenanceCheckpoint({...cp,verification_evidence:[...base.verification_evidence,{kind:'counterexample',trigger,command:'test',result:'pass'}]}),/counterexample/);
    assert.equal(validateMaintenanceCheckpoint({...cp,intensity:'L3'},{history:true}).current_state,'historical-only');
  }
});
test('历史读取只依赖冻结 v1 策略，不要求当前策略可用',t=>{
  const source=path.resolve(import.meta.dirname,'..'),root=fs.mkdtempSync(path.join(os.tmpdir(),'maintenance-history-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.cpSync(path.join(source,'scripts'),path.join(root,'scripts'),{recursive:true,filter:file=>!file.includes(`${path.sep}fixtures${path.sep}`)&&!file.endsWith(`${path.sep}fixtures`)});
  fs.mkdirSync(path.join(root,'.template-source/process'),{recursive:true});
  fs.copyFileSync(path.join(source,'.template-source/process/maintenance-intensity-v1.yaml'),path.join(root,'.template-source/process/maintenance-intensity-v1.yaml'));
  const args=[path.join(root,'scripts/verify-maintenance-checkpoint'),'--history','-'];
  const result=spawnSync(process.execPath,args,{cwd:root,input:JSON.stringify({...base,intensity:'L3'}),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/历史兼容只读.*historical-only/);
});
test('自愿提供的运行记录仍验证实际拒绝、摘要和输入，历史读取不授权',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'counterexample-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const trigger='release-semantics',cp={...base,triggers:[trigger]};
  const input={...base,target_state:'release-ready',current_state:'release-ready',verification_profile:'release'};
  const r=spawnSync(process.execPath,['scripts/verify-maintenance-checkpoint','-'],{input:JSON.stringify(input),encoding:'utf8'});assert.equal(r.status,1);
  fs.writeFileSync(path.join(root,'source.json'),JSON.stringify(input));
  const logs=[{id:'reject',command:['node','scripts/verify-maintenance-checkpoint','-'],exit_code:r.status,stderr:r.stderr}];fs.writeFileSync(path.join(root,'log.json'),JSON.stringify(logs));
  const inputs=[{ref:'source.json',digest:digest(fs.readFileSync(path.join(root,'source.json')))}];
  const run={schema_version:1,kind:'maintenance-counterexample-run',trigger,command:'node test',exit_code:0,started_at:new Date().toISOString(),finished_at:new Date().toISOString(),assertions:[{id:'reject',expected:'reject',actual:'rejected',expected_diagnostic:'release-ready 缺少 final-release-verification 证据'}],inputs,input_digest:digest(JSON.stringify(inputs)),log:{ref:'log.json',digest:digest(fs.readFileSync(path.join(root,'log.json')))}};
  fs.writeFileSync(path.join(root,'run.json'),JSON.stringify(run));
  const current={...cp,verification_evidence:[...base.verification_evidence,{kind:'counterexample',trigger,command:run.command,result:'pass',run_ref:'run.json'}]};
  validateMaintenanceCheckpoint(current,{baseDir:root});
  assert.throws(()=>validateMaintenanceCheckpoint({...current,triggers:['core-validator']},{baseDir:root}),/当前维护范围/);
  run.assertions[0].expected_diagnostic='unrelated import error';fs.writeFileSync(path.join(root,'run.json'),JSON.stringify(run));assert.throws(()=>validateMaintenanceCheckpoint(current,{baseDir:root}),/预期原因/);
  run.assertions[0].expected_diagnostic='release-ready 缺少 final-release-verification 证据';fs.writeFileSync(path.join(root,'run.json'),JSON.stringify(run));
  fs.writeFileSync(path.join(root,'log.json'),'pass');assert.throws(()=>validateMaintenanceCheckpoint(current,{baseDir:root}));
  fs.writeFileSync(path.join(root,'log.json'),JSON.stringify(logs));fs.writeFileSync(path.join(root,'source.json'),'drift');assert.throws(()=>validateMaintenanceCheckpoint(current,{baseDir:root}),/漂移/);
  assert.equal(validateMaintenanceCheckpoint({...current,intensity:'L3'},{baseDir:root,history:true}).current_state,'historical-only');
});
