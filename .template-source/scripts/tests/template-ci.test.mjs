import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { assertReleaseCheckout, verifyTemplateRelease } from '../lib/template-release.mjs';
import { RuntimeStore } from '../../cli-core/runtime-store.mjs';

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
  const cli = path.join(base, 'generator'), repo = path.join(base, 'template');
  mkdirSync(cli); mkdirSync(repo);
  git(cli, 'init', '-q'); git(repo, 'init', '-q');
  put(cli, 'package.json', JSON.stringify({ name: 'create-yss-spec', version: '0.0.0', files: ['bin', 'template.snapshot.json'], bin: { 'create-yss-spec': 'bin/create-yss-spec.js' } }));
  put(cli, 'scripts/sync-template.js', `const fs=require('fs'); const {execFileSync}=require('child_process'); const {fileURLToPath}=require('url'); const source=process.env.YSS_SPEC_TEMPLATE_REPO; const repo=source.startsWith('file:')?fileURLToPath(source):source; const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(); if(commit!==process.env.YSS_SPEC_TEMPLATE_REF)throw Error('stale'); fs.writeFileSync('template.snapshot.json',JSON.stringify({templateCommit:commit,requestedRef:commit}));`);
  put(cli, 'bin/create-yss-spec.js', `#!/usr/bin/env node
const fs=require('fs'),path=require('path');const args=process.argv.slice(2),target=args[args.indexOf('--target-dir')+1];
if(args[0]!=='sync'){
 fs.mkdirSync(path.join(target,'scripts'),{recursive:true});
 fs.writeFileSync(path.join(target,'yss-project.yaml'),'schema_version: 1\\nrepository_mode: project-instance\\n');
 fs.writeFileSync(path.join(target,'.yss-template.json'),fs.readFileSync(path.join(__dirname,'../template.snapshot.json')));
 for(const name of ['sync-skills','update-skill-lock'])fs.writeFileSync(path.join(target,'scripts',name),'process.exit(0)');
}
`, 0o755);
  commit(cli);
  git(repo, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', cli, 'submodules/create-yss-spec');
  put(repo, 'yss-project.yaml', 'schema_version: 1\nrepository_mode: template-source\n');
  put(repo, 'scripts/repository-mode', '#!/bin/sh\necho template-source\n', 0o755);
  put(repo, 'scripts/verify-template', `#!/usr/bin/env node
(async()=>{const fs=require('fs'),path=require('path');const {verificationInputDigest}=await import(${JSON.stringify(pathToFileURL(path.join(root,'scripts/lib/verification-report.mjs')).href)});const args=process.argv.slice(2),directory=args[args.indexOf('--report-dir')+1],source=fs.realpathSync(process.cwd());const sha=verificationInputDigest(source);fs.mkdirSync(directory,{recursive:true});const stdoutFile=path.join(directory,'stdout.log'),stderrFile=path.join(directory,'stderr.log');fs.writeFileSync(stdoutFile,'fixture verification\\n');fs.writeFileSync(stderrFile,'');fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify({schema_version:1,kind:'template-verification-report',status:'passed',root:source,scope:{kind:'complete-candidate'},plan:{effective_profile:'release',selection:{effective:'shadow',omitted:[]},commands:[{command:'fixture verification'}]},input_sha256:sha,input_after_sha256:sha,input_drift:false,started_at:new Date().toISOString(),finished_at:new Date().toISOString(),unexecuted:[],results:[{index:0,command:'fixture verification',code:0,stdoutFile,stderrFile}]}))})().catch(error=>{console.error(error);process.exitCode=1});
`, 0o755);
  return { base, repo, sha: commit(repo), output: path.join(base, 'evidence') };
}

test('固定版本发布集成真实打包安装，并产生命令证据', t => {
  const f = fixture(t);
  const result = verifyTemplateRelease({ root: f.repo, commit: f.sha, output: f.output });
  assert.equal(result.status, 'passed');
  assert.equal(result.template_commit, f.sha);
  assert.deepEqual(result.commands.find(row => row.command === 'scripts/verify-template')?.args, ['--concurrency', '1', '--runtime-store', 'off', '--report-dir', path.join(realpathSync(f.output), 'full-verification')]);
  assert.equal(result.full_verification.status, 'passed');
  assert.ok(readFileSync(result.full_verification.report).length > 0);
  assert.ok(result.commands.some(row => row.command === 'npm' && row.args[0] === 'pack'));
  assert.ok(result.commands.some(row => row.args.includes('--agent-runtime') && row.args.includes('codex')));
  assert.ok(result.commands.every(row => row.exit_code === 0));
  assert.equal(git(f.repo, 'status', '--porcelain'), '');
  assert.equal(JSON.parse(readFileSync(path.join(f.output, 'release-verification.json'))).status, 'passed');
});

