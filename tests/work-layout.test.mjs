import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readWorkLayout, workLayout } from '../scripts/lib/work-layout.mjs';

test('JS 与 Go 消费同一份可移植路径合同用例', t => {
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
