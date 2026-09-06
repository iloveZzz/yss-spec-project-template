#!/usr/bin/env node
// Validate real packages and upgrades from explicitly supplied previous CLI builds.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const root=path.resolve(import.meta.dirname,'../..');
const scratch=mkdtempSync(path.join(tmpdir(),'yss-cli-upgrade-check-'));
const json=file=>JSON.parse(readFileSync(file,'utf8'));
const profiles=[
  {key:'SPEC',repo:'create-yss-spec',name:'create-yss-spec',metadata:'.yss-template.json',oldVersion:'3.1.0'},
  {key:'DEV',repo:'create-yss-harness-dev',name:'create-yss-harness-dev',metadata:'.yss-harness-dev.json',oldVersion:'0.4.0'},
  {key:'DESIGN',repo:'create-yss-strategic-design',name:'create-yss-harness-design',metadata:'.yss-harness-design.json'},
];
async function run(script,args=[],cwd=root) {
  const output=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',bytes=>stdout+=bytes);child.stderr.on('data',bytes=>stderr+=bytes);
    child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
  });
  assert.equal(output.code,0,`${script}: ${output.stderr}\n${output.stdout}`);
  return output.stdout;
}
const initArgs=target=>['--project-name','Upgrade verification','--business-domain','合成升级验收','--team-size','3','--target-dir',target];
try {
  for(const profile of profiles) {
    const cliRoot=process.env[`YSS_CLI_${profile.key}_ROOT`]||path.join(root,'submodules',profile.repo);
    const manifest=json(path.join(cliRoot,'package.json'));
    const snapshot=json(path.join(cliRoot,'template.snapshot.json'));
    const cli=path.join(cliRoot,'bin',`${profile.name}.js`);
    assert.equal(manifest.name,profile.name);
    assert.equal((await run(cli,['--version'])).trim(),`${profile.name} ${manifest.version}`);
    assert.match(snapshot.templateCommit,/^[a-f0-9]{40}$/);
    assert.equal(snapshot.requestedRef,snapshot.templateCommit);
    assert.match(snapshot.templateRepository,/^https:\/\/github\.com\//);
    const require=createRequire(path.join(cliRoot,'package.json'));
    assert.equal(require('./src/template-hash').treeHash(path.join(cliRoot,'template')),snapshot.snapshotHash);
    const fresh=path.join(scratch,`fresh-${profile.key}`);
    await run(cli,initArgs(fresh));
    const metadata=json(path.join(fresh,profile.metadata));
    assert.equal(metadata.cliVersion,manifest.version);
    assert.equal(metadata.templateCommit,snapshot.templateCommit);
    assert.match(readFileSync(path.join(fresh,'yss-project.yaml'),'utf8'),/repository_mode: project-instance/);
    for(const forbidden of ['.template-source','.github','wiki','package.json']) assert.equal(existsSync(path.join(fresh,forbidden)),false,forbidden);
    for(const [script,args] of [['scripts/sync-skills',['--check']],['scripts/update-skill-lock',['--check']]]) {
      await run(path.join(fresh,script),args,fresh);
    }
    // Only the dedicated development/design profiles define this validator.
    if(profile.key!=='SPEC') await run(path.join(fresh,'scripts/verify-harness-profile'),[],fresh);
    process.stdout.write(`${profile.name}: 包身份、快照摘要、离线初始化及入口/Skill 校验通过\n`);
    if(!profile.oldVersion) continue;
    const oldRoot=process.env[`YSS_OLD_${profile.key}_ROOT`];
    assert.ok(oldRoot,`必须指定 YSS_OLD_${profile.key}_ROOT 以验证真实旧版本升级`);
    assert.equal(json(path.join(oldRoot,'package.json')).version,profile.oldVersion);
    const target=path.join(scratch,`upgrade-${profile.key}`);
    await run(path.join(oldRoot,'bin',`${profile.name}.js`),initArgs(target));
    const metadataPath=path.join(target,profile.metadata),beforeMetadata=readFileSync(metadataPath,'utf8');
    const before=json(metadataPath);
    const userReadme=readFileSync(path.join(target,'README.md'),'utf8')+'\n用户修改必须保留\n';
    writeFileSync(path.join(target,'README.md'),userReadme);
    mkdirSync(path.join(target,'apps/backend/demo'),{recursive:true});
    writeFileSync(path.join(target,'apps/backend/demo/user-code.txt'),'runtime source\n');
    const preview=await run(cli,['sync','--target-dir',target,'--dry-run']);
    assert.match(preview,/README\.md/);
    assert.equal(readFileSync(metadataPath,'utf8'),beforeMetadata);
    await run(cli,['sync','--target-dir',target]);
    const after=json(metadataPath);
    assert.equal(after.profileId,before.profileId);
    assert.equal(after.templateName,before.templateName);
    assert.equal(after.templateSource,before.templateSource);
    assert.equal(after.templateCommit,snapshot.templateCommit);
    assert.equal(after.cliVersion,manifest.version);
    assert.equal(readFileSync(path.join(target,'README.md'),'utf8'),userReadme);
    assert.equal(readFileSync(path.join(target,'apps/backend/demo/user-code.txt'),'utf8'),'runtime source\n');
    assert.ok(existsSync(path.join(target,'docs/process/frontend-backend-delivery.md')));
    for(const marker of ['.yss-harness-backend.json','.yss-harness-frontend.json']) assert.equal(existsSync(path.join(target,marker)),false);
    process.stdout.write(`${profile.name}: ${profile.oldVersion} → ${manifest.version} 同身份同步，用户修改与运行时代码保留\n`);
  }
} finally {rmSync(scratch,{recursive:true,force:true});}
