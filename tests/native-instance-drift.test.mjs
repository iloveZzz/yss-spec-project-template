import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const original = Buffer.from('approved managed asset\n');
function run(root, ref, args = [], options = {}) {
  return spawnSync(process.execPath, [path.join(root, ref), ...args], { cwd: root, encoding: 'utf8', ...options });
}
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-native-instance-drift-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const ref of ['scripts/lib', 'scripts/vendor', '.template-spec']) {
    fs.cpSync(path.join(SOURCE, ref), path.join(root, ref), { recursive: true, preserveTimestamps: true });
  }
  for (const ref of ['scripts/verify-project-instance', 'scripts/sync-skills', 'scripts/update-skill-lock', 'scripts/lib/native-context.mjs', 'CONTEXT.md']) {
    fs.copyFileSync(path.join(SOURCE, ref), path.join(root, ref));
  }
  fs.writeFileSync(path.join(root,'.template-spec/process/harness-profile.yaml'),'schema_version: 2\nprofile_id: harness.spec-template\ninstantiation:\n  cli_package: yss\n  metadata_file: .yss.json\n  native_profile: spec\n  template_source: github:iloveZzz/yss-spec-project-template\n');
  fs.mkdirSync(path.join(root, '.agents/skills'), { recursive: true });
  for (const name of ['.yss-skills-manifest.json', '.strategic-design-skills-manifest.json']) {
    fs.copyFileSync(path.join(SOURCE, '.agents/skills', name), path.join(root, '.agents/skills', name));
  }
  fs.writeFileSync(path.join(root, 'skills-lock.json'), JSON.stringify({ version: 3, sources: {}, skills: { shared: {}, platform: {} } }));
  const lock = run(root, 'scripts/update-skill-lock');
  assert.equal(lock.status, 0, lock.stderr || lock.stdout);
  fs.writeFileSync(path.join(root, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: project-instance\n');
  fs.writeFileSync(path.join(root, 'managed.txt'), original, { mode: 0o644 });
  const managedFiles = { 'managed.txt': {
    baseline: { type: 'file', digest: sha(original), mode: 0o644 },
    lastApplied: { type: 'file', digest: sha(original), mode: 0o644 }, ownership: 'managed',
  }, 'skills-lock.json': {
    baseline: { type: 'file', digest: sha(fs.readFileSync(path.join(root, 'skills-lock.json'))), mode: 0o644 },
    lastApplied: { type: 'file', digest: sha(fs.readFileSync(path.join(root, 'skills-lock.json'))), mode: 0o644 }, ownership: 'generated',
  } };
  const metadata = { schemaVersion: 1, protocolVersion: 1, profile: 'spec', profileId: 'harness.spec-template',
    cliVersion: '1.0.0-alpha.3', templateVersion: '3.5.10', legacyCliVersion: '3.5.10',
    templateSourceState: 'committed', templateCommit: 'a'.repeat(40), snapshotHash: 'b'.repeat(64), manifestHash: 'c'.repeat(64),
    // This unit fixture copies unrendered template governance, whose generated
    // lock declares all three roots. Real B18 instances use their own selection.
    variables: {}, distribution: { mode: 'selected', runtimes: ['codex', 'cursor', 'pi'], installedSkills: [] }, managedFiles,
    baselineDigest: sha(JSON.stringify(managedFiles)) };
  const save = () => fs.writeFileSync(path.join(root, '.yss.json'), JSON.stringify(metadata));
  save();
  fs.mkdirSync(path.join(root, 'business'), { recursive: true });
  fs.mkdirSync(path.join(root, '.github'), { recursive: true });
  fs.writeFileSync(path.join(root, 'business/user-data.txt'), 'preserved business bytes\n', { mode: 0o640 });
  fs.writeFileSync(path.join(root, '.github/user-workflow.yml'), 'name: preserved user workflow\n');
  for (const args of [['init', '-q'], ['add', 'CONTEXT.md', 'managed.txt', 'business', '.github']]) {
    const git = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(git.status, 0, git.stderr);
  }
  return { root, metadata, save, verify: () => run(root, 'scripts/verify-project-instance', ['--json']) };
}

function treeState(root) {
  const entries = [];
  function visit(directory, prefix = '') {
    for (const name of fs.readdirSync(directory).sort()) {
      const ref = prefix ? `${prefix}/${name}` : name;
      const file = path.join(directory, name);
      const info = fs.lstatSync(file, { bigint: true });
      let value = null;
      if (info.isSymbolicLink()) value = fs.readlinkSync(file);
      else if (info.isFile()) {
        try { value = sha(fs.readFileSync(file)); }
        catch (error) { if (!['EACCES', 'EPERM'].includes(error.code)) throw error; value = { unreadable: error.code }; }
      }
      entries.push({ ref, type: info.isSymbolicLink() ? 'symlink' : info.isDirectory() ? 'directory' : 'file',
        mode: String(info.mode & 0o7777n), size: String(info.size), mtime: String(info.mtimeNs), ctime: String(info.ctimeNs), value });
      if (info.isDirectory()) visit(file, ref);
    }
  }
  visit(root);
  return entries;
}
function verifyWithoutWrites(f, expected, message) {
  const before = treeState(f.root);
  const observed = f.verify();
  assert.equal(observed.status, expected, observed.stderr || observed.stdout);
  if (message) assert.match(observed.stdout + observed.stderr, message);
  assert.deepEqual(treeState(f.root), before, '只读校验不能修改任何文件、目录、metadata、Git index 或用户资产');
  return observed;
}
function schema2(f) {
  Object.assign(f.metadata, { schemaVersion: 2, bundleSchemaVersion: 2, bundleHash: 'd'.repeat(64),
    cliCommit: 'e'.repeat(40), cliSourceState: 'committed' });
  f.save();
}

function saveManaged(f) {
  f.metadata.baselineDigest = sha(JSON.stringify(Object.fromEntries(Object.entries(f.metadata.managedFiles).sort(([a], [b]) => a < b ? -1 : 1))));
  f.save();
}
function platformFixture(t) {
  // This Node regression copies the actual source plugin; it does not claim a
  // fresh native init or replace the independently preserved B18 full fixture.
  const f = fixture(t); schema2(f);
  const prefix = '.codex/skills/product-design';
  fs.cpSync(path.join(SOURCE, prefix), path.join(f.root, prefix), { recursive: true, preserveTimestamps: true });
  function record(ref) {
    const info = fs.lstatSync(path.join(f.root, ref));
    const descriptor = { type: 'file', digest: sha(fs.readFileSync(path.join(f.root, ref))), mode: info.mode & 0o777 };
    f.metadata.managedFiles[ref] = { baseline: { ...descriptor }, lastApplied: { ...descriptor }, ownership: 'managed' };
  }
  function visit(directory) {
    for (const name of fs.readdirSync(path.join(f.root, directory))) {
      const ref = directory + '/' + name;
      if (fs.lstatSync(path.join(f.root, ref)).isDirectory()) visit(ref);
      else record(ref);
    }
  }
  visit(prefix); record('.template-spec/agents/yss-skill-registry.yaml');
  const lock = run(f.root, 'scripts/update-skill-lock', ['--add-platform=.codex/skills:product-design']);
  assert.equal(lock.status, 0, lock.stderr || lock.stdout);
  f.metadata.distribution.installedSkills = ['product-design']; saveManaged(f);
  return f;
}

test('真实平台源的必需 alias 入口缺 record 即使仍存在也须拒绝，未知 installed 声明不跳过', async t => {
  for (const mutation of ['entry-record', 'source-record', 'unknown-installed']) await t.test(mutation, t => {
    const f = platformFixture(t); verifyWithoutWrites(f, 0);
    if (mutation === 'unknown-installed') f.metadata.distribution.installedSkills.push('unknown-installed');
    else delete f.metadata.managedFiles[mutation === 'entry-record' ? '.codex/skills/product-design/skills/index/SKILL.md' : '.codex/skills/product-design/.codex-plugin/plugin.json'];
    saveManaged(f);
    const observed = verifyWithoutWrites(f, 1, /INSTANCE_DISTRIBUTION:/);
    assert.doesNotMatch(observed.stdout + observed.stderr, /INPUT_DRIFT/);
    if (mutation === 'entry-record') assert.match(observed.stderr, /必需受管记录.*skills\/index\/SKILL.md/);
    if (mutation === 'source-record') assert.match(observed.stderr, /非豁免受管记录.*plugin.json/);
  });
});

test('合法锁内用户平台扩展与未受管辅助文件保持现行语义，已登记 ignored 文件仍受保护', t => {
  const f = platformFixture(t);
  const aux = '.codex/skills/product-design/local-user-note.txt';
  const ignored = '.codex/skills/product-design/__pycache__/user.pyc';
  fs.writeFileSync(path.join(f.root, aux), 'user auxiliary asset\n');
  fs.mkdirSync(path.dirname(path.join(f.root, ignored)), { recursive: true });
  fs.writeFileSync(path.join(f.root, ignored), 'ignored tool state\n');
  fs.mkdirSync(path.join(f.root, '.codex/skills/local-user-group'), { recursive: true });
  fs.writeFileSync(path.join(f.root, '.codex/skills/local-user-group/SKILL.md'), 'local user skill\n');
  const lock = run(f.root, 'scripts/update-skill-lock', ['--add-platform=.codex/skills:local-user-group']);
  assert.equal(lock.status, 0, lock.stderr || lock.stdout);
  assert.equal(f.metadata.managedFiles[aux], undefined);
  assert.equal(f.metadata.managedFiles[ignored], undefined);
  verifyWithoutWrites(f, 0);
  const auxiliaryDescriptor = { type: 'file', digest: sha(fs.readFileSync(path.join(f.root, aux))), mode: 0o644 };
  for (const ownership of ['user-owned', 'protected']) {
    f.metadata.managedFiles[aux] = { baseline: { ...auxiliaryDescriptor }, lastApplied: { ...auxiliaryDescriptor }, ownership };
    saveManaged(f); verifyWithoutWrites(f, 0);
  }
  const descriptor = { type: 'file', digest: sha(fs.readFileSync(path.join(f.root, ignored))), mode: 0o644 };
  f.metadata.managedFiles[ignored] = { baseline: { ...descriptor }, lastApplied: { ...descriptor }, ownership: 'managed' };
  saveManaged(f); verifyWithoutWrites(f, 0);
  fs.writeFileSync(path.join(f.root, ignored), 'later user tool edit\n');
  const observed = verifyWithoutWrites(f, 1);
  const report = JSON.parse(observed.stdout);
  assert.equal(report.entries.find(entry => entry.ref === ignored).kind, 'drifted');
});

test('平台 source manifest 在 parse 前按受管 bytes、mode、type 与 ancestor 校验', async t => {
  for (const mutation of ['same-byte-link', 'mode']) await t.test(mutation, t => {
    const f = platformFixture(t);
    const ref = '.codex/skills/product-design/.codex-plugin/plugin.json';
    const file = path.join(f.root, ref);
    if (mutation === 'mode') fs.chmodSync(file, 0o755);
    else {
      fs.copyFileSync(file, path.join(f.root, 'original-plugin.json'));
      fs.unlinkSync(file); fs.symlinkSync(path.join(f.root, 'original-plugin.json'), file);
    }
    const observed = verifyWithoutWrites(f, 1, /受管平台 Skill 来源漂移/);
    const report = JSON.parse(observed.stdout);
    assert.equal(report.entries[0].ref, ref);
    assert.equal(report.entries[0].kind, 'drifted');
    assert.equal(report.entries[0].error, mutation === 'mode' ? 'managed-asset-mode-changed' : 'managed-asset-must-be-file');
  });
});

test('公开实例漂移 JSON 的小型与大型成功和拒绝报告都必须完整输出后退出', async t => {
  for (const size of [0, 4096]) await t.test(size ? 'large-report' : 'small-report', t => {
    const f = fixture(t); schema2(f);
    for (let index = 0; index < size; index++) {
      const ref = `z-managed-${String(index).padStart(5, '0')}.txt`;
      fs.writeFileSync(path.join(f.root, ref), original, { mode: 0o644 });
      f.metadata.managedFiles[ref] = { baseline: { type: 'file', digest: sha(original), mode: 0o644 },
        lastApplied: { type: 'file', digest: sha(original), mode: 0o644 }, ownership: 'managed' };
    }
    f.metadata.baselineDigest = sha(JSON.stringify(Object.fromEntries(Object.entries(f.metadata.managedFiles).sort(([a], [b]) => a < b ? -1 : 1))));
    f.save();
    // The public report can exceed spawnSync's default 1 MiB buffer. This is a
    // test transport bound; the command's behavior and timing are unchanged.
    f.verify = () => run(f.root, 'scripts/verify-project-instance', ['--json'], { maxBuffer: 16 * 1024 * 1024 });
    for (const expected of [0, 1]) {
      if (expected) fs.writeFileSync(path.join(f.root, 'managed.txt'), 'later user change\n');
      const observed = verifyWithoutWrites(f, expected);
      assert.equal(observed.signal, null); assert.equal(observed.error, undefined);
      assert.ok(observed.stdout.endsWith('\n'), 'JSON 报告必须包含末尾换行');
      const report = JSON.parse(observed.stdout);
      assert.equal(report.kind, 'drift-report');
      assert.equal(report.summary.drifted, expected);
      assert.equal(report.summary.missing, 0);
      assert.equal(report.summary.not_installed, 0);
      if (size) assert.ok(Buffer.byteLength(observed.stdout) > 65536, '实际报告必须越过已观察的 pipe 截断边界');
      if (expected) assert.match(observed.stderr, /实例受管资产漂移或缺失/);
    }
  });
});

test('原生实例受管文件内容变化必须使公开实例校验失败', t => {
  const f = fixture(t);
  verifyWithoutWrites(f, 0);
  fs.writeFileSync(path.join(f.root, 'managed.txt'), 'later user change\n');
  const observed = verifyWithoutWrites(f, 1);
  assert.match(observed.stdout, /"kind": "drifted"/);
  assert.match(observed.stderr, /受管资产漂移/);
});

test('原生实例受管文件权限变化即使字节相同也必须失败', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t);
  fs.chmodSync(path.join(f.root, 'managed.txt'), 0o755);
  const observed = verifyWithoutWrites(f, 1);
  assert.match(observed.stdout, /"error": "managed-asset-mode-changed"/);
});

