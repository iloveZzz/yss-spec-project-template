import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { RuntimeStore as RuntimeStoreBase, assertNodeVersion, beginRuntimeRun, resolveRuntimeLocation, verifyRuntimeBundle, inspectRuntimeBundle } from '../.template-source/cli-core/runtime-store.mjs';

const moduleFile = new URL('../.template-source/cli-core/runtime-store.mjs', import.meta.url).href;
const DAY = 86_400_000;
const fixtureStores = new Map();
class RuntimeStore extends RuntimeStoreBase {
  constructor(options) { super(options); fixtureStores.get(options.root)?.add(this); }
}
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-runtime-test-'));
  const root = path.join(base, 'project'), home = path.join(base, 'runtime'); fs.mkdirSync(root);
  fixtureStores.set(root, new Set());
  t.after(() => { for (const store of fixtureStores.get(root)) store.close(); fixtureStores.delete(root); fs.rmSync(base, { recursive: true, force: true }); });
  return { root, home, base };
}
function terminal(store, { status = 'passed', exitCode = 0, age = 8, input = 'same-input' } = {}) {
  const session = store.begin({ kind: 'fixture', input });
  fs.writeFileSync(path.join(session.runDir, 'stdout.log'), 'raw stdout\r\n');
  fs.writeFileSync(path.join(session.runDir, 'stderr.log'), '');
  session.recordCommand({ status: exitCode, stdout: 'raw stdout\r\n', stderr: '', stdoutFile: path.join(session.runDir, 'stdout.log'), stderrFile: path.join(session.runDir, 'stderr.log'), duration_ms: 1, termination: status === 'timed-out' ? 'timeout' : null });
  session.recordEvent('command-finished', { exitCode });
  session.finish({ status, exitCode, endedAt: new Date(Date.now() - age * DAY).toISOString(), report: { status, stdoutFile: path.join(session.runDir, 'stdout.log') } });
  return session;
}
function child(source, { env, timeout = 20_000 } = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(globalThis.process.execPath, ['--input-type=module', '-e', source], { env: { ...globalThis.process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; const timer = setTimeout(() => { process.kill('SIGKILL'); reject(new Error('child timeout')); }, timeout);
    process.stdout.on('data', value => stdout += value); process.stderr.on('data', value => stderr += value);
    process.on('error', reject); process.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

test('版本断言、off和只读查询不创建目录或数据库', t => {
  const config = fixture(t);
  for (const version of ['22.12.9', '20.19.0', '27.0.0', 'garbage']) assert.throws(() => assertNodeVersion(version), /Node/);
  for (const version of ['22.13.0', '24.21.0', '26.0.0']) assert.doesNotThrow(() => assertNodeVersion(version));
  assert.equal(beginRuntimeRun({ ...config, mode: 'off' }), null);
  assert.equal(fs.existsSync(config.home), false);
  const store = new RuntimeStore({ ...config, readOnly: true });
  assert.equal(store.inspect().database_exists, false); assert.equal(store.inventory().total_files, 0); assert.equal(store.planGc().candidates.length, 0); store.close();
  assert.equal(fs.existsSync(config.home), false);
});

test('仓外路径检查覆盖项目、注册子仓、外部root、symlink及非本机Windows路径', t => {
  const config = fixture(t);
  assert.throws(() => new RuntimeStore({ ...config, home: path.join(config.root, 'runtime') }), /不得进入/);
  const linked = path.join(config.base, 'link'); fs.symlinkSync(config.root, linked, 'dir');
  assert.throws(() => new RuntimeStore({ ...config, home: path.join(linked, 'runtime') }), /不得进入/);
  const registered = path.join(config.base, 'child'); fs.mkdirSync(registered);
  fs.writeFileSync(path.join(config.root, '.gitmodules'), `[submodule "child"]\npath = ../child\n`);
  assert.throws(() => new RuntimeStore({ ...config, home: path.join(registered, 'runtime') }), /不得进入/);
  assert.throws(() => new RuntimeStore({ ...config, home: path.join(registered, 'runtime'), protectedRoots: [registered] }), /不得进入/);
  const location = resolveRuntimeLocation(config); fs.mkdirSync(config.home); fs.symlinkSync(config.root, path.join(config.home, location.workspaceId), 'dir');
  assert.throws(() => new RuntimeStore(config), /越界/);
  if (process.platform !== 'win32') assert.throws(() => resolveRuntimeLocation({ ...config, home: 'C:\\work\\runtime' }), /绝对路径/);
});

test('SQLite策略、元数据、流式日志和输入原字节去重', t => {
  const config = fixture(t); const store = new RuntimeStore(config); t.after(() => store.close());
  const one = terminal(store), two = terminal(store);
  assert.equal(store.db.prepare('PRAGMA journal_mode').get().journal_mode, 'delete');
  assert.equal(store.db.prepare('PRAGMA synchronous').get().synchronous, 2);
  assert.equal(store.db.prepare('PRAGMA busy_timeout').get().timeout, 5000);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM objects').get().n, 1);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM run_objects').get().n, 2);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM events').get().n, 2);
  assert.equal(JSON.parse(store.db.prepare('SELECT result_json FROM commands LIMIT 1').get().result_json).stdout, undefined);
  assert.equal(fs.readdirSync(one.runDir).filter(value => /\.json$/.test(value)).length, 1);
  assert.notEqual(one.id, two.id);
});

test('日志元数据写入故障回滚命令登记和终态，保留实际日志', t => {
  const config = fixture(t), store = new RuntimeStore(config); t.after(() => store.close());
  const run = store.begin({ input: 'atomic-recording' });
  const stdoutFile = path.join(run.runDir, 'stdout.log'); fs.writeFileSync(stdoutFile, 'already executed once');
  store.db.exec("CREATE TEMP TRIGGER fail_file BEFORE INSERT ON run_files BEGIN SELECT RAISE(ABORT, 'metadata disk failure'); END;");
  assert.throws(() => run.recordCommand({ status: 7, stdoutFile }), /metadata disk failure/);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM commands').get().n, 0);
  assert.throws(() => run.finish({ status: 'failed', exitCode: 7, report: { actual_exit_code: 7 } }), /metadata disk failure/);
  assert.equal(store.db.prepare('SELECT status FROM runs WHERE id=?').get(run.id).status, 'running');
  assert.equal(fs.readFileSync(stdoutFile, 'utf8'), 'already executed once');
  store.db.exec('DROP TRIGGER fail_file');
  run.recordCommand({ status: 7, stdoutFile }); run.finish({ status: 'failed', exitCode: 7 });
  assert.equal(store.db.prepare('SELECT exit_code FROM runs WHERE id=?').get(run.id).exit_code, 7);
});

test('TTL边界、未知分类、pins和正式引用保护', t => {
  const config = fixture(t); const store = new RuntimeStore(config); t.after(() => store.close());
  const successful = terminal(store, { age: 7 }), retained = terminal(store, { age: 6.9 }), failed = terminal(store, { status: 'failed', exitCode: 2, age: 30 }), timeout = terminal(store, { status: 'timed-out', exitCode: 124, age: 29.9 }), cancelled = terminal(store, { status: 'cancelled', exitCode: 1, age: 31 }), unknown = terminal(store, { status: 'mystery', age: 100 });
  const pinned = terminal(store); pinned.pin('formal-approval');
  const referenced = terminal(store); fs.writeFileSync(path.join(config.root, 'checkpoint.json'), JSON.stringify({ log: path.join(referenced.runDir, 'stdout.log') }));
  const plan = store.planGc(), ids = plan.candidates.map(row => row.id);
  for (const run of [successful, failed, cancelled]) assert.ok(ids.includes(run.id));
  for (const run of [retained, timeout, unknown, pinned, referenced]) assert.ok(!ids.includes(run.id));
  assert.ok(plan.retained.find(row => row.id === unknown.id).reasons.includes('unknown-classification'));
});

test('动态或未知引用扫描不完整时停止GC，盘点不改历史字节', t => {
  const config = fixture(t); const store = new RuntimeStore(config); t.after(() => store.close()); terminal(store);
  const filename = path.join(config.root, 'checkpoint.yaml'), content = 'evidence: run:${RUN_DIR}/stdout.log\n'; fs.writeFileSync(filename, content);
  const plan = store.planGc(); assert.equal(plan.reference_scan.complete, false); assert.equal(plan.candidates.length, 0); assert.throws(() => store.applyGc(plan), /不完整/);
  const inventory = store.inventory(); assert.equal(inventory.total_files, 1); assert.equal(inventory.files[0].classification, 'formal-authority'); assert.equal(fs.readFileSync(filename, 'utf8'), content);
});

test('GC保留摘要、共享对象引用、禁止候选篡改及计划漂移', t => {
  const config = fixture(t); const store = new RuntimeStore(config); t.after(() => store.close());
  const expired = terminal(store), live = terminal(store, { age: 1 });
  const plan = store.planGc(); assert.equal(plan.objects.length, 0); store.applyGc(plan);
  assert.equal(fs.existsSync(expired.runDir), false); assert.equal(fs.existsSync(live.runDir), true);
  assert.equal(store.db.prepare('SELECT logs_expired FROM runs WHERE id=?').get(expired.id).logs_expired, 1);
  assert.throws(() => expired.pin('late-pin'), /清理状态/);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM objects').get().n, 1);
  const second = terminal(store, { input: 'separate-input' }); const plan2 = store.planGc();
  assert.throws(() => store.applyGc({ ...plan2, candidates: [] }), /候选/);
  fs.appendFileSync(path.join(second.runDir, 'stdout.log'), 'drift'); assert.throws(() => store.applyGc(plan2), /漂移/);
  store.registerFiles(second.id, second.runDir); const plan3 = store.planGc(); second.pin('changed-after-plan'); assert.throws(() => store.applyGc(plan3), /漂移/);
});

test('最后一个共享引用过期后清除对象，日志缺失不作为完整证据', t => {
  const config = fixture(t); const store = new RuntimeStore(config); t.after(() => store.close()); const first = terminal(store), second = terminal(store);
  const plan = store.planGc(); assert.equal(plan.candidates.length, 2); assert.equal(plan.objects.length, 1); store.applyGc(plan);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM objects').get().n, 0);
  assert.throws(() => store.exportRun(first.id, path.join(config.base, 'export')), /过期/);
  assert.equal(store.inspect().runs.find(row => row.id === second.id).logs_expired, 1);
});

test('导出包保留原报告和日志，无数据库也能核验且自动保护', t => {
  const config = fixture(t); const store = new RuntimeStore(config); const run = terminal(store);
  const reportBytes = fs.readFileSync(path.join(run.runDir, 'report.json'));
  const exported = path.join(config.base, 'bundle'); store.exportRun(run.id, exported);
  assert.deepEqual(fs.readFileSync(path.join(exported, 'run/report.json')), reportBytes);
  assert.ok(store.inspect().runs[0].protection.some(value => value.startsWith('export:')));
  store.close(); fs.rmSync(config.home, { recursive: true });
  const manifest = verifyRuntimeBundle(exported); assert.equal(manifest.run.id, run.id); assert.ok(manifest.files.every(row => !path.isAbsolute(row.relative_path)));
  fs.appendFileSync(path.join(exported, 'run/stdout.log'), 'change'); assert.throws(() => verifyRuntimeBundle(exported), /摘要/);
});

test('备份一致性、恢复新home、无意覆盖拒绝和checkpoint freshness', t => {
  const config = fixture(t); const store = new RuntimeStore(config); const run = terminal(store);
  const checkpoint = path.join(config.root, 'checkpoint.json'); fs.writeFileSync(checkpoint, '{"stage":"plan"}'); store.refreshCheckpoint(checkpoint, { stage: 'plan' });
  assert.equal(store.readCheckpoint(checkpoint).freshness, 'current'); fs.appendFileSync(checkpoint, '\n'); assert.equal(store.readCheckpoint(checkpoint).freshness, 'stale'); assert.equal(store.readCheckpoint(checkpoint).value, undefined);
  const backup = path.join(config.base, 'backup'); store.backup(backup); store.close(); verifyRuntimeBundle(backup);
  const newHome = path.join(config.base, 'new-home'); RuntimeStore.restore({ ...config, home: newHome, source: backup });
  const restored = new RuntimeStore({ ...config, home: newHome }); t.after(() => restored.close());
  assert.ok(restored.inspect().runs[0].run_dir.startsWith(fs.realpathSync(newHome)));
  restored.exportRun(run.id, path.join(config.base, 'restored-export'));
  assert.throws(() => RuntimeStore.restore({ ...config, home: newHome, source: backup }), /不同内容/);
});

test('损坏和未知schema原物保留、数据库symlink与磁盘失败拒绝', t => {
  const config = fixture(t); const location = resolveRuntimeLocation(config); fs.mkdirSync(location.directory, { recursive: true }); const db = path.join(location.directory, 'runtime.sqlite');
  const corrupt = Buffer.from('not-a-database'); fs.writeFileSync(db, corrupt); assert.throws(() => new RuntimeStore(config)); assert.deepEqual(fs.readFileSync(db), corrupt);
  fs.unlinkSync(db); const unknown = new DatabaseSync(db); unknown.exec('PRAGMA user_version=99'); unknown.close(); const unknownBytes = fs.readFileSync(db); assert.throws(() => new RuntimeStore(config), /schema/); assert.deepEqual(fs.readFileSync(db), unknownBytes);
  fs.unlinkSync(db); const target = path.join(config.root, 'target.sqlite'); fs.writeFileSync(target, 'preserve'); fs.symlinkSync(target, db); assert.throws(() => new RuntimeStore(config), /符号链接/); assert.equal(fs.readFileSync(target, 'utf8'), 'preserve'); fs.unlinkSync(db);
  const dangling = path.join(config.root, 'new.sqlite'); fs.symlinkSync(dangling, db); assert.throws(() => new RuntimeStore(config), /符号链接/); assert.equal(fs.existsSync(dangling), false); fs.unlinkSync(db);
  const store = new RuntimeStore(config); t.after(() => store.close());
  const original = fs.writeFileSync;
  try { fs.writeFileSync = (...args) => { if (String(args[0]).endsWith('.gz')) { const error = new Error('disk full'); error.code = 'ENOSPC'; throw error; } return original(...args); }; assert.throws(() => store.begin({ input: 'write-fault' }), /disk full/); }
  finally { fs.writeFileSync = original; }
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM runs').get().n, 0);
});

test('并发初始化与短事务登记不会丢事件', async t => {
  const config = fixture(t);
  const source = `import {RuntimeStore} from ${JSON.stringify(moduleFile)}; const store=new RuntimeStore(${JSON.stringify(config)});const run=store.begin({input:'shared'});run.recordEvent('event',{n:1});run.finish({status:'passed',exitCode:0});store.close();`;
  for (let round = 0; round < 3; round++) {
    const results = await Promise.all(Array.from({ length: 6 }, () => child(source)));
    for (const result of results) assert.equal(result.code, 0, result.stderr);
  }
  const store = new RuntimeStore(config); t.after(() => store.close()); assert.equal(store.db.prepare('SELECT count(*) AS n FROM runs').get().n, 18); assert.equal(store.db.prepare('SELECT count(*) AS n FROM events').get().n, 18); assert.equal(store.db.prepare('SELECT count(*) AS n FROM objects').get().n, 1);
});

test('其它连接或进程不能终止同一运行或覆写其报告', async t => {
  const config = fixture(t), owner = new RuntimeStore(config), run = owner.begin();
  const reportFile = path.join(run.runDir, 'report.json'); fs.writeFileSync(reportFile, 'original report\n');
  const other = new RuntimeStore(config);
  assert.throws(() => other.finish(run.id, { status: 'passed', exitCode: 0, report: { overwritten: true } }), /仅创建运行/);
  const result = await child(`import {RuntimeStore} from ${JSON.stringify(moduleFile)}; const s=new RuntimeStore(${JSON.stringify(config)});try{s.finish(${JSON.stringify(run.id)},{status:'passed',exitCode:0,report:{overwritten:true}});process.exitCode=1}catch(e){if(!e.message.includes('仅创建运行'))throw e}finally{s.close()}`);
  assert.equal(result.code, 0, result.stderr); assert.equal(fs.readFileSync(reportFile, 'utf8'), 'original report\n');
  assert.equal(owner.db.prepare('SELECT status FROM runs WHERE id=?').get(run.id).status, 'running');
  run.finish({ status: 'failed', exitCode: 7, report: { actual_exit_code: 7 } });
  const bytes = fs.readFileSync(reportFile);
  assert.throws(() => other.finish(run.id, { status: 'passed', exitCode: 0, report: { overwritten: true } }), /已经结束/);
  assert.deepEqual(fs.readFileSync(reportFile), bytes); assert.equal(owner.db.prepare('SELECT exit_code FROM runs WHERE id=?').get(run.id).exit_code, 7);
});

test('锁等待超时保留原库、强制中断的运行保持待恢复', async t => {
  const config = fixture(t); const store = new RuntimeStore(config); t.after(() => store.close());
  store.db.exec('BEGIN IMMEDIATE'); const started = Date.now();
  const result = await child(`import {RuntimeStore} from ${JSON.stringify(moduleFile)};try{const s=new RuntimeStore(${JSON.stringify(config)});s.begin();s.close()}catch(e){console.error(e.message);process.exitCode=2}`);
  store.db.exec('ROLLBACK'); assert.equal(result.code, 2); assert.ok(Date.now() - started >= 4_900); assert.equal(store.db.prepare('SELECT count(*) AS n FROM runs').get().n, 0);
  const killed = spawnSync(process.execPath, ['--input-type=module', '-e', `import {RuntimeStore} from ${JSON.stringify(moduleFile)};const s=new RuntimeStore(${JSON.stringify(config)});s.begin();process.kill(process.pid,'SIGKILL');`]);
  assert.notEqual(killed.status, 0); const inspected = store.inspect(); assert.equal(inspected.runs[0].status, 'running'); assert.ok(inspected.runs[0].reasons.includes('unfinished')); assert.equal(store.planGc().candidates.length, 0);
});

test('backup/export/restore拒绝目标symlink越界与活动运行', t => {
  const config = fixture(t); const store = new RuntimeStore(config); t.after(() => store.close()); const run = terminal(store);
  const alias = path.join(config.base, 'alias'); fs.symlinkSync(config.root, alias, 'dir');
  assert.throws(() => store.exportRun(run.id, path.join(alias, 'evidence')), /之外/);
  assert.throws(() => store.backup(path.join(alias, 'backup')), /之外/);
  const active = store.begin(); assert.throws(() => store.backup(path.join(config.base, 'active-backup')), /占用/);
  active.finish({ status: 'cancelled', exitCode: 1 });
});

test('JSON/YAML/Markdown逐仓登记组合local_worktree与project_root', t => {
  const config = fixture(t), external = path.join(config.base, 'external'); fs.mkdirSync(path.join(external, 'service'), { recursive: true });
  fs.mkdirSync(path.join(config.root, 'docs')); fs.mkdirSync(path.join(config.root, '.scratch'));
  fs.writeFileSync(path.join(config.root, 'docs', 'registration.json'), JSON.stringify({ local_worktree: external, project_root: 'service' }));
  assert.throws(() => resolveRuntimeLocation({ ...config, home: path.join(external, 'service/runtime') }), /不得进入/);
  fs.unlinkSync(path.join(config.root, 'docs', 'registration.json'));
  fs.writeFileSync(path.join(config.root, '.scratch', 'registration.md'), `| local_worktree | \`${external}\` |\n| project_root | service |\n`);
  assert.throws(() => resolveRuntimeLocation({ ...config, home: path.join(external, 'runtime') }), /不得进入/);
  const second = path.join(config.base, 'second'); fs.mkdirSync(second);
  fs.writeFileSync(path.join(config.root, 'docs', 'registration.json'), JSON.stringify({ repositories: [{ local_worktree: external, project_root: 'service' }, { local_worktree: second, project_root: '.' }] }));
  assert.throws(() => resolveRuntimeLocation({ ...config, home: path.join(second, 'runtime') }), /不得进入/);
  fs.unlinkSync(path.join(config.root, 'docs', 'registration.json')); fs.appendFileSync(path.join(config.root, '.scratch', 'registration.md'), `\n| local_worktree | \`${second}\` |\n| project_root | . |\n`);
  assert.throws(() => resolveRuntimeLocation({ ...config, home: path.join(second, 'runtime') }), /不得进入/);
});

test('运行目录保护消费配置的功能包根和历史扫描根', t => {
 const config = fixture(t), external = path.join(config.base, 'bound-repository');
 fs.mkdirSync(external);
 fs.mkdirSync(path.join(config.root, '.template-spec/agents'), {recursive:true});
 for (const base of ['.work', 'custom-work']) {
  fs.writeFileSync(path.join(config.root, '.template-spec/agents/issue-tracker.md'), `---\ntracker:\n  platform: local-markdown\n  root: ${base}\n---\n`);
  fs.mkdirSync(path.join(config.root,base,'report'),{recursive:true});
  fs.writeFileSync(path.join(config.root,base,'report/repositories.json'),JSON.stringify({local_worktree:external}));
  assert.throws(()=>resolveRuntimeLocation({...config,home:path.join(external,'runtime')}), /不得进入/);
  fs.unlinkSync(path.join(config.root,base,'report/repositories.json'));
 }
 fs.writeFileSync(path.join(config.root, '.template-spec/agents/issue-tracker.md'), '---\ntracker:\n  platform: local-markdown\n  root: .yss/work\n---\n');
 assert.throws(()=>resolveRuntimeLocation(config), /WORK_LAYOUT_RESERVED/);
});

test('登记路径保留引号和JSON转义，不漏保护仓外项目', t => {
  const config = fixture(t); fs.mkdirSync(path.join(config.root, 'docs'));
  const names = ["registered's folder", '$registered{root}', ...(process.platform === 'win32' ? [] : ['escaped\\path"quote'])];
  for (const name of names) {
    const external = path.join(config.base, name); fs.mkdirSync(external);
    fs.writeFileSync(path.join(config.root, 'docs/registration.json'), JSON.stringify({ local_worktree: external, project_root: '.' }));
    assert.throws(() => resolveRuntimeLocation({ ...config, home: path.join(external, 'runtime') }), /不得进入/);
    fs.unlinkSync(path.join(config.root, 'docs/registration.json'));
    fs.writeFileSync(path.join(config.root, 'docs/registration.yaml'), `local_worktree: ${JSON.stringify(external)}\nproject_root: .\n`);
    assert.throws(() => resolveRuntimeLocation({ ...config, home: path.join(external, 'runtime') }), /不得进入/);
    fs.unlinkSync(path.join(config.root, 'docs/registration.yaml'));
  }
});

test('内部投影去重读取，脚本具体和动态引用也保护运行', t => {
  const config = fixture(t); const store = new RuntimeStore(config), run = terminal(store);
  fs.mkdirSync(path.join(config.root, 'canonical')); fs.mkdirSync(path.join(config.root, 'projection'));
  fs.writeFileSync(path.join(config.root, 'canonical', 'config.json'), '{}');
  fs.symlinkSync(path.join(config.root, 'canonical'), path.join(config.root, 'projection', 'skill'), 'dir');
  assert.equal(store.inventory().total_files, 1); assert.equal(store.inventory().scan_complete, true); assert.equal(store.inventory().projections.length, 1);
  fs.writeFileSync(path.join(config.root, 'consumer.mjs'), `const evidence = ${JSON.stringify(path.join(run.runDir, 'stdout.log'))};`);
  assert.ok(store.planGc().retained[0].reasons.includes('formally-referenced'));
  fs.writeFileSync(path.join(config.root, 'consumer.mjs'), 'const evidence = "run:${RUN_DIR}/stdout.log";');
  assert.equal(store.planGc().reference_scan.complete, false);
});

test('终态日志仍被另一个进程打开时不会清理', async t => {
  const config = fixture(t); const store = new RuntimeStore(config), run = terminal(store);
  const held = spawn(process.execPath, ['--input-type=module', '-e', `import fs from 'node:fs'; fs.openSync(${JSON.stringify(path.join(run.runDir, 'stdout.log'))},'r'); process.stdout.write('ready');setInterval(()=>{},1000);`], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => held.kill('SIGKILL'));
  await new Promise((resolve, reject) => { held.stdout.once('data', resolve); held.once('error', reject); });
  const plan = store.planGc(); assert.equal(plan.candidates.length, 0); assert.ok(plan.retained[0].reasons.some(value => ['file-occupied', 'occupancy-scan-incomplete'].includes(value)));
  held.kill('SIGKILL'); await new Promise(resolve => held.once('close', resolve));
});

test('GC文件删除失败后仅通过新显式计划恢复，并复核正式引用', t => {
  const config = fixture(t); const store = new RuntimeStore(config), run = terminal(store), plan = store.planGc();
  const original = fs.rmSync;
  try { fs.rmSync = (filename, ...args) => { if (filename === run.runDir) throw new Error('deletion-fault'); return original(filename, ...args); }; assert.throws(() => store.applyGc(plan), /deletion-fault/); }
  finally { fs.rmSync = original; }
  assert.throws(() => store.begin({ input: 'same-input' }), /正在清理/);
  const recovering = store.planGc(); assert.equal(recovering.candidates[0].cleanup_pending, true);
  fs.writeFileSync(path.join(config.root, 'new-reference.md'), run.runDir); assert.throws(() => store.applyGc(recovering), /漂移/);
  assert.equal(store.planGc().candidates.length, 0); fs.unlinkSync(path.join(config.root, 'new-reference.md'));
  store.applyGc(store.planGc()); assert.equal(fs.existsSync(run.runDir), false); assert.equal(store.db.prepare('SELECT count(*) AS n FROM objects').get().n, 0);
  assert.doesNotThrow(() => store.begin({ input: 'same-input' }));
});

test('GC对象删除失败、部分文件已删后新计划可恢复', t => {
  const config = fixture(t); const store = new RuntimeStore(config), run = terminal(store), plan = store.planGc();
  const original = fs.unlinkSync;
  try { fs.unlinkSync = filename => { if (String(filename).endsWith('.gz')) throw new Error('object-fault'); return original(filename); }; assert.throws(() => store.applyGc(plan), /object-fault/); }
  finally { fs.unlinkSync = original; }
  assert.equal(fs.existsSync(run.runDir), false); const recovering = store.planGc(); assert.equal(recovering.candidates[0].cleanup_pending, true); assert.ok(recovering.candidates[0].files.every(row => row.missing)); store.applyGc(recovering);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM objects').get().n, 0);
});

test('独立阅读拒绝越界、未知清单和symlink，不改旧报告', t => {
  const config = fixture(t); const store = new RuntimeStore(config), run = terminal(store), output = path.join(config.base, 'export'); store.exportRun(run.id, output);
  const report = fs.readFileSync(path.join(output, 'run/report.json')), view = inspectRuntimeBundle(output); assert.equal(view.independent, true); assert.equal(view.reports.length, 1); assert.ok(view.path_map[path.join(run.runDir, 'stdout.log')]); assert.deepEqual(fs.readFileSync(view.reports[0].resolved_path), report);
  const manifestPath = path.join(output, 'manifest.json'), manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, kind: 'unknown' })); assert.throws(() => inspectRuntimeBundle(output), /不支持/);
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, files: [{ ...manifest.files[0], relative_path: '../outside' }] })); assert.throws(() => inspectRuntimeBundle(output), /越界/);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest)); const original = path.join(output, 'run/stdout.log'), target = path.join(config.base, 'outside-log'); fs.copyFileSync(original, target); fs.unlinkSync(original); fs.symlinkSync(target, original); assert.throws(() => inspectRuntimeBundle(output), /越界|符号链接/);
});

