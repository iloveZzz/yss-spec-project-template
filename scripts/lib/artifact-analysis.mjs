// 一致性分析：在同一功能包上依次调用 Plan/Spec 诊断、业务票校验（含实现覆盖）与阶段决定覆盖，
// 汇总为一份报告。只读诊断：不改变阶段、批准或就绪状态，结论不是流转许可。
import fs from 'node:fs';
import path from 'node:path';
import { inspectPlanSpec } from './plan-spec-quality.mjs';
import { checkBusinessTickets, summarizeBusinessImplementation } from './business-tickets.mjs';
import { planStageCoverage } from './plan-stage-coverage.mjs';
import { parseYaml, trackerConfig } from './stage-tracking.mjs';

const ASSET = /\.(?:ya?ml|json|md)$/i;

function frontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match ? match[1] : null;
}

function readDoc(file) {
  const text = fs.readFileSync(file, 'utf8');
  const body = file.endsWith('.md') ? frontMatter(text) : text;
  if (body === null) return null;
  try { const value = parseYaml(body); return value && typeof value === 'object' ? value : null; } catch { return null; }
}

/** 在功能包内按内容识别 Plan、Spec、Slice 合同、业务票集合与垂直切片 Ticket；只返回项目相对路径。 */
export function discover(root, featureRoot) {
  const found = { plan: null, spec: null, slices: [], businessTickets: null, sliceTickets: [] };
  const base = path.join(root, featureRoot);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { walk(file); continue; }
      if (!ASSET.test(entry.name)) continue;
      const ref = path.relative(root, file).split(path.sep).join('/');
      if (entry.name === 'plan.md' && dir === base) found.plan ??= ref;
      if (entry.name === 'spec.md' && dir === base) found.spec ??= ref;
      const doc = readDoc(file);
      if (!doc) continue;
      if (doc.kind === 'business-ticket-set') found.businessTickets ??= ref;
      else if (doc.kind === 'vertical-slice-ticket') found.sliceTickets.push(ref);
      else if (doc.contract_id && doc.slice_id && doc.verification) found.slices.push(ref);
    }
  };
  if (fs.existsSync(base)) walk(base);
  return found;
}

const finding = (check, code, file, line, message, fix) => ({ check, code, file, line: line ?? null, message, fix });