test('受管文件父目录被符号链接替换时不能读取链接外的相同字节并通过', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'real'));
  fs.writeFileSync(path.join(f.root, 'real/asset.txt'), original, { mode: 0o644 });
  fs.symlinkSync('real', path.join(f.root, 'managed-dir'), 'dir');
  f.metadata.managedFiles = { 'managed-dir/asset.txt': f.metadata.managedFiles['managed.txt'], 'skills-lock.json': f.metadata.managedFiles['skills-lock.json'] };
  f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles));
  f.save();
  const observed = verifyWithoutWrites(f, 1);
  assert.match(observed.stdout, /managed-asset-parent-must-be-directory/);
});

test('Schema 1 与 Schema 2 原生实例校验使用原生基线并保留旧 metadata 字节', async t => {
  for (const version of [1, 2]) await t.test(`Schema ${version}`, t => {
    const f = fixture(t);
    if (version === 2) schema2(f);
    // The historical baseline deliberately differs. Native lastApplied is the
    // current applied state; preserved legacy metadata is migration lineage.
    fs.writeFileSync(path.join(f.root, '.yss-template.json'), JSON.stringify({ metadataSchemaVersion: 3, templateSource:'github:iloveZzz/yss-spec-project-template',templateCommit:'a'.repeat(40), managedFiles: {
      'managed.txt': { contentHash: '0'.repeat(64), ownership: 'managed' },
      'never-installed-historical.txt': { contentHash: '1'.repeat(64), ownership: 'managed' },
    } }));
    const observed = verifyWithoutWrites(f, 0);
    const report = JSON.parse(observed.stdout);
    assert.equal(report.entries.find(entry => entry.ref === 'managed.txt').kind, 'ok');
    assert.equal(report.summary.missing, 0);
    assert.equal(report.entries[0].expected, `sha256:${sha(original)}`);
  });
});

