import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseAsset, semanticDigest, validateAssetStructure } from '../../../../scripts/lib/structured-assets.mjs';

const skill = path.resolve(import.meta.dirname, '..');
const digest = 'a'.repeat(64);
const kinds = ['domain-strategy', 'stage-decision-package'];
const fixtures = ['valid-supplier-domain.yaml', 'valid-stage-decision-package.yaml'];

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'stage-approval-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (ref, value) => fs.writeFileSync(path.join(root, ref), JSON.stringify(value));
  fs.writeFileSync(path.join(root, 'yss-project.yaml'), 'schema_version: 2\nrepository_mode: project-instance\n');
  const assets = fixtures.map(ref => parseAsset(fs.readFileSync(path.join(skill, 'tests/fixtures', ref), 'utf8')
    .replaceAll('<document-digest>', `sha256:${digest}`).replaceAll('<referenced-terms-digest>', `sha256:${digest}`)));
  assets[1].domain_strategy_ref.persisted_ref = 'domain.json';
  assets[1].domain_strategy_ref.digest = semanticDigest(assets[0]);
  write('domain.json', assets[0]);
  const context = { schema_version: 2, subject_ref: 'plan-review.json', approval_scope: ['feature.demo'], basis: [{ ref: 'basis.json', digest }] };
  write('context.json', context);
  // Only external Context/native approval verification is controlled. Both real
  // validator entrypoints, parsers, asset schemas and local checks execute below.
  const approvalModule = `
    import fs from 'node:fs'; import path from 'node:path';
    export const resolveApprovalRef = (ref, from, options) => path.resolve(options.root, ref);
    export const approvalExpectationForBoundAsset = (gate, binding) => ({boundary:gate,subject_ref:binding.ref});
    export function loadApprovalRecord(file, gate) {
      const record=JSON.parse(fs.readFileSync(file));
      return record.kind==='review-bundle'?record.reviews.find(row=>row.gate_id===gate):record;
    }
    export function validateApprovalRecordFile(file, options) {
      const record=loadApprovalRecord(file,options.gate);
      if(!options.requireApproved||options.expected.boundary!==options.gate) throw Error('missing native approval validation');
      if(record.test_refusal) throw Error('controlled native approval refusal');
      fs.writeFileSync(path.join(options.root,'native-called.json'),JSON.stringify(options));
    }
  `;
  fs.writeFileSync(path.join(root, 'hooks.mjs'), `
    import {registerHooks} from 'node:module';
    registerHooks({resolve(ref, context, next) {
      if(ref.endsWith('/native-approval.mjs')) return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(approvalModule)}),shortCircuit:true};
      if(ref.endsWith('/context-contract.mjs')) return {url:'data:text/javascript,export function verifyContextSnapshot(){}',shortCircuit:true};
      return next(ref, context);
    }});
  `);
  const run = (script, ref, args = [], hooks = false) => spawnSync(process.execPath,
    [...(hooks ? ['--import', path.join(root, 'hooks.mjs')] : []), path.join(skill, 'scripts', script), path.join(root, ref), '--root', root, ...args],
    { cwd: root, encoding: 'utf8' });
  const provenance = { tool: 'test', task_ref: 'task.json', execution_ref: 'check.log', identity: { status: 'unavailable', reason: 'isolated test fixture' } };
  const approval = gate => ({ schema_version: 3, gate_id: gate, decision: 'approved', actor_kind: 'agent', subject_ref: 'candidate.json', subject_digest: digest,
    approval_scope: ['feature.demo'], basis: [{ ref: 'basis.json', digest }], evidence_refs: ['check.log'], review_task_ref: 'task.json', review_task_digest: digest,
    check_ids: [gate], policy: { ref: '.template-spec/process/orchestration-contract.yaml', digest, version: 2 }, review: { mode: 'self-check', provenance } });
  return { root, assets, write, run, approval, context };
}

for (const [index, kind] of kinds.entries()) {
  const gate = `check.${kind === 'domain-strategy' ? 'domain-strategy' : 'stage-decision-package'}-approved`;
  test(`${kind}: approval3 supports existing annotations and bundle rows without role_id`, t => {
    const f = fixture(t), record = f.approval(gate), asset = f.assets[index];
    validateAssetStructure(record, 'approval-record');
    asset.approval.approval_ref = 'approval.json';
    f.write('asset.json', asset);
    for (const value of [record, { kind: 'review-bundle', reviews: [record] }]) {
      f.write('approval.json', value);
      const result = f.run(`validate-${kind}.mjs`, 'asset.json', [], true);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'native-called.json'))).gate, gate);
    }
  });

  test(`${kind}: legacy role mismatches and native approval refusals still block`, t => {
    const f = fixture(t), asset = f.assets[index];
    asset.approval.approval_ref = 'approval.json'; f.write('asset.json', asset);
    for (const [record, pattern] of [
      [{ ...f.approval(gate), schema_version: 1, role_id: 'role.other' }, /role_id/],
      [{ ...f.approval(gate), test_refusal: true }, /controlled native approval refusal/],
      [{ ...f.approval(gate), gate_id: 'check.other' }, /gate_id/]
    ]) {
      f.write('approval.json', record);
      const result = f.run(`validate-${kind}.mjs`, 'asset.json', [], true);
      assert.equal(result.status, 1); assert.match(result.stderr, pattern);
    }
  });

  test(`${kind}: current v3 approval migration preserves business content and emits an unapproved role-free draft`, t => {
    const f = fixture(t), original = f.assets[index]; f.write('asset.json', original);
    const result = f.run('migrate-contract-v3.mjs', 'asset.json', ['--target-version','3','--kind', index ? 'stage-decision' : kind, '--approval-context', 'context.json']);
    assert.equal(result.status, 0, result.stderr);
    const migrated = JSON.parse(result.stdout), version = index ? 'package_version' : 'domain_version';
    assert.equal(migrated.status, 'draft'); assert.notEqual(migrated[version], original[version]);
    assert.equal(migrated.approval.schema_version, 2); assert.equal(migrated.approval.approval_ref, 'migration-required');
    assert.equal(migrated.approval.approver, undefined); assert.deepEqual(migrated.approval.approval_context, f.context);
    const business = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['approval', 'status', version].includes(key)));
    assert.deepEqual(business(migrated), business(original)); validateAssetStructure(migrated, kind);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, 'asset.json'))), original);
  });

  test(`${kind}: current-policy migration refuses missing or invalid context instead of inventing approval bindings`, t => {
    const f = fixture(t); f.write('asset.json', f.assets[index]);
    const args = ['--target-version','3','--kind', index ? 'stage-decision' : kind];
    const missing = f.run('migrate-contract-v3.mjs', 'asset.json', args);
    assert.equal(missing.status, 1); assert.match(missing.stderr, /approval-context/);
    f.write('context.json', { ...f.context, basis: [] });
    const invalid = f.run('migrate-contract-v3.mjs', 'asset.json', [...args, '--approval-context', 'context.json']);
    assert.equal(invalid.status, 1); assert.equal(invalid.stdout, '');
  });
}
