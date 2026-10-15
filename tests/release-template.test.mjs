import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkPreconditions, buildNotes, writeEvidence, publish, compareVersions, parseVersion, defaultRun } from '../.template-source/scripts/lib/release-template.mjs';

const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const git = (cwd, ...args) => { const r = spawnSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };

function fixture(t) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'release-template-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const remote = path.join(base, 'remote.git'), root = path.join(base, 'repo');
  git(base, 'init', '-q', '--bare', '-b', 'main', remote);
  fs.mkdirSync(root);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'remote', 'add', 'origin', remote);
  fs.writeFileSync(path.join(root, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: template-source\n');
  git(root, 'add', '.'); git(root, 'commit', '-qm', 'one');
  const first = git(root, 'rev-parse', 'HEAD');
  git(root, 'tag', '-a', 'v1.0.0', '-m', 'v1', first);
  fs.writeFileSync(path.join(root, 'a.txt'), 'a'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'two');
  git(root, 'push', '-q', 'origin', 'main', '--tags');
  return { base, root, first, head: git(root, 'rev-parse', 'HEAD'), remote };
}
const check = (f, overrides = {}) => checkPreconditions({ root: f.root, version: '1.1.0', base: f.first, ...overrides });

test('版本比较只接受 X.Y.Z 并按数值排序', () => {
  assert.deepEqual(parseVersion('4.2.0'), [4, 2, 0]);
  for (const bad of ['v4.2.0', '4.2', '4.2.0-rc1', '04.2.0', undefined]) assert.throws(() => parseVersion(bad));
  assert.equal(compareVersions('4.10.0', '4.9.9'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
});

test('前置核对：干净 main、与 origin 一致、base 是祖先、tag 未占用且版本递增', t => {
  const f = fixture(t);
  assert.deepEqual(check(f), { commit: f.head, tag: 'v1.1.0', previous: '1.0.0' });
});

test('前置核对拒绝：脏工作树、非 main、落后/领先 origin、非祖先 base、已有 tag、版本不递增、非模板源', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'dirty.txt'), 'x');
  assert.throws(() => check(f), /工作树必须干净/);
  fs.rmSync(path.join(f.root, 'dirty.txt'));
  assert.throws(() => check(f, { version: '1.0.0' }), /已存在|必须大于/);
  assert.throws(() => check(f, { version: '0.9.0' }), /必须大于/);
  assert.throws(() => check(f, { base: 'f'.repeat(40) }), /不是 HEAD 的祖先/);
  assert.throws(() => check(f, { base: 'abc' }), /完整 40 位/);
  fs.writeFileSync(path.join(f.root, 'b.txt'), 'b'); git(f.root, 'add', '.'); git(f.root, 'commit', '-qm', 'ahead');
  assert.throws(() => check(f), /不一致/);
  git(f.root, 'reset', '-q', '--hard', 'origin/main');
  git(f.root, 'tag', 'v1.1.0');
  assert.throws(() => check(f), /已存在/);
  git(f.root, 'tag', '-d', 'v1.1.0');
  git(f.root, 'switch', '-q', '-c', 'feature');
  assert.throws(() => check(f), /必须在 main/);
  git(f.root, 'switch', '-q', 'main');
  fs.writeFileSync(path.join(f.root, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: project-instance\n');
  git(f.root, 'commit', '-qam', 'identity');
  git(f.root, 'push', '-q', 'origin', 'main');
  assert.throws(() => check(f), /template-source/);
});

test('远端已有同名 tag 时拒绝（同步 origin 后本地也可见），不在远端重复创建', t => {
  const f = fixture(t);
  git(f.root, 'tag', 'v1.1.0'); git(f.root, 'push', '-q', 'origin', 'v1.1.0'); git(f.root, 'tag', '-d', 'v1.1.0');
  assert.throws(() => check(f), /已存在/);
});

test('发行说明由证据生成：未通过的报告拒绝，平台验收写明人工且不声称任何平台通过', () => {
  const input = { version: '2.0.0', commit: 'a'.repeat(40), base: 'b'.repeat(40), summary: '维护者摘要一行', report: { status: 'passed', scope: { kind: 'limited' } }, cliVersion: '2.2.0' };
  const notes = buildNotes(input);
  assert.match(notes, /^维护者摘要一行/);
  assert.match(notes, /范围 limited/);
  assert.match(notes, /平台验收：人工，不在 CI 或发布门禁内/);
  assert.match(notes, /未执行\*\*：完整/);
  assert.match(notes, /v2\.2\.0/);
  assert.doesNotMatch(notes, /(Mac|Windows|Linux).*(通过|已验收)/);
  assert.throws(() => buildNotes({ ...input, report: { status: 'failed' } }), /未通过/);
  assert.throws(() => buildNotes({ ...input, summary: '  ' }), /摘要/);
});

test('证据目录：附件与 SHA256SUMS 一致；output 必须是绝对路径', t => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'release-evidence-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const reportFile = path.join(base, 'report.json');
  fs.writeFileSync(reportFile, JSON.stringify({ status: 'passed', scope: { kind: 'limited' } }));
  assert.throws(() => writeEvidence({ output: 'relative', version: '2.0.0', commit: 'a'.repeat(40), base: 'b'.repeat(40), summary: 's', reportFile }), /绝对路径/);
  const out = writeEvidence({ output: path.join(base, 'out'), version: '2.0.0', commit: 'a'.repeat(40), base: 'b'.repeat(40), summary: 's', reportFile, cliVersion: null });
  const sums = fs.readFileSync(out.assets[1], 'utf8').trim();
  const [digest, name] = sums.split(/\s+/);
  assert.equal(name, 'template-fast-verification-report.json');
  assert.equal(digest, spawnSync('shasum', ['-a', '256', out.assets[0]], { encoding: 'utf8' }).stdout.split(' ')[0]);
  assert.match(fs.readFileSync(out.notesFile, 'utf8'), /未登记/);
});

test('发布：按 tag → 推送 → Release → 回读校验顺序执行，任一步失败即停止，摘要或提交不一致拒绝', t => {
  const f = fixture(t);
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'release-publish-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const reportFile = path.join(base, 'report.json');
  fs.writeFileSync(reportFile, JSON.stringify({ status: 'passed', scope: { kind: 'limited' } }));
  const ev = writeEvidence({ output: path.join(base, 'out'), version: '1.1.0', commit: f.head, base: f.first, summary: 's', reportFile });
  const calls = [];
  let releaseExists = false;
  // gh 以替身执行；git 走真实仓库，验证 tag 真的建在发布提交上并推送到远端。
  const fakeGh = (corrupt) => (command, args, options) => {
    if (command !== 'gh') return defaultRun(command, args, { ...options, env: GIT_ENV });
    calls.push(args.slice(0, 2).join(' '));
    if (args[1] === 'view') return { status: releaseExists ? 0 : 1, stdout: '', stderr: releaseExists ? '' : 'release not found' };
    if (args[1] === 'download') {
      const dir = args[args.indexOf('--dir') + 1];
      for (const file of ev.assets) fs.copyFileSync(file, path.join(dir, path.basename(file)));
      if (corrupt) fs.appendFileSync(path.join(dir, 'template-fast-verification-report.json'), 'x');
    }
    return { status: 0, stdout: '', stderr: '' };
  };
  assert.throws(() => publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: ev.notesFile, assets: ev.assets, run: fakeGh(true) }), /摘要不一致/);
  git(f.root, 'tag', '-d', 'v1.1.0'); git(f.root, 'push', '-q', 'origin', ':refs/tags/v1.1.0');
  calls.length = 0;
  const done = publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: ev.notesFile, assets: ev.assets, run: fakeGh(false) });
  assert.deepEqual(done, { tag: 'v1.1.0', commit: f.head, verified_assets: 1 });
  assert.deepEqual(calls, ['release view', 'release create', 'release download']);
  assert.equal(git(f.root, 'rev-parse', 'v1.1.0^{commit}'), f.head);
  assert.match(git(f.root, 'ls-remote', '--tags', 'origin', 'refs/tags/v1.1.0'), /v1\.1\.0/);
  // 创建 Release 失败：不继续回读
  git(f.root, 'tag', '-d', 'v1.1.0'); git(f.root, 'push', '-q', 'origin', ':refs/tags/v1.1.0');
  const failing = (command, args, options) => command === 'gh' ? { status: 1, stdout: '', stderr: 'denied' } : defaultRun(command, args, { ...options, env: GIT_ENV });
  assert.throws(() => publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: ev.notesFile, assets: ev.assets, run: failing }), /创建 Release 失败.*denied/);
});

