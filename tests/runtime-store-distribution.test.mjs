import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('..', import.meta.url));
const coreRef = '.template-source/cli-core/runtime-store.mjs';
const families = ['create-yss-spec', 'create-yss-strategic-design', 'create-yss-harness-backend', 'create-yss-harness-frontend'];
const sharedRefs = ['scripts/runtime-store', 'scripts/lib/runtime-store.mjs', '.template-spec/process/runtime-storage.md'];
const read = ref => fs.readFileSync(path.join(root, ref));
const json = ref => JSON.parse(read(ref));

function temporary(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-distribution-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('supported Node range is consistent in CLI packages and generated scaffolds', async () => {
  for (const ref of ['.template-source/cli-core/package.json', ...families.map(name => `submodules/${name}/package.json`)]) {
    assert.equal(json(ref).engines.node, '>=22.13 <27', ref);
  }
  assert.match(read('.template-source/cli-core/scaffold.mjs').toString(), /engines: \{ node: ">=22\.13 <27" \}/);
  const { assertNodeVersion } = await import(pathToFileURL(path.join(root, coreRef)));
  for (const version of ['22.13.0', '22.13.1', '24.0.0', '26.0.0']) assert.doesNotThrow(() => assertNodeVersion(version));
  for (const version of ['22.12.0', '22.0.0', '21.7.3', '27.0.0']) assert.throws(() => assertNodeVersion(version), /22\.13/);
});

test('Node 22.12 startup rejection precedes all CLI and scaffold writes', t => {
  const scratch = temporary(t);
  const preload = path.join(scratch, 'old-node.cjs');
  fs.writeFileSync(preload, "Object.defineProperty(process.versions, 'node', {value:'22.12.0'});\n");
  const runtimeHome = path.join(scratch, 'runtime-home');
  for (const name of families) {
    const target = path.join(scratch, name);
    const bin = Object.values(json(`submodules/${name}/package.json`).bin)[0];
    const result = spawnSync(process.execPath, ['--require', preload, path.join(root, `submodules/${name}`, bin), 'init', '--target-dir', target, '--project-name', '拒绝版本', '--json'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, YSS_RUNTIME_HOME: runtimeHome },
    });
    assert.equal(result.status, 1, `${name}: ${result.stderr}`);
    assert.match(result.stdout + result.stderr, /22\.13/, name);
    assert.equal(fs.existsSync(target), false, name);
    assert.equal(fs.existsSync(runtimeHome), false, name);
  }
  const scaffoldTarget = path.join(scratch, 'scaffold');
  const scaffold = spawnSync(process.execPath, ['--require', preload, path.join(root, '.template-source/cli-core/scaffold.mjs'), 'backend', scaffoldTarget], {
    cwd: root, encoding: 'utf8', env: { ...process.env, YSS_RUNTIME_HOME: runtimeHome },
  });
  assert.equal(scaffold.status, 1, scaffold.stderr);
  assert.match(scaffold.stderr, /22\.13/);
  assert.equal(fs.existsSync(scaffoldTarget), false);
  assert.equal(fs.existsSync(runtimeHome), false);
});

test('runtime module copies and synchronization locks bind the canonical source', () => {
  const canonical = read(coreRef);
  for (const ref of ['scripts/lib/runtime-store.mjs', 'submodules/create-yss-spec/src/runtime-store.mjs', ...families.map(name => `submodules/${name}/vendor/cli-core/runtime-store.mjs`)]) {
    assert.ok(read(ref).equals(canonical), ref);
  }
  for (const side of ['design', 'backend', 'frontend']) {
    const target = `submodules/yss-harness-${side}-agent`;
    for (const ref of sharedRefs) assert.ok(read(`${target}/${ref}`).equals(read(ref)), `${target}/${ref}`);
    const lock = json(`${target}/.template-source/distribution/strategic-handoff-tools.lock.json`);
    assert.ok(lock.source_files[coreRef], `${target}: canonical source absent`);
    for (const ref of sharedRefs) assert.ok(lock.effective_files[ref], `${target}/${ref}: lock absent`);
  }
});

test('four CLI snapshots contain the runtime manager and portable policy', () => {
  const main = 'submodules/create-yss-spec';
  for (const ref of sharedRefs) assert.ok(read(`${main}/template/${ref}`).equals(read(ref)), `${main}/${ref}`);
  assert.equal(fs.existsSync(path.join(root, main, 'template/.template-source/process/runtime-storage.md')), false);
  for (const name of families.filter(name => name !== 'create-yss-spec')) {
    const packageRoot = `submodules/${name}`;
    const snapshot = json(`${packageRoot}/template.snapshot.json`);
    for (const ref of sharedRefs) {
      const entry = snapshot.files[ref];
      assert.ok(entry, `${name}/${ref}`);
      assert.ok(read(`${packageRoot}/template/${entry.blob}`).equals(read(ref)), `${name}/${ref}`);
    }
    assert.equal(snapshot.files['.template-source/process/runtime-storage.md'], undefined);
  }
});

test('main CLI initial stage installs the runtime manager and portable policy', () => {
  const require = createRequire(import.meta.url);
  const { distributionForVariables } = require('../submodules/create-yss-spec/src/template/distribution-runtime.js');
  const { assetPaths } = require('../submodules/create-yss-spec/src/template/asset-runtime.js');
  const template = path.join(root, 'submodules/create-yss-spec/template');
  const paths = assetPaths(template, distributionForVariables({ agentRuntime: 'codex' }, template));
  for (const ref of sharedRefs) assert.ok(paths.has(ref), `initial stage: ${ref}`);
});

test('runtime policy references preserve existing skill preflight and authority', () => {
  const research = read('.agents/skills/yss-research/SKILL.md').toString();
  const orchestration = read('.agents/skills/yss-product-lifecycle/references/orchestration.md').toString();
  assert.match(research, /scripts\/runtime-store inspect/);
  assert.match(orchestration, /scripts\/runtime-store inspect/);
  assert.match(orchestration, /--check-skills/);
  assert.match(orchestration, /Matt/);
  assert.match(orchestration, /数据库索引或历史通过记录不能推进阶段/);
});
