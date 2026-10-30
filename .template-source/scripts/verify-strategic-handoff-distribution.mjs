#!/usr/bin/env node
// Check the current source and composed backend profile, not a released CLI bundle.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { composeProfileTree } from '../../scripts/lib/profile-tree.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const backend = composeProfileTree('backend', { root });
for (const profile of [root, backend]) {
  const skill = readFileSync(path.join(profile, '.agents/skills/handoff/SKILL.md'), 'utf8');
  assert.match(skill, /disable-model-invocation: true/);
  assert.match(skill, /PR\/MR/);
  for (const script of ['strategic-handoff', 'strategic-consumer-entry', 'verify-strategic-handoff-consumption']) {
    const result = spawnSync(process.execPath, [path.join(profile, 'scripts', script), 'verify'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, script);
    assert.match(result.stderr, /legacy-strategic-handoff-unsupported/);
  }
}
const orchestrator = readFileSync(path.join(backend, '.agents/skills/harness-orchestrator/SKILL.md'), 'utf8');
assert.match(orchestrator, /pull_request_ref/);
assert.match(orchestrator, /head/);
console.log('源码和 Backend 组合目录已核验手动交接入口及旧命令拒绝；未验证已安装 Bundle 或平台行为。');
