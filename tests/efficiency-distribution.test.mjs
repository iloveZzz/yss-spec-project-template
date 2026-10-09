import {NATIVE_PROFILES,inspectNative,runNative} from '../.template-source/scripts/lib/native-yss.mjs';
import os from 'node:os';
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

test('native Bundle exports retain platform evidence and reject missing or changed reports',t=>{
 const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'platform-distribution-')));
 t.after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
 for(const profile of NATIVE_PROFILES){
  const target=path.join(scratch,profile);runNative(['bundle','export','--profile',profile,'--out',target]);
  assert.equal(fs.existsSync(path.join(target,'.template-source')),false);
  const query=()=>spawnSync(process.execPath,[path.join(target,'scripts/backend-platforms'),'--require-profile','spring-boot-3.5-jdk17'],{cwd:target,encoding:'utf8'});
  const result=query();assert.equal(result.stderr,'',`${profile}: ${result.stderr}`);
  const report=JSON.parse(result.stdout);assert.equal(result.status,report.required_profile.selectable?0:1);
  if(profile==='backend')for(const skill of ['yss-ddd-scaffold-generator','yss-layered-mvc-scaffold-generator']){
   const skillRoot=path.join(target,'.agents/skills',skill),output=path.join(scratch,`${skill}-output`),evidenceDir=path.join(scratch,`${skill}-evidence`);
   const args=[path.join(skillRoot,'scripts/generate_and_verify_scaffold.mjs'),'--project-name','consumer-service','--base-package','com.yss.consumer','--output-dir',output,'--contract-file',path.join(scratch,'missing-contract.json'),'--evidence-dir',evidenceDir,
    '--contract-id','test-only','--contract-version','1','--approval-ref','test-only','--compiler-draft-ref','test-only','--persisted-ref','test-only',
    '--group-id','com.yss.test','--project-version','1.0.0-SNAPSHOT','--parent-group-id','com.yss.test','--parent-artifact-id','test-only-parent','--parent-version','1.0.0-SNAPSHOT','--yss-components-version','1.0.0-SNAPSHOT'];
   const blocked=spawnSync(process.execPath,args,{cwd:skillRoot,encoding:'utf8'});
   assert.equal(blocked.status,1,`${skill}: ${blocked.stderr}`);assert.match(blocked.stderr,/合同/);
   assert.equal(fs.existsSync(output),false,`${skill}: missing contract created project output`);
   assert.equal(fs.existsSync(path.join(evidenceDir,'scaffold-verification.json')),false,`${skill}: verification ran without a contract`);
  }
  const catalog=JSON.parse(fs.readFileSync(path.join(target,'.template-spec/engineering/backend-platforms.json')));
  const evidence=path.join(target,catalog.compatibility.find(row=>row.artifact_resolution_evidence).artifact_resolution_evidence.ref);
  const bytes=fs.readFileSync(evidence);fs.appendFileSync(evidence,'\n');
  const drift=query();assert.equal(drift.status,1);assert.match(drift.stderr,/artifact resolution evidence drift/);
  fs.writeFileSync(evidence,bytes);fs.unlinkSync(evidence);
  const missing=query();assert.equal(missing.status,1);assert.match(missing.stderr,/artifact resolution evidence is unreadable/);
 }
});

test('design query parsing and binding use the same phase snapshot',async()=>{
 const {syncBuiltinESMExports}=await import('node:module');const {queryLifecycleContext}=await import('../submodules/yss-harness-design-agent/scripts/lib/lifecycle-context-query.mjs');const ref=path.resolve('submodules/yss-harness-design-agent/.template-spec/process/lifecycle-registry.yaml'),read=fs.readFileSync;let reads=0;
 fs.readFileSync=function(file,...args){const value=read.call(this,file,...args);if(String(file)===ref && ++reads>1)return Buffer.concat([Buffer.from(value),Buffer.from('\n# drift')]);return value;};syncBuiltinESMExports();
 try{assert.throws(()=>queryLifecycleContext({mode:'route'}),/VALIDATION_INPUT_CHANGED/);}finally{fs.readFileSync=read;syncBuiltinESMExports();}
});
