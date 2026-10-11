import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compactLegacyCoverage, expandLegacyCoverage } from '../scripts/lib/legacy-coverage.mjs';
import { loadVerificationProfiles } from '../scripts/lib/template-verification.mjs';

const EVIDENCE = '.template-source/process/template-verification-legacy.json';
const DEFAULTS = {
  owner: 'role.test-engineer',
  input_patterns: ['**'],
  depends_on: [],
  duration_ms: null,
  disposition: 'merge',
  audit_status: 'preserved',
  counterexample_ref: null,
  evidence_ref: EVIDENCE,
};
const GATES = { 'check.verification-a': 'G01', 'check.verification-b': 'G02' };

function config(rows) {
  return { legacy_coverage_defaults: structuredClone(DEFAULTS), legacy_coverage_gates: structuredClone(GATES), legacy_coverage: rows };
}

const row = (overrides = {}) => ({ old_id: 'legacy.000', check_id: 'check.x', group: 'g', gate: 'check.verification-a', command: 'node --test t', ...overrides });

test('展开：字段与字段顺序都与压缩前的写法一致（policy_digest 取决于 JSON.stringify 的顺序）', () => {
  const expanded = expandLegacyCoverage(config([row()])).legacy_coverage[0];
  assert.deepEqual(Object.keys(expanded), [
    'old_id', 'check_id', 'group', 'command', 'owner', 'replacement_gate', 'gate_ids', 'input_patterns', 'depends_on', 'duration_ms',
    'disposition', 'audit_status', 'equivalent_assertion', 'counterexample_ref', 'evidence_ref', 'display_gate',
  ]);
  assert.equal(expanded.replacement_gate, 'check.verification-a');
  assert.deepEqual(expanded.gate_ids, ['check.verification-a']);
  assert.equal(expanded.display_gate, 'G01');
  assert.deepEqual(expanded.equivalent_assertion, { status: 'preserved', source_ref: `${EVIDENCE}#legacy.000` });
});

test('展开：替代命令成对出现在 command 之后；gate_ids、source_ref、counterexample_ref 可逐条覆盖', () => {
  const rows = [row({
    replacement_command: 'node --test r', retirement_disposition: 'public-native-x', gate_ids: ['check.verification-a', 'check.verification-b'],
    source_ref: 'tests/x.test.mjs', counterexample_ref: 'tests/x.test.mjs',
  })];
  const expanded = expandLegacyCoverage(config(rows)).legacy_coverage[0];
  assert.deepEqual(Object.keys(expanded).slice(0, 6), ['old_id', 'check_id', 'group', 'command', 'replacement_command', 'retirement_disposition']);
  assert.deepEqual(expanded.gate_ids, ['check.verification-a', 'check.verification-b']);
  assert.equal(expanded.replacement_gate, 'check.verification-a', 'replacement_gate 仍取 gate，不取 gate_ids 的第一项');
  assert.equal(expanded.equivalent_assertion.source_ref, 'tests/x.test.mjs');
  assert.equal(expanded.counterexample_ref, 'tests/x.test.mjs');
});

test('展开：每条拿到的是独立副本，改一条不会牵连默认值或别的条目', () => {
  const expanded = expandLegacyCoverage(config([row(), row({ old_id: 'legacy.001' })]));
  expanded.legacy_coverage[0].input_patterns.push('x');
  assert.deepEqual(expanded.legacy_coverage[1].input_patterns, ['**']);
});

test('展开后移除辅助键；没有 legacy_coverage_defaults 的旧写法原样放行', () => {
  const expanded = expandLegacyCoverage(config([row()]));
  assert.equal('legacy_coverage_defaults' in expanded, false);
  assert.equal('legacy_coverage_gates' in expanded, false);
  const legacy = { legacy_coverage: [{ old_id: 'legacy.000', anything: 1 }] };
  assert.deepEqual(expandLegacyCoverage(structuredClone(legacy)), legacy);
});

test('压缩格式写错一律拒绝：未知字段、缺字段、未登记门禁、old_id 重复、成对字段缺一', () => {
  const cases = [
    ['行里有未知字段', config([row({ typo: 1 })]), /含未知字段 typo/],
    ['缺 command', config([row({ command: '' })]), /缺少 command/],
    ['缺 gate', config([row({ gate: undefined })]), /缺少 gate/],
    ['gate 没登记展示编号', config([row({ gate: 'check.verification-zzz' })]), /没有登记展示编号/],
    ['old_id 重复', config([row(), row()]), /old_id 重复/],
    ['replacement_command 缺 retirement_disposition', config([row({ replacement_command: 'x' })]), /必须同时出现/],
    ['gate_ids 为空', config([row({ gate_ids: [] })]), /gate_ids 无效/],
    ['defaults 缺字段', { ...config([row()]), legacy_coverage_defaults: { ...DEFAULTS, owner: undefined } }, /缺少 owner/],
    ['defaults 有未知字段', { ...config([row()]), legacy_coverage_defaults: { ...DEFAULTS, bogus: 1 } }, /含未知字段 bogus/],
    ['缺 gates 表', { ...config([row()]), legacy_coverage_gates: undefined }, /legacy_coverage_gates 必须是对象/],
  ];
  for (const [name, input, pattern] of cases) {
    for (const key of Object.keys(input)) if (input[key] === undefined) delete input[key];
    for (const item of input.legacy_coverage ?? []) for (const key of Object.keys(item)) if (item[key] === undefined) delete item[key];
    if (input.legacy_coverage_defaults) for (const key of Object.keys(input.legacy_coverage_defaults)) if (input.legacy_coverage_defaults[key] === undefined) delete input.legacy_coverage_defaults[key];
    assert.throws(() => expandLegacyCoverage(input), pattern, name);
  }
});

test('仓库里的 profile：展开后恰好 117 条，且内容与压缩前逐字节一致', () => {
  const loaded = loadVerificationProfiles();
  assert.equal(loaded.legacy_coverage.length, 117);
  // 冻结的旧检查覆盖清单：压缩前展开结果的 SHA-256。要改覆盖内容必须有意识地更新这个值
  const digest = createHash('sha256').update(JSON.stringify(loaded.legacy_coverage)).digest('hex');
  assert.equal(digest, '8fdcd99b97a508b39602fd0e0ec4048c9c9cbfdb84fc1444b316e3a9b5ea70c5');
  assert.equal('legacy_coverage_defaults' in loaded, false);
});

test('压缩再展开是恒等变换（用真实的 117 条验证）', () => {
  const expanded = loadVerificationProfiles().legacy_coverage;
  const { defaults, gates, rows } = compactLegacyCoverage(expanded);
  const again = expandLegacyCoverage({ legacy_coverage_defaults: defaults, legacy_coverage_gates: gates, legacy_coverage: rows }).legacy_coverage;
  assert.equal(JSON.stringify(again), JSON.stringify(expanded));
  const constantKeys = ['owner', 'input_patterns', 'depends_on', 'duration_ms', 'disposition', 'audit_status', 'evidence_ref'];
  assert.ok(rows.every((item) => constantKeys.every((key) => !(key in item))), '压缩后不再重复逐条相同的字段');
  assert.deepEqual(rows.filter((item) => 'counterexample_ref' in item).map((item) => item.old_id), ['legacy.012'], '只有真正不同的条目才带覆盖项');
});
