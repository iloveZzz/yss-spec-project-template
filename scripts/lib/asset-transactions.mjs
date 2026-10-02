import {findApprovalCheckpoint} from './approval-checkpoint-discovery.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { safeFile } from './governance-io.mjs';
import { parseAsset, readAsset, serializeAsset, byteDigest, semanticDigest, validateAssetStructure, TOOL_ROOT } from './structured-assets.mjs';

const TX = '.yss/asset-transactions';
const ensure = (ok, message) => { if (!ok) throw new Error(message); };
const exists = file => fs.existsSync(file);
const descriptor = file => exists(file) ? { digest: byteDigest(fs.readFileSync(file)), mode: fs.statSync(file).mode & 0o777 } : null;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Adapter for an existing validated writer which also owns Markdown/tracker updates. */
export function runAssetTransaction(root, changes, action) {
  root=fs.realpathSync(root);assertAssetTransactionIdle(root);
  const directory=safeFile(root,TX);fs.mkdirSync(directory,{recursive:true});
  const lock=safeFile(root,`${TX}/lock`),fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));fs.fsyncSync(fd);
  const plan_id=byteDigest(serializeAsset({changes,nonce:randomUUID()})).slice(7),journal_ref=`${TX}/${plan_id}.json`,active=safeFile(root,`${TX}/active.json`);
  const tx={schema_version:1,root,plan_id,status:'applying',changes,backups:{}};
  try {
    ensure(!exists(safeFile(root, `${TX}/recovery.lock`)), 'ASSET_RECOVERY_LOCKED');
    for(const change of changes){ensure(same(descriptor(safeFile(root,change.ref)),change.before),`ASSET_INPUT_DRIFT: ${change.ref}`);tx.backups[change.ref]=change.before?fs.readFileSync(safeFile(root,change.ref)).toString('base64'):null;}
    atomic(safeFile(root,journal_ref),serializeAsset(tx));atomic(active,serializeAsset({journal_ref}));
    const result=action();
    for(const change of changes)ensure(descriptor(safeFile(root,change.ref))?.digest===change.after_digest,`ASSET_POSTWRITE_DRIFT: ${change.ref}`);
    tx.status='applied';atomic(safeFile(root,journal_ref),serializeAsset(tx));fs.unlinkSync(active);return result;
  } catch(error) {
    if(exists(active)){const recovered=recoverAssetWrite(root,{lockHeld:true});throw new Error(`${error.message}; ${recovered.status}`);}
    throw error;
  } finally {fs.closeSync(fd);if(exists(lock))fs.unlinkSync(lock);}
}

export function assertAssetTransactionIdle(root) {
  ensure(!exists(safeFile(root, `${TX}/active.json`)), 'ASSET_TRANSACTION_PENDING: recover the unfinished transaction before lifecycle transition');
}

export function assertCurrentAssetReference(root, ref) {
  const directory = safeFile(root, TX);
  if (!exists(directory)) return;
  for (const name of fs.readdirSync(directory)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const receipt = parseAsset(fs.readFileSync(path.join(directory, name)), name);
    if (receipt.status === 'applied' && receipt.migration?.source_to_target?.[ref]) throw new Error(`ASSET_HISTORICAL_ONLY: ${ref}; current=${receipt.migration.source_to_target[ref]}`);
  }
}

// The observed closure includes governance, tools and project evidence, but not external checkouts/caches.
export function observeAssetInputs(root) {
  const rows = {};
  function walk(ref) {
    const file = safeFile(root, ref);
    if (!exists(file)) return;
    const st = fs.lstatSync(file);
    ensure(!st.isSymbolicLink(), `ASSET_SYMLINK: ${ref}`);
    if (st.isDirectory()) for (const name of fs.readdirSync(file).sort()) {
      if (['node_modules', '.git', '.codegraph', '__pycache__'].includes(name)) continue;
      walk(`${ref}/${name}`);
    }
    else if (st.isFile()) rows[ref] = descriptor(file);
  }
  for (const ref of ['yss-project.yaml', 'CONTEXT.md', 'DESIGN.md', 'AGENTS.md', 'skills-lock.json', '.template-spec', '.agents', 'scripts', 'docs']) walk(ref);
  return rows;
}