test('原生文件缺失或被目录、普通链接、断链替换均阻断只读校验', async t => {
  const cases = [
    ['missing', f => fs.rmSync(path.join(f.root, 'managed.txt')), /"kind": "missing"/],
    ['directory', f => { fs.rmSync(path.join(f.root, 'managed.txt')); fs.mkdirSync(path.join(f.root, 'managed.txt')); }, /managed-asset-must-be-file/],
    ['symlink', f => { fs.writeFileSync(path.join(f.root, 'same.txt'), original); fs.rmSync(path.join(f.root, 'managed.txt')); fs.symlinkSync('same.txt', path.join(f.root, 'managed.txt')); }, /managed-asset-must-be-file/],
    ['broken-symlink', f => { fs.rmSync(path.join(f.root, 'managed.txt')); fs.symlinkSync('missing-target', path.join(f.root, 'managed.txt')); }, /managed-asset-must-be-file/],
  ];
  for (const [name, alter, error] of cases) await t.test(name, t => {
    const f = fixture(t); schema2(f); alter(f); verifyWithoutWrites(f, 1, error);
  });
});

test('可定制内容保留但文件存在、普通类型、可读性及原生权限仍是必要条件', async t => {
  await t.test('custom-content', t => {
    const f = fixture(t); schema2(f);
    f.metadata.managedFiles['managed.txt'].ownership = 'managed-customizable';
    f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
    fs.writeFileSync(path.join(f.root, 'managed.txt'), 'user customization\n');
    verifyWithoutWrites(f, 0);
  });
  for (const kind of ['missing', 'directory', 'symlink', ...(process.platform === 'win32' ? [] : ['mode'])]) await t.test(kind, t => {
    const f = fixture(t); schema2(f);
    f.metadata.managedFiles['managed.txt'].ownership = 'managed-customizable';
    f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
    if (kind === 'mode') fs.chmodSync(path.join(f.root, 'managed.txt'), 0o755);
    else {
      fs.rmSync(path.join(f.root, 'managed.txt'));
      if (kind === 'directory') fs.mkdirSync(path.join(f.root, 'managed.txt'));
      if (kind === 'symlink') { fs.writeFileSync(path.join(f.root, 'same.txt'), original); fs.symlinkSync('same.txt', path.join(f.root, 'managed.txt')); }
    }
    verifyWithoutWrites(f, 1, kind === 'missing' ? /"kind": "missing"/ : kind === 'mode' ? /managed-asset-mode-changed/ : /customizable-asset-must-be-file/);
  });
});

