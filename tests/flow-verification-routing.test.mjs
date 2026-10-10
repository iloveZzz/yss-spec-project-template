import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planTemplateVerification } from '../scripts/lib/template-verification.mjs';

test('Plan/Spec、编排与 checkpoint 变更选择实际行为检查', () => {
  for (const profile of ['fast', 'candidate']) {
    for (const file of ['.template-spec/templates/spec-template.md', '.template-spec/plan/templates/plan-template.md', '.template-spec/process/plan-spec-quality.md', '.template-spec/templates/examples/plan-spec/ordinary-valid.md']) {
      const plan = planTemplateVerification({ profile, changedFiles: [file] });
      assert.ok(plan.groups.includes('plan-spec-content'), `${profile}: ${file}`);
    }
    for (const file of ['.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml', '.template-spec/process/schemas/lifecycle-checkpoint.schema.json', 'scripts/verify-lifecycle-checkpoint']) {
      const plan = planTemplateVerification({ profile, changedFiles: [file] });
      assert.ok(plan.groups.includes('lifecycle'), `${profile}: ${file}`);
      assert.ok(plan.commands.some(x => x.command.includes('checkpoint-boundary.test.mjs')));
    }
  }
  const combined = planTemplateVerification({ changedFiles: ['.template-spec/templates/spec-template.md', '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'] });
  assert.ok(combined.groups.includes('plan-spec-content') && combined.groups.includes('skills') && combined.groups.includes('lifecycle'));
  assert.throws(() => planTemplateVerification({ changedFiles: ['unmapped-file.xyz'] }), /UNKNOWN_VERIFICATION_PATH/);
  assert.equal(planTemplateVerification({ changedFiles: ['scripts/run-template-verification'] }).effective_profile, 'fast');
});

test('大验证计划经管道与文件输出均完整且内容相同', t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'flow-plan-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const reportDir = path.join(dir, 'planned-report');
  const args = ['scripts/run-template-verification', '--profile', 'fast', '--changed-file', 'AGENTS.md', '--plan', '--json', '--report-dir', reportDir];
  const fd = openSync(path.join(dir, 'plan.json'), 'wx');
  const file = spawnSync(process.execPath, args, { stdio: ['ignore', fd, 'pipe'] });
  closeSync(fd);
  assert.equal(file.status, 0);
  const expected = JSON.parse(readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  for (let i = 0; i < 3; i++) {
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), expected);
  }
  assert.equal(existsSync(reportDir), false, '只读计划不能创建报告目录');
});

test('输出失败不返回成功',t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'flow-output-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  // An intentionally read-only descriptor reliably exercises write failure on macOS and Linux.
  const fd=openSync('yss-project.yaml','r');
  try {
    const r=spawnSync(process.execPath,['scripts/run-template-verification','--profile','fast','--changed-file','AGENTS.md','--plan','--json'],{stdio:['ignore',fd,'pipe'],encoding:'utf8'});
    assert.notEqual(r.status,0);assert.match(r.stderr,/输出|EBADF|write/i);
  }finally{closeSync(fd);}
});

test('tooling 模式显式可选，串行限制传播且 release 强制 legacy', () => {
  const plan = (file, mode, concurrency = '4', profile='fast') => {
    const r = spawnSync(process.execPath, ['scripts/run-template-verification', '--plan', '--json', '--changed-file', file,
      '--tooling-mode', mode, '--concurrency', concurrency,'--profile',profile,'--selection','legacy'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout);
  };
  assert.equal(plan('.template-source/tooling/node/test/plugin-project.test.mjs', 'optimized').tooling.effective_mode, 'optimized');
  assert.equal(plan('.template-source/tooling/node/test/plugin-project.test.mjs', 'optimized', '1').tooling.test_concurrency, 1);
  assert.equal(plan('scripts/lib/json-schema.mjs', 'optimized').tooling.effective_mode, 'optimized');
  assert.equal(plan('scripts/lib/json-schema.mjs', 'optimized', '4','release').tooling.verification_concurrency, 1);
  assert.equal(plan('scripts/lib/json-schema.mjs', 'optimized','4','release').tooling.effective_mode, 'legacy');
  const bad = spawnSync(process.execPath, ['scripts/run-template-verification', '--plan', '--tooling-mode', 'unknown'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
});
