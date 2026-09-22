import fs from 'node:fs';
import path from 'node:path';

const directory = process.argv[2];
if (!directory) throw Error('compare.mjs <maintenance-evidence-directory>');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const baseline = read('baseline-final.json');
const optimized = read('optimized-final.json');
if (baseline.runs !== 30 || optimized.runs !== 30 || baseline.node !== optimized.node || baseline.platform !== optimized.platform) {
  throw Error('Comparison requires 30 independent runs on the same runtime and platform');
}
const median = values => [...values].sort((a, b) => a - b)[Math.ceil(values.length / 2) - 1];
const scenarios = Object.fromEntries(Object.entries(baseline.measures).map(([name, before]) => {
  const after = optimized.measures[name];
  if (!after || before.rows.length !== 30 || after.rows.length !== 30) throw Error(`Missing runs: ${name}`);
  const expected = ['stale', 'invalid-approval'].includes(name) ? 'rejected' : 'passed';
  if ([...before.rows, ...after.rows].some(row => row.result !== expected)) throw Error(`Incorrect outcome: ${name}`);
  return [name, {
    baseline_p50_ms: before.p50_ms, optimized_p50_ms: after.p50_ms,
    p50_reduction: 1 - after.p50_ms / before.p50_ms,
    baseline_p95_ms: before.p95_ms, optimized_p95_ms: after.p95_ms,
    p95_ratio: after.p95_ms / before.p95_ms,
    baseline_main_reads: median(before.rows.map(row => row.main.reads)),
    optimized_main_reads: median(after.rows.map(row => row.main.reads)),
    baseline_tree: before.rows[0].tree, optimized_tree: after.rows[0].tree,
    outcome: expected,
  }];
}));
const mvc = scenarios.mvc;
const viewBefore = median(baseline.measures.view.rows.map(row => row.markdown_bytes));
const viewAfter = median(optimized.measures.view.rows.map(row => row.markdown_bytes));
const criteria = [
  {id: 'mvc-p50', target: 'reduction >= 0.50', actual: mvc.p50_reduction, passed: mvc.p50_reduction >= 0.5},
  {id: 'mvc-main-reads', target: 'reduction >= 0.60', actual: 1 - mvc.optimized_main_reads / mvc.baseline_main_reads, passed: mvc.optimized_main_reads / mvc.baseline_main_reads <= 0.4},
  {id: 'mvc-python-starts', target: '<= 6', actual: Math.max(...optimized.measures.mvc.rows.map(row => row.tree.python)), passed: optimized.measures.mvc.rows.every(row => row.tree.python <= 6)},
  {id: 'mvc-node-starts', target: '<= 1', actual: Math.max(...optimized.measures.mvc.rows.map(row => row.tree.node)), passed: optimized.measures.mvc.rows.every(row => row.tree.node <= 1)},
  {id: 'review-bytes', target: 'reduction >= 0.70', actual: 1 - viewAfter / viewBefore, passed: viewAfter / viewBefore <= 0.3},
  ...Object.entries(scenarios).filter(([name, row]) => name !== 'mvc' && row.outcome === 'passed').map(([name, row]) => ({id: `${name}-p95`, target: 'ratio <= 1.10', actual: row.p95_ratio, passed: row.p95_ratio <= 1.1})),
];
const report = {kind: 'contract-efficiency-comparison', sample: 'synthetic-only', runs: 30, warmup: 3, node: baseline.node, platform: baseline.platform,
  automatic_performance_acceptance: criteria.every(item => item.passed) ? 'passed' : 'partial',
  real_use_effect: 'pending-authorized-slice', release_ready: false,
  view_bytes: {baseline: viewBefore, optimized: viewAfter}, criteria, scenarios};
fs.writeFileSync(path.join(directory, 'comparison.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# 合同工具量化结果', '',
  `同机 ${baseline.platform} / ${baseline.node}；每场景预热 3 次，再独立运行 30 次。夹具创建不计时。`, '',
  '| 场景 | 基线 p50 ms | 优化 p50 ms | p50 降幅 | p95 比值（新/旧） | 结论 |',
  '|---|---:|---:|---:|---:|---|',
  ...Object.entries(scenarios).map(([name, row]) => `| ${name} | ${row.baseline_p50_ms.toFixed(1)} | ${row.optimized_p50_ms.toFixed(1)} | ${(row.p50_reduction * 100).toFixed(1)}% | ${row.p95_ratio.toFixed(3)} | ${row.outcome} |`), '',
  '| 指标 | 目标 | 实际 | 达标 |', '|---|---|---:|---|',
  ...criteria.map(item => `| ${item.id} | ${item.target} | ${item.actual.toFixed(4)} | ${item.passed ? '是' : '否'} |`), '',
  `MVC 主进程读取 ${mvc.baseline_main_reads} → ${mvc.optimized_main_reads} 次；整个 Node 进程树的 Python 启动 ${mvc.baseline_tree.python} → ${mvc.optimized_tree.python} 次。`, '',
  '| MVC 进程树计数 | 基线 | 优化 |', '|---|---:|---:|',
  ...['reads', 'parses', 'hashes', 'schema_requests', 'executed_schema_jobs', 'python', 'node'].map(key => `| ${key} | ${mvc.baseline_tree[key]} | ${mvc.optimized_tree[key]} |`), '',
  'Schema 请求包含预先批量校验和原消费者复核请求；实际提交作业去重。SHA-256 次数可能因最终依赖字节复核增加，不将摘要次数下降作为本次提速的前提。', '',
  `审阅 Markdown ${viewBefore} → ${viewAfter} 字节；必需信息覆盖由 contract-regression-final.log 的行为断言核对。API v2 字段数与机器字段生成由同一回归记录验证，不把夹具结果推算为真实用户耗时。`, '',
  '原始 30 次样本、主进程路径读取计数、解析/摘要/Schema 请求和执行计数见 baseline-final.json 与 optimized-final.json。读取/解析/摘要计数覆盖 Node 主子进程；Python 的内部文件读取未作操作系统级追踪，进程启动与提交的 Schema 任务计数覆盖整个进程树。', '',
  '自动量化未达项必须保留；真实切片尚未运行，不能宣称整体研发效率已提高。', '',
];
fs.writeFileSync(path.join(directory, 'measurement-report.md'), lines.join('\n'));
console.log(JSON.stringify({result: report.automatic_performance_acceptance, unmet: criteria.filter(item => !item.passed)}, null, 2));
if (criteria.some(item => !item.passed)) process.exitCode = 1;