export function validateAssetSemantics(root, ref, kind) {
  const file = safeFile(root, ref), { value } = readAsset(file, kind, { schemaRoot: root });
  let tool, args;
  if (kind === 'domain-strategy' || kind === 'stage-decision-package') {
    tool = `.agents/skills/yss-stage-decision/scripts/validate-${kind}.mjs`;
    args = [file, '--root', root];
  } else {
    tool = { checkpoint: 'scripts/verify-lifecycle-checkpoint', 'task-package': 'scripts/verify-digital-human-task-package', 'approval-record': 'scripts/verify-approval-record' }[kind];
    if(kind==='approval-record') {
      const current=value.decision==='approved'||value.kind==='review-bundle';
      args=current&&value.schema_version!==2?['--require-approved','--checkpoint',findApprovalCheckpoint(root,ref),file]:[current?'--require-approved':'--history',file];
    } else args=[file];
  }
  ensure(exists(safeFile(root, tool)), `ASSET_CONSUMER_MISSING: ${tool}`);
  const result = spawnSync(process.execPath, [path.join(root, tool), ...args], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  ensure(!result.error && result.status === 0, `ASSET_SEMANTIC: ${ref}: ${result.error?.message || result.stderr || result.stdout}`);
  return { ref, kind, command: [tool, ...args.map(x => x.replaceAll(root, '.'))], exit_code: result.status, output: result.stdout.trim() };
}

function approvalBindings(root, changes) {
  for (const change of changes) {
    const value = parseAsset(change.after, change.ref);
    // Writers never turn a bare status into an approval. Bound, independently issued evidence is mandatory.
    const records = change.kind === 'approval-record' ? value.kind === 'review-bundle' ? value.reviews : [value] : [];
    for (const row of records) if (row.decision === 'approved') {
      ensure(row.subject_ref && row.subject_digest && row.drafter_principal_ref && row.drafter_principal_ref !== row.principal_ref, 'ASSET_APPROVAL_REBIND_REQUIRED: subject and independent reviewer required');
      ensure(byteDigest(fs.readFileSync(safeFile(root, row.subject_ref))).replace('sha256:', '') === row.subject_digest.replace('sha256:', ''), 'ASSET_APPROVAL_STALE');
    }
    if (['domain-strategy', 'stage-decision-package'].includes(change.kind) && value.status === 'approved') {
      const approval = parseAsset(fs.readFileSync(safeFile(root, value.approval.approval_ref)), value.approval.approval_ref);
      const check = change.kind === 'domain-strategy' ? 'check.domain-strategy-approved' : 'check.stage-decision-package-approved';
      const row = approval.kind === 'review-bundle' ? approval.reviews.find(x => x.gate_id === check) : approval;
      ensure(row?.subject_ref === change.ref && row.subject_digest?.replace('sha256:', '') === byteDigest(change.after).replace('sha256:', ''), `ASSET_APPROVAL_REBIND_REQUIRED: ${change.ref}`);
    }
  }
}

function overlayVerification(root, observed, changes, { verify = validateAssetSemantics } = {}) {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-asset-check-'));
  try {
    for (const ref of Object.keys(observed)) {
      const target = safeFile(staging, ref); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(safeFile(root, ref), target); fs.chmodSync(target, observed[ref].mode);
    }
    for (const change of changes) {
      const target = safeFile(staging, change.ref); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, change.after);
    }
    approvalBindings(staging, changes);
    return changes.map(change => verify(staging, change.ref, change.kind));
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
}

export function planAssetWrite(root, specs, { schemaRoot = TOOL_ROOT, verify, migration } = {}) {
  root = fs.realpathSync(root); assertAssetTransactionIdle(root);
  ensure(Array.isArray(specs) && specs.length, 'ASSET_EMPTY_PLAN');
  const observed = observeAssetInputs(root), seen = new Set();
  const changes = specs.map(({ ref, kind, value }) => {
    ensure(!seen.has(ref), `ASSET_DUPLICATE_TARGET: ${ref}`); seen.add(ref);
    ensure(ref.endsWith('.json') && /^(docs\/|\.yss\/)/.test(ref) && !ref.startsWith(`${TX}/`), 'ASSET_WRITE_SCOPE: project JSON assets only');
    const file = safeFile(root, ref), before = descriptor(file);
    const legacy = ref.replace(/\.json$/, '.yaml');
    if (!before && exists(safeFile(root, legacy))) ensure(migration?.source_to_target?.[legacy] === ref, 'ASSET_AMBIGUOUS_AUTHORITY: use plan-migrate');
    if (kind === 'approval-record' && before) throw new Error('ASSET_IMMUTABLE_APPROVAL: issue a new record');
    validateAssetStructure(value, kind, { schemaRoot });
    const after = serializeAsset(value); parseAsset(after, ref);
    return { ref, kind, before, after, after_digest: byteDigest(after), semantic_digest: semanticDigest(value) };
  }).filter(change => change.before?.digest !== change.after_digest);
  for (const change of changes) if (!Object.hasOwn(observed, change.ref)) observed[change.ref] = change.before;
  const verification = changes.length ? overlayVerification(root, Object.fromEntries(Object.entries(observed).filter(([,v]) => v)), changes, { verify }) : [];
  const payload = { schema_version: 1, kind: 'asset-write-plan', root, observed, changes, verification, ...(migration ? {migration} : {}), execution_authorization: 'not-granted' };
  return { ...payload, plan_id: byteDigest(serializeAsset(payload)).slice(7) };
}

function atomic(file, bytes, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temp, 'wx', mode);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { ensure(fs.readFileSync(temp).equals(Buffer.from(bytes)), 'ASSET_TEMP_READBACK'); fs.renameSync(temp, file); const dir = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); } }
  finally { if (exists(temp)) fs.unlinkSync(temp); }
}

