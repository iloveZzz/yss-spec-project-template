import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, writeFileSync, rmSync, realpathSync, lstatSync, fstatSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertNodeVersion, beginRuntimeRun } from '../../cli-core/runtime-store.mjs';
import { verificationInputDigest } from '../../../scripts/lib/verification-report.mjs';

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || `git ${args.join(' ')} 失败`);
  return result.stdout.trim();
}

const OPTIONAL_UNINITIALIZED_SUBMODULES = new Set([
  'submodules/yss-harness-dev-agent',
]);

export function assertReleaseCheckout(root, commit) {
  assert.match(commit, /^[a-f0-9]{40}$/, '必须指定完整 40 位 commit SHA');
  assert.equal(git(root, ['rev-parse', 'HEAD']), commit, '检出版本与待发布版本不一致');
  assert.equal(git(root, ['status', '--porcelain', '--untracked-files=normal', '--ignore-submodules=none']), '', '发布验证要求干净工作树及子模块');
  const submodules = git(root, ['submodule', 'status', '--recursive']);
  // 兼容期私有模板不参与主模板验证；GitHub 默认 token 无跨仓私有读取权限。
  const invalidSubmodules = submodules.split('\n').filter(line => {
    if (/^[+U]/.test(line)) return true;
    if (!line.startsWith('-')) return false;
    const match = /^-[a-f0-9]{40}\s+(\S+)/.exec(line);
    return !match || !OPTIONAL_UNINITIALIZED_SUBMODULES.has(match[1]);
  });
  assert.deepEqual(invalidSubmodules, [], '必需子模块必须检出 gitlink 指定版本');
  const entry = git(root, ['ls-tree', 'HEAD', '--', 'submodules/create-yss-spec']);
  const match = /^160000 commit ([a-f0-9]{40})\tsubmodules\/create-yss-spec$/.exec(entry);
  assert.ok(match, '缺少固定的 create-yss-spec gitlink');
  assert.equal(git(path.join(root, 'submodules/create-yss-spec'), ['rev-parse', 'HEAD']), match[1], '生成器版本与 gitlink 不一致');
  return { template_commit: commit, generator_commit: match[1], submodules };
}

