import identity from './identity.json' with { type: 'json' };
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { projectEntry } from './entry.mjs';
import { migrationPlan, migrationApply } from './migration.mjs';
import { hash, safe, files } from './runtime.mjs';

const RECEIPT = '.yss-plugin.json';
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => hash(JSON.stringify(canonical(value)));
function stat(file) { try { return lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
function physical(value) {
  if (!value || typeof value !== 'string') throw new Error('path-required');
  const resolved = path.resolve(value);
  let cursor = path.parse(resolved).root;
  for (const part of resolved.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const s = stat(cursor);
    if (s && (!s.isDirectory() || s.isSymbolicLink())) throw new Error(`unsafe-directory: ${cursor}`);
  }
  return resolved;
}
function within(child, parent) { return child === parent || child.startsWith(`${parent}${path.sep}`); }
function corePath(ref) {
  return /^(scripts\/|\.(agents|codex|cursor|pi)\/skills\/|docs\/process\/|docs\/agents\/(yss-skill-registry|digital-human-roles)\.yaml$)/.test(ref)
    && !ref.endsWith('/.yss-skills-manifest.json');
}
function execute(file, args, cwd, timeout = 120000) {
  const env = { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' };
  const result = spawnSync(process.execPath, [file, ...args], { cwd, input: '', env, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`command-failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}
function withPinnedCli(root, prefix, action) {
  const archive = JSON.parse(gunzipSync(readFileSync(safe(root, `assets/${prefix}cli-package.json.gz`)), { maxOutputLength: 256 * 1024 * 1024 }));
  const pin = JSON.parse(readFileSync(safe(root, `assets/${prefix}cli-pin.json`)));
  if (archive.schema_version !== 1 || digest(archive.pin) !== digest(pin) || !Array.isArray(archive.files)) throw new Error('cli-archive-identity-mismatch');
  const temp = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-fixed-cli-')));
  try {
    const refs = new Set();
    for (const entry of archive.files) {
      const ref = entry.ref;
      if (typeof ref !== 'string' || !ref || /[\\\x00-\x1f:]/.test(ref) || path.isAbsolute(ref)
          || ref.split('/').some(x => !x || x === '.' || x === '..') || refs.has(ref)) throw new Error('unsafe-cli-archive-entry');
      refs.add(ref);
      const bytes = Buffer.from(entry.content, 'base64');
      if (hash(bytes) !== entry.sha256 || !Number.isInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o777) throw new Error('cli-archive-file-mismatch');
      const destination = path.join(temp, ref);
      mkdirSync(path.dirname(destination), { recursive: true }); writeFileSync(destination, bytes, { flag: 'wx' }); chmodSync(destination, entry.mode);
    }
    const require = createRequire(path.join(temp, 'package.json'));
    const runtime = require('./src/template/instance-runtime.js');
    const snapshot = runtime.readTemplateSnapshot();
    if (snapshot.sourceState !== 'committed' || snapshot.templateCommit !== pin.template_commit || snapshot.snapshotHash !== pin.snapshot_hash
        || snapshot.manifestHash !== pin.manifest_hash || require('./package.json').version !== pin.version) throw new Error('cli-snapshot-mismatch');
    return action({ root: temp, pin, runtime, bin: path.join(temp, 'bin/create-yss-spec.js'), agentRuntime: prefix ? null : 'codex',
      skillIds: prefix ? [] : JSON.parse(readFileSync(safe(root, 'assets/installed-skills.json'))),
      overlay: JSON.parse(gunzipSync(readFileSync(safe(root, 'assets/project-overlay.json.gz')), { maxOutputLength: 256 * 1024 * 1024 })),
      baseline: prefix ? [] : JSON.parse(gunzipSync(readFileSync(safe(root, 'assets/project-baseline.json.gz')), { maxOutputLength: 256 * 1024 * 1024 })),
      binding: JSON.parse(readFileSync(safe(root, 'assets/project-binding.json'))) });
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
const withCli = (root, action) => withPinnedCli(root, '', action);
const withLegacyCli = (root, action) => withPinnedCli(root, 'legacy-', action);
function targetState(target) {
  const s = stat(target);
  return s ? { kind: readdirSync(target).length ? 'nonempty' : 'empty', device: s.dev, inode: s.ino } : { kind: 'missing' };
}
function backendState(value, target, plugin) {
  if (!value) return null;
  const root = physical(value);
  if (!stat(root) || within(root, target) || within(target, root) || within(root, plugin) || within(plugin, root)) throw new Error('backend-must-be-separate-existing-directory');
  const git = args => {
    const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 5000 });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const gitRoot = git(['rev-parse', '--show-toplevel']);
  return { root, implementation_scope: 'external-repository', registration_status: 'pending-lifecycle-onboarding',
    git_root: gitRoot, branch: git(['symbolic-ref', '--short', 'HEAD']), commit: git(['rev-parse', 'HEAD']) };
}
function options(input) {
  const result = {};
  for (const key of ['project-name', 'business-domain', 'team-size', 'issue-tracker']) {
    const value = input[key];
    if (typeof value !== 'string' || !value.trim() || value.startsWith('--') || /[\x00-\x1f]/.test(value) || value.length > 1000) throw new Error(`invalid-or-missing-option: ${key}`);
    result[key] = value;
  }
  if (!['github', 'gitlab'].includes(result['issue-tracker'])) throw new Error('explicit-issue-tracker-required: github|gitlab');
  return result;
}
function cliArgs(opts, target, cli) {
  return [...Object.entries(opts).flatMap(([key, value]) => [`--${key}`, value]), '--target-dir', target,
    ...(cli.agentRuntime ? ['--agent-runtime', cli.agentRuntime] : []), '--no-example-docs'];
}
function projectCheck(root, target, cli) {
  const identityFile = safe(target, 'yss-project.yaml');
  if (!lstatSync(identityFile).isFile() || cli.runtime.readTargetIdentity(target).fields.repository_mode !== 'project-instance') throw new Error('project-instance-required');
  const metadata = JSON.parse(readFileSync(safe(target, '.yss-template.json')));
  const mismatch = metadata.cliVersion !== cli.pin.version || metadata.templateCommit !== cli.pin.template_commit
    || metadata.snapshotHash !== cli.pin.snapshot_hash || metadata.managedFilesManifestVersion !== cli.pin.manifest_hash
    || metadata.templateSourceState !== 'committed';
  if (mismatch) throw new Error('project-version-mismatch: preserve project; use matching plugin or review a migration plan');
  // Expected bytes come from the pinned CLI, not from user-editable project metadata or the receipt.
  const expected = new Set(cli.binding.map(x => x.ref));
  for (const file of cli.binding) {
    const absolute = safe(target, file.ref), s = lstatSync(absolute);
    if (!s.isFile() || hash(readFileSync(absolute)) !== file.sha256 || (s.mode & 0o777) !== file.mode) throw new Error(`project-core-drift: ${file.ref}`);
  }
  for (const prefix of ['scripts', '.agents/skills', '.codex/skills', '.cursor/skills', '.pi/skills', '.template-spec/process']) {
    if (!existsSync(path.join(target, prefix))) continue;
    for (const ref of files(target, prefix)) if (corePath(ref) && !expected.has(ref)) throw new Error(`project-core-extra-file: ${ref}`);
  }
  execute(safe(target, 'scripts/verify-context-contract'), ['--root', target], target);
  let binding = null;
  if (stat(path.join(target, RECEIPT))) {
    binding = JSON.parse(readFileSync(safe(target, RECEIPT)));
    if (binding.schema_version !== 1 || binding.plugin !== (cli.expectedPlugin || identity.name) || digest(binding.cli) !== digest(cli.pin)
        || binding.plugin_bundle_sha256 !== (cli.expectedBundle || hash(readFileSync(safe(root, 'bundle-lock.json'))))
        || binding.core_digest !== digest(cli.binding) || binding.execution_owner !== 'project-local-yss-product-lifecycle'
        || binding.business_execution_ready !== false || binding.execution_scope !== 'plan-to-backend') throw new Error('plugin-binding-mismatch: migration review required');
  }
  return { result: binding ? 'binding-matched' : 'compatible-unbound', effective_orchestrator: path.join(target, '.agents/skills/yss-product-lifecycle/SKILL.md'),
    cli: cli.pin, binding, ready_for_agent: false, pending: ['M5-real-delivery', 'M6-installed-discovery'] };
}
function makePlan(root, input, cli) {
  const target = physical(input['target-dir']);
  if (within(target, root) || within(root, target) || !stat(path.dirname(target))) throw new Error('target-must-have-existing-separate-parent');
  const state = targetState(target), backend = backendState(input['backend-root'], target, root);
  const bundle = hash(readFileSync(safe(root, 'bundle-lock.json')));
  const plan = { schema_version: 1, kind: state.kind === 'nonempty' ? 'bind-existing' : 'initialize', target,
    target_state: state, plugin_bundle_sha256: bundle, cli: cli.pin, backend, ready_for_agent: false, development_overlay: cli.overlay.source, execution_scope: 'plan-to-backend' };
  if (plan.kind === 'bind-existing') {
    const check = projectCheck(root, target, cli);
    if (check.binding) throw new Error('project-already-bound: use project-check');
    plan.write_files = [RECEIPT];
    plan.project_guard = digest({ metadata: hash(readFileSync(safe(target, '.yss-template.json'))), context: hash(readFileSync(safe(target, 'CONTEXT.md'))) });
  } else {
    plan.options = options(input);
    const preview = execute(cli.bin, [...cliArgs(plan.options, target, cli), '--dry-run'], cli.root);
    plan.write_files = [...new Set([...preview.split('\n').flatMap(line => {
      const match = line.match(/^(?:copy|render): (.+?)(?: \[[^\]]+\])?$/); return match ? [match[1]] : [];
    }), ...cli.binding.map(file => file.ref), '.yss-template.json', 'skills-lock.json', RECEIPT])].sort();
    if (plan.write_files.length < 10) throw new Error('init-preview-incomplete');
  }
  plan.plan_id = digest(plan);
  return plan;
}
function applyPlan(root, plan, cli) {
  const current = makePlan(root, { 'target-dir': plan.target, 'backend-root': plan.backend?.root, ...plan.options }, cli);
  if (digest(current) !== digest(plan)) throw new Error('stale-or-edited-plan: regenerate project-plan');
  const receipt = { schema_version: 1, plugin: identity.name, cli: cli.pin,
    plugin_bundle_sha256: plan.plugin_bundle_sha256, core_digest: digest(cli.binding), backend: plan.backend,
    plan_id: plan.plan_id, execution_scope: 'plan-to-backend', execution_owner: 'project-local-yss-product-lifecycle', business_execution_ready: false };
  if (plan.kind === 'bind-existing') {
    const file = path.join(plan.target, RECEIPT), content = json(receipt);
    writeFileSync(file, content, { flag: 'wx', mode: 0o644 });
    try { return { ...projectCheck(root, plan.target, cli), result: 'bound', target: plan.target }; }
    catch (error) {
      if (stat(file)?.isFile() && readFileSync(file, 'utf8') === content) rmSync(file);
      throw error;
    }
  }
  const stage = mkdtempSync(path.join(path.dirname(plan.target), '.yss-governance-init-'));
  let removedEmpty = false, installed = false;
  try {
    execute(cli.bin, cliArgs(plan.options, stage, cli), cli.root);
    execute(cli.bin, ['skills', 'ensure', ...cli.skillIds, '--target-dir', stage, '--apply'], cli.root);
    applyOverlay(stage, cli);
    projectCheck(root, stage, cli);
    writeFileSync(path.join(stage, RECEIPT), json(receipt), { flag: 'wx', mode: 0o644 });
    // Recheck target after the potentially slow initializer. Never clear a nonempty user directory.
    if (digest(targetState(plan.target)) !== digest(plan.target_state)) throw new Error('target-changed-during-init');
    if (plan.target_state.kind === 'empty') { rmdirSync(plan.target); removedEmpty = true; }
    if (stat(plan.target)) throw new Error('target-appeared-during-init');
    renameSync(stage, plan.target); installed = true;
    return { result: 'initialized', target: plan.target, cli: cli.pin, receipt: RECEIPT, backend: plan.backend, ready_for_agent: false };
  } finally {
    if (!installed) {
      rmSync(stage, { recursive: true, force: true });
      if (removedEmpty && !stat(plan.target)) mkdirSync(plan.target);
    }
  }
}

export function runProjectCommand(root, command, values) {
  return withCli(root, cli => {
    if (command === 'project-plan') return makePlan(root, values, cli);
    if (command === 'project-apply') {
      if (!values.plan) throw new Error('plan-file-required');
      return applyPlan(root, JSON.parse(readFileSync(values.plan)), cli);
    }
    const api = { projectCheck, physical, withCli, withLegacyCli, execute, digest, coreFiles, applyBaseline, applyOverlay };
    if (command === 'project-migration-plan') return migrationPlan(root, physical(values['target-dir']), cli, api);
    if (command === 'project-migration-apply') return migrationApply(root, JSON.parse(readFileSync(values.plan)), cli, api);
    const target = physical(values['target-dir']);
    if (within(target, root)) throw new Error('plugin-directory-is-not-project');
    const check = projectCheck(root, target, cli);
    if (command === 'project-import-design') {
      if (!check.binding || !values.bundle) throw new Error('bound-project-and-design-bundle-required');
      if (existsSync(path.join(target, '.yss-backend-delivery.json'))) throw new Error('backend-already-delivered');
      return JSON.parse(execute(safe(target, 'scripts/strategic-consumer-entry'), ['--root', target, '--bundle', path.resolve(values.bundle)], target));
    }
    if (command === 'project-entry') return projectEntry(target, values, check, execute);
    if (['query-project', 'project-resume', 'project-dispatch'].includes(command)) {
      if (!check.binding) throw new Error('project-binding-required');
      if(command==='project-resume') {
        if(!values.checkpoint)throw new Error('checkpoint-required');
        check.verification = execute(safe(target,'scripts/verify-lifecycle-checkpoint'),[safe(target,values.checkpoint)],target);
      } else if(command==='project-dispatch') {
        if(!values.input)throw new Error('dispatch-input-required');
        check.task = JSON.parse(execute(safe(target,'scripts/dispatch-slice-task'),['--root',target,'--input',safe(target,values.input)],target));
      } else check.query = JSON.parse(execute(safe(target, 'scripts/query-lifecycle-context'), ['--mode', 'route', '--work-unit', values['work-unit'] || 'work-unit.plan-requirements'], target));
    }
    return check;
  });
}

function applyOverlay(stage, cli) {
  if(cli.overlay.schema_version!==1 || cli.overlay.source.distribution!=='development-only')throw new Error('invalid-development-overlay');
  const expected = new Map(cli.binding.map(file=>[file.ref,file]));
  for(const file of cli.overlay.files) {
    const record=expected.get(file.ref), bytes=Buffer.from(file.content,'base64');
    if(!record || hash(bytes)!==record.sha256 || file.mode!==record.mode)throw new Error('overlay-binding-mismatch');
    if(path.isAbsolute(file.ref)||file.ref.split('/').some(x=>!x||x==='..'||x==='.')||/[\\\x00-\x1f:]/.test(file.ref))throw new Error('unsafe-overlay-path');
    const destination=path.join(stage,file.ref);
    mkdirSync(path.dirname(destination),{recursive:true});
    // Stage is exclusively owned by this initialization; never patch an existing project.
    if(existsSync(destination))safe(stage,file.ref);
    writeFileSync(destination,bytes);chmodSync(destination,file.mode);
  }
  execute(path.join(stage,'scripts/update-skill-lock'),[],stage);
}

function applyBaseline(stage, cli) {
  const expected = new Map(cli.binding.map(file => [file.ref, file]));
  for (const file of cli.baseline) {
    const record = expected.get(file.ref), bytes = Buffer.from(file.content, 'base64');
    if (!record || hash(bytes) !== file.sha256 || record.mode !== file.mode) {
      throw new Error(`baseline-binding-mismatch: ${file.ref}`);
    }
    if (path.isAbsolute(file.ref) || file.ref.split('/').some(part => !part || part === '.' || part === '..')
        || /[\\\x00-\x1f:]/.test(file.ref)) throw new Error(`unsafe-baseline-path: ${file.ref}`);
    const destination = path.join(stage, file.ref);
    let parent = stage;
    for (const part of file.ref.split('/').slice(0, -1)) {
      parent = path.join(parent, part);
      if (existsSync(parent) && (lstatSync(parent).isSymbolicLink() || !lstatSync(parent).isDirectory())) {
        throw new Error(`unsafe-baseline-parent: ${file.ref}`);
      }
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    if (existsSync(destination)) safe(stage, file.ref);
    writeFileSync(destination, bytes); chmodSync(destination, file.mode);
  }
}

const coreFiles = stage => files(stage).filter(corePath);

// Shared internal operations for the migration engine and its fault-injection tests.
export const projectOperations = Object.freeze({ projectCheck, physical, withCli, withLegacyCli, execute, digest, coreFiles, applyBaseline, applyOverlay });
