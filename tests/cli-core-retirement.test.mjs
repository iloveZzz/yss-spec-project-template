import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { nativeBinary, nativeDigest, inspectNative, initializeNative, runNative } from '../.template-source/scripts/lib/native-yss.mjs';
import { produceCliArtifact, validateArtifact } from '../.template-source/scripts/lib/verification-artifacts.mjs';

function temporary(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cli-core-retirement-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function put(root, ref, bytes, mode = 0o644) {
  const file = path.join(root, ref);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { mode });
  return file;
}

function tree(root) {
  if (!fs.existsSync(root)) return null;
  return fs.readdirSync(root, { recursive: true }).sort().map(ref => {
    const file = path.join(root, ref), stat = fs.lstatSync(file);
    return [ref, stat.isDirectory() ? 'directory' : stat.isSymbolicLink() ? 'symlink' : 'file',
      stat.mode & 0o777, stat.isFile() ? nativeDigest(fs.readFileSync(file)) : stat.isSymbolicLink() ? fs.readlinkSync(file) : null];
  });
}

test('固定原生 CLI 来源不匹配时拒绝执行且不写入项目', t => {
  const base = temporary(t), sourceRoot = path.join(base, 'source');
  fs.mkdirSync(sourceRoot);
  put(sourceRoot, 'business.txt', '用户原始内容\n', 0o640);
  const pinned = nativeBinary(), version = runNative(['version']).result, inspection = inspectNative('spec');
  const tuple = {
    namespace: 'candidate-release', family: 'spec', package_name: 'yss', version: version.version,
    cli_commit: version.cliCommit, core_commit: inspection.templateCommit, template_commit: inspection.templateCommit,
    template_version: inspection.templateVersion, source_contract_version: 2, protocol_version: 1,
    snapshot_hash: inspection.sourceSnapshotHash, manifest_hash: inspection.manifestHash,
    bundle_hash: inspection.bundleHash, binary_sha256: pinned.digest,
  };
  const artifact = produceCliArtifact({ root: sourceRoot, source: tuple, directory: path.join(base, 'artifact'),
    run: (file, args, cwd, environment) => spawnSync(file, args, { cwd, env: environment, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }) });
  assert.equal(validateArtifact(artifact, tuple), artifact, '正确固定来源必须能够消费');
  const beforeSource = tree(sourceRoot), beforeArtifact = tree(artifact.installed_root);
  for (const field of ['template_commit', 'snapshot_hash', 'manifest_hash', 'bundle_hash']) {
    const value = tuple[field], changed = (value[0] === '0' ? '1' : '0') + value.slice(1);
    assert.throws(() => validateArtifact(artifact, { ...tuple, [field]: changed }), /产物来源 tuple 不匹配/, field);
    assert.deepEqual(tree(sourceRoot), beforeSource);
    assert.deepEqual(tree(artifact.installed_root), beforeArtifact);
  }
  const target = path.join(base, 'project'), plan = path.join(base, 'init.json');
  const changedDigest = (pinned.digest[0] === '0' ? '1' : '0') + pinned.digest.slice(1);
  assert.throws(() => runNative(['init', '--profile', 'spec', '--root', target, '--plan', '--out', plan], {
    environment: { ...process.env, YSS_NATIVE_BINARY_SHA256: changedDigest },
  }), /二进制摘要漂移/);
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.existsSync(plan), false);
  assert.deepEqual(tree(sourceRoot), beforeSource);
});