export function verifyTemplateRelease({ root, commit, output, runtimeStore = 'off' }) {
  assertNodeVersion();
  assert.ok(['sqlite','off'].includes(runtimeStore), 'runtime-store 必须为 sqlite 或 off');
  root = realpathSync(root);
  assert.ok(path.isAbsolute(output), 'output 必须是仓库外的绝对路径');
  const requestedRelative = path.relative(root, path.resolve(output));
  assert.ok(requestedRelative.startsWith(`..${path.sep}`) || path.isAbsolute(requestedRelative), '证据目录必须在仓库外');
  assert.equal(existsSync(output), false, '证据目录已存在，拒绝复用或覆盖历史报告');
  const runtimeSession=beginRuntimeRun({root,kind:'template-release-verification',mode:runtimeStore,input:{commit},reportDir:output});
  mkdirSync(output, { recursive: true });
  output = realpathSync(output);
  const relative = path.relative(root, output);
  assert.ok(relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative), '证据目录必须在仓库外');
  const report = { schema_version: 1, requested_commit: commit, status: 'failed', started_at: new Date().toISOString(), commands: [], publication: 'not-performed' };
  let scratch;
  const run = (command, args, cwd = root, env = process.env) => {
    const log = `${String(report.commands.length + 1).padStart(2, '0')}.log`;
    const fd = openSync(path.join(output, log), 'w');
    const started = Date.now();
    let result;
    try {
      process.stdout.write(`[发布验证] ${command} ${args.join(' ')}\n`);
      result = spawnSync(command, args, { cwd, env, stdio: ['ignore', fd, fd] });
    } finally { closeSync(fd); }
    report.commands.push({ command, args, cwd, exit_code: result.status ?? 1, duration_ms: Date.now() - started, log });
    runtimeSession?.recordCommand({...report.commands.at(-1),stdoutFile:path.join(output,log)});
    assert.equal(result.status, 0, result.error?.message || `${command} 失败，详见 ${path.join(output, log)}`);
  };
  try {
    Object.assign(report, assertReleaseCheckout(root, commit));
    run('scripts/repository-mode', []);
    assert.equal(readFileSync(path.join(output, '01.log'), 'utf8').trim(), 'template-source', '只允许模板源发布验证');
    const fullDirectory = path.join(output, 'full-verification');
    run('scripts/verify-template', ['--concurrency', '1', '--runtime-store', runtimeStore, '--report-dir', fullDirectory]);
    const fullFile = path.join(fullDirectory, 'report.json');
    assert.equal(realpathSync(fullFile), fullFile, '内部全量验证报告不能使用符号链接');
    const full = JSON.parse(readFileSync(fullFile, 'utf8'));
    assert.equal(full.schema_version, 1, '内部全量验证报告版本不支持');
    assert.equal(full.kind, 'template-verification-report', '内部全量验证报告类型不正确');
    assert.equal(full.status, 'passed', '内部全量验证报告未通过');
    assert.equal(full.root, root, '内部全量验证报告属于其它源码');
    assert.equal(full.scope?.kind, 'complete-candidate', '内部全量验证范围不完整');
    assert.equal(full.plan?.effective_profile, 'release', '内部全量验证必须使用 release profile');
    assert.notEqual(full.plan?.selection?.effective, 'allowlist', '内部全量验证不得裁剪');
    assert.deepEqual(full.plan?.selection?.omitted, [], '内部全量验证存在遗漏');
    assert.equal(full.input_drift, false, '内部全量验证输入漂移或未核验');
    assert.match(full.input_sha256, /^[a-f0-9]{64}$/, '内部全量验证输入摘要缺失');
    assert.equal(full.input_after_sha256, full.input_sha256, '内部全量验证输入摘要不一致');
    assert.equal(full.input_sha256, verificationInputDigest(root), '内部全量验证源码已漂移');
    assert.ok(Number.isFinite(Date.parse(full.started_at)) && Number.isFinite(Date.parse(full.finished_at)), '内部全量验证尚未完成');
    assert.ok(Array.isArray(full.unexecuted) && full.unexecuted.every(row => row.reason === 'repository-mode'), '内部全量验证存在未执行命令');
    assert.ok(Array.isArray(full.plan.commands) && full.plan.commands.length > 0 && Array.isArray(full.results), '内部全量验证命令结果缺失');
    for (const [index, command] of full.plan.commands.entries()) {
      if (command.when && command.when !== 'template-source') continue;
      const row = full.results.find(result => result.index === index);
      assert.ok(row && row.command === command.command && row.code === 0 && !row.skipped && !row.storageError, '内部全量验证命令未通过或不完整');
      for (const file of [row.stdoutFile, row.stderrFile]) {
        assert.equal(typeof file, 'string', '内部全量验证日志引用缺失');
        const actualFile = realpathSync(file);
        assert.equal(actualFile, path.resolve(file), '内部全量验证日志不能使用符号链接');
        const logRelative = path.relative(fullDirectory, actualFile);
        assert.ok(logRelative && !logRelative.startsWith('..') && !path.isAbsolute(logRelative), '内部全量验证日志越界');
        assert.ok(lstatSync(file).isFile(), '内部全量验证日志必须是普通文件');
        const logFd = openSync(file, 'r');
        try { assert.ok(fstatSync(logFd).isFile(), '内部全量验证日志必须是普通文件'); }
        finally { closeSync(logFd); }
      }
    }
    report.full_verification = { report: path.join(fullDirectory, 'report.json'), input_sha256: full.input_sha256, status: full.status };
    scratch = mkdtempSync(path.join(os.tmpdir(), 'yss-template-release-'));
    const cli = path.join(scratch, 'cli');
    run('git', ['clone', '--shared', '--no-checkout', path.join(root, 'submodules/create-yss-spec'), cli]);
    run('git', ['checkout', '--detach', report.generator_commit], cli);
    // 在隔离副本重建包；不改受版本管理的生成器或它原有的模板快照。
    run(process.execPath, ['scripts/sync-template.js'], cli, {
      ...process.env,
      YSS_SPEC_TEMPLATE_REPO: pathToFileURL(root).href,
      YSS_SPEC_TEMPLATE_REF: commit,
    });
    const snapshot = JSON.parse(readFileSync(path.join(cli, 'template.snapshot.json'), 'utf8'));
    assert.equal(snapshot.templateCommit, commit, '生成器使用了过期模板');
    assert.equal(snapshot.requestedRef, commit, '生成器必须记录固定版本');
    report.generated_snapshot = snapshot;
    // npm 只用于包消费者验收；维护测试仍统一由 pnpm 驱动。
    run('npm', ['pack', '--ignore-scripts', '--json'], cli);
    const packReport = JSON.parse(readFileSync(path.join(output, report.commands.at(-1).log), 'utf8'));
    assert.ok(packReport && typeof packReport === 'object', 'npm pack 必须返回 JSON 记录');
    const packed = Array.isArray(packReport) ? packReport : Object.values(packReport);
    assert.equal(packed.length, 1);
    assert.equal(typeof packed[0]?.filename, 'string', 'npm pack 缺少包文件名');
    assert.equal(path.basename(packed[0].filename), packed[0].filename, 'npm pack 文件名不得越界');
    const consumer = path.join(scratch, 'consumer');
    run('npm', ['install', '--prefix', consumer, '--ignore-scripts', '--no-audit', '--no-fund', path.join(cli, packed[0].filename)]);
    const entry = path.join(consumer, 'node_modules/create-yss-spec/bin/create-yss-spec.js');
    const instance = path.join(scratch, 'instance');
    run(process.execPath, [entry, '--target-dir', instance, '--project-name', 'CI release verification', '--business-domain', '模板发布验收', '--team-size', '3', '--agent-runtime', 'codex']);
    assert.match(readFileSync(path.join(instance, 'yss-project.yaml'), 'utf8'), /repository_mode: project-instance/);
    for (const forbidden of ['.github', '.template-source', 'submodules']) assert.equal(existsSync(path.join(instance, forbidden)), false, `实例不得包含 ${forbidden}`);
    const metadata = JSON.parse(readFileSync(path.join(instance, '.yss-template.json'), 'utf8'));
    assert.equal(metadata.templateCommit, commit, '实例没有绑定待发布模板');
    run(process.execPath, [path.join(instance, 'scripts/sync-skills'), '--check'], instance);
    run(process.execPath, [path.join(instance, 'scripts/update-skill-lock'), '--check'], instance);
    mkdirSync(path.join(instance, '.github/workflows'), { recursive: true });
    const userWorkflow = path.join(instance, '.github/workflows/user.yml');
    const userBytes = 'name: User owned workflow\non: workflow_dispatch\njobs: {}\n';
    writeFileSync(userWorkflow, userBytes);
    run(process.execPath, [entry, 'sync', '--target-dir', instance, '--dry-run']);
    assert.equal(readFileSync(userWorkflow, 'utf8'), userBytes);
    run(process.execPath, [entry, 'sync', '--target-dir', instance]);
    assert.equal(readFileSync(userWorkflow, 'utf8'), userBytes, '同步不得接管用户 .github');
    assertReleaseCheckout(root, commit);
    report.status = 'passed';
  } catch (error) {
    report.error = error.message;
    throw error;
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    report.finished_at = new Date().toISOString();
    writeFileSync(path.join(output, 'release-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
    if(runtimeSession)try {
      runtimeSession.pin('release-verification-evidence');
      runtimeSession.registerFiles(output);
      runtimeSession.finish({status:report.status,exitCode:report.status==='passed'?0:1,report:path.join(output,'release-verification.json')});
    } catch(error) {
      report.status='failed';report.error=[report.error,`运行存储异常: ${error.message}`].filter(Boolean).join('; ');
      writeFileSync(path.join(output,'release-verification.json'),`${JSON.stringify(report,null,2)}\n`);
      throw error;
    } finally { runtimeSession.close(); }
  }
  return report;
}
