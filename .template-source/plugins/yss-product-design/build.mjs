#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, chmodSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import identity from './identity.json' with { type: 'json' };
import pin from './cli-pin.json' with { type: 'json' };
import { files, hash, safe } from '../yss-backend-delivery/runtime.mjs';
import { corePath } from '../yss-backend-delivery/pack-cli.mjs';

const HERE = import.meta.dirname, ROOT = path.resolve(HERE, '../../..');
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
const json = value => JSON.stringify(value, null, 2) + '\n';
export async function build({ output, sourceRoot = path.join(ROOT, 'submodules/yss-harness-design-agent'), cliRoot = process.env.YSS_DESIGN_PLUGIN_CLI_ROOT || path.join(ROOT, 'submodules/create-yss-strategic-design') }) {
  const source = realpathSync(sourceRoot), cli = realpathSync(cliRoot), target = path.resolve(output);
  if (path.basename(target) !== identity.name || existsSync(target)) throw new Error('new-named-output-required');
  if ((target.startsWith(ROOT + path.sep) && !target.startsWith(path.join(ROOT, '.template-source/cache/'))) || source.startsWith(target + path.sep) || cli.startsWith(target + path.sep)) throw new Error('unsafe-output');
  let cursor = path.parse(target).root;
  for (const part of target.slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); if (existsSync(cursor) && (lstatSync(cursor).isSymbolicLink() || !lstatSync(cursor).isDirectory())) throw new Error('unsafe-output-parent'); }
  if (git(cli, 'rev-parse', 'HEAD') !== pin.cli_commit || git(cli, 'status', '--porcelain', '--untracked-files=all')) throw new Error('cli-source-not-pinned-and-clean');
  const { loadBundle } = await import(path.join(cli, 'vendor/cli-core/bundle.mjs'));
  const bundle = loadBundle(cli);
  if (bundle.pkg.name !== pin.name || bundle.pkg.version !== pin.version || bundle.snapshot.sourceState !== 'committed'
      || bundle.snapshot.templateCommit !== pin.template_commit || bundle.snapshot.snapshotHash !== pin.snapshot_hash
      || bundle.snapshot.manifestHash !== pin.manifest_hash || bundle.core.digest !== pin.core_digest) throw new Error('cli-pin-mismatch');
  const sourceInfo = { state: git(source, 'status', '--porcelain', '--untracked-files=all') ? 'working-tree' : 'committed', base_commit: git(source, 'rev-parse', 'HEAD'), distribution: 'development-only' };
  const sourceRefs = ['AGENTS.md', 'CONTEXT.md', 'DESIGN.md', 'yss-project.yaml', 'skills-lock.json',
    ...['scripts', '.template-spec', '.agents/skills'].flatMap(ref => existsSync(path.join(source, ref)) ? files(source, ref) : [])]
    .filter(ref => !/(?:^|\/)(?:node_modules|__pycache__|\.git)(?:\/|$)|\.pyc$|\.DS_Store$/.test(ref));
  const canonicalSkills = sourceRefs.filter(ref => ref.startsWith('.agents/skills/'));
  for (const runtime of ['.codex', '.cursor', '.pi']) for (const ref of canonicalSkills) sourceRefs.push(ref.replace('.agents/', `${runtime}/`));
  const sourceRef = ref => ref.replace(/^\.(codex|cursor|pi)\/skills\//, '.agents/skills/');
  const refs = [...new Set(sourceRefs)].sort();
  const binding = refs.filter(corePath).map(ref => ({ ref, sha256: hash(readFileSync(safe(source, sourceRef(ref)))), mode: lstatSync(safe(source, sourceRef(ref))).mode & 0o777 }));
  const selected = new Set(binding.map(item => item.ref));
  const overlay = { schema_version: 1, source: sourceInfo, files: binding,
    remove: [...bundle.files.keys()].filter(ref => corePath(ref) && !selected.has(ref)) };
  mkdirSync(path.dirname(target), { recursive: true });
  const stage = mkdtempSync(path.join(path.dirname(target), '.design-plugin-build-')), records = [];
  const write = (ref, bytes, mode = 0o644, provenance = {}) => {
    const file = path.join(stage, ref); mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes); chmodSync(file, mode);
    records.push({ ref, sha256: hash(bytes), mode, ...provenance });
  };
  try {
    const cliRefs = ['package.json', 'template.manifest.json', 'template.snapshot.json', 'cli-core.lock.json', ...['bin', 'config', 'vendor', 'template'].flatMap(ref => files(cli, ref))];
    for (const ref of cliRefs) write(`assets/cli/${ref}`, readFileSync(safe(cli, ref)), lstatSync(safe(cli, ref)).mode & 0o777, { source_ref: `fixed-cli/${ref}` });
    for (const ref of refs) write(`assets/template/${ref}`, readFileSync(safe(source, sourceRef(ref))), lstatSync(safe(source, sourceRef(ref))).mode & 0o777, { source_ref: ref });
    write('assets/cli-pin.json', Buffer.from(json(pin)));
    write('assets/project-binding.json', Buffer.from(json(binding)));
    write('assets/project-overlay.json', Buffer.from(json(overlay)));
    const manifest = JSON.parse(readFileSync(path.join(HERE, 'templates/plugin.json')));
    manifest.name = identity.name; manifest.version = identity.version;
    manifest.description = '从 Plan、Spec 到已批准的产品设计方案，向 YSS 后端交付插件交接。';
    Object.assign(manifest.interface, { displayName: identity.displayName, shortDescription: identity.flow,
      longDescription: manifest.description, defaultPrompt: ['从需求开始产品设计', '复用已批准的 Spec 继续设计', '恢复产品设计并准备后端交接'] });
    write('.codex-plugin/plugin.json', Buffer.from(json(manifest)));
    write('scripts/identity.json', readFileSync(path.join(HERE, 'identity.json')));
    write('scripts/runtime.mjs', readFileSync(path.join(HERE, '../yss-backend-delivery/runtime.mjs')));
    write('scripts/project.mjs', readFileSync(path.join(HERE, 'project.mjs')));
    write('scripts/yaml.mjs', readFileSync(path.join(ROOT, 'scripts/vendor/yaml.mjs')));
    write('scripts/plugin.mjs', Buffer.from("#!/usr/bin/env node\nimport { main } from './runtime.mjs';\ntry { await main(); } catch (error) { console.error(JSON.stringify({ result: 'blocked', error: error.message, ready_for_agent: false })); process.exitCode = 1; }\n"), 0o755);
    write(`skills/${identity.entry}/SKILL.md`, readFileSync(path.join(HERE, 'templates/entry-SKILL.md')));
    write('README.md', readFileSync(path.join(HERE, 'README.md')));
    const lock = { schema_version: 1, plugin: identity.name, cli: pin, source: sourceInfo,
      builder: ['build.mjs', 'project.mjs', 'identity.json', 'cli-pin.json', 'templates/entry-SKILL.md'].map(ref => ({ ref, sha256: hash(readFileSync(path.join(HERE, ref))) })),
      external_dependencies: { platform: [{ requested: 'product-design:index', packaging: 'external', availability: 'requires-codex-session', when: 'selected-visual-source-adapter' }] },
      closure_scope: 'fixed-cli-and-design-profile-governance', files: records.sort((a, b) => a.ref.localeCompare(b.ref)) };
    writeFileSync(path.join(stage, 'bundle-lock.json'), json(lock));
    execFileSync(process.execPath, [path.join(stage, 'scripts/plugin.mjs'), 'verify'], { encoding: 'utf8', timeout: 60000 });
    if (existsSync(target)) throw new Error('output-appeared-during-build');
    renameSync(stage, target);
    return { result: 'built', output: target, files: records.length, cli: pin, source: sourceInfo, ready_for_agent: false, release_ready: false };
  } catch (error) { rmSync(stage, { recursive: true, force: true }); throw error; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(HERE, 'build.mjs')) {
  try { const { values } = parseArgs({ options: { output: { type: 'string' }, 'source-root': { type: 'string' }, 'cli-root': { type: 'string' } } });
    if (!values.output) throw new Error('output-required');
    console.log(json(await build({ output: values.output, sourceRoot: values['source-root'], cliRoot: values['cli-root'] })));
  } catch (error) { console.error(JSON.stringify({ result: 'blocked', error: error.message })); process.exitCode = 1; }
}
