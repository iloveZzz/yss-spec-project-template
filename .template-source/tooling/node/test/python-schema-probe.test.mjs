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

test('代表 Schema 重放使用观察到的本地引用闭包并保留拒绝结果',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schema-probe-ref-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const schema=path.join(root,'schema.json');
 fs.writeFileSync(schema,JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://example.invalid/schema.json',$ref:'value.json'}));
 fs.writeFileSync(path.join(root,'value.json'),JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',type:'integer',minimum:1}));
 const probe=installSchemaProbe({root});t.after(()=>probe.close());
 const actual=probe.withOperation({id:'local-ref',entrypoint:'validateJsonSchemas'},()=>validateJsonSchemas([{schemaPath:schema,value:0}]));
 assert.equal(actual[0].valid,false);
 assert.match(actual[0].error,/less than the minimum/);
 fs.writeFileSync(path.join(root,'value.json'),JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',type:'integer',minimum:0}));
 const changed=probe.withOperation({id:'changed-local-ref',entrypoint:'validateJsonSchemas'},()=>validateJsonSchemas([{schemaPath:schema,value:0}]));
 assert.equal(changed[0].valid,true);
 const measured=probe.measurePython(1);
 assert.equal(measured.validation[0].status,'measured');
 assert.equal(measured.validation[0].samples[0].valid,false);
 assert.equal(measured.validation[1].samples[0].valid,true);
 assert.ok(probe.report().batches[0].jobs[0].resources_sha256);
 assert.notEqual(probe.report().batches[0].jobs[0].resources_sha256,probe.report().batches[1].jobs[0].resources_sha256);
});

test('未知引用重放失败并保留实际 Python 退出码和错误',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schema-probe-unknown-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const schema=path.join(root,'schema.json');
 fs.writeFileSync(schema,JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$ref:'#/$defs/Unknown'}));
 const probe=installSchemaProbe({root});t.after(()=>probe.close());
 const actual=probe.withOperation({id:'unknown-ref',entrypoint:'validateJsonSchemas'},()=>validateJsonSchemas([{schemaPath:schema,value:1}]));
 assert.equal(actual[0].valid,false);
 assert.match(actual[0].error,/PointerToNowhere/);
 assert.throws(()=>probe.measurePython(1),/Python diagnostic subprocess failed: exit_code=1,[\s\S]*PointerToNowhere/);
});

test('未登记的外部 Schema 引用继续被离线校验拒绝',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schema-probe-offline-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const schema=path.join(root,'schema.json');fs.writeFileSync(schema,JSON.stringify({$ref:'https://example.invalid/remote.json'}));
 const probe=installSchemaProbe({root});t.after(()=>probe.close());
 assert.throws(()=>probe.withOperation({id:'external-ref',entrypoint:'validateJsonSchemas'},()=>validateJsonSchemas([{schemaPath:schema,value:1}])),/JSON_SCHEMA_OFFLINE/);
});

test('诊断重放按 UTF-8 字节帧读取，管道写端保持打开时仍保留校验结果',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schema-probe-frame-')),previousPath=process.env.PATH;
 t.after(()=>{process.env.PATH=previousPath;fs.rmSync(root,{recursive:true,force:true});});
 const python=cp.spawnSync('python3',['-c','import sys; print(sys.executable)'],{encoding:'utf8'}).stdout.trim();
 assert.ok(python);
 const schema=path.join(root,'valid.json'),otherSchema=path.join(root,'invalid.json'),value='中文😀'.repeat(30000);
 fs.writeFileSync(schema,JSON.stringify({type:'string',const:value}));
 fs.writeFileSync(otherSchema,JSON.stringify({type:'string',const:'不同值'}));
 // Replay through real Python with its stdin writer deliberately kept open.
 // Startup/import probes have no payload and retain their ordinary invocation.
 fs.writeFileSync(path.join(root,'python3'),`#!${python}\nimport sys,subprocess\nif 'sys.stdin' not in sys.argv[2]:\n    sys.exit(subprocess.call([${JSON.stringify(python)},*sys.argv[1:]]))\npayload=sys.stdin.buffer.read(int(sys.argv[-1])) if len(sys.argv)>3 else sys.stdin.buffer.read()\nchild=subprocess.Popen([${JSON.stringify(python)},*sys.argv[1:]],stdin=subprocess.PIPE)\nchild.stdin.write(payload)\nchild.stdin.flush()\ntry:\n    code=child.wait(timeout=2)\nexcept subprocess.TimeoutExpired:\n    print('SCHEMA_EOF_WAIT_REPRO: diagnostic waited for stdin EOF',file=sys.stderr)\n    child.kill()\n    child.wait()\n    code=73\nfinally:\n    child.stdin.close()\nsys.exit(code)\n`,{mode:0o755});
 process.env.PATH=`${root}${path.delimiter}${previousPath}`;
 const probe=installSchemaProbe({root});t.after(()=>probe.close());
 const actual=probe.withOperation({id:'held-open-frame',entrypoint:'validateJsonSchemas'},()=>validateJsonSchemas([{schemaPath:schema,value},{schemaPath:otherSchema,value}]));
 assert.deepEqual(actual.map(row=>row.valid),[true,false]);
 const measured=probe.measurePython(1);
 assert.deepEqual(measured.validation.map(row=>row.samples[0].valid),[true,false]);
});
