import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { hash, safe, publicNativePin, fileMode, executableMode, nativeBinaryPath } from './runtime.mjs';
import { digest, invoke, json, physical } from './native-tool.mjs';
const HERE = import.meta.dirname;

export function buildNative({ binary, output, profile, identity, pluginRoot, binaryCommit = null }) {
  if (!binary) throw new Error('native-binary-required');
  if (binaryCommit !== null && !/^[a-f0-9]{40}$/.test(binaryCommit)) throw new Error('full-binary-commit-required');
  const input = physical(binary, true), target = physical(output);
  if (!existsSync(input) || path.basename(target) !== identity.name || existsSync(target)) throw new Error('new-named-output-and-binary-required');
  const executable = lstatSync(input), bytes = readFileSync(input);
  if (!executable.isFile() || !executableMode(executable.mode)) throw new Error('native-binary-not-executable');
  const version = invoke(input, ['version']).result;
  if (!invoke(input, ['capabilities']).result?.native?.includes('work-layout-v1')) throw new Error('native-work-layout-capability-missing');
  if (binaryCommit !== null && binaryCommit !== version.cliCommit) throw new Error('binary-commit-provenance-mismatch');
  const inspection = invoke(input, ['bundle', 'inspect', '--profile', profile]).result;
  if (![2, 3].includes(inspection.schemaVersion) || inspection.profile !== profile || inspection.sourceState !== 'committed'
      || !inspection.files || !/^[a-f0-9]{64}$/.test(inspection.bundleHash) || !/^[a-f0-9]{40}$/.test(inspection.templateCommit)) throw new Error('native-bundle-identity-invalid');
  const parent = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-native-plugin-'))), exported = path.join(parent, 'template');
  let stage;
  try {
    const result = invoke(input, ['bundle', 'export', '--profile', profile, '--out', exported]).result;
    if (result.directory !== exported || digest(result.inspection) !== digest(inspection)) throw new Error('native-export-inspection-mismatch');
    for (const [ref, expected] of Object.entries(inspection.files)) {
      const file = safe(exported, ref);
      const observed = lstatSync(file);
      if (!observed.isFile() || hash(readFileSync(file)) !== expected.digest || fileMode(observed.mode) !== fileMode(expected.mode)) throw new Error('native-export-content-drift: ' + ref);
    }
    if (hash(readFileSync(input)) !== hash(bytes) || fileMode(lstatSync(input).mode) !== fileMode(executable.mode)) throw new Error('native-binary-changed-during-build');
    mkdirSync(path.dirname(target), { recursive: true }); stage = mkdtempSync(path.join(path.dirname(target), '.native-plugin-build-'));
    const records = [];
    function write(ref, data, mode = 0o644) {
      const file = path.join(stage, ref); mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, data, { flag: 'wx' }); chmodSync(file, mode);
      const observed = lstatSync(file);
      if (fileMode(observed.mode) !== fileMode(mode)) throw new Error('native-artifact-mode-mismatch: ' + ref);
      records.push({ ref, sha256: hash(data), mode: fileMode(mode), observed_mode: observed.mode & 0o777 });
    }
    const binaryPath = nativeBinaryPath();
    const pin = { schemaVersion: 1, protocolVersion: 1, profile, cliVersion: version.version, binaryPath,
      binarySha256: hash(bytes), binaryMode: fileMode(executable.mode), binaryObservedMode: executable.mode & 0o777, platform: `${process.platform}/${process.arch}`,
      binaryCommit: version.cliCommit || null, cliSourceState: version.sourceState || version.cliSourceState || 'unknown',
      inspectionDigest: digest(inspection), inspection };
    write(binaryPath, bytes, pin.binaryMode); write('assets/native-lock.json', Buffer.from(json(pin)));
    const legacyPolicies = [JSON.parse(readFileSync(path.join(pluginRoot, 'legacy-installed.json')))];
    if (profile === 'spec') legacyPolicies.push(...['legacy-m4.json', 'legacy-0.2.json'].map(ref => JSON.parse(readFileSync(path.join(HERE, ref)))));
    write('assets/legacy-bindings.json', Buffer.from(json(legacyPolicies)));
    for (const [ref, record] of Object.entries(inspection.files)) write(`assets/template/${ref}`, readFileSync(safe(exported, ref)), record.mode);
    const manifest = JSON.parse(readFileSync(path.join(pluginRoot, 'templates/plugin.json')));
    Object.assign(manifest, { name: identity.name, version: identity.version });
    Object.assign(manifest.interface, { displayName: identity.displayName, shortDescription: identity.flow });
    write('.codex-plugin/plugin.json', Buffer.from(json(manifest)));
    for (const ref of ['runtime.mjs', 'native-tool.mjs', 'native-project.mjs', 'entry.mjs']) write(`scripts/${ref}`, readFileSync(path.join(HERE, ref)));
    write('scripts/project.mjs', Buffer.from("export { runProjectCommand } from './native-project.mjs';\n"));
    write('scripts/identity.json', Buffer.from(json(identity)));
    write('scripts/yaml.mjs', readFileSync(safe(exported, 'scripts/vendor/yaml.mjs')));
    write('scripts/plugin.mjs', Buffer.from("#!/usr/bin/env node\nimport { main } from './runtime.mjs';\ntry { await main(); } catch (error) { console.error(JSON.stringify({ result: 'blocked', error: error.message, code: error.code, native: error.envelope, native_exit_code: error.exitCode, signal: error.signal, ready_for_agent: false })); process.exitCode = 1; }\n"), 0o755);
    write(`skills/${identity.entry}/SKILL.md`, readFileSync(path.join(pluginRoot, 'templates/entry-SKILL.md')));
    write('README.md', readFileSync(path.join(pluginRoot, 'README.md')));
    const lock = { schema_version: 2, plugin: identity.name, source: { state: 'native-bundle', template_commit: inspection.templateCommit, bundle_hash: inspection.bundleHash },
      native: pin, files: records.sort((a, b) => a.ref.localeCompare(b.ref)), development_only: true, release_ready: false,
      external_dependencies: { platform: profile === 'design' ? [{ requested: 'product-design:index', availability: 'requires-codex-session', when: 'selected-visual-source-adapter' }] : [] } };
    writeFileSync(path.join(stage, 'bundle-lock.json'), json(lock), { flag: 'wx' });
    const staged = invoke(path.join(stage, binaryPath), ['bundle', 'inspect', '--profile', profile]).result;
    if (digest(staged) !== digest(inspection)) throw new Error('staged-native-bundle-mismatch');
    execFileSync(process.execPath, [path.join(stage, 'scripts/plugin.mjs'), 'verify'], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
    if (existsSync(target)) throw new Error('output-appeared-during-build'); renameSync(stage, target); stage = null;
    return { result: 'built', output: target, files: records.length, native: publicNativePin(pin), development_only: true, release_ready: false, ready_for_agent: false };
  } finally { if (stage) rmSync(stage, { recursive: true, force: true }); rmSync(parent, { recursive: true, force: true }); }
}
