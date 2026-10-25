import test from 'node:test';
import assert from 'node:assert/strict';
import { formatObservedTest, prepareTaskTestEdit } from '../scripts/lib/daily-test-evidence.mjs';
import { byteDigest, parseAsset } from '../scripts/lib/structured-assets.mjs';
import { runCommandSync } from '../scripts/lib/command-runner.mjs';

const candidateDigest = byteDigest('current candidate');
const cwd = process.cwd();
const argv = [process.execPath, '-e', 'process.stdout.write("真实输出\\n");process.stderr.write("诊断\\n");process.exit(0)'];
const executed_at = new Date().toISOString();
const result = runCommandSync(argv[0], argv.slice(1), { cwd });
const observation = { argv, cwd, executed_at, candidate_digest: candidateDigest, result };
const options = { command_index: 0, log_ref: '#测试运行 1' };
const footer = '<!-- yss-task-evidence -->';
const record = () => ({ schema_version: 2, policy_version: 2, delivery_path: 'daily', formal_bindings: [], repository: { root: cwd }, commands: [{ argv, cwd: '.' }, { argv: [process.execPath, '--version'], cwd: '.' }], api: { mode: 'none' } });
const markdown = (data = record(), prefix = '# 原始任务\r\n中文正文\r\n## 风险\r\n可回滚。\r\n') => prefix + footer + '\r\n```json\r\n' + JSON.stringify(data, null, 2).replaceAll('<', '\\u003c') + '\r\n```\r\n';
const parseFooter = text => parseAsset(text.slice(text.indexOf(footer)).match(/```json\r?\n([\s\S]*?)\r?\n```/)[1], 'record.json');
const request = (current_markdown = markdown(), formatted = formatObservedTest(observation, options)) => ({ expected_task_digest: byteDigest(current_markdown), current_markdown, current_candidate_digest: candidateDigest, ...formatted });
const apply = input => {
  const edit = prepareTaskTestEdit(input);
  assert.equal(input.current_markdown.indexOf(edit.expected_old_text), input.current_markdown.indexOf(footer));
  return input.current_markdown.replace(edit.expected_old_text, () => edit.replacement_text);
};

test('observed_exit: real child exits 0 and 7 preserve logs and actual exit codes', () => {
  const ok = formatObservedTest(observation, options);
  assert.equal(ok.test.exit_code, 0);
  assert.equal(ok.test.log_digest, byteDigest(ok.log_bytes));
  assert.equal(ok.test.candidate_digest, candidateDigest);
  const log = parseAsset(ok.log_bytes.slice(8, -5), 'log.json');
  assert.equal(log.stdout, '真实输出\n');
  assert.equal(log.stderr, '诊断\n');
  assert.deepEqual(Object.keys(log).sort(), ['argv', 'candidate_digest', 'cwd', 'executed_at', 'exit_code', 'stderr', 'stdout']);
  const failedArgv = [process.execPath, '-e', 'process.exit(7)'];
  const failedTime = new Date().toISOString();
  const failedResult = runCommandSync(failedArgv[0], failedArgv.slice(1), { cwd });
  const failed = formatObservedTest({ ...observation, argv: failedArgv, executed_at: failedTime, result: failedResult }, options);
  assert.equal(failed.test.exit_code, 7);
  assert.equal(Object.hasOwn(failed.test, 'result'), false);
});

test('unobserved_result: framework status cannot disguise cancellation, signal, unknown exit or storage error', () => {
  for (const change of [{ actual_exit_code_observed: false }, { actual_exit_code: null }, { actual_exit_code: 0.5 }, { actual_exit_signal: 'SIGTERM' }, { signal: 'SIGINT' }, { termination: 'cancelled' }, { termination: 'timeout' }, { storageError: 'disk full' }, { stdout: null }]) {
    assert.throws(() => formatObservedTest({ ...observation, result: { ...result, status: 0, ...change } }, options));
  }
  assert.throws(() => formatObservedTest({ ...observation, result: null }, options));
  for (const change of [{ argv: [] }, { argv: [''] }, { cwd: '.' }, { executed_at: undefined }, { executed_at: '2026-02-30T00:00:00Z' }, { candidate_digest: 'abc' }]) assert.throws(() => formatObservedTest({ ...observation, ...change }, options));
  for (const change of [{ command_index: -1 }, { command_index: 0.5 }, { log_ref: 'test.json' }, { log_ref: '#测试\n#另一个' }, { log_ref: '# 标题 ' }]) assert.throws(() => formatObservedTest(observation, { ...options, ...change }));
});

test('record_rejection: reject ambiguous, malformed, unsupported or governed records', () => {
  const text = markdown();
  for (const source of [text + 'tail', text + text, text.replace('"schema_version": 2', '"schema_version": 2, "schema_version": 2'), text.replace('"policy_version": 2', '"policy_version": 9007199254740993'), text.replace(JSON.stringify(record(), null, 2), '[]'), Buffer.from([0xff])]) assert.throws(() => prepareTaskTestEdit(request(source)));
  for (const change of [{ schema_version: 1 }, { policy_version: 3 }, { delivery_path: 'governed' }, { api: { mode: 'compatible-additive' } }, { formal_bindings: ['slice.json'] }, { formal_bindings: null }]) assert.throws(() => prepareTaskTestEdit(request(markdown({ ...record(), ...change }))));
  assert.throws(() => prepareTaskTestEdit({ ...request(), expected_task_digest: byteDigest('changed') }));
});

