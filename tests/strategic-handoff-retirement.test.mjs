import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { inspectBackendDelivery, openBackendDelivery } from '../scripts/lib/backend-delivery.mjs';
import { verifyConsumption } from '../scripts/lib/strategic-handoff-consumption.mjs';

test('旧战略交接命令明确不支持，不改写已有记录', t => {
  const target = mkdtempSync(path.join(tmpdir(), 'historic-handoff-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const original = path.join(target, 'historic.json');
  writeFileSync(original, '{"approved":"original"}');
  for (const [script, args] of [
    ['scripts/strategic-handoff', ['verify', '--bundle', target]],
    ['scripts/strategic-handoff', ['import', '--bundle', target, '--target-root', target]],
    ['scripts/strategic-consumer-entry', ['--root', target, '--bundle', target]],
    ['scripts/verify-strategic-handoff-consumption', ['--root', target, original]],
    ['scripts/strategic-feedback', ['verify-feedback', '--root', target, original]]
  ]) {
    const result = spawnSync(process.execPath, [path.resolve(script), ...args], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, script);
    assert.match(result.stderr, /legacy-strategic-handoff-unsupported/, script);
    assert.equal(readFileSync(original, 'utf8'), '{"approved":"original"}');
    assert.deepEqual(readdirSync(target), ['historic.json']);
  }
});

test('旧外部后端验收明确不支持且不访问或改写历史材料', async t => {
  const target = mkdtempSync(path.join(tmpdir(), 'historic-backend-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const original = path.join(target, 'historic.json');
  writeFileSync(original, '{"approved":"original"}');
  await assert.rejects(() => inspectBackendDelivery(target, 'historic.json'), /legacy-strategic-handoff-unsupported/);
  await assert.rejects(() => openBackendDelivery(target, () => assert.fail('不得认证旧外部交付')), /legacy-strategic-handoff-unsupported/);
  assert.equal(readFileSync(original, 'utf8'), '{"approved":"original"}');
  assert.deepEqual(readdirSync(target), ['historic.json']);
});

test('旧战略消费绑定不被识别为已验证', async () => {
  await assert.rejects(() => verifyConsumption({ strategic_handoff: {} }), /legacy-strategic-handoff-unsupported/);
});

test('旧战略工作单元的进入和退出都明确阻断', async () => {
  const { validateNextRoute } = await import('../scripts/lib/lifecycle-transition.mjs');
  for (const [current, next] of [
    ['work-unit.business-ticket-formalization', 'work-unit.strategic-design-handoff'],
    ['work-unit.strategic-design-handoff', 'work-unit.technical-analysis']
  ]) {
    const result = validateNextRoute(current, next, {});
    assert.equal(result.result, 'blocked');
    assert.ok(result.blocking_signals.includes('legacy-strategic-handoff-unsupported'));
  }
});

test('旧战略库写入口拒绝导出、打包和导入', async t => {
  const target = mkdtempSync(path.join(tmpdir(), 'historic-library-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const { exportBundle, finalizeDelivery, importBundle } = await import('../scripts/lib/strategic-handoff.mjs');
  for (const invoke of [() => exportBundle({sourceRoot: target, handoffRef: 'old.yaml', output: path.join(target, 'out')}),
    () => finalizeDelivery({sourceRoot: target, handoffRef: 'old.yaml'}),
    () => importBundle({bundle: path.join(target, 'old'), targetRoot: target})]) {
    await assert.rejects(invoke, /legacy-strategic-handoff-unsupported/);
    assert.deepEqual(readdirSync(target), []);
  }
});

test('Spec 的两种初始安装均直接提供手动 handoff', () => {
  const policy = JSON.parse(readFileSync('.template-source/distribution/bundle-profile.json', 'utf8'));
  for (const mode of ['skills', 'governed']) {
    assert.ok(policy.installations[mode].skills.includes('handoff'), mode);
  }
  const skill = readFileSync('.agents/skills/handoff/SKILL.md', 'utf8');
  const metadata = readFileSync('.agents/skills/handoff/agents/openai.yaml', 'utf8');
  assert.match(skill, /disable-model-invocation: true/);
  assert.match(metadata, /allow_implicit_invocation: false/);
});

test('Backend 的独立技能安装提供手动 handoff', () => {
  const policy = JSON.parse(readFileSync('profiles/backend/.template-source/distribution/bundle-profile.json', 'utf8'));
  assert.ok(policy.installations.skills.skills.includes('handoff'));
});

test('手动 handoff 不再携带旧战略交接依赖闭包', () => {
  for (const ref of ['.template-source/distribution/bundle-profile.json', 'profiles/backend/.template-source/distribution/bundle-profile.json']) {
    const policy = JSON.parse(readFileSync(ref, 'utf8'));
    assert.equal(Object.hasOwn(policy.installations.skills.skillReferenceGroups || {}, 'handoff'), false, ref);
    assert.equal(Object.hasOwn(policy.installations.skills.skillReferences || {}, 'handoff'), false, ref);
  }
});
