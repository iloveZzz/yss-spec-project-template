import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { gzipSync, gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { workScanRoots } from './work-layout.mjs';

const require = createRequire(import.meta.url);
const VERSION = 1;
const DAY = 86_400_000;
const SUCCESS = new Set(['passed', 'success', 'completed', 'ok']);
const TERMINAL = new Set([...SUCCESS, 'failed', 'failure', 'cancelled', 'canceled', 'timed-out', 'timeout', 'error']);
const TABLES = ['schema_migrations', 'runs', 'commands', 'events', 'objects', 'run_objects', 'pins', 'run_files', 'checkpoint_index'];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value);
const bytes = value => Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : json(value ?? null));
const inside = (directory, candidate) => { const relative = path.relative(directory, candidate); return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)); };
const slash = value => value.split(path.sep).join('/');

export function assertNodeVersion(version = process.versions.node) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (!match || Number(match[1]) < 22 || Number(match[1]) >= 27 || (Number(match[1]) === 22 && Number(match[2]) < 13)) {
    throw new Error(`运行存储需要 Node >=22.13 <27，当前 ${version}`);
  }
}
export const assertRuntimeVersion = assertNodeVersion;

// Resolve the nearest existing ancestor before creating anything: lexical checks
// alone do not prevent an external-looking symlink from writing into a repository.
function realTarget(candidate) {
  let cursor = path.resolve(candidate); const tail = [];
  while (!fs.existsSync(cursor)) {
    try { if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`不解析悬空符号链接: ${candidate}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error(`无法解析路径: ${candidate}`);
    tail.unshift(path.basename(cursor)); cursor = parent;
  }
  return path.join(fs.realpathSync(cursor), ...tail);
}

function registeredRoots(root) {
  const roots = [];
  const fields = (source, key) => [...source.matchAll(new RegExp(`["']?${key}["']?\\s*:\\s*("(?:\\\\.|[^"\\\\])*"|'(?:''|[^'])*'|[^\\r\\n"'#,}]+)|\\|\\s*${key}\\s*\\|\\s*([^|\\r\\n]+)`, 'g'))].map(match => {
    const value = (match[1] ?? match[2]).trim();
    // Decode complete string tokens: raw JSON escapes change UNC roots, and
    // stripping quotes truncates otherwise valid paths containing apostrophes.
    if (value.startsWith('"')) {
      try { return JSON.parse(value); } catch { throw new Error(`已登记仓库路径无法解析双引号值: ${key}`); }
    }
    if (value.startsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
    return value.replace(/^`|`$/g, '');
  });
  const field = (source, key) => fields(source, key)[0];
  const read = filename => {
    if (!fs.existsSync(filename)) return;
    const source = fs.readFileSync(filename, 'utf8');
    // Protect every worktree in arrays/multi-registration Markdown, not just the
    // first parsed project. Whole-worktree denial also covers relative projects.
    for (const value of fields(source, 'local_worktree')) {
      if (!value) continue;
      const target = path.isAbsolute(value) ? value : path.resolve(root, value);
      if (fs.existsSync(target)) roots.push(fs.realpathSync(target));
    }
    const local = field(source, 'local_worktree');
    if (local) {
      const base = path.isAbsolute(local) ? local : path.resolve(root, local);
      if (fs.existsSync(base)) roots.push(fs.realpathSync(base));
      const project = field(source, 'project_root');
      if (project) {
        const actual = path.resolve(base, project);
        if (fs.existsSync(actual)) roots.push(fs.realpathSync(actual));
      }
    }
    for (const value of ['project_root', 'repository_root', 'local_path', 'root_path'].flatMap(key => fields(source, key))) {
      if (!value) continue;
      const target = path.isAbsolute(value) ? value : path.resolve(root, value);
      if (fs.existsSync(target)) roots.push(fs.realpathSync(target));
    }
  };
  read(path.join(root, '.gitmodules'));
  // Registrations remain file authority; this conservative extraction is only a
  // deny-list. Callers can provide the schema-validated registered roots as well.
  for (const relative of new Set(['docs', ...workScanRoots(root), '.template-spec/implementation', '.template-spec/projects', '.template-spec/project'])) {
    const directory = path.join(root, relative);
    if (fs.existsSync(directory)) for (const file of walk(directory).files) if (/\.(?:ya?ml|json|md)$/.test(file)) read(file);
  }
  const modules = path.join(root, '.gitmodules');
  if (fs.existsSync(modules)) for (const match of fs.readFileSync(modules, 'utf8').matchAll(/^\s*path\s*=\s*(.+)$/gm)) {
    const target = path.join(root, match[1].trim()); if (fs.existsSync(target)) roots.push(fs.realpathSync(target));
  }
  return roots;
}

export function resolveRuntimeLocation({ root, home, protectedRoots = [] } = {}) {
  assertNodeVersion();
  if (!root) throw new Error('运行存储需要显式项目根目录');
  const realRoot = fs.realpathSync(path.resolve(root));
  const selected = home ?? process.env.YSS_RUNTIME_HOME ?? (process.env.RUNNER_TEMP ? path.join(process.env.RUNNER_TEMP, 'yss-harness-runtime') : path.join(os.homedir(), '.yss-harness', 'runtime'));
  if (!path.isAbsolute(selected) || (process.platform !== 'win32' && /^(?:[A-Za-z]:[\\/]|\\\\)/.test(selected))) throw new Error('运行存储目录必须为本机仓外绝对路径');
  const external = realTarget(selected);
  const excluded = [realRoot, ...registeredRoots(realRoot), ...protectedRoots.map(value => realTarget(path.resolve(value)))];
  for (const candidate of [path.resolve(selected), external]) for (const forbidden of excluded) {
    if (inside(forbidden, candidate)) throw new Error(`运行存储不得进入项目或已登记仓库: ${candidate}`);
  }
  const workspaceId = sha(realRoot);
  const directory = path.join(external, workspaceId);
  // An existing workspace leaf can itself be a symlink.
  const realDirectory = realTarget(directory);
  for (const forbidden of excluded) if (inside(forbidden, realDirectory)) throw new Error(`运行存储目标越界: ${directory}`);
  return { root: realRoot, workspaceId, home: external, directory: realDirectory, excluded };
}

function walk(directory, { skip = new Set(), strict = false, followWithin = [] } = {}) {
  const files = [], errors = [], projections = [], seen = new Set();
  function visit(current) {
    const actual = fs.realpathSync(current);
    if (seen.has(actual)) return;
    seen.add(actual);
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch (error) { errors.push(`${current}: ${error.message}`); return; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        try {
          const target = fs.realpathSync(filename);
          if (followWithin.some(root => inside(root, target))) {
            projections.push({ path: filename, target, classification: 'projection-or-alias', archive_candidate: false });
            if (fs.statSync(target).isDirectory()) visit(target);
            else if (fs.statSync(target).isFile() && !seen.has(target)) { seen.add(target); files.push(target); }
          } else if (strict) errors.push(`不读取越界符号链接: ${filename}`);
        } catch (error) { if (strict) errors.push(`${filename}: ${error.message}`); }
        continue;
      }
      if (entry.isDirectory()) { if (!skip.has(entry.name)) visit(filename); }
      else if (entry.isFile() && !seen.has(filename)) { seen.add(filename); files.push(filename); }
      else if (strict) errors.push(`未知文件类型: ${filename}`);
    }
  }
  if (fs.existsSync(directory)) visit(directory);
  return { files, errors, projections };
}

function fileInfo(filename) {
  if (fs.lstatSync(filename).isSymbolicLink() || !fs.statSync(filename).isFile()) throw new Error(`证据必须是普通文件: ${filename}`);
  const data = fs.readFileSync(filename);
  return { path: fs.realpathSync(filename), sha256: sha(data), bytes: data.length };
}
function activePid(pid, hostname) {
  if (!pid) return false;
  if (hostname !== os.hostname()) return true;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}
function fileOccupancy(directory) {
  if (!fs.existsSync(directory)) return { complete: true, occupied: false };
  if (process.platform === 'win32') {
    const script = "$ErrorActionPreference='Stop';try{Get-ChildItem -LiteralPath $env:YSS_OCCUPANCY_DIR -Recurse -File | ForEach-Object {$f=[System.IO.File]::Open($_.FullName,[System.IO.FileMode]::Open,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None);$f.Dispose()};exit 0}catch{Write-Error $_;exit 1}";
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, YSS_OCCUPANCY_DIR: directory }, encoding: 'utf8', timeout: 10_000 });
    return { complete: !result.error && result.status === 0, occupied: result.status === 1, error: result.error?.message || result.stderr?.trim() };
  }
  const result = spawnSync('lsof', ['-nP', '+D', directory], { encoding: 'utf8', timeout: 10_000 });
  if (result.error || result.stderr?.trim() || ![0, 1].includes(result.status)) return { complete: false, occupied: false, error: result.error?.message || result.stderr?.trim() || '占用探测未完成' };
  // macOS lsof can emit matching files and still exit 1; any output protects.
  return { complete: true, occupied: result.stdout.trim().length > 0 };
}
function verifyBundle(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.schema_version !== 1 || !['runtime-export', 'runtime-backup'].includes(manifest.kind) || !Array.isArray(manifest.files)) throw new Error('不支持的运行包清单');
  const seen = new Set();
  const realDirectory = fs.realpathSync(directory);
  for (const row of manifest.files) {
    if (typeof row.relative_path !== 'string' || !row.relative_path || path.isAbsolute(row.relative_path) || path.win32.isAbsolute(row.relative_path) || row.relative_path.split(/[\\/]/).includes('..')) throw new Error('运行包引用越界');
    if (seen.has(row.relative_path) || !/^[a-f0-9]{64}$/.test(row.sha256) || !Number.isInteger(row.bytes) || row.bytes < 0) throw new Error('运行包文件清单非法或重复');
    seen.add(row.relative_path);
    const filename = path.resolve(realDirectory, row.relative_path);
    if (!inside(realDirectory, fs.realpathSync(filename)) || filename !== fs.realpathSync(filename)) throw new Error('运行包真实目标越界或符号链接');
    const info = fileInfo(filename);
    if (info.sha256 !== row.sha256 || info.bytes !== row.bytes) throw new Error(`运行包摘要不匹配: ${row.relative_path}`);
  }
  return manifest;
}
export { verifyBundle as verifyRuntimeBundle };
export function inspectRuntimeBundle(source) {
  const directory = fs.realpathSync(path.resolve(source)), manifest = verifyBundle(directory);
  const files = manifest.files.map(row => ({ ...row, resolved_path: path.resolve(directory, row.relative_path) }));
  const pathMap = Object.fromEntries(files.filter(row => row.source_path).map(row => [row.source_path, row.resolved_path]));
  for (const event of manifest.events ?? []) if (event.type === 'runtime-restored') {
    const { old_directory: oldDirectory, new_directory: newDirectory } = event.value;
    for (const file of files) if (file.source_path && inside(newDirectory, file.source_path)) pathMap[path.join(oldDirectory, path.relative(newDirectory, file.source_path))] = file.resolved_path;
  }
  return { schema_version: 1, read_only: true, independent: true, kind: manifest.kind, directory, manifest, files, path_map: pathMap, reports: files.filter(row => /(?:^|\/)report\.json$/.test(row.relative_path)), logs: files.filter(row => /(?:stdout|stderr|\.log$)/.test(row.relative_path)) };
}