test('中断恢复重试依据DB实际目录重绑定，外部证据依赖明确报告', t => {
  const config = fixture(t), reportDir = path.join(config.base, 'formal'); fs.mkdirSync(reportDir); fs.writeFileSync(path.join(reportDir, 'formal.json'), '{"formal":true}');
  const store = new RuntimeStore(config), run = store.begin({ reportDir }); run.finish({ status: 'passed', exitCode: 0, report: { status: 'passed' } });
  const backup = path.join(config.base, 'backup'); store.backup(backup); const newHome = path.join(config.base, 'new-home'), location = resolveRuntimeLocation({ ...config, home: newHome }); fs.mkdirSync(location.directory, { recursive: true }); fs.copyFileSync(path.join(backup, 'runtime.sqlite'), path.join(location.directory, 'runtime.sqlite'));
  fs.unlinkSync(path.join(reportDir, 'formal.json')); const result = RuntimeStore.restore({ ...config, home: newHome, source: backup }); assert.equal(result.formal_evidence_complete, false); assert.equal(result.external_dependencies[0].available, false);
  const restored = new RuntimeStore({ ...config, home: newHome }); assert.equal(restored.inspect().runs[0].run_dir, path.join(location.directory, 'runs', run.id));
});

test('GC等待数据库锁期间新增正式引用，取得锁后再次核验并拒删', async t => {
  const config = fixture(t); const store = new RuntimeStore(config), run = terminal(store), plan = store.planGc();
  store.db.exec('BEGIN IMMEDIATE');
  const worker = spawn(process.execPath, ['--input-type=module', '-e', `import {RuntimeStore} from ${JSON.stringify(moduleFile)}; const s=new RuntimeStore(${JSON.stringify(config)});process.stdout.write('ready');try{s.applyGc(${JSON.stringify(plan)})}catch(e){console.error(e.message);process.exitCode=2}finally{s.close()}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = ''; worker.stderr.on('data', value => stderr += value);
  await new Promise((resolve, reject) => { worker.stdout.once('data', resolve); worker.once('error', reject); });
  await new Promise(resolve => setTimeout(resolve, 350)); fs.writeFileSync(path.join(config.root, 'approval.json'), JSON.stringify({ evidence: run.runDir })); store.db.exec('ROLLBACK');
  const code = await new Promise(resolve => worker.once('close', resolve)); assert.equal(code, 2, stderr); assert.match(stderr, /引用漂移|输入漂移/); assert.equal(fs.existsSync(run.runDir), true); assert.ok(store.inspect().runs[0].cleanup_pending);
});
