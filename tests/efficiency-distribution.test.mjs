import {NATIVE_PROFILES,inspectNative} from '../.template-source/scripts/lib/native-yss.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('all maintained task consumers accept intake and preserve empty writes',()=>{
 for(const side of ['root','design','backend','frontend']){
  const root=path.resolve(side==='root'?'.':`submodules/yss-harness-${side}-agent`);
  const script=`import {generateTaskPackageDefaults,validateTaskPackage} from './scripts/lib/task-package.mjs';
  const task=generateTaskPackageDefaults('${['backend','frontend'].includes(side)?'role.harness-orchestrator':'role.requirements-manager'}',{schema_version:2,task_id:'intake-smoke',work_unit_id:'${['backend','frontend'].includes(side)?'work-unit.harness-entry':'work-unit.entry-triage'}',actor_id:'owner',runtime_id:'runtime.generic',execution_state:'Explorer',workflow_status:'active',contract:{kind:'read-only-intake',contract_id:'intake',contract_version:1,status:'issued',contract_ref:'CONTEXT.md'},inputs:['CONTEXT.md'],objective:'source inspection',allowed_write_paths:[],forbidden_actions:['write'],expected_outputs:['source refs'],expected_evidence_files:[],verification_commands:[],verification_results:[],verification_status:'not-executed',downstream_consumers:['owner'],convergence:{parent_work_unit:'work-unit.entry-triage',convergence_ref:'current-chat'}});validateTaskPackage(task);`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,`${side}: ${result.stderr}`);
 }
});
test('four native Bundle manifests include read-only producer and consumer',()=>{
 for(const profile of NATIVE_PROFILES){const inspection=inspectNative(profile);
  for(const ref of ['scripts/prepare-read-only-intake','scripts/run-read-only-intake','scripts/lib/read-only-intake.mjs'])assert.ok(inspection.files[ref],`${profile}/${ref}`);
 }
});

test('design query parsing and binding use the same phase snapshot',async()=>{
 const {syncBuiltinESMExports}=await import('node:module');const {queryLifecycleContext}=await import('../submodules/yss-harness-design-agent/scripts/lib/lifecycle-context-query.mjs');const ref=path.resolve('submodules/yss-harness-design-agent/.template-spec/process/lifecycle-registry.yaml'),read=fs.readFileSync;let reads=0;
 fs.readFileSync=function(file,...args){const value=read.call(this,file,...args);if(String(file)===ref && ++reads>1)return Buffer.concat([Buffer.from(value),Buffer.from('\n# drift')]);return value;};syncBuiltinESMExports();
 try{assert.throws(()=>queryLifecycleContext({mode:'route'}),/VALIDATION_INPUT_CHANGED/);}finally{fs.readFileSync=read;syncBuiltinESMExports();}
});
