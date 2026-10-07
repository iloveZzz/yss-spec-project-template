import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hash } from '../runtime.mjs';
import { inventory } from './recovery-only.mjs';

// Exercise the real old and new executables, rather than fabricating provenance
// in either installed metadata or the plugin receipt.
export function sourceUpgrade(build, name, profile) {
  const binary = process.env.YSS_PLUGIN_TEST_BINARY;
  const previousBinary = process.env.YSS_PLUGIN_PREVIOUS_BINARY;
  const previousDigest = process.env.YSS_PLUGIN_PREVIOUS_BINARY_SHA256;
  assert.ok(binary && previousBinary && /^[a-f0-9]{64}$/.test(previousDigest || ''), 'fixed current and previous native binaries required');
  assert.equal(hash(readFileSync(previousBinary)), previousDigest, 'previous executable must match its independent fixed digest');
  assert.notEqual(hash(readFileSync(binary)), previousDigest, 'source upgrade requires distinct actual executable bytes');
  const parent = realpathSync(mkdtempSync(path.join(process.env.YSS_PLUGIN_TEST_ROOT || tmpdir(), `source-upgrade-${profile}-`)));
  const receipt = profile === 'design' ? '.yss-product-design-plugin.json' : '.yss-backend-plugin.json';
  const events = [], startedAt = new Date().toISOString();
  let previousSource = null;
  let passed = false;
  const persist = () => writeFileSync(path.join(parent, 'source-upgrade-result.json'), JSON.stringify({ profile, target: path.join(parent, 'project'),
    previous_binary: previousBinary, previous_binary_sha256: previousDigest, binary, binary_sha256: hash(readFileSync(binary)),
    previous_source: previousSource, started_at: startedAt, finished_at: new Date().toISOString(), passed, events }, null, 2) + '\n');
  function execute(executable, args, expected = 0) {
    const start = new Date().toISOString();
    const result = spawnSync(executable, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
    events.push({ executable, args, started_at: start, finished_at: new Date().toISOString(), exit_code: result.status,
      signal: result.signal, stdout: result.stdout, stderr: result.stderr, error: result.error?.message || null });
    assert.equal(result.status, expected, result.stderr || result.stdout || result.error?.message);
    return JSON.parse(executable === process.execPath && expected !== 0 ? result.stderr.trim().split('\n').at(-1) : result.stdout);
  }
  try {
    const previousRoot = path.join(parent, 'previous'), currentRoot = path.join(parent, 'current');
    mkdirSync(previousRoot); mkdirSync(currentRoot);
    const previousPlugin = path.join(previousRoot, name), currentPlugin = path.join(currentRoot, name), target = path.join(parent, 'project');
    const previousCommit = process.env.YSS_PLUGIN_PREVIOUS_SOURCE_COMMIT;
    if (previousCommit) {
      assert.match(previousCommit, /^[a-f0-9]{40}$/, 'historical plugin source requires a full fixed commit');
      const repository = realpathSync(process.env.YSS_PLUGIN_PREVIOUS_SOURCE_GIT_ROOT);
      const source = path.join(parent, 'previous-source'); mkdirSync(source);
      const prefixes = ['.template-source/plugins/yss-backend-delivery', '.template-source/plugins/yss-product-design'];
      const tree = execFileSync('git', ['-C', repository, 'ls-tree', '-r', '-z', previousCommit, ...prefixes], { maxBuffer: 4 * 1024 * 1024 });
      const records = [];
      for (const entry of tree.toString('utf8').split('\0').filter(Boolean)) {
        const [header, ref] = entry.split('\t'), [mode, kind, blob] = header.split(' ');
        assert.ok(kind === 'blob' && ['100644', '100755'].includes(mode), 'historical closure only contains regular Git blobs');
        assert.ok(prefixes.some(prefix => ref.startsWith(prefix + '/')) && !ref.split('/').includes('..'));
        const bytes = execFileSync('git', ['-C', repository, 'cat-file', 'blob', blob], { maxBuffer: 4 * 1024 * 1024 });
        const file = path.join(source, ref), permissions = mode === '100755' ? 0o755 : 0o644;
        mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes, { flag: 'wx' }); chmodSync(file, permissions);
        records.push({ ref, git_blob: blob, sha256: hash(bytes), mode: permissions });
      }
      assert.ok(records.length > 0, 'historical plugin dependency closure must exist');
      previousSource = { repository, commit: previousCommit, root: source, files: records };
      // Keep the historical builder and runtime together. The current builder's
      // new capability requirements remain intact for the current executable.
      execute(process.execPath, [path.join(source, '.template-source/plugins', name, 'build.mjs'), '--output', previousPlugin, '--binary', previousBinary]);
    } else {
      build({ output: previousPlugin, binary: previousBinary });
    }
    build({ output: currentPlugin, binary });
    const plugin = (root, args) => execute(process.execPath, [path.join(root, 'scripts/plugin.mjs'), ...args]);
    const save = (name, value) => { const file = path.join(parent, name); writeFileSync(file, JSON.stringify(value)); return file; };
    const initial = plugin(previousPlugin, ['project-plan', '--target-dir', target, '--project-name', '原生绑定来源升级', '--business-domain', '治理', '--issue-tracker', 'github']);
    plugin(previousPlugin, ['project-apply', '--plan', save('initial-plan.json', initial)]);
    const read = ref => readFileSync(path.join(target, ref));
    const metadataBefore = read('.yss.json'), receiptBefore = read(receipt), contextBefore = read('CONTEXT.md');
    assert.equal(JSON.parse(receiptBefore).binary_sha256, previousDigest);
    if (previousSource) assert.equal(JSON.parse(metadataBefore).schemaVersion, 2, 'historical plugin must create a real old native identity');
    writeFileSync(path.join(target, 'business.txt'), '跨二进制升级必须保留的业务资产\n');
    const beforeRejected = inventory(target), rejectedPlan = path.join(parent, 'rejected-native-plan.json');
    const rejection = execute(binary, ['sync', '--root', target, '--profile', profile, '--plan', '--out', rejectedPlan, '--json'], 1);
    assert.equal(rejection.code, 'BINDING_REQUIRED');
    assert.deepEqual(inventory(target), beforeRejected, 'source change without an explicit binding must not write any project bytes or modes');
    assert.equal(existsSync(rejectedPlan), false, 'rejected source changes must not persist an applicable plan');
    const upgrade = plugin(currentPlugin, ['project-upgrade-plan', '--target-dir', target]);
    assert.deepEqual(inventory(target), beforeRejected, 'public upgrade preview must remain read-only');
    plugin(currentPlugin, ['project-upgrade-apply', '--plan', save('upgrade-plan.json', upgrade)]);
    assert.equal(plugin(currentPlugin, ['project-check', '--target-dir', target]).result, 'binding-matched');
    assert.equal(JSON.parse(read(receipt)).binary_sha256, hash(readFileSync(binary)));
    assert.notDeepEqual(read('.yss.json'), metadataBefore, 'native identity must advance together with the new binding');
    assert.deepEqual(read('CONTEXT.md'), contextBefore);
    assert.equal(read('business.txt').toString(), '跨二进制升级必须保留的业务资产\n');
    const sameSourcePlan = path.join(parent, 'same-source-plan.json'), beforeSameSource = inventory(target);
    const compatible = execute(binary, ['sync', '--root', target, '--profile', profile, '--plan', '--out', sameSourcePlan, '--json']);
    assert.equal(compatible.status, 'ok');
    assert.deepEqual(inventory(target), beforeSameSource, 'same-source native preview also remains read-only');
    plugin(currentPlugin, ['project-rollback', '--target-dir', target, '--apply']);
    assert.deepEqual(read('.yss.json'), metadataBefore, 'whole rollback must restore the previous native identity bytes');
    assert.deepEqual(read(receipt), receiptBefore, 'whole rollback must restore the previous binding bytes');
    assert.deepEqual(read('CONTEXT.md'), contextBefore);
    assert.equal(read('business.txt').toString(), '跨二进制升级必须保留的业务资产\n');
    assert.equal(plugin(previousPlugin, ['project-check', '--target-dir', target]).result, 'binding-matched');
    passed = true;
    return { profile, source_change_guard: true, same_source_preview: true, public_upgrade: true, whole_rollback: true };
  } finally {
    persist();
    // Keep process logs and the fixture for both successful and failed source
    // transitions so independent review can inspect the two actual identities.
  }
}
