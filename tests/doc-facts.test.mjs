import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDocFacts, expandFiles, formatFinding } from '../scripts/lib/doc-facts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = { version: 3, sources: { 'mattpocock/skills': { revision: '0ab1b63a410a03d3627979a109c8695de27af954' } } };

function project(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-doc-facts-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'skills-lock.json'), JSON.stringify(LOCK));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

test('README 中与 lock 不一致的 revision 报告文件、行号和 lock 值', (t) => {
  const root = project(t, { 'README.md': '# 模板\n\n```text\nmattpocock/skills\nmain@6acc160e4e0cd062dbbbd7a1b26ae92855edf07e\n```\n' });
  const [finding, ...rest] = checkDocFacts(root);
  assert.equal(rest.length, 0);
  assert.equal(finding.file, 'README.md');
  assert.equal(finding.line, 5);
  assert.equal(finding.rule, 'upstream-revision');
  assert.match(finding.detail, /0ab1b63a/);
});

test('README 即使写入与 lock 一致的 revision 也视为复述', (t) => {
  const root = project(t, { 'README.md': 'mattpocock/skills@0ab1b63a410a\n' });
  const findings = checkDocFacts(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].detail, '说明文档硬编码上游 revision');
});

test('每类登记的复述模式都会命中并指向权威资产', (t) => {
  const root = project(t, {
    'docs/process/guide.md': '## 6. 21 个门禁的团队速查\n## 5. 八个主阶段怎么执行\n',
    '.template-source/agents/maintenance.md': '不再进入六个共享投影根。\n',
    '.template-spec/agents/roles.md': '## 四条正交轴\n',
  });
  const rules = checkDocFacts(root).map((item) => `${item.file}:${item.line}:${item.rule}`);
  assert.deepEqual(rules, [
    'docs/process/guide.md:1:gate-count',
    'docs/process/guide.md:2:stage-count',
    '.template-source/agents/maintenance.md:1:projection-root-count',
    '.template-spec/agents/roles.md:1:orthogonal-axis-count',
  ]);
  assert.ok(checkDocFacts(root).every((item) => item.authority));
});

test('合同目录与未登记文件不扫描，缺少 docs/process 时通过', (t) => {
  const root = project(t, {
    'README.md': '门禁见注册表。\n',
    '.template-source/contracts/spec.md': '团队指南写“21 个门禁”。\n',
    'docs/other/notes.md': '六个共享投影根\n',
  });
  assert.deepEqual(checkDocFacts(root), []);
  assert.deepEqual(expandFiles(root, ['docs/process/*.md', 'README.md']), ['README.md']);
});

test('当前模板源说明文档不复述已登记事实', () => {
  const findings = checkDocFacts(ROOT).filter((item) => !item.file.startsWith('docs/process/'));
  assert.deepEqual(findings, []);
});

test('入口文档的引用路径不存在时报告 path-ref，并给出登记位置', (t) => {
  const root = project(t, {
    'AGENTS.md': '先读 `.template-spec/process/missing.md` 与 [手册](.template-spec/user-guide/gone.md)。\n',
    '.template-spec/process/present.md': 'ok\n',
    'README.md': '见 `.template-spec/process/present.md`。\n',
  });
  const findings = checkDocFacts(root);
  assert.deepEqual(findings.map((item) => `${item.file}:${item.line}:${item.rule}:${item.text}`), [
    'AGENTS.md:1:path-ref:.template-spec/process/missing.md',
    'AGENTS.md:1:path-ref:.template-spec/user-guide/gone.md',
  ]);
  assert.match(formatFinding(findings[0]), /pathRefs\.allow/);
});

test('path-ref 跳过登记项、裸文件名、命令与外链，并按文件目录和 Profile 根解析', (t) => {
  const root = project(t, {
    'AGENTS.md': [
      '`.template-spec/process/harness-profile.yaml` `references/user-decisions.md` `apps/backend/` `.yss-harness-backend.json`',
      '`process-glossary.md` `yss lifecycle route` `recover/rollback` [外链](https://example.com/a.md)',
    ].join('\n'),
    '.template-spec/user-guide/用户手册索引.md': '[CLI](cli/install.md)\n',
    '.template-spec/user-guide/cli/install.md': 'ok\n',
    'profiles/backend/AGENTS.md': '`.template-spec/process/harness-profile.yaml` `.template-spec/process/only-root.md`\n',
    'profiles/backend/.template-spec/process/agent-entry-policy.md': '`.template-spec/process/backend-only.md`\n',
    'profiles/backend/.template-spec/process/backend-only.md': 'ok\n',
    '.template-spec/process/only-root.md': 'ok\n',
  });
  assert.deepEqual(checkDocFacts(root), []);
});

test('计数模式不把“一个”当作复述，维护强度与 Profile 数量复述会命中', (t) => {
  const root = project(t, {
    '.template-spec/process/glossary.md': '一个主阶段可以包含多个工作单元。\n',
    '.template-spec/process/tailoring.md': 'L1 有 3 项触发、L2 有 9 项具体影响触发。\n',
    '.template-spec/user-guide/guide.md': '四种 Profile 使用同一入口；三个 Profile 共用覆盖。\n',
  });
  assert.deepEqual(checkDocFacts(root).map((item) => `${item.file}:${item.rule}`), [
    '.template-spec/process/tailoring.md:intensity-trigger-count',
    '.template-spec/process/tailoring.md:intensity-trigger-count',
    '.template-spec/user-guide/guide.md:profile-count',
    '.template-spec/user-guide/guide.md:profile-count',
  ]);
});
