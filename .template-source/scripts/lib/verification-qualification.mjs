import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import * as reportValidators from './verification-report-validator.mjs';
import {loadLegacyManifest,verificationPatternMatches} from './verification-gates.mjs';
import {compileQualificationPlans} from './verification-qualification-plan.mjs';
import {addVerificationExecutionTasks} from './verification-execution-plan.mjs';
import {collectReleaseSources} from './verification-artifacts.mjs';
import {validateBaseline} from './verification-baseline.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
export const QUALIFICATION_ROUTE_CASES=['L1-document','L2-skill-schema','L3-approval-release','all-four-cli','unknown-path','mixed-change'];
export const QUALIFICATION_ROUTE_REGISTRY=Object.freeze([
  {category:'L1-document',changed_files:['README.md']},
  {category:'L2-skill-schema',changed_files:['.agents/skills/yss-research/SKILL.md']},
  {category:'L3-approval-release',changed_files:['.template-spec/agents/digital-human-roles.yaml']},
  {category:'all-four-cli',changed_files:['submodules/create-yss-spec']},
  {category:'unknown-path',changed_files:['__verification_unregistered__/unknown.mjs'],expected_error:'UNKNOWN_VERIFICATION_PATH'},
  {category:'mixed-change',changed_files:['README.md','scripts/lib/json-schema.mjs']},
]);
export const QUALIFICATION_REJECTION_CASES=['environment-missing','fixed-source-mismatch','cli-snapshot-mismatch','user-file-overwrite','approval-stale','selector-omission'];
// The consumer owns category-to-public-seam mappings. Caller labels never establish coverage.
export const QUALIFICATION_COUNTEREXAMPLE_REGISTRY=Object.freeze([
  {file:'tests/verification-execution.test.mjs',name:'前置失败跳过依赖，继续同组及跨组独立检查并保留真实退出',categories:['dependency-failure'],seam:'runGroups'},
  {file:'tests/verification-execution.test.mjs',name:'真实进程超时返回124并保留最终观测，后续独立检查完成',categories:['timeout'],seam:'runCommandToFiles'},
  {file:'tests/verification-execution.test.mjs',name:'进程组清理错误不能被真实退出0覆盖',categories:['termination-failure'],seam:'runCommandToFiles'},
  {file:'tests/verification-execution.test.mjs',name:'监督中断拒绝成功并保留实际 close 与日志',categories:['interrupt'],seam:'executeVerificationPlan'},
  {file:'tests/verification-execution.test.mjs',name:'缺Vue的真实preflight子进程失败，昂贵任务未启动且父close落失败报告',categories:['environment-missing'],seam:'executeVerificationPlan'},
  {file:'tests/verification-report-v2.test.mjs',name:'v2 schema 与 fresh consumer 拒绝实际退出、Gate、日志、invocation 和漂移缺陷',categories:['input-drift','missing-gate','cli-snapshot-mismatch'],seam:'validateVerificationReport'},
  {file:'tests/verification-report-v2.test.mjs',name:'完整 v2 报告按独立期望台账核验',categories:['selector-omission','missing-task'],seam:'validateVerificationReport'},
  {file:'tests/verification-report-v2.test.mjs',name:'qualified 请求与实际执行条件必须匹配独立资格合同',categories:['qualification-execution-contract-tamper'],seam:'validateVerificationReport / assertQualificationExecutionContract'},
  {file:'tests/verification-report-v2.test.mjs',name:'同轮复用必须具有相同依赖、资源、来源及完整执行输入',categories:['same-round-reuse-input-mismatch'],seam:'validateVerificationReport'},
  {file:'tests/verification-report-v2.test.mjs',name:'批量 Node 测试显式串行，报告必须绑定请求和实际 file argv cwd env',categories:['node-batch-argv-cwd-environment-tamper'],seam:'compileTaskExecution / validateVerificationReport'},
  {file:'tests/verification-qualification.test.mjs',name:'配对顺序、瞬时真实退出、结果及日志被篡改均不能继承资格',categories:['missing-result'],seam:'validateQualification'},
  {file:'tests/verification-qualification.test.mjs',name:'独立资格编译器拒绝成对删除 syntax、preflight、prepare、cleanup 与 Gate 台账',categories:['missing-syntax','missing-preflight','missing-preparation','missing-cleanup','ledger-self-assertion'],seam:'validateQualificationPlanLedger'},
  {file:'tests/verification-qualification.test.mjs',name:'资格公开消费者拒绝真实 Node 的实际 argv cwd env 与源码回执篡改',categories:['qualification-actual-execution-tamper','qualification-source-receipt-tamper'],seam:'validateQualificationReportEvidence / validateVerificationReport'},
  {file:'tests/verification-qualification.test.mjs',name:'资格公开消费者复用普通 v2 的完整同轮执行输入等价合同',categories:['qualification-reuse-input-mismatch'],seam:'validateQualificationReportEvidence / validateVerificationReport'},
  {file:'tests/verification-qualification.test.mjs',name:'资格计时只消费完整 callback 单调时钟回执，不能孤立放大或缩短真实时长',categories:['qualification-timing-tamper'],seam:'measureQualificationRun / validateQualification'},
  {file:'tests/verification-qualification.test.mjs',name:'资格配对一侧真实失败立即停止，保留partial pair且候选侧未启动',categories:['qualification-pair-failure-stop'],seam:'runQualification / executeVerificationPlan'},
  {file:'tests/verification-qualification.test.mjs',name:'资格入口持久处理中断，真实legacy和后代关闭后不启动candidate并保留原始证据',categories:['qualification-interrupt-stop'],seam:'runQualificationWithSignals / executeVerificationPlan'},
  {file:'tests/verification-qualification.test.mjs',name:'资格worker真实SIGKILL的未观察退出仍保留partial原始报告和close且不能授予资格',categories:['qualification-unobserved-close-retention'],seam:'runQualificationWithSignals / qualificationRunEvidence'},
  {file:'tests/verification-baseline.test.mjs',name:'基线成功证据必须绑定同一 SHA、报告字节和当前策略',categories:['baseline-digest'],seam:'validateBaseline'},
  {file:'tests/verification-baseline.test.mjs',name:'未来和非祖先提交不能缩小当前候选',categories:['baseline-nonancestor'],seam:'validateBaseline'},
  {file:'tests/verification-baseline.test.mjs',name:'Gitlink 基线差异按真实提交登记而不是工作树版本猜测',categories:['gitlink'],seam:'validateBaseline'},
  {file:'tests/verification-baseline.test.mjs',name:'公共计划拒绝显式非法基线参数与伪报告，只有完整祖先 SHA 单独给出允许全量回退',categories:['baseline-parameters','baseline-forged-report'],seam:'planTemplateVerification'},
  {file:'tests/verification-gates.test.mjs',name:'未知路径在任何发布规划执行昂贵工作前失败',categories:['unknown-path'],seam:'planTemplateVerification'},
  {file:'tests/verification-gates.test.mjs',name:'显式资格报告和摘要必须成对且字节吻合，过期来源才回退全量',categories:['qualification-parameters','qualification-digest'],seam:'planTemplateVerification'},
  {file:'tests/verification-gates.test.mjs',name:'保守闭包保留共享 helper、fixture、lock、混合变更及 Spec raw 检查全部 117',categories:['shared-helper','fixture','lock'],seam:'planTemplateVerification'},
  {file:'tests/verification-artifacts.test.mjs',name:'已安装 bin/runtime 字节、类型和权限污染不能复用',categories:['consumer-isolation-artifact-tamper'],seam:'validateArtifact'},
  {file:'tests/verification-artifacts.test.mjs',name:'固定源码消费保留原 tests/scripts 并绑定精确安装材料，污染与错配不能复用',categories:['fixed-cli-source-consumer-tamper'],seam:'prepareCliSourceConsumer / validateCliSourceConsumer'},
  {file:'.template-source/cli-core/tests/build.test.mjs',name:'战略 YAML 清单投影、固定来源与 WORKTREE 仅在临时副本构建',categories:['fixed-source-mismatch'],seam:'syncTemplate'},
  {file:'.template-source/cli-core/tests/cli.test.mjs',name:'显式迁移不覆盖已修改的旧治理文件',categories:['user-file-overwrite'],seam:'migrate apply'},
  {file:'.template-source/tooling/node/test/approval-consumption.test.mjs',name:'changing raw asset and unsigned-context digest cannot reuse old frozen approval',categories:['approval-stale'],seam:'validateApprovalRecord'},
]);

