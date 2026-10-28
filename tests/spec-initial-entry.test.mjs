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
  assert.equal(shipped('.template-source/process/maintenance-intensity.yaml', policy.manifest), true, 'skills 参考资料显式进入 Bundle');
  assert.equal(fs.existsSync(path.join(instance, '.template-source')), false);
});

test('Spec governed GitLab tracker 的条件工作流文档随初始资产可读', t => {
  const instance = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-spec-gitlab-entry-'));
  t.after(() => fs.rmSync(instance, { recursive: true, force: true }));
  for (const ref of policy.common.files) {
    const source = path.join(root, ref);
    if (!shipped(ref, policy.manifest) || !fs.existsSync(source)) continue;
    const target = path.join(instance, ref);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  const tracker = fs.readFileSync(path.join(instance, '.template-spec/agents/issue-tracker.md'), 'utf8');
  const gitlab = '.template-spec/agents/gitlab-workflow-skills.md';
  assert.match(tracker, /当平台为 GitLab 时/);
  assert.ok(tracker.includes(`\`${gitlab}\``), 'GitLab tracker 应引用实际工作流文档');
  assert.ok(fs.existsSync(path.join(instance, gitlab)), 'GitLab tracker 依赖的工作流文档必须随初始资产可用');
  assert.match(fs.readFileSync(path.join(instance, gitlab), 'utf8'), /scripts\/gitworks/);
  assert.ok(fs.existsSync(path.join(root, 'scripts/gitworks')), 'GitLab 工作流的脚本必须存在于模板中');
  assert.ok(policy.common.scripts.includes('scripts/gitworks'), 'GitLab 工作流的脚本必须随初始资产可用');
  assert.ok(shipped('scripts/gitworks', policy.manifest), 'GitLab 工作流的脚本必须可分发');
});
