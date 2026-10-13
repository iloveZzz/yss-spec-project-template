import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, writeFileSync, rmSync, realpathSync, lstatSync, fstatSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertNodeVersion, beginRuntimeRun } from '../../cli-core/runtime-store.mjs';
import { verificationInputDigest } from '../../../scripts/lib/verification-report.mjs';
import {compileExpectedVerificationPlan,validateVerificationReport,validateReleaseIntegration,assertEvidenceFile} from './verification-report-validator.mjs';
import {collectReleaseSources,createArtifactCoordinator,produceCliArtifact,verifyInstalledCliMigration,validateArtifact} from './verification-artifacts.mjs';
import {validateReceipt} from './verification-delivery-run.mjs';
import {initializeNative, runNative, applyNative} from './native-yss.mjs';
import {requiredLegacyRecoveryMatrix} from './legacy-recovery-matrix.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || `git ${args.join(' ')} 失败`);
  return result.stdout.trim();
}

// yss-cli 不是 submodule：CLI 来源由 .template-source/distribution/yss-cli-pin.json 固定，并从显式提交的源码目录核验。

export function assertReleaseCheckout(root, commit) {
  assert.match(commit, /^[a-f0-9]{40}$/, '必须指定完整 40 位 commit SHA');
  assert.equal(git(root, ['rev-parse', 'HEAD']), commit, '检出版本与待发布版本不一致');
  assert.equal(git(root, ['status', '--porcelain', '--untracked-files=normal']), '', '发布验证要求干净工作树');
  // Profile 已并入本仓 profiles/，没有任何子模块来源需要核验。
  return { template_commit: commit };
}