export function qualificationPerformance(legacy,candidate) {
  if(!Array.isArray(legacy)||!Array.isArray(candidate)||legacy.length<5||legacy.length!==candidate.length||[...legacy,...candidate].some(value=>!Number.isFinite(value)||value<=0))throw Error('qualification requires five or more observed pairs');
  const before=median(legacy),after=median(candidate),ratio=after/before;
  return {pairs:legacy.length,legacy_median_ms:before,candidate_median_ms:after,reduction:1-ratio,legacy_max_ms:Math.max(...legacy),candidate_max_ms:Math.max(...candidate),passed:ratio<=0.8&&Math.max(...candidate)<=Math.max(...legacy)};
}
export const QUALIFICATION_EXECUTION_CONTRACT=Object.freeze({concurrency:2,tooling_mode:'optimized',test_concurrency:2});
export function qualificationBindings({root,config,policyDigest,legacyManifestDigest,executionContract=QUALIFICATION_EXECUTION_CONTRACT}) {
  const files={},refs=new Set(config.gate_policy?.qualification_inputs||[]),patterns=config.gate_policy?.qualification_input_patterns||[];
  const tracked=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
  if(tracked.status!==0)throw Error('qualification-source-inventory-unobserved');
  for(const ref of tracked.stdout.split('\0').filter(Boolean))if(patterns.some(pattern=>verificationPatternMatches(ref,pattern))&&fs.existsSync(path.join(root,ref))&&fs.lstatSync(path.join(root,ref)).isFile())refs.add(ref);
  for(const ref of [...refs].sort()) {
    const file=path.resolve(root,ref),relative=path.relative(fs.realpathSync(root),fs.realpathSync(file));
    if(relative.startsWith('..')||path.isAbsolute(relative)||fs.realpathSync(file)!==file||!fs.lstatSync(file).isFile())throw Error(`qualification-source-invalid:${ref}`);
    files[ref]=hash(fs.readFileSync(file));
  }
  const links=spawnSync('git',['ls-tree','-r','HEAD'],{cwd:root,encoding:'utf8'});if(links.status!==0)throw Error('qualification-gitlink-inventory-unobserved');
  const gitlinks=Object.fromEntries(links.stdout.split('\n').filter(row=>row.startsWith('160000 ')).map(row=>{const match=/^160000 commit ([a-f0-9]{40})\t(.+)$/.exec(row);if(!match)throw Error('qualification-gitlink-invalid');return [match[2],match[1]];}));
  return {policy_digest:policyDigest,legacy_manifest_digest:legacyManifestDigest,source_files:files,source_gitlinks:gitlinks,node:process.version,platform:process.platform,arch:process.arch,cpus:os.availableParallelism(),execution_contract:structuredClone(executionContract),legacy_execution_contract:{concurrency:1,tooling_mode:'legacy',test_concurrency:1}};
}
function evidenceFile(directory,reference,digest) {
  if(typeof reference!=='string'||!/^[a-f0-9]{64}$/.test(digest||''))throw Error('qualification-evidence-reference-invalid');
  const file=path.resolve(directory,reference),actual=fs.realpathSync(file),relative=path.relative(fs.realpathSync(directory),actual);
  if(actual!==file||relative.startsWith('..')||path.isAbsolute(relative)||!fs.lstatSync(file).isFile())throw Error('qualification-evidence-path-invalid');
  const bytes=fs.readFileSync(file);if(hash(bytes)!==digest)throw Error('qualification-evidence-digest-mismatch');return {file,bytes};
}
const MEASUREMENT_ROUNDING_MS=2; // Two UTC endpoints and one duration round to milliseconds.
/** The window includes the whole callback, including strict terminal consumers. */
export async function measureQualificationRun({directory,reference,execute}) {
  const file=path.resolve(directory,reference),relative=path.relative(fs.realpathSync(directory),file);
  if(typeof execute!=='function'||!relative||relative.startsWith('..')||path.isAbsolute(relative)||fs.existsSync(file))throw Error('qualification-measurement-output-invalid');
  const startedAt=new Date().toISOString(),start=process.hrtime.bigint();
  const result=await execute();
  const reportFile=fs.realpathSync(result.reportFile),reportBytes=fs.readFileSync(reportFile),reportDigest=hash(reportBytes),actualClose=JSON.parse(reportBytes).final_exit;
  const integration=result.integrationReportFile?{report_ref:path.relative(directory,fs.realpathSync(result.integrationReportFile)),report_sha256:hash(fs.readFileSync(result.integrationReportFile))}:undefined;
  const end=process.hrtime.bigint(),finishedAt=new Date().toISOString(),wallMs=Math.round(Number(end-start)/1e6);
  const measurement={schema_version:1,kind:'verification-qualification-measurement',clock:'process.hrtime.bigint',
    started_at:startedAt,finished_at:finishedAt,started_monotonic_ns:String(start),finished_monotonic_ns:String(end),wall_ms:wallMs,
    report_ref:path.relative(directory,reportFile),report_sha256:reportDigest,actual_close:actualClose,
    ...(integration?{integration}:{})};
  fs.writeFileSync(file,JSON.stringify(measurement,null,2)+'\n');
  return {result,wall_ms:wallMs,measurement:{ref:relative,sha256:hash(fs.readFileSync(file))}};
}
function measuredQualificationWall(directory,run,report) {
  const measurement=JSON.parse(evidenceFile(directory,run.measurement?.ref,run.measurement?.sha256).bytes);
  if(measurement.schema_version!==1||measurement.kind!=='verification-qualification-measurement'||measurement.clock!=='process.hrtime.bigint'||
    !/^\d+$/.test(measurement.started_monotonic_ns||'')||!/^\d+$/.test(measurement.finished_monotonic_ns||''))throw Error('qualification-measurement-invalid');
  const difference=BigInt(measurement.finished_monotonic_ns)-BigInt(measurement.started_monotonic_ns);
  if(difference<=0n||difference>BigInt(Number.MAX_SAFE_INTEGER))throw Error('qualification-measurement-clock-invalid');
  const wallMs=Math.round(Number(difference)/1e6),started=Date.parse(measurement.started_at),finished=Date.parse(measurement.finished_at);
  if(!Number.isInteger(wallMs)||wallMs<=0||measurement.wall_ms!==wallMs||run.wall_ms!==wallMs||
    !Number.isFinite(started)||!Number.isFinite(finished)||finished<started||Math.abs(finished-started-wallMs)>MEASUREMENT_ROUNDING_MS)throw Error('qualification-measurement-duration-mismatch');
  if(measurement.report_ref!==run.report_ref||measurement.report_sha256!==run.report_sha256||
    JSON.stringify(measurement.actual_close)!==JSON.stringify(run.actual_close)||JSON.stringify(measurement.integration)!==JSON.stringify(run.integration))throw Error('qualification-measurement-report-binding-mismatch');
  const reportStarted=Date.parse(report.started_at),reportFinished=Date.parse(report.finished_at),supervision=report.metrics?.wall_ms;
  if(!Number.isInteger(supervision)||supervision<0||!Number.isFinite(reportStarted)||!Number.isFinite(reportFinished)||reportFinished<reportStarted||
    reportStarted<started-MEASUREMENT_ROUNDING_MS||reportFinished>finished+MEASUREMENT_ROUNDING_MS||
    wallMs+MEASUREMENT_ROUNDING_MS<supervision||wallMs+MEASUREMENT_ROUNDING_MS<reportFinished-reportStarted)throw Error('qualification-measurement-shorter-than-supervision');
  const commands=[...(report.results||[]).filter(row=>!row.reused&&!row.skipped)];
  if(run.integration){const integration=JSON.parse(evidenceFile(directory,run.integration.report_ref,run.integration.report_sha256).bytes);commands.push(...(integration.commands||[]));}
  for(const row of commands) {
    if(!Number.isFinite(row.duration_ms)||row.duration_ms<0||wallMs+MEASUREMENT_ROUNDING_MS<row.duration_ms)throw Error('qualification-measurement-shorter-than-command');
    if(row.started_at!==undefined||row.finished_at!==undefined){const a=Date.parse(row.started_at),b=Date.parse(row.finished_at);
      if(!Number.isFinite(a)||!Number.isFinite(b)||b<a||a<started-MEASUREMENT_ROUNDING_MS||b>finished+MEASUREMENT_ROUNDING_MS||wallMs+MEASUREMENT_ROUNDING_MS<b-a)throw Error('qualification-measurement-command-window-mismatch');}
  }
  return {wall_ms:wallMs,started_monotonic_ns:measurement.started_monotonic_ns,finished_monotonic_ns:measurement.finished_monotonic_ns,started_at_ms:started,finished_at_ms:finished};
}
export function collectQualificationCounterexamples({root,directory}) {
  const files=[...new Set(QUALIFICATION_COUNTEREXAMPLE_REGISTRY.map(row=>row.file))],suites=[];
  for(const [index,file]of files.entries()) {
    const cases=QUALIFICATION_COUNTEREXAMPLE_REGISTRY.filter(row=>row.file===file),escape=name=>name.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
    const pattern=cases.map(row=>`^${escape(row.name)}$`).join('|');
    const args=['--test','--test-reporter=tap','--test-name-pattern',pattern,file],environment={...process.env};delete environment.NODE_TEST_CONTEXT;
    const observed=spawnSync(process.execPath,args,{cwd:root,env:environment,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
    const stdoutFile=path.join(directory,`counterexamples.${index}.stdout.log`),stderrFile=path.join(directory,`counterexamples.${index}.stderr.log`);fs.writeFileSync(stdoutFile,observed.stdout||'');fs.writeFileSync(stderrFile,observed.stderr||'');
    suites.push({file,source_sha256:hash(fs.readFileSync(path.join(root,file))),command:process.execPath,args,actual_close:{code:observed.status,signal:observed.signal,observed:observed.status!==null||observed.signal!==null},stdout_ref:path.basename(stdoutFile),stdout_sha256:hash(fs.readFileSync(stdoutFile)),stderr_ref:path.basename(stderrFile),stderr_sha256:hash(fs.readFileSync(stderrFile))});
    if(observed.status!==0)break;
  }
  return {schema_version:1,kind:'verification-qualification-counterexamples',suites};
}
function verifyCounterexamples(directory,proof,bindings) {
  const corpus=proof.counterexamples;
  if(corpus?.schema_version!==1||corpus.kind!=='verification-qualification-counterexamples')throw Error('qualification-counterexamples-missing');
  const expectedFiles=[...new Set(QUALIFICATION_COUNTEREXAMPLE_REGISTRY.map(row=>row.file))];
  if(corpus.suites?.length!==expectedFiles.length||new Set(corpus.suites.map(row=>row.file)).size!==expectedFiles.length)throw Error('qualification-counterexamples-incomplete');
  for(const suite of corpus.suites) {
    const cases=QUALIFICATION_COUNTEREXAMPLE_REGISTRY.filter(row=>row.file===suite.file),escape=name=>name.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
    if(!cases.length||bindings.source_files[suite.file]!==suite.source_sha256||suite.command!==process.execPath||JSON.stringify(suite.args)!==JSON.stringify(['--test','--test-reporter=tap','--test-name-pattern',cases.map(row=>`^${escape(row.name)}$`).join('|'),suite.file]))throw Error('qualification-counterexample-source-unregistered');
    if(suite.actual_close?.observed!==true||suite.actual_close.code!==0||suite.actual_close.signal!==null)throw Error('qualification-counterexample-process-failed');
    const stdout=evidenceFile(directory,suite.stdout_ref,suite.stdout_sha256).bytes.toString('utf8');evidenceFile(directory,suite.stderr_ref,suite.stderr_sha256);
    if(/^not ok /m.test(stdout))throw Error('qualification-counterexample-assertion-failed');
    for(const row of cases)if(!new RegExp(`^ok \\d+ - ${escape(row.name)}(?:\\r?$)`,`m`).test(stdout))throw Error(`qualification-counterexample-unobserved:${row.categories.join(',')}`);
  }
}
export function validateQualificationCounterexamples({directory,corpus,bindings}) {
  try {verifyCounterexamples(directory,{counterexamples:corpus},bindings);return {valid:true,reasons:[],categories:[...new Set(QUALIFICATION_COUNTEREXAMPLE_REGISTRY.flatMap(row=>row.categories))]};}
  catch(error){return {valid:false,reasons:[error.message],categories:[]};}
}
function qualificationChangedFiles(root,proof) {
  const base=proof.baseline?.base_sha,commit=proof.representative_commit,additional=proof.representative_changed_files;
  if(!/^[a-f0-9]{40}$/.test(base||'')||!Array.isArray(additional)||additional.some(ref=>typeof ref!=='string'||!ref||path.posix.isAbsolute(ref)||ref.includes('\\')||ref.split('/').includes('..'))||JSON.stringify(additional)!==JSON.stringify([...new Set(additional)].sort()))throw Error('qualification-representative-scope-invalid');
  const ancestor=spawnSync('git',['merge-base','--is-ancestor',base,commit],{cwd:root});if(ancestor.status!==0)throw Error('qualification-bootstrap-not-representative-ancestor');
  const diff=spawnSync('git',['diff','--name-only','-z','--no-renames',`${base}...${commit}`],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(diff.status!==0)throw Error('qualification-representative-diff-unobserved');
  return [...new Set([...diff.stdout.split('\0').filter(Boolean),...additional])].sort();
}
function verifiedQualificationPlan({root,config,proof,report,reportDirectory,side}) {
    const changed=qualificationChangedFiles(root,proof),plans=compileQualificationPlans({root,config,changedFiles:changed,commit:proof.representative_commit});
    const expected=addVerificationExecutionTasks(plans[side],{root,reportDir:reportDirectory,purpose:'qualification',reference:side==='legacy',fixedCommit:proof.representative_commit});
    const normalize=value=>typeof value==='string'?value.replaceAll(root,report.root):Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,normalize(item)])):value;
    const normalized=normalize(expected);
    // Every task control is execution input. A projected view would let a
    // report delete argv/env, change scheduling or drop future controls.
    try {
      assert.deepEqual(report.plan.changed_files,changed);
      assert.equal(report.plan.strategy,plans[side].strategy);
      assert.equal(report.plan.source_requirement,normalized.source_requirement);
      assert.deepEqual(report.plan.tooling,normalized.tooling);
      assert.deepEqual(report.plan.commands,normalized.commands);
      assert.deepEqual(report.plan.gates||[],normalized.gates||[]);
    }catch {throw Error('qualification-independent-plan-ledger-mismatch');}
    return normalized;
}
export function validateQualificationPlanLedger(options) {
  try {verifiedQualificationPlan(options);return {valid:true,reasons:[]};}
  catch(error){return {valid:false,reasons:[error.message]};}
}
/** expectedPlan and expectedSourcesManifest come from the independent consumer. */
export function validateQualificationReportEvidence(report,{root,expectedPlan,reportDirectory,expectedSourcesManifest,observedExitCode}={}) {
  if(report?.purpose!=='qualification'||report.experimental!==true)throw Error('qualification-run-purpose-invalid');
  if(!Number.isInteger(observedExitCode))throw Error('qualification-close-not-observed');
  return reportValidators.validateVerificationReport(report,{root,expectedPlan,reportDirectory,expectedSourcesManifest,observedExitCode,
    requireRelease:false,historical:true,expectedInvocation:{command:'executeVerificationPlan',args:[]}});
}
export function validateQualificationSideEvidence({root,config,proof,report,reportDirectory,side,observedExitCode}) {
  const expectedPlan=verifiedQualificationPlan({root,config,proof,report,reportDirectory,side});
  const expectedSourcesManifest=collectReleaseSources({root,commit:proof.representative_commit});
  return validateQualificationReportEvidence(report,{root,expectedPlan,reportDirectory,expectedSourcesManifest,observedExitCode});
}
function verifyRun(directory,run,{expectFailure=false}={}) {
  const {file,bytes}=evidenceFile(directory,run.report_ref,run.report_sha256),report=JSON.parse(bytes),close=run.actual_close;
  if(!close?.observed||!Number.isInteger(close.code)||close.signal!==null||!Number.isFinite(run.wall_ms)||run.wall_ms<=0)throw Error('qualification-close-not-observed');
  if(report.schema_version!==2||report.kind!=='template-verification-report'||report.purpose!=='qualification'||report.experimental!==true)throw Error('qualification-run-purpose-invalid');
  if(report.input_drift!==false||report.input_sha256!==report.input_after_sha256)throw Error('qualification-run-input-drift');
  if(!Array.isArray(report.plan?.commands)||!report.plan.commands.length||!Array.isArray(report.results))throw Error('qualification-run-plan-missing');
  if(!report.final_exit||report.final_exit.code!==close.code||report.final_exit.observed!==true||report.final_exit.signal!==null)throw Error('qualification-close-binding-mismatch');
  const failed=[];
  for(const [index,item] of report.plan.commands.entries()) {
    if(item.when&&item.when!=='template-source')continue;
    const row=report.results.find(result=>item.task_id?result.task_id===item.task_id:result.index===index);
    if(!row) {
      if(expectFailure&&report.unexecuted?.some(missing=>(item.task_id?missing.task_id===item.task_id:missing.id===item.id)&&missing.command===item.command&&typeof missing.reason==='string'&&missing.reason))continue;
      throw Error('qualification-run-task-missing');
    }
    if(row.command!==item.command)throw Error('qualification-run-task-missing');
    if(row.skipped){if(expectFailure)continue;throw Error('qualification-run-task-skipped');}
    if((row.kind==='preflight'||item.kind==='preflight')&&row.actual_exit_code===undefined) {
      if(row.observation?.observed!==true)throw Error('qualification-preflight-not-observed');
      if(row.code!==0)failed.push({id:item.id,task_id:item.task_id,gate_ids:item.gate_ids||[]});
      continue;
    }
    let origin=row;
    if(row.reused) {
      origin=report.results.find(result=>row.reused_from?.task_id?result.task_id===row.reused_from.task_id:row.reused_from?.index!==undefined?result.index===row.reused_from.index:report.plan.strategy==='legacy-reference'&&!result.reused&&result.command===row.command&&result.stdoutFile===row.stdoutFile);
      if(!origin||origin===row||origin.reused||origin.command!==row.command||origin.stdoutFile!==row.stdoutFile||origin.stderrFile!==row.stderrFile||origin.code!==row.code)throw Error('qualification-reuse-origin-invalid');
    }
    if(origin.actual_exit_code_observed!==true||!Number.isInteger(origin.actual_exit_code)||origin.code!==origin.actual_exit_code||origin.actual_exit_signal!==null)throw Error('qualification-task-close-not-observed');
    for(const log of [row.stdoutFile,row.stderrFile]) {
      const expected=run.log_digests?.[log];const relative=path.relative(path.dirname(file),path.resolve(log));
      evidenceFile(path.dirname(file),relative,expected);
    }
    if(row.code!==0)failed.push({id:item.id,task_id:item.task_id,gate_ids:item.gate_ids||[]});
  }
  if(expectFailure) {
    if(close.code===0||!failed.length||report.status!=='failed')throw Error('qualification-negative-not-rejected');
  } else if(close.code!==0||report.status!=='passed'||report.unexecuted?.length||failed.length)throw Error('qualification-run-not-passed');
  const measurement=measuredQualificationWall(directory,run,report);
  return {report,failed,wall_ms:measurement.wall_ms,measurement,report_file:file};
}

