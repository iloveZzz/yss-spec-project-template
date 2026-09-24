#!/usr/bin/env node
import identity from './identity.json' with { type: 'json' };
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { planPlugin } from './plan.mjs';
import { files, hash, safe, verify } from './runtime.mjs';
import { parseDocument, stringify } from '../../../scripts/vendor/yaml.mjs';
import { projectOverlay } from './project-overlay.mjs';
import { packCli } from './pack-cli.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const NAME = identity.name;
const { buildSync: inspectModules, version: parserVersion } = createRequire(new URL('../../tooling/node/package.json', import.meta.url))('esbuild');
const ENTRYPOINTS = ['scripts/strategic-consumer-entry', 'scripts/query-lifecycle-context', 'scripts/verify-plan-spec-entry',
  'scripts/dispatch-slice-task', 'scripts/complete-backend-delivery', 'scripts/verify-lifecycle-checkpoint', 'scripts/slice-contract', 'scripts/contract', 'scripts/api-contract-decision', 'scripts/backend-delivery', 'scripts/verify-context-contract'];
const ignore = ref => /(?:^|\/)(?:node_modules|__pycache__|\.git|tests?|fixtures)(?:\/|$)/.test(ref)
  || /(?:\.test\.[cm]?js|\.pyc|\.DS_Store)$/.test(ref);
// Historical machine paths have no runtime meaning. Preserve exact transformation provenance.
const REDACTIONS = new Map([
  ['.agents/skills/yss-design-system/SKILL.md', ['/Users/zhudaoming/Downloads/Product-Design-System', '<historical-design-input>']],
]);

function closure(root, plan) {
  const selected = new Set(), reasons = new Map(), externals = new Set();
  function add(ref, reason) {
    if (ignore(ref)) return;
    const absolute = safe(root, ref), stat = lstatSync(absolute);
    if (stat.isDirectory()) { files(root, ref).forEach(child => add(child, reason)); return; }
    if (!stat.isFile()) throw new Error(`unsupported-source: ${ref}`);
    selected.add(ref);
    if (!reasons.has(ref)) reasons.set(ref, new Set());
    reasons.get(ref).add(reason);
  }
  // Documentation and skill asset families are intentional data dependencies; scripts use a module graph.
  for (const file of plan.resources.files) if (!file.ref.startsWith('scripts/')) add(file.ref, 'M1-skill-or-governance-resource');
  for (const ref of ['yss-project.yaml', 'skills-lock.json', ...ENTRYPOINTS]) add(ref, 'runtime-entry');
  for (const ref of selected) {
    const data = readFileSync(safe(root, ref));
    if (data.includes(0)) continue;
    const text = data.toString('utf8');
    // Skill instructions name additional executable entries; project output examples are not source dependencies.
    if (ref.startsWith('.agents/skills/') && /\.(md|ya?ml)$/.test(ref)) {
      for (const match of text.matchAll(/(?:\.template-source\/|scripts\/)[a-zA-Z0-9_./-]+/g)) {
        const candidate = match[0].replace(/[.,]+$/, '');
        if (!ignore(candidate) && existsSync(path.join(root, candidate)) && lstatSync(path.join(root, candidate)).isFile()) add(candidate, `instruction:${ref}`);
      }
    }
  }
  // Use the repository's pinned parser; regex import scanning mistakes JSDoc and examples for code.
  const entries = [...selected].filter(ref => /\.[cm]?[jt]s$/.test(ref)
    || readFileSync(safe(root, ref)).subarray(0, 23).toString().startsWith('#!/usr/bin/env node'));
  const { metafile } = inspectModules({ absWorkingDir: root, entryPoints: entries, bundle: true,
    write: false, outdir: '.plugin-module-analysis', platform: 'node', format: 'esm', packages: 'external',
    metafile: true, logLevel: 'silent' });
  for (const [ref, module] of Object.entries(metafile.inputs)) {
    add(ref, 'parsed-module-closure');
    for (const dependency of module.imports) if (dependency.external && !dependency.path.startsWith('node:')) externals.add(dependency.path);
  }
  return { refs: [...selected].sort(), reasons, externals: [...externals].sort() };
}

