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
      opts.apply && !opts.dryRun,
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
    ...new Set([...files.keys(), ...Object.keys(meta?.managedFiles || {})]),
  ].sort()) {
    ensure(
      !protectedLinks.some((x) => ref === x || ref.startsWith(x + "/")),
      `受保护 gitlink: ${ref}`,
      "PROTECTED",
    );
    guardNestedRepository(target, ref);
    const before = descriptor(target, ref),
      next = files.get(ref),
      after = next?.baseline || null,
      baseline = meta?.managedFiles[ref]?.baseline || null;
    let action;
    observed.set(ref, before);
    if (same(before, after)) action = "unchanged";
    else if (same(before, baseline))
      action = after ? (before ? "update" : "add") : "delete";
    else if (same(after, baseline)) action = "preserve";
    else action = "conflict";
    if (action === "conflict") conflicts.push(ref);
    if (next)
      managedFiles[ref] = {
        baseline: after,
        lastApplied: action === "preserve" ? before : after,
      };
    if (
      ["update", "add", "delete"].includes(action) ||
      (action === "conflict" && opts.force && opts.apply)
    )
      operations.push({ path: ref, before, after, bytes: next?.bytes });
    changes.push({ path: ref, action });
  }
  const result = {
    schemaVersion: 1,
    command: opts.command,
    status: "preview",
    target,
    cliVersion: pkg.version,
    templateCommit: snapshot.templateCommit,
    coreVersion: core.coreVersion,
    changes,
    conflicts,
    backupPath: null,
  };
  if (conflicts.length && !(opts.apply && opts.force))
    throw Object.assign(
      new Error(
        `治理文件冲突，整次暂停；确认备份覆盖后使用 --apply --force: ${conflicts.join(", ")}`,
      ),
      { code: "CONFLICT", result },
    );
  if (opts.dryRun || (opts.command !== "init" && !opts.apply)) return result;
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
    snapshotHash: snapshot.snapshotHash,
    coreVersion: core.coreVersion,
    coreDigest: core.digest,
    manifestHash: snapshot.manifestHash,
    variables,
    managedFiles,
    baselineDigest: hash(JSON.stringify(managedFiles)),
    initializedAt: meta?.initializedAt || new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
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
    ),
  };
}
