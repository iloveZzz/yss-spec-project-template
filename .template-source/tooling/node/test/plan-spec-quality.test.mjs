import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, cp, rm, symlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { inspectPlanSpec } from '../../../../scripts/lib/plan-spec-quality.mjs';
const root = path.resolve(import.meta.dirname, '../../../..');
const fixturePath = '.template-spec/templates/examples/plan-spec';
const manifest = JSON.parse(await readFile(path.join(root, fixturePath, 'expectations.json'), 'utf8'));
const sample = name => `${fixturePath}/${name}`;
const cli = (project, args) => spawnSync(process.execPath, [path.join(project, 'scripts/inspect-plan-spec'), ...args, '--root', project, '--json'], { encoding: 'utf8' });
const codes = result => result.report.findings.map(item => item.code);
async function temporary(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'plan-spec-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, fixturePath), { recursive: true });
  await cp(path.join(root, fixturePath), path.join(directory, fixturePath), { recursive: true });
  return directory;
}
async function modified(t, name, replace, options = {}) {
  const project = await temporary(t), spec = sample(name);
  await writeFile(path.join(project, spec), replace(await readFile(path.join(project, spec), 'utf8')));
  return { project, spec, result: await inspectPlanSpec({ command: 'check', root: project, spec, ...options }) };
}
for (const family of manifest.families) {
  test(`${family.id}: 完整样本及预登记反例`, async () => {
    const good = await inspectPlanSpec({ root, command: 'check', spec: sample(family.valid) });
    assert.equal(good.exitCode, 0); assert.deepEqual(good.report.findings, []);
    const bad = await inspectPlanSpec({ root, command: 'check', spec: sample(family.defective) });
    assert.equal(bad.exitCode, family.defective_exit_code);
    for (const expected of family.expected_defect_codes) assert.ok(codes(bad).includes(expected), expected);
    for (const finding of bad.report.findings) { assert.ok(finding.location.line > 0); assert.ok(finding.recovery); }
  });
}
test('只读、确定性、报告绑定所有输入摘要；不写批准状态', async t => {
  const project = await temporary(t), spec = sample('ordinary-valid.md');
  const before = await readFile(path.join(project, spec));
  const a = await inspectPlanSpec({ root: project, command: 'check', spec });
  const b = await inspectPlanSpec({ root: project, command: 'check', spec });
  assert.deepEqual(a, b); assert.deepEqual(await readFile(path.join(project, spec)), before);
  assert.equal(a.report.inputs.length, 2); assert.ok(a.report.inputs.every(x => /^sha256:[a-f0-9]{64}$/.test(x.sha256)));
  assert.equal(a.report.diagnostic_only, true); assert.equal(a.report.approved, undefined);
  assert.deepEqual((await readdir(project)).sort(), ['.template-spec']);
});
test('计划未知目标合法；引用权威 statement 不另造合同字段', async t => {
  const good = await inspectPlanSpec({ root, command: 'check', plan: sample('ordinary-plan.md') });
  assert.equal(good.exitCode, 0); assert.deepEqual(good.report.findings, []);
  const project = await temporary(t);
  await writeFile(path.join(project, 'decision.yaml'), 'success_criteria:\n  - id: success-criterion.attachments\n    statement: "候选目标未知；待观察后确认，负责人产品，冻结前补齐。"\n');
  await writeFile(path.join(project, 'plan.md'), '---\ncontent_profile: plan-spec-v1\n---\n\n## 成功标准\n\n| ID | 权威引用 |\n|---|---|\n| success-criterion.attachments | decision.yaml :: id:success-criterion.attachments |\n');
  const result = await inspectPlanSpec({ root: project, command: 'check', plan: 'plan.md' });
  assert.deepEqual(result.report.findings, []);
  assert.ok(result.report.unevaluated.some(x => x.code === 'STATEMENT_MANUAL_REVIEW'));
});
test('验收允许显式待补 Q；不宣称已覆盖', async t => {
  const { result } = await modified(t, 'ordinary-valid.md', s => s.replace('| AC-002 | 无 |', '| 待补 Q-001 | Q-001 |').replace(/^\| AC-002 \| FR-003.*\n/m, ''));
  assert.ok(!codes(result).includes('AC_MISSING'));
  assert.ok(result.report.unevaluated.some(x => x.code === 'AC_DEFERRED'));
});
test('GFM 中文表头、转义竖线、行内代码与 Markdown 来源链接', async t => {
  const { result } = await modified(t, 'ordinary-valid.md', s => s.replace('一次列出全部缺失附件名称', '显示 `x\\|y` 并一次列出全部缺失附件名称').replaceAll(`${fixturePath}/ordinary-source.md :: id:S1`, `[S1](${fixturePath}/ordinary-source.md)`));
  assert.equal(result.exitCode, 0); assert.deepEqual(result.report.findings, []);
});
test('代码块、引用块与标注示例中的 ID 不混入正式需求', async t => {
  const { result } = await modified(t, 'ordinary-valid.md', s => s + '\n```markdown\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-001 | fake |\n```\n\n> | ID | 需求 |\n> |---|---|\n> | FR-001 | fake |\n\n## 示例\n\n### 功能需求\n\n| ID | 需求 |\n|---|---|\n| FR-001 | fake |\n');
  assert.deepEqual(result.report.findings, []); assert.equal(result.report.scope.documents[0].extracted_items, 6);
});
test('旧格式仅尽力识别；无发现不等于合格', async t => {
  const { result } = await modified(t, 'ordinary-valid.md', () => '# 老 Spec\n\n## 功能需求\n\n| ID | 需求 |\n|---|---|\n| FR-001 | 未结构化输入 |\n\n## 验收标准\n\n人工检查。\n');
  assert.equal(result.exitCode, 0); assert.deepEqual(result.report.findings, []);
  assert.equal(result.report.unevaluated[0].code, 'LEGACY_OR_UNKNOWN_PROFILE');
});
test('新格式不能默默跳过没有 ID 表的章节', async t => {
  const { result } = await modified(t, 'ordinary-valid.md', s => s.replace('| ID | 需求 | 优先级 |', '| 编号 | 需求 | 优先级 |'));
  assert.ok(codes(result).includes('SECTION_UNPARSED'));
  assert.ok(result.report.unevaluated.some(x => x.code === 'SECTION_UNPARSED'));
});
test('frontmatter 重复键、未闭合或解析失败退出 2', async t => {
  for (const header of ['---\ncontent_profile: plan-spec-v1\ncontent_profile: x\n---\n', '---\ncontent_profile: plan-spec-v1\n']) {
    const { result } = await modified(t, 'ordinary-valid.md', () => header);
    assert.equal(result.exitCode, 2); assert.ok(codes(result).includes('PARSE_ERROR'));
  }
});
test('本地准确章节定位；不存在的伪锚点不能通过', async t => {
  const { project, spec, result } = await modified(t, 'ordinary-valid.md', s => s.replaceAll(':: id:S1', ':: heading:业务输入'));
  assert.deepEqual(result.report.findings, []);
  const text = await readFile(path.join(project, spec), 'utf8');
  await writeFile(path.join(project, spec), text.replace('heading:业务输入', 'heading:虚构锚点'));
  const bad = await inspectPlanSpec({ root: project, command: 'check', spec });
  assert.ok(codes(bad).includes('SOURCE_LOCATOR'));
});
test('外部 URL 保留未评估，不联网猜关联', async t => {
  const { result } = await modified(t, 'ordinary-valid.md', s => s.replaceAll(`${fixturePath}/ordinary-source.md :: id:S1`, 'https://example.invalid/input :: id:S1'));
  assert.equal(result.exitCode, 0); assert.ok(result.report.unevaluated.some(x => x.code === 'EXTERNAL_SOURCE'));
});
test('符号链接越界及越界路径不可被隐式读取', async t => {
  const project = await temporary(t);
  await symlink('/etc/hosts', path.join(project, 'outside.md'));
  for (const spec of ['outside.md', '../outside.md']) { const r = await inspectPlanSpec({ root: project, command: 'check', spec }); assert.equal(r.exitCode, 2); assert.ok(codes(r).includes('INPUT_UNREADABLE')); }
});
test('源文档及其来源读取期间漂移均退出 2', async t => {
  for (const name of ['ordinary-valid.md', 'ordinary-source.md']) {
    const project = await temporary(t), file = path.join(project, sample(name));
    const r = await inspectPlanSpec({ root: project, command: 'check', spec: sample('ordinary-valid.md') }, { beforeFreshnessCheck: async () => writeFile(file, (await readFile(file, 'utf8')) + '\nchanged\n') });
    assert.equal(r.exitCode, 2); assert.ok(codes(r).includes('INPUT_DRIFT'));
  }
});
test('diff 按 ID 增删改和引用变化；原始字节可精确重建新输入', async t => {
  const project = await temporary(t), before = sample('high-risk-before.md'), after = sample('high-risk-valid.md');
  const r = await inspectPlanSpec({ root: project, command: 'diff', before, after });
  assert.equal(r.exitCode, 0); assert.equal(r.report.diff.status, 'compared');
  assert.ok(r.report.diff.entries.some(x => x.id === 'FR-002' && x.change === 'added'));
  const bytes = await readFile(path.join(project, before)), raw = r.report.diff.raw_difference;
  const restored = Buffer.concat([bytes.subarray(0, raw.common_prefix_bytes), Buffer.from(raw.added, 'base64'), bytes.subarray(bytes.length - raw.common_suffix_bytes)]);
  assert.deepEqual(restored, await readFile(path.join(project, after)));
  const reverse = await inspectPlanSpec({ root: project, command: 'diff', before: after, after: before });
  assert.ok(reverse.report.diff.entries.some(x => x.id === 'FR-002' && x.change === 'removed'));
});
test('重排保留 ID；链接目标变化不被标签文本掩盖', async t => {
  const project = await temporary(t), before = sample('ordinary-valid.md');
  const source = await readFile(path.join(project, before), 'utf8');
  const rows = source.match(/^\| FR-00[123] \|.*$/gm);
  const reordered = source.replace(rows.join('\n'), [...rows].reverse().join('\n'));
  await writeFile(path.join(project, 'after.md'), reordered);
  const a = await inspectPlanSpec({ root: project, command: 'diff', before, after: 'after.md' });
  assert.deepEqual(a.report.diff.entries, []); assert.notEqual(a.report.diff.raw_difference.added, '');
  await writeFile(path.join(project, 'before.md'), source.replace(`${fixturePath}/ordinary-source.md :: id:S1`, '[S1](before-source.md)'));
  await writeFile(path.join(project, 'after.md'), source.replace(`${fixturePath}/ordinary-source.md :: id:S1`, '[S1](after-source.md)'));
  const b = await inspectPlanSpec({ root: project, command: 'diff', before: 'before.md', after: 'after.md' });
  assert.ok(b.report.diff.entries[0].reference_changes.includes('来源引用'));
});
test('没有旧基线时明确无法比较，不能伪造空基线', async t => {
  const project = await temporary(t);
  const r = await inspectPlanSpec({ root: project, command: 'diff', before: 'missing.md', after: sample('ordinary-valid.md') });
  assert.equal(r.exitCode, 2); assert.equal(r.report.diff.status, '无法比较旧内容'); assert.equal(r.report.diff.raw_difference, null);
});
test('Slice 追溯消费现有 acceptance/source/locator 和 verification 引用，不执行命令', async t => {
  const project = await temporary(t), spec = sample('ordinary-valid.md');
  await writeFile(path.join(project, 'slice.yaml'), `schema_version: 3\nacceptance:\n  acceptance.missing:\n    source: ${spec}\n    locator: AC-001\nverification:\n  verify.missing:\n    acceptance_refs: [acceptance.missing]\n    command: touch NEVER_EXECUTE\n    expected_evidence: reports/check.txt\nwork_units:\n  work.missing:\n    acceptance_refs: [acceptance.missing]\n`);
  const r = await inspectPlanSpec({ root: project, command: 'check', spec, slices: ['slice.yaml'] });
  assert.equal(r.report.trace.links.length, 1); assert.deepEqual(r.report.trace.links[0].requirements, ['FR-001', 'FR-002']);
  assert.equal(r.report.trace.links[0].verification[0].id, 'verify.missing');
  assert.ok(r.report.trace.gaps.some(x => x.requirement === 'FR-003')); assert.ok(!(await readdir(project)).includes('NEVER_EXECUTE'));
});
test('离线副本无 node_modules 可运行，stdout JSON 与退出码稳定', async t => {
  const project = await temporary(t);
  for (const relative of ['scripts/inspect-plan-spec','scripts/lib/plan-spec-quality.mjs','scripts/lib/plan-spec-markdown.mjs','scripts/vendor/markdown.mjs','scripts/vendor/yaml.mjs']) { await mkdir(path.dirname(path.join(project, relative)), { recursive: true }); await cp(path.join(root, relative), path.join(project, relative)); }
  const good = cli(project, ['check', '--spec', sample('complex-defective.md')]);
  assert.equal(good.status, 0); assert.equal(good.stderr, ''); assert.ok(JSON.parse(good.stdout).findings.length > 0);
  const bad = cli(project, ['check']); assert.equal(bad.status, 2); assert.equal(JSON.parse(bad.stdout).execution, 'incomplete');
  const invalid = cli(project, ['diff', '--spec', 'anything.md']); assert.equal(invalid.status, 2); assert.equal(JSON.parse(invalid.stdout).findings[0].code, 'INPUT_ARGUMENT');
});
test('模板其他条件项也需不适用原因，示例行保持排除', async t => {
  const { result } = await modified(t, 'ordinary-valid.md', s => s + '\n## 业务边界与规则影响判断\n\n| 检查项 | 说明 |\n|---|---|\n| UI 影响 | not-applicable |\n');
  assert.ok(codes(result).includes('NA_REASON'));
});
test('轻量 Plan 基线未知也必须给出补齐项', async t => {
  const project = await temporary(t), plan = sample('ordinary-plan.md');
  const text = await readFile(path.join(project, plan), 'utf8');
  await writeFile(path.join(project, plan), text.replace('| 未知 | 候选 |', '| 全部缺失项可见 | 已确认 |').replace('| Q-001 |\n', '| 无 |\n'));
  const result = await inspectPlanSpec({ root: project, command: 'check', plan });
  assert.ok(codes(result).includes('UNKNOWN_BASELINE'));
});
test('diff 对无法提取的章节明确未评估，不把解析缺口当作删除', async t => {
  const project = await temporary(t), before = sample('ordinary-valid.md');
  const source = await readFile(path.join(project, before), 'utf8');
  for (const text of [source.replace('| ID | 需求 | 优先级 |', '| 编号 | 需求 | 优先级 |'), source.replace('## 验收标准', '## 验收说明')]) {
    await writeFile(path.join(project, 'after.md'), text);
    const result = await inspectPlanSpec({ root: project, command: 'diff', before, after: 'after.md' });
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.diff.status, 'partially-compared');
    assert.equal(result.report.scope.documents.length, 2);
    assert.ok(result.report.unevaluated.some(x => x.code === 'PARTIAL_DIFF'));
    assert.ok(result.report.unevaluated.some(x => ['SECTION_UNPARSED', 'SECTION_MISSING'].includes(x.code)));
    assert.ok(!result.report.diff.entries.some(x => x.change === 'removed'));
    const bytes = await readFile(path.join(project, before)), raw = result.report.diff.raw_difference;
    const restored = Buffer.concat([bytes.subarray(0, raw.common_prefix_bytes), Buffer.from(raw.added, 'base64'), bytes.subarray(bytes.length - raw.common_suffix_bytes)]);
    assert.deepEqual(restored, Buffer.from(text));
  }
  await writeFile(path.join(project, 'after.md'), source.replace('content_profile: plan-spec-v1', 'content_profile: unknown').replace('| ID | 需求 | 优先级 |', '| 编号 | 需求 | 优先级 |'));
  const legacy = await inspectPlanSpec({ root: project, command: 'diff', before, after: 'after.md' });
  assert.equal(legacy.report.diff.status, 'partially-compared');
  assert.ok(!legacy.report.diff.entries.some(x => x.change === 'removed'));
});
test('Slice YAML 解析失败退出 2；有效但不支持的 schema 单独未评估', async t => {
  const project = await temporary(t), spec = sample('ordinary-valid.md');
  await writeFile(path.join(project, 'slice.yaml'), 'schema_version: 3\nacceptance: [\n');
  const malformed = await inspectPlanSpec({ root: project, command: 'check', spec, slices: ['slice.yaml'] });
  assert.equal(malformed.exitCode, 2);
  assert.ok(codes(malformed).includes('PARSE_ERROR'));
  assert.ok(malformed.report.inputs.some(x => x.file === 'slice.yaml'));
  await writeFile(path.join(project, 'slice.yaml'), 'schema_version: 2\nacceptance: {}\n');
  const unsupported = await inspectPlanSpec({ root: project, command: 'check', spec, slices: ['slice.yaml'] });
  assert.equal(unsupported.exitCode, 0);
  assert.ok(unsupported.report.unevaluated.some(x => x.code === 'SLICE_UNSUPPORTED'));
});
