import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { assertReleaseCheckout, verifyTemplateRelease } from '../lib/template-release.mjs';
import { RuntimeStore } from '../../cli-core/runtime-store.mjs';
import {validateBaselineReport} from '../lib/verification-report-validator.mjs';
import {createHash} from 'node:crypto';
import {collectReleaseSources} from '../lib/verification-artifacts.mjs';
import {produceCliArtifact,verifyInstalledCliMigration} from '../lib/verification-artifacts.mjs';
import {validateLegacyRecoveryMatrix,REQUIRED_LEGACY_RECOVERY_CASES} from '../lib/legacy-recovery-matrix.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

const root = path.resolve(import.meta.dirname, '../../..');
function put(base, name, text, mode = 0o644) {
  mkdirSync(path.dirname(path.join(base, name)), { recursive: true });
  writeFileSync(path.join(base, name), text, { mode });
}
function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function commit(cwd) {
  git(cwd, 'add', '.');
  git(cwd, '-c', 'user.name=CI fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture');
  return git(cwd, 'rev-parse', 'HEAD');
}
function fixture(t) {
  const base = mkdtempSync(path.join(os.tmpdir(), 'yss-release-test-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const cli=path.join(base,'native-source'),repo=path.join(base,'template');mkdirSync(cli);mkdirSync(repo);
  git(cli,'init','-q');git(repo,'init','-q');
  put(cli,'go.mod','module github.com/iloveZzz/yss-cli\n\ngo 1.27.1\n');put(cli,'main.go',readFileSync(path.join(root,'.template-source/scripts/tests/fixtures/native-release.go'),'utf8'));const cliCommit=commit(cli);
  const templateCommits={};for(const family of ['design','backend','frontend']){const child=path.join(base,family);mkdirSync(child);git(child,'init','-q');put(child,'README.md',`Synthetic ${family} template\n`);templateCommits[family]=commit(child);git(repo,'-c','protocol.file.allow=always','submodule','add','-q',child,`submodules/yss-harness-${family}-agent`);}
  put(repo,'yss-project.yaml','schema_version: 1\nrepository_mode: template-source\n');put(repo,'scripts/repository-mode','#!/bin/sh\necho template-source\n',0o755);
  put(repo,'.template-source/scripts/lib/verification-preflight.mjs','process.stdout.write(JSON.stringify({status:"passed",errors:[]}));');
  put(repo,'.template-source/process/template-verification-profiles.yaml',JSON.stringify({schema_version:1,default_selection:'legacy',profiles:{fast:{all_groups:true},candidate:{all_groups:true},release:{all_groups:true}},groups:{fixture:{commands:[{id:'check.fixture',run:'node -e ""'}]}},required_files:[],syntax_files:[],routing:[]}));
  put(repo, 'scripts/verify-template', `#!/usr/bin/env node
(async()=>{const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process'),{createHash}=require('crypto');const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const {verificationInputDigest,createVerificationReport,finalizeVerificationReport}=await import(${JSON.stringify(pathToFileURL(path.join(root,'scripts/lib/verification-report.mjs')).href)});
 const {compileExpectedVerificationPlan}=await import(${JSON.stringify(pathToFileURL(path.join(root,'.template-source/scripts/lib/verification-report-validator.mjs')).href)});
 const {collectReleaseSources}=await import(${JSON.stringify(pathToFileURL(path.join(root,'.template-source/scripts/lib/verification-artifacts.mjs')).href)});
 const args=process.argv.slice(2),directory=args[args.indexOf('--report-dir')+1],source=fs.realpathSync(process.cwd()),sha=verificationInputDigest(source),plan=compileExpectedVerificationPlan({root:source,args});fs.mkdirSync(directory,{recursive:true});
 const report=createVerificationReport(plan,{root:source,inputDigest:sha,scope:{kind:'complete-candidate'},concurrency:1,invocation:{command:path.join(source,'scripts/run-template-verification'),args:['--profile','release',...args]},sourcesManifest:collectReleaseSources({root:source,commit:spawnSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).stdout.trim()})});
 for(const [index,task] of plan.commands.entries()){const r=spawnSync('/bin/sh',['-c',task.command],{cwd:source,encoding:'utf8'}),stdoutFile=path.join(directory,'task-'+index+'.stdout'),stderrFile=path.join(directory,'task-'+index+'.stderr');fs.writeFileSync(stdoutFile,r.stdout||'');fs.writeFileSync(stderrFile,r.stderr||'');report.results.push({...task,index,code:r.status,actual_exit_code:r.status,actual_exit_code_observed:true,actual_exit_signal:r.signal,stdoutFile,stderrFile,log_digests:{stdoutFile:hash(fs.readFileSync(stdoutFile)),stderrFile:hash(fs.readFileSync(stderrFile))}});if(r.status!==0)throw Error(r.stderr);}
 finalizeVerificationReport(report,{status:'passed',wallMs:1,repositoryMode:'template-source'});report.input_after_sha256=sha;report.input_drift=false;report.final_exit={code:0,signal:null,observed:true};fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report));})().catch(error=>{console.error(error);process.exitCode=1});
`, 0o755);
  const sha=commit(repo),binary=path.join(base,'yss-fixture');
  const bind=templateSha=>{const ldflags=`-X main.cliCommit=${cliCommit} -X main.templateCommit=${templateSha} -X main.designCommit=${templateCommits.design} -X main.backendCommit=${templateCommits.backend} -X main.frontendCommit=${templateCommits.frontend}`;const built=spawnSync('go',['build','-trimpath','-ldflags',ldflags,'-o',binary,'.'],{cwd:cli,env:{...process.env,CGO_ENABLED:'0'},encoding:'utf8'});assert.equal(built.status,0,built.stderr);process.env.YSS_NATIVE_BINARY=binary;process.env.YSS_NATIVE_BINARY_SHA256=hash(readFileSync(binary));process.env.YSS_NATIVE_SOURCE_ROOT=realpathSync(cli);};
  const previous={binary:process.env.YSS_NATIVE_BINARY,sha:process.env.YSS_NATIVE_BINARY_SHA256,source:process.env.YSS_NATIVE_SOURCE_ROOT};t.after(()=>{for(const [key,value]of [['YSS_NATIVE_BINARY',previous.binary],['YSS_NATIVE_BINARY_SHA256',previous.sha],['YSS_NATIVE_SOURCE_ROOT',previous.source]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}});bind(sha);
  return {base,repo,sha,binary,cli,bind,output:path.join(base,'evidence')};
}

test('synthetic 固定源 Go 消费者真实编译、复制和公开导出产生命令证据', t => {
  const f = fixture(t);
  // Four-profile publication algorithms are exercised with a synthetic Go
  // producer. They cannot replace the separate historical recovery matrix.
  const sources=collectReleaseSources({root:f.repo,commit:f.sha}),records=[];
  const run=(file,args,cwd,env)=>{const observed=spawnSync(file,args,{cwd,env,encoding:'utf8'});records.push({file,args,cwd,exit_code:observed.status});return observed;};
  for(const source of sources.entries){const artifact=produceCliArtifact({root:f.repo,source,directory:path.join(f.base,'algorithm-fixture',source.family),run});assert.equal(verifyInstalledCliMigration({artifact,directory:path.join(f.base,'upgrade-fixture',source.family),run}).status,'passed');}
  assert.equal(records.filter(row=>row.args[0]==='bundle'&&row.args[1]==='export').length,4);assert.ok(records.every(row=>row.exit_code===0));
  assert.throws(()=>verifyTemplateRelease({root:f.repo,commit:f.sha,output:path.join(f.base,'formal-refusal')}),/LEGACY_RECOVERY_EVIDENCE/);
  assert.equal(JSON.parse(readFileSync(path.join(f.base,'formal-refusal/release-verification.json'))).status,'failed');
  const result = verifyTemplateRelease({ root: f.repo, commit: f.sha, output: f.output,cliFamily:'spec' });
  assert.equal(result.status, 'passed');
  assert.equal(result.template_commit, f.sha);
  assert.deepEqual(result.commands.find(row => row.command === 'scripts/verify-template')?.args, ['--concurrency', '1', '--runtime-store', 'off', '--report-dir', path.join(realpathSync(f.output), 'full-verification')]);
  assert.equal(result.full_verification.status, 'passed');
  assert.ok(readFileSync(result.full_verification.report).length > 0);
  assert.ok(!result.commands.some(row=>row.command==='npm'));assert.equal(result.artifacts.length,1);assert.ok(result.commands.some(row=>row.args[0]==='bundle'&&row.args[1]==='export'));
  assert.ok(result.commands.some(row=>row.args[0]==='init'&&row.args.includes('--apply')));
  assert.ok(result.commands.every(row => row.exit_code === 0));
  assert.equal(git(f.repo, 'status', '--porcelain'), '');
  assert.equal(JSON.parse(readFileSync(path.join(f.output, 'release-verification.json'))).status, 'passed');
});

test('恢复矩阵 validator 的合成合同单元样例拒绝缺项、fixture、包/日志/二进制和退出码错配',t=>{
 const base=realpathSync(mkdtempSync(path.join(os.tmpdir(),'recovery-contract-unit-')));t.after(()=>rmSync(base,{recursive:true,force:true}));
 const families=['spec','design','backend','frontend'],packages=[],cases=[],binarySha='1'.repeat(64);
 // This temporary input tests validation algorithms only. It contains no real
 // historical executor evidence and never enters a release invocation.
 for(const family of families){const ref=path.join(base,`${family}.tgz`);writeFileSync(ref,'synthetic package bytes');const sha256=hash(readFileSync(ref));packages.push({family,ref,sha256,version:'0.0.0-fixture',cli_commit:'2'.repeat(40)});
  for(const name of REQUIRED_LEGACY_RECOVERY_CASES){const log_ref=`${family}-${name}.log`,refusals={'legacy-requires-explicit-migration':'MIGRATION_REQUIRED','legacy-pending-migration-refusal':'LEGACY_INTERRUPTED','modified-after-apply-rollback-refusal':'CONCURRENT'},negative=Boolean(refusals[name]);writeFileSync(path.join(base,log_ref),'synthetic validator unit data\n');cases.push({family,case:name,exit_code:negative?1:0,expected_code:refusals[name]||'OK',passed:true,log_ref,log_sha256:hash(readFileSync(path.join(base,log_ref))),legacy_package_sha256:sha256});}}
 const report={schema_version:1,kind:'native-legacy-recovery-matrix',status:'passed',input_drift:false,binary_sha256:binarySha,families,packages,cases,unexecuted:[]},file=path.join(base,'matrix.json');
 const persist=()=>writeFileSync(file,JSON.stringify(report)),verify=()=>validateLegacyRecoveryMatrix({file,sha256:hash(readFileSync(file)),binarySha256:binarySha});persist();assert.equal(verify().cases,48);
 report.fixture=true;persist();assert.throws(verify,/fixture/);delete report.fixture;
 report.unexecuted=['unfinished-fixed-executor-recovery'];persist();assert.throws(verify,/未执行/);report.unexecuted=[];
 const row=cases.pop();persist();assert.throws(verify,/必需恢复场景/);cases.push(row);
 report.binary_sha256='3'.repeat(64);persist();assert.throws(verify,/二进制错配/);report.binary_sha256=binarySha;
 row.exit_code=1;persist();assert.throws(verify,/预期错误码矛盾/);row.exit_code=0;
 row.expected_code='INPUT_DRIFT';row.exit_code=1;persist();assert.throws(verify,/成功目标场景/);row.expected_code='OK';row.exit_code=0;
 const refusal=cases.find(value=>value.case==='modified-after-apply-rollback-refusal');refusal.expected_code='RECOVERY_FAILED';persist();assert.throws(verify,/拒绝语义/);refusal.expected_code='CONCURRENT';
 row.legacy_package_sha256='4'.repeat(64);persist();assert.throws(verify,/对应旧固定包/);row.legacy_package_sha256=packages[3].sha256;
 persist();writeFileSync(path.join(base,row.log_ref),'changed');assert.throws(verify,/摘要漂移/);
});

test('真实发布报告兼容 v1 baseline，并拒绝删除 syntax/终检、任务自证和来源错配',t=>{
 const f=fixture(t),outer=verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,cliFamily:'spec'}),file=path.join(f.output,'release-verification.json'),fullFile=outer.full_verification.report;
 const full=JSON.parse(readFileSync(fullFile));
 const verify=()=>validateBaselineReport({root:f.repo,base:f.sha,reportFile:file,expectedDigest:hash(readFileSync(file))});
 const initial=verify();assert.equal(initial.valid,true,initial.reasons.join('; '));
 outer.error='outer integration consumer failure';writeFileSync(file,JSON.stringify(outer));assert.equal(verify().valid,false);delete outer.error;
 const specSources=outer.sources_manifest;outer.cli_families=['spec','design','backend','frontend'];outer.sources_manifest=collectReleaseSources({root:f.repo,commit:f.sha});outer.cli_integrations=[{family:'spec',status:'failed'}];writeFileSync(file,JSON.stringify(outer));const missingIntegration=verify();assert.equal(missingIntegration.valid,false);assert.match(missingIntegration.reasons.join('; '),/集成|integration/);
 outer.cli_families=['spec'];outer.sources_manifest=specSources;delete outer.cli_integrations;writeFileSync(file,JSON.stringify(outer));
 // Model the old runner's separately logged syntax/terminal validators.
 full.schema_version=1;full.plan.commands=full.plan.commands.filter(row=>row.group!=='postchecks'&&row.kind!=='preflight');full.plan.syntax_files=[];
 const terminal=full.results.find(row=>row.task_id==='post.git-diff-check');terminal.command=JSON.stringify(['git','diff','--check']);
 full.results=[...full.results.filter(row=>row.group!=='postchecks'&&row.kind!=='preflight').map((row,index)=>({...row,index})),terminal];
 const persist=()=>{writeFileSync(fullFile,JSON.stringify(full));outer.full_verification.report_sha256=hash(readFileSync(fullFile));writeFileSync(file,JSON.stringify(outer));};persist();
 const result=verify();assert.equal(result.valid,true,result.reasons.join('; '));assert.equal(result.bindings.strategy,'legacy-full');assert.equal(result.bindings.sources_manifest.families[0],'spec');
 full.results.pop();persist();assert.equal(verify().valid,false);
 full.results.push(terminal);full.plan.commands=[];persist();assert.equal(verify().valid,false);
});

test('发布检出允许历史私有模板未初始化，但仍要求三个 Agent 模板源就绪', t => {
  const f = fixture(t);
  const legacy = path.join(f.base, 'legacy-private-template');
  mkdirSync(legacy);
  git(legacy, 'init', '-q');
  put(legacy, 'README.md', 'legacy private template\n');
  commit(legacy);
  git(f.repo, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', legacy, 'submodules/yss-harness-dev-agent');
  const sha = commit(f.repo);
  git(f.repo, 'submodule', 'deinit', '-f', '--', 'submodules/yss-harness-dev-agent');
  assert.doesNotThrow(() => assertReleaseCheckout(f.repo, sha));
});

test('退出零但缺失或不完整的全量报告阻止打包', t => {
  for (const mutation of [null, "report.unexecuted=[{reason:'failure-or-interruption'}]", "report.results=[]", "report.input_after_sha256='0'.repeat(64)", "report.results[0].stdoutFile=__filename", "fs.mkdirSync(path.join(directory,'log-dir'));report.results[0].stdoutFile=path.join(directory,'log-dir')", "fs.renameSync(report.results[0].stdoutFile,path.join(directory,'original.log'));fs.symlinkSync('original.log',report.results[0].stdoutFile)", "fs.renameSync(path.join(directory,'report.json'),path.join(directory,'original.json'));fs.symlinkSync('original.json',path.join(directory,'report.json'))"]) {
    const f = fixture(t);
    if (mutation === null) put(f.repo, 'scripts/verify-template', '#!/bin/sh\nexit 0\n', 0o755);
    else {
      const file=path.join(f.repo,'scripts/verify-template');
      const replacement=`;${mutation};fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report));`;
      put(f.repo,'scripts/verify-template',readFileSync(file,'utf8').replace('})().catch',replacement+'})().catch'),0o755);
    }
    const sha=commit(f.repo);f.bind(sha);
    assert.throws(()=>verifyTemplateRelease({root:f.repo,commit:sha,output:f.output,cliFamily:'spec'}));
    const report=JSON.parse(readFileSync(path.join(f.output,'release-verification.json')));
    assert.equal(report.status,'failed');assert.equal(report.commands.at(-1).exit_code,0,mutation||'missing report');assert.ok(!report.commands.some(row=>row.command==='npm'));
  }
});

test('同摘要历史发布报告不能复用，旧材料保持原字节', t => {
  const f=fixture(t);verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,cliFamily:'spec'});
  const files=[path.join(f.output,'release-verification.json'),path.join(f.output,'full-verification/report.json')];
  const original=files.map(file=>readFileSync(file));
  assert.throws(()=>verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,cliFamily:'spec'}),/拒绝复用/);
  assert.deepEqual(files.map(file=>readFileSync(file)),original);assert.equal(git(f.repo,'status','--porcelain'),'');
});

