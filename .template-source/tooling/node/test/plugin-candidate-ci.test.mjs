import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { candidateLock, validateCandidate } from '../../../scripts/lib/plugin-candidate.mjs';

const template = 'a'.repeat(40), cli = 'b'.repeat(40), digest = 'c'.repeat(64);
test('candidate lock binds both profiles to exact commits without changing the input', () => {
  const base = { producer: {version:'bundle-producer-v4'}, profiles: {spec:{policyPath:'spec.json',templateTag:'v5'},backend:{policyPath:'backend.json',templateTag:'v5'}} };
  const before = JSON.stringify(base);
  const lock = candidateLock(base, template, cli, () => digest);
  assert.equal(JSON.stringify(base), before);
  assert.equal(lock.producer.commit, cli);
  for (const profile of Object.values(lock.profiles)) {
    assert.equal(profile.templateCommit, template);
    assert.equal(profile.templateVersion, `git:${template}`);
    assert.equal(profile.sourceState, 'committed');
    assert.equal(profile.policyHash, digest);
    assert.equal('templateTag' in profile, false);
  }
  assert.throws(() => candidateLock(base, 'short', cli, () => digest));
});

test('candidate receipt rejects provenance and binary drift before execution', t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plugin-candidate-contract-'));
  t.after(() => rmSync(dir, {recursive:true, force:true}));
  const binary = path.join(dir, 'yss'); writeFileSync(binary, 'candidate');
  const hash = 'dda18a0e21ae47c53b4309434cbc02ae8bf764fa0e0e4df7f9b8fa56d33f9a9a';
  const receipt = {schema_version:1, template_commit:template, cli_commit:cli, binary, binary_sha256:hash};
  const inspect = profile => ({profile, templateCommit:template, sourceState:'committed', producer:{commit:cli,sourceState:'committed'}});
  assert.throws(() => validateCandidate(receipt, {template,cli,inspect}), /digest/);
  receipt.binary_sha256 = createHash('sha256').update('candidate').digest('hex');
  assert.equal(validateCandidate(receipt, {template,cli,inspect}).binary, binary);
  assert.throws(() => validateCandidate({...receipt,template_commit:'d'.repeat(40)}, {template,cli,inspect}), /template/);
  assert.throws(() => validateCandidate({...receipt,cli_commit:'d'.repeat(40)}, {template,cli,inspect}), /CLI/);
  assert.throws(() => validateCandidate(receipt, {template,cli,inspect: p => ({...inspect(p),sourceState:'working-tree'})}), /source/);
  assert.throws(() => validateCandidate(receipt, {template,cli,inspect: p => ({...inspect(p),producer:{commit:'d'.repeat(40),sourceState:'committed'}})}), /source/);
  writeFileSync(binary, 'tampered');
  assert.throws(() => validateCandidate(receipt, {template,cli,inspect}), /digest/);
});

test('plugin candidate runner fails closed when no verified receipt is provided', () => {
  const env = {...process.env};
  delete env.YSS_PLUGIN_CANDIDATE_RECEIPT;
  delete env.YSS_PLUGIN_CANDIDATE_RECEIPT_SHA256;
  const result = spawnSync(process.execPath, ['.template-source/scripts/plugin-candidate.mjs','run','--test','does-not-exist'], {env,encoding:'utf8'});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /verified plugin candidate receipt is required/);
});
