import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateJsonSchema } from '../../../../../scripts/lib/json-schema.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = path.resolve(skillRoot, '../../..');
const schemaFile = path.join(skillRoot, 'references/competitive-analysis.schema.json');
const START = '<!-- YSS-COMPETITIVE:START -->';
const END = '<!-- YSS-COMPETITIVE:END -->';
const SYMBOLS = { supported: '✅ 明确支持', partial: '⚠️ 部分支持', absent: '❌ 明确不支持', unknown: '❓ 未知' };
const TYPES = { direct: '直接竞品', indirect: '间接竞品', substitute: '替代方案', adjacent: '相邻产品', 'our-product': '本方产品' };

function fail(message) { throw new TypeError(`competitive_analysis: ${message}`); }
function indexById(items, label) {
  const result = new Map();
  for (const item of items) {
    if (result.has(item.id)) fail(`${label} contains duplicate id: ${item.id}`);
    result.set(item.id, item);
  }
  return result;
}
function fileInfo(file) {
  try { return lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function evidenceSlug(evidenceFile) {
  const name = path.basename(evidenceFile);
  if (!name.endsWith('-evidence.yaml') || name === '-evidence.yaml') fail('expected <slug>-evidence.yaml');
  return name.slice(0, -'-evidence.yaml'.length);
}
function artifactPath(evidenceFile, filename, kind) {
  const evidencePath = path.resolve(evidenceFile);
  const slug = evidenceSlug(evidencePath);
  const expected = `${slug}-competitive-${kind === 'matrix' ? 'matrix' : 'analysis'}.md`;
  if (filename !== expected || path.basename(filename) !== filename || filename.includes('\\')) fail(`artifacts.${kind} must be adjacent same-slug filename: ${expected}`);
  const directory = path.dirname(evidencePath);
  const output = path.resolve(directory, filename);
  if (path.dirname(output) !== directory) fail(`artifacts.${kind} escapes evidence directory`);
  const info = fileInfo(output);
  if (info?.isSymbolicLink()) fail(`artifacts.${kind} symbolic link is not allowed: ${filename}`);
  if (info && !info.isFile()) fail(`artifacts.${kind} must be a regular file: ${filename}`);
  if (info && path.dirname(realpathSync(output)) !== realpathSync(directory)) fail(`artifacts.${kind} escapes real evidence directory`);
  return output;
}
function selectedArtifacts(extension, evidenceFile) {
  return Object.entries(extension.artifacts).map(([kind, filename]) => ({ kind, filename, file: artifactPath(evidenceFile, filename, kind) }));
}
function validateStructure(data) {
  if (!Object.hasOwn(data, 'competitive_analysis')) return null;
  try { validateJsonSchema(data.competitive_analysis, schemaFile); } catch (error) { fail(`Schema: ${error.message}`); }
  return data.competitive_analysis;
}
function validateReferences(data, extension) {
  const competitors = indexById(extension.competitors, 'competitors');
  const capabilities = indexById(extension.capabilities, 'capabilities');
  const claims = indexById(data.claims || [], 'claims');
  const evidence = indexById(data.evidence_items || [], 'evidence_items');
  const searches = indexById(data.search_log || [], 'search_log');
  const audited = new Set(data.audit_summary?.audited_claim_ids || []);
  const pairs = new Set();
  for (const assessment of extension.assessments) {
    const label = `${assessment.competitor_id}/${assessment.capability_id}`;
    if (!competitors.has(assessment.competitor_id)) fail(`${label} has unknown competitor_id`);
    if (!capabilities.has(assessment.capability_id)) fail(`${label} has unknown capability_id`);
    if (pairs.has(label)) fail(`assessments contains duplicate pair: ${label}`);
    pairs.add(label);
    for (const ref of assessment.claim_refs) {
      const claim = claims.get(ref);
      if (!claim) fail(`${label} has unresolved claim ref: ${ref}`);
      if (assessment.status === 'unknown') continue;
      if (data.audit_summary?.status !== 'complete' || !audited.has(ref) || !['supported', 'partially-supported'].includes(claim.audit_status)) fail(`${label} requires an audited supported claim: ${ref}`);
      if (claim.audit_status === 'partially-supported' && (claim.disposition !== 'qualify' || assessment.limitations.length === 0)) fail(`${label} partially-supported claim must use qualify and assessment limitations: ${ref}`);
      if (!Array.isArray(claim.evidence_refs) || claim.evidence_refs.length === 0) fail(`${label} claim requires supporting evidence: ${ref}`);
      for (const evidenceRef of claim.evidence_refs) {
        const item = evidence.get(evidenceRef);
        if (!item || item.stance !== 'support' || item.source_level === 'lead-only') fail(`${label} has invalid supporting evidence: ${evidenceRef}`);
        if (assessment.status === 'absent' && (['search', 'search-log', 'search-result'].includes(item.source_class) || searches.get(item.source_ref)?.result === 'none-found')) fail(`${label} absent cannot use none-found search as absence evidence: ${evidenceRef}`);
      }
      if (claim.claim_kind === 'technical-fact' && !claim.evidence_refs.some(evidenceRef => evidence.get(evidenceRef).source_level === 'primary')) fail(`${label} technical-fact claim requires primary supporting evidence: ${ref}`);
    }
    const competitor = competitors.get(assessment.competitor_id);
    if (assessment.status !== 'unknown' && ['version', 'edition', 'region'].some(field => ['unknown', '未知'].includes(competitor[field].trim().toLowerCase())) && assessment.limitations.length === 0) fail(`${label} unknown version/edition/region requires limitations`);
  }
  for (const competitor of competitors.keys()) for (const capability of capabilities.keys()) {
    if (!pairs.has(`${competitor}/${capability}`)) fail(`missing assessment coverage: ${competitor}/${capability}`);
  }
}
function cell(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('[', '\\[').replaceAll(']', '\\]').replace(/\r?\n/g, '<br>');
}
function table(headers, rows) {
  return [`| ${headers.map(cell).join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.map(cell).join(' | ')} |`)].join('\n');
}
function managedBody(data, kind) {
  const extension = data.competitive_analysis;
  const lines = [
    `调研截至日期：${cell(extension.as_of)}`,
    `比较范围：${cell(extension.comparison_scope)}`,
    '本区由证据台账生成；结构与引用校验不替代来源语义审核。',
    '',
    '### 比较对象与适用范围',
    '',
    table(['竞品 ID', '竞品', '类型', '产品', '版本', '套餐', '地区'], extension.competitors.map(item => [item.id, item.name, TYPES[item.type], item.product, item.version, item.edition, item.region])),
    '',
    '### 能力定义',
    '',
    table(['能力 ID', '功能模块', '功能点', '定义', '用户价值'], extension.capabilities.map(item => [item.id, item.module, item.name, item.definition, item.user_value])),
    ''
  ];
  if (kind === 'report' && extension.output_selection === 'both') {
    lines.push(`完整功能矩阵：[${cell(extension.artifacts.matrix)}](<${encodeURI(extension.artifacts.matrix)}>)`, '');
  } else {
    const pairs = new Map(extension.assessments.map(item => [`${item.competitor_id}/${item.capability_id}`, item]));
    lines.push('### 功能比较', '', table(['功能模块', '能力 ID / 功能点', ...extension.competitors.map(item => `${item.id} / ${item.name}`)], extension.capabilities.map(capability => [capability.module, `${capability.id} / ${capability.name}`, ...extension.competitors.map(competitor => {
      const assessment = pairs.get(`${competitor.id}/${capability.id}`);
      return `${SYMBOLS[assessment.status]}；Claim: ${assessment.claim_refs.join(', ') || '无（来源缺口见下表）'}`;
    })])), '', '状态：✅ 明确支持；⚠️ 在注明条件下部分支持；❌ 有明确不支持证据；❓ 尚未确认。未搜索到资料不构成不支持证据。', '');
  }
  lines.push('### 限定条件与补证计划', '', table(['竞品 / 能力', '状态', 'Claim', '限定条件', '来源缺口', '补证计划'], extension.assessments.map(item => [`${item.competitor_id}/${item.capability_id}`, SYMBOLS[item.status], item.claim_refs.join(', ') || '无', item.limitations.join('；') || '无已登记限定', item.gap?.reason || '无已登记缺口', item.gap?.next_step || '无'])), '');
  const claims = new Map((data.claims || []).map(item => [item.id, item]));
  const refs = [...new Set(extension.assessments.flatMap(item => item.claim_refs))];
  lines.push('### Claim 与证据摘要', '', table(['Claim', '陈述', '审核 / 处置', '支持证据', '反证 / 反向搜索'], refs.map(ref => {
    const claim = claims.get(ref);
    return [ref, claim.statement, `${claim.audit_status} / ${claim.disposition}`, claim.evidence_refs.join(', '), claim.counter_signal_refs.join(', ')];
  })), '');
  const evidenceRefs = new Set(refs.flatMap(ref => [...claims.get(ref).evidence_refs, ...claims.get(ref).counter_signal_refs]));
  lines.push(table(['证据 / 搜索 ID', '来源与定位', '日期', '观察 / 搜索结果', '限制'], [...evidenceRefs].map(ref => {
    const item = (data.evidence_items || []).find(entry => entry.id === ref);
    if (item) return [ref, `${item.source_ref} / ${item.locator}`, item.evidence_date || item.observed_at, item.observation, (item.limitations || []).join('；') || '无已登记限制'];
    const search = (data.search_log || []).find(entry => entry.id === ref);
    return [ref, `${search.channel} / ${search.query_or_corpus}`, search.searched_at, search.result, '搜索结果仅记录反向检索，不能证明能力缺失'];
  })));
  return `${START}\n${lines.join('\n')}\n${END}`;
}
function managedRegion(content, label) {
  if (content.split(START).length !== 2 || content.split(END).length !== 2) fail(`${label} requires exactly one complete managed region; refusing to overwrite an unmarked legacy file`);
  const start = content.indexOf(START), end = content.indexOf(END);
  if (end < start) fail(`${label} managed region markers are out of order`);
  return { start, end: end + END.length, text: content.slice(start, end + END.length) };
}

/** Validate the complete extension Schema before references and current artifacts. */
export function validateCompetitiveAnalysis(data, evidenceFile, { checkArtifacts = true } = {}) {
  const extension = validateStructure(data);
  if (!extension) return { enabled: false, artifacts: [] };
  validateReferences(data, extension);
  const artifacts = selectedArtifacts(extension, evidenceFile);
  if (checkArtifacts) for (const artifact of artifacts) {
    if (!fileInfo(artifact.file)) fail(`missing output artifact: ${artifact.filename}`);
    const content = readFileSync(artifact.file, 'utf8');
    if (managedRegion(content, artifact.filename).text !== managedBody(data, artifact.kind)) fail(`managed content drift: ${artifact.filename}; rerun render-competitive-outputs.mjs`);
  }
  return { enabled: true, output_selection: extension.output_selection, artifacts: artifacts.map(item => item.file), competitors: extension.competitors.length, capabilities: extension.capabilities.length, assessments: extension.assessments.length };
}

/** Preflight all outputs before the CLI writes any file, preserving manual prose. */
export function prepareCompetitiveOutputs(data, evidenceFile) {
  validateCompetitiveAnalysis(data, evidenceFile, { checkArtifacts: false });
  if (!Object.hasOwn(data, 'competitive_analysis')) fail('evidence package has no competitive_analysis extension');
  return selectedArtifacts(data.competitive_analysis, evidenceFile).map(artifact => {
    const templateFile = path.join(repositoryRoot, `.template-spec/plan/templates/competitive-${artifact.kind === 'matrix' ? 'matrix' : 'analysis'}-template.md`);
    const content = readFileSync(fileInfo(artifact.file) ? artifact.file : templateFile, 'utf8');
    const region = managedRegion(content, artifact.filename);
    return { ...artifact, content: `${content.slice(0, region.start)}${managedBody(data, artifact.kind)}${content.slice(region.end)}` };
  });
}

/** Files whose current bytes govern competitive output verification. */
export function competitiveVerificationFiles(evidenceFile, { root = repositoryRoot } = {}) {
  const data = JSON.parse(readFileSync(evidenceFile, 'utf8'));
  const extension = validateStructure(data);
  if (!extension) return [];
  const artifacts = selectedArtifacts(extension, evidenceFile).map(item => item.file);
  const dependencies = [
    '.agents/skills/yss-research/references/competitive-analysis.schema.json',
    '.agents/skills/yss-research/scripts/lib/competitive-analysis.mjs',
    '.agents/skills/yss-research/scripts/render-competitive-outputs.mjs',
    '.template-spec/plan/templates/competitive-matrix-template.md',
    '.template-spec/plan/templates/competitive-analysis-template.md',
    'scripts/lib/json-schema.mjs',
    'scripts/lib/validation-phase.mjs'
  ].map(ref => path.resolve(root, ref));
  for (const file of [...artifacts, ...dependencies]) readFileSync(file);
  return [...artifacts, ...dependencies];
}