test('发布可重试：tag 已推送但 Release 创建失败后，续做只补 Release，不移动 tag', t => {
  const f = fixture(t);
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'release-resume-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const reportFile = path.join(base, 'report.json');
  fs.writeFileSync(reportFile, JSON.stringify({ status: 'passed', scope: { kind: 'limited' } }));
  const ev = writeEvidence({ output: path.join(base, 'out'), version: '1.1.0', commit: f.head, base: f.first, summary: 's', reportFile });
  const calls = [];
  const gh = ({ createFails, exists }) => (command, args, options) => {
    if (command !== 'gh') { calls.push(`${command} ${args[0]}`); return defaultRun(command, args, { ...options, env: GIT_ENV }); }
    calls.push(args.slice(0, 2).join(' '));
    if (args[1] === 'view') return { status: exists ? 0 : 1, stdout: '', stderr: '' };
    if (args[1] === 'create') return createFails ? { status: 1, stdout: '', stderr: 'transient' } : { status: 0, stdout: '', stderr: '' };
    if (args[1] === 'download') { const dir = args[args.indexOf('--dir') + 1]; for (const file of ev.assets) fs.copyFileSync(file, path.join(dir, path.basename(file))); }
    return { status: 0, stdout: '', stderr: '' };
  };
  assert.throws(() => publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: ev.notesFile, assets: ev.assets, run: gh({ createFails: true }) }), /创建 Release 失败.*transient/);
  const tagObject = git(f.root, 'rev-parse', 'v1.1.0');
  assert.match(git(f.root, 'ls-remote', '--tags', 'origin', 'refs/tags/v1.1.0'), /v1\.1\.0/, 'tag 已在远端');
  // 前置核对在 resume 下接受已有的同名 tag；不带 resume 仍拒绝
  assert.throws(() => check(f), /已存在/);
  assert.equal(check(f, { resume: true }).tag, 'v1.1.0');
  calls.length = 0;
  const done = publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: ev.notesFile, assets: ev.assets, run: gh({ createFails: false }) });
  assert.deepEqual(done, { tag: 'v1.1.0', commit: f.head, verified_assets: 1 });
  assert.ok(!calls.includes('git tag') && !calls.includes('git push'), `不应重建或重推 tag: ${calls}`);
  assert.deepEqual(calls.filter(call => call.startsWith('release')), ['release view', 'release create', 'release download']);
  assert.equal(git(f.root, 'rev-parse', 'v1.1.0'), tagObject, 'tag 对象不变');
  // Release 已存在：不再创建，只回读校验
  calls.length = 0;
  publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: ev.notesFile, assets: ev.assets, run: gh({ createFails: true, exists: true }) });
  assert.ok(!calls.includes('release create'));
});