export function applyAssetWrite(root, plan, { verify, afterWrite } = {}) {
  root = fs.realpathSync(root); assertAssetTransactionIdle(root);
  const { plan_id, ...payload } = plan;
  ensure(plan.root === root && plan.kind === 'asset-write-plan' && plan_id === byteDigest(serializeAsset(payload)).slice(7), 'ASSET_PLAN_INVALID');
  const directory = safeFile(root, TX); fs.mkdirSync(directory, { recursive: true });
  const lock = safeFile(root, `${TX}/lock`), fd = fs.openSync(lock, 'wx');
  fs.writeFileSync(fd, String(process.pid));fs.fsyncSync(fd);
  const active = safeFile(root, `${TX}/active.json`);
  let transaction;
  try {
    ensure(!exists(safeFile(root, `${TX}/recovery.lock`)), 'ASSET_RECOVERY_LOCKED');
    const current = observeAssetInputs(root);
    for (const [ref, before] of Object.entries(plan.observed)) ensure(same(descriptor(safeFile(root, ref)), before), `ASSET_INPUT_DRIFT: ${ref}`);
    ensure(Object.keys(current).every(ref => Object.hasOwn(plan.observed, ref)), 'ASSET_INPUT_DRIFT: new dependency files');
    if (!plan.changes.length) return { status: 'unchanged', plan_id, changed_refs: [], execution_authorization: 'not-granted' };
    // Recompute, including schemas and semantics. A plan's recorded successful exit is never trusted.
    if(plan.migration) for(const [ref,digest] of Object.entries(plan.migration.sources)) ensure(byteDigest(fs.readFileSync(safeFile(root,ref)))===digest,`ASSET_MIGRATION_DRIFT: ${ref}`);
    const fresh = planAssetWrite(root, plan.changes.map(c => ({ ref: c.ref, kind: c.kind, value: parseAsset(c.after, c.ref) })), { schemaRoot: root, verify, migration:plan.migration });
    ensure(same(fresh.changes, plan.changes), 'ASSET_PLAN_CHANGED');
    const journalRef = `${TX}/${plan_id}.json`, journalFile = safeFile(root, journalRef);
    ensure(!exists(journalFile), 'ASSET_ALREADY_APPLIED: inspect the existing receipt');
    transaction = { schema_version: 1, plan_id, root, status: 'applying', ...(plan.migration?{migration:plan.migration}:{}), changes: plan.changes, backups: Object.fromEntries(plan.changes.map(c => [c.ref, c.before ? fs.readFileSync(safeFile(root, c.ref)).toString('base64') : null])) };
    atomic(journalFile, serializeAsset(transaction)); atomic(active, serializeAsset({ journal_ref: journalRef }));
    for (const change of plan.changes) {
      ensure(same(descriptor(safeFile(root, change.ref)), change.before), `ASSET_INPUT_DRIFT: ${change.ref}`);
      atomic(safeFile(root, change.ref), change.after, change.before?.mode ?? 0o644);
      readAsset(safeFile(root, change.ref), change.kind, { schemaRoot: root });
      afterWrite?.(change);
    }
    for (const [ref, before] of Object.entries(plan.observed)) {
      const change = plan.changes.find(c => c.ref === ref);
      ensure(descriptor(safeFile(root, ref))?.digest === (change?.after_digest ?? before?.digest), `ASSET_POSTWRITE_DRIFT: ${ref}`);
    }
    ensure(Object.keys(observeAssetInputs(root)).every(ref => Object.hasOwn(plan.observed, ref)), 'ASSET_POSTWRITE_DRIFT: new dependency files');
    transaction.status = 'applied'; atomic(journalFile, serializeAsset(transaction)); fs.unlinkSync(active);
    return { status: 'applied', plan_id, changed_refs: plan.changes.map(c => c.ref), receipt_ref: journalRef, execution_authorization: 'not-granted' };
  } catch (error) {
    if (transaction && exists(active)) {
      const result = recoverAssetWrite(root, { lockHeld: true });
      throw new Error(`${error.message}; ${result.status}: ${result.conflicts.join(',')}`);
    }
    throw error;
  } finally { fs.closeSync(fd); if (exists(lock)) fs.unlinkSync(lock); }
}