/** Counts and times are reconstructed from bound run reports and actual command logs. */
export function validateQualification({root,config,reportFile,expectedDigest,expectedBindings,scope='gates'}={}) {
  const reasons=[],bindings=expectedBindings||{};
  try {
    if(!reportFile)throw Error('qualification-missing');
    const file=path.resolve(reportFile);if(fs.realpathSync(file)!==file||!fs.lstatSync(file).isFile())throw Error('qualification-path-invalid');
    const bytes=fs.readFileSync(file);
    if(scope==='gates'&&!/^[a-f0-9]{64}$/.test(expectedDigest||''))throw Error('qualification-digest-required');
    if(expectedDigest&&hash(bytes)!==expectedDigest)throw Error('qualification-digest-mismatch');
    const proof=JSON.parse(bytes),directory=path.dirname(file);
    if(proof.schema_version!==1||proof.kind!=='template-verification-qualification'||proof.status!=='passed'||proof.scope!==scope)throw Error('qualification-schema-invalid');
    if(JSON.stringify(proof.bindings)!==JSON.stringify(expectedBindings))throw Error('qualification-source-binding-stale');
    if(scope==='gates'&&!/^[a-f0-9]{40}$/.test(proof.representative_commit||''))throw Error('qualification-representative-commit-missing');
    if(scope==='gates') {
      const baseline=validateBaseline({root,base:proof.baseline?.base_sha,baselineReport:proof.baseline_report_ref,baselineReportDigest:proof.baseline_report_sha256,validator:reportValidators.validateBaselineReport,policyDigest:expectedBindings.policy_digest});
      if(!baseline.valid)throw Error(`qualification-bootstrap-baseline-invalid:${baseline.reasons.join(',')}`);
    }
    if(!Array.isArray(proof.pairs)||proof.pairs.length<5)throw Error('qualification-five-pairs-missing');
    const expectedSourcesManifest=scope==='gates'?collectReleaseSources({root,commit:proof.representative_commit}):undefined;
    const legacy=[],candidate=[],pairIds=new Set(),measurementRefs=new Set();let previousMeasurement;
    for(const [index,pair]of proof.pairs.entries()) {
      if(pairIds.has(pair.pair_id)||JSON.stringify(pair.order)!==JSON.stringify(index%2?['candidate','legacy']:['legacy','candidate']))throw Error('qualification-pair-order-invalid');pairIds.add(pair.pair_id);
      const before=verifyRun(directory,pair.legacy),after=verifyRun(directory,pair.candidate);
      for(const side of pair.order) {
        const observed=side==='legacy'?before:after,measurement=observed.measurement,ref=pair[side].measurement.ref;
        if(measurementRefs.has(ref)||previousMeasurement&&(BigInt(measurement.started_monotonic_ns)<BigInt(previousMeasurement.finished_monotonic_ns)||measurement.started_at_ms+MEASUREMENT_ROUNDING_MS<previousMeasurement.finished_at_ms))throw Error('qualification-measurement-order-invalid');
        measurementRefs.add(ref);previousMeasurement=measurement;
      }
      if(scope==='gates')for(const [side,observed]of [['legacy',before],['candidate',after]]) {
        const expectedPlan=verifiedQualificationPlan({root,config,proof,report:observed.report,reportDirectory:path.dirname(observed.report_file),side});
        validateQualificationReportEvidence(observed.report,{root,expectedPlan,reportDirectory:path.dirname(observed.report_file),
          expectedSourcesManifest,observedExitCode:pair[side].actual_close.code});
      }
      if(scope==='gates'&&(before.report.plan.representative_commit!==proof.representative_commit||after.report.plan.representative_commit!==proof.representative_commit||before.report.input_sha256!==proof.input_sha256||after.report.input_sha256!==proof.input_sha256))throw Error('qualification-representative-input-mismatch');
      const condition=report=>({...Object.fromEntries(['node','platform','arch','cpus','cache_condition','input_observation'].map(key=>[key,report.environment?.[key]])),toolchains:report.preflight?.observations?.filter(row=>['python-jsonschema','pnpm-and-tooling-lock','vue-author-toolchain'].includes(row.name))});
      if(before.report.input_sha256!==after.report.input_sha256||JSON.stringify(condition(before.report))!==JSON.stringify(condition(after.report)))throw Error('qualification-pair-condition-mismatch');
      if(scope==='gates'&&['node','platform','arch','cpus'].some(key=>before.report.environment?.[key]!==expectedBindings[key]))throw Error('qualification-current-environment-mismatch');
      if(scope==='gates'&&(!before.report.preflight?.observations?.length||before.report.preflight.status!=='passed'||after.report.preflight?.status!=='passed'))throw Error('qualification-preflight-evidence-missing');
      if(scope==='gates')for(const [observed,contract]of [[before.report,expectedBindings.legacy_execution_contract],[after.report,expectedBindings.execution_contract]]) {
        const actual={concurrency:observed.environment?.concurrency,tooling_mode:observed.environment?.tooling_mode,test_concurrency:observed.environment?.test_concurrency};
        if(JSON.stringify(actual)!==JSON.stringify(contract))throw Error('qualification-execution-contract-mismatch');
      }
      if(before.report.plan.strategy!=='legacy-reference'||after.report.plan.strategy!=='qualification-shadow')throw Error('qualification-pair-strategy-invalid');
      if(scope==='gates'&&(before.report.plan.legacy_manifest_digest!==expectedBindings.legacy_manifest_digest||after.report.plan.policy_digest!==expectedBindings.policy_digest))throw Error('qualification-policy-binding-mismatch');
      if(scope==='gates') {
        const frozen=loadLegacyManifest(root);
        const required=new Set(config.gates.filter(gate=>gate.execution_scope==='template-verification'&&(gate.trigger==='always'||after.report.plan.changed_files?.some(file=>gate.input_patterns.some(pattern=>verificationPatternMatches(file,pattern))))).map(gate=>gate.id));
        let expanded=true;while(expanded){expanded=false;for(const gate of config.gates){if(!required.has(gate.id)&&(gate.impact_dependencies||[]).some(id=>required.has(id))){required.add(gate.id);expanded=true;}if(required.has(gate.id))for(const id of gate.depends_on||[])if(!required.has(id)){required.add(id);expanded=true;}}}
        for(const raw of frozen.commands) {
          const command=`${raw.run}${raw.require_committed_for?.includes('release')?' --require-committed':''}`;
          if(!before.report.plan.commands.some(task=>task.task_id===raw.task_id&&task.command===command))throw Error('qualification-legacy-oracle-pruned');
          const coverage=config.legacy_coverage.find(row=>row.old_id===raw.task_id);
          if(coverage.audit_status==='preserved'&&coverage.gate_ids.some(id=>required.has(id))&&!after.report.plan.commands.some(task=>task.task_id===raw.task_id&&task.command===command))throw Error('qualification-preserved-assertion-omitted');
        }
      }
      legacy.push(before.wall_ms);candidate.push(after.wall_ms);
    }
    if(!qualificationPerformance(legacy,candidate).passed)throw Error('qualification-performance-target-failed');
    const routes=new Set((proof.route_cases||[]).map(row=>row.category));
    if(scope==='gates'&&QUALIFICATION_ROUTE_CASES.some(name=>!routes.has(name)))throw Error('qualification-route-cases-missing');
    for(const row of proof.route_cases||[]) {
      const observation=JSON.parse(evidenceFile(directory,row.evidence_ref,row.evidence_sha256).bytes);
      if(observation.kind!=='verification-route-observation'||observation.input?.category!==row.category||observation.observed!==true)throw Error('qualification-route-not-observed');
      if(scope==='gates') {
        const registered=QUALIFICATION_ROUTE_REGISTRY.find(entry=>entry.category===row.category);
        if(JSON.stringify(observation.input)!==JSON.stringify(registered))throw Error('qualification-route-unregistered');
        if(!registered.expected_error) {
          const frozen=loadLegacyManifest(root),required=new Set(config.gates.filter(gate=>gate.execution_scope==='template-verification'&&(gate.trigger==='always'||registered.changed_files.some(file=>gate.input_patterns.some(pattern=>verificationPatternMatches(file,pattern))))).map(gate=>gate.id));
          for(const raw of frozen.commands)if(config.legacy_coverage.find(coverage=>coverage.old_id===raw.task_id).gate_ids.some(id=>required.has(id))&&!observation.actual?.task_ids?.includes(raw.task_id))throw Error('qualification-route-assertion-omitted');
        }
      }
      const passed=observation.input.expected_error?Boolean(observation.error?.includes(observation.input.expected_error)):!observation.error&&(observation.input.expected_gate_ids||[]).every(id=>observation.actual?.gate_ids?.includes(id));
      if(!passed||row.observed!==true||row.passed!==true)throw Error('qualification-route-not-observed');
    }
    const negativeCategories=new Set(),covered=new Set();
    for(const row of proof.negative_cases||[]) {
      const before=verifyRun(directory,row.legacy,{expectFailure:true}),after=verifyRun(directory,row.candidate,{expectFailure:true});
      if(before.report.input_sha256!==after.report.input_sha256)throw Error('qualification-negative-input-mismatch');
      if(!row.covered_old_ids?.length||!row.covered_old_ids.every(id=>before.failed.some(f=>f.task_id===id||f.id===id)))throw Error('qualification-negative-coverage-unobserved');
      if(!after.failed.some(f=>f.gate_ids.length)||!row.expected_gate_ids?.some(id=>after.failed.some(f=>f.gate_ids.includes(id))))throw Error('qualification-negative-gate-unobserved');
      negativeCategories.add(row.category);row.covered_old_ids.forEach(id=>covered.add(id));
    }
    if(scope==='gates') {
      verifyCounterexamples(directory,proof,expectedBindings);
      if(proof.negative_cases?.length)throw Error('qualification-unregistered-negative-case');
    }else if(!proof.negative_cases?.length)throw Error('qualification-negative-evidence-missing');
    for(const row of config.legacy_coverage||[])if(['retire','impact-only','diagnostic'].includes(row.disposition)&&!covered.has(row.old_id))throw Error(`qualification-pruned-risk-unproved:${row.old_id}`);
    if(scope==='gates') {
      if(typeof reportValidators.validateQualificationIntegration!=='function')throw Error('qualification-integration-validator-missing');
      for(const pair of proof.pairs)for(const side of ['legacy','candidate']) {
        const receipt=pair[side].integration;
        if(!receipt)throw Error('qualification-all-four-release-missing');
        const bound=evidenceFile(directory,receipt.report_ref,receipt.report_sha256);
        const checked=reportValidators.validateQualificationIntegration({root,reportFile:bound.file,expectedDigest:receipt.report_sha256,expectedCommit:proof.representative_commit});
        if(!checked.valid||checked.bindings?.families?.join(',')!=='spec,design,backend,frontend')throw Error('qualification-all-four-release-invalid');
      }
    }
    return {valid:true,reasons:[],bindings,report_digest:hash(bytes),performance:qualificationPerformance(legacy,candidate)};
  } catch(error) {reasons.push(error.message);}
  return {valid:false,reasons,bindings};
}

