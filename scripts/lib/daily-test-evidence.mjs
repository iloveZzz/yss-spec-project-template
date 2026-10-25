import path from 'node:path';
import { byteDigest, parseAsset } from './structured-assets.mjs';

const marker = '<!-- yss-task-evidence -->';
const digestPattern = /^sha256:[a-f0-9]{64}$/;
// Keep the Markdown delimiter out of JSON strings without changing their values.
const jsonText = value => JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
const testKeys = ['command_index', 'exit_code', 'candidate_digest', 'log_ref', 'log_digest'];
const logKeys = ['argv', 'cwd', 'exit_code', 'executed_at', 'stdout', 'stderr', 'candidate_digest'];
const requireValue = (condition, message) => { if (!condition) throw new TypeError(`DAILY_TEST_EVIDENCE: ${message}`); };
const isIndex = value => Number.isSafeInteger(value) && value >= 0;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function utf8(value) {
  requireValue(typeof value === 'string' || Buffer.isBuffer(value), 'expected UTF-8 text');
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.from(value));
  requireValue(typeof value !== 'string' || text === value, 'invalid UTF-8 string');
  return text;
}
function timestamp(value) {
  requireValue(typeof value === 'string', 'executed_at must be captured by the host');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  requireValue(match && Number.isFinite(Date.parse(value)), 'invalid RFC3339 executed_at');
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  requireValue(month >= 1 && month <= 12 && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] && hour < 24 && minute < 60 && second < 60, 'invalid RFC3339 date');
}
function logTitle(ref) {
  requireValue(typeof ref === 'string' && /^#[^#\r\n`]+$/.test(ref) && ref.slice(1).trim() === ref.slice(1) && !/[\u0000-\u001f\u007f]/.test(ref), 'log_ref must be one same-Ticket #heading');
  requireValue(!ref.includes(marker), 'log title contains reserved evidence marker');
  return ref.slice(1);
}
function validateLog(log) {
  requireValue(exactKeys(log, logKeys), 'unexpected log fields');
  requireValue(Array.isArray(log.argv) && log.argv.length > 0 && log.argv.every(arg => typeof arg === 'string') && log.argv[0].trim().length > 0, 'invalid argv');
  requireValue(typeof log.cwd === 'string' && path.isAbsolute(log.cwd), 'cwd must be absolute');
  requireValue(isIndex(log.exit_code), 'exit code must be an observed nonnegative integer');
  requireValue(typeof log.stdout === 'string' && typeof log.stderr === 'string', 'missing observed output');
  requireValue(digestPattern.test(log.candidate_digest), 'invalid candidate digest');
  timestamp(log.executed_at);
}

/** Format observed results only; this function neither executes nor registers them. */
export function formatObservedTest({ argv, cwd, executed_at, candidate_digest, result }, { command_index, log_ref }) {
  requireValue(result && result.actual_exit_code_observed === true && isIndex(result.actual_exit_code) && !result.actual_exit_signal && !result.signal && !result.termination && !result.storageError, 'exit not observed cleanly or log storage failed');
  requireValue(isIndex(command_index), 'invalid command_index');
  logTitle(log_ref);
  const log = { argv, cwd, exit_code: result.actual_exit_code, executed_at, stdout: result.stdout, stderr: result.stderr, candidate_digest };
  validateLog(log);
  const log_bytes = '```json\n' + jsonText(log) + '\n```\n';
  return { log_bytes, test: { command_index, exit_code: log.exit_code, candidate_digest, log_ref, log_digest: byteDigest(log_bytes) } };
}

/** Return an exact footer edit; the host must reread and check before applying it. */
export function prepareTaskTestEdit({ expected_task_digest, current_markdown, current_candidate_digest, log_bytes, test }) {
  const text = utf8(current_markdown);
  requireValue(digestPattern.test(expected_task_digest) && byteDigest(text) === expected_task_digest, 'Ticket changed before edit');
  requireValue(digestPattern.test(current_candidate_digest), 'invalid current candidate');
  requireValue(text.split(marker).length === 2, 'expected one evidence marker');
  const offset = text.indexOf(marker), prefix = text.slice(0, offset), old = text.slice(offset);
  requireValue(!offset || text[offset - 1] === '\n', 'footer marker must start a line');
  const footer = /^<!-- yss-task-evidence -->\r?\n```json\r?\n([\s\S]*?)\r?\n```[\t ]*(?:\r?\n[\t ]*)*$/.exec(old);
  requireValue(footer, 'footer must be a final JSON fence');
  const record = parseAsset(footer[1], 'record.json');
  requireValue(record.schema_version === 2 && record.policy_version === 2 && ['daily', 'standard'].includes(record.delivery_path) && record.api?.mode === 'none' && Array.isArray(record.formal_bindings) && record.formal_bindings.length === 0, 'unsupported ordinary record, API or formal binding');
  requireValue(exactKeys(test, testKeys) && isIndex(test.command_index) && isIndex(test.exit_code), 'invalid test row');
  requireValue(test.candidate_digest === current_candidate_digest, 'test candidate drift');
  const title = logTitle(test.log_ref);
  // Match the native reader's trimmed ATX heading text.
  requireValue(!prefix.split('\n').some(line => /^#{1,6} /.test(line.trim()) && line.trim().replace(/^#{1,6} /, '').trim() === title), 'log heading already exists');
  const bytes = utf8(log_bytes), fence = /^```json\n([\s\S]*)\n```\n$/.exec(bytes);
  requireValue(fence && test.log_digest === byteDigest(bytes), 'log byte digest mismatch');
  const log = parseAsset(fence[1], 'log.json');
  validateLog(log);
  requireValue(log.exit_code === test.exit_code && log.candidate_digest === current_candidate_digest, 'log result or candidate mismatch');
  requireValue(Array.isArray(record.commands) && test.command_index < record.commands.length, 'unregistered command index');
  const command = record.commands[test.command_index], root = record.repository?.root;
  requireValue(typeof root === 'string' && path.isAbsolute(root) && typeof command?.cwd === 'string' && Array.isArray(command.argv), 'invalid registered implementation command');
  requireValue(log.cwd === root && path.resolve(root, command.cwd) === root && JSON.stringify(command.argv) === JSON.stringify(log.argv), 'registered argv/cwd/root mismatch');
  const tests = record.tests ?? [];
  requireValue(Array.isArray(tests), 'invalid tests array');
  const indices = new Set();
  for (const row of tests) {
    requireValue(row && isIndex(row.command_index) && row.command_index < record.commands.length && !indices.has(row.command_index), 'ambiguous registered test indices');
    indices.add(row.command_index);
  }
  const existing = tests.findIndex(row => row.command_index === test.command_index);
  record.tests = tests.slice();
  if (existing < 0) record.tests.push({ ...test });
  else record.tests[existing] = { ...test };
  return { expected_old_text: old, replacement_text: `# ${title}\n${bytes}${marker}\n\`\`\`json\n${jsonText(record)}\n\`\`\`\n` };
}
