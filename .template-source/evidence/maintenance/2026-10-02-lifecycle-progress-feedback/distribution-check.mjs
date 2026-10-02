import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const root = '/Users/zhudaoming/Projects/yss-spec-project-template';
const backup = '/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-lifecycle-feedback-before-e6jwyibl';
const resultPath = '/tmp/yss-lifecycle-feedback-distribution-check.json';
const {parseDocument} = await import(pathToFileURL(path.join(root, 'scripts/vendor/yaml.mjs')));
const started = Date.now();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = ref => fs.readFileSync(path.join(root, ref));
const yaml = bytes => {
  const document = parseDocument(bytes.toString(), {uniqueKeys: true});
  assert.deepEqual(document.errors, []);
  return document.toJS({maxAliasCount: 0});
};
const checks = [];
const check = (id, information, operation) => {
  try {
    operation();
    checks.push({id, ...information, status: 'passed'});
  } catch (error) {
    checks.push({id, ...information, status: 'failed', error: error.message});
  }
};
const snapshots = [];
let inputError = null;

try {
  const originals = [
    ...JSON.parse(fs.readFileSync(path.join(backup, 'baseline.json'))),
    ...JSON.parse(fs.readFileSync(path.join(backup, 'submodules-baseline.json'))),
  ];
  const common = [
    'scripts/lifecycle-status',
    'scripts/lib/lifecycle-status.mjs',
    'scripts/lib/lifecycle-presentation.mjs',
    '.template-spec/process/document-writing.md',
  ];
  const progress = yaml(read('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml')).user_progress_report;
  const packages = [
    {package: 'create-yss-spec', source: '.', owner: 'yss-product-lifecycle'},
    ...['backend', 'frontend', 'design'].map(side => ({
      package: side === 'design' ? 'create-yss-strategic-design' : `create-yss-harness-${side}`,
      source: `submodules/yss-harness-${side}-agent`,
      owner: side === 'design' ? 'yss-strategic-design' : 'harness-orchestrator',
    })),
  ];

  for (const item of packages) {
    const cli = `submodules/${item.package}`;
    const snapshot = JSON.parse(read(`${cli}/template.snapshot.json`));
    snapshots.push({package: item.package, source_state: snapshot.sourceState, template_commit: snapshot.templateCommit});
    const refs = [
      ...common,
      `.agents/skills/${item.owner}/references/orchestration-contract.yaml`,
      `.agents/skills/${item.owner}/SKILL.md`,
    ];
    for (const ref of refs) {
      const entry = snapshot.files?.[ref];
      if (snapshot.files && !entry) {
        check('snapshot-file-present', {package: item.package, ref}, () => assert.ok(entry));
        continue;
      }
      const bytes = read(`${cli}/template/${entry?.blob ?? ref}`);
      const source = read(path.join(item.source, ref));
      if (entry) check('snapshot-blob-hash', {package: item.package, ref, actual_sha256: sha(bytes), expected_sha256: entry.digest}, () => assert.equal(sha(bytes), entry.digest));
      check('snapshot-final-source-bytes', {package: item.package, ref, actual_sha256: sha(bytes), expected_sha256: sha(source)}, () => assert.deepEqual(bytes, source));
      if (ref.endsWith('orchestration-contract.yaml')) {
        const expected = item.owner === 'yss-product-lifecycle' ? progress : {...progress, owner: item.owner, reference: progress.writing_reference};
        check('user-progress-report-policy', {package: item.package, ref, owner: item.owner}, () => assert.deepEqual(yaml(bytes).user_progress_report, expected));
      }
      if (ref.endsWith('SKILL.md')) check('controller-progress-guidance', {package: item.package, ref}, () => {
        assert.match(bytes.toString(), /user_progress_report/);
        assert.match(bytes.toString(), /每轮.*返回或暂停/);
        assert.match(bytes.toString(), /下一阶段/);
      });
    }
    if (snapshot.files) {
      const before = JSON.parse(fs.readFileSync(path.join(backup, 'snapshots', item.package, 'template.snapshot.json')));
      const expectedRetired = Object.fromEntries(Object.entries({...before.retiredFiles, ...before.files})
        .filter(([ref]) => !Object.hasOwn(snapshot.files, ref))
        .map(([ref, value]) => [ref, {type: 'file', digest: value.digest, mode: value.mode}])
        .sort(([left], [right]) => left < right ? -1 : 1));
      const expectedTransitions = Object.fromEntries(Object.entries({...before.files, ...before.transitionBaselines})
        .filter(([ref, value]) => Object.hasOwn(snapshot.files, ref) && value.digest !== snapshot.files[ref].digest)
        .map(([ref, value]) => [ref, {type: 'file', digest: value.digest, mode: value.mode}])
        .sort(([left], [right]) => left < right ? -1 : 1));
      check('original-retirement-history', {package: item.package, count: Object.keys(expectedRetired).length}, () => assert.deepEqual(snapshot.retiredFiles, expectedRetired));
      check('original-transition-history', {package: item.package, count: Object.keys(expectedTransitions).length}, () => assert.deepEqual(snapshot.transitionBaselines, expectedTransitions));
    }
  }

  for (const ref of [
    '.agents/skills/yss-product-lifecycle/references/matt-yss-adapter.md',
    '.codex/skills/yss-product-lifecycle/references/matt-yss-adapter.md',
    'scripts/lib/lifecycle-context-query.mjs',
    'scripts/query-lifecycle-context',
    'submodules/create-yss-spec/src/template/instance-runtime.js',
    'submodules/create-yss-spec/tests/slim-distribution.test.js',
  ]) {
    const before = originals.find(value => value.path === ref);
    const actual = sha(read(ref));
    check('original-dirty-bytes-preserved', {ref, actual_sha256: actual, expected_sha256: before?.sha256 ?? null}, () => {
      assert.ok(before, `Missing baseline: ${ref}`);
      assert.equal(actual, before.sha256);
    });
  }

  for (const side of ['backend', 'frontend', 'design']) {
    const owner = side === 'design' ? 'yss-strategic-design' : 'harness-orchestrator';
    const ref = `submodules/yss-harness-${side}-agent/.agents/skills/${owner}/SKILL.md`;
    const before = fs.readFileSync(path.join(backup, 'submodule-files', ref.replace(/^submodules\//, '')), 'utf8');
    const current = read(ref).toString();
    const marker = current.indexOf('<!-- USER_PROGRESS_REPORT -->');
    check('original-controller-append-only', {ref, before_sha256: sha(Buffer.from(before)), appended_marker: marker >= 0}, () => {
      assert.ok(marker >= 0);
      assert.equal(current.slice(0, marker).trimEnd(), before.trimEnd());
    });
  }
} catch (error) {
  inputError = error.message;
}

const failed = checks.filter(item => item.status === 'failed');
const exitCode = inputError || failed.length ? 1 : 0;
const result = {
  schema_version: 1,
  purpose: 'read-only-final-distribution-and-original-dirty-preservation-check',
  completed_at: new Date().toISOString(),
  command: [process.execPath, ...process.argv.slice(1)],
  cwd: process.cwd(),
  source_root: root,
  baseline_root: backup,
  exit_code: exitCode,
  duration_ms: Date.now() - started,
  read_only_source: true,
  changed_source_files: [],
  evidence_output: resultPath,
  limits: ['working-tree snapshots; not committed-source release evidence', 'consultation; not independent code-review'],
  summary: {total: checks.length, passed: checks.length - failed.length, failed: failed.length, input_error: inputError},
  snapshots,
  checks,
};
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({exit_code: exitCode, summary: result.summary, result_path: resultPath, changed_source_files: []}));
process.exitCode = exitCode;
