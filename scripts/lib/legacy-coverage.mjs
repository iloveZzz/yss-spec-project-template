/**
 * legacy_coverage 的压缩写法与展开。
 *
 * 117 条旧检查映射里，owner、input_patterns、disposition 等字段逐条相同，gate_ids、display_gate、source_ref
 * 也都能由 gate 与 old_id 推出。profile 里只写逐条真正不同的部分，加载时展开成与压缩前完全相同的对象
 * （字段与字段顺序都不变，所以 policy_digest 不变），下游消费者看到的仍是展开后的 legacy_coverage。
 * 没有 legacy_coverage_defaults 的旧写法原样放行，按提交读取历史版本的 profile 因此不受影响。
 */

const REQUIRED_ROW_KEYS = ['old_id', 'check_id', 'group', 'command', 'gate'];
const DEFAULT_KEYS = ['owner', 'input_patterns', 'depends_on', 'duration_ms', 'disposition', 'audit_status', 'counterexample_ref', 'evidence_ref'];
const OPTIONAL_ROW_KEYS = ['replacement_command', 'retirement_disposition', 'gate_ids', 'source_ref', ...DEFAULT_KEYS];
const ROW_KEYS = new Set([...REQUIRED_ROW_KEYS, ...OPTIONAL_ROW_KEYS]);

function ensure(condition, message) {
  if (!condition) throw new TypeError(`LEGACY_COVERAGE: ${message}`);
}

/** 就地展开 config.legacy_coverage 并移除辅助键；没有 legacy_coverage_defaults 时什么也不做。 */
export function expandLegacyCoverage(config) {
  if (config.legacy_coverage_defaults === undefined && config.legacy_coverage_gates === undefined) return config;
  const defaults = config.legacy_coverage_defaults;
  const gates = config.legacy_coverage_gates;
  ensure(defaults && typeof defaults === 'object' && !Array.isArray(defaults), 'legacy_coverage_defaults 必须是对象');
  ensure(gates && typeof gates === 'object' && !Array.isArray(gates), 'legacy_coverage_gates 必须是对象（门禁 → 展示编号）');
  for (const key of Object.keys(defaults)) ensure(DEFAULT_KEYS.includes(key), `legacy_coverage_defaults 含未知字段 ${key}`);
  for (const key of DEFAULT_KEYS) ensure(key in defaults, `legacy_coverage_defaults 缺少 ${key}`);
  ensure(Array.isArray(config.legacy_coverage), 'legacy_coverage 必须是数组');

  const seen = new Set();
  config.legacy_coverage = config.legacy_coverage.map((row, index) => {
    const where = `legacy_coverage[${index}]${row?.old_id ? `（${row.old_id}）` : ''}`;
    ensure(row && typeof row === 'object' && !Array.isArray(row), `${where} 必须是对象`);
    for (const key of Object.keys(row)) ensure(ROW_KEYS.has(key), `${where} 含未知字段 ${key}`);
    for (const key of REQUIRED_ROW_KEYS) ensure(typeof row[key] === 'string' && row[key], `${where} 缺少 ${key}`);
    ensure(!seen.has(row.old_id), `${where} old_id 重复`);
    seen.add(row.old_id);
    ensure(typeof gates[row.gate] === 'string' && gates[row.gate], `${where} 的 gate ${row.gate} 没有登记展示编号`);
    ensure((row.replacement_command === undefined) === (row.retirement_disposition === undefined), `${where} 的 replacement_command 与 retirement_disposition 必须同时出现`);
    if (row.gate_ids !== undefined) ensure(Array.isArray(row.gate_ids) && row.gate_ids.length > 0 && row.gate_ids.every((id) => typeof id === 'string' && id), `${where} 的 gate_ids 无效`);

    const pick = (key) => structuredClone(Object.hasOwn(row, key) ? row[key] : defaults[key]);
    const auditStatus = pick('audit_status');
    const evidenceRef = pick('evidence_ref');
    // 字段顺序必须与压缩前一致：policy_digest 是对展开后配置做 JSON.stringify 得到的
    return {
      old_id: row.old_id,
      check_id: row.check_id,
      group: row.group,
      command: row.command,
      ...(row.replacement_command !== undefined ? { replacement_command: row.replacement_command, retirement_disposition: row.retirement_disposition } : {}),
      owner: pick('owner'),
      replacement_gate: row.gate,
      gate_ids: row.gate_ids ? [...row.gate_ids] : [row.gate],
      input_patterns: pick('input_patterns'),
      depends_on: pick('depends_on'),
      duration_ms: pick('duration_ms'),
      disposition: pick('disposition'),
      audit_status: auditStatus,
      equivalent_assertion: { status: auditStatus, source_ref: row.source_ref ?? `${evidenceRef}#${row.old_id}` },
      counterexample_ref: pick('counterexample_ref'),
      evidence_ref: evidenceRef,
      display_gate: gates[row.gate],
    };
  });
  delete config.legacy_coverage_defaults;
  delete config.legacy_coverage_gates;
  return config;
}

/** 把已展开的 legacy_coverage 压缩成 profile 里的文本（迁移与测试用）；只写逐条不同的部分。 */
export function compactLegacyCoverage(rows) {
  const first = rows[0];
  const defaults = Object.fromEntries(DEFAULT_KEYS.map((key) => [key, first[key]]));
  const gates = {};
  for (const row of rows) gates[row.replacement_gate] = row.display_gate;
  const compact = rows.map((row) => {
    const out = { old_id: row.old_id, check_id: row.check_id, group: row.group, gate: row.replacement_gate };
    if (JSON.stringify(row.gate_ids) !== JSON.stringify([row.replacement_gate])) out.gate_ids = row.gate_ids;
    out.command = row.command;
    if (row.replacement_command !== undefined) { out.replacement_command = row.replacement_command; out.retirement_disposition = row.retirement_disposition; }
    for (const key of DEFAULT_KEYS) if (JSON.stringify(row[key]) !== JSON.stringify(defaults[key])) out[key] = row[key];
    if (row.equivalent_assertion.source_ref !== `${row.evidence_ref}#${row.old_id}`) out.source_ref = row.equivalent_assertion.source_ref;
    return out;
  });
  return { defaults, gates, rows: compact };
}
