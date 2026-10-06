import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as runtime from '../runtime.mjs';
import { build as backendBuild } from '../build.mjs';
import { build as designBuild } from '../../yss-product-design/build.mjs';

test('权限比较表达 Windows 只读属性并保留 Unix 可执行位保护', () => {
  // This is a capability-model test with observed libuv modes, not a Windows
  // process execution or ACL verification claim.
  assert.equal(runtime.fileMode(0o100666, 'win32'), runtime.fileMode(0o755, 'win32'));
  assert.equal(runtime.fileMode(0o100444, 'win32'), runtime.fileMode(0o555, 'win32'));
  assert.notEqual(runtime.fileMode(0o100666, 'win32'), runtime.fileMode(0o444, 'win32'));
  assert.notEqual(runtime.fileMode(0o644, 'darwin'), runtime.fileMode(0o755, 'darwin'));
  assert.equal(runtime.fileMode(0o100751, 'linux'), 0o751);
  assert.equal(runtime.executableMode(0o100666, 'win32'), true);
  assert.equal(runtime.executableMode(0o100444, 'win32'), true);
  assert.equal(runtime.executableMode(0o100644, 'darwin'), false);
  assert.equal(runtime.executableMode(0o100755, 'linux'), true);
  for (const invalid of [undefined, '644', -1, NaN]) assert.throws(() => runtime.fileMode(invalid, 'win32'));
});

test('固定原生工具路径在 Windows 显式保留 exe 后缀', () => {
  assert.equal(runtime.nativeBinaryPath('win32'), 'assets/tool/yss.exe');
  assert.equal(runtime.nativeBinaryPath('darwin'), 'assets/tool/yss');
  assert.equal(runtime.nativeBinaryPath('linux'), 'assets/tool/yss');
});

for (const [profile, name, build] of [['spec', 'yss-backend-delivery', backendBuild], ['design', 'yss-product-design', designBuild]]) {
  test(`${profile} 当前主机真实公开打包并执行固定 staged binary`, () => {
    const binary = process.env.YSS_PLUGIN_TEST_BINARY;
    assert.ok(binary, 'fixed YSS_PLUGIN_TEST_BINARY required; no silent test skip');
    const parent = realpathSync(mkdtempSync(path.join(process.env.YSS_PLUGIN_TEST_ROOT || tmpdir(), `permissions-${profile}-`)));
    try {
      const output = path.join(parent, name), built = build({ binary, output });
      assert.equal(built.native.binaryPath, runtime.nativeBinaryPath());
      const native = path.join(output, built.native.binaryPath), stat = lstatSync(native);
      assert.equal(stat.mode & 0o777, built.native.binaryObservedMode, 'lock records actually observed bits separately');
      assert.equal(runtime.fileMode(stat.mode), built.native.binaryMode);
      const inspected = spawnSync(native, ['bundle', 'inspect', '--profile', profile, '--json'], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
      assert.equal(inspected.status, 0, inspected.stderr || inspected.stdout);
      assert.equal(JSON.parse(inspected.stdout).result.bundleHash, built.native.bundle.bundleHash);
      const verified = spawnSync(process.execPath, [path.join(output, 'scripts/plugin.mjs'), 'doctor'], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
      assert.equal(verified.status, 0, verified.stderr || verified.stdout);
      const lock = JSON.parse(readFileSync(path.join(output, 'bundle-lock.json')));
      for (const record of lock.files) {
        const observed = lstatSync(path.join(output, record.ref)).mode;
        assert.equal(runtime.fileMode(observed), record.mode);
        assert.equal(observed & 0o777, record.observed_mode);
      }
      if (process.platform !== 'win32') {
        const nonExecutable = path.join(parent, 'non-executable-native');
        writeFileSync(nonExecutable, readFileSync(binary)); chmodSync(nonExecutable, 0o644);
        assert.throws(() => build({ binary: nonExecutable, output: path.join(parent, 'rejected', name) }), /native-binary-not-executable/);
      }
    } finally { rmSync(parent, { recursive: true, force: true }); }
  });
}
