#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root=path.resolve(import.meta.dirname,'../..');
const scratch=mkdtempSync(path.join(tmpdir(),'yss-delivery-distribution-'));
async function run(script,args=[],{cwd=root,env=process.env,success=true}={}) {
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd,env,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',bytes=>stdout+=bytes);child.stderr.on('data',bytes=>stderr+=bytes);
    child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
  });
  if(success)assert.equal(result.code,0,`${script}: ${result.stderr}\n${result.stdout}`);
  else assert.notEqual(result.code,0,'应当拒绝');
  return result;
}
try {
  for(const side of ['backend','frontend']) {
    const source=path.join(root,`submodules/yss-harness-${side}-agent`),target=path.join(scratch,side);
    const initialized=JSON.parse((await run(path.join(source,'scripts/instantiate-harness'),['--target',target,'--allow-working-tree'])).stdout);
    assert.equal(initialized.profile_id,`harness.${side}-delivery`);
    const metadata=JSON.parse(readFileSync(path.join(target,`.yss-harness-${side}.json`)));
    assert.equal(metadata.source_tree_digest,initialized.source_tree_digest);
    if(!initialized.release_snapshot)await run(path.join(source,'scripts/instantiate-harness'),['--target',path.join(scratch,`refused-${side}`)],{success:false});
    assert.match(readFileSync(path.join(target,'yss-project.yaml'),'utf8'),/repository_mode: project-instance/);
    await run(path.join(target,'scripts/verify-harness-profile'));
    await run(path.join(target,'scripts/verify-entry-alignment'));
    await run(path.join(source,'scripts/instantiate-harness'),['--target',target,'--allow-working-tree'],{success:false});
    const {enforceHarnessTaskScope,enforceHarnessSkillScope}=await import(pathToFileURL(path.join(target,'scripts/lib/harness-execution-scope.mjs')));
    const opposite=side==='frontend'?'backend':'frontend';
    assert.throws(()=>enforceHarnessTaskScope({contract:{kind:'lifecycle-work-unit'},role_id:`role.${opposite}-agent`,execution_state:'Worker',allowed_write_paths:['docs/']},{root:target}),/另一端/);
    assert.throws(()=>enforceHarnessSkillScope(['opposite'],{skills:[{id:'opposite',impacts:[opposite]}]},{root:target}),/另一端技能/);
    const profilePath=path.join(target,'docs/process/harness-profile.yaml'),profileBytes=readFileSync(profilePath);
    writeFileSync(profilePath,'schema_version: 1\nprofile_id: harness.dev-agent-slice\n');
    assert.throws(()=>enforceHarnessTaskScope({},{root:target}),/metadata 与 profile 不一致/);
    writeFileSync(profilePath,profileBytes);
    process.stdout.write(`${side}: 初始化身份、独立入口、禁止覆盖和跨端任务边界通过\n`);
  }
  // A frontend project must reject even contract preparation while either input is absent.
  const frontend=path.join(scratch,'frontend');
  const {enforceFrontendDelivery}=await import(pathToFileURL(path.join(frontend,'scripts/lib/frontend-delivery-boundary.mjs')));
  assert.throws(()=>enforceFrontendDelivery({slice_id:'slice.missing'},{root:frontend}),/frontend-delivery-required/);
  const result=await run(path.join(root,'scripts/verify-frontend-delivery-scenarios'),[],{env:{...process.env,YSS_DELIVERY_TEST_BACKEND_ROOT:path.join(scratch,'backend'),YSS_DELIVERY_TEST_FRONTEND_ROOT:frontend}});
  process.stdout.write(result.stdout);
  process.stdout.write('生成实例接力及阻断验证通过；服务为维护测试进程，不是产品部署验收。\n');
} finally {rmSync(scratch,{recursive:true,force:true});}