test('SQLite发布运行保护内部完整报告并保留独立文件', t => {
  const f=fixture(t),previous=process.env.YSS_RUNTIME_HOME;process.env.YSS_RUNTIME_HOME=path.join(f.base,'runtime');
  t.after(()=>{if(previous===undefined)delete process.env.YSS_RUNTIME_HOME;else process.env.YSS_RUNTIME_HOME=previous;});
  const report=verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,runtimeStore:'sqlite',cliFamily:'spec'});
  assert.equal(report.status,'passed');
  const store=new RuntimeStore({root:f.repo,readOnly:true,existingOnly:true});
  try {
    const run=store.db.prepare('SELECT * FROM runs').get();assert.equal(run.status,'passed');
    assert.ok(store.db.prepare('SELECT reason FROM pins WHERE run_id=?').all(run.id).length>0);
    assert.ok(store.db.prepare('SELECT path FROM run_files WHERE run_id=?').all(run.id).some(row=>row.path===report.full_verification.report));
  } finally {store.close();}
});

test('发布保护登记失败保留实际命令结果且数据库不能先记通过', t => {
  const f=fixture(t),previous=process.env.YSS_RUNTIME_HOME,original=RuntimeStore.prototype.pin;
  process.env.YSS_RUNTIME_HOME=path.join(f.base,'runtime');
  RuntimeStore.prototype.pin=function(id,reason){if(reason==='release-verification-evidence')throw new Error('pin storage failure');return original.call(this,id,reason);};
  try {assert.throws(()=>verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,runtimeStore:'sqlite',cliFamily:'spec'}),/pin storage failure/);}
  finally {RuntimeStore.prototype.pin=original;}
  const report=JSON.parse(readFileSync(path.join(f.output,'release-verification.json')));
  assert.equal(report.status,'failed');assert.ok(report.commands.length>0);assert.ok(report.commands.every(row=>row.exit_code===0));
  const store=new RuntimeStore({root:f.repo,readOnly:true,existingOnly:true});
  try {assert.equal(store.db.prepare('SELECT status FROM runs').get().status,'running');}
  finally {store.close();if(previous===undefined)delete process.env.YSS_RUNTIME_HOME;else process.env.YSS_RUNTIME_HOME=previous;}
});