test('损坏或未知原生身份不能用保留的旧 metadata 绕过', async t => {
  const cases = [
    ['schema', f => { f.metadata.schemaVersion = 99; f.save(); }, /未知 native/],
    ['protocol', f => { f.metadata.protocolVersion = 99; f.save(); }, /未知 native/],
    ['profile', f => { f.metadata.profileId = 'other-profile'; f.save(); }, /家族身份矛盾/],
    ['baseline', f => { f.metadata.baselineDigest = '0'.repeat(64); f.save(); }, /基线摘要不一致/],
    ['json', f => fs.writeFileSync(path.join(f.root, '.yss.json'), '{broken-json'), /SyntaxError/],
    ['native-symlink', f => { fs.renameSync(path.join(f.root, '.yss.json'), path.join(f.root, 'native-original.json')); fs.symlinkSync('native-original.json', path.join(f.root, '.yss.json')); }, /身份路径必须为普通文件/],
  ];
  for (const [name, alter, error] of cases) await t.test(name, t => {
    const f = fixture(t);
    fs.writeFileSync(path.join(f.root, '.yss-template.json'), JSON.stringify({ metadataSchemaVersion: 3, templateSource:'github:iloveZzz/yss-spec-project-template',templateCommit:'a'.repeat(40), managedFiles: {} }));
    alter(f); verifyWithoutWrites(f, 1, error);
  });
});

