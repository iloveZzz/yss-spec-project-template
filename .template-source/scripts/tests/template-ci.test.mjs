import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync, chmodSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { assertReleaseCheckout, verifyTemplateRelease as verifyRelease } from '../lib/template-release.mjs';
import { RuntimeStore } from '../../cli-core/runtime-store.mjs';
import {validateReceipt} from '../lib/verification-delivery-run.mjs';
import {validateBaselineReport} from '../lib/verification-report-validator.mjs';
import {createHash} from 'node:crypto';
import {collectReleaseSources} from '../lib/verification-artifacts.mjs';
import {PIN_FILE,platformKey} from '../lib/yss-cli-pin.mjs';
import {produceCliArtifact,verifyInstalledCliMigration,validateArtifact,installedTreeDigest} from '../lib/verification-artifacts.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

const root = path.resolve(import.meta.dirname, '../../..');
const fixtureBases=new Map();
const releaseSourceKeys=['YSS_RELEASE_NATIVE_INPUT','YSS_RELEASE_NATIVE_INPUT_SHA256','YSS_RELEASE_REQUIRED_PLATFORMS','YSS_RELEASE_SOURCE_EVIDENCE_DIR'];
const fixtureEnvironments=new WeakSet();
const verifyTemplateRelease=options=>verifyRelease({...options,base:options.base??fixtureBases.get(realpathSync(options.root))});
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
function fixture(t,{bundleSchemaVersion=2}={}) {
  if(!fixtureEnvironments.has(t)) {
    const keys=['YSS_NATIVE_BINARY','YSS_NATIVE_BINARY_SHA256','YSS_NATIVE_SOURCE_ROOT','YSS_NATIVE_PIN_FILE','YSS_NATIVE_PIN_SHA256',...releaseSourceKeys],previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
    fixtureEnvironments.add(t);
    t.after(()=>{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}fixtureEnvironments.delete(t);});
  }
  for(const key of [...releaseSourceKeys,'YSS_NATIVE_PIN_FILE','YSS_NATIVE_PIN_SHA256'])delete process.env[key];
  const base = mkdtempSync(path.join(os.tmpdir(), 'yss-release-test-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const cli=path.join(base,'native-source'),repo=path.join(base,'template');mkdirSync(cli);mkdirSync(repo);
  git(cli,'init','-q');git(repo,'init','-q');
  put(repo,'README.md','fixed prior release fixture\n');const releaseBase=commit(repo),fixtureRoot=realpathSync(repo);fixtureBases.set(fixtureRoot,releaseBase);t.after(()=>fixtureBases.delete(fixtureRoot));
  put(cli,'go.mod','module github.com/iloveZzz/yss-cli\n\ngo 1.27.1\n');put(cli,'main.go',readFileSync(path.join(root,'.template-source/scripts/tests/fixtures/native-release.go'),'utf8').replace('"schemaVersion":2,',`"schemaVersion":${bundleSchemaVersion},`));const cliCommit=commit(cli);
  put(repo,'yss-project.yaml','schema_version: 1\nrepository_mode: template-source\n');put(repo,'scripts/repository-mode','#!/bin/sh\necho template-source\n',0o755);
  put(repo,'.template-source/scripts/lib/verification-preflight.mjs','process.stdout.write(JSON.stringify({status:"passed",errors:[]}));');
  put(repo,'.template-source/scripts/lib/verification-delivery-run.mjs',`import {parseArgs} from 'node:util';import {runDeliveryTask} from ${JSON.stringify(pathToFileURL(path.join(root,'.template-source/scripts/lib/verification-delivery-run.mjs')).href)};const {values}=parseArgs({options:{root:{type:'string'},directory:{type:'string'},action:{type:'string'},family:{type:'string'}}});runDeliveryTask(values);`);
  const check={id:'check.fixture',run:'node -e ""',group:'fixture',inputs_complete:true,input_patterns:['**'],depends_on:[],failure_mode:'fixture consumer failure'};
  put(repo,'.template-source/process/template-verification-profiles.yaml',JSON.stringify({schema_version:1,profiles:{fast:{checks:[check]},release:{selection:'impact'}},groups:{fixture:{commands:[check]}},required_files:[],syntax_files:[],routing:[{patterns:['**'],groups:['fixture']}]}));
  put(repo, 'scripts/verify-template', `#!/usr/bin/env node
(async()=>{const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process'),{createHash}=require('crypto');const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const {verificationInputDigest,createVerificationReport,finalizeVerificationReport}=await import(${JSON.stringify(pathToFileURL(path.join(root,'scripts/lib/verification-report.mjs')).href)});
 const {compileExpectedVerificationPlan}=await import(${JSON.stringify(pathToFileURL(path.join(root,'.template-source/scripts/lib/verification-report-validator.mjs')).href)});
 const {collectReleaseSources}=await import(${JSON.stringify(pathToFileURL(path.join(root,'.template-source/scripts/lib/verification-artifacts.mjs')).href)});
 const args=process.argv.slice(2),directory=args[args.indexOf('--report-dir')+1],source=fs.realpathSync(process.cwd()),sha=verificationInputDigest(source),plan=compileExpectedVerificationPlan({root:source,args});fs.mkdirSync(directory,{recursive:true});
 const report=createVerificationReport(plan,{root:source,inputDigest:sha,scope:plan.scope,concurrency:1,invocation:{command:path.join(source,'scripts/run-template-verification'),args:['--profile','release',...args]},sourcesManifest:collectReleaseSources({root:source,commit:spawnSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).stdout.trim()})});
 for(const [index,task] of plan.commands.entries()){const r=spawnSync('/bin/sh',['-c',task.command],{cwd:source,encoding:'utf8'}),stdoutFile=path.join(directory,'task-'+index+'.stdout'),stderrFile=path.join(directory,'task-'+index+'.stderr');fs.writeFileSync(stdoutFile,r.stdout||'');fs.writeFileSync(stderrFile,r.stderr||'');report.results.push({...task,index,code:r.status,actual_exit_code:r.status,actual_exit_code_observed:true,actual_exit_signal:r.signal,stdoutFile,stderrFile,log_digests:{stdoutFile:hash(fs.readFileSync(stdoutFile)),stderrFile:hash(fs.readFileSync(stderrFile))}});if(r.status!==0)throw Error(r.stderr);}
 finalizeVerificationReport(report,{status:'passed',wallMs:1,repositoryMode:'template-source'});report.input_after_sha256=sha;report.input_drift=false;report.final_exit={code:0,signal:null,observed:true};fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report));})().catch(error=>{console.error(error);process.exitCode=1});
`, 0o755);
  const sha=commit(repo),binary=path.join(base,'yss-fixture');
  const bind=templateSha=>{const ldflags=`-X main.cliCommit=${cliCommit} -X main.templateCommit=${templateSha} -X main.designCommit=${templateSha} -X main.backendCommit=${templateSha}`;const built=spawnSync('go',['build','-trimpath','-ldflags',ldflags,'-o',binary,'.'],{cwd:cli,env:{...process.env,CGO_ENABLED:'0'},encoding:'utf8'});assert.equal(built.status,0,built.stderr);process.env.YSS_NATIVE_BINARY=binary;process.env.YSS_NATIVE_BINARY_SHA256=hash(readFileSync(binary));process.env.YSS_NATIVE_SOURCE_ROOT=realpathSync(cli);};
  bind(sha);
  return {base,repo,sha,binary,cli,bind,releaseBase,output:path.join(base,'evidence')};
}

test('synthetic 固定源 Go 消费者真实编译、复制和公开导出产生命令证据', t => {
  const inherited=Object.fromEntries(releaseSourceKeys.map(key=>[key,process.env[key]]));
  const f = fixture(t);
  assert.ok(releaseSourceKeys.every(key=>process.env[key]===undefined));
  t.after(()=>assert.deepEqual(Object.fromEntries(releaseSourceKeys.map(key=>[key,process.env[key]])),inherited));
  // Both current Profile publication algorithms are exercised with a synthetic Go
  // producer. 旧实例恢复矩阵已从发布门禁移除，平台验收由维护者人工记录。
  const sources=collectReleaseSources({root:f.repo,commit:f.sha}),records=[];
  assert.deepEqual(sources.entries.map(source=>source.family),['spec','backend']);
  const run=(file,args,cwd,env)=>{const observed=spawnSync(file,args,{cwd,env,encoding:'utf8'});records.push({file,args,cwd,exit_code:observed.status});return observed;};
  for(const source of sources.entries){const artifact=produceCliArtifact({root:f.repo,source,directory:path.join(f.base,'algorithm-fixture',source.family),run});assert.equal(verifyInstalledCliMigration({artifact,directory:path.join(f.base,'upgrade-fixture',source.family),run}).status,'passed');}
  assert.equal(records.filter(row=>row.args[0]==='bundle'&&row.args[1]==='export').length,2);assert.ok(records.every(row=>row.exit_code===0));
  const result = verifyTemplateRelease({ root: f.repo, commit: f.sha, output: f.output,cliFamily:'spec' });
  assert.equal(result.status, 'passed');
  const receiptFile=path.join(realpathSync(f.output),'full-verification/consumption/receipt.json'),receipt=JSON.parse(readFileSync(receiptFile));
  const receiptOptions={root:f.repo,receiptFile,expectedSourcesManifest:sources,requireLiveConsumers:false};
  assert.equal(validateReceipt(receipt,receiptOptions).artifacts.length,2);
  for(const mutate of [r=>r.artifacts.pop(),r=>r.artifacts.push(structuredClone(r.artifacts[0])),r=>r.artifacts[1]=structuredClone(r.artifacts[0]),r=>r.sources_manifest.entries[0].template_commit='0'.repeat(40)]){
    const altered=structuredClone(receipt);mutate(altered);assert.throws(()=>validateReceipt(altered,receiptOptions));
  }

  assert.equal(result.template_commit, f.sha);
  assert.deepEqual(result.commands.find(row => row.command === 'scripts/verify-template')?.args, ['--concurrency', '1', '--runtime-store', 'off', '--report-dir', path.join(realpathSync(f.output), 'full-verification'),'--base',f.releaseBase]);
  assert.equal(result.full_verification.status, 'passed');
  assert.ok(readFileSync(result.full_verification.report).length > 0);
  assert.ok(!result.commands.some(row=>row.command==='npm'));assert.equal(result.artifacts.length,1);assert.ok(result.commands.some(row=>row.args[0]==='bundle'&&row.args[1]==='export'));
  assert.ok(result.commands.some(row=>row.args[0]==='init'&&row.args.includes('--apply')));
  assert.ok(result.commands.every(row => row.exit_code === 0));
  assert.equal(git(f.repo, 'status', '--porcelain'), '');
  assert.equal(JSON.parse(readFileSync(path.join(f.output, 'release-verification.json'))).status, 'passed');
});

test('真实发布报告兼容 v1 baseline，并拒绝删除 syntax/终检、任务自证和来源错配',t=>{
 const f=fixture(t),outer=verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,cliFamily:'spec'}),file=path.join(f.output,'release-verification.json'),fullFile=outer.full_verification.report;
 const full=JSON.parse(readFileSync(fullFile));
 const verify=()=>validateBaselineReport({root:f.repo,base:f.sha,reportFile:file,expectedDigest:hash(readFileSync(file))});
 const initial=verify();assert.equal(initial.valid,true,initial.reasons.join('; '));
 outer.error='outer integration consumer failure';writeFileSync(file,JSON.stringify(outer));assert.equal(verify().valid,false);delete outer.error;
 const specSources=outer.sources_manifest;outer.cli_families=['spec','backend'];outer.sources_manifest=collectReleaseSources({root:f.repo,commit:f.sha});outer.cli_integrations=[{family:'spec',status:'failed'}];writeFileSync(file,JSON.stringify(outer));const missingIntegration=verify();assert.equal(missingIntegration.valid,false);assert.match(missingIntegration.reasons.join('; '),/集成|integration/);
 outer.cli_families=['spec'];outer.sources_manifest=specSources;delete outer.cli_integrations;writeFileSync(file,JSON.stringify(outer));
 // Model the old runner's separately logged syntax/terminal validators.
 full.schema_version=1;full.plan.commands=full.plan.commands.filter(row=>row.group==='fixture');full.plan.syntax_files=[];
 const terminal=full.results.find(row=>row.task_id==='post.git-diff-check');terminal.command=JSON.stringify(['git','diff','--check']);
 full.results=[...full.results.filter(row=>row.group==='fixture').map((row,index)=>({...row,index})),terminal];
 const persist=()=>{writeFileSync(fullFile,JSON.stringify(full));outer.full_verification.report_sha256=hash(readFileSync(fullFile));writeFileSync(file,JSON.stringify(outer));};persist();
 const result=verify();assert.equal(result.valid,true,result.reasons.join('; '));assert.equal(result.bindings.strategy,'legacy-full');assert.equal(result.bindings.sources_manifest.families[0],'spec');
 full.results.pop();persist();assert.equal(verify().valid,false);
 full.results.push(terminal);full.plan.commands=[];persist();assert.equal(verify().valid,false);
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

test('schema 5 固定来源和安装产物可发布，未来 schema 与 Bundle 来源漂移仍拒绝',t=>{
 const f=fixture(t,{bundleSchemaVersion:5}),sources=collectReleaseSources({root:f.repo,commit:f.sha});
 assert.deepEqual(sources.entries.map(source=>source.family),['spec','backend']);
 const run=(file,args,cwd,env)=>spawnSync(file,args,{cwd,env,encoding:'utf8'});
 const source=sources.entries[0],artifact=produceCliArtifact({root:f.repo,source,directory:path.join(f.base,'schema-5-artifact'),run});
 assert.equal(JSON.parse(readFileSync(artifact.bundle_manifest)).schemaVersion,5);
 assert.equal(validateArtifact(artifact,source),artifact);
 const original=readFileSync(artifact.bundle_manifest),treeDigest=artifact.installed_tree_sha256;
 for(const mutation of [{schemaVersion:6},{bundleHash:'0'.repeat(64)},{templateCommit:'f'.repeat(40)}]){
  writeFileSync(artifact.bundle_manifest,JSON.stringify({...JSON.parse(original),...mutation}));
  artifact.installed_tree_sha256=installedTreeDigest(artifact.installed_root);
  assert.throws(()=>validateArtifact(artifact,source),/安装后 Bundle 来源漂移/);
 }
 writeFileSync(artifact.bundle_manifest,original);artifact.installed_tree_sha256=treeDigest;
 const binaryMode=statSync(artifact.binary).mode&0o777;chmodSync(artifact.binary,binaryMode^0o100);
 assert.throws(()=>validateArtifact(artifact,source),/安装树字节、类型或权限漂移/);chmodSync(artifact.binary,binaryMode);
 writeFileSync(artifact.binary,'tampered executable');
 assert.throws(()=>validateArtifact(artifact,source),/安装树字节、类型或权限漂移/);
});

test('未来 Bundle schema 不能作为固定发布来源',t=>{
 const f=fixture(t,{bundleSchemaVersion:6});
 assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/Bundle 必须来自已提交的模板来源/);
});