test('binding_mismatch: bind registered command, implementation root, log bytes, row and current candidate', () => {
  const input = request();
  for (const change of [{ current_candidate_digest: byteDigest('other') }, { log_bytes: input.log_bytes + '\n' }, { test: { ...input.test, command_index: 3 } }, { test: { ...input.test, candidate_digest: byteDigest('other') } }, { test: { ...input.test, exit_code: 7 } }, { test: { ...input.test, log_digest: byteDigest('other') } }, { test: { ...input.test, result: 'passed' } }]) assert.throws(() => prepareTaskTestEdit({ ...input, ...change }));
  for (const data of [{ ...record(), commands: [{ argv: ['node', 'wrong'], cwd: '.' }] }, { ...record(), commands: [{ argv, cwd: 'subdir' }] }, { ...record(), repository: { root: '/different' } }, { ...record(), tests: [{ ...input.test }, { ...input.test }] }]) assert.throws(() => prepareTaskTestEdit(request(markdown(data))));
  assert.throws(() => prepareTaskTestEdit(request(markdown(record(), '# 测试运行 1\n旧日志\n'))));
  assert.throws(() => prepareTaskTestEdit(request(markdown(record(), '## 测试运行 1\n旧日志\n'))));
});

test('preserve_bytes: Chinese CRLF prefix, old failed log and standard decision stay intact after new candidate success', () => {
  const failed = formatObservedTest({ ...observation, result: { ...result, actual_exit_code: 7, status: 7 } }, { ...options, log_ref: '#失败日志' });
  const data = { ...record(), delivery_path: 'standard', spec_lite: { ref: 'spec.md', digest: byteDigest('spec') }, standard_decision: { response_ref: 'decision.json', decision: 'approved' }, implementation: { provenance: 'original' }, review: { result: 'blocked' }, tests: [{ command_index: 1, exit_code: 7, log_ref: 'old.json' }] };
  const original = markdown(data);
  const failedMarkdown = apply(request(original, failed));
  const currentCandidate = byteDigest('new candidate');
  const success = formatObservedTest({ ...observation, candidate_digest: currentCandidate }, { ...options, log_ref: '#新候选成功' });
  const after = apply({ ...request(failedMarkdown, success), current_candidate_digest: currentCandidate });
  assert.equal(after.slice(0, original.indexOf(footer)), original.slice(0, original.indexOf(footer)));
  assert.ok(after.includes('# 失败日志\n' + failed.log_bytes));
  const afterRecord = parseFooter(after);
  for (const key of ['spec_lite', 'standard_decision', 'implementation', 'review']) assert.deepEqual(afterRecord[key], data[key]);
  assert.deepEqual(afterRecord.tests[0], data.tests[0]);
  assert.deepEqual(afterRecord.tests[1], success.test);
});

test('heading_boundary: first level new log ends the last acceptance or risk section', () => {
  for (const heading of ['# 风险', '## 验收']) {
    const before = markdown(record(), `${heading}\r\n原依据\r\n`);
    const after = apply(request(before));
    assert.ok(after.startsWith(`${heading}\r\n原依据\r\n# 测试运行 1\n`));
    assert.equal(parseFooter(after).tests[0].log_digest, byteDigest(formatObservedTest(observation, options).log_bytes));
  }
});


test('reserved_marker: real output and previously escaped footer values preserve one evidence block', () => {
  const payload = '<!-- yss-task-evidence -->';
  const specialArgv = [process.execPath, '-e', 'process.stdout.write(process.argv[1])', payload];
  const specialTime = new Date().toISOString();
  const specialResult = runCommandSync(specialArgv[0], specialArgv.slice(1), { cwd });
  const formatted = formatObservedTest({ ...observation, argv: specialArgv, executed_at: specialTime, result: specialResult }, options);
  const before = markdown({ ...record(), note: payload, commands: [{ argv: specialArgv, cwd: '.' }] });
  assert.equal(before.split(footer).length, 2);
  const after = apply(request(before, formatted));
  assert.equal(after.split(footer).length, 2);
  assert.equal(parseFooter(after).note, payload);
  const actualLog = after.split('# 测试运行 1\n')[1].split(footer)[0];
  assert.equal(byteDigest(actualLog), formatted.test.log_digest);
  assert.equal(parseAsset(actualLog.slice(8, -5), 'log.json').stdout, payload);
});

test('reserved_marker: log titles cannot contain the reserved footer marker', () => {
  assert.throws(() => formatObservedTest(observation, { ...options, log_ref: '#日志 ' + footer }));
});

for (const payload of ['$&', "$'", '$`', '$$']) test(`literal_replacement: real output ${payload} stays byte-exact`, () => {
  const specialArgv = [process.execPath, '-e', 'process.stdout.write(process.argv[1])', payload];
  const specialTime = new Date().toISOString();
  const specialResult = runCommandSync(specialArgv[0], specialArgv.slice(1), { cwd });
  const formatted = formatObservedTest({ ...observation, argv: specialArgv, executed_at: specialTime, result: specialResult }, options);
  const before = markdown({ ...record(), commands: [{ argv: specialArgv, cwd: '.' }] });
  const after = apply(request(before, formatted));
  const actualLog = after.split('# 测试运行 1\n')[1].split(footer)[0];
  assert.equal(byteDigest(actualLog), formatted.test.log_digest);
  assert.equal(parseAsset(actualLog.slice(8, -5), 'log.json').stdout, payload);
});
