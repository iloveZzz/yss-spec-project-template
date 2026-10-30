import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const candidateCliCommit = 'bc8d2a45b69d88eefa5638b92df436a7b9899770';
const commitPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^[a-f0-9]{64}$/;

export function candidateLock(base, template, cli, policyHash) {
  if (!commitPattern.test(template) || !commitPattern.test(cli)) throw new Error('candidate commits must be full SHA-1');
  const lock = structuredClone(base);
  if (!lock.producer || Object.keys(lock.profiles || {}).sort().join(',') !== 'backend,spec') throw new Error('candidate source lock profiles invalid');
  Object.assign(lock.producer, { commit: cli, sourceState: 'committed' });
  for (const profile of Object.values(lock.profiles)) {
    const digest = policyHash(profile.policyPath);
    if (!digestPattern.test(digest)) throw new Error('candidate policy digest invalid');
    Object.assign(profile, {templateCommit:template, templateVersion:`git:${template}`, sourceState:'committed', policyHash:digest});
    delete profile.templateTag;
  }
  return lock;
}

export function validateCandidate(receipt, {template, cli, inspect}) {
  if (receipt?.schema_version !== 1 || receipt.template_commit !== template || !commitPattern.test(template)) throw new Error('candidate template mismatch');
  if (receipt.cli_commit !== cli || !commitPattern.test(cli)) throw new Error('candidate CLI mismatch');
  if (!path.isAbsolute(receipt.binary || '')) throw new Error('candidate binary path invalid');
  const stat = lstatSync(receipt.binary);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('candidate binary must be an independent file');
  if (!digestPattern.test(receipt.binary_sha256 || '') || sha256(readFileSync(receipt.binary)) !== receipt.binary_sha256) throw new Error('candidate binary digest mismatch');
  for (const profile of ['spec', 'backend']) {
    const item = inspect(profile);
    if (item.profile !== profile || item.templateCommit !== template || item.sourceState !== 'committed'
        || item.producer?.commit !== cli || item.producer?.sourceState !== 'committed') throw new Error(`candidate ${profile} source mismatch`);
  }
  return {binary:receipt.binary, digest:receipt.binary_sha256};
}

export function candidateFromEnvironment(root, environment = process.env) {
  const file = environment.YSS_PLUGIN_CANDIDATE_RECEIPT, expected = environment.YSS_PLUGIN_CANDIDATE_RECEIPT_SHA256;
  if (!file || !path.isAbsolute(file) || !digestPattern.test(expected || '')) throw new Error('verified plugin candidate receipt is required');
  const stat = lstatSync(file), bytes = readFileSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || sha256(bytes) !== expected) throw new Error('candidate receipt digest mismatch');
  const receipt = JSON.parse(bytes);
  const call = (command, args) => {
    const result = spawnSync(command, args, {cwd:root, env:environment, encoding:'utf8', timeout:120000, maxBuffer:128*1024*1024});
    if (result.error || result.signal || result.status !== 0) throw new Error('candidate provenance command failed');
    return result.stdout.trim();
  };
  const template = call('git',['rev-parse','HEAD']);
  if (receipt.template_tree !== call('git',['rev-parse','HEAD^{tree}'])) throw new Error('candidate template tree mismatch');
  if (!path.isAbsolute(receipt.cli_root || '') || call('git',['-C',receipt.cli_root,'rev-parse','HEAD']) !== candidateCliCommit
      || call('git',['-C',receipt.cli_root,'rev-parse','HEAD^{tree}']) !== receipt.cli_tree
      || call('git',['-C',receipt.cli_root,'status','--porcelain'])) throw new Error('candidate CLI source mismatch');
  for (const [ref, digest] of [[receipt.lock_file,receipt.lock_sha256],[receipt.bundle_file,receipt.bundle_sha256]]) {
    if (!path.isAbsolute(ref || '') || !digestPattern.test(digest || '')) throw new Error('candidate material path or digest invalid');
    const item = lstatSync(ref);
    if (!item.isFile() || item.isSymbolicLink() || item.nlink !== 1 || sha256(readFileSync(ref)) !== digest) throw new Error('candidate material digest mismatch');
  }
  const inspect = profile => {
    const envelope = JSON.parse(call(receipt.binary,['bundle','inspect','--profile',profile,'--json']));
    if (envelope.status !== 'ok' || envelope.code !== 'OK') throw new Error('candidate inspection failed');
    return envelope.result;
  };
  const candidate = validateCandidate(receipt, {template, cli:candidateCliCommit, inspect});
  const version = JSON.parse(call(candidate.binary,['version','--json']));
  if (version.status !== 'ok' || version.code !== 'OK' || version.result?.cliCommit !== candidateCliCommit || version.result?.sourceState !== 'working-tree') throw new Error('candidate binary provenance mismatch');
  return {...candidate, template_commit:template, template_tree:receipt.template_tree, cli_commit:candidateCliCommit,
    cli_tree:receipt.cli_tree, bundle_sha256:receipt.bundle_sha256, lock_sha256:receipt.lock_sha256,
    receipt_sha256:expected, binary_source_state:'working-tree', release_evidence:false};
}