test('固定发行拒绝缺失、脏树、错误身份或实际提交错配的显式 CLI 源目录', t => {
  const f=fixture(t),source=process.env.YSS_NATIVE_SOURCE_ROOT;
  delete process.env.YSS_NATIVE_SOURCE_ROOT;assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/显式指定/);process.env.YSS_NATIVE_SOURCE_ROOT=source;
  put(f.cli,'dirty.txt','uncommitted');assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/干净固定/);rmSync(path.join(f.cli,'dirty.txt'));
  const module=readFileSync(path.join(f.cli,'go.mod'));put(f.cli,'go.mod','module another.invalid/tool\n');assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/module 身份/);writeFileSync(path.join(f.cli,'go.mod'),module);
  put(f.cli,'README.md','new source commit');commit(f.cli);assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/实际提交.*CLI commit 错配/);
});

test('浮动版本、脏树、未初始化或漂移子模块不得用于发布；四旧执行器与显式 CLI 源无需 gitlink checkout', t => {
  const f = fixture(t);
  const optional=['create-yss-spec','create-yss-strategic-design','create-yss-harness-backend','create-yss-harness-frontend','yss-cli'];
  for(const name of optional)git(f.repo,'-c','protocol.file.allow=always','submodule','add','-q',f.cli,`submodules/${name}`);
  f.sha=commit(f.repo);git(f.repo,'submodule','deinit','-f','--',...optional.map(name=>`submodules/${name}`));
  assert.equal(assertReleaseCheckout(f.repo,f.sha).template_commit,f.sha);
  assert.throws(() => assertReleaseCheckout(f.repo, 'main'), /40 位/);
  assert.throws(() => assertReleaseCheckout(f.repo, 'f'.repeat(40)), /不一致/);
  put(f.repo, 'user-change.txt', 'uncommitted');
  assert.throws(() => assertReleaseCheckout(f.repo, f.sha), /干净/);
  rmSync(path.join(f.repo, 'user-change.txt'));
  const sub = path.join(f.repo, 'submodules/yss-harness-design-agent');
  put(sub, 'new.txt', 'new'); commit(sub);
  assert.throws(() => assertReleaseCheckout(f.repo, f.sha), /干净/);
  git(f.repo, 'submodule', 'deinit', '-f', '--all');
  assert.throws(() => assertReleaseCheckout(f.repo, f.sha), /子模块/);
});

test('失败保留报告和退出码，不执行后续打包', t => {
  const f = fixture(t);
  put(f.repo, 'scripts/verify-template', '#!/bin/sh\nexit 7\n', 0o755);
  const sha = commit(f.repo);f.bind(sha);
  assert.throws(() => verifyTemplateRelease({ root: f.repo, commit: sha, output: f.output,cliFamily:'spec' }), /失败/);
  const report = JSON.parse(readFileSync(path.join(f.output, 'release-verification.json')));
  assert.equal(report.status, 'failed');
  assert.equal(report.commands.at(-1).exit_code, 7);
  assert.ok(!report.commands.some(row => row.command === 'npm'));
});
