// Independent schema v1 fixture producer. Production keeps this format read-only.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export function legacyReviewCandidate(root) {
  const output = '.template-source/evidence/maintenance/review';
  const git = (...args) => execFileSync('git', args, {cwd: root, maxBuffer: 64 * 1024 * 1024});
  const mergeBase = git('rev-parse', 'HEAD').toString().trim();
  const diff = git('diff', '--no-ext-diff', '--binary', '--full-index', mergeBase);
  const rawPaths = git('ls-files', '-z', '--others', '--exclude-standard').toString('binary').split('\0').filter(Boolean).map(p => Buffer.from(p, 'binary')).sort(Buffer.compare);
  const length = n => {const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b;};
  const parts = [Buffer.from('YSS-WORKTREE-CANDIDATE-V1\0'), Buffer.from([0x54]), length(diff.length), diff];
  for (const raw of rawPaths) {
    const file = path.join(root, raw.toString()), stat = fs.lstatSync(file);
    if (!stat.isFile() && !stat.isSymbolicLink()) throw Error('fixture entry must be a regular file or link');
    const data = stat.isSymbolicLink() ? fs.readlinkSync(file, {encoding: 'buffer'}) : fs.readFileSync(file);
    const mode = Buffer.alloc(4); mode.writeUInt32BE(stat.mode);
    parts.push(Buffer.from([0x55]), length(raw.length), raw, mode, Buffer.from([stat.isSymbolicLink() ? 0x4c : 0x52]), length(data.length), data);
  }
  const stream = Buffer.concat(parts), candidate_digest = createHash('sha256').update(stream).digest('hex');
  const manifest_ref = `${output}/candidate-manifest.yaml`;
  const manifest = {schema_version: 1, candidate_kind: 'yss-worktree-candidate-v1', storage: 'packed-stream', review_mode: 'worktree', review_base_ref: 'HEAD', merge_base: mergeBase,
    implementation_candidate_ref: 'working-tree', candidate_snapshot_ref: manifest_ref, candidate_digest,
    tracked_diff_command: `git diff --no-ext-diff --binary --full-index ${mergeBase}`, untracked_inventory_command: 'git ls-files -z --others --exclude-standard',
    untracked_diff_command: 'packed in candidate.bin', untracked_files: rawPaths.map(p => p.toString()), untracked_path_bytes: rawPaths.map(p => p.toString('base64')),
    excluded_paths: [output], snapshot_stream_ref: `${output}/candidate.bin`, tracked_diff_ref: `${output}/tracked.diff`, commit_list_command: 'git log HEAD..HEAD --oneline'};
  fs.mkdirSync(path.join(root, output), {recursive: true});
  for (const [name, data] of [['candidate.bin', stream], ['tracked.diff', diff], ['candidate-manifest.yaml', JSON.stringify(manifest)]]) fs.writeFileSync(path.join(root, output, name), data, {flag: 'wx'});
  return {candidate_digest, manifest_ref};
}
