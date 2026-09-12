#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { validateEngineeringDesign } from './engineering-design.mjs';
import { createApprovedExecutionContext, assertApprovedExecutionContext } from '../../../../scripts/lib/approved-execution-context.mjs';
import { verifyArchitectureEvidence } from '../../../../scripts/lib/backend-architecture.mjs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { assertScaffoldUserDecision } from '../../../../scripts/lib/user-decision.mjs';
import { validateJsonSchema } from '../../../../scripts/lib/json-schema.mjs';
import { read, safe, hash, digest, ensure } from '../../../../scripts/lib/strategic-handoff-io.mjs';
import { validate as validateDdd } from '../../yss-tactical-design/scripts/validate-tactical-design.mjs';
import { designTargets } from '../../../../scripts/lib/strategic-handoff-design-targets.mjs';
import { verifyConsumption } from '../../../../scripts/lib/strategic-handoff-consumption.mjs';

const schema = fileURLToPath(new URL('../references/technical-design.schema.json', import.meta.url));
const text = x => typeof x === 'string' && x.trim().length > 0;
const nonempty = xs => Array.isArray(xs) && xs.length > 0 && xs.every(text);
export const technicalDigest = data => digest(Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'digest')));


function validateMvc(design) {
  const modules = new Map(design.module_catalog.map(item => [item.module_id, item]));
  const cases = new Map(design.use_case_catalog.map(item => [item.use_case_id, item]));
  const rules = new Set(design.rule_catalog.map(item => item.rule_id));
  const permitted = {
    server: ['service','core','client'], service: ['repository','adapter'], core: ['repository','adapter'],
    repository: [], adapter: ['client','feign-client'], client: [], 'feign-client': ['client']
  };
  for (const module of modules.values()) for (const ref of module.depends_on) {
    ensure(modules.has(ref) && permitted[module.layer].includes(modules.get(ref).layer), `模块依赖越界: ${module.module_id} -> ${ref}`);
  }
  for (const item of cases.values()) {
    ensure(['service','core'].includes(modules.get(item.module_ref)?.layer), `用例必须属于 service/core: ${item.use_case_id}`);
    ensure(item.rule_refs.every(ref => rules.has(ref)), `用例引用未声明规则: ${item.use_case_id}`);
  }
  for (const rule of design.rule_catalog) ensure(rule.use_case_refs.every(ref => cases.has(ref) && cases.get(ref).rule_refs.includes(rule.rule_id)), `规则与用例未双向关联: ${rule.rule_id}`);
  for (const item of design.state_transition_catalog) ensure(cases.has(item.use_case_ref), '状态转换引用未声明用例');
  if (!design.state_transition_catalog.length) ensure(text(design.state_not_applicable_reason), '无状态转换必须说明原因');
  for (const item of design.persistence_mapping) ensure(cases.has(item.use_case_ref) && modules.get(item.repository_ref)?.layer === 'repository', '持久化映射的用例或 Repository 引用无效');
  for (const item of design.integration_catalog) ensure(modules.get(item.adapter_ref)?.layer === 'adapter', '外部集成必须关联 Adapter');
  if (!design.integration_catalog.length) ensure(text(design.integration_not_applicable_reason), '无外部集成必须说明原因');
}

