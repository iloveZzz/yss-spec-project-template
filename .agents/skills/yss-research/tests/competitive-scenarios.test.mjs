import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { competitiveVerificationFiles, validateCompetitiveAnalysis } from '../scripts/lib/competitive-analysis.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validator = path.join(skillRoot, 'scripts/validate-research-package.mjs');
const renderer = path.join(skillRoot, 'scripts/render-competitive-outputs.mjs');
const repoRoot = path.resolve(skillRoot, '../../..');
const headings = ['Research Scope', 'Executive Read', 'Findings', 'Counter-Signals', 'Source Map', 'Decision Handoff', 'Evidence Limitations'];

test('竞品扩展的非法状态必须由完整 Schema 拒绝', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'yss-competitive-'));
  try {
    const data = JSON.parse(readFileSync(path.join(skillRoot, 'assets/evidence-template.yaml'), 'utf8'));
    data.competitive_analysis = { schema_version: 1, output_selection: 'matrix', as_of: '2026-10-02', comparison_scope: '固定产品资料', competitors: [{ id: 'alpha', name: 'Alpha', type: 'direct', product: 'Alpha', version: '1', edition: 'Pro', region: 'CN' }], capabilities: [{ id: 'export', module: '数据', name: '导出', definition: '用户导出 CSV', user_value: '复用数据' }], assessments: [{ competitor_id: 'alpha', capability_id: 'export', status: 'invented', claim_refs: ['claim-001'], limitations: [], gap: null }], artifacts: { matrix: 'sample-competitive-matrix.md' } };
    const brief = path.join(directory, 'sample-research-brief.md');
    const evidence = path.join(directory, 'sample-evidence.yaml');
    writeFileSync(brief, `${headings.map(heading => `## ${heading}`).join('\n\n')}\nclaim-001\n`);
    writeFileSync(evidence, JSON.stringify(data));
    const result = spawnSync(process.execPath, [validator, brief, evidence], { encoding: 'utf8' });
    assert.equal(result.status, 1, `非法竞品状态被接受：${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /competitive_analysis.*status|assessments.*status/s);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function payload(selection = 'both') {
  const data = JSON.parse(readFileSync(path.join(skillRoot, 'assets/evidence-template.yaml'), 'utf8'));
  data.scope.topic = '固定资料 CSV 导出比较';
  data.scope.audience = '产品规划负责人';
  data.scope.time_horizon = '2026-10-02 截至资料';
  data.scope.research_questions = ['哪些产品在本次版本、套餐与地区内支持 CSV 导出？'];
  data.scope.inclusion_criteria = ['固定的一手产品说明'];
  data.scope.exclusion_criteria = ['无日期的转载'];
  data.ownership.downstream_owner = 'yss-stage-decision';
  data.search_log[0] = { id: 'search-001', channel: 'fixture-docs', query_or_corpus: 'Alpha 产品说明', searched_at: '2026-10-02', result: 'results-found' };
  data.search_log[1] = { id: 'search-002', channel: 'fixture-docs', query_or_corpus: 'Alpha 导出限制与 Beta 导出说明', searched_at: '2026-10-02', result: 'none-found' };
  data.evidence_items[0] = { id: 'evidence-001', source_level: 'primary', visibility: 'internal', source_class: 'official-docs', source_ref: 'fixture://alpha/v1/pro/cn', locator: 'section CSV', stance: 'support', observed_at: '2026-10-02', evidence_date: '2026-10-01', observation: 'Alpha v1 Pro CN supports CSV export.', limitations: ['固定资料不代表其他版本、套餐或地区'] };
  data.claims[0].claim_kind = 'business-constraint';
  data.claims[0].statement = 'Alpha v1 Pro CN 支持 CSV 导出。';
  data.competitive_analysis = {
    schema_version: 1, output_selection: selection, as_of: '2026-10-02', comparison_scope: 'Alpha 与 Beta，v1 Pro CN，CSV 导出；仅固定资料',
    competitors: [{ id: 'alpha', name: 'Alpha', type: 'direct', product: 'Alpha', version: '1', edition: 'Pro', region: 'CN' }, { id: 'beta', name: 'Beta', type: 'adjacent', product: 'Beta', version: '1', edition: 'Pro', region: 'CN' }],
    capabilities: [{ id: 'csv-export', module: '数据', name: 'CSV 导出', definition: '用户将所选数据导出为 CSV 文件', user_value: '在下游工具中复用数据' }],
    assessments: [{ competitor_id: 'alpha', capability_id: 'csv-export', status: 'supported', claim_refs: ['claim-001'], limitations: ['仅固定资料中的 v1 Pro CN'], gap: null }, { competitor_id: 'beta', capability_id: 'csv-export', status: 'unknown', claim_refs: [], limitations: [], gap: { reason: 'Beta 的导出说明不可获得', next_step: '获取 Beta v1 Pro CN 官方功能说明后重验' } }],
    artifacts: { ...(selection !== 'report' ? { matrix: 'sample-competitive-matrix.md' } : {}), ...(selection !== 'matrix' ? { report: 'sample-competitive-analysis.md' } : {}) }
  };
  return data;
}
function fixture(t, data = payload()) {
  const directory = mkdtempSync(path.join(tmpdir(), 'yss-competitive-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const brief = path.join(directory, 'sample-research-brief.md');
  const evidence = path.join(directory, 'sample-evidence.yaml');
  writeFileSync(brief, `${headings.map(heading => `## ${heading}`).join('\n\n')}\n${data.claims.map(claim => claim.id).join(' ')}\n`);
  writeFileSync(evidence, JSON.stringify(data, null, 2));
  return { directory, brief, evidence, data };
}
function execute(file, args, status = 0, expected = '') {
  const result = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });
  assert.equal(result.status, status, `${result.stdout}${result.stderr}`);
  if (expected) assert.match(`${result.stdout}${result.stderr}`, expected);
  return result;
}
function reject(data, evidence, expected) {
  assert.throws(() => validateCompetitiveAnalysis(data, evidence, { checkArtifacts: false }), expected);
}

test('旧无扩展研究入口保留两参数，独立副本无需加载新库', t => {
  const data = payload();
  delete data.competitive_analysis;
  const f = fixture(t, data);
  const isolated = path.join(f.directory, 'validator.mjs');
  copyFileSync(validator, isolated);
  execute(isolated, [f.brief, f.evidence], 0, /research package valid/);
  assert.deepEqual(competitiveVerificationFiles(f.evidence), []);
  execute(path.join(skillRoot, 'tests/run-scenarios.mjs'), [], 0, /scenarios passed \(8\)/);
});

for (const selection of ['matrix', 'report', 'both']) test(`${selection} 输出生成后通过研究包校验`, t => {
  const f = fixture(t, payload(selection));
  execute(renderer, [f.evidence], 0, /outputs rendered/);
  execute(validator, [f.brief, f.evidence], 0, /research package valid/);
  const files = competitiveVerificationFiles(f.evidence);
  assert.equal(files.length, (selection === 'both' ? 2 : 1) + 7);
  assert.ok(files.every(path.isAbsolute));
  if (selection !== 'matrix') {
    const content = readFileSync(path.join(f.directory, 'sample-competitive-analysis.md'), 'utf8');
    if (selection === 'both') assert.match(content, /完整功能矩阵：\[sample-competitive-matrix.md\]\(<sample-competitive-matrix.md>\)/);
    else assert.match(content, /### 功能比较/);
    assert.match(content, /❓ 未知/);
    assert.match(content, /Alpha v1 Pro CN 支持 CSV 导出/);
  }
});

test('扩展完整 Schema 执行嵌套必填、额外字段、日期格式和输出选择', t => {
  const f = fixture(t);
  const invalids = [
    [data => delete data.competitive_analysis.capabilities[0].user_value, /Schema.*user_value/s],
    [data => { data.competitive_analysis.competitors[0].unregistered = true; }, /Schema.*Additional properties/s],
    [data => { data.competitive_analysis.as_of = '2026-02-30'; }, /Schema.*date/s],
    [data => { data.competitive_analysis.output_selection = 'matrix'; }, /Schema.*False schema/s],
    [data => { data.competitive_analysis.schema_version = 2; }, /Schema.*1 was expected/s]
  ];
  for (const [mutate, expected] of invalids) { const data = payload(); mutate(data); reject(data, f.evidence, expected); }
});

test('稳定 ID 和比较覆盖必须完整且唯一', t => {
  const f = fixture(t);
  const invalids = [
    [data => data.competitive_analysis.competitors.push(structuredClone(data.competitive_analysis.competitors[0])), /duplicate id: alpha/],
    [data => data.competitive_analysis.capabilities.push(structuredClone(data.competitive_analysis.capabilities[0])), /duplicate id: csv-export/],
    [data => data.competitive_analysis.assessments.push(structuredClone(data.competitive_analysis.assessments[0])), /duplicate pair/],
    [data => data.competitive_analysis.assessments.pop(), /missing assessment coverage: beta\/csv-export/],
    [data => { data.competitive_analysis.assessments[0].competitor_id = 'missing'; }, /unknown competitor_id/],
    [data => { data.competitive_analysis.assessments[0].capability_id = 'missing'; }, /unknown capability_id/]
  ];
  for (const [mutate, expected] of invalids) { const data = payload(); mutate(data); reject(data, f.evidence, expected); }
});

test('确定状态要求已审计且可解析的支持 Claim', t => {
  const f = fixture(t);
  const invalids = [
    [data => { data.competitive_analysis.assessments[0].claim_refs = ['missing']; }, /unresolved claim ref/],
    [data => { data.audit_summary.audited_claim_ids = []; }, /audited supported claim/],
    [data => { data.audit_summary.status = 'incomplete'; }, /audited supported claim/],
    [data => { data.claims[0].audit_status = 'not-audited'; }, /audited supported claim/],
    [data => { data.claims[0].audit_status = 'partially-supported'; }, /must use qualify/],
    [data => { data.evidence_items[0].source_level = 'lead-only'; }, /invalid supporting evidence/],
    [data => { data.evidence_items[0].stance = 'counter'; }, /invalid supporting evidence/]
  ];
  for (const [mutate, expected] of invalids) { const data = payload(); mutate(data); reject(data, f.evidence, expected); }
});

test('策略包引用技术 Claim 的确定状态也要求一手支持，独立于 decision_bearing', t => {
  const f = fixture(t);
  for (const decisionBearing of [true, false]) {
    const data = payload();
    data.claims[0].claim_kind = 'technical-fact';
    data.claims[0].decision_bearing = decisionBearing;
    data.evidence_items[0].source_level = 'secondary';
    reject(data, f.evidence, /technical-fact claim requires primary supporting evidence/);
    data.evidence_items[0].source_level = 'primary';
    assert.equal(validateCompetitiveAnalysis(data, f.evidence, { checkArtifacts: false }).enabled, true);
  }
  const unknown = payload();
  unknown.claims[0].claim_kind = 'technical-fact';
  unknown.evidence_items[0].source_level = 'secondary';
  unknown.competitive_analysis.assessments[0].status = 'unknown';
  unknown.competitive_analysis.assessments[0].gap = { reason: '技术 Claim 缺少一手材料', next_step: '获取相应官方说明后重新确认状态' };
  assert.equal(validateCompetitiveAnalysis(unknown, f.evidence, { checkArtifacts: false }).enabled, true);
});

test('部分支持和未知适用范围保留限定条件', t => {
  const f = fixture(t);
  const partial = payload();
  partial.competitive_analysis.assessments[0].status = 'partial';
  partial.claims[0].audit_status = 'partially-supported';
  partial.claims[0].disposition = 'qualify';
  assert.equal(validateCompetitiveAnalysis(partial, f.evidence, { checkArtifacts: false }).enabled, true);
  partial.competitive_analysis.assessments[0].limitations = [];
  reject(partial, f.evidence, /Schema.*limitations/s);
  const unknownScope = payload();
  unknownScope.competitive_analysis.competitors[0].version = 'unknown';
  unknownScope.competitive_analysis.assessments[0].limitations = [];
  reject(unknownScope, f.evidence, /unknown version\/edition\/region requires limitations/);
});

test('未知允许空 Claim，但必须有来源缺口和补证计划', t => {
  const f = fixture(t);
  assert.equal(validateCompetitiveAnalysis(f.data, f.evidence, { checkArtifacts: false }).enabled, true);
  for (const mutate of [data => { data.competitive_analysis.assessments[1].gap = null; }, data => { data.competitive_analysis.assessments[1].gap.next_step = ' '; }]) {
    const data = payload(); mutate(data); reject(data, f.evidence, /Schema.*gap/s);
  }
});

test('不支持要求明确证据，none-found 与搜索记录不能冒充', t => {
  const f = fixture(t);
  const absent = payload();
  absent.competitive_analysis.assessments[0].status = 'absent';
  absent.claims[0].statement = 'Alpha v1 Pro CN 明确不支持 CSV。';
  absent.evidence_items[0].observation = 'Alpha v1 Pro CN: CSV is explicitly unavailable.';
  assert.equal(validateCompetitiveAnalysis(absent, f.evidence, { checkArtifacts: false }).enabled, true);
  absent.evidence_items[0].source_ref = 'search-002';
  reject(absent, f.evidence, /absent cannot use none-found/);
  absent.evidence_items[0].source_ref = 'fixture://search';
  absent.evidence_items[0].source_class = 'search-log';
  reject(absent, f.evidence, /absent cannot use none-found/);
});

test('缺失输出、表格漂移和证据摘要漂移均拒绝', t => {
  const f = fixture(t);
  assert.throws(() => validateCompetitiveAnalysis(f.data, f.evidence), /missing output artifact/);
  execute(renderer, [f.evidence]);
  const matrix = path.join(f.directory, 'sample-competitive-matrix.md');
  writeFileSync(matrix, readFileSync(matrix, 'utf8').replace('✅ 明确支持；Claim:', '❌ 明确不支持；Claim:'));
  assert.throws(() => validateCompetitiveAnalysis(f.data, f.evidence), /managed content drift/);
  execute(renderer, [f.evidence]);
  f.data.claims[0].statement = '修改后的 Claim 正文';
  assert.throws(() => validateCompetitiveAnalysis(f.data, f.evidence), /managed content drift/);
});

test('渲染仅修改管理区并保留人工正文，第二份非法时不写第一份', t => {
  const f = fixture(t);
  const matrix = path.join(f.directory, 'sample-competitive-matrix.md');
  const report = path.join(f.directory, 'sample-competitive-analysis.md');
  const original = '人工前言\n<!-- YSS-COMPETITIVE:START -->\n旧受控内容\n<!-- YSS-COMPETITIVE:END -->\n人工结论\n';
  writeFileSync(matrix, original);
  writeFileSync(report, '没有标记的历史报告\n');
  execute(renderer, [f.evidence], 1, /refusing to overwrite an unmarked legacy file/);
  assert.equal(readFileSync(matrix, 'utf8'), original);
  assert.equal(readFileSync(report, 'utf8'), '没有标记的历史报告\n');
  rmSync(report);
  execute(renderer, [f.evidence]);
  const content = readFileSync(matrix, 'utf8');
  assert.ok(content.startsWith('人工前言\n'));
  assert.ok(content.endsWith('\n人工结论\n'));
  validateCompetitiveAnalysis(f.data, f.evidence);
  writeFileSync(report, readFileSync(report, 'utf8').replace('<!-- YSS-COMPETITIVE:END -->', '<!-- YSS-COMPETITIVE:END -->\n<!-- YSS-COMPETITIVE:END -->'));
  execute(renderer, [f.evidence], 1, /exactly one complete managed region/);
});

test('路径越界、错误 slug 和符号链接输出直接拒绝', t => {
  const f = fixture(t, payload('matrix'));
  for (const filename of ['../sample-competitive-matrix.md', 'other-competitive-matrix.md', 'nested\\sample-competitive-matrix.md']) {
    const data = payload('matrix'); data.competitive_analysis.artifacts.matrix = filename;
    reject(data, f.evidence, /Schema|adjacent same-slug filename/);
  }
  const outside = path.join(f.directory, 'outside.md');
  writeFileSync(outside, '外部文件');
  symlinkSync(outside, path.join(f.directory, 'sample-competitive-matrix.md'));
  execute(renderer, [f.evidence], 1, /symbolic link is not allowed/);
  assert.equal(readFileSync(outside, 'utf8'), '外部文件');
});

test('输出文本转义不会注入管理标记或破坏 Markdown 表格', t => {
  const data = payload('matrix');
  data.competitive_analysis.competitors[0].name = 'Alpha | <tag>\n<!-- YSS-COMPETITIVE:START -->';
  const f = fixture(t, data);
  execute(renderer, [f.evidence]);
  const content = readFileSync(path.join(f.directory, 'sample-competitive-matrix.md'), 'utf8');
  assert.equal(content.split('<!-- YSS-COMPETITIVE:START -->').length, 2);
  assert.match(content, /Alpha \\\| &lt;tag&gt;<br>/);
  validateCompetitiveAnalysis(data, f.evidence);
});

test('验证依赖可绑定指定 repo 根，缺依赖不能跳过', t => {
  const f = fixture(t, payload('matrix'));
  execute(renderer, [f.evidence]);
  const files = competitiveVerificationFiles(f.evidence);
  const fixtureRoot = path.join(f.directory, 'root');
  for (const dependency of files.slice(1)) {
    const target = path.join(fixtureRoot, path.relative(repoRoot, dependency));
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(dependency, target);
  }
  const bound = competitiveVerificationFiles(f.evidence, { root: fixtureRoot });
  assert.equal(bound[0], path.join(f.directory, 'sample-competitive-matrix.md'));
  assert.ok(bound.slice(1).every(file => file.startsWith(`${fixtureRoot}${path.sep}`)));
  const schema = path.join(fixtureRoot, '.agents/skills/yss-research/references/competitive-analysis.schema.json');
  assert.ok(existsSync(schema));
  rmSync(schema);
  assert.throws(() => competitiveVerificationFiles(f.evidence, { root: fixtureRoot }), /ENOENT/);
});
