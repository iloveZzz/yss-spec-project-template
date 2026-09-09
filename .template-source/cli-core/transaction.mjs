import * as fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import os from "node:os";
import { spawnSync } from "node:child_process";
import {
  ensure,
  safe,
  stat,
  descriptor,
  same,
  write,
  readJson,
  json,
  hash,
  targetPath,
  governance,
} from "./io.mjs";
import { guardNestedRepository, gitlinks } from "./identity.mjs";
const STATE = ".yss-harness-state";
function syncDirectory(directory) {
  const fd = fs.openSync(directory, "r");
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function dirtyParents(root, ref, directories) {
  let parent = path.dirname(ref);
  while (parent !== ".") { directories.add(parent); parent = path.dirname(parent); }
  directories.add(".");
}
function flushDirectories(root, directories) {
  // Child directory entries reach disk before the parent which makes them reachable.
  for (const ref of [...directories].sort((a, b) => (b === "." ? 0 : b.split("/").length) - (a === "." ? 0 : a.split("/").length))) {
    const directory = ref === "." ? root : safe(root, ref);
    if (stat(directory)?.isDirectory()) syncDirectory(directory);
  }
  directories.clear();
}
function operationTemporaryPath(ref, id, index) {
  return `${ref}.${hash(`${id}:${index}`).slice(0, 36)}.tmp`;
}
function durable(root, ref, bytes, mode = 0o644, directories, temporaryPath, onCreated) {
  const file = safe(root, ref);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = temporaryPath ? safe(root, temporaryPath) : file + "." + randomUUID() + ".tmp";
  let temporaryIdentity;
  try {
    const fd = fs.openSync(temp, "wx", mode);
    try {
      temporaryIdentity = fs.fstatSync(fd);
      onCreated?.();
      fs.writeFileSync(fd, bytes);
      fs.fchmodSync(fd, mode);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, file);
    if (directories) dirtyParents(root, ref, directories);
    else syncDirectory(path.dirname(file));
  } finally {
    const remaining = temporaryIdentity && stat(temp);
    if (remaining && remaining.dev === temporaryIdentity.dev && remaining.ino === temporaryIdentity.ino) fs.unlinkSync(temp);
  }
}
function readWal(target, base, journal) {
  const wal = safe(target, `${base}/intent.wal`);
  if (!stat(wal)) { ensure(journal.phase === "backup", "事务 WAL 缺失", "STATE"); return; }
  const bytes = fs.readFileSync(wal, "utf8");
  // An incomplete final append precedes its fsync, therefore no target write was allowed.
  const complete = bytes.slice(0, bytes.lastIndexOf("\n") + 1);
  const created = new Set();
  journal.operations.forEach(op => { op.attempted = false; });
  let index = 0;
  for (const line of complete.split("\n").filter(Boolean)) {
    const record = JSON.parse(line);
    ensure(record.schemaVersion === 1 && record.index === index && index < journal.operations.length && Array.isArray(record.createdDirectories), "事务 WAL 损坏", "STATE");
    const op = journal.operations[index++];
    for (const ref of record.createdDirectories) {
      ensure(typeof ref === "string" && op.path.startsWith(ref + "/"), "WAL 目录不在操作范围", "STATE");
      safe(target, ref); created.add(ref);
    }
    op.attempted = true;
  }
  if (journal.phase === "verify") ensure(index === journal.operations.length, "已验证事务的 WAL 不完整", "STATE");
  journal.createdDirectories = [...created];
}
export function inspectState(target, family) {
  const state = safe(target, STATE);
  if (!stat(state)) return { pending: [] };
  ensure(stat(state).isDirectory(), "状态路径不是目录", "STATE");
  const owner = readJson(target, `${STATE}/owner.json`);
  ensure(
    owner.schemaVersion === 1 && owner.profileId === family.profileId,
    "未知或异族状态目录，不覆盖",
    "STATE",
  );
  const transactions = safe(target, `${STATE}/${family.side}/transactions`);
  ensure(stat(transactions)?.isDirectory(), "状态目录不完整", "STATE");
  const pending = [];
  for (const name of fs.readdirSync(transactions)) {
    ensure(/^[a-f0-9-]{36}$/.test(name), "未知事务目录", "STATE");
    const base = `${STATE}/${family.side}/transactions/${name}`,
      journal = readJson(target, `${base}/journal.json`);
    ensure(
      [1, 2].includes(journal.schemaVersion) &&
        journal.id === name &&
        journal.profileId === family.profileId &&
        Array.isArray(journal.operations),
      "事务日志损坏",
      "STATE",
    );
    if (!["committed", "rolled-back"].includes(journal.phase)) {
      for (const [index, op] of journal.operations.entries()) {
        if (op.path !== family.metadataFile) governance(op.path);
        safe(target, op.path);
        if (op.temporaryPath != null) ensure(
          journal.schemaVersion === 2 && op.after !== null &&
          op.temporaryPath === operationTemporaryPath(op.path, journal.id, index),
          "恢复临时文件不在事务操作范围", "STATE",
        );
        for (const d of [op.before, op.after])
          ensure(
            d === null ||
              (d?.type === "file" &&
                /^[a-f0-9]{64}$/.test(d.digest) &&
                Number.isInteger(d.mode) &&
                d.mode >= 0 &&
                d.mode <= 0o777),
            "恢复日志描述损坏",
            "STATE",
          );
      }
      if (journal.schemaVersion === 2) readWal(target, base, journal);
      else if (stat(safe(target, `${base}/progress.json`))) {
        const progress = readJson(target, `${base}/progress.json`);
        ensure(
          Number.isInteger(progress.index) &&
            progress.index >= 0 &&
            progress.index < journal.operations.length,
          "恢复进度损坏",
          "STATE",
        );
        journal.operations.forEach(
          (op, i) => (op.attempted = i <= progress.index),
        );
        journal.createdDirectories = progress.createdDirectories;
      }
      pending.push({ base, journal });
    }
  }
  return { pending };
}
export function applyTransaction(
  target,
  family,
  operations,
  validate,
  id = randomUUID(),
  gitInit = false,
) {
  targetPath(target);
  const initial = stat(target);
  const newTargetParents = [];
  for (let directory = target; !stat(directory); directory = path.dirname(directory)) {
    newTargetParents.push(path.dirname(directory));
  }
  if (!initial) fs.mkdirSync(target, { recursive: true });
  const prior = inspectState(target, family);
  ensure(!prior.pending.length, "发现中断事务，请先恢复", "INTERRUPTED");
  const createdState = !stat(safe(target, STATE));
  if (createdState) {
    fs.mkdirSync(safe(target, STATE));
    durable(
      target,
      `${STATE}/owner.json`,
      json({ schemaVersion: 1, profileId: family.profileId }),
    );
    fs.mkdirSync(safe(target, `${STATE}/${family.side}/transactions`), {
      recursive: true,
    });
  }
  clearStaleLock(target);
  const lockRef = `${STATE}/lock.json`,
    lock = safe(target, lockRef);
  let acquired = false,
    base,
    journal,
    wal;
  const directories = new Set();
  try {
    const fd = fs.openSync(lock, "wx");
    acquired = true;
    fs.writeFileSync(fd, json({ pid: process.pid, host: os.hostname() }));
    fs.closeSync(fd);
    validate();
    for (const op of operations)
      ensure(
        same(descriptor(target, op.path), op.before),
        `计划已过期: ${op.path}`,
        "CONCURRENT",
      );
    base = `${STATE}/${family.side}/transactions/${id}`;
    fs.mkdirSync(safe(target, base));
    journal = {
      schemaVersion: 2,
      id,
      profileId: family.profileId,
      phase: "backup",
      createdAt: new Date().toISOString(),
      createdDirectories: [],
      operations: operations.map(({ path, before, after }, index) => ({
        path,
        before,
        after,
        attempted: false,
        temporaryPath: after ? operationTemporaryPath(path, id, index) : null,
      })),
    };
    durable(target, `${base}/journal.json`, json(journal));
    dirtyParents(target, `${base}/journal.json`, directories);
    flushDirectories(target, directories);
    // mkdir(recursive) can create ancestors outside the transaction root. Make
    // those directory entries durable before any operation is allowed to start.
    for (const parent of newTargetParents) syncDirectory(parent);
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (op.before) {
        const bytes = fs.readFileSync(safe(target, op.path));
        ensure(
          hash(bytes) === op.before.digest,
          "备份期间发生并发变化",
          "CONCURRENT",
        );
        durable(target, `${base}/backup/${i}`, bytes, op.before.mode);
      }
    }
    durable(target, `${base}/intent.wal`, Buffer.alloc(0));
    wal = fs.openSync(safe(target, `${base}/intent.wal`), "a");
    journal.phase = "apply";
    durable(target, `${base}/journal.json`, json(journal));
    const createdDirectories = new Set();
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (op.path === family.metadataFile) flushDirectories(target, directories);
      targetPath(target);
      validate(op);
      ensure(
        same(descriptor(target, op.path), op.before),
        `写入前发生并发变化: ${op.path}`,
        "CONCURRENT",
      );
      const missing = [];
      let parent = path.dirname(op.path);
      while (parent !== "." && !stat(safe(target, parent))) {
        missing.unshift(parent);
        parent = path.dirname(parent);
      }
      const added = missing.filter(dir => !createdDirectories.has(dir));
      const state = journal.operations[i];
      if (state.temporaryPath) ensure(!stat(safe(target, state.temporaryPath)), "事务临时路径已有文件", "CONCURRENT");
      fs.writeFileSync(wal, JSON.stringify({ schemaVersion: 1, index: i, createdDirectories: added }) + "\n");
      fs.fsyncSync(wal);
      for (const dir of added) { createdDirectories.add(dir); journal.createdDirectories.push(dir); }
      journal.operations[i].attempted = true;
      if (op.after) {
        state.temporaryCreated = false;
        durable(target, op.path, op.bytes, op.after.mode, directories, state.temporaryPath, () => { state.temporaryCreated = true; });
      }
      else { fs.unlinkSync(safe(target, op.path)); dirtyParents(target, op.path, directories); }
    }
    // Retired managed files must not leave discoverable empty skill roots.
    // Only walk ancestors of deletions; never remove nonempty user directories.
    for (const op of operations.filter((item) => !item.after)) {
      let parent = path.dirname(op.path);
      while (parent !== ".") {
        guardRecoveryPath(target, parent + "/__retirement_check__");
        const directory = safe(target, parent);
        if (!stat(directory)?.isDirectory() || fs.readdirSync(directory).length) break;
        fs.rmdirSync(directory);
        parent = path.dirname(parent);
      }
    }
    flushDirectories(target, directories);
    validate();
    journal.phase = "verify";
    durable(target, `${base}/journal.json`, json(journal));
    for (const op of operations)
      ensure(
        same(descriptor(target, op.path), op.after),
        `应用后校验失败: ${op.path}`,
        "VERIFY",
      );
    if (gitInit) {
      const work = safe(target, `${base}/git-staging`);
      fs.mkdirSync(work);
      const run = spawnSync(
        "git",
        ["-c", "init.templateDir=", "init", "--initial-branch=main", work],
        { encoding: "utf8" },
      );
      ensure(run.status === 0, `git init 失败: ${run.stderr}`, "GIT");
      journal.gitConfigHash = hash(
        fs.readFileSync(path.join(work, ".git/config")),
      );
      durable(target, `${base}/journal.json`, json(journal));
      ensure(!stat(safe(target, ".git")), "Git 路径并发冲突", "CONCURRENT");
      fs.renameSync(path.join(work, ".git"), safe(target, ".git"));
      syncDirectory(target);
    }
    journal.phase = "committed";
    durable(target, `${base}/journal.json`, json(journal));
    return { transactionId: id, backupPath: path.join(target, base) };
  } catch (error) {
    if (wal !== undefined) { fs.closeSync(wal); wal = undefined; }
    if (journal) {
      const unrestored = restore(target, base, journal, validate);
      if (unrestored.length)
        throw Object.assign(
          new Error(
            `${error.message}；自动恢复未完成: ${unrestored.join(", ")}；恢复清单: ${path.join(target, base)}`,
          ),
          { code: "RECOVERY_FAILED" },
        );
    }
    throw error;
  } finally {
    if (wal !== undefined) fs.closeSync(wal);
    if (acquired && stat(lock)) fs.unlinkSync(lock);
  }
}
function inspectTemporary(target, op) {
  if (!op.temporaryPath) return null;
  guardRecoveryPath(target, op.temporaryPath);
  const current = descriptor(target, op.temporaryPath);
  ensure(!current || (op.temporaryCreated !== false && same(current, op.after)),
    `恢复临时文件无法证明归属或已有后续修改: ${op.temporaryPath}`, "RECOVERY_FAILED");
  return current;
}
function restore(target, base, journal, validate = () => {}) {
  const failed = [];
  const directories = new Set();
  if (journal.gitConfigHash && stat(safe(target, ".git"))) {
    try {
      ensure(
        hash(fs.readFileSync(safe(target, ".git/config"))) ===
          journal.gitConfigHash && !stat(safe(target, ".git/index")),
        "Git 已有后续修改",
      );
      fs.rmSync(safe(target, ".git"), { recursive: true });
      syncDirectory(target);
    } catch {
      failed.push(".git");
    }
  }
  for (let i = journal.operations.length - 1; i >= 0; i--) {
    const op = journal.operations[i];
    if (!op.attempted) continue;
    let failedPath = op.path;
    try {
      validate(op);
      guardRecoveryPath(target, op.path);
      dirtyParents(target, op.path, directories);
      if (op.temporaryPath) {
        failedPath = op.temporaryPath;
        if (inspectTemporary(target, op)) fs.unlinkSync(safe(target, op.temporaryPath));
        failedPath = op.path;
      }
      const current = descriptor(target, op.path);
      if (same(current, op.before)) continue;
      ensure(
        same(current, op.after),
        `检测到后续修改: ${op.path}`,
        "CONCURRENT",
      );
      if (op.before) {
        const bytes = fs.readFileSync(safe(target, `${base}/backup/${i}`));
        ensure(hash(bytes) === op.before.digest, "备份摘要损坏");
        durable(target, op.path, bytes, op.before.mode);
      } else if (current) {
        fs.unlinkSync(safe(target, op.path));
        syncDirectory(path.dirname(safe(target, op.path)));
      }
    } catch {
      failed.push(failedPath);
    }
  }
  for (const dir of [...(journal.createdDirectories || [])].reverse()) {
    try {
      ensure(
        journal.operations.some((op) => op.path.startsWith(dir + "/")),
        "恢复目录不在事务范围",
      );
      guardRecoveryPath(target, dir + "/__recovery_check__");
      const p = safe(target, dir);
      if (stat(p)?.isDirectory() && !fs.readdirSync(p).length) { fs.rmdirSync(p); syncDirectory(path.dirname(p)); }
    } catch {
      failed.push(dir);
    }
  }
  try { flushDirectories(target, directories); } catch { failed.push("directory-persistence"); }
  journal.phase = failed.length ? "recovery-failed" : "rolled-back";
  journal.unrestored = failed;
  durable(target, `${base}/journal.json`, json(journal));
  return failed;
}
export function recover(target, family, state, validateIdentity) {
  // All recovery inputs are checked before touching even the stale lock.
  validateIdentity();
  for (const { base, journal } of state.pending) {
    for (let i = 0; i < journal.operations.length; i++) {
      const op = journal.operations[i];
      if (!op.attempted) continue;
      guardRecoveryPath(target, op.path);
      inspectTemporary(target, op);
      const current = descriptor(target, op.path);
      ensure(
        same(current, op.before) || same(current, op.after),
        `恢复目标已有后续修改: ${op.path}`,
        "RECOVERY_FAILED",
      );
      if (op.before && !same(current, op.before)) {
        const bytes = fs.readFileSync(safe(target, `${base}/backup/${i}`));
        ensure(
          hash(bytes) === op.before.digest,
          `恢复备份摘要损坏: ${op.path}`,
          "RECOVERY_FAILED",
        );
      }
    }
    for (const dir of journal.createdDirectories || []) {
      ensure(
        journal.operations.some((op) => op.path.startsWith(dir + "/")),
        "恢复目录不在事务范围",
        "STATE",
      );
      guardRecoveryPath(target, dir + "/__recovery_check__");
    }
  }
  const lock = safe(target, `${STATE}/lock.json`);
  if (stat(lock)) {
    const holder = readJson(target, `${STATE}/lock.json`);
    ensure(
      holder.host === os.hostname() &&
        Number.isInteger(holder.pid) &&
        holder.pid > 0,
      "无法判断事务持有者，保留恢复清单",
      "LOCKED",
    );
    let alive = true;
    try {
      process.kill(holder.pid, 0);
    } catch (e) {
      if (e.code === "ESRCH") alive = false;
      else throw e;
    }
    ensure(!alive, "另一个 CLI 正在运行", "LOCKED");
    fs.unlinkSync(lock);
  }
  const fd = fs.openSync(lock, "wx");
  fs.writeFileSync(fd, json({ pid: process.pid, host: os.hostname() }));
  fs.closeSync(fd);
  try {
    const recovered = [];
    for (const { base, journal } of state.pending) {
      const failed = restore(target, base, journal, validateIdentity);
      ensure(
        !failed.length,
        `自动恢复未完成: ${failed.join(", ")}；保留 ${path.join(target, base)}`,
        "RECOVERY_FAILED",
      );
      recovered.push(journal.id);
    }
    return {
      schemaVersion: 1,
      status: "recovered",
      target,
      transactions: recovered,
      message: "中断事务已恢复，请重新执行预览或 apply",
    };
  } finally {
    fs.unlinkSync(lock);
  }
}

function clearStaleLock(target) {
  const ref = `${STATE}/lock.json`,
    file = safe(target, ref);
  if (!stat(file)) return;
  const holder = readJson(target, ref);
  ensure(
    holder.host === os.hostname() &&
      Number.isInteger(holder.pid) &&
      holder.pid > 0,
    "无法判断锁持有者",
    "LOCKED",
  );
  let alive = true;
  try {
    process.kill(holder.pid, 0);
  } catch (e) {
    if (e.code === "ESRCH") alive = false;
    else throw e;
  }
  ensure(!alive, "另一个 CLI 正在运行", "LOCKED");
  fs.unlinkSync(file);
}

function guardRecoveryPath(target, ref) {
  targetPath(target);
  safe(target, ref);
  guardNestedRepository(target, ref);
  ensure(
    !gitlinks(target).some((x) => ref === x || ref.startsWith(x + "/")),
    `受保护恢复 gitlink: ${ref}`,
    "PROTECTED",
  );
}
