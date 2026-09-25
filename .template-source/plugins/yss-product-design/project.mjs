import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, rmdirSync, rmSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import identity from './identity.json' with { type: 'json' };
import { parseDocument } from './yaml.mjs';
import { hash, safe, files } from './runtime.mjs';

const PROFILE = 'harness.business-ddd-strategy-handoff';
const RECEIPT = '.yss-plugin.json';
const json = value => JSON.stringify(value, null, 2) + '\n';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => hash(JSON.stringify(canonical(value)));
const read = (root, ref) => JSON.parse(readFileSync(safe(root, ref)));
function yaml(root, ref) {
  const doc = parseDocument(readFileSync(safe(root, ref), 'utf8'), { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`invalid-yaml: ${ref}`);
  return doc.toJS({ maxAliasCount: 0 });
}
export const corePath = ref => /^(scripts\/|\.(agents|codex|cursor|pi)\/skills\/|(?:docs|\.template-spec)\/process\/|(?:docs|\.template-spec)\/agents\/(yss-skill-registry|digital-human-roles)\.yaml$)/.test(ref) && !ref.endsWith('/.yss-skills-manifest.json');
function directory(value) {
  if (!value) throw new Error('directory-required');
  const result = path.resolve(value);
  let cursor = path.parse(result).root;
  for (const part of result.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (existsSync(cursor) && (!lstatSync(cursor).isDirectory() || lstatSync(cursor).isSymbolicLink())) throw new Error(`unsafe-directory: ${cursor}`);
  }
  return result;
}
function execute(file, args, cwd) {
  const result = spawnSync(process.execPath, [file, ...args], { cwd, encoding: 'utf8', input: '', timeout: 120000,
    maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' } });
  if (result.error || result.status !== 0) throw new Error(`command-failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}
function targetState(target) {
  if (!existsSync(target)) return { kind: 'missing' };
  const stat = lstatSync(target);
  return { kind: readdirSync(target).length ? 'nonempty' : 'empty', device: stat.dev, inode: stat.ino };
}
function options(values) {
  const result = {};
  for (const key of ['project-name', 'business-domain', 'team-size', 'issue-tracker']) {
    const value = values[key] || ({ 'team-size': '1', 'issue-tracker': 'local-markdown' }[key]);
    if (typeof value !== 'string' || !value.trim() || value.startsWith('--') || /[\x00-\x1f]/.test(value)) throw new Error(`invalid-option: ${key}`);
    result[key] = value;
  }
  if (!['local-markdown', 'github', 'gitlab'].includes(result['issue-tracker'])) throw new Error('invalid-issue-tracker');
  return result;
}
const cliArgs = (opts, target) => ['init', '--target-dir', target, ...Object.entries(opts).flatMap(([key, value]) => [`--${key}`, value]), '--no-example-docs', '--json'];
function context(root, target) {
  const pin = read(root, 'assets/cli-pin.json');
  const expected = read(root, 'assets/project-binding.json');
  const overlay = read(root, 'assets/project-overlay.json');
  const bundleDigest = hash(readFileSync(safe(root, 'bundle-lock.json')));
  return { pin, expected, overlay, bundleDigest, cli: safe(root, 'assets/cli/bin/create-yss-harness-design.js'), target };
}
function checkProject(root, target, ctx) {
  const project = yaml(target, 'yss-project.yaml'), profile = yaml(target, '.template-spec/process/harness-profile.yaml');
  if (project.schema_version !== 1 || project.repository_mode !== 'project-instance' || profile.profile_id !== PROFILE) throw new Error('design-project-identity-required');
  for (const ref of ['.yss-template.json', '.yss-harness-backend.json', '.yss-harness-frontend.json', '.yss-execution-scope.yaml']) if (existsSync(path.join(target, ref))) throw new Error(`conflicting-project-identity: ${ref}`);
  const metadata = read(target, '.yss-harness-design.json');
  if (metadata.metadataSchemaVersion !== 2 || metadata.profileId !== PROFILE || metadata.cliVersion !== ctx.pin.version
      || metadata.templateCommit !== ctx.pin.template_commit || metadata.snapshotHash !== ctx.pin.snapshot_hash
      || metadata.manifestHash !== ctx.pin.manifest_hash || metadata.coreDigest !== ctx.pin.core_digest
      || metadata.templateSourceState !== 'committed') throw new Error('design-project-version-mismatch');
  const refs = new Set(ctx.expected.map(item => item.ref));
  for (const item of ctx.expected) {
    const file = safe(target, item.ref);
    if (hash(readFileSync(file)) !== item.sha256 || (lstatSync(file).mode & 0o777) !== item.mode) throw new Error(`project-core-drift: ${item.ref}`);
  }
  for (const prefix of ['scripts', '.agents/skills', '.codex/skills', '.cursor/skills', '.pi/skills', '.template-spec/process']) {
    if (existsSync(path.join(target, prefix))) for (const ref of files(target, prefix)) if (corePath(ref) && !refs.has(ref)) throw new Error(`project-core-extra-file: ${ref}`);
  }
  execute(safe(target, 'scripts/verify-context-contract'), ['--root', target], target);
  const binding = existsSync(path.join(target, RECEIPT)) ? read(target, RECEIPT) : null;
  if (binding && (binding.schema_version !== 1 || binding.plugin !== identity.name || binding.profile_id !== PROFILE
      || binding.plugin_bundle_sha256 !== ctx.bundleDigest || binding.core_digest !== digest(ctx.expected)
      || digest(binding.cli) !== digest(ctx.pin) || binding.execution_owner !== 'project-local-yss-product-lifecycle'
      || binding.business_execution_ready !== false)) throw new Error('plugin-binding-mismatch');
  return { result: binding ? 'binding-matched' : 'compatible-unbound', binding, profile_id: PROFILE,
    effective_orchestrator: path.join(target, '.agents/skills/yss-product-lifecycle/SKILL.md'), ready_for_agent: false };
}
function planProject(root, values, bindOnly = false) {
  const target = directory(values['target-dir']);
  if (target === root || target.startsWith(root + path.sep) || root.startsWith(target + path.sep) || !existsSync(path.dirname(target))) throw new Error('separate-target-with-existing-parent-required');
  const ctx = context(root, target), state = targetState(target);
  const plan = { schema_version: 1, kind: bindOnly ? 'bind-existing' : 'initialize', target, target_state: state,
    plugin_bundle_sha256: ctx.bundleDigest, cli: ctx.pin, profile_id: PROFILE, ready_for_agent: false, development_overlay: ctx.overlay.source };
  if (bindOnly) {
    if (checkProject(root, target, ctx).binding) throw new Error('project-already-bound');
    plan.project_guard = digest(files(target).filter(ref => !ref.startsWith('.git/')).map(ref => ({ ref, sha256: hash(readFileSync(safe(target, ref))) })));
    plan.write_files = [RECEIPT];
  } else {
    if (state.kind === 'nonempty') throw new Error('init-requires-empty-directory: use project-bind-plan for matching instances');
    plan.options = options(values);
    const preview = JSON.parse(execute(ctx.cli, [...cliArgs(plan.options, target), '--dry-run'], root));
    plan.write_files = [...new Set([...preview.changes.filter(item => ['add', 'update'].includes(item.action)).map(item => item.path), ...ctx.overlay.files.map(item => item.ref), RECEIPT, '.yss-harness-design.json', 'skills-lock.json'])].sort();
    plan.remove_files = ctx.overlay.remove;
  }
  plan.plan_id = digest(plan);
  return plan;
}
export function apply(root, plan, bindOnly, run = execute) {
  const current = planProject(root, { 'target-dir': plan.target, ...plan.options }, bindOnly);
  if (digest(plan) !== digest(current)) throw new Error('stale-or-edited-plan');
  const ctx = context(root, plan.target);
  const receipt = { schema_version: 1, plugin: identity.name, profile_id: PROFILE, cli: ctx.pin,
    plugin_bundle_sha256: ctx.bundleDigest, core_digest: digest(ctx.expected), plan_id: plan.plan_id,
    execution_owner: 'project-local-yss-product-lifecycle', business_execution_ready: false };
  if (bindOnly) {
    const file = path.join(plan.target, RECEIPT), bytes = json(receipt);
    writeFileSync(file, bytes, { flag: 'wx' });
    try { return { ...checkProject(root, plan.target, ctx), result: 'bound', target: plan.target }; }
    catch (error) { if (readFileSync(file, 'utf8') === bytes) rmSync(file); throw error; }
  }
  const stage = mkdtempSync(path.join(path.dirname(plan.target), '.yss-design-init-'));
  let installed = false, removedEmpty = false;
  try {
    run(ctx.cli, cliArgs(plan.options, stage), root);
    for (const ref of ctx.overlay.remove) if (existsSync(path.join(stage, ref))) rmSync(safe(stage, ref));
    for (const item of ctx.overlay.files) {
      const source = safe(root, `assets/template/${item.ref}`), bytes = readFileSync(source);
      if (hash(bytes) !== item.sha256) throw new Error('overlay-drift');
      const dest = path.join(stage, item.ref); mkdirSync(path.dirname(dest), { recursive: true }); writeFileSync(dest, bytes); chmodSync(dest, item.mode);
    }
    writeFileSync(path.join(stage, 'skills-lock.json'), readFileSync(safe(root, 'assets/template/skills-lock.json')));
    run(safe(stage, 'scripts/update-skill-lock'), [], stage);
    checkProject(root, stage, ctx);
    writeFileSync(path.join(stage, RECEIPT), json(receipt), { flag: 'wx' });
    checkProject(root, stage, ctx);
    if (digest(targetState(plan.target)) !== digest(plan.target_state)) throw new Error('target-changed-during-init');
    if (plan.target_state.kind === 'empty') { rmdirSync(plan.target); removedEmpty = true; }
    if (existsSync(plan.target)) throw new Error('target-appeared-during-init');
    renameSync(stage, plan.target); installed = true;
    return { result: 'initialized', target: plan.target, ready_for_agent: false, profile_id: PROFILE };
  } finally {
    if (!installed) { rmSync(stage, { recursive: true, force: true }); if (removedEmpty && !existsSync(plan.target)) mkdirSync(plan.target); }
  }
}
function entry(root, target, values, checked) {
  if (!checked.binding) throw new Error('project-binding-required');
  if (!['new', 'reuse', 'resume'].includes(values.mode)) throw new Error('entry-mode-required');
  const input = values.input ? JSON.parse(readFileSync(values.input)) : {};
  if (!input || Array.isArray(input) || Object.keys(input).some(key => !['artifact_refs', 'checkpoint'].includes(key))) throw new Error('invalid-entry-input');
  if (values.mode === 'resume' && !input.checkpoint) throw new Error('checkpoint-required');
  const refs = input.artifact_refs || [];
  if (!Array.isArray(refs) || (values.mode === 'reuse' && !refs.length && !input.checkpoint)) throw new Error('upstream-artifacts-required');
  const artifacts = refs.map(ref => ({ ref, sha256: hash(readFileSync(safe(target, ref))) }));
  if (input.checkpoint) {
    execute(safe(target, 'scripts/verify-lifecycle-checkpoint'), [safe(target, input.checkpoint)], target);
    const checkpoint = yaml(target, input.checkpoint);
    if (checkpoint.status === 'completed' || checkpoint.stage_trace?.completed_work_unit === 'work-unit.strategic-design-handoff')
      return { ...checked, result: 'design-delivered', checkpoint: input.checkpoint, next_work_unit: null, execution_started: false };
  }
  const workUnit = values.mode === 'new' ? 'work-unit.plan-requirements' : 'work-unit.entry-triage';
  const query = JSON.parse(execute(safe(target, 'scripts/query-lifecycle-context'), ['--mode', 'route', '--work-unit', workUnit], target));
  return { ...checked, result: 'project-local-handoff', mode: values.mode, artifacts, checkpoint: input.checkpoint || null,
    project_root: target, next_work_unit: workUnit, query, stage_verification_required: true, execution_started: false,
    next_action: '读取项目本地 yss-product-lifecycle、身份与 CONTEXT.md；核验最近可信阶段。仅推进战略设计 profile，正式交付后停止。' };
}
export function runProjectCommand(root, command, values) {
  if (command === 'project-plan' || command === 'project-bind-plan') return planProject(root, values, command === 'project-bind-plan');
  if (command === 'project-apply' || command === 'project-bind-apply') {
    if (!values.plan) throw new Error('plan-required');
    return apply(root, JSON.parse(readFileSync(values.plan)), command === 'project-bind-apply');
  }
  const target = directory(values['target-dir']);
  const ctx = context(root, target), checked = checkProject(root, target, ctx);
  if (command === 'project-check') return checked;
  if (command === 'project-entry') return entry(root, target, values, checked);
  throw new Error('command-outside-design-profile');
}
