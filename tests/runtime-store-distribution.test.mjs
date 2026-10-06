import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {NATIVE_PROFILES,initializeNative,runNative} from '../.template-source/scripts/lib/native-yss.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const coreRef = '.template-source/cli-core/runtime-store.mjs';
const sharedRefs = ['scripts/runtime-store', 'scripts/lib/runtime-store.mjs', '.template-spec/process/runtime-storage.md'];
const read = ref => fs.readFileSync(path.join(root, ref));
const json = ref => JSON.parse(read(ref));

function temporary(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-distribution-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('supported Node range is consistent in retained governance tools and generated scaffolds', async () => {
  for (const ref of ['.template-source/cli-core/package.json']) {
    assert.equal(json(ref).engines.node, '>=22.13 <27', ref);
  }
  assert.match(read('.template-source/cli-core/scaffold.mjs').toString(), /engines: \{ node: ">=22\.13 <27" \}/);
  const { assertNodeVersion } = await import(pathToFileURL(path.join(root, coreRef)));
  for (const version of ['22.13.0', '22.13.1', '24.0.0', '26.0.0']) assert.doesNotThrow(() => assertNodeVersion(version));
  for (const version of ['22.12.0', '22.0.0', '21.7.3', '27.0.0']) assert.throws(() => assertNodeVersion(version), /22\.13/);
});

test('Node 22.12 startup rejection precedes runtime storage and scaffold writes', t => {
  const scratch = temporary(t);
  const preload = path.join(scratch, 'old-node.cjs');
  fs.writeFileSync(preload, "Object.defineProperty(process.versions, 'node', {value:'22.12.0'});\n");
  const runtimeHome = path.join(scratch, 'runtime-home');
  // yss is native; Node minimum-version protection belongs to the retained governance tools.
  for(const profile of NATIVE_PROFILES){
    const target=path.join(scratch,profile);initializeNative(profile,target);
    const result=spawnSync(process.execPath,['--require',preload,path.join(target,'scripts/runtime-store'),'inspect','--root',target,'--home',runtimeHome],{cwd:target,encoding:'utf8'});
    assert.equal(result.status,2,`${profile}: ${result.stderr}`);assert.match(result.stdout+result.stderr,/运行存储需要 Node >=22\.13 <27，当前 22\.12\.0/);assert.equal(fs.existsSync(runtimeHome),false);
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
  for (const ref of ['scripts/lib/runtime-store.mjs']) {
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

test('four native Bundle exports contain runtime manager and portable policy', t => {
  const scratch=temporary(t);
  for(const profile of NATIVE_PROFILES){
    const out=path.join(scratch,profile);const exported=runNative(['bundle','export','--profile',profile,'--out',out]).result;
    for(const ref of sharedRefs){assert.ok(exported.files.some(row=>row.path===ref),`${profile}/${ref}`);assert.ok(fs.readFileSync(path.join(out,ref)).equals(read(ref)),`${profile}/${ref}`);}
    assert.equal(fs.existsSync(path.join(out,'.template-source')),false);
  }
});

test('spec initial stage installs runtime manager and portable policy through public init',t=>{
  const scratch=temporary(t),target=path.join(scratch,'spec');initializeNative('spec',target);
  for(const ref of sharedRefs)assert.ok(fs.readFileSync(path.join(target,ref)).equals(read(ref)),ref);
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
