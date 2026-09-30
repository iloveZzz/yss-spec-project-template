import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from '../scripts/vendor/yaml.mjs';

const baseline = parse(fs.readFileSync('.template-spec/process/templates/lifecycle-checkpoint-template.yaml', 'utf8'));
test('checkpoint CLI 拒绝缺失交接依据，历史只读不作为当前验证', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-boundary-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const run = (value, args = []) => {
    const file = path.join(dir, 'checkpoint.json');
    fs.writeFileSync(file, JSON.stringify(value));
    return spawnSync(process.execPath, ['scripts/verify-lifecycle-checkpoint', ...args, file], { encoding: 'utf8' });
  };
  assert.equal(run(baseline).status, 0);
  for (const boundary of [{decision:'handoff'}, {decision:'unknown',reason:'test'}, {decision:'handoff',reason:'test',source_ref:'missing-source.md',destination_ref:'missing-target.md'}, {decision:'handoff',reason:'test',source_ref:'../CONTEXT.md',destination_ref:'CONTEXT.md'}, {decision:'subagent',reason:'test'}, {decision:'compact',reason:'test',next_phase:'stage.unknown'}]) {
    assert.notEqual(run({...baseline,phase_boundary:boundary}).status, 0, JSON.stringify(boundary));
  }
  assert.notEqual(run({...baseline,stage_trace:{}}).status,0);
  const legacy=run({...baseline,phase_boundary:{decision:'handoff'},stage_trace:{}},['--history']);
  assert.equal(legacy.status,0,legacy.stderr);
  assert.match(legacy.stdout,/历史.*不.*(批准|流转)/);
  assert.equal(run({...baseline,phase_boundary:{decision:'handoff',reason:'当前本地交接证据',source_ref:'CONTEXT.md',destination_ref:'AGENTS.md'}}).status,0);
});
