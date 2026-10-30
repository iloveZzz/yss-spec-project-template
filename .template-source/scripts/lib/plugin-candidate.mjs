import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
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