export function qualificationRunEvidence(result,{directory,wallMs,diagnostic=false}) {
  if(!result.reportFile||!diagnostic&&(!result.observed||!Number.isInteger(result.code)))throw Error('qualification-process-not-observed');
  const file=fs.realpathSync(result.reportFile),bytes=fs.readFileSync(file),report=JSON.parse(bytes),logs={};
  for(const row of report.results||[])for(const ref of [row.stdoutFile,row.stderrFile])if(ref)logs[ref]=hash(fs.readFileSync(ref));
  if(diagnostic){const logRoot=path.join(path.dirname(file),'logs');if(fs.existsSync(logRoot)&&fs.lstatSync(logRoot).isDirectory()&&!fs.lstatSync(logRoot).isSymbolicLink())
    for(const entry of fs.readdirSync(logRoot,{recursive:true,withFileTypes:true})){const ref=path.join(entry.parentPath,entry.name);if(entry.isFile()&&/\.(?:stdout|stderr)$/.test(entry.name)&&fs.realpathSync(ref)===ref)logs[ref]=hash(fs.readFileSync(ref));}}
  return {report_ref:path.relative(directory,file),report_sha256:hash(bytes),actual_close:diagnostic?structuredClone(report.final_exit):{code:result.code,signal:result.signal??null,observed:result.observed},
    ...(diagnostic?{execution_outcome:{code:result.code,signal:result.signal??null,observed:result.observed},diagnostic:true}:{}),wall_ms:wallMs,log_digests:logs};
}
