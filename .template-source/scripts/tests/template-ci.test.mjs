import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseDocument } from '../../../scripts/vendor/yaml.mjs';
import { assertReleaseCheckout, verifyTemplateRelease } from '../lib/template-release.mjs';

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
  put(cli, 'scripts/sync-template.js', `const fs=require('fs'); const {execFileSync}=require('child_process'); const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:process.env.YSS_SPEC_TEMPLATE_REPO,encoding:'utf8'}).trim(); if(commit!==process.env.YSS_SPEC_TEMPLATE_REF)throw Error('stale'); fs.writeFileSync('template.snapshot.json',JSON.stringify({templateCommit:commit,requestedRef:commit}));`);
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
  put(repo, 'scripts/verify-template', '#!/bin/sh\nexit 0\n', 0o755);
  return { base, repo, sha: commit(repo), output: path.join(base, 'evidence') };
}

test('固定版本发布集成真实打包安装，并产生命令证据', t => {
  const f = fixture(t);
  const result = verifyTemplateRelease({ root: f.repo, commit: f.sha, output: f.output });
  assert.equal(result.status, 'passed');
  assert.equal(result.template_commit, f.sha);
  assert.ok(result.commands.some(row => row.command === 'npm' && row.args[0] === 'pack'));
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

test('工作流保持读权限、失败汇总、精确版本与独立兼容职责', () => {
  const load = name => {
    const doc = parseDocument(readFileSync(path.join(root, '.github/workflows', name), 'utf8'), { uniqueKeys: true });
    assert.equal(doc.errors.length, 0);
    return doc.toJS();
  };
  const ci = load('template-ci.yml'), release = load('template-release-verify.yml'), compatibility = load('template-compatibility.yml');
  for (const workflow of [ci, release, compatibility]) assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.ok(Object.hasOwn(ci.on, 'pull_request'));
  assert.ok(!ci.on.pull_request?.paths);
  assert.equal(ci.jobs.required.if, 'always()');
  assert.deepEqual(ci.jobs.required.needs, ['plan', 'verify', 'compatibility']);
  assert.deepEqual(Object.keys(release.on), ['workflow_dispatch']);
  assert.equal(release.jobs.compatibility.with.commit, '${{ needs.resolve.outputs.commit }}');
  assert.equal(release.jobs.verify.steps[0].with.ref, '${{ needs.resolve.outputs.commit }}');
  assert.equal(release.jobs.verify.steps[0].with.submodules, undefined);
  assert.equal(release.jobs.verify.steps[1].with.submodules, 'true');
  assert.equal(ci.jobs.verify.steps[0].with.submodules, undefined);
  assert.equal(ci.jobs.verify.steps[1].with.submodules, 'true');
  assert.equal(release.concurrency['cancel-in-progress'], false);
  const setup = readFileSync(path.join(root, '.github/actions/setup-template/action.yml'), 'utf8');
  assert.match(setup, /submodules\/create-yss-spec/);
  assert.doesNotMatch(setup, /submodules\/yss-harness-dev-agent/);
  const matrix = compatibility.jobs.compatibility.strategy.matrix.include;
  assert.equal(matrix.filter(row => row.observational).length, 1);
  assert.equal(matrix.find(row => row.observational).node, '26');
  assert.ok(!JSON.stringify(ci.jobs.verify).includes('build:vendor'));
});
