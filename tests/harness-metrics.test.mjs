import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectMetrics, parseSkillFrontmatter } from '../scripts/lib/harness-metrics.mjs';

function project(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-harness-metrics-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function skill(root, name, frontmatter, extra = {}) {
  const dir = path.join(root, '.agents/skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n${frontmatter}\n---\n\n正文\n`);
  if (extra.openai) {
    fs.mkdirSync(path.join(dir, 'agents'));
    fs.writeFileSync(path.join(dir, 'agents/openai.yaml'), extra.openai);
  }
}

test('description 支持行内、引号和折叠块，且不把引号计入长度', () => {
  assert.equal(parseSkillFrontmatter('---\ndescription: 四个字符\n---\n').description, '四个字符');
  assert.equal(parseSkillFrontmatter('---\ndescription: "四个字符"\n---\n').description, '四个字符');
  assert.equal(parseSkillFrontmatter('---\ndescription: >-\n  第一行\n  第二行\nother: x\n---\n').description, '第一行 第二行');
  assert.equal(parseSkillFrontmatter('---\nname: x\ndisable-model-invocation: true\n---\n').disableModelInvocation, true);
});

test('隐式技能口径：显式技能不计入可隐式触发的 description 字符', t => {
  const root = project(t);
  skill(root, 'free', 'description: 12345');
  skill(root, 'manual', 'description: 1234567890\ndisable-model-invocation: true');
  skill(root, 'codex-off', 'description: 123', { openai: 'policy:\n  allow_implicit_invocation: false\n' });
  const { skills } = collectMetrics(root);
  assert.equal(skills.canonical.skills, 3);
  assert.equal(skills.canonical.description_chars_all, 18);
  assert.deepEqual(skills.canonical.claude, { implicit_skills: 2, implicit_description_chars: 8, explicit_skills: 1 });
  assert.deepEqual(skills.canonical.codex, { implicit_skills: 1, implicit_description_chars: 5, explicit_skills: 2 });
});

test('投影根区分符号链接、完整副本和运行时独有技能', t => {
  const root = project(t);
  skill(root, 'a', 'description: x');
  skill(root, 'b', 'description: y');
  const projection = path.join(root, '.codex/skills');
  fs.mkdirSync(projection, { recursive: true });
  fs.symlinkSync(path.join(root, '.agents/skills/a'), path.join(projection, 'a'));
  fs.cpSync(path.join(root, '.agents/skills/b'), path.join(projection, 'b'), { recursive: true });
  fs.mkdirSync(path.join(projection, 'only-codex'));
  const [codex] = collectMetrics(root).projection_roots;
  assert.deepEqual(codex, { root: '.codex/skills', entries: 3, symlinks: 1, full_copies: 1, runtime_only: 1 });
});

test('缺少文件时输出 null 而不是抛错，常驻上下文只累计存在的文件', t => {
  const root = project(t);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'abc');
  const metrics = collectMetrics(root);
  assert.equal(metrics.resident_context.total_bytes, 3);
  assert.equal(metrics.resident_context.files.find((item) => item.path === 'CONTEXT.md').bytes, null);
  assert.equal(metrics.skills.canonical.exists, false);
  assert.equal(metrics.process_files, 0);
  assert.equal(metrics.timings_ms.ci_gate, null);
});