function outputPath(output, root) {
  const resolved = path.resolve(output);
  if (path.basename(resolved) !== NAME) throw new Error(`output-name-must-be-${NAME}`);
  if (resolved.startsWith(`${root}${path.sep}`) && !resolved.startsWith(`${root}/.template-source/cache/`)) throw new Error('output-inside-source-forbidden');
  let cursor = path.parse(resolved).root;
  for (const part of resolved.slice(cursor.length).split(path.sep)) {
    cursor = path.join(cursor, part);
    if (existsSync(cursor) && (lstatSync(cursor).isSymbolicLink() || !lstatSync(cursor).isDirectory())) throw new Error('unsafe-output-parent');
  }
  if (existsSync(resolved)) throw new Error('output-already-exists');
  return resolved;
}

function packLegacyCli(root, cliSource, pin) {
  const parent = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-legacy-cli-source-')));
  const checkout = path.join(parent, 'create-yss-spec');
  try {
    execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', cliSource, checkout]);
    execFileSync('git', ['-C', checkout, 'checkout', '--quiet', '--detach', pin.cli_commit]);
    // The historical 3.4.9 snapshot hash was produced under zh_CN collation.
    execFileSync(process.execPath, [path.join(checkout, 'scripts/sync-template.js'), '--require-committed'],
      { cwd: checkout, env: { ...process.env, YSS_SPEC_TEMPLATE_REPO: root, LANG: 'zh_CN.UTF-8', LC_ALL: 'zh_CN.UTF-8' }, stdio: 'pipe' });
    const snapshotFile = path.join(checkout, 'template.snapshot.json');
    const snapshot = JSON.parse(readFileSync(snapshotFile));
    snapshot.generatedAt = '1970-01-01T00:00:00.000Z';
    writeFileSync(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`);
    return packCli(checkout, pin);
  } finally { rmSync(parent, { recursive: true, force: true }); }
}

export function build({ sourceRoot = ROOT, output, cliRoot = process.env.YSS_BACKEND_PLUGIN_CLI_ROOT || path.join(ROOT, 'submodules/create-yss-spec') }) {
  const root = realpathSync(sourceRoot), target = outputPath(output, root);
  const plan = planPlugin(root), graph = closure(root, plan);
  const top = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  if (realpathSync(top) !== root) throw new Error('source-must-be-git-root');
  const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const status = execFileSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' });
  const source = { state: status ? 'working-tree' : 'committed', base_commit: commit,
    content_commit: status ? null : commit, distribution: 'development-only' };
  const pinBytes = readFileSync(path.join(HERE, 'cli-pin.json'));
  const legacyPinBytes = readFileSync(path.join(HERE, 'legacy-cli-pin.json'));
  const skillIds = plan.skills.map(skill => skill.id);
  const cli = packCli(cliRoot, JSON.parse(pinBytes), { agentRuntime: 'codex', skillIds });
  const legacyCli = packLegacyCli(root, cliRoot, JSON.parse(legacyPinBytes));
  const overlay = projectOverlay(root, cli, graph.refs, source);
  mkdirSync(path.dirname(target), { recursive: true });
  const staging = mkdtempSync(path.join(path.dirname(target), '.yss-plugin-build-'));
  const records = [];
  function write(ref, bytes, mode = 0o644, provenance = {}) {
    const destination = path.join(staging, ref);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, bytes); chmodSync(destination, mode);
    records.push({ ref, sha256: hash(bytes), mode, ...provenance });
  }
  try {
    for (const ref of graph.refs) {
      const absolute = safe(root, ref), original = readFileSync(absolute), stat = lstatSync(absolute);
      let bytes = original;
      const replacement = REDACTIONS.get(ref);
      if (replacement) bytes = Buffer.from(bytes.toString('utf8').replaceAll(...replacement));
      if (!bytes.includes(0) && /\/(?:Users|home)\//.test(bytes.toString('utf8'))) throw new Error(`nonportable-private-path: ${ref}`);
      write(`assets/template/${ref}`, bytes, stat.mode & 0o777, { source_ref: ref, source_sha256: hash(original),
        reasons: [...graph.reasons.get(ref)].sort(), transformation: bytes.equals(original) ? 'identity' : 'historical-path-redaction' });
    }
    const metadata = JSON.parse(readFileSync(path.join(HERE, 'templates/plugin.json')));
    metadata.name = identity.name; metadata.version = identity.version;
    metadata.interface.displayName = identity.displayName; metadata.interface.shortDescription = identity.flow;
    const manifest = Buffer.from(JSON.stringify(metadata, null, 2) + '\n');
    write('.codex-plugin/plugin.json', manifest);
    write('scripts/runtime.mjs', readFileSync(path.join(HERE, 'runtime.mjs')), 0o644);
    write('scripts/project.mjs', readFileSync(path.join(HERE, 'project.mjs')), 0o644);
    write('scripts/plugin.mjs', Buffer.from("#!/usr/bin/env node\nimport { main } from './runtime.mjs';\ntry { await main(); } catch (error) { console.error(JSON.stringify({ result: 'blocked', error: error.message, ready_for_agent: false })); process.exitCode = 1; }\n"), 0o755);
    write('assets/cli-package.json.gz', cli.archive);
    write('assets/cli-pin.json', pinBytes);
    write('assets/installed-skills.json', Buffer.from(`${JSON.stringify(skillIds)}\n`));
    write('assets/legacy-cli-package.json.gz', legacyCli.archive);
    write('assets/legacy-cli-pin.json', legacyPinBytes);
    write('assets/project-overlay.json.gz', overlay.archive);
    write('assets/project-binding.json', Buffer.from(`${JSON.stringify(overlay.binding, null, 2)}\n`));
    write('assets/project-baseline.json.gz', cli.baselineArchive);
    for (const ref of ['identity.json', 'entry.mjs', 'migration.mjs']) write(`scripts/${ref}`, readFileSync(path.join(HERE, ref)));
    for (const ref of ['legacy-m4.json', 'legacy-0.2.json']) write(`assets/${ref}`, readFileSync(path.join(HERE, ref)));
    write(`skills/${identity.entry}/SKILL.md`, readFileSync(path.join(HERE, 'templates/entry-SKILL.md')), 0o644,
      { transformation: 'project-local-entry', source_ref: 'templates/entry-SKILL.md' });
    write('README.md', readFileSync(path.join(HERE, 'templates/README.md')));
    const lock = { schema_version: 1, plugin: NAME, phase: 'entry-and-migration', source, cli: cli.pin, legacy_cli: legacyCli.pin,
      builder: { node: process.versions.node, parser: `esbuild@${parserVersion}`,
        files: ['build.mjs', 'runtime.mjs', 'project.mjs', 'pack-cli.mjs', 'project-overlay.mjs', 'cli-pin.json', 'legacy-cli-pin.json', 'plan.mjs', 'templates/plugin.json', 'identity.json', 'entry.mjs', 'migration.mjs', 'legacy-m4.json', 'legacy-0.2.json', 'templates/entry-SKILL.md', 'templates/README.md'].map(ref => ({ ref, sha256: hash(readFileSync(path.join(HERE, ref))) })) },
      external_dependencies: { platform: plan.platform_dependencies.map(({ requested, provider }) => ({ requested, provider, availability: 'unverified', packaging: 'external' })), node_modules: graph.externals },
      runtime_entries: ENTRYPOINTS, closure_scope: 'literal-module-graph-and-governance-data-families',
      files: records.sort((a, b) => a.ref.localeCompare(b.ref)) };
    writeFileSync(path.join(staging, 'bundle-lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
    const result = verify(staging);
    // No replacement or merge into an existing user directory.
    if (existsSync(target)) throw new Error('output-already-exists');
    renameSync(staging, target);
    return { ...result, output: target, phase: 'entry-and-migration', development_only: true };
  } catch (error) { rmSync(staging, { recursive: true, force: true }); throw error; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { 'source-root': { type: 'string', default: ROOT }, 'cli-root': { type: 'string' }, output: { type: 'string' } } });
    if (!values.output) throw new Error('usage: build.mjs --output <new-directory>/yss-backend-delivery [--source-root <template>]');
    console.log(JSON.stringify(build({ sourceRoot: values['source-root'], cliRoot: values['cli-root'], output: values.output }), null, 2));
  } catch (error) { console.error(JSON.stringify({ result: 'blocked', error: error.message, ready_for_agent: false })); process.exitCode = 1; }
}
