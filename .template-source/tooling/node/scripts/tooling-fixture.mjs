import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { verificationInputDigest } from '../../../../scripts/lib/verification-report.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`tooling-fixture: ${message}`); };
export function measureTestBuild(output, build, environment = process.env) {
  const started = performance.now();
  const record = (result, error) => {
    const spawnResult = result && Object.hasOwn(result, 'status');
    const failure = error || result?.error;
    if (environment.YSS_TOOLING_COPY_LOG) fs.appendFileSync(environment.YSS_TOOLING_COPY_LOG,
      JSON.stringify({ kind: 'plugin-build', output, duration_ms: performance.now() - started,
        code: failure ? 1 : spawnResult ? result.status ?? 1 : 0,
        ...(spawnResult ? { exit_code: result.status } : {}),
        ...(result?.signal ? { signal: result.signal } : {}), ...(failure ? { error: failure.message } : {}) }) + '\n');
    if (error) throw error;
    return result;
  };
  let result;
  try { result = build(); } catch (error) { return record(null, error); }
  return result?.then ? result.then(value => record(value), error => record(null, error)) : record(result);
}
export function runtimeIdentity() {
  return { node: process.version, executable: fs.realpathSync(process.execPath), platform: process.platform, arch: process.arch,
    python: execFileSync('python3', ['-c', 'import sys,json,importlib.metadata; print(json.dumps([sys.executable,sys.version,importlib.metadata.version("jsonschema")]))'], { encoding: 'utf8' }).trim() };
}
export function treeInventory(root) {
  const rows = [];
  function visit(ref) {
    const file = path.join(root, ref), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) fail(`unsupported entry: ${ref}`);
    rows.push({ ref, type: stat.isDirectory() ? 'directory' : 'file', mode: stat.mode & 0o7777,
      ...(stat.isFile() ? { sha256: sha(fs.readFileSync(file)) } : {}) });
    if (stat.isDirectory()) for (const child of fs.readdirSync(file).sort()) visit(ref ? `${ref}/${child}` : child);
  }
  visit('');
  return rows;
}
function equal(a, b, message) { if (JSON.stringify(a) !== JSON.stringify(b)) fail(message); }
function safeNewOutput(output, source) {
  const resolved = path.resolve(output);
  if (resolved === source || resolved.startsWith(source + path.sep)) fail('output inside immutable fixture');
  let cursor = path.parse(resolved).root;
  for (const part of resolved.slice(cursor.length).split(path.sep)) {
    cursor = path.join(cursor, part);
    try { const stat = fs.lstatSync(cursor); if (stat.isSymbolicLink() || !stat.isDirectory() || cursor === resolved) fail('unsafe or existing output'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return resolved;
}
export function publishTestFixture({ sourceRoot, artifact, manifestFile, inputDigest, dependencies }) {
  sourceRoot = fs.realpathSync(sourceRoot); artifact = fs.realpathSync(artifact);
  if (verificationInputDigest(sourceRoot) !== inputDigest) fail('source changed during build');
  const manifest = { schema_version: 1, source_root: sourceRoot, input_sha256: inputDigest, runtime: runtimeIdentity(),
    artifact, dependencies, inventory: treeInventory(artifact) };
  const bytes = JSON.stringify(manifest);
  fs.writeFileSync(manifestFile + '.tmp', bytes, { flag: 'wx' });
  fs.renameSync(manifestFile + '.tmp', manifestFile);
  return sha(bytes);
}
export function materializeTestPlugin({ sourceRoot, output, build, environment = process.env }) {
  const manifestFile = environment.YSS_TOOLING_PLUGIN_FIXTURE;
  if (!manifestFile) return measureTestBuild(output, build, environment);
  const started = performance.now();
  if (fs.lstatSync(manifestFile).isSymbolicLink()) fail('manifest is a symbolic link');
  const bytes = fs.readFileSync(manifestFile);
  if (sha(bytes) !== environment.YSS_TOOLING_PLUGIN_FIXTURE_SHA256) fail('manifest changed');
  const manifest = JSON.parse(bytes);
  if (manifest.schema_version !== 1 || manifest.source_root !== fs.realpathSync(sourceRoot)) fail('wrong source or schema');
  equal(manifest.runtime, runtimeIdentity(), 'runtime changed');
  if (manifest.input_sha256 !== verificationInputDigest(sourceRoot)) fail('source inputs changed');
  equal(treeInventory(manifest.artifact), manifest.inventory, 'artifact changed');
  const target = safeNewOutput(output, manifest.artifact);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const stage = fs.mkdtempSync(path.join(path.dirname(target), '.tooling-copy-'));
  try {
    fs.cpSync(manifest.artifact, stage, { recursive: true, force: false, errorOnExist: true });
    fs.chmodSync(stage, manifest.inventory[0].mode);
    equal(treeInventory(stage), manifest.inventory, 'copy changed');
    equal(treeInventory(manifest.artifact), manifest.inventory, 'artifact changed while copying');
    if (manifest.input_sha256 !== verificationInputDigest(sourceRoot)) fail('source inputs changed while copying');
    // The target belongs to the calling test; never replace an existing user's directory.
    if (fs.existsSync(target)) fail('output appeared while copying');
    fs.renameSync(stage, target);
  } catch (error) { fs.rmSync(stage, { recursive: true, force: true }); throw error; }
  if (environment.YSS_TOOLING_COPY_LOG) fs.appendFileSync(environment.YSS_TOOLING_COPY_LOG,
    JSON.stringify({ kind: 'plugin-copy', output: target, duration_ms: performance.now() - started, manifest_sha256: sha(bytes) }) + '\n');
  return { result: 'built', output: target, preparation: 'copied-current-run-fixture' };
}
