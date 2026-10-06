#!/usr/bin/env node
// Public native initialization followed by the complete current handoff route.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {NATIVE_PROFILES, initializeNative} from './lib/native-yss.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const scratch=realpathSync(mkdtempSync(path.join(tmpdir(),'yss-handoff-distribution-')));
const profiles=NATIVE_PROFILES;
async function run(script,args,{cwd=root}={}) {
  const output=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',bytes=>stdout+=bytes);child.stderr.on('data',bytes=>stderr+=bytes);
    child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
  });
  assert.equal(output.code,0,`${script}: ${output.stderr}\n${output.stdout}`);
  return output.stdout;
}
try {
  const generate=async name=>{
    initializeNative(name,path.join(scratch,name),{full:name==='spec'});
    process.stdout.write(`${name}: yss 原生初始化通过\n`);
  };
  const generated=[];
  if(process.env.YSS_TEMPLATE_CONCURRENCY==='1') {
    for(const profile of profiles) {
      try {generated.push({status:'fulfilled',value:await generate(profile)});}
      catch(reason){generated.push({status:'rejected',reason});}
    }
  } else generated.push(...await Promise.allSettled(profiles.map(generate)));
  for(const result of generated)if(result.status==='rejected')throw result.reason;
  const source=path.join(scratch,'design'), target=path.join(scratch,'backend'), output=path.join(scratch,'bundle');
  const {fixture,context}=await import(pathToFileURL(path.join(source,'scripts/fixtures/strategic-handoff/fixture.mjs')));
  const {read,json}=await import(pathToFileURL(path.join(target,'scripts/lib/strategic-handoff-io.mjs')));
  const f=await fixture(source,{handoffVersion:5});
  writeFileSync(path.join(target,'CONTEXT.md'),context);
  const finalized=JSON.parse(await run(path.join(source,'scripts/strategic-handoff'),['finalize','--source-root',source,'--handoff','handoff.yaml','--zip']));
  assert.equal(finalized.result,'packaged');
  cpSync(finalized.delivery,output,{recursive:true,errorOnExist:true,force:false});
  rmSync(source,{recursive:true,force:true});
  for(const receiver of [target,path.join(scratch,'frontend'),path.join(scratch,'spec')]) {
    for(const bundle of [output,path.join(output,'package.zip')]) {
      const verified=JSON.parse(await run(path.join(receiver,'scripts/strategic-handoff'),['verify','--bundle',bundle]));
      assert.equal(verified.rules,1);assert.equal(verified.scenarios,1);assert.equal(verified.bundle_digest,finalized.bundle_digest);
    }
  }
  const imported=JSON.parse(await run(path.join(target,'scripts/strategic-handoff'),['import','--bundle',output,'--target-root',target]));
  const receipt=read(path.join(target,imported.receipt_ref));assert.equal(receipt.schema_version,3);assert.equal(receipt.ready_for_agent,false);
  assert.deepEqual(readFileSync(path.join(target,receipt.source_delivery_record_ref)),readFileSync(path.join(output,'delivery-record.json')));
  assert.equal(readFileSync(path.join(target,'CONTEXT.md'),'utf8'),context);
  const draft=read(path.join(target,imported.traceability_ref));
  const tactical=read(path.join(target,'.agents/skills/yss-tactical-design/tests/fixtures/valid-tactical-design.yaml'));
  tactical.status='approved';
  tactical.strategic_handoff={...draft,context_reconciliation_ref:'reconciliation.yaml'};
  const seam=tactical.test_seams[0];
  for(const row of tactical.strategic_handoff.rows)Object.assign(row,{
    disposition:'implemented',tactical_refs:[seam.subject_ref],test_seam_refs:[seam.seam_id],
    scenario_tests:[{outcome:'success',seam_ref:seam.seam_id},{outcome:'failure',seam_ref:seam.seam_id}],
    evidence_refs:['CONTEXT.md'],dependency_status:'known',dependent_slice_refs:['slice.submit'],
  });
  writeFileSync(path.join(target,'reconciliation.yaml'),json({schema_version:1,repository_mode:'project-instance',stage:'stage.system-data-engineering',work_unit:'work-unit.technical-analysis',status:'reconciled',context_snapshot:f.snapshot,changes:{added:['Global/Supplier'],updated:[],deprecated:[]},unresolved_terms:[],evidence_refs:['CONTEXT.md']}));
  writeFileSync(path.join(target,'tactical.yaml'),json(tactical));
  await run(path.join(target,'.agents/skills/yss-tactical-design/scripts/validate-tactical-design.mjs'),[path.join(target,'tactical.yaml'),'--root',target]);
  const consumed=JSON.parse(await run(path.join(target,'scripts/verify-strategic-handoff-consumption'),['--root',target,'--slice','slice.submit',path.join(target,'tactical.yaml')]));
  assert.equal(consumed.result,'verified');
  process.stdout.write('原生实例当前交接链路通过：设计 v5 finalize → 源仓移除 → 综合/后端/前端离线验包 → 后端 Receipt v3 → 对账 → 战术校验 → 切片消费\n');
} finally { rmSync(scratch,{recursive:true,force:true}); }