export async function analyzeArtifacts(options) {
  const root = path.resolve(options.root ?? '.');
  if (!options.feature || !/^[a-z0-9][a-z0-9-]*$/.test(options.feature)) throw Object.assign(new Error('需要 --feature <功能包名>'), { exitCode: 2 });
  const featureRoot = `${String(trackerConfig(root).root).replace(/\/$/, '')}/${options.feature}`;
  if (!fs.existsSync(path.join(root, featureRoot))) throw Object.assign(new Error(`功能包不存在: ${featureRoot}`), { exitCode: 2 });
  const found = discover(root, featureRoot);
  const inputs = {
    plan: options.plan ?? found.plan, spec: options.spec ?? found.spec,
    slices: options.slices?.length ? options.slices : found.slices,
    business_tickets: options.businessTickets ?? found.businessTickets,
    slice_tickets: found.sliceTickets,
    decisions: options.decisions ?? null, package: options.package ?? null, mapping: options.mapping ?? null,
  };
  const sections = {}, findings = [];
  const run = async (name, applicable, reason, body) => {
    if (!applicable) { sections[name] = { status: 'not-applicable', reason }; return; }
    try { sections[name] = await body(); }
    catch (error) {
      sections[name] = { status: 'unassessed', reason: error.message };
      findings.push(finding(name, 'ANALYSIS_UNASSESSED', null, null, error.message, '修复输入后重跑；未评估不代表一致'));
    }
  };
  await run('plan_spec', inputs.plan || inputs.spec, '功能包内没有 plan.md 或 spec.md', async () => {
    const { report } = await inspectPlanSpec({ command: 'check', root, plan: inputs.plan ?? undefined, spec: inputs.spec ?? undefined, slices: inputs.slices });
    for (const f of report.findings) findings.push(finding('plan_spec', f.code, f.location?.file ?? null, f.location?.line, f.message, f.recovery));
    return { status: report.execution === 'completed' ? (report.findings.length ? 'findings' : 'passed') : 'unassessed', findings: report.findings.length, unevaluated: report.unevaluated.length, manual_review: report.manual_review };
  });
  await run('business_tickets', inputs.business_tickets, '功能包内没有业务票集合', async () => {
    const result = checkBusinessTickets({ root, setRef: inputs.business_tickets, mode: options.mode ?? 'draft' });
    for (const d of result.diagnostics ?? []) findings.push(finding('business_tickets', d.code, d.source_ref ?? inputs.business_tickets, null, d.message, '按业务票模板与集合登记修正后重跑'));
    const section = { status: result.status === 'passed' ? 'passed' : 'findings', mode: result.mode };
    if (inputs.slice_tickets.length) {
      const coverage = summarizeBusinessImplementation({ root, setRef: inputs.business_tickets, sliceRefs: inputs.slice_tickets });
      section.implementation_coverage = coverage;
      if (coverage.status === 'blocked') {
        findings.push(finding('business_tickets', 'IMPLEMENTATION_COVERAGE_BLOCKED', inputs.business_tickets, null, '业务票未被垂直切片完整覆盖', '补齐切片 Ticket 的 business_ticket_refs / acceptance_refs'));
        section.status = 'findings';
      }
    }
    return section;
  });
  await run('stage_coverage', inputs.decisions && inputs.package, '未指定 --decisions 与 --package（阶段决定覆盖仅在提供时运行）', async () => {
    const result = planStageCoverage(root, { plan_ref: inputs.plan, decisions_ref: inputs.decisions, package_ref: inputs.package, mapping_ref: inputs.mapping ?? undefined });
    for (const row of [...result.decisions, ...result.non_goals].filter((r) => r.status !== 'mapped')) findings.push(finding('stage_coverage', 'COVERAGE_UNMAPPED', row.source_ref, row.source_line, row.source_text, '在阶段决定包中补齐对应条目，或在映射中说明'));
    for (const id of result.undeclared_decision_ids) findings.push(finding('stage_coverage', 'COVERAGE_UNDECLARED', inputs.package, null, `决定包含未在决定表登记的 ${id}`, '在决定表登记或移除'));
    return { status: result.coverage_status === 'complete' ? 'passed' : 'findings', coverage_status: result.coverage_status };
  });
  const statuses = Object.values(sections).map((s) => s.status);
  const status = statuses.includes('unassessed') ? 'incomplete' : findings.length ? 'findings' : statuses.includes('passed') ? 'consistent' : 'no-artifacts';
  return { kind: 'artifact-analysis', feature: options.feature, status, diagnostic_only: true, execution_authorization: 'not-granted', inputs, sections, findings, semantic_review: 'required' };
}

export function exitCodeFor(report) {
  return report.status === 'consistent' || report.status === 'no-artifacts' ? 0 : report.status === 'incomplete' ? 2 : 1;
}

export function renderText(report) {
  const lines = [`一致性分析：${report.status}（诊断证据，不是流转许可；语义仍需人工审阅）`];
  for (const [name, section] of Object.entries(report.sections)) lines.push(`  ${name}: ${section.status}${section.reason ? `（${section.reason}）` : ''}`);
  for (const f of report.findings.slice(0, 20)) lines.push(`- [${f.check}] ${f.code} ${f.file ?? ''}${f.line ? `:${f.line}` : ''} ${f.message}\n  修复：${f.fix}`);
  if (report.findings.length > 20) lines.push(`- …另有 ${report.findings.length - 20} 条，见 --json`);
  return `${lines.join('\n')}\n`;
}