test('发布检出允许兼容期私有模板未初始化，但仍要求生成器就绪', t => {
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
      const replacement=`;const report=JSON.parse(fs.readFileSync(path.join(directory,'report.json')));${mutation};fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report));`;
      put(f.repo,'scripts/verify-template',readFileSync(file,'utf8').replace('})().catch',replacement+'})().catch'),0o755);
    }
    const sha=commit(f.repo);
    assert.throws(()=>verifyTemplateRelease({root:f.repo,commit:sha,output:f.output}));
    const report=JSON.parse(readFileSync(path.join(f.output,'release-verification.json')));
    assert.equal(report.status,'failed');assert.equal(report.commands.at(-1).exit_code,0);assert.ok(!report.commands.some(row=>row.command==='npm'));
  }
});

test('同摘要历史发布报告不能复用，旧材料保持原字节', t => {
  const f=fixture(t);verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output});
  const files=[path.join(f.output,'release-verification.json'),path.join(f.output,'full-verification/report.json')];
  const original=files.map(file=>readFileSync(file));
  assert.throws(()=>verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output}),/拒绝复用/);
  assert.deepEqual(files.map(file=>readFileSync(file)),original);assert.equal(git(f.repo,'status','--porcelain'),'');
});

test('SQLite发布运行保护内部完整报告并保留独立文件', t => {
  const f=fixture(t),previous=process.env.YSS_RUNTIME_HOME;process.env.YSS_RUNTIME_HOME=path.join(f.base,'runtime');
  t.after(()=>{if(previous===undefined)delete process.env.YSS_RUNTIME_HOME;else process.env.YSS_RUNTIME_HOME=previous;});
  const report=verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,runtimeStore:'sqlite'});
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
  try {assert.throws(()=>verifyTemplateRelease({root:f.repo,commit:f.sha,output:f.output,runtimeStore:'sqlite'}),/pin storage failure/);}
  finally {RuntimeStore.prototype.pin=original;}
  const report=JSON.parse(readFileSync(path.join(f.output,'release-verification.json')));
  assert.equal(report.status,'failed');assert.ok(report.commands.length>0);assert.ok(report.commands.every(row=>row.exit_code===0));
  const store=new RuntimeStore({root:f.repo,readOnly:true,existingOnly:true});
  try {assert.equal(store.db.prepare('SELECT status FROM runs').get().status,'running');}
  finally {store.close();if(previous===undefined)delete process.env.YSS_RUNTIME_HOME;else process.env.YSS_RUNTIME_HOME=previous;}
});

test('浮动版本、脏树、未初始化或漂移子模块不得用于发布', t => {
  const f = fixture(t);
  assert.throws(() => assertReleaseCheckout(f.repo, 'main'), /40 位/);
  assert.throws(() => assertReleaseCheckout(f.repo, 'f'.repeat(40)), /不一致/);
  put(f.repo, 'user-change.txt', 'uncommitted');
  assert.throws(() => assertReleaseCheckout(f.repo, f.sha), /干净/);
  rmSync(path.join(f.repo, 'user-change.txt'));
  const sub = path.join(f.repo, 'submodules/create-yss-spec');
  put(sub, 'new.txt', 'new'); commit(sub);
  assert.throws(() => assertReleaseCheckout(f.repo, f.sha), /干净/);
  git(f.repo, 'submodule', 'deinit', '-f', '--all');
  assert.throws(() => assertReleaseCheckout(f.repo, f.sha), /子模块/);
});

test('失败保留报告和退出码，不执行后续打包', t => {
  const f = fixture(t);
  put(f.repo, 'scripts/verify-template', '#!/bin/sh\nexit 7\n', 0o755);
  const sha = commit(f.repo);
  assert.throws(() => verifyTemplateRelease({ root: f.repo, commit: sha, output: f.output }), /失败/);
  const report = JSON.parse(readFileSync(path.join(f.output, 'release-verification.json')));
  assert.equal(report.status, 'failed');
  assert.equal(report.commands.at(-1).exit_code, 7);
  assert.ok(!report.commands.some(row => row.command === 'npm'));
});