test('原生同步与回滚保留用户文件，碰撞拒绝不写入项目', t => {
  const base = temporary(t);
  // The retired migration counterexample exercised Frontend; the retained
  // cli-retirement suite separately covers ordinary sync for all four Profiles.
  for (const profile of ['frontend']) {
    const target = path.join(base, profile);
    initializeNative(profile, target);
    const metadataPath = path.join(target, '.yss.json'), managedRef = 'scripts/sync-skills';
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const previousTool = '// previous managed tool\n', record = metadata.managedFiles[managedRef];
    assert.equal(record.ownership, 'managed', profile);
    // Model the approved baseline of an earlier native instance. The current
    // Bundle must offer a nonempty upgrade rather than a no-op transaction.
    fs.writeFileSync(path.join(target, managedRef), previousTool);
    record.baseline.digest = record.lastApplied.digest = nativeDigest(previousTool);
    metadata.baselineDigest = nativeDigest(JSON.stringify(metadata.managedFiles));
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
    fs.appendFileSync(path.join(target, 'CONTEXT.md'), '\n用户业务词汇：必须保留。\n');
    put(target, 'src/business.txt', '未提交的业务改动\n', 0o640);
    put(target, '.github/workflows/user.yml', 'name: User\n');
    put(target, '.git/index', '用户暂存索引\n', 0o600);

    // Explicit native migration must reject a user-edited governance tool even
    // though its recorded older baseline is eligible for a managed upgrade.
    const managedPath = path.join(target, managedRef);
    fs.appendFileSync(managedPath, '// user governance customization\n');
    const customized = tree(target), collisionPlan = path.join(base, `${profile}.collision-migrate.json`);
    const migration = runNative(['migrate', 'plan', '--profile', profile, '--root', target, '--out', collisionPlan]).result;
    assert.ok(migration.conflicts.includes(managedRef), `${profile}: 迁移必须识别用户治理修改`);
    assert.deepEqual(tree(target), customized, `${profile}: 迁移预演不能写入项目`);
    runNative(['migrate', 'apply', '--profile', profile, '--root', target, '--plan-file', collisionPlan], { expectedCode: 'CONFLICT' });
    assert.deepEqual(tree(target), customized, `${profile}: 迁移拒绝不能覆盖用户治理文件`);
    // Use a separate unmodified baseline scenario for the actual upgrade and
    // rollback; the conflict above never grants authority to overwrite it.
    fs.writeFileSync(managedPath, previousTool);

    const plan = path.join(base, `${profile}.sync.json`), beforePlan = tree(target);
    const preview = runNative(['sync', '--profile', profile, '--root', target, '--plan', '--out', plan]).result;
    assert.ok(preview.changes.some(row => row.path === managedRef), `${profile}: 应有真实受管工具升级`);
    assert.deepEqual(tree(target), beforePlan, `${profile}: 保存计划不写入项目`);

    // A post-plan user edit invalidates the saved input. Even an otherwise valid
    // tool upgrade must stop before replacing either the tool or user assets.
    const contextPath = path.join(target, 'CONTEXT.md');
    fs.appendFileSync(contextPath, '\n计划之后新增的业务说明。\n');
    const drifted = tree(target);
    runNative(['sync', '--profile', profile, '--root', target, '--apply', '--plan-file', plan], { expectedCode: 'INPUT_DRIFT' });
    assert.deepEqual(tree(target), drifted, `${profile}: 拒绝漂移必须保留整个现场`);

    const protectedRefs = ['CONTEXT.md', 'src/business.txt', '.github/workflows/user.yml', '.git/index'];
    const protectedFiles = protectedRefs.map(ref => ({ ref, bytes: fs.readFileSync(path.join(target, ref)), mode: fs.statSync(path.join(target, ref)).mode & 0o777 }));
    const beforeMetadata = fs.readFileSync(metadataPath);
    const freshPlan = path.join(base, `${profile}.fresh-sync.json`);
    runNative(['sync', '--profile', profile, '--root', target, '--plan', '--out', freshPlan]);
    runNative(['sync', '--profile', profile, '--root', target, '--apply', '--plan-file', freshPlan]);
    assert.notEqual(fs.readFileSync(path.join(target, managedRef), 'utf8'), previousTool, `${profile}: 必须实际更新工具`);
    const checkProtected = () => {
      for (const entry of protectedFiles) {
        assert.deepEqual(fs.readFileSync(path.join(target, entry.ref)), entry.bytes, `${profile}/${entry.ref}: 用户内容`);
        assert.equal(fs.statSync(path.join(target, entry.ref)).mode & 0o777, entry.mode, `${profile}/${entry.ref}: 用户权限`);
      }
    };
    checkProtected();
    runNative(['rollback', '--profile', profile, '--root', target, '--apply']);
    assert.equal(fs.readFileSync(path.join(target, managedRef), 'utf8'), previousTool);
    assert.deepEqual(fs.readFileSync(metadataPath), beforeMetadata, `${profile}: 回滚恢复原 metadata`);
    checkProtected();
  }
});
