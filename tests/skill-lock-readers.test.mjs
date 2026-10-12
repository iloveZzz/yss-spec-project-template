// 根锁不再记录本地技能的树哈希（architecture-iteration-v1 FR-005）：读取方对「没有 effectiveHash 的模板锁」放行，
// 对「带 effectiveHash 的实例锁」仍按实际技能树严格比较。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inspectWorkUnitSkills } from '../scripts/lib/lifecycle-context-query.mjs';
import { lockedTreeHashMatches, treeHash } from '../scripts/lib/skill-supply-chain.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('提交的根锁没有任何 effectiveHash', () => {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills-lock.json'), 'utf8'));
  const entries = [...Object.values(lock.skills.shared), ...Object.values(lock.skills.platform).flatMap((group) => Object.values(group))];
  assert.ok(entries.length > 0);
  assert.deepEqual(entries.filter((entry) => 'effectiveHash' in entry), []);
});

test('锁里没有 effectiveHash 时不比较，有时必须相等', () => {
  assert.equal(lockedTreeHashMatches({}, 'abc'), true);
  assert.equal(lockedTreeHashMatches({ effectiveHash: 'abc' }, 'abc'), true);
  assert.equal(lockedTreeHashMatches({ effectiveHash: 'abc' }, 'def'), false);
});

test('技能就绪检查：模板锁无哈希放行，实例锁哈希不符仍判漂移，未登记仍拒绝', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-lock-readers-'));
  try {
    const source = path.join(root, '.agents/skills/main');
    const projection = path.join(root, '.codex/skills/main');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'SKILL.md'), '---\nname: main\n---\nFixture\n');
    fs.mkdirSync(path.dirname(projection), { recursive: true });
    fs.cpSync(source, projection, { recursive: true });
    const registry = { agent_runtime_roots: { codex: '.codex/skills' }, skills: [{ id: 'main', maturity: 'supported', aliases: [] }], external_skills: [], skill_dependencies: {} };
    const route = { primary_skill: 'main' };
    const metadata = { metadataSchemaVersion: 3, templateName: 'create-yss-spec', distribution: { mode: 'selected', runtimes: ['codex'], installedSkills: ['main'] }, managedFiles: {} };
    fs.writeFileSync(path.join(root, '.yss-template.json'), JSON.stringify(metadata));
    const writeLock = (shared) => fs.writeFileSync(path.join(root, 'skills-lock.json'), JSON.stringify({ version: 3, projectionRoots: ['.codex/skills'], skills: { shared } }));
    const codes = () => inspectWorkUnitSkills({ root, registry, route }).issues.map((issue) => issue.code);
    const targets = ['.agents/skills', '.codex/skills'];

    writeLock({ main: { targets } });
    assert.deepEqual(codes(), []);
    writeLock({ main: { targets, effectiveHash: treeHash(source) } });
    assert.deepEqual(codes(), []);
    writeLock({ main: { targets, effectiveHash: '0'.repeat(64) } });
    assert.ok(codes().includes('skill-hash-drift'));
    writeLock({});
    assert.ok(codes().includes('skill-path-conflict'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('技能就绪检查：没有任何运行时登记时不要求 --agent-runtime', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-lock-readers-'));
  try {
    const source = path.join(root, '.agents/skills/main');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'SKILL.md'), '---\nname: main\n---\nFixture\n');
    const registry = { agent_runtime_roots: {}, skills: [{ id: 'main', maturity: 'supported', aliases: [] }], external_skills: [], skill_dependencies: {} };
    const route = { primary_skill: 'main' };
    const metadata = (runtimes) => ({ metadataSchemaVersion: 3, templateName: 'create-yss-spec', distribution: { mode: 'selected', runtimes, installedSkills: ['main'] }, managedFiles: {} });
    const write = (runtimes) => {
      fs.writeFileSync(path.join(root, '.yss-template.json'), JSON.stringify(metadata(runtimes)));
      fs.writeFileSync(path.join(root, 'skills-lock.json'), JSON.stringify({ version: 3, projectionRoots: [], skills: { shared: { main: { targets: ['.agents/skills'] } } } }));
    };
    write([]);
    assert.deepEqual(inspectWorkUnitSkills({ root, registry, route }).issues.map((issue) => issue.code), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
