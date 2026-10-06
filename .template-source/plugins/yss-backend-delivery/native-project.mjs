import { existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import path from 'node:path';
import { parseDocument } from './yaml.mjs';
import { hash, safe, fileMode } from './runtime.mjs';
import { digest, invoke, invokeAsync, json, physical, tool } from './native-tool.mjs';
import { projectEntry } from './entry.mjs';

const receiptPath = profile => profile === 'design' ? '.yss-product-design-plugin.json' : '.yss-backend-plugin.json';
const read = (root, ref) => JSON.parse(readFileSync(safe(root, ref)));
const within = (a, b) => a === b || a.startsWith(b + path.sep);
function identity(root) { return read(root, 'scripts/identity.json'); }
function context(root, target) {
  const ctx = tool(root); ctx.identity = identity(root); ctx.receipt = receiptPath(ctx.pin.profile); ctx.target = target;
  if (within(target, root) || within(root, target) || !existsSync(path.dirname(target))) throw new Error('separate-target-with-existing-parent-required');
  return ctx;
}
function executeNode(file, args, cwd) {
  const result = spawnSync(process.execPath, [file, ...args], { cwd, input: '', encoding: 'utf8', timeout: 120000,
    maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' } });
  if (result.error || result.status !== 0) throw new Error('governance-command-failed: ' + (result.error?.message || result.stderr || result.stdout));
  return result.stdout;
}
function legacyBinding(target, ctx) {
  if (!existsSync(path.join(target, '.yss-plugin.json'))) return null;
  const bytes = readFileSync(safe(target, '.yss-plugin.json')), old = JSON.parse(bytes);
  const policies = read(path.resolve(ctx.binary, '../../..'), 'assets/legacy-bindings.json');
  const policy = policies.find(item => item.plugin === old.plugin && item.bundle_digest === old.plugin_bundle_sha256);
  const current = existsSync(path.join(target, ctx.receipt)) ? read(target, ctx.receipt) : null;
  const alreadyMigrated = current?.schema_version === 2 && current.plugin === ctx.identity.name
    && current.legacy_binding?.path === '.yss-plugin.json' && current.legacy_binding.sha256 === hash(bytes);
  if (policy && !alreadyMigrated && !policy.native_direct_migration) throw new Error('historical-binding-requires-archived-public-bridge');
  if (policy && !alreadyMigrated) {
    for (const expected of policy.binding || []) {
      const file = safe(target, expected.ref);
      if (hash(readFileSync(file)) !== expected.sha256 || fileMode(lstatSync(file).mode) !== fileMode(expected.mode)) throw new Error('legacy-binding-core-drift: ' + expected.ref);
    }
  }
  if (!policy || old.schema_version !== 1 || digest(old.cli) !== digest(policy.cli)
      || old.core_digest !== digest(policy.binding) || ctx.pin.profile === 'spec' && old.execution_scope !== 'plan-to-backend'
      || old.business_execution_ready !== false
      || old.execution_owner !== 'project-local-yss-product-lifecycle' || !/^[a-f0-9]{64}$/.test(old.plugin_bundle_sha256)) throw new Error('unsupported-legacy-plugin-binding');
  return { path: '.yss-plugin.json', sha256: hash(bytes),
    ...(policy.native_legacy_baseline_policy ? { baseline_policy: policy.native_legacy_baseline_policy } : {}) };
}
function candidateBackend(value, target, root) {
  if (!value) return null;
  const candidate = physical(value);
  if (!existsSync(candidate) || within(candidate, target) || within(target, candidate) || within(candidate, root) || within(root, candidate)) throw new Error('backend-must-be-separate-existing-directory');
  return { root: candidate, repository_scope: 'external-repository', registration_status: 'pending-lifecycle-onboarding' };
}
function binding(ctx, legacy = null, backend = null) {
  return { schema_version: 2, plugin: ctx.identity.name, plugin_version: ctx.identity.version, profile: ctx.pin.profile,
    plugin_bundle_sha256: ctx.bundleDigest, binary_sha256: ctx.pin.binarySha256, inspection_digest: ctx.pin.inspectionDigest,
    template_commit: ctx.snapshot.templateCommit, bundle_hash: ctx.snapshot.bundleHash,
    execution_owner: 'project-local-yss-product-lifecycle', business_execution_ready: false,
    execution_scope: ctx.pin.profile === 'spec' ? 'plan-to-backend' : 'strategic-design',
    ...(legacy ? { legacy_binding: legacy } : {}), ...(backend ? { backend } : {}) };
}
function check(root, target, ctx, requireBinding = false) {
  const envelope = invoke(ctx.binary, ['doctor', '--root', target, '--profile', ctx.pin.profile]);
  const metadata = read(target, '.yss.json');
  if (![1, 2].includes(metadata.schemaVersion) || metadata.profile !== ctx.pin.profile || metadata.templateCommit !== ctx.snapshot.templateCommit
      || metadata.snapshotHash !== ctx.snapshot.sourceSnapshotHash || metadata.manifestHash !== ctx.snapshot.manifestHash
      || metadata.templateSourceState !== 'committed') throw new Error('native-project-version-mismatch: use project-migration-plan');
  const statusPlan = envelope.result.plan || envelope.result;
  if (statusPlan.conflicts?.length || statusPlan.changes?.length) throw new Error('native-project-managed-conflict-or-drift');
  safe(target, '.agents/skills/yss-product-lifecycle/SKILL.md');
  executeNode(safe(target, 'scripts/verify-context-contract'), ['--root', target], target);
  const receipt = existsSync(path.join(target, ctx.receipt)) ? read(target, ctx.receipt) : null;
  if (receipt && digest(receipt) !== digest(binding(ctx, legacyBinding(target, ctx), receipt.backend || null))) throw new Error('native-plugin-binding-mismatch: use project-migration-plan');
  if (receipt && ctx.pin.profile === 'spec') {
    const document = parseDocument(readFileSync(safe(target, '.yss-execution-scope.yaml'), 'utf8'), { uniqueKeys: true });
    if (document.errors.length || digest(document.toJS({ maxAliasCount: 0 })) !== digest({ schema_version: 1, scope_id: 'plan-to-backend' })) throw new Error('native-plugin-scope-mismatch');
  }
  if (requireBinding && !receipt) throw new Error('project-binding-required');
  return { result: receipt ? 'binding-matched' : 'compatible-unbound', target, binding: receipt,
    profile: ctx.pin.profile, native: envelope, effective_orchestrator: path.join(target, '.agents/skills/yss-product-lifecycle/SKILL.md'),
    ready_for_agent: false, stage_verification_required: true };
}
function plan(root, values, kind) {
  const target = physical(values['target-dir']), ctx = context(root, target);
  const native = existsSync(path.join(target, '.yss.json'));
  if (ctx.pin.profile === 'design' && values['backend-root']) throw new Error('backend-root-outside-design-profile');
  // Native init validates empty targets and its own completed recovery archive;
  // the wrapper must not invent a second historical-init acceptance policy.
  if (kind === 'bind-existing') {
    const checked = check(root, target, ctx); if (checked.binding) throw new Error('project-already-bound');
  }
  if (kind === 'upgrade' && existsSync(path.join(target, '.yss-backend-delivery.json'))) throw new Error('completed-project-migration-forbidden: retain fixed read-only verifier');
  const legacy = kind === 'initialize' ? null : legacyBinding(target, ctx);
  const previous = existsSync(path.join(target, ctx.receipt)) ? read(target, ctx.receipt) : null;
  if (previous?.legacy_binding && !legacy) throw new Error('legacy-binding-missing');
  const oldBackend = legacy && ctx.pin.profile === 'spec' ? read(target, legacy.path).backend : null;
  const backend = values['backend-root'] ? candidateBackend(values['backend-root'], target, root)
    : previous?.backend || (oldBackend?.root ? candidateBackend(oldBackend.root, target, root) : null);
  const content = binding(ctx, legacy, backend);
  const command = kind === 'initialize' ? 'init' : native ? 'sync' : 'migrate';
  const request = { schemaVersion: 1, path: ctx.receipt, data: Buffer.from(json(content)).toString('base64'),
    ...(existsSync(path.join(target, ctx.receipt)) ? { previousDigest: hash(readFileSync(safe(target, ctx.receipt))) } : {}),
    ...(legacy ? { guards: { [legacy.path]: legacy.sha256 } } : {}),
    ...(command === 'migrate' && legacy?.baseline_policy ? { legacyBaselinePolicy: legacy.baseline_policy } : {}) };
  if (request.previousDigest) {
    const old = read(target, ctx.receipt);
    if (old.schema_version !== 2 || old.plugin !== ctx.identity.name || old.profile !== ctx.pin.profile || old.business_execution_ready !== false) throw new Error('foreign-native-binding');
  }
  const parent = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-plugin-plan-')));
  try {
    const bindingFile = path.join(parent, 'binding.json'), nativeFile = path.join(parent, 'native-plan.json');
    writeFileSync(bindingFile, json(request));
    const args = [command, '--root', target, '--profile', ctx.pin.profile, '--plan', '--out', nativeFile, '--binding-file', bindingFile];
    if (command === 'init') {
      if (!values['project-name']?.trim() || !values['business-domain']?.trim()) throw new Error('project-name-and-business-domain-required');
      const tracker = values['issue-tracker'] || (ctx.pin.profile === 'design' ? 'local-markdown' : null);
      if (!['github', 'gitlab', ...(ctx.pin.profile === 'design' ? ['local-markdown'] : [])].includes(tracker)) throw new Error('explicit-issue-tracker-required');
      args.push('--full', '--project-name', values['project-name'], '--business-domain', values['business-domain'], '--team-size', values['team-size'] || '1', '--issue-tracker', tracker);
    }
    const preview = invoke(ctx.binary, args), saved = readFileSync(nativeFile);
    const result = { schema_version: 2, kind, target, profile: ctx.pin.profile, command,
      native_lock_digest: digest(ctx.pin), plugin_bundle_sha256: ctx.bundleDigest,
      binding: content, native_plan: { encoding: 'gzip-base64', sha256: hash(saved), bytes: saved.length,
        data: gzipSync(saved).toString('base64') }, preview, ready_for_agent: false };
    result.plan_id = digest(result); return result;
  } finally { rmSync(parent, { recursive: true, force: true }); }
}
async function apply(root, plan) {
  const { plan_id, ...body } = plan;
  if (plan.schema_version !== 2 || plan_id !== digest(body)) throw new Error('stale-or-edited-plugin-plan');
  const target = physical(plan.target), ctx = context(root, target);
  if (plan.native_plan?.encoding !== 'gzip-base64' || !Number.isInteger(plan.native_plan.bytes)
      || plan.native_plan.bytes < 1 || plan.native_plan.bytes > 128 * 1024 * 1024) throw new Error('native-plan-container-invalid');
  const nativeBytes = gunzipSync(Buffer.from(plan.native_plan.data, 'base64'), { maxOutputLength: 128 * 1024 * 1024 });
  if (nativeBytes.length !== plan.native_plan.bytes || hash(nativeBytes) !== plan.native_plan.sha256) throw new Error('native-plan-container-drift');
  const nativePlan = JSON.parse(nativeBytes);
  if (plan.native_lock_digest !== digest(ctx.pin) || plan.plugin_bundle_sha256 !== ctx.bundleDigest
      || plan.profile !== ctx.pin.profile || nativePlan.root !== target || nativePlan.command !== plan.command
      || digest(plan.binding) !== digest(binding(ctx, legacyBinding(target, ctx), plan.binding.backend || null))) throw new Error('plugin-plan-source-or-binding-mismatch');
  const parent = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-plugin-apply-')));
  try {
    const saved = path.join(parent, 'native-plan.json'); writeFileSync(saved, nativeBytes);
    const result = await invokeAsync(ctx.binary, [plan.command, '--root', target, '--profile', ctx.pin.profile, '--apply', '--plan-file', saved]);
    return { result: 'applied', target, native: result, check: check(root, target, ctx, true), ready_for_agent: false };
  } finally { rmSync(parent, { recursive: true, force: true }); }
}
function designEntry(target, values, checked) {
  if (!['new', 'reuse', 'resume'].includes(values.mode)) throw new Error('entry-mode-required');
  const input = values.input ? JSON.parse(readFileSync(values.input)) : {};
  if (!input || Array.isArray(input) || Object.keys(input).some(key => !['artifact_refs', 'checkpoint'].includes(key))) throw new Error('invalid-entry-input');
  if (values.mode === 'resume' && !input.checkpoint) throw new Error('checkpoint-required');
  const refs = input.artifact_refs || [];
  if (!Array.isArray(refs) || (values.mode === 'reuse' && !refs.length && !input.checkpoint)) throw new Error('upstream-artifacts-required');
  const artifacts = refs.map(ref => ({ ref, sha256: hash(readFileSync(safe(target, ref))) }));
  if (input.checkpoint) {
    executeNode(safe(target, 'scripts/verify-lifecycle-checkpoint'), [safe(target, input.checkpoint)], target);
    const doc = parseDocument(readFileSync(safe(target, input.checkpoint), 'utf8'), { uniqueKeys: true });
    if (doc.errors.length) throw new Error('checkpoint-yaml-invalid');
    const checkpoint = doc.toJS({ maxAliasCount: 0 });
    if (checkpoint.status === 'completed' || checkpoint.stage_trace?.completed_work_unit === 'work-unit.strategic-design-handoff') return { ...checked, result: 'design-delivered', next_work_unit: null, execution_started: false };
  }
  const workUnit = values.mode === 'new' ? 'work-unit.plan-requirements' : 'work-unit.entry-triage';
  const query = JSON.parse(executeNode(safe(target, 'scripts/query-lifecycle-context'), ['--mode', 'route', '--work-unit', workUnit], target));
  return { ...checked, result: 'project-local-handoff', artifacts, checkpoint: input.checkpoint || null, next_work_unit: workUnit, query, execution_started: false };
}
export async function runProjectCommand(root, command, values) {
  if (['project-plan', 'project-bind-plan', 'project-migration-plan', 'project-upgrade-plan'].includes(command)) return plan(root, values, command === 'project-plan' ? 'initialize' : command === 'project-bind-plan' ? 'bind-existing' : 'upgrade');
  if (['project-apply', 'project-bind-apply', 'project-migration-apply', 'project-upgrade-apply'].includes(command)) {
    if (!values.plan) throw new Error('plan-file-required');
    const saved = JSON.parse(readFileSync(physical(values.plan, true)));
    const expectedKind = command === 'project-apply' ? 'initialize' : command === 'project-bind-apply' ? 'bind-existing' : 'upgrade';
    if (saved.kind !== expectedKind) throw new Error('plugin-plan-command-mismatch');
    return apply(root, saved);
  }
  const target = physical(values['target-dir']), ctx = context(root, target);
  if (['project-status', 'project-recover', 'project-rollback'].includes(command)) {
    const nativeCommand = command === 'project-rollback' ? 'rollback' : command === 'project-recover' && values.apply ? 'recover' : 'rollback';
    const args = [nativeCommand, '--root', target, '--profile', ctx.pin.profile, ...(values.apply && command !== 'project-status' ? ['--apply'] : [])];
    const result = values.apply && command !== 'project-status' ? await invokeAsync(ctx.binary, args) : invoke(ctx.binary, args);
    return { result: values.apply ? 'transaction-applied' : 'transaction-preview', native: result, ready_for_agent: false };
  }
  const checked = check(root, target, ctx, command !== 'project-check');
  if (command === 'project-check') return checked;
  if (command === 'project-entry') {
    const entryValues = { ...values, ...(values.input ? { input: physical(values.input, true) } : {}) };
    return ctx.pin.profile === 'design' ? designEntry(target, entryValues, checked) : projectEntry(target, entryValues, checked, executeNode);
  }
  if (ctx.pin.profile === 'design') throw new Error('command-outside-design-profile');
  if (command === 'project-import-design') {
    if (!values.bundle || existsSync(path.join(target, '.yss-backend-delivery.json'))) throw new Error('design-bundle-required-or-backend-already-delivered');
    return JSON.parse(executeNode(safe(target, 'scripts/strategic-consumer-entry'), ['--root', target, '--bundle', physical(values.bundle, 'either')], target));
  }
  if (command === 'project-resume') {
    if (!values.checkpoint) throw new Error('checkpoint-required'); checked.verification = executeNode(safe(target, 'scripts/verify-lifecycle-checkpoint'), [safe(target, values.checkpoint)], target);
  } else if (command === 'project-dispatch') {
    if (!values.input) throw new Error('dispatch-input-required'); checked.task = JSON.parse(executeNode(safe(target, 'scripts/dispatch-slice-task'), ['--root', target, '--input', safe(target, values.input)], target));
  } else if (command === 'query-project') checked.query = JSON.parse(executeNode(safe(target, 'scripts/query-lifecycle-context'), ['--mode', 'route', '--work-unit', values['work-unit'] || 'work-unit.plan-requirements'], target));
  else throw new Error('unknown-project-command');
  return checked;
}
