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

test('新 Spec governed 初始安装不携带实现阶段，tracker 参考能从核心技能解析', t => {
  const instance = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-spec-minimal-entry-'));
  t.after(() => fs.rmSync(instance, { recursive: true, force: true }));
  const cfg=policy.installations.governed;
  for (const ref of cfg.files) {
    const target=path.join(instance,ref);fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(path.join(root,ref),target);
  }
  for (const skill of cfg.skills) {
    const ref=`.agents/skills/${skill}`;
    fs.mkdirSync(path.dirname(path.join(instance,ref)),{recursive:true});
    fs.cpSync(path.join(root,ref),path.join(instance,ref),{recursive:true});
  }
  for(const [target,source] of Object.entries(cfg.entries)) fs.copyFileSync(path.join(root,source),path.join(instance,target));
  for(const ref of ['CONTEXT.md','.template-spec/process/lifecycle-registry.yaml','.template-spec/process/orchestration-contract.yaml','.agents/skills/implement','.agents/skills/code-review'])
    assert.equal(fs.existsSync(path.join(instance,ref)),false,ref);
  const entry=path.join(instance,'.agents/skills/to-spec/SKILL.md');
  const links=[...fs.readFileSync(entry,'utf8').matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);
  assert.ok(links.length>0);
  for(const link of links) {
    const resolved=path.resolve(path.dirname(entry),link);
    assert.ok(resolved.startsWith(instance+path.sep));assert.ok(fs.statSync(resolved).isFile());
  }
  const config=JSON.parse(fs.readFileSync(path.join(instance,'.template-spec/process/spec-workflow.json')));
  assert.equal(config.specWorkflow,cfg.specWorkflow);
});