test('续做拒绝 tag 指向其他提交（本地或远端），不移动已有 tag', t => {
  const f = fixture(t);
  const gh = (command, args, options) => command === 'gh' ? { status: 1, stdout: '', stderr: '' } : defaultRun(command, args, { ...options, env: GIT_ENV });
  // 本地 tag 指向别处
  git(f.root, 'tag', '-a', 'v1.1.0', '-m', 'wrong', f.first);
  assert.throws(() => publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: '/x', assets: [], run: gh }), /本地 tag v1\.1\.0 指向/);
  assert.equal(git(f.root, 'rev-parse', 'v1.1.0^{commit}'), f.first, '本地 tag 未被移动');
  // 远端 tag 指向别处（本地没有）
  git(f.root, 'push', '-q', 'origin', 'v1.1.0');
  git(f.root, 'tag', '-d', 'v1.1.0');
  assert.throws(() => publish({ root: f.root, version: '1.1.0', commit: f.head, notesFile: '/x', assets: [], run: gh }), /远端 tag v1\.1\.0 指向|本地 tag v1\.1\.0 指向/);
  assert.match(git(f.root, 'ls-remote', '--tags', 'origin', 'refs/tags/v1.1.0'), /v1\.1\.0/, '远端 tag 未被移动');
});

test('defaultRun 的超时会终止命令并标记 timedOut', () => {
  const result = defaultRun(process.execPath, ['-e', 'setTimeout(()=>{}, 10000)'], { timeoutMs: 300 });
  assert.equal(result.timedOut, true);
  assert.notEqual(result.status, 0);
  assert.equal(defaultRun(process.execPath, ['-e', 'process.exit(0)'], { timeoutMs: 5000 }).timedOut, undefined);
});
