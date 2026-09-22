import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {withValidationPhase,readFileSync,existsSync,validationDependencies,acceptValidationDependencies,validationMemo} from '../../lib/validation-phase.mjs';
import {createApprovedExecutionContext,assertApprovedExecutionContext} from '../../lib/approved-execution-context.mjs';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {parseSliceYaml} from '../../lib/slice-contract.mjs';
import {validateJsonSchemas} from '../../lib/json-schema.mjs';
import {inspectSliceContract} from '../../lib/slice-execution-preflight.mjs';
import {compileSliceTaskPackage} from '../../lib/slice-task-package.mjs';
test('child dependency receipts reject missing, conflicting, and changed sources including policy/schema/message bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'phase-security-'));
 try{for(const name of ['contract','approval','policy','schema','message']){
 const file=path.join(root,name);fs.writeFileSync(file,'initial');
 const child=withValidationPhase({root,purpose:'child'},()=>{readFileSync(file);return validationDependencies();});
 assert.throws(()=>withValidationPhase({root,purpose:'parent'},()=>{readFileSync(file);acceptValidationDependencies({...child,files:[{file,digest:'0'.repeat(64)}]});}),/VALIDATION_INPUT_CHANGED/);
 assert.throws(()=>withValidationPhase({root,purpose:'parent'},()=>{acceptValidationDependencies(child);fs.writeFileSync(file,'changed');}),/VALIDATION_INPUT_CHANGED/);
 }
 assert.throws(()=>withValidationPhase({root,purpose:'parent'},()=>acceptValidationDependencies(undefined)),/VALIDATION_RECEIPT_INVALID/);
 const absent=path.join(root,'new-policy');assert.throws(()=>withValidationPhase({root,purpose:'parent'},()=>{existsSync(absent);const copy=validationDependencies();for(const row of copy.observations)if(row.kind==='exists')row.value=true;fs.writeFileSync(absent,'new');}),/VALIDATION_INPUT_CHANGED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('stages isolate immutable parsed values, purposes, roots, units and read-only state; cancellation rejects success',()=>{
 const a={root:process.cwd(),purpose:'a',readOnly:true,work_unit_id:'a'};let calls=0;
 withValidationPhase(a,()=>{
  const first=validationMemo('test','key',()=>({constraints:['original']}));first.constraints.push('forged');
  assert.deepEqual(validationMemo('test','key',()=>assert.fail()),{constraints:['original']});
  for(const overrides of [{purpose:'b'},{root:path.dirname(process.cwd())},{work_unit_id:'b'},{readOnly:false}])withValidationPhase({...a,...overrides},()=>validationMemo('test','key',()=>++calls));
 });assert.equal(calls,4);
 const controller=new AbortController();assert.throws(()=>withValidationPhase({...a,signal:controller.signal},()=>controller.abort()),/VALIDATION_CANCELLED/);
 assert.throws(()=>inspectSliceContract('must-not-read.yaml',{root:process.cwd(),signal:controller.signal}),/VALIDATION_CANCELLED/);
 assert.throws(()=>compileSliceTaskPackage({ref:'must-not-read.yaml'},{root:process.cwd(),signal:controller.signal}),/VALIDATION_CANCELLED/);
});
test('branded execution context rejects serialization, another root, read-only upgrade and reuse after its stage',()=>{
 const f=pilotFixture();try{
 const {binding}=f.approve();let saved;
 withValidationPhase({root:f.root,purpose:'inspect',readOnly:true},()=>{
  saved=createApprovedExecutionContext(binding,{root:f.root,work_unit_id:'work-unit.slice-backend',readOnly:true});
  assert.throws(()=>assertApprovedExecutionContext(JSON.parse(JSON.stringify(saved)),{root:f.root,readOnly:true}),/EXECUTION_CONTEXT_UNTRUSTED/);
  assert.throws(()=>assertApprovedExecutionContext(saved,{root:path.dirname(f.root),readOnly:true}),/EXECUTION_CONTEXT_UNTRUSTED/);
  assert.throws(()=>assertApprovedExecutionContext(saved,{root:f.root}),/EXECUTION_CONTEXT_READ_ONLY/);
 });assert.throws(()=>assertApprovedExecutionContext(saved,{root:f.root,readOnly:true}),/EXECUTION_CONTEXT_EXPIRED/);
 }finally{f.cleanup();}
});
test('strict YAML and schema batching preserve duplicates, precision, array order, options and error order',()=>{
 assert.throws(()=>parseSliceYaml('x: 1\nx: 2'),/YAML/);assert.throws(()=>parseSliceYaml('x: 9007199254740993'),/精确范围/);
 assert.deepEqual(parseSliceYaml('x: [b, a]').x,['b','a']);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schema-security-')),schemaPath=path.join(root,'schema.json');
 fs.writeFileSync(schemaPath,JSON.stringify({type:'string',format:'ipv4'}));
 try{withValidationPhase({root,purpose:'schema'},()=>{
 const items=[{value:'中文',schemaPath},{value:'中文',schemaPath,formatChecker:false},{value:4,schemaPath,errorStyle:'verbose'},{value:'中文',schemaPath}];
 const result=validateJsonSchemas(items);assert.deepEqual(result.map(r=>r.valid),[false,true,false,false]);assert.deepEqual(result[0],result[3]);assert.match(result[2].error,/Failed validating/);
 assert.deepEqual(validateJsonSchemas(items),result);
 });}finally{fs.rmSync(root,{recursive:true,force:true});}
});
