import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateMaintenanceCheckpoint} from '../scripts/lib/maintenance-intensity.mjs';
import {digest} from '../scripts/lib/governance-io.mjs';
const base={schema_version:2,intensity:'L3',classification_reason:'test',triggers:['core-validator'],changed_assets:['scripts/verify-maintenance-checkpoint'],review_mode:'self-check',escalation:'none',target_state:'implementation-ready',current_state:'implementation-ready',verification_profile:'fast',review_round:0,candidate_digest:null,verification_evidence:['self-check','fresh-verification'].map(kind=>({kind,command:'test',result:'pass'}))};
test('三类风险逐项需要实际反例，非命中 L3 不额外要求，历史仅只读',t=>{
  validateMaintenanceCheckpoint(base);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'counterexample-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const trigger of ['permission-boundary','lifecycle-gate','release-semantics']) {
    const cp={...base,triggers:[trigger]};assert.throws(()=>validateMaintenanceCheckpoint(cp),/counterexample/);
    assert.equal(validateMaintenanceCheckpoint(cp,{history:true}).current_state,'historical-only');
    // This process actually refuses a release claim lacking final verification.
    const input={...base,target_state:'release-ready',current_state:'release-ready',verification_profile:'release'};
    const r=spawnSync(process.execPath,['scripts/verify-maintenance-checkpoint','-'],{input:JSON.stringify(input),encoding:'utf8'});assert.equal(r.status,1);
    fs.writeFileSync(path.join(root,'source.json'),JSON.stringify(input));
    const logs=[{id:'reject',command:['node','scripts/verify-maintenance-checkpoint','-'],exit_code:r.status,stderr:r.stderr}];fs.writeFileSync(path.join(root,'log.json'),JSON.stringify(logs));
    const inputs=[{ref:'source.json',digest:digest(fs.readFileSync(path.join(root,'source.json')))}];
    const run={schema_version:1,kind:'maintenance-counterexample-run',trigger,command:'node test',exit_code:0,started_at:new Date().toISOString(),finished_at:new Date().toISOString(),assertions:[{id:'reject',expected:'reject',actual:'rejected',expected_diagnostic:'release-ready 缺少 final-release-verification 证据'}],inputs,input_digest:digest(JSON.stringify(inputs)),log:{ref:'log.json',digest:digest(fs.readFileSync(path.join(root,'log.json')))}};
    fs.writeFileSync(path.join(root,'run.json'),JSON.stringify(run));
    const current={...cp,verification_evidence:[...base.verification_evidence,{kind:'counterexample',trigger,command:run.command,result:'pass',run_ref:'run.json'}]};
    validateMaintenanceCheckpoint(current,{baseDir:root});
    run.assertions[0].expected_diagnostic='unrelated import error';fs.writeFileSync(path.join(root,'run.json'),JSON.stringify(run));assert.throws(()=>validateMaintenanceCheckpoint(current,{baseDir:root}),/预期原因/);
    run.assertions[0].expected_diagnostic='release-ready 缺少 final-release-verification 证据';fs.writeFileSync(path.join(root,'run.json'),JSON.stringify(run));
    fs.writeFileSync(path.join(root,'log.json'),'pass');assert.throws(()=>validateMaintenanceCheckpoint(current,{baseDir:root}));
    fs.writeFileSync(path.join(root,'log.json'),JSON.stringify(logs));fs.writeFileSync(path.join(root,'source.json'),'drift');assert.throws(()=>validateMaintenanceCheckpoint(current,{baseDir:root}),/漂移/);
  }
});
