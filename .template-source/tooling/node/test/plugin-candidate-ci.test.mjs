import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { candidateLock, validateCandidate, candidateFromEnvironment } from '../../../scripts/lib/plugin-candidate.mjs';

const template = 'a'.repeat(40), cli = 'b'.repeat(40), digest = 'c'.repeat(64);
test('candidate lock binds both profiles to exact commits without changing the input', () => {
  const base = { producer: {version:'bundle-producer-v4'}, profiles: {spec:{policyPath:'spec.json',templateTag:'v5.0.0',templateVersion:'5.0.0'},backend:{policyPath:'backend.json',templateTag:'v5.0.0',templateVersion:'5.0.0'}} };
  const before = JSON.stringify(base);
  const lock = candidateLock(base, template, cli, () => digest);
  assert.equal(JSON.stringify(base), before);
  assert.equal(lock.producer.commit, cli);
  for (const profile of Object.values(lock.profiles)) {
    assert.equal(profile.templateCommit, template);
    assert.equal(profile.templateVersion, '5.0.0');
    assert.equal(profile.sourceState, 'committed');
    assert.equal(profile.policyHash, digest);
    assert.equal('templateTag' in profile, false);
  }
  assert.throws(() => candidateLock(base, 'short', cli, () => digest));
  const mismatched=structuredClone(base);mismatched.profiles.backend.templateVersion='4.0.0';
  assert.throws(()=>candidateLock(mismatched,template,cli,()=>digest),/template version/);
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

test('candidate uses its actual clean CLI commit and rejects source drift', t => {
  const dir=mkdtempSync(path.join(tmpdir(),'plugin-candidate-real-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const templateRoot=path.join(dir,'template'),cliRoot=path.join(dir,'cli');mkdirSync(templateRoot);mkdirSync(cliRoot);
  const git=(cwd,...args)=>{const r=spawnSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid',...args],{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  for(const root of [templateRoot,cliRoot])git(root,'init','-q');
  writeFileSync(path.join(templateRoot,'file'),'template');git(templateRoot,'add','.');git(templateRoot,'commit','-qm','template');
  writeFileSync(path.join(cliRoot,'go.mod'),'module fixture\ngo 1.27.1\n');git(cliRoot,'add','.');git(cliRoot,'commit','-qm','CLI');
  const template=git(templateRoot,'rev-parse','HEAD'),cli=git(cliRoot,'rev-parse','HEAD');
  const binary=path.join(dir,'candidate'),lock=path.join(dir,'lock'),bundle=path.join(dir,'bundle'),file=path.join(dir,'receipt.json');
  writeFileSync(binary,`#!/usr/bin/env node\nconst t=${JSON.stringify(template)},c=${JSON.stringify(cli)};let r;if(process.argv[2]==='version')r={cliCommit:c,sourceState:'working-tree'};else r={profile:process.argv[5],templateCommit:t,sourceState:'committed',producer:{commit:c,sourceState:'committed'}};console.log(JSON.stringify({status:'ok',code:'OK',result:r}));\n`);chmodSync(binary,0o755);
  writeFileSync(lock,'lock');writeFileSync(bundle,'bundle');
  const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
  const receipt={schema_version:1,template_commit:template,template_tree:git(templateRoot,'rev-parse','HEAD^{tree}'),cli_commit:cli,cli_tree:git(cliRoot,'rev-parse','HEAD^{tree}'),cli_root:cliRoot,go_version:'go1.27.1',binary,binary_sha256:hash(binary),lock_file:lock,lock_sha256:hash(lock),bundle_file:bundle,bundle_sha256:hash(bundle)};
  writeFileSync(file,JSON.stringify(receipt));
  const env={...process.env,YSS_PLUGIN_CANDIDATE_RECEIPT:file,YSS_PLUGIN_CANDIDATE_RECEIPT_SHA256:hash(file)};
  assert.equal(candidateFromEnvironment(templateRoot,env).cli_commit,cli);
  writeFileSync(path.join(cliRoot,'new-file'),'changed');git(cliRoot,'add','.');git(cliRoot,'commit','-qm','changed');
  assert.throws(()=>candidateFromEnvironment(templateRoot,env),/CLI source mismatch/);
});
