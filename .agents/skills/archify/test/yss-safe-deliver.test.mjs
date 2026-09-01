import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = path.join(skillRoot, 'scripts', 'yss-safe-deliver.mjs');
const example = path.join(skillRoot, 'examples', 'web-app.architecture.json');

function repository(mode = 'project-instance') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-archify-safe-'));
  fs.writeFileSync(path.join(root, 'yss-project.yaml'), `schema_version: 1\nrepository_mode: ${mode}\n`);
  return root;
}

function run(root, input, output, extra = []) {
  return spawnSync(process.execPath, [wrapper, 'architecture', input, output, ...extra], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('rejects stable output outside the repository-mode allowlist', () => {
  const root = repository();
  const input = path.join(root, 'diagram.archify.json');
  fs.copyFileSync(example, input);
  const result = run(root, input, path.join(root, 'docs', 'architecture', 'diagram.html'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /输出目录必须先随配对的 JSON 源建立|稳定图必须位于/);
});

test('refuses to overwrite an unrelated file inside the allowlist', () => {
  const root = repository();
  const directory = path.join(root, 'docs', 'architecture', 'diagrams', 'runtime-map');
  fs.mkdirSync(directory, { recursive: true });
  const input = path.join(directory, 'runtime-map.archify.json');
  const output = path.join(directory, 'runtime-map.html');
  fs.copyFileSync(example, input);
  fs.writeFileSync(output, 'do-not-overwrite');
  const result = run(root, input, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /拒绝覆盖非 Archify 产物/);
  assert.equal(fs.readFileSync(output, 'utf8'), 'do-not-overwrite');
});

test('refuses to overwrite an unrelated receipt inside the allowlist', () => {
  const root = repository();
  const directory = path.join(root, 'docs', 'architecture', 'diagrams', 'runtime-map');
  fs.mkdirSync(directory, { recursive: true });
  const input = path.join(directory, 'runtime-map.archify.json');
  const output = path.join(directory, 'runtime-map.html');
  const receipt = path.join(directory, 'runtime-map.receipt.json');
  fs.copyFileSync(example, input);
  fs.writeFileSync(receipt, '{"owner":"human"}\n');
  const result = run(root, input, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /拒绝覆盖非 YSS Archify receipt/);
  assert.equal(fs.readFileSync(receipt, 'utf8'), '{"owner":"human"}\n');
});

test('rejects an allowlisted path that escapes through a symlink', () => {
  const root = repository();
  const base = path.join(root, 'docs', 'architecture', 'diagrams');
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-archify-escape-'));
  fs.mkdirSync(base, { recursive: true });
  fs.symlinkSync(outside, path.join(base, 'runtime-map'));
  const input = path.join(outside, 'runtime-map.archify.json');
  fs.copyFileSync(example, input);
  const output = path.join(base, 'runtime-map', 'runtime-map.html');
  const result = run(root, input, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /稳定图必须位于|输出目录越过允许根|符号链接/);
  assert.equal(fs.existsSync(path.join(outside, 'runtime-map.html')), false);
});

test('rejects interactive --open delivery in the YSS wrapper', () => {
  const root = repository();
  const directory = path.join(root, 'docs', 'architecture', 'diagrams', 'runtime-map');
  fs.mkdirSync(directory, { recursive: true });
  const input = path.join(directory, 'runtime-map.archify.json');
  const output = path.join(directory, 'runtime-map.html');
  fs.copyFileSync(example, input);
  const result = run(root, input, output, ['--open']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /不允许 --open/);
});

test('delivers a paired project artifact and an auditable receipt', () => {
  const root = repository();
  const directory = path.join(root, 'docs', 'architecture', 'diagrams', 'runtime-map');
  fs.mkdirSync(directory, { recursive: true });
  const input = path.join(directory, 'runtime-map.archify.json');
  const output = path.join(directory, 'runtime-map.html');
  fs.copyFileSync(example, input);
  const result = run(root, input, output);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(output, 'utf8').slice(0, 2048), /meta name="generator" content="archify 2\.16\.0"/);
  const receipt = JSON.parse(fs.readFileSync(path.join(directory, 'runtime-map.receipt.json'), 'utf8'));
  assert.equal(receipt.yssArchifyReceipt, true);
  assert.equal(receipt.archify.validation.checkCount, 9);
  assert.equal(receipt.archify.validation.warnings, 0);
});

test('uses the template-source evidence root for stable maintenance diagrams', () => {
  const root = repository('template-source');
  const directory = path.join(root, '.template-source', 'evidence', 'maintenance', 'diagrams', 'workflow-map');
  fs.mkdirSync(directory, { recursive: true });
  const input = path.join(directory, 'workflow-map.archify.json');
  const output = path.join(directory, 'workflow-map.html');
  fs.copyFileSync(example, input);
  const result = run(root, input, output);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(directory, 'workflow-map.receipt.json')));
});

test('YSS override disables the upstream update checker', () => {
  const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
  assert.match(skill, /Do not run `scripts\/check-update\.mjs`/);
  assert.match(skill, /yss-safe-deliver\.mjs/);
});
