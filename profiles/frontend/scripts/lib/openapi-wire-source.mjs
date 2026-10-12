import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const REFERENCES = '.agents/skills/yss-openapi-governance/references';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const repositoryIdentity = value => value.trim().replace(/\.git$/, '').replace(/\/$/, '');

export function validateWireProfileSource({root, sourceRoot}) {
  const source = JSON.parse(readFileSync(path.join(root,REFERENCES,'openapi-wire-source.json'),'utf8'));
  ensure(source.schema_version === 1 && source.mode === 'read-only-snapshot', 'wire profile 来源合同无效');
  ensure(typeof source.repository === 'string' && source.repository.startsWith('https://'), 'wire profile 缺少源仓身份');
  ensure(/^[a-f0-9]{40}$/.test(source.revision), 'wire profile 缺少完整源版本');
  ensure(typeof source.path === 'string' && source.path && !path.isAbsolute(source.path) && !source.path.split('/').includes('..'), 'wire profile 源路径非法');
  ensure(/^[a-f0-9]{64}$/.test(source.sha256), 'wire profile 缺少 SHA-256');
  const bytes = readFileSync(path.join(root,REFERENCES,'openapi-wire-profile.yaml'));
  ensure(digest(bytes) === source.sha256, 'wire profile 快照与来源摘要不一致');
  if (sourceRoot) {
    const git = args => execFileSync('git',['-C',sourceRoot,...args],{stdio:['ignore','pipe','pipe']});
    ensure(repositoryIdentity(git(['remote','get-url','origin']).toString()) === repositoryIdentity(source.repository), 'wire profile 源仓身份不匹配');
    const pinned = git(['show',`${source.revision}:${source.path}`]);
    ensure(digest(pinned) === source.sha256, 'wire profile 固定源版本摘要不一致');
    ensure(digest(readFileSync(path.join(sourceRoot,source.path))) === source.sha256, 'wire profile 源工作树已变化，需重新同步快照与来源绑定');
  }
  return {source_revision:source.revision,sha256:source.sha256,verification:sourceRoot?'pinned-source-and-local-worktree':'offline-snapshot'};
}