test('旧实例仍检查原字节基线，skills-lock 使用独立供应链检查', async t => {
  await t.test('legacy-baseline', t => {
    const f = fixture(t);
    fs.rmSync(path.join(f.root, '.yss.json'));
    fs.writeFileSync(path.join(f.root,'.template-spec/process/harness-profile.yaml'),'schema_version: 1\nprofile_id: harness.spec-template\n');
    fs.writeFileSync(path.join(f.root, '.yss-template.json'), JSON.stringify({ metadataSchemaVersion: 3, templateSource:'github:iloveZzz/yss-spec-project-template',templateCommit:'a'.repeat(40), managedFiles: {
      'managed.txt': { contentHash: sha(original), ownership: 'managed' },
    } }));
    verifyWithoutWrites(f, 0);
    fs.writeFileSync(path.join(f.root, 'managed.txt'), 'legacy drift\n');
    verifyWithoutWrites(f, 1, /"kind": "drifted"/);
  });
  await t.test('independent-skill-lock', t => {
    const f = fixture(t); schema2(f);
    // Even when no skills-lock baseline is in metadata, supply-chain checking
    // must reject a stale lock. The native drift gate does not replace it.
    fs.appendFileSync(path.join(f.root, 'skills-lock.json'), '\n');
    verifyWithoutWrites(f, 1, /skills-lock.json is stale/);
  });
});