export function verifyArchitecture(data, root, {execution,sliceRef}={}) {
  if(execution)assertApprovedExecutionContext(execution,{root,technicalDesign:data,sliceId:sliceRef});
  const binding = data.architecture;
  const file = safe(root, binding.decision_ref);
  ensure(hash(readFileSync(file)) === binding.decision_digest, '架构来源摘要漂移');
  const record = read(file);
  if (binding.source_kind === 'scaffold-decision') {
    const decision = record.decisions?.find(item => item.project_id === binding.project_id);
    ensure(record.status === 'current' && record.template === false, '架构选择记录必须为当前正式记录');
    ensure(decision && ['user-confirmed','lifecycle-approved','consumed'].includes(decision.status), '分支设计前必须确认项目架构');
    ensure(decision.confirmed_architecture === binding.family, '技术设计与确认架构不匹配');
    ensure(text(decision.user_confirmation?.confirmation_ref) && text(decision.user_confirmation?.confirmed_by), '缺少真实架构确认引用');
    assertScaffoldUserDecision(decision, { root });
  } else {
    // Registration formats differ by repository; bind the actual registered identity,
    // never infer architecture from a directory or a design's self-declaration.
    const entry = record.repositories?.find(item => item.project_id === binding.project_id) ?? record;
    ensure(entry.project_id === binding.project_id && entry.architecture_identity?.architecture_family === binding.family, '技术设计与既有工程登记架构不匹配');
    ensure(!['stale','blocked'].includes(record.status) && !['stale','blocked'].includes(entry.status), '工程登记已失效');
    if (entry.architecture_identity?.schema_version === 2) {
      ensure(entry.architecture_evidence?.engineering_baseline && entry.architecture_evidence?.manifest, '既有工程登记缺少原始工程证据引用');
      verifyArchitectureEvidence(entry.architecture_identity, { ...entry.architecture_evidence, repository_registration: { ref: binding.decision_ref, digest: binding.decision_digest } }, { root, execution });
    }
  }
}

function validateLocalTraceability(data, root, sliceRef) {
  const { ids, seams } = designTargets(data);
  const sources = new Map(data.source_items.map(item => [item.source_id, item]));
  ensure(sources.size === data.source_items.length, '源规则或场景 ID 重复');
  const rows = new Map(data.traceability.map(item => [item.source_id, item]));
  ensure(rows.size === data.traceability.length, '承接记录重复');
  ensure(data.strategic_handoff || sources.size > 0, '无战略包时必须列出需求规则与场景');
  for (const source of sources.values()) ensure(data.inputs.some(item => item.ref === source.source_ref), '源规则或场景未绑定当前输入');
  for (const id of rows.keys()) ensure(sources.has(id), `未知承接来源: ${id}`);
  for (const [id, source] of sources) {
    const row = rows.get(id);
    ensure(row, `缺少规则或场景承接: ${id}`);
    if (row.disposition === 'implemented') {
      ensure(nonempty(row.tactical_refs) && row.tactical_refs.every(ref => ids.has(ref)), `设计落点悬空: ${id}`);
      ensure(nonempty(row.test_seam_refs) && row.test_seam_refs.every(ref => seams.has(ref) && row.tactical_refs.includes(seams.get(ref).subject_ref)), `测试 seam 未关联设计落点: ${id}`);
      if (source.kind === 'scenario' && source.critical) ensure(['success','failure'].every(outcome => row.scenario_tests?.some(test => test.outcome === outcome && row.test_seam_refs.includes(test.seam_ref))), `关键场景缺少成功/失败测试: ${id}`);
      ensure(nonempty(row.evidence_refs), `缺少承接证据: ${id}`);
    } else if (row.disposition === 'not-applicable') {
      ensure(text(row.reason) && nonempty(row.evidence_refs), `不适用缺少依据: ${id}`);
    } else {
      if (row.disposition === 'deferred') for (const key of ['reason','risk','owner','followup_ticket_ref','verification_plan','target_version']) ensure(text(row[key]), `延期缺少 ${key}: ${id}`);
      ensure(sliceRef && row.dependency_status === 'known' && nonempty(row.dependent_slice_refs) && !row.dependent_slice_refs.includes(sliceRef), `未闭合承接阻断当前范围: ${id}`);
    }
    for (const ref of row.evidence_refs || []) safe(root, ref);
  }
}

