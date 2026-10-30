#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { candidateCliCommit as cliCommit, candidateFromEnvironment, candidateLock, sha256, validateCandidate } from './lib/plugin-candidate.mjs';

const root = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
function run(file, args, cwd, env = process.env) {
  const result = spawnSync(file, args, {cwd, env, encoding:'utf8', maxBuffer:128*1024*1024, timeout:600000});
  if (result.error || result.signal || result.status !== 0) throw new Error(`${file} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}
const git = (cwd, ...args) => run('git', ['-C', cwd, ...args], root).trim();
const json = value => JSON.stringify(value, null, 2)+'\n';
const inspect = (binary, profile) => {
  const envelope = JSON.parse(run(binary, ['bundle','inspect','--profile',profile,'--json'], root));
  if (envelope.status !== 'ok' || envelope.code !== 'OK') throw new Error('candidate inspection failed');
  return envelope.result;
};
function prepare(cliRoot, output) {
  cliRoot = realpathSync(cliRoot); output = path.resolve(output);
  if (existsSync(output) || !path.isAbsolute(output) || output.startsWith(root + path.sep) || output.startsWith(cliRoot + path.sep)) throw new Error('candidate output must be new and outside both repositories');
  const template = git(root, 'rev-parse', 'HEAD'), actualCli = git(cliRoot, 'rev-parse', 'HEAD');
  if (actualCli !== cliCommit || git(root, 'status', '--porcelain') || git(cliRoot, 'status', '--porcelain')) throw new Error('candidate source commit or cleanliness mismatch');
  const templateTree = git(root, 'rev-parse', 'HEAD^{tree}'), cliTree = git(cliRoot, 'rev-parse', 'HEAD^{tree}');
  const requiredGo = readFileSync(path.join(cliRoot, 'go.mod'), 'utf8').match(/^go ([0-9.]+)$/m)?.[1];
  const observedGo = run('go', ['env','GOVERSION'], cliRoot).trim();
  if (!requiredGo || observedGo !== `go${requiredGo}`) throw new Error('candidate Go version mismatch');
  mkdirSync(output, {recursive:false});
  const original = JSON.parse(readFileSync(path.join(cliRoot, 'docs/source-lock.json')));
  const lock = candidateLock(original, template, cliCommit, ref => sha256(Buffer.from(run('git', ['-C',root,'show',`${template}:${ref}`], root))));
  const lockFile = path.join(output, 'candidate-lock.json'); writeFileSync(lockFile, json(lock), {flag:'wx'});
  const archiveDir = path.join(output, 'bundle');
  const env = {...process.env, CGO_ENABLED:'0', GOTOOLCHAIN:'local'};
  run('go', ['run','-tags','yss_nobundle','./tools/bundle','--source-root',root,'--lock',lockFile,'--out',archiveDir], cliRoot, env);
  const archive = path.join(archiveDir, 'bundles.json.gz'), overlay = path.join(output, 'overlay.json');
  writeFileSync(overlay, json({Replace:{[path.join(cliRoot,'internal/bundle/assets/bundles.json.gz')]:archive}}), {flag:'wx'});
  const binary = path.join(output, 'yss');
  run('go', ['build','-trimpath','-buildvcs=false','-overlay',overlay,'-ldflags',`-X github.com/iloveZzz/yss-cli/internal/domain.BuildCommit=${cliCommit} -X github.com/iloveZzz/yss-cli/internal/domain.BuildSourceState=working-tree`,'-o',binary,'./cmd/yss'], cliRoot, env);
  const version = JSON.parse(run(binary, ['version','--json'], root));
  if (version.status !== 'ok' || version.result?.cliCommit !== cliCommit || version.result?.sourceState !== 'working-tree') throw new Error('candidate binary provenance mismatch');
  const receipt = {schema_version:1, template_commit:template, template_tree:templateTree, cli_commit:cliCommit, cli_tree:cliTree, cli_root:cliRoot, go_version:observedGo,
    binary, binary_sha256:sha256(readFileSync(binary)), lock_file:lockFile, lock_sha256:sha256(readFileSync(lockFile)),
    bundle_file:archive, bundle_sha256:sha256(readFileSync(archive)), binary_source_state:'working-tree',
    inspections:Object.fromEntries(['spec','backend'].map(profile => [profile, inspect(binary, profile)]))};
  validateCandidate(receipt, {template, cli:cliCommit, inspect:profile => receipt.inspections[profile]});
  const receiptFile = path.join(output, 'receipt.json'); writeFileSync(receiptFile, json(receipt), {flag:'wx'});
  const environmentFile = process.env.YSS_CI_ENV_FILE || process.env.GITHUB_ENV;
  if (environmentFile) appendFileSync(environmentFile, `YSS_PLUGIN_CANDIDATE_RECEIPT=${receiptFile}\nYSS_PLUGIN_CANDIDATE_RECEIPT_SHA256=${sha256(readFileSync(receiptFile))}\n`);
  console.log(json({result:'prepared', receipt:receiptFile, receipt_sha256:sha256(readFileSync(receiptFile)), template, cli_commit:cliCommit, binary_sha256:receipt.binary_sha256, bundle_sha256:receipt.bundle_sha256, release_evidence:false}));
}
function execute(args) {
  const candidate = candidateFromEnvironment(root);
  if (args.length === 0) throw new Error('candidate test command required');
  let cwd = root;
  if (args[0] === '--tooling') { cwd = path.join(root, '.template-source/tooling/node'); args = args.slice(1); }
  console.log(`plugin candidate template=${candidate.template_commit} cli=${cliCommit} binary_sha256=${candidate.digest}; not release evidence`);
  const result = spawnSync(process.execPath, args, {cwd, env:{...process.env, YSS_NATIVE_BINARY:candidate.binary, YSS_NATIVE_BINARY_SHA256:candidate.digest, YSS_PLUGIN_TEST_BINARY:candidate.binary, YSS_PLUGIN_BINARY:candidate.binary}, stdio:'inherit'});
  if (result.error || result.signal || !Number.isInteger(result.status)) throw new Error('candidate test did not exit normally');
  process.exitCode = result.status;
}
try {
  if (process.argv[2] === 'prepare' && process.argv.length === 5) prepare(process.argv[3], process.argv[4]);
  else if (process.argv[2] === 'run') execute(process.argv.slice(3));
  else throw new Error('usage: plugin-candidate.mjs prepare <cli-root> <new-output> | run [--tooling] <node-arguments>');
} catch (error) { console.error(error.message); process.exitCode = 1; }