test('原生初始化记录的用户资产允许后续用户修改或删除，专用 Context 校验仍执行', async t => {
  for (const ownership of ['user-owned', 'protected']) await t.test(ownership, t => {
    const f = fixture(t); schema2(f);
    f.metadata.managedFiles['managed.txt'].ownership = ownership;
    f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
    fs.writeFileSync(path.join(f.root, 'managed.txt'), 'user-owned later bytes\n');
    verifyWithoutWrites(f, 0);
    fs.rmSync(path.join(f.root, 'managed.txt'));
    verifyWithoutWrites(f, 0);
  });
  await t.test('context-still-validated', t => {
    const f = fixture(t); schema2(f);
    const bytes = fs.readFileSync(path.join(f.root, 'CONTEXT.md'));
    f.metadata.managedFiles = { 'CONTEXT.md': {
      baseline: { type: 'file', digest: sha(bytes), mode: 0o644 },
      lastApplied: { type: 'file', digest: sha(bytes), mode: 0o644 }, ownership: 'user-owned',
    }, 'skills-lock.json': f.metadata.managedFiles['skills-lock.json'] };
    f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
    fs.appendFileSync(path.join(f.root, 'CONTEXT.md'), '\n<!-- preserved project Context extension -->\n');
    verifyWithoutWrites(f, 0);
    fs.writeFileSync(path.join(f.root, 'CONTEXT.md'), 'broken Context contract\n');
    verifyWithoutWrites(f, 1, /context-contract-invalid|context_schema_version|业务术语/);
  });
});

test('原生分发声明已安装但未记录且缺失的 Skill 不能跳过补装要求', t => {
  const f = fixture(t); schema2(f);
  f.metadata.distribution.installedSkills = ['missing-declared-skill']; f.save();
  // Native distribution declarations now require a known locked source; an
  // unknown name must be rejected before a guessed canonical path is reported.
  verifyWithoutWrites(f, 1, /INSTANCE_DISTRIBUTION: 未知 installedSkills 声明: missing-declared-skill/);
});

test('原生可定制文件被 chmod 为不可读时以真实 mode 漂移拒绝', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t); schema2(f);
  f.metadata.managedFiles['managed.txt'].ownership = 'managed-customizable';
  f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
  fs.chmodSync(path.join(f.root, 'managed.txt'), 0);
  verifyWithoutWrites(f, 1, /managed-asset-mode-changed/);
  fs.chmodSync(path.join(f.root, 'managed.txt'), 0o644);
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'managed.txt')), original);
});

test('canonical 内容相同的原生 skills-lock 链接或权限变化不能绕过物理门禁', async t => {
  for (const version of [1, 2]) await t.test(`Schema ${version}`, async t => {
    for (const replacement of ['symlink', ...(process.platform === 'win32' ? [] : ['mode'])]) await t.test(replacement, t => {
      const f = fixture(t); if (version === 2) schema2(f);
      const file = path.join(f.root, 'skills-lock.json');
      if (replacement === 'symlink') {
        fs.renameSync(file, path.join(f.root, 'same-canonical-lock.json'));
        fs.symlinkSync('same-canonical-lock.json', file);
      } else fs.chmodSync(file, 0o755);
      verifyWithoutWrites(f, 1, replacement === 'symlink' ? /managed-asset-must-be-file/ : /managed-asset-mode-changed/);
    });
  });
});

