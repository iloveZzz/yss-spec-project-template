import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { stringify, parse } from '../../vendor/yaml.mjs';
import { resolveMaintenanceLocation, resolveMaintenanceOutput, resolveMaintenanceReference, resolveMaintenanceBundleFile, maintenanceReference } from '../../lib/maintenance-storage.mjs';
import { captureMaintenanceCandidate, inspectMaintenanceCandidate } from '../../lib/maintenance-candidate.mjs';
import { validateMaintenanceCheckpoint } from '../../lib/maintenance-intensity.mjs';
import { validateMaintenanceReviewEvidence } from '../../lib/maintenance-review.mjs';

const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-storage-')));
  const root = path.join(base, 'repo'), home = path.join(base, 'runtime');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: template-source\n');
  const prior = process.env.YSS_RUNTIME_HOME;
  process.env.YSS_RUNTIME_HOME = home;
  t.after(() => { if (prior === undefined) delete process.env.YSS_RUNTIME_HOME; else process.env.YSS_RUNTIME_HOME = prior; fs.rmSync(base, { recursive: true, force: true }); });
  return { base, root, home };
}

test('persistent workspace namespace, reference digest and CI temporary isolation', t => {
  const { root, home } = fixture(t);
  const prior = process.env.RUNNER_TEMP;
  process.env.RUNNER_TEMP = path.join(root, 'runner');
  try {
    const location = resolveMaintenanceLocation({ root });
    assert.equal(location.directory, path.join(home, digest(fs.realpathSync(root)), 'maintenance'));
    const output = resolveMaintenanceOutput('maintenance:research/run/report.json', { root });
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, '{"ok":true}\n');
    const ref = maintenanceReference(output, { root });
    assert.equal(ref, 'maintenance:research/run/report.json');
    const sha = digest(fs.readFileSync(output));
    assert.equal(resolveMaintenanceReference(ref, { root, digest: sha }), output);
    fs.appendFileSync(output, 'tamper');
    assert.throws(() => resolveMaintenanceReference(ref, { root, digest: sha }), /摘要漂移/);
  } finally { if (prior === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = prior; }
});