test('固定发行拒绝缺失、脏树、错误身份或实际提交错配的显式 CLI 源目录', t => {
  const f=fixture(t),source=process.env.YSS_NATIVE_SOURCE_ROOT;
  delete process.env.YSS_NATIVE_SOURCE_ROOT;assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/显式指定/);process.env.YSS_NATIVE_SOURCE_ROOT=source;
  put(f.cli,'dirty.txt','uncommitted');assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/干净固定/);rmSync(path.join(f.cli,'dirty.txt'));
  const module=readFileSync(path.join(f.cli,'go.mod'));put(f.cli,'go.mod','module another.invalid/tool\n');assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/module 身份/);writeFileSync(path.join(f.cli,'go.mod'),module);
  put(f.cli,'README.md','new source commit');commit(f.cli);assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/实际提交.*CLI commit 错配/);
});

test('发行验证在有 yss-cli 固定文件时只接受固定的二进制与固定的源码提交，本地覆盖不能通过',t=>{
  const f=fixture(t),digest=hash(readFileSync(process.env.YSS_NATIVE_BINARY)),cliCommit=git(f.cli,'rev-parse','HEAD');
  const writePin=(overrides={})=>{put(f.repo,PIN_FILE,JSON.stringify({schema_version:1,repository:'https://example.test/yss-cli.git',version:'1.3.5',commit:cliCommit,go_version:'1.27.1',build:'go build',binaries:{[platformKey()]:{sha256:digest}},...overrides}));process.env.YSS_NATIVE_PIN_FILE=path.join(f.repo,PIN_FILE);process.env.YSS_NATIVE_PIN_SHA256=hash(readFileSync(process.env.YSS_NATIVE_PIN_FILE));};
  const previous=process.env.YSS_NATIVE_BINARY_OVERRIDE;t.after(()=>{if(previous===undefined)delete process.env.YSS_NATIVE_BINARY_OVERRIDE;else process.env.YSS_NATIVE_BINARY_OVERRIDE=previous;});
  delete process.env.YSS_NATIVE_BINARY_OVERRIDE;
  writePin();
  assert.equal(collectReleaseSources({root:f.repo,commit:f.sha}).kind,'template-release-sources','与固定文件一致时通过');
  writePin({binaries:{[platformKey()]:{sha256:'0'.repeat(64)}}});
  assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/与固定版本不符/,'二进制摘要不符');
  writePin({commit:'f'.repeat(40)});
  assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/与固定文件的 ffffffff 不一致/,'源码提交不符');
  writePin({binaries:{[platformKey()]:{sha256:'0'.repeat(64)}}});process.env.YSS_NATIVE_BINARY_OVERRIDE='1';
  assert.throws(()=>collectReleaseSources({root:f.repo,commit:f.sha}),/不接受 YSS_NATIVE_BINARY_OVERRIDE/,'本地覆盖不能通过发行验证');
});

test('浮动版本与脏树不得用于发布；Profile 已并入本仓，没有子模块来源需要核验', t => {
  const f = fixture(t);
  assert.equal(assertReleaseCheckout(f.repo,f.sha).template_commit,f.sha);
  assert.throws(() => assertReleaseCheckout(f.repo, 'main'), /40 位/);
  assert.throws(() => assertReleaseCheckout(f.repo, 'f'.repeat(40)), /不一致/);
  put(f.repo, 'user-change.txt', 'uncommitted');
  assert.throws(() => assertReleaseCheckout(f.repo, f.sha), /干净/);
  rmSync(path.join(f.repo, 'user-change.txt'));
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
