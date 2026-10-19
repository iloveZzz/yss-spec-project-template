#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {initializeNative, inspectNative, runNative, NATIVE_PROFILES} from './lib/native-yss.mjs';
import {parseDocument} from '../../scripts/vendor/yaml.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const scratch=realpathSync(mkdtempSync(path.join(tmpdir(),'yss-delivery-distribution-')));
async function run(script,args=[],{cwd=root,env=process.env,success=true}={}) {
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[...args.filter(arg=>arg.startsWith('--test-name-pattern=')),script,...args.filter(arg=>!arg.startsWith('--test-name-pattern='))],{cwd,env,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',bytes=>stdout+=bytes);child.stderr.on('data',bytes=>stderr+=bytes);
    child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
  });
  if(success)assert.equal(result.code,0,`${script}: ${result.stderr}\n${result.stdout}`);
  else assert.notEqual(result.code,0,'应当拒绝');
  return result;
}
try {
  const initializeSide = async side => {
    const target=path.join(process.env.YSS_DEDICATED_INSTANCE_ROOT||scratch,side);
    if(!process.env.YSS_DEDICATED_INSTANCE_ROOT)initializeNative(side,target);
    const metadata=JSON.parse(readFileSync(path.join(target,'.yss.json')));
    assert.equal(metadata.schemaVersion,4);
    assert.equal(metadata.bundleSchemaVersion,4);
    assert.equal(metadata.protocolVersion,1);
    assert.equal(metadata.profileId,{spec:'harness.spec-template',backend:'harness.backend-delivery'}[side]);
    assert.equal(metadata.templateCommit,inspectNative(side).templateCommit);
    assert.equal(existsSync(path.join(target,'scripts/instantiate-harness')),false);
    assert.match(readFileSync(path.join(target,'yss-project.yaml'),'utf8'),/repository_mode: project-instance/);
    runNative(['init','--profile',side,'--root',target],{expectedCode:'CONFLICT'});
    const preview=runNative(['sync','--profile',side,'--root',target]).result;
    assert.equal(preview.command,'sync');
    const contractRef={spec:'yss-product-lifecycle',backend:'harness-orchestrator'}[side];
    const {loadOrchestrationContract}=await import(pathToFileURL(path.join(target,'scripts/lib/orchestration-contract.mjs')));
    const policy=loadOrchestrationContract(ref=>readFileSync(path.join(target,ref)),'.template-spec/process/orchestration-contract.yaml').value;
    assert.equal(policy.progression_target?.schema_version,1);
    assert(policy.progression_target.required_capabilities.includes('lifecycle-target-v1'));
    assert.equal(existsSync(path.join(target,'.template-spec/process/schemas/progression-target.schema.json')),true);
    await run(path.join(target,side==='spec'?'scripts/verify-project-instance':'scripts/verify-harness-profile'));
    if(side!=='spec')await run(path.join(target,'scripts/verify-entry-alignment'));
    if(side==='spec'){process.stdout.write('spec: 真实 Bundle 推进政策及本地设计资产通过\n');return;}
    const {enforceHarnessTaskScope,enforceHarnessSkillScope}=await import(pathToFileURL(path.join(target,'scripts/lib/harness-execution-scope.mjs')));
    const opposite='frontend';
    assert.throws(()=>enforceHarnessTaskScope({contract:{kind:'lifecycle-work-unit'},role_id:`role.${opposite}-agent`,execution_state:'Worker',allowed_write_paths:['docs/']},{root:target}),/另一端/);
    assert.throws(()=>enforceHarnessSkillScope(['opposite'],{skills:[{id:'opposite',impacts:[opposite]}]},{root:target}),/另一端技能/);
    const profilePath=path.join(target,'.template-spec/process/harness-profile.yaml'),profileBytes=readFileSync(profilePath);
    writeFileSync(profilePath,'schema_version: 1\nprofile_id: harness.dev-agent-slice\n');
    assert.throws(()=>enforceHarnessTaskScope({},{root:target}),/metadata 与 profile 不一致/);
    writeFileSync(profilePath,profileBytes);
    process.stdout.write(`${side}: 初始化身份、独立入口、禁止覆盖和跨端任务边界通过\n`);
  };
  // The supervisor's serial option also constrains this existing inner pair.
  const initializedSides = [];
  if (process.env.YSS_TEMPLATE_CONCURRENCY === '1') {
    for (const side of NATIVE_PROFILES) {
      try { initializedSides.push({status:'fulfilled', value:await initializeSide(side)}); }
      catch (reason) { initializedSides.push({status:'rejected', reason}); }
    }
  } else initializedSides.push(...await Promise.allSettled(NATIVE_PROFILES.map(initializeSide)));
  const failedSide = initializedSides.find(result => result.status === 'rejected');
  if (failedSide) throw failedSide.reason;
  const instances=process.env.YSS_DEDICATED_INSTANCE_ROOT||scratch;
  const backendTerminal=await run(path.join(root,'scripts/fixtures/backend-delivery/backend-profile-terminal-scenarios.mjs'),['--native-seed',path.join(instances,'backend')]);
  process.stdout.write(backendTerminal.stdout);
  process.stdout.write('生成实例接力及阻断验证通过；服务为维护测试进程，不是产品部署验收。\n');
} finally {rmSync(scratch,{recursive:true,force:true});}
