import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import cp from 'node:child_process';
import {installSchemaProbe} from '../../../scripts/lib/python-schema-probe.mjs';
import {validateJsonSchemas} from '../../../../scripts/lib/json-schema.mjs';
test('schema diagnostics preserve results, distinguish mutations and never serialize input bodies', t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schema-probe-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const schema=path.join(root,'schema.json');fs.writeFileSync(schema,JSON.stringify({type:'object',required:['secret'],properties:{secret:{type:'string'}}}));
 const items=[{schemaPath:schema,value:{secret:'private-body-must-not-appear'}}];const expected=validateJsonSchemas(items),original=cp.spawnSync;
 const probe=installSchemaProbe({root});t.after(()=>probe.close());
 probe.withOperation({id:'first',entrypoint:'test'},()=>{assert.deepEqual(validateJsonSchemas(items),expected);assert.deepEqual(validateJsonSchemas(items),expected);});
 probe.withOperation({id:'second',entrypoint:'test'},()=>assert.deepEqual(validateJsonSchemas(items),expected));
 assert.throws(()=>probe.withOperation({id:'second',entrypoint:'test'},()=>assert.fail('must not run')),/distinct/);
 fs.writeFileSync(schema,JSON.stringify({type:'object',required:['other']}));
 probe.withOperation({id:'third',entrypoint:'test'},()=>assert.equal(validateJsonSchemas(items)[0].valid,false));
 const report=probe.report();assert.equal(report.batches.length,4);assert.equal(report.groups[0].repeated_jobs,1);assert.equal(report.groups[1].repeated_jobs,0);assert.equal(report.cross_operation_repeated_jobs,1);assert.notEqual(report.batches[0].jobs[0].schema_sha256,report.batches[3].jobs[0].schema_sha256);assert.equal(JSON.stringify(report).includes('private-body-must-not-appear'),false);
 probe.close();assert.equal(cp.spawnSync,original);assert.equal(validateJsonSchemas(items)[0].valid,false);
});
