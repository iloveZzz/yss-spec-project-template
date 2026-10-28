import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { shipped } from '../scripts/lib/profile-distribution.mjs';

const root = path.resolve(import.meta.dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, '.template-source/distribution/bundle-profile.json')));

test('Spec governed 初始入口引用的政策可从 common 分发，模板源仍被排除', t => {
  const instance = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-spec-initial-entry-'));
  t.after(() => fs.rmSync(instance, { recursive: true, force: true }));
  for (const ref of policy.common.files) {
    const source = path.join(root, ref);
    if (!shipped(ref, policy.manifest) || !fs.existsSync(source)) continue;
    const target = path.join(instance, ref);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  const ref = '.template-spec/process/agent-entry-policy.md';
  assert.ok(agents.includes(`\`${ref}\``), '治理入口应实际引用政策文件');
  assert.ok(fs.existsSync(path.join(instance, ref)), '初始治理入口引用的政策必须随 common 可用');
  assert.ok(fs.statSync(path.join(instance, ref)).isFile());
  const entry = fs.readFileSync(path.join(instance, ref), 'utf8');
  const glossary = '.template-spec/process/process-glossary.md';
  assert.ok(entry.includes(`\`${glossary}\``), '入口应确实指向流程术语');
  assert.ok(fs.existsSync(path.join(instance, glossary)), '入口按需读取的流程术语必须可用');
  assert.equal(shipped('.template-source/process/maintenance-intensity.yaml', policy.manifest), false);
  assert.equal(fs.existsSync(path.join(instance, '.template-source')), false);
});
