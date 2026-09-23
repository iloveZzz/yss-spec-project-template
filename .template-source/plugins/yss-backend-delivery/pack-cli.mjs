import { readFileSync, lstatSync, existsSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { files, safe, hash } from './runtime.mjs';

export const corePath = ref => /^(scripts\/|\.(agents|codex|cursor|pi)\/skills\/|docs\/process\/|docs\/agents\/(yss-skill-registry|digital-human-roles)\.yaml$)/.test(ref)
  && !ref.endsWith('/.yss-skills-manifest.json');

export function packCli(cliRoot, pin, { agentRuntime, skillIds = [] } = {}) {
  const root = realpathSync(cliRoot);
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  if (realpathSync(git(['rev-parse', '--show-toplevel'])) !== root || git(['rev-parse', 'HEAD']) !== pin.cli_commit
      || git(['status', '--porcelain', '--untracked-files=all'])) throw new Error('cli-source-not-pinned-and-clean');
  const pkg = JSON.parse(readFileSync(safe(root, 'package.json')));
  if (pkg.name !== pin.name || pkg.version !== pin.version) throw new Error('cli-version-mismatch');
  const require = createRequire(path.join(root, 'package.json'));
  const snapshot = require('./src/template/instance-runtime.js').readTemplateSnapshot();
  if (snapshot.sourceState !== 'committed' || snapshot.requestedRef !== pin.template_commit
      || snapshot.templateCommit !== pin.template_commit || snapshot.snapshotHash !== pin.snapshot_hash
      || snapshot.manifestHash !== pin.manifest_hash) throw new Error('cli-snapshot-mismatch');
  const refs = ['package.json', 'template.manifest.json', 'template.snapshot.json',
    ...files(root, 'bin'), ...files(root, 'src'), ...files(root, 'template')];
  for (const name of ['LICENSE', 'LICENSE.md', 'README.md']) if (existsSync(path.join(root, name))) refs.push(name);
  const entries = [...new Set(refs)].sort().map(ref => {
    const absolute = safe(root, ref), bytes = readFileSync(absolute);
    return { ref, sha256: hash(bytes), mode: lstatSync(absolute).mode & 0o777, content: bytes.toString('base64') };
  });
  // Obtain the actual init file set from the public CLI, not the sync API or a copied initializer.
  const temp = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-cli-plan-')));
  let preview, installedBinding, baselineFiles;
  try {
    const initArgs = ['--project-name', 'Plugin binding baseline',
      '--business-domain', 'Template tooling', '--team-size', '1', '--issue-tracker', 'github', '--no-example-docs',
      '--target-dir', path.join(temp, 'governance'), ...(agentRuntime ? ['--agent-runtime', agentRuntime] : [])];
    preview = spawnSync(process.execPath, [path.join(root, 'bin/create-yss-spec.js'), ...initArgs, '--dry-run'],
      { cwd: temp, input: '', encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
    if (preview.error || preview.status !== 0) throw new Error(`cli-init-preview-failed: ${preview.error?.message || preview.stderr || preview.stdout}`);
    if (skillIds.length) {
      const init = spawnSync(process.execPath, [path.join(root, 'bin/create-yss-spec.js'), ...initArgs],
        { cwd: temp, input: '', encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
      if (init.error || init.status !== 0) throw new Error(`cli-init-baseline-failed: ${init.error?.message || init.stderr || init.stdout}`);
      const ensure = spawnSync(process.execPath, [path.join(root, 'bin/create-yss-spec.js'), 'skills', 'ensure',
        ...skillIds, '--target-dir', path.join(temp, 'governance'), '--apply'],
        { cwd: temp, input: '', encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
      if (ensure.error || ensure.status !== 0) throw new Error(`cli-skill-baseline-failed: ${ensure.error?.message || ensure.stderr || ensure.stdout}`);
      baselineFiles = files(path.join(temp, 'governance')).filter(corePath).map(ref => {
        const file = safe(path.join(temp, 'governance'), ref), bytes = readFileSync(file);
        return { ref, sha256: hash(bytes), mode: lstatSync(file).mode & 0o777, content: bytes.toString('base64') };
      });
      installedBinding = baselineFiles.map(({ ref, sha256, mode }) => ({ ref, sha256, mode }));
    }
  } finally { rmSync(temp, { recursive: true, force: true }); }
  const index = new Map(entries.map(x => [x.ref, x]));
  const binding = installedBinding || [];
  if (!installedBinding) {
    for (const line of preview.stdout.split('\n')) {
      const match = line.match(/^copy: (.+?)(?: \[[^\]]+\])?$/);
      if (!match || !corePath(match[1])) continue;
      const ref = match[1], encoded = snapshot.encodedPaths?.[ref] || ref;
      const source = index.get(`template/${encoded}`);
      if (!source) throw new Error(`binding-source-missing: ${ref}`);
      binding.push({ ref, sha256: source.sha256, mode: source.mode });
    }
  }
  if (!binding.some(x => x.ref === '.agents/skills/yss-product-lifecycle/SKILL.md')) throw new Error('binding-orchestrator-missing');
  return { archive: gzipSync(Buffer.from(JSON.stringify({ schema_version: 1, pin, files: entries }))),
    baselineArchive: baselineFiles && gzipSync(Buffer.from(JSON.stringify(baselineFiles))),
    binding: binding.sort((a, b) => a.ref.localeCompare(b.ref)), pin };
}
