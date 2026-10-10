import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDocFacts, expandFiles } from '../scripts/lib/doc-facts.mjs';

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