test('Spec generated 锁允许 Node 合法重生后的原始摘要变化，canonical 内容仍必须准确', async t => {
  for (const version of [1, 2]) await t.test(`Schema ${version}`, t => {
    const f = fixture(t); if (version === 2) schema2(f);
    const file = path.join(f.root, 'skills-lock.json');
    const compact = JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')));
    fs.writeFileSync(file, compact);
    const record = f.metadata.managedFiles['skills-lock.json'];
    record.baseline.digest = sha(compact); record.lastApplied.digest = sha(compact);
    f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
    const regenerated = run(f.root, 'scripts/update-skill-lock');
    assert.equal(regenerated.status, 0, regenerated.stderr || regenerated.stdout);
    assert.notEqual(sha(fs.readFileSync(file)), record.lastApplied.digest);
    const report = JSON.parse(verifyWithoutWrites(f, 0).stdout);
    const lock = report.entries.find(entry => entry.ref === 'skills-lock.json');
    assert.equal(lock.kind, 'ok'); assert.equal(lock.expected, null);
    assert.equal(lock.content_validation, 'external'); assert.ok(lock.actual);
    fs.appendFileSync(file, '\n');
    verifyWithoutWrites(f, 1, /skills-lock.json is stale/);
  });
});

test('原生锁缺失、损坏或没有可信受管记录时必须失败，不能合成 mode 或接管用户锁', async t => {
  const cases = [
    ['missing-record', f => delete f.metadata.managedFiles['skills-lock.json'], /INSTANCE_BASELINE.*缺少受管记录/],
    ['user-owned-record', f => { f.metadata.managedFiles['skills-lock.json'].ownership = 'user-owned'; }, /INSTANCE_BASELINE.*缺少受管记录/],
    ['missing-file', f => fs.rmSync(path.join(f.root, 'skills-lock.json')), /"kind": "missing"/],
    ['directory', f => { fs.rmSync(path.join(f.root, 'skills-lock.json')); fs.mkdirSync(path.join(f.root, 'skills-lock.json')); }, /managed-asset-must-be-file/],
    ['damaged-json', f => fs.writeFileSync(path.join(f.root, 'skills-lock.json'), '{broken'), /SyntaxError/],
  ];
  for (const [name, alter, error] of cases) await t.test(name, t => {
    const f = fixture(t); schema2(f); alter(f);
    f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
    verifyWithoutWrites(f, 1, error);
  });
});

test('managed 锁保留原始摘要校验，专职 Profile 不复用 Spec 锁豁免', async t => {
  await t.test('managed-raw-digest', t => {
    const f = fixture(t); schema2(f);
    const file = path.join(f.root, 'skills-lock.json');
    const compact = JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')));
    const record = f.metadata.managedFiles['skills-lock.json'];
    record.ownership = 'managed'; record.baseline.digest = sha(compact); record.lastApplied.digest = sha(compact);
    f.metadata.baselineDigest = sha(JSON.stringify(f.metadata.managedFiles)); f.save();
    // Current bytes pass the separate canonical validator but differ from the
    // explicit managed digest. Only a generated Spec lock receives that waiver.
    verifyWithoutWrites(f, 1, /"kind": "drifted"/);
  });
  await t.test('specialist-scope', t => {
    const f = fixture(t); schema2(f);
    f.metadata.profile = 'backend'; f.metadata.profileId = 'harness.backend-delivery'; f.save();
    verifyWithoutWrites(f, 1, /仅适用于 Spec 实例/);
  });
});

test('历史没有 mode 的锁记录保留旧 canonical 校验，不报告原生权限等价', t => {
  const f = fixture(t);
  fs.rmSync(path.join(f.root, '.yss.json'));
  fs.writeFileSync(path.join(f.root,'.template-spec/process/harness-profile.yaml'),'schema_version: 1\nprofile_id: harness.spec-template\n');
  fs.writeFileSync(path.join(f.root, '.yss-template.json'), JSON.stringify({ metadataSchemaVersion: 3, templateSource:'github:iloveZzz/yss-spec-project-template',templateCommit:'a'.repeat(40), managedFiles: {
    'managed.txt': { contentHash: sha(original), ownership: 'managed' },
    'skills-lock.json': { contentHash: '0'.repeat(64), ownership: 'managed' },
  } }));
  const report = JSON.parse(verifyWithoutWrites(f, 0).stdout);
  assert.equal(report.entries.some(entry => entry.ref === 'skills-lock.json'), false);
});
