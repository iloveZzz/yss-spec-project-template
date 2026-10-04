import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'../../../..');
const command=path.join(root,'.template-source/scripts/diagnose-python-schema.mjs');

test('Schema 诊断比较当前 Slice v3 的正常、缺失、漂移和恢复行为',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'schema-diagnostic-test-'));
  try {
    const output=path.join(temp,'diagnostic');
    const run=spawnSync(process.execPath,[command,'--output',output],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
    assert.equal(run.status,0,run.stderr);
    const report=JSON.parse(fs.readFileSync(path.join(output,'report.json'),'utf8'));
    assert.equal(report.fixture.slice_schema_version,3);
    assert.equal(report.outcomes_equal,true);
    assert.deepEqual(report.outcomes.map(({id,result})=>[id,result]),[
      ['valid-1','allowed'],['valid-2','allowed'],['missing-source','blocked'],
      ['restored-source','allowed'],['changed-source','blocked'],
      ['restored-digest','allowed'],['missing-approval','blocked'],
      ['restored-approval','allowed'],
    ]);
    assert.deepEqual(report.outcomes.filter(row=>row.result==='blocked').map(({id,blocking_signals})=>[id,blocking_signals]),[
      ['missing-source',['文件不可读: spec.md']],
      ['changed-source',['slice-contract-invalid: stale: 上游依据 spec 原始字节变化']],
      ['missing-approval',['文件不可读: v3-checkpoint.json']],
    ]);
    assert.ok(report.trace.batches.length>0);
    assert.ok(report.trace.batches.every(row=>row.operation_id!=='unscoped'&&!row.diagnostic_error));
    assert.ok(report.source_bindings['.template-source/scripts/lib/schema-diagnostic-fixture.mjs']);
    assert.equal(fs.existsSync(path.join(output,'fixture.mjs')),false);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

test('诊断子进程失败保留日志和失败报告且不产生成功报告',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'schema-diagnostic-failure-'));
  try {
    const output=path.join(temp,'diagnostic');
    const run=spawnSync(process.execPath,[command,'--output',output],{cwd:root,encoding:'utf8',timeout:120000,env:{...process.env,PATH:''}});
    assert.equal(run.status,1);
    assert.equal(fs.existsSync(path.join(output,'report.json')),false);
    const failure=JSON.parse(fs.readFileSync(path.join(output,'failure.json'),'utf8'));
    assert.equal(failure.runs[0].mode,'baseline');
    assert.equal(failure.runs[0].exit_code,1);
    assert.ok(failure.runs[0].started_at&&failure.runs[0].finished_at);
    assert.ok(fs.readFileSync(path.join(output,'baseline.stderr'),'utf8').length>0);
    assert.ok(failure.source_bindings['.template-source/scripts/lib/schema-diagnostic-fixture.mjs']);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
