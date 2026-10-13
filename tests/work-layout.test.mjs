import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertNoTemplateReferences, readWorkLayout, workLayout } from '../scripts/lib/work-layout.mjs';

test('工作包路径遵循可移植合同用例', t => {
  const suite=JSON.parse(fs.readFileSync(new URL('./fixtures/work-layout-cases.json',import.meta.url)));
  const root=project(t);
  for(const item of suite.cases) {
    const build=()=>workLayout(root,{platform:'local-markdown',root:item.root});
    if(!item.valid) { assert.throws(build,`${item.root}`);continue; }
    const layout=build();assert.equal(layout.root,item.normalized);
    assert.equal(layout.checkpointFeature(item.checkpoint),item.feature);assert.equal(layout.isTicket(item.ticket),true);
  }
});

function project(t, rootRef = '.work') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-work-layout-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.template-spec/agents'), { recursive: true });
  fs.writeFileSync(path.join(root, '.template-spec/agents/issue-tracker.md'), `---\ntracker:\n  platform: local-markdown\n  root: ${rootRef}\n---\n`);
  return root;
}

test('配置选择工作包根，旧项目继续原路径，新旧路径不能互相冒充', t => {
  for (const base of ['.work', 'docs/.scratch', 'docs/custom-work']) {
    const layout = readWorkLayout(project(t, base));
    assert.equal(layout.featureRoot('report'), `${base}/report`);
    assert.equal(layout.checkpointFeature(`${base}/report/checkpoint.yaml`), 'report');
    assert.equal(layout.isTicket(`${base}/report/issues/01-export.md`), true);
    assert.throws(() => layout.checkpointFeature(`${base === '.work' ? 'docs/.scratch' : '.work'}/report/checkpoint.yaml`));
    assert.ok(layout.scanRoots.includes('.work'));
    assert.ok(layout.scanRoots.includes('docs/.scratch'));
  }
});

test('非法、保留或历史根不能成为当前写入配置', t => {
  const root = project(t);
  for (const base of ['', '../outside', '/outside', '.git', '.yss/work', '.agents/work', '.scratch', 'docs/requirements/tickets']) {
    assert.throws(() => workLayout(root, { root: base, platform: 'local-markdown' }), base);
  }
  assert.throws(() => readWorkLayout(project(t, 'null')));
  const missing=fs.mkdtempSync(path.join(os.tmpdir(), 'yss-work-layout-missing-'));
  t.after(()=>fs.rmSync(missing,{recursive:true,force:true}));
  assert.throws(() => readWorkLayout(missing));
});

test('配置根不能通过符号链接越过项目边界', t => {
  const root = project(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-work-layout-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(root, '.work'));
  assert.throws(() => readWorkLayout(root), /symlink/);
});

test('正式引用拒绝当前、自定义和历史布局的模板占位路径，说明文字不作为路径', t => {
  for (const base of ['.work', 'docs/custom-work', 'docs/.scratch']) {
    const root = project(t, base);
    for (const ref of [`./${base}/example/spec.md`, `${base}//example/spec.md`, `${base}/reports/../example/spec.md`, path.join(root, base, 'example/spec.md')]) {
      assert.throws(() => assertNoTemplateReferences({ spec_ref: ref }, { root }), /模板占位/);
    }
    assert.doesNotThrow(() => assertNoTemplateReferences({ spec_ref: `https://example.org/${base}/example/spec.md` }, { root }));
    for (const ref of [`${base}/example/spec.md`, '.work/example/spec.md', 'docs/.scratch/example/spec.md', `${base}/<feature>/spec.md`]) {
      assert.throws(() => assertNoTemplateReferences({ spec_ref: ref }, { root }), /模板占位/);
      assert.throws(() => assertNoTemplateReferences({ evidence_refs: [ref] }, { root }), /模板占位/);
      assert.throws(() => assertNoTemplateReferences({ implementation_plan: { ref } }, { root }), /模板占位/);
    }
    assert.doesNotThrow(() => assertNoTemplateReferences({ spec_ref: `${base}/reports/spec.md`, explanation: '历史说明 docs/.scratch/example/spec.md' }, { root }));
  }
});

