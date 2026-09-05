#!/usr/bin/env node
// Maintainer smoke test of already synchronized local CLI snapshots.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root=path.resolve(import.meta.dirname,'../..');
const scratch=mkdtempSync(path.join(tmpdir(),'yss-handoff-distribution-'));
const profiles=[
  ['spec','create-yss-spec','create-yss-spec.js'],
  ['design','create-yss-strategic-design','create-yss-harness-design.js'],
  ['dev','create-yss-harness-dev','create-yss-harness-dev.js'],
];
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
  const generated=await Promise.allSettled(profiles.map(async([name,repo,bin])=>{
    await run(path.join(root,'submodules',repo,'bin',bin),['--project-name',`Handoff ${name}`,'--business-domain','合成交接验证','--team-size','3','--target-dir',path.join(scratch,name)]);
    process.stdout.write(`${name}: CLI 生成实例通过\n`);
  }));
  for(const result of generated)if(result.status==='rejected')throw result.reason;
  const source=path.join(scratch,'design'), target=path.join(scratch,'dev'), output=path.join(scratch,'bundle');
  const {fixture,context}=await import(pathToFileURL(path.join(source,'scripts/fixtures/strategic-handoff/fixture.mjs')));
  const {read,json}=await import(pathToFileURL(path.join(target,'scripts/lib/strategic-handoff-io.mjs')));
  const f=await fixture(source);
  writeFileSync(path.join(target,'CONTEXT.md'),context);
  await run(path.join(source,'scripts/strategic-handoff'),['export','--source-root',source,'--handoff','handoff.yaml','--output',output,'--zip']);
  rmSync(source,{recursive:true,force:true});
  for(const receiver of [target,path.join(scratch,'spec')]) {
    const verified=JSON.parse(await run(path.join(receiver,'scripts/strategic-handoff'),['verify','--bundle',`${output}.zip`]));
    assert.equal(verified.rules,1);assert.equal(verified.scenarios,1);
  }
  const imported=JSON.parse(await run(path.join(target,'scripts/strategic-handoff'),['import','--bundle',`${output}.zip`,'--target-root',target]));
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
  process.stdout.write('生成实例跨仓链路通过：设计导出 → 源仓移除 → 综合/研发验包 → 研发导入 → 对账 → 战术校验 → 切片消费\n');
} finally { rmSync(scratch,{recursive:true,force:true}); }