export function verifyTemplateRelease({ root, commit, output, runtimeStore = 'off',cliFamily='all-four',base,baselineReport,baselineReportDigest,qualificationReport,qualificationReportDigest,concurrency=1,toolingMode='legacy',expectedPlan,artifactCoordinator }) {
  assertNodeVersion();
  assert.ok(qualificationReport===undefined&&qualificationReportDigest===undefined,'QUALIFICATION_RETIRED');
  assert.ok(['sqlite','off'].includes(runtimeStore), 'runtime-store 必须为 sqlite 或 off');
  assert.ok(['spec','all-four'].includes(cliFamily),'cli-family 必须为 spec 或 all-four');
  assert.ok(Number.isInteger(concurrency)&&concurrency>=1&&concurrency<=4,'concurrency 必须为 1..4');
  assert.ok(['legacy','optimized'].includes(toolingMode),'tooling-mode 必须为 legacy 或 optimized');
  if(base)assert.match(base,/^[a-f0-9]{40}$/,'base 必须为完整 SHA');
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
  const families=cliFamily==='all-four'?['spec','design','backend']:['spec'];
  const report = { schema_version: 2,kind:'template-release-verification',purpose:'verification', requested_commit: commit,cli_families:families, status: 'failed',
    verification_scope:'local-template-and-cli',release_readiness:'not-evaluated',
    started_at: new Date().toISOString(), commands: [], publication: 'not-performed' };
  let scratch;
  const run = (command, args, cwd = root, env = process.env) => {
    const log = `${String(report.commands.length + 1).padStart(2, '0')}.log`;
    const fd = openSync(path.join(output, log), 'w');
    const started = Date.now();
    let result;
    try {
      process.stdout.write(`[发布验证] ${command} ${args.join(' ')}\n`);
      result = spawnSync(command, args, { cwd, env, encoding:'utf8',maxBuffer:128*1024*1024,stdio: ['ignore', 'pipe', 'pipe'] });
      writeFileSync(fd,(result.stdout||'')+(result.stderr||''));
    } finally { closeSync(fd); }
    report.commands.push({ command, args, cwd, exit_code: result.status ?? 1,actual_exit_code:result.status,actual_exit_signal:result.signal??null,actual_exit_code_observed:Number.isInteger(result.status), duration_ms: Date.now() - started, log,log_sha256:hash(readFileSync(path.join(output,log))) });
    runtimeSession?.recordCommand({...report.commands.at(-1),stdoutFile:path.join(output,log)});
    assert.equal(result.status, 0, result.error?.message || `${command} 失败，详见 ${path.join(output, log)}`);
    return result;
  };
  try {
    Object.assign(report, assertReleaseCheckout(root, commit));
    if(cliFamily==='all-four')report.legacy_recovery=requiredLegacyRecoveryMatrix();
    run('scripts/repository-mode', []);
    assert.equal(readFileSync(path.join(output, '01.log'), 'utf8').trim(), 'template-source', '只允许模板源发布验证');
    const fullDirectory = path.join(output, 'full-verification');
    const fullArgs=['--concurrency',String(concurrency),'--runtime-store',runtimeStore,'--report-dir',fullDirectory,...(toolingMode==='legacy'?[]:['--tooling-mode',toolingMode]),
      ...(base?['--base',base]:[]),...(baselineReport?['--baseline-report',baselineReport]:[]),...(baselineReportDigest?['--baseline-report-sha256',baselineReportDigest]:[])];
    const independentPlan=expectedPlan||compileExpectedVerificationPlan({root,args:fullArgs});
    const fullExit=run('scripts/verify-template',fullArgs);
    const fullFile=assertEvidenceFile(path.join(fullDirectory,'report.json'),output);
    const full=JSON.parse(readFileSync(fullFile,'utf8'));
    const allSources=collectReleaseSources({root,commit});
    validateVerificationReport(full,{root,expectedPlan:independentPlan,reportDirectory:fullDirectory,expectedInvocation:{command:path.join(root,'scripts/run-template-verification'),args:['--profile','release',...fullArgs]},observedExitCode:fullExit.status,expectedSourcesManifest:allSources});
    report.execution={requested_concurrency:concurrency,requested_tooling_mode:toolingMode,actual_concurrency:full.environment.concurrency,actual_tooling_mode:full.environment.tooling_mode||'legacy',strategy:full.plan.strategy};
    report.full_verification={report:fullFile,report_sha256:hash(readFileSync(fullFile)),input_sha256:full.input_sha256,status:full.status};
    report.sources_manifest=collectReleaseSources({root,commit,families});
    writeFileSync(path.join(output,'sources.json'),JSON.stringify(report.sources_manifest,null,2)+'\n');
    report.sources_manifest_sha256=hash(readFileSync(path.join(output,'sources.json')));
    let prepared;
    if(full.artifact_receipt){const file=assertEvidenceFile(full.artifact_receipt.ref,fullDirectory,full.artifact_receipt.sha256);prepared=validateReceipt(JSON.parse(readFileSync(file)),{root,receiptFile:file,expectedSourcesManifest:allSources,requireLiveConsumers:false});}
    const coordinator=artifactCoordinator||createArtifactCoordinator({produce:source=>produceCliArtifact({root,source,directory:path.join(output,'artifacts',source.family),run})});
    report.artifacts=report.sources_manifest.entries.map(source=>validateArtifact(prepared?prepared.artifacts.find(row=>row.source_tuple.family===source.family):coordinator.acquire(source),source));
    const spec=report.artifacts.find(artifact=>artifact.source_tuple.family==='spec');
    report.generated_snapshot=spec.snapshot;
    scratch=mkdtempSync(path.join(os.tmpdir(),'yss-template-release-'));
    const nativeOptions={run,environment:{...process.env,YSS_NATIVE_BINARY:spec.binary,YSS_NATIVE_BINARY_SHA256:spec.source_tuple.binary_sha256},cwd:spec.installed_root};
    const instance = path.join(scratch, 'instance');
    initializeNative('spec',instance,nativeOptions);
    assert.match(readFileSync(path.join(instance, 'yss-project.yaml'), 'utf8'), /repository_mode: project-instance/);
    for (const forbidden of ['.github', '.template-source', 'submodules']) assert.equal(existsSync(path.join(instance, forbidden)), false, `实例不得包含 ${forbidden}`);
    const metadata = JSON.parse(readFileSync(path.join(instance, '.yss.json'), 'utf8'));
    assert.equal(metadata.templateCommit, commit, '实例没有绑定待发布模板');
    run(process.execPath, [path.join(instance, 'scripts/sync-skills'), '--check'], instance);
    run(process.execPath, [path.join(instance, 'scripts/update-skill-lock'), '--check'], instance);
    mkdirSync(path.join(instance, '.github/workflows'), { recursive: true });
    const userWorkflow = path.join(instance, '.github/workflows/user.yml');
    const userBytes = 'name: User owned workflow\non: workflow_dispatch\njobs: {}\n';
    writeFileSync(userWorkflow, userBytes);
    runNative(['sync','--root',instance],nativeOptions);
    assert.equal(readFileSync(userWorkflow, 'utf8'), userBytes);
    applyNative('sync','spec',instance,path.join(scratch,'sync-plan.json'),[],nativeOptions);
    assert.equal(readFileSync(userWorkflow, 'utf8'), userBytes, '同步不得接管用户 .github');
    if(cliFamily==='all-four')report.cli_integrations=report.artifacts.map(artifact=>prepared?JSON.parse(readFileSync(assertEvidenceFile(path.join(fullDirectory,'migration-results',`${artifact.source_tuple.family}.json`),fullDirectory))):verifyInstalledCliMigration({artifact,directory:path.join(output,'integration',artifact.source_tuple.family),run}));
    for(const artifact of report.artifacts)validateArtifact(artifact,artifact.source_tuple);
    assert.equal(verificationInputDigest(root),full.input_sha256,'发布集成结束后输入已漂移');
    assertReleaseCheckout(root, commit);
    if(cliFamily==='all-four')assert.deepEqual(requiredLegacyRecoveryMatrix(),report.legacy_recovery,'历史恢复证据在发行验证期间漂移');
    report.status = 'passed';
    if(cliFamily==='all-four'){
      const integrationFile=path.join(output,'release-verification.json');writeFileSync(integrationFile,JSON.stringify(report,null,2)+'\n');
      const integration=validateReleaseIntegration({root,reportFile:integrationFile,expectedDigest:hash(readFileSync(integrationFile)),expectedCommit:commit});
      assert.ok(integration.valid,integration.reasons.join('; '));
    }
  } catch (error) {
    report.status = 'failed';
    report.error = error.message;
    throw error;
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    report.finished_at = new Date().toISOString();
    writeFileSync(path.join(output, 'release-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
    if(runtimeSession)try {
      runtimeSession.pin('release-verification-evidence');
      // npm's .bin links are consumer implementation details. Pin the ordinary
      // evidence and exact tarball rather than registering a mutable install.
      for(const file of [path.join(output,'release-verification.json'),path.join(output,'sources.json'),path.join(output,'full-verification'),...report.commands.map(row=>path.join(output,row.log)),...(report.artifacts||[]).map(row=>row.tarball)])if(existsSync(file))runtimeSession.registerFiles(file);
      runtimeSession.finish({status:report.status,exitCode:report.status==='passed'?0:1,report:path.join(output,'release-verification.json')});
    } catch(error) {
      report.status='failed';report.error=[report.error,`运行存储异常: ${error.message}`].filter(Boolean).join('; ');
      writeFileSync(path.join(output,'release-verification.json'),`${JSON.stringify(report,null,2)}\n`);
      throw error;
    } finally { runtimeSession.close(); }
  }
  return report;
}