export class RuntimeStore {
  #ownedRuns = new Set();
  constructor(options = {}) {
    const location = resolveRuntimeLocation(options);
    Object.assign(this, location);
    this.readOnly = options.readOnly === true;
    this.databasePath = path.join(this.directory, 'runtime.sqlite');
    for (const filename of [this.databasePath, ...['-journal', '-wal', '-shm'].map(suffix => this.databasePath + suffix)]) {
      let entry; try { entry = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      // The parent was already resolved and checked. DELETE journals can disappear
      // between lstat and realpath during another connection's commit.
      if (entry && (entry.isSymbolicLink() || !entry.isFile())) throw new Error('数据库真实目标越界或符号链接');
    }
    this.db = null;
    if (this.readOnly && !fs.existsSync(this.databasePath)) return;
    if (options.existingOnly && !fs.existsSync(this.databasePath)) throw new Error('运行数据库不存在');
    if (!this.readOnly) fs.mkdirSync(this.directory, { recursive: true });
    const { DatabaseSync } = require('node:sqlite');
    this.db = new DatabaseSync(this.databasePath, { readOnly: this.readOnly });
    try {
      this.db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
      this.db.exec('BEGIN;');
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      if (version !== VERSION && !(version === 0 && tables.length === 0 && !this.readOnly)) throw new Error(`不识别的运行数据库 schema: ${version}，拒绝写入`);
      if (version === VERSION && TABLES.some(table => !tables.some(row => row.name === table))) throw new Error('数据库schema不完整，拒绝写入');
      if (version === VERSION && !this.db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(VERSION)) throw new Error('数据库迁移记录缺失，拒绝写入');
      this.db.exec('COMMIT;');
      if (!this.readOnly) {
        this.db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');
        if (version === 0) this.#initialize();
      }
      if (this.db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('运行数据库损坏');
    } catch (error) { this.close(); throw error; }
  }
  #initialize() {
    this.db.exec('BEGIN IMMEDIATE');
    // A concurrent opener may have initialized it while this opener waited.
    if (this.db.prepare('PRAGMA user_version').get().user_version === VERSION) { this.db.exec('COMMIT'); return; }
    this.db.exec(`
      CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE runs(id TEXT PRIMARY KEY, kind TEXT NOT NULL, root TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, status TEXT NOT NULL, exit_code INTEGER, input_digest TEXT, run_dir TEXT NOT NULL, report_dir TEXT, owner_pid INTEGER, hostname TEXT, logs_expired INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE commands(id INTEGER PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), recorded_at TEXT NOT NULL, result_json TEXT NOT NULL);
      CREATE TABLE events(id INTEGER PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), recorded_at TEXT NOT NULL, type TEXT NOT NULL, value_json TEXT NOT NULL);
      CREATE TABLE objects(digest TEXT PRIMARY KEY, bytes INTEGER NOT NULL, compressed_bytes INTEGER NOT NULL, relative_path TEXT NOT NULL, deleting INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE run_objects(run_id TEXT NOT NULL REFERENCES runs(id), digest TEXT NOT NULL REFERENCES objects(digest), PRIMARY KEY(run_id,digest));
      CREATE TABLE pins(run_id TEXT NOT NULL REFERENCES runs(id), reason TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(run_id,reason));
      CREATE TABLE run_files(run_id TEXT NOT NULL REFERENCES runs(id), path TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY(run_id,path));
      CREATE TABLE checkpoint_index(path TEXT PRIMARY KEY, source_digest TEXT NOT NULL, indexed_at TEXT NOT NULL, value_json TEXT NOT NULL);
      PRAGMA user_version=1;
      INSERT INTO schema_migrations VALUES(1, '${new Date().toISOString()}');
      COMMIT;`);
  }
  #write() { if (this.readOnly || !this.db) throw new Error('只读或缺失的运行存储不能写入'); }
  #transaction(action) {
    this.#write(); this.db.exec('BEGIN IMMEDIATE');
    try { const result = action(); this.db.exec('COMMIT'); return result; }
    catch (error) { try { this.db.exec('ROLLBACK'); } catch {} throw error; }
  }
  close() { if (this.db) { this.db.close(); this.db = null; } }
  #rows(table) { return this.db ? this.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map(row => ({ ...row })) : []; }
  #stateDigest() { return sha(json(TABLES.map(table => [table, this.#rows(table)]))); }
  #run(id) { const row = this.db?.prepare('SELECT * FROM runs WHERE id=?').get(id); if (!row) throw new Error(`未知运行: ${id}`); return row; }
  #mutableRun(id) { const row = this.#run(id); if (row.logs_expired) throw new Error('运行已进入清理状态，拒绝新增引用或修改'); return row; }
  #safeOwned(filename) {
    const target = realTarget(filename);
    if (!inside(this.directory, target) || target === this.directory || target !== path.resolve(filename)) throw new Error(`运行存储文件越界或内部符号链接: ${filename}`);
    let cursor = path.resolve(filename);
    while (cursor !== this.directory) {
      try { if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`运行存储内部符号链接: ${filename}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      cursor = path.dirname(cursor);
    }
    for (const forbidden of this.excluded) if (inside(forbidden, target)) throw new Error(`运行存储目标越界: ${filename}`);
    return target;
  }
  #ownedRunDirectory(run) {
    const expected = path.join(this.directory, 'runs', run.id);
    if (path.resolve(run.run_dir) !== expected) throw new Error('运行目录与记录身份不一致');
    return this.#safeOwned(expected);
  }
  begin({ kind = 'command', input, reportDir } = {}) {
    this.#write();
    if (typeof kind !== 'string' || !kind) throw new Error('运行kind必须为非空字符串');
    let report;
    if (reportDir) {
      report = realTarget(path.resolve(reportDir));
      for (const forbidden of this.excluded) if (inside(forbidden, report)) throw new Error(`正式报告必须在仓外: ${report}`);
    }
    const id = `${new Date().toISOString().replace(/[-:.]/g, '')}-${crypto.randomUUID()}`;
    const runDir = this.#safeOwned(path.join(this.directory, 'runs', id));
    const inputBytes = input === undefined ? null : bytes(input);
    const digest = inputBytes && sha(inputBytes);
    // The DB is opened/checked before any run output is created. Orphan content
    // after a failed transaction is retained, never implicitly deleted.
    fs.mkdirSync(runDir, { recursive: true });
    let object;
    if (inputBytes) {
      const relative = `objects/${digest.slice(0, 2)}/${digest}.gz`;
      const filename = this.#safeOwned(path.join(this.directory, relative));
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      if (!fs.existsSync(filename)) { const compressed = gzipSync(inputBytes); try { fs.writeFileSync(filename, compressed, { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; } }
      if (sha(gunzipSync(fs.readFileSync(filename))) !== digest) throw new Error('运行输入对象损坏');
      object = { relative, compressed: fs.statSync(filename).size };
    }
    this.#transaction(() => {
      this.db.prepare('INSERT INTO runs(id,kind,root,started_at,status,input_digest,run_dir,report_dir,owner_pid,hostname) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, kind, this.root, new Date().toISOString(), 'running', digest, runDir, report ?? null, process.pid, os.hostname());
      if (object) {
        this.db.prepare('INSERT OR IGNORE INTO objects(digest,bytes,compressed_bytes,relative_path) VALUES(?,?,?,?)').run(digest, inputBytes.length, object.compressed, object.relative);
        if (this.db.prepare('SELECT deleting FROM objects WHERE digest=?').get(digest).deleting) throw new Error('输入对象正在清理，拒绝新增引用');
        this.db.prepare('INSERT INTO run_objects VALUES(?,?)').run(id, digest);
      }
      if (report) this.db.prepare('INSERT INTO pins VALUES(?,?,?)').run(id, `report-dir:${report}`, new Date().toISOString());
    });
    this.#ownedRuns.add(id);
    const store = this;
    return {
      id, runDir, store,
      recordCommand(row) { store.recordCommand(id, row); },
      recordCommandAndEvent(row, type, value) { store.recordCommandAndEvent(id, row, type, value); },
      recordEvent(type, value) { store.recordEvent(id, type, value); },
      registerFiles(directory) { return store.registerFiles(id, directory); },
      finish(value) { return store.finish(id, value); },
      pin(reason) { store.pin(id, reason); },
      close() { store.close(); },
    };
  }
  recordCommand(id, row) {
    return this.#persistCommand(id, row);
  }
  recordCommandAndEvent(id, row, type, value) {
    if (typeof type !== 'string' || !type.trim()) throw new Error('事件type必须为非空字符串');
    const valueJson = json(value ?? null);
    if (typeof valueJson !== 'string') throw new Error('事件值必须可序列化为JSON');
    return this.#persistCommand(id, row, { type, valueJson });
  }
  #persistCommand(id, row, event) {
    this.#write(); this.#mutableRun(id);
    if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('命令结果必须为对象');
    const { stdout, stderr, ...metadata } = row;
    const metadataJson = json(metadata);
    if (typeof metadataJson !== 'string') throw new Error('命令结果必须可序列化为JSON');
    const infos = [row?.stdoutFile, row?.stderrFile].filter(Boolean).flatMap(filename => this.#fileInfos(filename));
    const recordedAt = new Date().toISOString();
    const commandInsert = this.db.prepare('INSERT INTO commands(run_id,recorded_at,result_json) VALUES(?,?,?)');
    const fileInsert = this.db.prepare('INSERT OR REPLACE INTO run_files VALUES(?,?,?,?)');
    const eventInsert = event && this.db.prepare('INSERT INTO events(run_id,recorded_at,type,value_json) VALUES(?,?,?,?)');
    this.#transaction(() => {
      this.#mutableRun(id);
      commandInsert.run(id, recordedAt, metadataJson);
      for (const info of infos) fileInsert.run(id, info.path, info.sha256, info.bytes);
      if (event) eventInsert.run(id, recordedAt, event.type, event.valueJson);
    });
  }
  recordEvent(id, type, value) {
    this.#write(); this.#mutableRun(id);
    if (typeof type !== 'string' || !type) throw new Error('事件type必须为非空字符串');
    this.#transaction(() => { this.#mutableRun(id); this.db.prepare('INSERT INTO events(run_id,recorded_at,type,value_json) VALUES(?,?,?,?)').run(id, new Date().toISOString(), type, json(value ?? null)); });
  }
  pin(id, reason) {
    this.#write();
    if (typeof reason !== 'string' || !reason.trim()) throw new Error('保护必须记录原因');
    this.#transaction(() => { this.#mutableRun(id); this.db.prepare('INSERT OR IGNORE INTO pins VALUES(?,?,?)').run(id, reason, new Date().toISOString()); });
  }
  #fileInfos(directory) {
    const target = path.resolve(directory);
    if (!fs.existsSync(target)) return [];
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error(`不登记符号链接: ${target}`);
    const found = fs.statSync(target).isDirectory() ? walk(target, { strict: true }) : { files: [target], errors: [] };
    if (found.errors.length) throw new Error(found.errors.join('; '));
    return found.files.map(fileInfo);
  }
  registerFiles(id, directory) {
    this.#write(); this.#mutableRun(id);
    const infos = this.#fileInfos(directory);
    this.#transaction(() => { this.#mutableRun(id); const insert = this.db.prepare('INSERT OR REPLACE INTO run_files VALUES(?,?,?,?)'); for (const info of infos) insert.run(id, info.path, info.sha256, info.bytes); });
    return infos;
  }
  finish(id, { status, exitCode, report, endedAt = new Date().toISOString() } = {}) {
    this.#write(); const run = this.#mutableRun(id);
    this.#ownedRunDirectory(run);
    if (run.ended_at) throw new Error('运行已经结束，拒绝重复finish');
    if (!this.#ownedRuns.has(id)) throw new Error('仅创建运行的存储会话可finish，拒绝其它连接终止或覆写报告');
    if (typeof status !== 'string' || !status || status === 'running') throw new Error('finish需要终态status');
    if (!Number.isInteger(exitCode)) throw new Error('finish需要实际整数exitCode');
    const ended = new Date(endedAt);
    if (!Number.isFinite(ended.getTime())) throw new Error('结束时间非法');
    if (report !== undefined) {
      if (typeof report === 'string') { if (!fs.existsSync(report)) throw new Error('完整运行报告不存在'); }
      else {
        const filename = this.#safeOwned(path.join(run.run_dir, 'report.json'));
        fs.writeFileSync(filename, `${json(report)}\n`);
      }
    }
    const infos = [run.run_dir, run.report_dir, typeof report === 'string' ? report : null].filter(Boolean).flatMap(filename => this.#fileInfos(filename));
    this.#transaction(() => {
      const current = this.#mutableRun(id); if (current.ended_at) throw new Error('运行已经结束，拒绝重复finish');
      const insert = this.db.prepare('INSERT OR REPLACE INTO run_files VALUES(?,?,?,?)');
      for (const info of infos) insert.run(id, info.path, info.sha256, info.bytes);
      this.db.prepare('UPDATE runs SET status=?,exit_code=?,ended_at=?,owner_pid=NULL WHERE id=?').run(status, exitCode, ended.toISOString(), id);
    });
    return { id, status, exitCode, runDir: run.run_dir };
  }
  #scanReferences() {
    const found = walk(this.root, { skip: new Set(['.git', 'node_modules', '.codegraph', '.graphify']), strict: true, followWithin: this.excluded });
    const hashes = [], contents = [], errors = [...found.errors];
    for (const filename of found.files) {
      if (!/\.(?:json|jsonl|ya?ml|md|txt|toml|xml|html|mjs|js|cjs|ts|sh|bash|zsh|py|ps1)$/.test(filename) && path.extname(filename)) continue;
      try {
        const data = fs.readFileSync(filename); hashes.push([slash(path.relative(this.root, filename)), sha(data)]);
        if (data.includes(0)) { errors.push(`未知文本分类: ${filename}`); continue; }
        const content = data.toString('utf8');
        if (/\brun:(?:\$|\{|<)|(?:run_dir|runtime_dir|stdoutFile|stderrFile)\s*["']?\s*[:=]\s*[^\r\n]{0,160}(?:\$\{|\{\{|<[^>]+>)/.test(content)) errors.push(`未解析动态运行引用: ${filename}`);
        contents.push(content);
      } catch (error) { errors.push(`${filename}: ${error.message}`); }
    }
    return { complete: errors.length === 0, errors, digest: sha(json(hashes)), contents };
  }
  #eligibility(run, now, scan, { recovering = false } = {}) {
    const reasons = [];
    if (!run.ended_at || run.status === 'running') reasons.push('unfinished');
    if (!TERMINAL.has(run.status)) reasons.push('unknown-classification');
    if (run.logs_expired && !recovering) reasons.push('logs-expired');
    if (!scan.complete) reasons.push('reference-scan-incomplete');
    if (this.db.prepare('SELECT 1 FROM pins WHERE run_id=? LIMIT 1').get(run.id)) reasons.push('protected');
    if (activePid(run.owner_pid, run.hostname)) reasons.push('process-occupied');
    const ttl = SUCCESS.has(run.status) && run.exit_code === 0 ? 7 : 30;
    if (!run.ended_at || now - Date.parse(run.ended_at) < ttl * DAY) reasons.push('retained');
    const tokens = [run.id, run.run_dir, ...(run.input_digest ? [run.input_digest] : [])];
    const files = this.db.prepare('SELECT path FROM run_files WHERE run_id=?').all(run.id);
    tokens.push(...files.map(row => row.path));
    if (scan.contents.some(content => tokens.some(token => content.includes(token)))) reasons.push('formally-referenced');
    // External files can belong to callers and must never be retention targets.
    if (files.some(row => !inside(run.run_dir, row.path))) reasons.push('external-evidence');
    if (reasons.length === 0) {
      const occupancy = fileOccupancy(run.run_dir);
      if (!occupancy.complete) reasons.push('occupancy-scan-incomplete');
      if (occupancy.occupied) reasons.push('file-occupied');
    }
    return { eligible: reasons.length === 0, reasons, retention_days: ttl };
  }
  inspect({ now = Date.now(), limit = 100 } = {}) {
    const scan = this.#scanReferences();
    const runs = this.#rows('runs').slice(-limit).reverse().map(run => ({ ...run, cleanup_pending: Boolean(run.logs_expired && this.db.prepare("SELECT 1 FROM events WHERE run_id=? AND type='gc-pending' LIMIT 1").get(run.id)), ...this.#eligibility(run, Number(now), scan), protection: this.db.prepare('SELECT reason FROM pins WHERE run_id=? ORDER BY reason').all(run.id).map(row => row.reason) }));
    const storage = walk(this.directory).files.map(filename => ({ filename, bytes: fs.statSync(filename).size }));
    return { schema_version: 1, read_only: true, workspace_id: this.workspaceId, directory: this.directory, database_exists: Boolean(this.db), storage_bytes: storage.reduce((sum, row) => sum + row.bytes, 0), file_count: storage.length, objects: this.#rows('objects').length, reference_scan: { complete: scan.complete, digest: scan.digest, errors: scan.errors }, runs };
  }
  inventory() {
    const found = walk(this.root, { skip: new Set(['.git', 'node_modules', '.codegraph', '.graphify']), strict: true, followWithin: this.excluded });
    const rows = [], groups = new Map();
    for (const filename of found.files.filter(value => /\.(?:json|jsonl|ya?ml)$/.test(value))) {
      const info = fileInfo(filename), relative = slash(path.relative(this.root, filename));
      let classification = 'unknown';
      if (/(?:checkpoint|approval|user-decision|transaction|receipt|contract|freeze)/i.test(relative)) classification = 'formal-authority';
      else if (/(?:schema|registry|lock|manifest|package|config|yss-project)/i.test(relative)) classification = 'configuration';
      else if (/(?:evidence\/maintenance|runs?\/|logs?\/)/.test(relative)) classification = 'execution-evidence';
      else if (/(?:snapshot|cache|derived|views?\/)/i.test(relative)) classification = 'derived';
      const row = { path: relative, sha256: info.sha256, bytes: info.bytes, classification, archive_candidate: classification === 'execution-evidence', action: 'inventory-only' };
      rows.push(row); const group = groups.get(info.sha256) ?? []; group.push(relative); groups.set(info.sha256, group);
    }
    return { schema_version: 1, read_only: true, root: this.root, total_files: rows.length, total_bytes: rows.reduce((sum, row) => sum + row.bytes, 0), files: rows, projections: found.projections, duplicates: [...groups].filter(([, files]) => files.length > 1).map(([sha256, files]) => ({ sha256, files })), scan_complete: found.errors.length === 0, errors: found.errors };
  }
  planGc({ now = Date.now() } = {}) {
    const scan = this.#scanReferences();
    const candidates = [], retained = [];
    const pendingObjects = new Map();
    for (const run of this.#rows('runs')) {
      const pendingRow = this.db.prepare("SELECT value_json FROM events WHERE run_id=? AND type='gc-pending' ORDER BY id DESC LIMIT 1").get(run.id);
      const pending = pendingRow ? JSON.parse(pendingRow.value_json) : null;
      const recovering = Boolean(run.logs_expired && pending);
      const decision = this.#eligibility(run, Number(now), scan, { recovering });
      if (!decision.eligible) { retained.push({ id: run.id, ...decision }); continue; }
      const directory = this.#ownedRunDirectory(run);
      if (!fs.existsSync(directory) && !recovering) { retained.push({ id: run.id, eligible: false, reasons: ['missing-output'] }); continue; }
      const found = walk(directory, { strict: true });
      if (found.errors.length) { retained.push({ id: run.id, eligible: false, reasons: ['unknown-output'], errors: found.errors }); continue; }
      const actual = found.files.map(fileInfo);
      const registered = this.db.prepare('SELECT path,sha256,bytes FROM run_files WHERE run_id=? ORDER BY path').all(run.id);
      if ((!recovering && actual.length !== registered.length) || actual.some(info => !registered.some(row => row.path === info.path && row.sha256 === info.sha256 && row.bytes === info.bytes))) {
        retained.push({ id: run.id, eligible: false, reasons: ['unregistered-or-drifted-output'] }); continue;
      }
      if (recovering) for (const object of pending.objects ?? []) pendingObjects.set(object.digest, object);
      candidates.push({ id: run.id, run_dir: directory, files: recovering ? registered.map(row => actual.find(info => info.path === row.path) ?? { ...row, missing: true }) : actual, ...(recovering ? { cleanup_pending: true } : {}) });
    }
    const ids = new Set(candidates.map(row => row.id));
    const objects = this.#rows('objects').filter(object => {
      const refs = this.db.prepare('SELECT run_id FROM run_objects WHERE digest=?').all(object.digest);
      return refs.length > 0 && refs.every(row => ids.has(row.run_id));
    }).map(row => {
      const filename = this.#safeOwned(path.join(this.directory, row.relative_path));
      if (fs.existsSync(filename)) return { digest: row.digest, ...fileInfo(filename) };
      const pending = pendingObjects.get(row.digest);
      if (!row.deleting || !pending) throw new Error('输入对象异常缺失，拒绝清理');
      return { ...pending, path: filename, missing: true };
    });
    return { schema_version: 1, workspace_id: this.workspaceId, planned_at: new Date(Number(now)).toISOString(), state_digest: this.#stateDigest(), reference_scan: { complete: scan.complete, digest: scan.digest, errors: scan.errors }, candidates, objects, retained };
  }
  applyGc(plan) {
    this.#write();
    if (plan?.schema_version !== 1 || plan.workspace_id !== this.workspaceId || !plan.reference_scan?.complete) throw new Error('清理计划非法或引用扫描不完整');
    const current = this.planGc({ now: Date.now() });
    if (current.state_digest !== plan.state_digest || current.reference_scan.digest !== plan.reference_scan.digest || !current.reference_scan.complete) throw new Error('清理计划输入漂移，拒绝执行');
    if (json(current.candidates) !== json(plan.candidates)) throw new Error('清理候选、占用或文件摘要漂移');
    if (json(current.objects) !== json(plan.objects)) throw new Error('共享对象引用或摘要漂移');
    // Mark first: interruption during removal leaves retained summaries and files
    // for explicit recovery, rather than making an absent log appear complete.
    this.#transaction(() => {
      if (this.#stateDigest() !== plan.state_digest) throw new Error('清理计划数据库状态漂移');
      for (const row of plan.candidates) {
        this.db.prepare('UPDATE runs SET logs_expired=1 WHERE id=?').run(row.id);
        this.db.prepare('INSERT INTO events(run_id,recorded_at,type,value_json) VALUES(?,?,?,?)').run(row.id, new Date().toISOString(), 'gc-pending', json({ files: row.files, objects: plan.objects }));
      }
      for (const row of plan.objects) this.db.prepare('UPDATE objects SET deleting=1 WHERE digest=?').run(row.digest);
    });
    const lastScan = this.#scanReferences();
    if (!lastScan.complete || lastScan.digest !== plan.reference_scan.digest) throw new Error('删除前正式引用漂移；清理保持待恢复');
    for (const row of plan.candidates) {
      const occupancy = fileOccupancy(row.run_dir);
      if (!occupancy.complete || occupancy.occupied) throw new Error('删除前日志已被占用或探测不完整；清理保持待恢复');
      const output = walk(row.run_dir, { strict: true });
      const expected = row.files.filter(file => !file.missing);
      if (output.errors.length || output.files.length !== expected.length || output.files.some(filename => !expected.some(file => file.path === filename && file.sha256 === fileInfo(filename).sha256))) throw new Error('删除前文件摘要或输出集合漂移；清理保持待恢复');
    }
    for (const row of plan.objects) if (!row.missing && fileInfo(row.path).sha256 !== row.sha256) throw new Error('删除前输入对象漂移；清理保持待恢复');
    for (const row of plan.candidates) fs.rmSync(this.#safeOwned(row.run_dir), { recursive: true, force: true });
    for (const row of plan.objects) if (!row.missing) fs.unlinkSync(this.#safeOwned(row.path));
    this.#transaction(() => {
      for (const row of plan.candidates) {
        this.db.prepare('DELETE FROM run_files WHERE run_id=?').run(row.id);
        this.db.prepare('DELETE FROM commands WHERE run_id=?').run(row.id);
        this.db.prepare('DELETE FROM events WHERE run_id=?').run(row.id);
        this.db.prepare('DELETE FROM run_objects WHERE run_id=?').run(row.id);
      }
      for (const row of plan.objects) this.db.prepare('DELETE FROM objects WHERE digest=?').run(row.digest);
    });
    return { schema_version: 1, deleted_runs: plan.candidates.map(row => row.id), deleted_objects: plan.objects.map(row => row.digest), summaries_retained: true };
  }
  #externalDestination(destination) {
    if (!path.isAbsolute(destination)) throw new Error('导出目标必须为绝对路径');
    const target = realTarget(destination);
    for (const forbidden of [...this.excluded, this.directory]) if (inside(forbidden, target)) throw new Error('导出或备份必须在仓库和运行存储之外');
    if (fs.existsSync(target)) throw new Error('目标已存在，拒绝覆盖');
    return target;
  }
  exportRun(id, destination) {
    this.#write(); const run = this.#run(id);
    if (!run.ended_at || run.logs_expired) throw new Error('运行未结束或日志已过期，不能导出完整证据');
    const target = this.#externalDestination(destination);
    const rows = this.db.prepare('SELECT * FROM run_files WHERE run_id=? ORDER BY path').all(id);
    const files = [];
    // Protect before copying: a concurrent GC can no longer select this run.
    // A failed export intentionally leaves a protection reason for inspection.
    this.pin(id, `export:${target}`);
    // Validate all original bytes before creating the bundle.
    for (const row of rows) if (fileInfo(row.path).sha256 !== row.sha256) throw new Error(`原始运行证据漂移: ${row.path}`);
    fs.mkdirSync(target, { recursive: true });
    for (const row of rows) {
      const relative = inside(run.run_dir, row.path) ? `run/${slash(path.relative(run.run_dir, row.path))}` : `evidence/${sha(path.dirname(row.path)).slice(0, 16)}/${path.basename(row.path)}`;
      const destinationFile = path.join(target, relative); fs.mkdirSync(path.dirname(destinationFile), { recursive: true }); fs.copyFileSync(row.path, destinationFile);
      files.push({ relative_path: relative, source_path: row.path, sha256: row.sha256, bytes: row.bytes });
    }
    for (const object of this.db.prepare('SELECT o.* FROM objects o JOIN run_objects r ON r.digest=o.digest WHERE r.run_id=? ORDER BY o.digest').all(id)) {
      const data = gunzipSync(fs.readFileSync(this.#safeOwned(path.join(this.directory, object.relative_path))));
      if (sha(data) !== object.digest) throw new Error('输入对象摘要不匹配');
      const relative = `inputs/${object.digest}.bin`; fs.mkdirSync(path.join(target, 'inputs'), { recursive: true }); fs.writeFileSync(path.join(target, relative), data);
      files.push({ relative_path: relative, sha256: object.digest, bytes: data.length });
    }
    const manifest = { schema_version: 1, kind: 'runtime-export', workspace_id: this.workspaceId, run: { ...run }, commands: this.db.prepare('SELECT recorded_at,result_json FROM commands WHERE run_id=? ORDER BY id').all(id).map(row => ({ recorded_at: row.recorded_at, result: JSON.parse(row.result_json) })), events: this.db.prepare('SELECT recorded_at,type,value_json FROM events WHERE run_id=? ORDER BY id').all(id).map(row => ({ recorded_at: row.recorded_at, type: row.type, value: JSON.parse(row.value_json) })), files };
    fs.writeFileSync(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    verifyBundle(target);
    return { schema_version: 1, run_id: id, directory: target, manifest: path.join(target, 'manifest.json'), protected: true };
  }
  backup(destination) {
    if (!this.db) throw new Error('没有运行数据库可备份');
    const target = this.#externalDestination(destination);
    const state = this.#stateDigest();
    if (this.#rows('runs').some(run => activePid(run.owner_pid, run.hostname))) throw new Error('运行仍被进程占用，备份需要静止输出');
    fs.mkdirSync(target, { recursive: true });
    const database = path.join(target, 'runtime.sqlite');
    this.db.exec(`VACUUM INTO '${database.replaceAll("'", "''")}'`);
    const files = [{ relative_path: 'runtime.sqlite', ...fileInfo(database) }];
    const found = walk(this.directory, { strict: true });
    if (found.errors.length) throw new Error(found.errors.join('; '));
    for (const filename of found.files) {
      if (filename === this.databasePath || /runtime\.sqlite-(?:journal|wal|shm)$/.test(filename)) continue;
      const info = fileInfo(filename), relative = slash(path.relative(this.directory, filename)), copy = path.join(target, relative);
      fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.copyFileSync(filename, copy);
      if (fileInfo(copy).sha256 !== info.sha256 || fileInfo(filename).sha256 !== info.sha256) throw new Error('备份期间文件漂移');
      files.push({ relative_path: relative, sha256: info.sha256, bytes: info.bytes });
    }
    if (this.#stateDigest() !== state) throw new Error('备份期间数据库漂移');
    const externalDependencies = this.#rows('run_files').filter(row => !inside(this.directory, row.path)).map(row => ({ ...row, available: fs.existsSync(row.path) && fileInfo(row.path).sha256 === row.sha256 }));
    const manifest = { schema_version: 1, kind: 'runtime-backup', workspace_id: this.workspaceId, root: this.root, runtime_directory: this.directory, external_dependencies: externalDependencies, files };
    fs.writeFileSync(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    verifyBundle(target);
    return { directory: target, manifest: path.join(target, 'manifest.json') };
  }
  static restore({ root, home, protectedRoots, source }) {
    const location = resolveRuntimeLocation({ root, home, protectedRoots });
    const manifest = verifyBundle(source);
    if (manifest.kind !== 'runtime-backup' || manifest.workspace_id !== location.workspaceId || manifest.root !== location.root) throw new Error('备份不属于当前工作区');
    if (typeof manifest.runtime_directory !== 'string' || !path.isAbsolute(manifest.runtime_directory) || !manifest.files.some(row => row.relative_path === 'runtime.sqlite')) throw new Error('备份运行位置或数据库清单缺失');
    if (manifest.files.some(row => !/^(?:runtime\.sqlite|runs\/[^/]+\/.+|objects\/[a-f0-9]{2}\/[a-f0-9]{64}\.gz)$/.test(row.relative_path))) throw new Error('备份包含未知存储文件');
    const { DatabaseSync } = require('node:sqlite');
    const check = new DatabaseSync(path.join(source, 'runtime.sqlite'), { readOnly: true });
    try { if (check.prepare('PRAGMA user_version').get().user_version !== VERSION || check.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('备份数据库非法'); } finally { check.close(); }
    // Existing identical targets are accepted, differing bytes are never replaced.
    for (const row of manifest.files) {
      const target = path.join(location.directory, row.relative_path);
      if (!inside(location.directory, realTarget(target))) throw new Error('恢复真实目标越界');
      if (fs.existsSync(target) && fileInfo(target).sha256 !== row.sha256) throw new Error(`恢复目标已有不同内容: ${row.relative_path}`);
    }
    for (const row of manifest.files) { const target = path.join(location.directory, row.relative_path); fs.mkdirSync(path.dirname(target), { recursive: true }); if (!fs.existsSync(target)) fs.copyFileSync(path.join(source, row.relative_path), target, fs.constants.COPYFILE_EXCL); }
    if (manifest.runtime_directory !== location.directory) {
      const restored = new DatabaseSync(path.join(location.directory, 'runtime.sqlite'));
      try {
        restored.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
        for (const row of restored.prepare('SELECT id,run_dir FROM runs').all()) {
          const current = path.join(location.directory, 'runs', row.id);
          if (row.run_dir === current) continue;
          if (!inside(manifest.runtime_directory, row.run_dir)) throw new Error('备份运行目录越界');
          restored.prepare('UPDATE runs SET run_dir=?,owner_pid=NULL WHERE id=?').run(current, row.id);
          restored.prepare('INSERT INTO events(run_id,recorded_at,type,value_json) VALUES(?,?,?,?)').run(row.id, new Date().toISOString(), 'runtime-restored', json({ old_directory: row.run_dir, new_directory: current }));
        }
        for (const row of restored.prepare('SELECT run_id,path FROM run_files').all()) if (inside(manifest.runtime_directory, row.path)) restored.prepare('UPDATE run_files SET path=? WHERE run_id=? AND path=?').run(path.join(location.directory, path.relative(manifest.runtime_directory, row.path)), row.run_id, row.path);
        for (const row of restored.prepare("SELECT id,value_json FROM events WHERE type='gc-pending'").all()) {
          const pending = JSON.parse(row.value_json);
          for (const entry of [...(pending.files ?? []), ...(pending.objects ?? [])]) if (inside(manifest.runtime_directory, entry.path)) entry.path = path.join(location.directory, path.relative(manifest.runtime_directory, entry.path));
          restored.prepare('UPDATE events SET value_json=? WHERE id=?').run(json(pending), row.id);
        }
        restored.exec('COMMIT');
      } catch (error) { try { restored.exec('ROLLBACK'); } catch {} throw error; }
      finally { restored.close(); }
    }
    const dependencies = (manifest.external_dependencies ?? []).map(row => ({ path: row.path, sha256: row.sha256, available: fs.existsSync(row.path) && fileInfo(row.path).sha256 === row.sha256 }));
    return { schema_version: 1, directory: location.directory, restored_files: manifest.files.length, external_dependencies: dependencies, formal_evidence_complete: dependencies.every(row => row.available) };
  }
  refreshCheckpoint(filename, value) {
    this.#write();
    const info = fileInfo(path.resolve(filename));
    this.db.prepare('INSERT OR REPLACE INTO checkpoint_index VALUES(?,?,?,?)').run(info.path, info.sha256, new Date().toISOString(), json(value));
    return { source_digest: info.sha256, indexed_at: new Date().toISOString(), authority: false };
  }
  readCheckpoint(filename) {
    const resolved = realTarget(path.resolve(filename));
    const row = this.db?.prepare('SELECT * FROM checkpoint_index WHERE path=?').get(resolved);
    if (!row) return { freshness: 'missing', authority: false };
    const fresh = fs.existsSync(resolved) && fileInfo(resolved).sha256 === row.source_digest;
    return { freshness: fresh ? 'current' : 'stale', source_digest: row.source_digest, indexed_at: row.indexed_at, authority: false, ...(fresh ? { value: JSON.parse(row.value_json) } : {}) };
  }
}

export function beginRuntimeRun(options = {}) {
  if (options.mode === 'off') return null;
  if (options.mode && options.mode !== 'sqlite') throw new Error('runtime-store仅接受sqlite或off');
  const store = new RuntimeStore(options);
  try { return store.begin(options); } catch (error) { store.close(); throw error; }
}
