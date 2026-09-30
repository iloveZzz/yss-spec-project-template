import { readFile, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PROFILE, ID_PATTERN, requiredFields, ids, parseContent, sourceRefs, yamlValue } from './plan-spec-markdown.mjs';

export const TOOL_VERSION = '1.0.0';
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const noValue = value => !value || /^(?:[-—]|TBD|TODO|待填写|<[^>]*>)$/i.test(value.trim());
const placeholder = value => /<[^>\n]+>|\b(?:TODO|TBD)\b|待填写/.test(value);
const unknown = value => /未知|待确认|待定|unknown|TBD/i.test(value ?? '');
const notApplicable = value => /^(?:not-applicable|不适用|N\/A)(?:\s|[：:]|$)/i.test(value ?? '');
const naReason = value => /^(?:not-applicable|不适用|N\/A)\s*[：:]\s*\S.+/i.test(value ?? '') && !placeholder(value);
const field = (entry, name) => entry.fields[name] ?? '';
const location = (file, position) => ({ file, line: position?.start?.line ?? 1, column: position?.start?.column ?? 1 });

export async function inspectPlanSpec(options, hooks = {}) {
  const report = {
    tool: 'inspect-plan-spec', tool_version: TOOL_VERSION, content_profile: PROFILE,
    mode: options.command, diagnostic_only: true, execution: 'completed', inputs: [],
    scope: { documents: [], sources: ['来源引用', '数据来源', '权威引用'], slices: options.slices ?? [], network: '不读取', state_changes: '无', prose: '正文语义未自动评估，需保留全文人工审阅' },
    findings: [], unevaluated: [], manual_review: [
      '问题真实性、方案优劣、目标合理性、场景充分性和规则语义等价性需人工审查。',
      '诊断不改变生命周期批准、就绪状态或验证范围。'
    ]
  };
  const cache = new Map(), parsed = new Map();
  let root;
  function issue(code, file, position, item_id, message, recovery, incomplete = false) {
    report.findings.push({ code, location: location(file, position), item_id: item_id || null, message, recovery });
    if (incomplete) report.execution = 'incomplete';
  }
  function unassessed(code, file, message, item_id = null, position = null) {
    report.unevaluated.push({ code, location: location(file, position), item_id, message, recovery: '人工审阅原文；按需明确选择范围并补齐可定位输入后重跑。' });
  }
  try { root = await realpath(path.resolve(options.root ?? '.')); }
  catch (error) { issue('INPUT_ROOT', options.root ?? '.', null, null, error.message, '提供可读项目根目录。', true); }
  function target(ref) {
    const absolute = path.resolve(root, ref), relative = path.relative(root, absolute);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('路径越过项目根目录');
    return { absolute, relative: relative.replaceAll(path.sep, '/') };
  }
  async function load(ref, role, caller = {}) {
    if (!root) return null;
    try {
      const { absolute, relative } = target(ref);
      if (cache.has(relative)) { cache.get(relative).roles.add(role); return cache.get(relative); }
      const resolved = await realpath(absolute);
      target(resolved);
      const info = await stat(absolute);
      if (!info.isFile()) throw new Error('输入不是普通文件');
      if (info.size > 8 * 1024 * 1024) throw new Error('输入超过 8 MiB，需显式提供较小快照');
      const bytes = await readFile(absolute);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const item = { absolute, resolved, file: relative, bytes, text, sha256: digest(bytes), roles: new Set([role]) };
      cache.set(relative, item);
      return item;
    } catch (error) {
      issue('INPUT_UNREADABLE', caller.file ?? ref, caller.position, caller.id, `无法读取 ${ref}: ${error.message}`, '补齐或修正显式输入路径；不得猜测替代来源。', true);
      return null;
    }
  }
  function markdown(input) {
    if (!input) return null;
    if (parsed.has(input.file)) return parsed.get(input.file);
    try { const doc = parseContent(input.text, input.file); parsed.set(input.file, doc); return doc; }
    catch (error) {
      issue('PARSE_ERROR', input.file, null, null, error.message, '修复 Markdown frontmatter / YAML 解析问题后重跑。', true);
      parsed.set(input.file, null); return null;
    }
  }
  async function resolveSource(reference, entry, name) {
    if (reference.invalid) {
      issue('SOURCE_FORMAT', entry.file, entry.cells[name]?.position ?? entry.position, entry.id, `来源缺少可定位表达：${reference.invalid}`, '使用 项目根相对路径 :: id:已有ID 或 :: heading:准确章节名。'); return null;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference.path)) {
      unassessed('EXTERNAL_SOURCE', entry.file, `未联网读取外部来源 ${reference.path}；需要可审阅的本地证据快照。`, entry.id); return null;
    }
    const input = await load(reference.path, 'source', entry);
    if (!input) return null;
    let matches;
    try {
      if (/\.(?:ya?ml|json)$/i.test(input.file)) {
        const value = /\.json$/i.test(input.file) ? JSON.parse(input.text) : yamlValue(input.text);
        matches = [];
        const walk = node => {
          if (!node || typeof node !== 'object') return;
          if (node.id === reference.locator && reference.type === 'id') matches.push(node);
          for (const [key, child] of Object.entries(node)) {
            if (key === reference.locator && reference.type === 'id') matches.push(child);
            walk(child);
          }
        };
        walk(value);
      } else if (/\.md$/i.test(input.file)) {
        const doc = markdown(input);
        if (!doc) return null;
        matches = (reference.type === 'heading' ? doc.headings : doc.locators).filter(x => x.value === reference.locator);
      } else { unassessed('SOURCE_FORMAT_UNSUPPORTED', input.file, '来源格式不支持条目定位，只绑定原始摘要。', entry.id); return null; }
    } catch (error) {
      issue('PARSE_ERROR', input.file, null, entry.id, error.message, '修复显式来源解析后重跑。', true); return null;
    }
    if (matches.length !== 1) {
      issue('SOURCE_LOCATOR', entry.file, entry.cells[name]?.position ?? entry.position, entry.id, `来源 ${input.file} 的 ${reference.type}:${reference.locator} 匹配 ${matches.length} 处`, '修正已有条目 ID 或准确章节名；歧义定位不能自动选择。'); return null;
    }
    return { file: input.file, type: reference.type, locator: reference.locator, sha256: input.sha256 };
  }
  async function checkDocument(input, role) {
    const doc = markdown(input);
    if (!doc) return null;
    report.scope.documents.push({ file: input.file, role, profile: doc.frontmatter.content_profile ?? null, extracted_items: doc.entries.length });
    if (!doc.supported) unassessed('LEGACY_OR_UNKNOWN_PROFILE', input.file, '未声明支持的 content_profile；仅尽力检查已识别 ID 与显式引用，缺字段不解释为缺陷或内容合格。');
    if (doc.supported) for (const condition of doc.conditions) {
      if (notApplicable(condition.value) && !naReason(condition.value)) issue('NA_REASON', input.file, condition.position, condition.id, '条件项声明不适用但缺少原因', '补充 not-applicable：具体原因。');
    }
    const groups = new Map();
    for (const entry of doc.entries) {
      const group = groups.get(entry.id) ?? []; group.push(entry); groups.set(entry.id, group);
      if (!ID_PATTERN.test(entry.id) || !(entry.id.startsWith(`${entry.kind}-`) || entry.kind === 'SC' && entry.id.startsWith('success-criterion.'))) {
        if (doc.supported) issue('INVALID_ID', entry.file, entry.position, entry.id, 'ID 与所属条目类型不一致或尚未填写。', '使用功能内稳定 ID，重排不改号，删除不复用。');
      }
      if (!doc.supported) continue;
      const required = entry.kind === 'SC' && '权威引用' in entry.fields ? ['权威引用'] : requiredFields[entry.kind];
      for (const name of required) {
        const value = field(entry, name);
        if (noValue(value)) issue('REQUIRED_FIELD', entry.file, entry.cells[name]?.position ?? entry.position, entry.id, `${name} 为空或占位符`, '填写已有依据；未知值关联未决项及补齐动作。');
        else if (placeholder(value)) issue('PLACEHOLDER', entry.file, entry.cells[name]?.position, entry.id, `${name} 尚有占位符`, '替换为真实输入或明确未决项。');
      }
      if ((entry.kind === 'NFR' || entry.kind === 'SC') && !('权威引用' in entry.fields)) {
        if (unknown(field(entry, '目标')) && !ids(field(entry, '未决项'), ['Q']).length) issue('UNKNOWN_TARGET', entry.file, entry.position, entry.id, '目标未知且未关联未决项', '关联 Q ID，保留候选状态、负责人和补齐动作。');
        if (unknown(field(entry, '目标')) && field(entry, '确认状态') === '已确认') issue('TARGET_STATUS', entry.file, entry.position, entry.id, '未知目标标记为已确认', '核对真实决定；未知目标保持候选状态。');
        if (entry.kind === 'SC' && unknown(field(entry, '基线或未知原因')) && !ids(field(entry, '未决项'), ['Q']).length) issue('UNKNOWN_BASELINE', entry.file, entry.position, entry.id, '基线未知且没有补齐项', '关联 Q ID，说明未知原因、负责人和补齐动作。');
      }
    }
    for (const [id, entries] of groups) if (entries.length > 1) for (const entry of entries) issue('DUPLICATE_ID', entry.file, entry.position, id, `ID 重复 ${entries.length} 次`, '消除重复并修复所有关联；不要因排序重编号。');
    if (doc.supported) {
      for (const kind of role === 'spec' ? ['FR', 'NFR', 'AC'] : ['SC']) {
        if (!doc.sections.some(section => section.kind === kind)) issue('SECTION_MISSING', input.file, null, null, `${kind} 缺少可识别章节`, '使用权威模板；未命中条件项注明不适用及原因。');
      }
      for (const section of doc.sections) if (!section.count && section.kind !== 'Q') {
        if (notApplicable(section.text.trim())) {
          // The paragraph-level condition check records missing reasons once.
        } else {
          issue('SECTION_UNPARSED', input.file, section.position, null, `${section.kind} 未提取到 ID 表`, '使用权威模板中的 ID 表，或为条件项明确不适用原因。');
          unassessed('SECTION_UNPARSED', input.file, `${section.kind} 正文未进行结构诊断。`);
        }
      }
    }
    for (const entry of doc.entries) {
      const refFields = { '验收引用': ['AC', 'Q'], '需求引用': ['FR', 'NFR'], '未决项': ['Q'] };
      for (const [name, allowed] of Object.entries(refFields)) {
        const refs = ids(field(entry, name));
        for (const id of refs) {
          if (!allowed.includes(id.split('-')[0])) issue('REFERENCE_KIND', entry.file, entry.cells[name]?.position, entry.id, `${name} 引用了不支持的类型 ${id}`, '修正字段中的关联类型。');
          else if (!groups.has(id)) issue('DANGLING_REFERENCE', entry.file, entry.cells[name]?.position, entry.id, `${name} 指向不存在的 ${id}`, '恢复条目或修正引用；不得猜测映射。');
          else if (groups.get(id).length > 1) unassessed('AMBIGUOUS_REFERENCE', entry.file, `引用 ${id} 重复，无法唯一追溯。`, entry.id);
        }
      }
      if (['FR', 'NFR'].includes(entry.kind)) {
        const ac = ids(field(entry, '验收引用'), ['AC']);
        const pending = ids(field(entry, '验收引用'), ['Q']);
        if (!ac.length && !pending.length && (doc.supported || '验收引用' in entry.fields)) issue('AC_MISSING', entry.file, entry.position, entry.id, '需求没有验收引用或明确待补项', '关联 AC 或待补 Q，并由原有门禁处理未决项。');
        if (pending.length) unassessed('AC_DEFERRED', entry.file, `验收待补 ${pending.join(', ')}，尚未评估验收覆盖。`, entry.id);
        for (const id of ac) {
          const targetEntry = groups.get(id)?.length === 1 ? groups.get(id)[0] : null;
          if (targetEntry && !ids(field(targetEntry, '需求引用')).includes(entry.id)) issue('REFERENCE_MISMATCH', entry.file, entry.position, entry.id, `${id} 没有反向关联本需求`, '核对需求与验收引用并同时修正。');
        }
      }
      if (entry.kind === 'AC') {
        const requirements = ids(field(entry, '需求引用'), ['FR', 'NFR']);
        if (!requirements.length && (doc.supported || '需求引用' in entry.fields)) issue('REQUIREMENT_MISSING', entry.file, entry.position, entry.id, '验收缺少需求来源', '关联已有 FR/NFR，不由验收示例反推新规则。');
        for (const id of requirements) {
          const requirement = groups.get(id)?.length === 1 ? groups.get(id)[0] : null;
          if (requirement && !ids(field(requirement, '验收引用')).includes(entry.id)) issue('REFERENCE_MISMATCH', entry.file, entry.position, entry.id, `${id} 未引用本验收`, '核对双向关联。');
        }
      }
      for (const name of ['来源引用', '数据来源', '权威引用']) {
        if (!(name in entry.fields)) continue;
        const value = entry.cells[name].raw;
        if (noValue(field(entry, name)) || placeholder(field(entry, name))) continue;
        for (const ref of sourceRefs(value)) await resolveSource(ref, entry, name);
        if (name === '权威引用') unassessed('STATEMENT_MANUAL_REVIEW', entry.file, '成功标准复用权威 statement；指标、窗口、未知原因等语义完整性由人工逐项审查。', entry.id);
      }
    }
    return doc;
  }
  async function trace(doc) {
    if (!doc) return;
    const requirements = doc.entries.filter(e => ['FR', 'NFR'].includes(e.kind));
    const acs = new Map(doc.entries.filter(e => e.kind === 'AC').map(e => [e.id, e]));
    report.trace = { links: [], gaps: [], scope: '仅显式 --slice；未提供的依赖未知，不推断未受影响' };
    for (const ref of options.slices ?? []) {
      const input = await load(ref, 'slice'); if (!input) continue;
      let slice;
      try { slice = yamlValue(input.text); }
      catch (error) { issue('PARSE_ERROR', input.file, null, null, error.message, '修复显式 Slice YAML 解析问题后重跑。', true); continue; }
      if (slice?.schema_version !== 3 || !slice.acceptance || typeof slice.acceptance !== 'object' || Array.isArray(slice.acceptance)) {
        unassessed('SLICE_UNSUPPORTED', input.file, '仅支持现有 Slice schema v3 acceptance mapping'); continue;
      }
      for (const [id, acceptance] of Object.entries(slice.acceptance)) {
        if (!acceptance || typeof acceptance.source !== 'string' || typeof acceptance.locator !== 'string') { unassessed('SLICE_LOCATOR_UNSUPPORTED', input.file, `acceptance ${id} 结构不支持。`); continue; }
        const locator = acceptance.locator.replace(/^id:/, '');
        const resolved = await resolveSource({ path: acceptance.source, type: 'id', locator }, { file: input.file, id, cells: {} }, 'source');
        if (!resolved || resolved.file !== doc.file || !acs.has(locator)) { report.trace.gaps.push({ slice: input.file, acceptance: id, reason: '定位未映射到本次 Spec 的 AC，影响未知' }); continue; }
        if (doc.entries.filter(e => e.id === locator).length !== 1) { report.trace.gaps.push({ slice: input.file, acceptance: id, reason: 'Spec ID 重复，无法映射' }); continue; }
        const referring = collection => Object.entries(collection ?? {}).filter(([, item]) => Array.isArray(item?.acceptance_refs) && item.acceptance_refs.includes(id));
        report.trace.links.push({ spec: doc.file, ac: locator, requirements: ids(field(acs.get(locator), '需求引用'), ['FR', 'NFR']), slice: input.file, acceptance: id,
          verification: referring(slice.verification).map(([key, value]) => ({ id: key, command: value.command ?? null, expected_evidence: value.expected_evidence ?? null })),
          work_units: referring(slice.work_units).map(([key]) => key), evidence_status: '引用可见；未执行命令、未验证证据内容或批准' });
      }
    }
    for (const requirement of requirements) if (!report.trace.links.some(link => link.requirements.includes(requirement.id))) report.trace.gaps.push({ requirement: requirement.id, reason: '显式输入内没有下游映射；依赖未知' });
    for (const link of report.trace.links) if (!link.verification.length) report.trace.gaps.push({ ac: link.ac, slice: link.slice, reason: '未找到 acceptance_refs 对应的 verification' });
  }
  if (root && options.command === 'check') {
    if (!options.plan && !options.spec) issue('INPUT_REQUIRED', '.', null, null, 'check 至少需要 --plan 或 --spec', '显式指定要诊断的文档。', true);
    if (options.plan) { const input = await load(options.plan, 'plan'); if (input) await checkDocument(input, 'plan'); }
    if (options.spec) { const input = await load(options.spec, 'spec'); if (input) await trace(await checkDocument(input, 'spec')); }
    else if (options.slices?.length) issue('INPUT_REQUIRED', '.', null, null, '--slice 需要 --spec', '提供用于追溯的 Spec。', true);
  } else if (root && options.command === 'diff') {
    const before = options.before ? await load(options.before, 'before') : null;
    const after = options.after ? await load(options.after, 'after') : null;
    report.diff = { status: '无法比较旧内容', entries: [], raw_difference: null };
    if (!options.before || !options.after) issue('BASELINE_MISSING', options.before ?? '.', null, null, '旧基线或新文档缺失，无法比较', '提供可读的显式 --before 和 --after。', true);
    if (before && after) {
      const oldDoc = markdown(before), newDoc = markdown(after);
      let prefix = 0, suffix = 0;
      while (prefix < Math.min(before.bytes.length, after.bytes.length) && before.bytes[prefix] === after.bytes[prefix]) prefix++;
      while (suffix < Math.min(before.bytes.length, after.bytes.length) - prefix && before.bytes[before.bytes.length - 1 - suffix] === after.bytes[after.bytes.length - 1 - suffix]) suffix++;
      report.diff.raw_difference = { encoding: 'base64', common_prefix_bytes: prefix, common_suffix_bytes: suffix, before_sha256: before.sha256, after_sha256: after.sha256, removed: before.bytes.subarray(prefix, before.bytes.length - suffix).toString('base64'), added: after.bytes.subarray(prefix, after.bytes.length - suffix).toString('base64') };
      if (oldDoc && newDoc) {
        report.diff.status = 'compared';
        const unparsedKinds = new Set();
        for (const [doc, role] of [[oldDoc, 'before'], [newDoc, 'after']]) {
          report.scope.documents.push({ file: doc.file, role, profile: doc.frontmatter.content_profile ?? null, extracted_items: doc.entries.length });
          if (!doc.supported) continue;
          for (const kind of ['FR', 'NFR', 'AC']) if (!doc.sections.some(section => section.kind === kind)) {
            unparsedKinds.add(kind);
            unassessed('SECTION_MISSING', doc.file, `${kind} 缺少可识别章节；该类条目无法可靠比较增删。`);
          }
          for (const section of doc.sections) if (!section.count && !notApplicable(section.text.trim()) && section.kind !== 'Q') {
            unparsedKinds.add(section.kind);
            unassessed('SECTION_UNPARSED', doc.file, `${section.kind} 未提取到 ID 表；该类条目无法可靠比较增删。`, null, section.position);
          }
        }
        if (!oldDoc.supported || !newDoc.supported || unparsedKinds.size) {
          report.diff.status = 'partially-compared';
          unassessed('PARTIAL_DIFF', after.file, '格式或章节存在提取缺口；只比较可识别范围，缺口不判为条目增删。原始字节差异覆盖全部内容。');
        }
        const allIds = [...new Set([...oldDoc.entries, ...newDoc.entries].map(e => e.id))].sort();
        for (const id of allIds) {
          const oldItems = oldDoc.entries.filter(e => e.id === id), newItems = newDoc.entries.filter(e => e.id === id);
          if (oldItems.length > 1 || newItems.length > 1) { issue('DUPLICATE_ID', after.file, newItems[0]?.position, id, '差异中的 ID 不唯一，无法比较该条目', '消除歧义，保留原始字节证据。'); report.diff.entries.push({ id, change: 'unassessed' }); continue; }
          const left = oldItems[0], right = newItems[0];
          if (unparsedKinds.has(left?.kind) || unparsedKinds.has(right?.kind) || (!left || !right) && (!oldDoc.supported || !newDoc.supported)) {
            report.diff.entries.push({ id, change: 'unassessed', reason: '所属章节提取不完整，不能据此判断新增或删除', location: location(right ? after.file : before.file, (right ?? left).position) });
            continue;
          }
          const values = item => item && Object.fromEntries(Object.entries(item.cells).map(([key, cell]) => [key, cell.raw]));
          const oldFields = values(left), newFields = values(right);
          if (JSON.stringify(oldFields) === JSON.stringify(newFields)) continue;
          const referenceChanges = ['来源引用', '验收引用', '需求引用', '未决项', '权威引用', '数据来源'].filter(key => oldFields?.[key] !== newFields?.[key]);
          report.diff.entries.push({ id, change: !left ? 'added' : !right ? 'removed' : 'modified', before: oldFields ?? null, after: newFields ?? null, reference_changes: referenceChanges, location: location(right ? after.file : before.file, (right ?? left).position) });
        }
        report.diff.note = '重排无重新编号；未按 ID 展示的变化见原始字节差异。语义等价、ID 历史复用、批准与下游影响未自动判定。';
      }
    }
  } else if (root) issue('COMMAND_INVALID', '.', null, null, '命令必须为 check 或 diff', '查看 --help。', true);
  // Test hook exercises an actual read/re-read race without changing runtime CLI behavior.
  if (hooks.beforeFreshnessCheck) await hooks.beforeFreshnessCheck();
  for (const input of cache.values()) {
    report.inputs.push({ file: input.file, roles: [...input.roles].sort(), bytes: input.bytes.length, sha256: input.sha256 });
    try {
      if (await realpath(input.absolute) !== input.resolved || digest(await readFile(input.absolute)) !== input.sha256) throw new Error('读取期间内容或真实路径变化');
    } catch (error) { issue('INPUT_DRIFT', input.file, null, null, error.message, '冻结输入并重新运行；本报告不得作为当前证据。', true); }
  }
  report.inputs.sort((a, b) => a.file.localeCompare(b.file));
  report.summary = { findings: report.findings.length, unevaluated: report.unevaluated.length, result: '诊断证据，不是内容合格或流转许可' };
  return { report, exitCode: report.execution === 'completed' ? 0 : 2 };
}

export function renderReport(report) {
  const lines = [`inspect-plan-spec ${report.tool_version} · ${report.mode} · ${report.execution}`, report.summary.result];
  for (const input of report.inputs) lines.push(`输入 ${input.file} ${input.sha256}`);
  for (const item of [...report.findings, ...report.unevaluated]) lines.push(`${item.code} ${item.location.file}:${item.location.line}:${item.location.column}${item.item_id ? ` [${item.item_id}]` : ''} ${item.message}\n  恢复：${item.recovery}`);
  for (const item of report.manual_review) lines.push(`人工审查：${item}`);
  if (report.diff) { lines.push(`差异：${report.diff.status}`, JSON.stringify(report.diff, null, 2)); }
  if (report.trace) lines.push(`追溯：${JSON.stringify(report.trace, null, 2)}`);
  return `${lines.join('\n')}\n`;
}
