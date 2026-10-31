import {readRepositoryMode} from '../../../scripts/lib/repository-mode.mjs';
import {fork,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {runGroups,printResults,runCommandToFiles} from '../../../scripts/lib/template-verification-runner.mjs';
import {createVerificationInputObserver,resolveVerificationScope,createVerificationReport,finalizeVerificationReport,saveVerificationReport} from '../../../scripts/lib/verification-report.mjs';
import {beginRuntimeRun} from '../../../scripts/lib/runtime-store.mjs';
import {validateVerificationReportDirectory} from './verification-preflight.mjs';
import {assertBaselineParameters} from './verification-baseline.mjs';
import {killTree} from '../../../scripts/lib/command-runner.mjs';
import {validateReceipt} from './verification-delivery-run.mjs';
import {addVerificationExecutionTasks,compileTaskExecution,assertVerificationSources} from './verification-execution-plan.mjs';
import {validateArtifact} from './verification-artifacts.mjs';
export {addVerificationExecutionTasks} from './verification-execution-plan.mjs';

const workerFile=fileURLToPath(import.meta.url);
const ROOT=path.resolve(path.dirname(workerFile),'../../..');
const hash=value=>createHash('sha256').update(value).digest('hex');
const quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;
function git(root,args) { const result=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(result.status!==0)throw new TypeError(result.stderr||`git ${args.join(' ')} 执行失败`);return result.stdout; }
function changedFiles(root,base) {
  const files=new Set(),collect=source=>source.split('\0').filter(Boolean).forEach(file=>files.add(file));
  if(base){if(!/^[a-f0-9]{40}$/.test(base))throw new TypeError('--base 必须为完整 40 位 SHA');collect(git(root,['diff','--name-only','-z','--no-renames','--diff-filter=ACDMRTUXB',`${base}...HEAD`]));}
  for(const args of [['diff','--name-only','-z','--no-renames','--diff-filter=ACDMRTUXB'],['diff','--cached','--name-only','-z','--no-renames','--diff-filter=ACDMRTUXB'],['ls-files','-z','--others','--exclude-standard']])collect(git(root,args));
  return [...files];
}
const options={'ci-guards':{type:'boolean',default:false},'ci-offline':{type:'boolean',default:false},help:{type:'boolean',default:false},profile:{type:'string',default:'fast'},base:{type:'string'},'changed-file':{type:'string',multiple:true},selection:{type:'string'},'report-dir':{type:'string'},'baseline-report':{type:'string'},'baseline-report-sha256':{type:'string'},'qualification-report':{type:'string'},'qualification-report-sha256':{type:'string'},'runtime-store':{type:'string',default:'off'},'fresh-inputs':{type:'boolean',default:false},plan:{type:'boolean',default:false},json:{type:'boolean',default:false},concurrency:{type:'string'},'tooling-mode':{type:'string'},checkpoint:{type:'string',multiple:true},'task-package':{type:'string',multiple:true}};
export function validateVerificationArguments(values) {
  if(values.profile!==undefined&&!['fast','release'].includes(values.profile))throw new TypeError(`未知核验 profile: ${values.profile}`);
  if(values['ci-offline']&&((values.checkpoint||[]).length||(values['task-package']||[]).length))throw new TypeError('CI_OFFLINE_EXPLICIT_INPUTS_REFUSED');
  if(values['qualification-report']!==undefined||values['qualification-report-sha256']!==undefined)throw new TypeError('QUALIFICATION_RETIRED');
  if(values.profile==='release'&&!values.help&&!values.base)throw new TypeError('RELEASE_BASE_REQUIRED: --base 必须绑定上一正式发行完整 SHA');
  if(values.base!==undefined&&!/^[a-f0-9]{40}$/.test(values.base))throw new TypeError('--base 必须为完整 40 位 SHA');
  for(const [report,digest]of [['baseline-report','baseline-report-sha256']]){
    const hasReport=values[report]!==undefined,hasDigest=values[digest]!==undefined;
    if(hasReport!==hasDigest)throw new TypeError(`--${report} 与 --${digest} 必须成对提供`);
    if(hasReport){
      if(typeof values[report]!=='string'||!values[report].trim())throw new TypeError(`--${report} 不能为空`);
      if(typeof values[digest]!=='string'||!/^[a-f0-9]{64}$/.test(values[digest]))throw new TypeError(`--${digest} 必须为完整 64 位 SHA-256`);
    }
  }
  if(values['baseline-report']!==undefined&&values.base===undefined)throw new TypeError('--baseline-report 需要 --base 绑定固定基线');
  return values;
}
export async function selectVerificationInputs(argv,root,{environment=process.env}={}) {
  const {values}=parseArgs({args:argv,options,strict:true});
  validateVerificationArguments(values);
  if(values.help)return {help:true,values};
  assertBaselineParameters({root,base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256']});
  const {planTemplateVerification,loadVerificationProfiles}=await import('../../../scripts/lib/template-verification.mjs');
  const explicit=values['changed-file']||[],requested=values.profile;
  const scope=resolveVerificationScope({profile:requested,explicit,actual:changedFiles(root,values.base)});scope.base=values.base||null;
  let assessment;
  if(values.base&&values['baseline-report']&&values['baseline-report-sha256']) {
    const {validateBaselineReport}=await import('./verification-report-validator.mjs');
    assessment=validateBaselineReport({root,base:values.base,reportFile:values['baseline-report'],expectedDigest:values['baseline-report-sha256']});
  }
  let plan=planTemplateVerification({config:loadVerificationProfiles(fs.readFileSync(path.join(root,'.template-source/process/template-verification-profiles.yaml'),'utf8')),ciGuards:values['ci-guards'],ciOffline:values['ci-offline'],includeSlow:environment.YSS_VERIFY_SLOW==='only'?'only':environment.YSS_VERIFY_SLOW==='1',profile:requested,changedFiles:scope.files,root,base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256'],baselineAssessment:assessment,...(values.selection?{selection:values.selection}:{})});
  plan.scope=scope;
  const requestedConcurrency=Number(values.concurrency||plan.max_concurrency||1);if(!Number.isInteger(requestedConcurrency)||requestedConcurrency<1||requestedConcurrency>8)throw new TypeError('concurrency 必须为 1..8');
  const release=plan.effective_profile==='release',concurrency=release?1:requestedConcurrency,requestedMode=values['tooling-mode']||'legacy';
  if(!['legacy','optimized'].includes(requestedMode))throw new TypeError('tooling-mode 必须为 legacy 或 optimized');
  const mode=release?'legacy':requestedMode;
  plan.tooling={requested_mode:requestedMode,effective_mode:mode,verification_concurrency:concurrency,test_concurrency:mode==='legacy'?1:Math.min(2,concurrency),reason:release?'complete-release-serial':requestedMode==='optimized'?'explicit-optimized-execution':'legacy-tooling'};
  return {values,plan,scope,root,concurrency,toolingMode:mode,purpose:'verification',invocation:{command:path.join(root,'scripts/run-template-verification'),args:argv}};
}
async function prepare(argv,root,options) {
  const input=await selectVerificationInputs(argv,root,options);
  if(input.help)return input;
  const {values,plan}=input;
  const reportDir=validateVerificationReportDirectory(root,values['report-dir']||path.join(fs.realpathSync(os.tmpdir()),`yss-template-verification-${randomUUID()}`));
  return {...input,reportDir,plan:addVerificationExecutionTasks(plan,{root,repositoryMode:readRepositoryMode(root),checkpoints:values.checkpoint,taskPackages:values['task-package'],reportDir,environment:options?.environment||process.env})};
}
export {prepare as prepareVerificationPlan};
async function runPrepared(input) {
  const {root,reportDir,concurrency=1,toolingMode='legacy',purpose='verification',scope={kind:'complete-candidate'},invocation=null,values={},environment:providedEnvironment=process.env}=input;
  const controller=new AbortController(),interrupt=()=>controller.abort();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
  let report,logRoot,session,started=performance.now(),before,inputObserver,exit=0,preparationStarted=false;
  const errors=[];
  const environment={...providedEnvironment,PYTHONDONTWRITEBYTECODE:'1',YSS_TEMPLATE_CONCURRENCY:String(concurrency),YSS_TOOLING_MODE:toolingMode,YSS_TOOLING_CONCURRENCY:String(toolingMode==='optimized'?Math.min(2,concurrency):1),...(reportDir?{YSS_TOOLING_REPORT_DIR:path.join(reportDir,'tooling')}:{})};
  let mode='template-source',plan=input.plan;
  try {
    if(reportDir)validateVerificationReportDirectory(root,reportDir);
    const modeResult=spawnSync(process.execPath,[path.join(root,'scripts/repository-mode')],{cwd:root,env:environment,encoding:'utf8'});
    if(modeResult.status!==0)throw new TypeError(modeResult.stderr||'仓库身份校验失败');mode=modeResult.stdout.trim();
    plan=addVerificationExecutionTasks(plan,{root,repositoryMode:mode,checkpoints:values.checkpoint,taskPackages:values['task-package'],purpose,reportDir,environment});
    inputObserver=createVerificationInputObserver(root,{reuseUnchanged:plan.requested_profile!=='release'&&plan.effective_profile!=='release'&&!values['fresh-inputs']});
    before=inputObserver.digest();
    report=createVerificationReport(plan,{root,inputDigest:before,concurrency,scope,invocation});report.purpose=purpose;report.experimental=purpose!=='verification';
    report.environment.repository_mode=mode;
    report.environment.tooling_mode=toolingMode;
    report.environment.test_concurrency=toolingMode==='optimized'?Math.min(2,concurrency):1;
    if(reportDir){fs.mkdirSync(reportDir);saveVerificationReport(reportDir,report);process.send?.({kind:'report-directory',directory:reportDir});}
    logRoot=reportDir?path.join(reportDir,'logs'):fs.mkdtempSync(path.join(os.tmpdir(),'yss-template-verification-'));
    const preflightTask=plan.commands.find(task=>task.kind==='preflight');
    const preflightRow=await runCommandToFiles(preflightTask.command,{cwd:root,environment,execution:preflightTask.execution,logRoot,sequence:'preflight',signal:controller.signal,onProcess:event=>process.send?.({kind:'command-process',...event})});
    preflightRow.id=preflightTask.id;preflightRow.task_id=preflightTask.task_id;preflightRow.gate_ids=preflightTask.gate_ids;preflightRow.group=preflightTask.group;preflightRow.index=plan.commands.indexOf(preflightTask);preflightRow.reused=false;
    preflightRow.log_digests=Object.fromEntries(['stdoutFile','stderrFile'].map(key=>[key,hash(fs.readFileSync(preflightRow[key]))]));
    report.results.push(preflightRow);if(reportDir)saveVerificationReport(reportDir,report);
    try{report.preflight=JSON.parse(fs.readFileSync(preflightRow.stdoutFile,'utf8'));}catch(error){throw new Error(`环境预检没有结构化结果: ${error.message}`);}
    if(preflightRow.code!==0||preflightRow.storageError||report.preflight.status!=='passed')throw new Error(`环境预检失败: ${(report.preflight.errors||[]).map(row=>`${row.name}: ${row.error}`).join('; ')}`);
    report.sources_manifest=report.preflight.sources_manifest||null;
    assertVerificationSources(plan,root);
    const runtimeMode=values['runtime-store']||'off';if(!['off','sqlite'].includes(runtimeMode))throw new TypeError('runtime-store 必须为 sqlite 或 off');
    session=beginRuntimeRun({root,kind:'template-verification',mode:runtimeMode,input:{input_sha256:before,plan},reportDir});
    const onResult=row=>{
      if(row.skipped===true&&['cancelled','dependency-failed'].includes(row.termination)){
        // No process ran: preserve that state and record its empty output.
        // The global plan index stays unique across separate scheduler phases.
        for(const [key,suffix]of [['stdoutFile','stdout'],['stderrFile','stderr']])if(row[key]===undefined){
          const file=path.join(logRoot,`unexecuted-${row.index}.${suffix}`);
          fs.writeFileSync(file,'',{flag:'wx'});row[key]=file;
        }
      }
      row.log_digests=Object.fromEntries(['stdoutFile','stderrFile'].filter(key=>row[key]&&fs.existsSync(row[key])).map(key=>[key,hash(fs.readFileSync(row[key]))]));report.results.push(row);if(row.storageError)errors.push(row.storageError);if(reportDir)saveVerificationReport(reportDir,report);
    };
    const executeFor=phase=>async(command,options)=>{
      // Tooling owns a per-file timeout. Never apply the 600s file budget to
      // its full multi-file preparation/test driver. Phase prefixes keep
      // separate scheduler invocations from overwriting each other's logs.
      const candidates=plan.commands.filter(task=>task.command===command),task=options.task||candidates[0];
      if(!task)throw new TypeError('ACTUAL_EXECUTION_TASK_MISSING');
      const execution=task.execution||compileTaskExecution(task,{root,reportDir,environment});
      return runCommandToFiles(command,{...options,execution,sequence:`${phase}-${options.sequence}`,onProcess:event=>process.send?.({kind:'command-process',...event}),timeoutMs:/pnpm.*\.template-source\/tooling\/node\s+test/.test(command)?0:options.timeoutMs});
    };
    const preparationTasks=plan.commands.filter(task=>task.group==='artifact-preparation');
    if(preparationTasks.length){
      preparationStarted=true;
      const preparationPlan={...plan,strategy:'release',groups:['artifact-preparation'],commands:preparationTasks};
      const prepIndexes=new Map(plan.commands.map((task,index)=>[task.task_id||task.id,index]));
      await runGroups(preparationPlan,mode,concurrency,{cwd:root,environment,execute:executeFor('artifact'),logRoot,signal:controller.signal,runtimeSession:session,runtimeEvent:'check-result',completedTasks:[{task:preflightTask,result:preflightRow}],onResult:row=>{
        const task=preparationPlan.commands[row.index];
        if(row.code===0&&!row.skipped&&!row.storageError)try{
          if(task.kind==='artifact-prepare'&&/^check\.cli-artifact-(?:spec|design|backend)$/.test(task.id)){
            const family=task.id.replace('check.cli-artifact-',''),artifact=JSON.parse(fs.readFileSync(path.join(reportDir,'artifacts',family,'artifact.json')));
            validateArtifact(artifact,report.sources_manifest.entries.find(source=>source.family===family));
            report.artifacts=[...(report.artifacts||[]).filter(existing=>existing.source_tuple?.family!==family),artifact];
          }
          if(task.kind==='artifact-consumers'){const receipt=validateReceipt(JSON.parse(fs.readFileSync(task.receipt_file)),{root,receiptFile:task.receipt_file,expectedSourcesManifest:report.sources_manifest});Object.assign(environment,receipt.environment);report.artifacts=receipt.artifacts;report.sources_manifest=receipt.sources_manifest;report.artifact_receipt={ref:task.receipt_file,sha256:hash(fs.readFileSync(task.receipt_file))};}
        }catch(error){row.code=1;row.error=[row.error,error.message].filter(Boolean).join('; ');}
        onResult({...row,index:prepIndexes.get(task.task_id),task_id:task.task_id,gate_ids:task.gate_ids});
      }});
    }
    const completedTasks=[preflightTask,...preparationTasks].map(task=>({task,result:report.results.find(row=>row.task_id===task.task_id)}));
    const primary={...plan,commands:plan.commands.filter(task=>task.kind!=='preflight'&&task.kind!=='cleanup'&&task.group!=='artifact-preparation'),groups:plan.groups.filter(group=>!['preflight','artifact-preparation','cleanup'].includes(group))};
    const execute=executeFor('check');
    const originalIndexes=new Map(plan.commands.map((task,index)=>[task.task_id||task.id,index]));
    const collect=row=>{const task=primary.commands[row.index];const adjusted={...row,id:task.id,task_id:task.task_id,gate_ids:task.gate_ids||[],index:originalIndexes.get(task.task_id||task.id)};if(row.reused){const origin=report.results.find(result=>!result.reused&&result.command===row.command&&result.stdoutFile===row.stdoutFile&&result.stderrFile===row.stderrFile);if(!origin)throw new Error('复用任务缺少同轮实际结果');adjusted.reused_from={id:origin.id,task_id:origin.task_id,index:origin.index};}onResult(adjusted);};
    const groups=await runGroups(primary,mode,concurrency,{cwd:root,environment,execute,logRoot,signal:controller.signal,runtimeSession:session,runtimeEvent:'check-result',completedTasks,onResult:collect});
    await printResults(groups);
    if(errors.length)throw new Error(`运行存储异常: ${errors.join('; ')}`);
    if(controller.signal.aborted){exit=130;throw new Error('验证被中断');}
    const failed=report.results.find(row=>row.code!==0||row.skipped);if(failed)throw new Error(`检查失败: ${failed.command}`);
    if(inputObserver.digest()!==before)throw new Error('核验命令修改了工作树；检查必须只读');
    finalizeVerificationReport(report,{status:'passed',wallMs:Math.round(performance.now()-started),repositoryMode:mode});
  }catch(error){exit=controller.signal.aborted?130:1; if(report)finalizeVerificationReport(report,{status:controller.signal.aborted?'interrupted':'failed',error:error.message,wallMs:Math.round(performance.now()-started),repositoryMode:mode});process.stderr.write(`模板核验失败: ${error.message}\n`);}
  finally {
    if(report&&preparationStarted)try{
      for(const task of plan.commands.filter(task=>task.kind==='cleanup')){
        const row=await runCommandToFiles(task.command,{cwd:root,environment,logRoot,sequence:`cleanup-${task.task_id}`,timeoutMs:60000,onProcess:event=>process.send?.({kind:'command-process',...event})});
        row.log_digests=Object.fromEntries(['stdoutFile','stderrFile'].filter(key=>row[key]&&fs.existsSync(row[key])).map(key=>[key,hash(fs.readFileSync(row[key]))]));
        report.results.push({...row,id:task.id,task_id:task.task_id,gate_ids:task.gate_ids,group:task.group,index:plan.commands.indexOf(task),reused:false});
        if(row.code!==0||row.storageError){report.status='failed';report.error=[report.error,`产物清理失败: ${row.error||row.storageError||row.code}`].filter(Boolean).join('; ');exit=1;}
      }
    }catch(error){report.status='failed';report.error=[report.error,error.message].filter(Boolean).join('; ');exit=1;}
    if(report)try{report.input_after_sha256=inputObserver.digest();report.input_drift=report.input_after_sha256!==before;if(report.input_drift){report.status='failed';report.error=[report.error,'验证输入变化'].filter(Boolean).join('; ');exit=1;}}catch(error){report.status='failed';report.error=error.message;exit=1;}finally{if(report&&inputObserver)report.input_observation_metrics=inputObserver.metrics;}
    if(report){finalizeVerificationReport(report,{status:report.status,error:report.error,wallMs:Math.round(performance.now()-started),repositoryMode:mode});if(report.status==='passed'&&report.unexecuted.length){report.status='failed';report.error='存在未执行的选中任务';exit=1;}}
    // tier: slow 的命中检查在 fast 中延后：不计入失败，但必须明确告知未执行，不能当作已通过。
    const deferredSlow=(report?.plan?.selection?.omitted||[]).filter(item=>item.reason==='deferred-slow-check');
    if(deferredSlow.length)process.stderr.write(`已延后 ${deferredSlow.length} 项慢检查（未执行，不代表通过；YSS_VERIFY_SLOW=1 或 ci-gate --mode slow 执行）: ${deferredSlow.map(item=>item.id).join(', ')}\n`);
    if(session)try{session.recordEvent('unexecuted',report?.unexecuted||[]);session.registerFiles(reportDir||session.runDir);session.finish({status:report?.status||'failed',exitCode:exit,report});session.close();}catch(error){if(report){report.status='failed';report.error=[report.error,error.message].filter(Boolean).join('; ');}exit=1;try{session.close();}catch{}}
    if(report)try{if(reportDir)saveVerificationReport(reportDir,report);process.send?.({kind:'completed-report',report});}catch(error){process.stderr.write(`报告保存失败: ${error.message}\n`);exit=1;}
    process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);
    if(!reportDir&&logRoot&&!session&&!exit)fs.rmSync(logRoot,{recursive:true,force:true});
    process.exitCode=exit;
  }
}
export async function superviseVerificationWorker({argv=[],root=ROOT,controlled=null,environment=process.env,signal}={}) {
  const started=performance.now();let directory=null,report=null,spawnError='',cancelled=false,killErrors=[];const activeProcesses=new Set();
  const child=fork(workerFile,controlled?['--controlled-verification-worker']:argv,{cwd:root,env:environment,execArgv:[],detached:process.platform!=='win32',stdio:['ignore','inherit','inherit','ipc']});
  let escalation;
  const kill=sig=>{try{killTree(child,sig);}catch(error){killErrors.push(error.message);try{child.kill(sig);}catch(fallback){killErrors.push(fallback.message);}}};
  const interrupt=()=>{if(cancelled)return;cancelled=true;kill('SIGTERM');escalation=setTimeout(()=>kill('SIGKILL'),2500);};
  process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);signal?.addEventListener('abort',interrupt,{once:true});if(signal?.aborted)interrupt();
  child.on('message',message=>{if(message.kind==='command-process'&&Number.isInteger(message.pid)&&message.pid>0){if(message.active)activeProcesses.add(message.pid);else activeProcesses.delete(message.pid);}if(message.kind==='report-directory')directory=message.directory;if(message.kind==='completed-report')report=message.report;});
  child.on('error',error=>{spawnError=error.message;});
  if(controlled)child.send({kind:'controlled-plan',input:{...controlled,root,environment}});
  const outcome=await new Promise(resolve=>child.on('close',(code,exitSignal)=>resolve({code,signal:exitSignal,observed:!spawnError&&Number.isInteger(code)})));
  for(const pid of activeProcesses)try{if(process.platform==='win32')spawnSync('taskkill',['/PID',String(pid),'/T','/F'],{stdio:'ignore'});else process.kill(-pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')killErrors.push(error.message);}
  clearTimeout(escalation);signal?.removeEventListener('abort',interrupt);process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);
  let code=cancelled?130:outcome.observed?outcome.code:1;
  if(directory)try{report=JSON.parse(fs.readFileSync(path.join(directory,'report.json')));}catch(error){spawnError=[spawnError,error.message].filter(Boolean).join('; ');code=1;}
  if(report) {
    report.final_exit={...outcome};report.metrics.wall_ms=Math.round(performance.now()-started);
    if(outcome.code!==0||outcome.signal||!outcome.observed||spawnError||killErrors.length||cancelled){report.status=cancelled?'interrupted':'failed';report.error=[report.error,spawnError,...killErrors].filter(Boolean).join('; ')||`worker exit=${outcome.code} signal=${outcome.signal}`;code=code||1;}
    try{if(directory)saveVerificationReport(directory,report);}catch(error){report.status='failed';report.error=[report.error,`最终报告保存失败: ${error.message}`].filter(Boolean).join('; ');process.stderr.write(`最终报告保存失败: ${error.message}\n`);code=1;try{if(directory)saveVerificationReport(directory,report);}catch{}}
  }
  if(spawnError)process.stderr.write(`验证监督失败: ${spawnError}\n`);
  return {code,signal:outcome.signal,observed:outcome.observed,report,reportFile:directory?path.join(directory,'report.json'):null};
}
export async function executeVerificationPlan({root=ROOT,plan,reportDir,purpose,concurrency=1,toolingMode='legacy',environment=process.env,signal}={}) {
  if(purpose!=='diagnostic')throw new TypeError('受控计划 seam 只允许 diagnostic，不能作为发布入口');
  root=fs.realpathSync(root);
  validateVerificationReportDirectory(root,reportDir);
  return superviseVerificationWorker({root,environment,signal,controlled:{plan,reportDir,purpose,concurrency,toolingMode,scope:{kind:'complete-candidate',diagnostic:true},values:{'runtime-store':'off'},invocation:{command:'executeVerificationPlan',args:[]}}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===workerFile) {
  if(process.argv[2]==='--controlled-verification-worker') {
    process.once('message',async message=>{if(message.kind!=='controlled-plan'){process.exitCode=1;return;}await runPrepared(message.input);process.disconnect?.();});
  } else {
    try {
      const input=await prepare(process.argv.slice(2),process.cwd());
      if(input.help)process.stdout.write('用法: scripts/run-template-verification --profile fast|release [--base <完整SHA>] [--baseline-report <文件> --baseline-report-sha256 <摘要>] [--plan --json] [--report-dir <仓库外新目录>] [--concurrency 1..8] [--selection legacy|shadow|allowlist] [--fresh-inputs] [--ci-guards] [--ci-offline]\n--ci-guards 仅用于普通 fast，添加 CI 常驻守卫。\n--ci-offline 仅用于普通 fast，延后需要原生 CLI 或外部工具准备的检查及其消费者；结果不能代替完整验证。\nfast 默认按检查选择必要集合，报告范围 limited；legacy / shadow 显式使用原组范围。\n--fresh-inputs 禁用本次运行内的文件摘要复用；release 始终完整读取字节。\nrelease 必须提供上一正式发行 --base，覆盖全部真实变化并选择受影响检查，来源、安装与恢复要求保留；历史策略仅用于独立报告读取。\n');
      else if(input.values.plan)process.stdout.write(`${JSON.stringify(input.plan,null,input.values.json?2:0)}\n`);
      else await runPrepared(input);
    }catch(error){process.stderr.write(`模板核验失败: ${error.message}\n`);process.exitCode=1;}
    process.disconnect?.();
  }
}