export function recoverAssetWrite(root, { lockHeld = false, recoveryHeld = false } = {}) {
  root = fs.realpathSync(root);
  const lock = safeFile(root, `${TX}/lock`);
  if (!lockHeld && !recoveryHeld) {
    const guard = safeFile(root, `${TX}/recovery.lock`);
    fs.mkdirSync(path.dirname(guard), { recursive: true });
    const fd = fs.openSync(guard, 'wx');
    try {
      fs.writeFileSync(fd, String(process.pid)); fs.fsyncSync(fd);
      return recoverAssetWrite(root, { recoveryHeld: true });
    } finally { fs.closeSync(fd); fs.unlinkSync(guard); }
  }
  if (!lockHeld && exists(lock)) {
    const pid=Number(fs.readFileSync(lock,'utf8'));ensure(Number.isInteger(pid)&&pid>0,'ASSET_LOCK_INVALID');
    let live=true;try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')live=false;else throw error;}
    ensure(!live,'ASSET_LOCKED: writer is still alive');fs.unlinkSync(lock);
  }
  if (!lockHeld) {
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    const fd = fs.openSync(lock, 'wx');
    try {
      fs.writeFileSync(fd, String(process.pid)); fs.fsyncSync(fd);
      return recoverAssetWrite(root, { lockHeld: true });
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  const active = safeFile(root, `${TX}/active.json`);
  if (!exists(active)) return { status: 'idle', conflicts: [] };
  const marker = parseAsset(fs.readFileSync(active), active), journalFile = safeFile(root, marker.journal_ref);
  ensure(marker.journal_ref.startsWith(`${TX}/`), 'ASSET_JOURNAL_PATH');
  const tx = parseAsset(fs.readFileSync(journalFile), journalFile);
  ensure(tx.root === root && ['applying', 'recovery-conflict','applied'].includes(tx.status), 'ASSET_JOURNAL_INVALID');
  if(tx.status==='applied') {for(const c of tx.changes)ensure(descriptor(safeFile(root,c.ref))?.digest===c.after_digest,'ASSET_RECOVERY_CONFLICT');fs.unlinkSync(active);return{status:'applied',conflicts:[]};}
  const conflicts = [];
  for (const change of [...tx.changes].reverse()) {
    ensure(byteDigest(change.after)===change.after_digest && (change.before===null?tx.backups[change.ref]===null:byteDigest(Buffer.from(tx.backups[change.ref],'base64'))===change.before.digest),'ASSET_JOURNAL_CORRUPT');
    const file = safeFile(root, change.ref), actual = descriptor(file);
    if (same(actual, change.before)) continue;
    if (actual?.digest !== change.after_digest) { conflicts.push(change.ref); continue; }
    if (tx.backups[change.ref] === null) fs.unlinkSync(file);
    else atomic(file, Buffer.from(tx.backups[change.ref], 'base64'), change.before.mode);
  }
  tx.status = conflicts.length ? 'recovery-conflict' : 'rolled-back'; tx.conflicts = conflicts;
  atomic(journalFile, serializeAsset(tx)); if (!conflicts.length) fs.unlinkSync(active);
  return { status: tx.status, conflicts };
}
