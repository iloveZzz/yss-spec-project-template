import * as fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ensure, stat, safe, descriptor, same, hash, json } from "./io.mjs";
import {
  identity,
  guardNestedRepository,
  METADATA,
  gitlinks,
  recoveryIdentity,
} from "./identity.mjs";
import { preserved, userOwned } from "./family.mjs";
import { mergeGitignore } from "./gitignore.mjs";
import { prepareGenerated, verifyInstance } from "./verification.mjs";
import { PROFILE, render } from "./bundle.mjs";
import { inspectState, applyTransaction, recover } from "./transaction.mjs";
export function execute(bundle, target, opts) {
  const { family: f, pkg, snapshot, core } = bundle;
  const state = inspectState(target, f);
  if (state.pending.length) {
    for (const ref of METADATA.filter((x) => x !== f.metadataFile))
      ensure(
        !stat(safe(target, ref)),
        "异族 metadata 禁止事务恢复",
        "IDENTITY",
      );
    ensure(
      opts.apply && !opts.dryRun && !opts.plan && opts.command !== "diff",
      "发现中断事务；使用 --apply 恢复后重试",
      "INTERRUPTED",
    );
    recoveryIdentity(target, bundle, state);
    return recover(target, f, state, () =>
      recoveryIdentity(target, bundle, state),
    );
  }
  if (opts.command === "init")
    ensure(
      !stat(target) || fs.readdirSync(target).length === 0,
      "init 只允许不存在或空目录；已有项目请使用 attach",
    );
  else ensure(stat(target)?.isDirectory(), "attach/sync 目标目录不存在");
  const meta = identity(target, bundle, opts.command);
  const canForce = f.side !== "design" && opts.force && opts.apply;
  const variables = meta?.variables || {
    projectName: opts.projectName || path.basename(target),
    businessDomain: opts.businessDomain,
    teamSize: opts.teamSize,
    issueTracker: opts.issueTracker,
    includeExampleDocs: opts.includeExampleDocs,
  };
  const protectedLinks = gitlinks(target);
  const files = render(bundle, variables),
    managedFiles = {},
    operations = [],
    changes = [],
    conflicts = [],
    observed = new Map();
  for (const ref of [
    ...new Set([...files.keys(), ...Object.keys(meta?.managedFiles || {}), ...Object.keys(bundle.retiredFiles || {})]),
  ].sort()) {
    ensure(
      !protectedLinks.some((x) => ref === x || ref.startsWith(x + "/")),
      `受保护 gitlink: ${ref}`,
      "PROTECTED",
    );
    guardNestedRepository(target, ref);
    const before = descriptor(target, ref);
    let next = files.get(ref);
    if (ref === '.gitignore' && next) {
      const bytes = mergeGitignore(before ? fs.readFileSync(safe(target, ref)) : null, next.bytes, f);
      next = {bytes, baseline:{type:'file',digest:hash(bytes),mode:before?.mode || 0o644}};
    }
    const after = next?.baseline || null, record = meta?.managedFiles[ref], retiredBaseline = bundle.retiredFiles?.[ref], transitionBaseline = meta ? bundle.transitionBaselines?.[ref] : null, baseline = record?.baseline || (transitionBaseline ? {type:'file',digest:transitionBaseline.digest,mode:transitionBaseline.mode} : null) || (retiredBaseline ? {type:'file',digest:retiredBaseline.digest,mode:retiredBaseline.mode} : null);
    let action, reason;
    observed.set(ref, before);
    if (userOwned(ref, f)) {
      action = before ? 'preserve' : (next && opts.command !== 'sync' && opts.command !== 'diff' ? 'add' : 'preserve');
      reason = 'user-owned';
    } else if (preserved(ref) && before) { action='preserve';reason='project-owned-content'; }
    else if (!next) {
      const retiredRecord = record || (retiredBaseline ? {baseline,lastApplied:null,ownership:'managed',retired:true} : null);
      const eligible = retiredRecord && !retiredRecord.legacyUnproven && ref !== '.gitignore' && same(before, baseline) && before;
      action = eligible && opts.prune ? 'delete' : 'preserve';
      reason = eligible ? (opts.prune ? 'prune' : 'prunable') : 'retained-removed';
      if (before && action !== 'delete' && retiredRecord) managedFiles[ref] = {...retiredRecord,retired:true};
    } else if (same(before, after)) action='unchanged';
    else if (ref === '.gitignore' || ref === 'skills-lock.json') action=before?'update':'add';
    else if (!before || same(before, baseline) || (record?.legacyUnproven && before?.digest === baseline?.digest)) action=before?'update':'add';
    else if (!record?.legacyUnproven && same(after, baseline)) action='preserve';
    else action='conflict';
    if (action === 'conflict') conflicts.push(ref);
    if (next && !userOwned(ref,f)) managedFiles[ref] = {
      baseline:after,lastApplied:action==='preserve'?before:after,ownership:ref==='skills-lock.json'?'generated':'managed',
      ...(record?.legacyUnproven && action==='preserve' ? {legacyUnproven:true} : {}),
    };
    if (['update','add','delete'].includes(action) || (action==='conflict' && canForce)) operations.push({path:ref,before,after,bytes:next?.bytes});
    changes.push({path:ref,action,...(reason?{reason}:{})});
  }
  const result = {
    schemaVersion: 1,
    command: opts.command,
    status: "preview",
    target,
    cliVersion: pkg.version,
    templateCommit: snapshot.templateCommit,
    templateSourceState: snapshot.sourceState || "committed",
    coreSourceState: core.sourceState || "committed",
    coreVersion: core.coreVersion,
    changes,
    conflicts,
    backupPath: null,
  };
  if (conflicts.length && !canForce)
    throw Object.assign(
      new Error(
        `治理文件冲突，整次暂停；确认备份覆盖后使用 --apply --force: ${conflicts.join(", ")}`,
      ),
      { code: "CONFLICT", result },
    );
  result.summary = Object.fromEntries(['add','update','delete','preserve','conflict','unchanged'].map(action=>[action,changes.filter(c=>c.action===action).length]));
  result.prunable = changes.filter(c=>['prunable','prune'].includes(c.reason)).map(c=>c.path);
  result.retainedRemoved = changes.filter(c=>c.reason==='retained-removed').map(c=>c.path);
  result.pruned = [];
  result.migrationRequired = Boolean(meta?.legacy);
  result.legacyRetainedFiles = meta?.legacyRetainedFiles || [];
  if (opts.dryRun || opts.plan || opts.command === 'diff' || (opts.command !== "init" && !opts.apply)) return result;
  const watched = [...METADATA, "yss-project.yaml", PROFILE, ".gitmodules"];
  const beforeIdentity = new Map(
    watched.map((ref) => [ref, descriptor(target, ref)]),
  );
  const transactionId = randomUUID();
  const metadata = {
    lastTransactionId: transactionId,
    metadataSchemaVersion: 2,
    profileId: f.profileId,
    templateName: f.templateName,
    templateSource: f.templateSource,
    cliVersion: pkg.version,
    templateCommit: snapshot.templateCommit,
    templateSourceState: snapshot.sourceState || "committed",
    coreSourceState: core.sourceState || "committed",
    snapshotHash: snapshot.snapshotHash,
    coreVersion: core.coreVersion,
    coreDigest: core.digest,
    manifestHash: snapshot.manifestHash,
    variables,
    managedFiles,
    ...(meta?.legacyRetainedFiles?.length ? {legacyRetainedFiles:meta.legacyRetainedFiles} : {}),
    baselineDigest: hash(JSON.stringify(managedFiles)),
    initializedAt: meta?.initializedAt || new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
  prepareGenerated(bundle, target, operations, metadata, observed);
  if (!operations.length && meta && !meta.legacy && meta.snapshotHash === snapshot.snapshotHash && meta.coreDigest === core.digest && meta.cliVersion === pkg.version) return {...result,status:'applied',message:'受管资产已是当前版本，无需写入'};
  metadata.baselineDigest = hash(JSON.stringify(metadata.managedFiles));
  const bytes = Buffer.from(json(metadata));
  operations.push({
    path: f.metadataFile,
    before: descriptor(target, f.metadataFile),
    after: { type: "file", digest: hash(bytes), mode: 0o644 },
    bytes,
  });
  // Metadata is last. Identity files already applied by this transaction have their new expected digest.
  const opMap = new Map(operations.map((x) => [x.path, x]));
  const validate = (operation) => {
    if (!operation) {
      ensure(
        JSON.stringify(gitlinks(target)) === JSON.stringify(protectedLinks),
        "gitlink 在计划后变化",
        "CONCURRENT",
      );
      for (const [ref, before] of observed) {
        const op = opMap.get(ref);
        if (!op)
          ensure(
            same(descriptor(target, ref), before),
            `未写入的受管文件并发变化: ${ref}`,
            "CONCURRENT",
          );
      }
    }
    for (const [ref, before] of beforeIdentity) {
      const op = opMap.get(ref),
        current = descriptor(target, ref);
      ensure(
        same(current, before) || (op && same(current, op.after)),
        `身份文件并发变化: ${ref}`,
        "CONCURRENT",
      );
    }
    if (operation) guardNestedRepository(target, operation.path);
  };
  return {
    ...result,
    status: "applied",
    ...applyTransaction(
      target,
      f,
      operations,
      validate,
      transactionId,
      opts.gitInit,
      () => verifyInstance(bundle, target),
    ),
    pruned: changes.filter(c=>c.action==='delete').map(c=>c.path),
  };
}