test('rejects escapes, repository outputs, foreign workspaces and symlink roots', t => {
  const { root, home, base } = fixture(t);
  for (const ref of ['maintenance:../bad', 'maintenance:/bad', 'maintenance:a/../bad', 'maintenance:a\\bad', 'maintenance:', 'maintenance:C:/bad']) assert.throws(() => resolveMaintenanceOutput(ref, { root }));
  assert.throws(() => resolveMaintenanceOutput(path.join(root, 'evidence/report'), { root }), /仓外/);
  const foreign = path.join(base, 'foreign'); fs.mkdirSync(foreign); fs.copyFileSync(path.join(root, 'yss-project.yaml'), path.join(foreign, 'yss-project.yaml'));
  const foreignPath = resolveMaintenanceOutput('maintenance:research/report', { root: foreign });
  assert.throws(() => resolveMaintenanceOutput(foreignPath, { root }), /当前工作区/);
  const leaf = resolveMaintenanceOutput('maintenance:research', { root });
  fs.mkdirSync(path.dirname(leaf), { recursive: true }); fs.symlinkSync(base, leaf);
  assert.throws(() => resolveMaintenanceOutput('maintenance:research/report', { root }), /符号链接/);
  fs.rmSync(leaf);
  const alias = path.join(base, 'alias'); fs.mkdirSync(home, { recursive: true }); fs.symlinkSync(home, alias);
  assert.throws(() => resolveMaintenanceLocation({ root, home: alias }), /符号链接/);
  fs.writeFileSync(path.join(foreign, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: project-instance\n');
  assert.throws(() => resolveMaintenanceLocation({ root: foreign }), /template-source/);
  assert.throws(() => resolveMaintenanceLocation({ root, home: path.join(root, 'runtime') }), /不得进入项目/);
});

test('v2 candidate preserves stream, rejects overwrite, tamper and foreign workspace; v1 remains readable', t => {
  const { root, base } = fixture(t);
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q'); git('config', 'user.email', 'fixture@example.com'); git('config', 'user.name', 'Fixture');
  fs.writeFileSync(path.join(root, 'tracked.txt'), 'before\n'); git('add', '.'); git('commit', '-qm', 'base');
  fs.writeFileSync(path.join(root, 'tracked.txt'), 'after\n'); fs.writeFileSync(path.join(root, 'new.txt'), 'new\n');
  const outputDir = 'maintenance:candidates/example';
  const captured = captureMaintenanceCandidate({ root, outputDir });
  assert.equal(captured.manifest.schema_version, 2); assert.equal(captured.manifest.reference_base, 'bundle');
  const manifestPath = resolveMaintenanceReference(captured.manifest_ref, { root });
  const directory = path.dirname(manifestPath);
  assert.deepEqual(fs.readdirSync(directory).sort(), ['candidate-manifest.yaml', 'candidate.bin', 'tracked.diff']);
  assert.equal(inspectMaintenanceCandidate({ manifestPath, root }).entries[0].content.toString(), 'new\n');
  const reviewDir = resolveMaintenanceOutput('maintenance:research/review', {root}); fs.mkdirSync(reviewDir,{recursive:true});
  const fixtureDir = path.resolve(import.meta.dirname,'../maintenance-review/maintenance-review');
  const record = parse(fs.readFileSync(path.join(fixtureDir,'formal-review-record.yaml'),'utf8'));
  const task = parse(fs.readFileSync(path.join(fixtureDir,'task-package.yaml'),'utf8'));
  const oldDigest = record.candidate_digest;
  record.candidate_digest = captured.candidate_digest; record.candidate_snapshot_ref = captured.manifest_ref;
  record.task_package_ref = 'maintenance:research/review/task.yaml'; record.review_report_ref = 'maintenance:research/review/report.md';
  task.inputs=[captured.manifest_ref];task.allowed_write_paths=['maintenance:research/review/'];task.expected_evidence_files=[record.review_report_ref];
  fs.writeFileSync(path.join(reviewDir,'task.yaml'),stringify(task));
  fs.writeFileSync(path.join(reviewDir,'report.md'),fs.readFileSync(path.join(fixtureDir,'formal-review-approved.md'),'utf8').replaceAll(oldDigest,record.candidate_digest));
  fs.writeFileSync(path.join(reviewDir,'record.yaml'),stringify(record));
  const reviewEvidence={kind:'formal-independent-review',command:'maintenance:research/review/record.yaml',evidence_digest:digest(fs.readFileSync(path.join(reviewDir,'record.yaml')))};
  assert.equal(validateMaintenanceReviewEvidence(reviewEvidence,{baseDir:root}).candidate_digest,captured.candidate_digest);
  assert.throws(()=>validateMaintenanceReviewEvidence({...reviewEvidence,evidence_digest:'0'.repeat(64)},{baseDir:root}),/摘要漂移/);
  assert.throws(() => captureMaintenanceCandidate({ root, outputDir }), /必须不存在/);
  assert.throws(() => resolveMaintenanceBundleFile(directory, '../tracked.diff'), /相对路径/);
  const other = path.join(base, 'other'); fs.mkdirSync(other); fs.copyFileSync(path.join(root, 'yss-project.yaml'), path.join(other, 'yss-project.yaml'));
  assert.throws(() => inspectMaintenanceCandidate({ manifestPath, root: other }), /不属于当前工作区/);
  const legacy = path.join(root, 'legacy'); fs.mkdirSync(legacy);
  for (const name of ['candidate.bin', 'tracked.diff']) fs.copyFileSync(path.join(directory, name), path.join(legacy, name));
  const v1 = { ...captured.manifest, schema_version: 1, candidate_snapshot_ref: 'legacy/candidate-manifest.yaml', snapshot_stream_ref: 'legacy/candidate.bin', tracked_diff_ref: 'legacy/tracked.diff' };
  delete v1.reference_base; delete v1.workspace_id;
  fs.writeFileSync(path.join(legacy, 'candidate-manifest.yaml'), stringify(v1));
  assert.equal(inspectMaintenanceCandidate({ manifestPath: path.join(legacy, 'candidate-manifest.yaml'), root }).manifest.candidate_digest, captured.candidate_digest);
  fs.appendFileSync(path.join(directory, 'candidate.bin'), 'x');
  assert.throws(() => inspectMaintenanceCandidate({ manifestPath, root }), /candidate_digest/);
});

test('historical checkpoints cannot grant current task status; external evidence is digest bound', t => {
  const { root } = fixture(t);
  const evidence = resolveMaintenanceOutput('maintenance:research/check.log', { root }); fs.mkdirSync(path.dirname(evidence), { recursive: true }); fs.writeFileSync(evidence, 'passed\n');
  const checkpoint = { schema_version: 2, intensity: 'L3', classification_reason: '独立夹具', triggers: ['core-validator'], changed_assets: ['fixture'], verification_evidence: [{ kind: 'self-check', command: 'fixture', result: 'pass' }, { kind: 'fresh-verification', command: 'fixture', result: 'pass', evidence_ref: 'maintenance:research/check.log', evidence_digest: digest(fs.readFileSync(evidence)) }], review_mode: 'self-check', escalation: 'none', target_state: 'implementation-ready', current_state: 'implementation-ready', verification_profile: 'fast', review_round: 0, candidate_digest: null };
  assert.equal(validateMaintenanceCheckpoint(checkpoint, { baseDir: root }).current_state, 'implementation-ready');
  const historical = validateMaintenanceCheckpoint(checkpoint, { baseDir: root, history: true });
  assert.equal(historical.current_state, 'historical-only'); assert.equal(historical.execution_authorization, 'not-evaluated');
  delete checkpoint.verification_evidence[1].evidence_digest;
  assert.throws(() => validateMaintenanceCheckpoint(checkpoint, { baseDir: root }), /evidence_digest/);
  const report = resolveMaintenanceOutput('maintenance:research/formal.md', { root }); fs.writeFileSync(report, '审查者: reviewer\n结论: pass\nlegacy_formal_review: true\n');
  assert.throws(() => validateMaintenanceReviewEvidence({ kind: 'formal-independent-review', command: 'maintenance:research/formal.md', result: 'pass', evidence_digest:digest(fs.readFileSync(report)) }, { baseDir: root }), /结构化|退役/);
});