export async function validateTechnicalDesign(data, { root = process.cwd(), sliceRef, legacyDdd = false, readOnly = false, execution } = {}) {
  if (data?.schema_version === 1) {
    ensure(legacyDdd, '旧 v1 合同需要显式 --legacy-ddd，仅按 DDD 兼容读取');
    const errors = validateDdd(data);
    ensure(!errors.length, errors.join('; '));
    if (sliceRef) ensure(data.status === 'approved', '切片只能消费 approved 设计');
    if (data.strategic_handoff || data.strategic_context_import_ref || data.upstream_impact?.source_kind === 'strategic-handoff') {
      const result = await verifyConsumption(data, { root, sliceRef, readOnly });
      ensure(result.result === 'verified', JSON.stringify(result));
    }
    return { result: 'legacy-ddd-read-only', architecture_family: 'domain-driven', status: data.status };
  }
  validateJsonSchema(data, schema, { label: '技术设计合同' });
  ensure(data.digest === technicalDigest(data), '技术设计合同摘要不匹配');
  ensure(!['stale','blocked','drift','new_impacts'].includes(data.status), '设计状态不可消费');
  if (sliceRef) ensure(data.status === 'approved', '切片只能消费 approved 设计');
  verifyArchitecture(data, root, {execution,sliceRef});
  ensure(data.inputs.some(item => item.kind === 'context' && item.ref === 'CONTEXT.md') && data.inputs.some(item => item.kind === 'spec'), '共同输入缺少根 CONTEXT.md 或 Spec');
  for (const input of data.inputs) ensure(hash(readFileSync(safe(root, input.ref))) === input.digest, `输入摘要漂移: ${input.ref}`);
  for (const ref of data.evidence_refs) safe(root, ref);
  if (data.status === 'approved') ensure(data.evidence_refs.length > 0, '已批准设计缺少评审证据');
  if(data.design_scope==='engineering-only')validateEngineeringDesign(data,{root});
  else if (data.architecture.family === 'domain-driven') {
    const errors = validateDdd(data.design);
    ensure(!errors.length, errors.join('; '));
    ensure(data.design.status === data.status, 'DDD 分支状态与共同合同不一致');
    ensure(data.inputs.some(item => item.kind === 'strategic'), 'DDD 分支缺少战略领域输入');
    ensure(!data.design.strategic_handoff && !data.design.strategic_context_import_ref, '战略绑定只允许在共同合同中维护');
  } else validateMvc(data.design);
  const { ids, seams } = designTargets(data);
  for (const seam of seams.values()) ensure(ids.has(seam.subject_ref), `测试 seam 设计对象悬空: ${seam.seam_id}`);
  validateLocalTraceability(data, root, sliceRef);
  if (data.strategic_handoff) {
    const result = await verifyConsumption(data, { root, sliceRef, readOnly });
    ensure(result.result === 'verified', JSON.stringify(result));
  }
  return { result: 'ready-for-lifecycle-review', technical_design_id: data.technical_design_id, architecture_family: data.architecture.family, status: data.status, digest: data.digest };
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: 'string', default: process.cwd() }, slice: { type: 'string' }, 'legacy-ddd': { type: 'boolean', default: false }, 'read-only': {type:'boolean',default:false}, 'approved-slice': {type:'string'}, 'approved-slice-digest': {type:'string'}, 'approved-slice-approval': {type:'string'} } });
  ensure(positionals.length === 1, '用法: validate-technical-design.mjs <合同> --root <项目根> [--slice <ID>] [--legacy-ddd]');
  const approvedOptions=['approved-slice','approved-slice-digest','approved-slice-approval'];
  ensure(!approvedOptions.some(key=>values[key])||approvedOptions.every(key=>values[key]),'执行增量必须完整给出持久化 Slice、字节摘要及本地批准引用');
  const execution=values['approved-slice']?createApprovedExecutionContext({ref:values['approved-slice'],digest:values['approved-slice-digest'],approval_ref:values['approved-slice-approval']},{root:values.root}):undefined;
  const result = await validateTechnicalDesign(read(path.resolve(positionals[0])), { root: values.root, sliceRef: values.slice, legacyDdd: values['legacy-ddd'], readOnly:values['read-only'], execution });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { process.stderr.write(`${JSON.stringify({ result: 'blocked', errors: [error.message] })}\n`); process.exitCode = 1; });