test('遗留检查覆盖所有子模块、文档、Schema、无扩展脚本、转义及文件名，并拒绝过期例外', t => {
  const root = project(t);
  const checker = new URL('../scripts/verify-work-layout', import.meta.url).pathname;
  const git = (cwd, ...args) => {
    const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  git(root, 'init', '-q');
  const write = (ref, text) => { fs.mkdirSync(path.dirname(path.join(root, ref)), { recursive: true }); fs.writeFileSync(path.join(root, ref), text); };
  const policyRef = '.template-source/process/work-layout-exceptions.json';
  const save = exceptions => write(policyRef, JSON.stringify({ schema_version: 1, exceptions }));
  save([]);
  const run = (...args) => spawnSync(process.execPath, [checker, '--root', root, ...args], { encoding: 'utf8' });
  assert.equal(run().status, 0);
  for (const profile of ['design', 'backend', 'frontend']) {
    const ref = `submodules/${profile}`;
    fs.mkdirSync(path.join(root, ref), { recursive: true });
    git(path.join(root, ref), 'init', '-q');
    git(root, 'update-index', '--add', '--cacheinfo', `160000,${'1'.repeat(40)},${ref}`);
  }
  const refs = ['policy.yaml', 'schema.json', 'issue-tracker.md', 'scripts/check', 'tests/ordinary.mjs', 'profiles/design/scripts/lib/consumer.mjs', 'profiles/backend/.template-spec/agents/issue-tracker.md', 'submodules/design/contract.yaml', 'submodules/backend/work-layout.md', 'submodules/frontend/scripts/check'];
  for (const ref of refs) write(ref, 'root: docs/.scratch\n');
  write('escaped.json', JSON.stringify({ pattern: String.raw`^docs\/\.scratch` }));
  write('docs/.scratch/empty.md', '');
  const failed = run();
  assert.notEqual(failed.status, 0);
  for (const ref of [...refs, 'escaped.json', 'docs/.scratch/empty.md']) assert.ok(failed.stderr.includes(ref), failed.stderr);
  const inspected = run('--inventory');
  assert.equal(inspected.status, 0, inspected.stderr);
  const rules = JSON.parse(inspected.stdout).map(({ line, ...item }) => ({ ...item, category: 'compatibility-test', reason: '显式旧布局回归用例' }));
  save(rules);
  assert.equal(run().status, 0, run().stderr);
  write('policy.yaml', 'root: docs/.scratch\nroot: docs/.scratch\n');
  assert.match(run().stderr, /次数变化/);
  write('policy.yaml', 'root: .work\n');
  assert.match(run().stderr, /失效例外/);
  fs.rmSync(path.join(root, 'submodules/backend/.git'), { recursive: true });
  assert.match(run().stderr, /子模块未初始化/);
});

test('独立 CLI 扫描不依赖已删除的 Go 测试目录', t => {
  const root = project(t), cli = project(t);
  for (const cwd of [root, cli]) assert.equal(spawnSync('git', ['-C', cwd, 'init', '-q']).status, 0);
  fs.mkdirSync(path.join(root, '.template-source/process'), { recursive: true });
  fs.writeFileSync(path.join(root, '.template-source/process/work-layout-exceptions.json'), JSON.stringify({ schema_version: 1, exceptions: [] }));
  const run = () => spawnSync(process.execPath, [new URL('../scripts/verify-work-layout', import.meta.url).pathname, '--root', root, '--cli-root', cli], { encoding: 'utf8' });
  assert.equal(run().status, 0, run().stderr);
  fs.writeFileSync(path.join(cli, 'layout.go'), 'const root = "docs/.scratch"');
  assert.notEqual(run().status, 0);
  assert.match(run().stderr, /cli\/layout.go/);
});
