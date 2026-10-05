import {fork,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {runGroups,printResults,runCommandToFiles} from '../../../scripts/lib/template-verification-runner.mjs';
import {verificationInputDigest,resolveVerificationScope,createVerificationReport,finalizeVerificationReport,saveVerificationReport} from '../../../scripts/lib/verification-report.mjs';
import {beginRuntimeRun} from '../../../scripts/lib/runtime-store.mjs';
import {validateVerificationReportDirectory} from './verification-preflight.mjs';
import {compileLegacyPlan,loadLegacyReferenceRunner} from './legacy-verification.mjs';
import {killTree} from '../../../scripts/lib/command-runner.mjs';
import {validateReceipt} from './verification-delivery-run.mjs';
import {addVerificationExecutionTasks,compileTaskExecution} from './verification-execution-plan.mjs';
import {validateCliSourceConsumer,validateArtifact} from './verification-artifacts.mjs';
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
const options={help:{type:'boolean',default:false},profile:{type:'string',default:'fast'},base:{type:'string'},'changed-file':{type:'string',multiple:true},selection:{type:'string'},'report-dir':{type:'string'},'baseline-report':{type:'string'},'baseline-report-sha256':{type:'string'},'qualification-report':{type:'string'},'qualification-report-sha256':{type:'string'},'runtime-store':{type:'string',default:'off'},plan:{type:'boolean',default:false},json:{type:'boolean',default:false},concurrency:{type:'string'},'tooling-mode':{type:'string'},checkpoint:{type:'string',multiple:true},'task-package':{type:'string',multiple:true}};
export function validateVerificationArguments(values) {
  if(values.base!==undefined&&!/^[a-f0-9]{40}$/.test(values.base))throw new TypeError('--base 必须为完整 40 位 SHA');
  for(const [report,digest]of [['baseline-report','baseline-report-sha256'],['qualification-report','qualification-report-sha256']]){
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
async function prepare(argv,root) {
  const {values}=parseArgs({args:argv,options,strict:true});
  validateVerificationArguments(values);
  if(values.help)return {help:true,values};
  if(values.profile==='legacy-full'){
    const {assertBaselineParameters}=await import('./verification-baseline.mjs');
    const {assertQualificationReportParameters}=await import('./verification-gates.mjs');
    assertBaselineParameters({root,base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256']});
    assertQualificationReportParameters({qualificationReport:values['qualification-report'],qualificationReportDigest:values['qualification-report-sha256']});
  }
  const {planTemplateVerification,loadVerificationProfiles}=await import('../../../scripts/lib/template-verification.mjs');
  const explicit=values['changed-file']||[],requested=values.profile==='legacy-full'?'release':values.profile;
  const scope=resolveVerificationScope({profile:requested,explicit,actual:changedFiles(root,values.base)});scope.base=values.base||null;
  let assessment;
  if(values.base&&values['baseline-report']&&values['baseline-report-sha256']) {
    const {validateBaselineReport}=await import('./verification-report-validator.mjs');
    assessment=validateBaselineReport({root,base:values.base,reportFile:values['baseline-report'],expectedDigest:values['baseline-report-sha256']});
    if(values.profile==='legacy-full'&&!assessment.valid)throw new TypeError(`BASELINE_REPORT_INVALID: ${(assessment.reasons||[]).join(', ')}`);
  }
  let qualificationAssessment;
  if(values['qualification-report']) {
    const config=loadVerificationProfiles();
    const {verificationPolicyDigest,loadLegacyManifest}=await import('./verification-gates.mjs');
    const {qualificationBindings,validateQualification}=await import('./verification-qualification.mjs');
    const expectedBindings=qualificationBindings({root,config,policyDigest:verificationPolicyDigest(config),legacyManifestDigest:loadLegacyManifest(root).coverage_digest});
    qualificationAssessment=validateQualification({root,config,reportFile:values['qualification-report'],expectedDigest:values['qualification-report-sha256'],expectedBindings});
    if(values.profile==='legacy-full'&&!qualificationAssessment.valid)throw new TypeError(`QUALIFICATION_REPORT_INVALID: ${(qualificationAssessment.reasons||[]).join(', ')}`);
  }
  let plan;
  if(values.profile==='legacy-full')plan=compileLegacyPlan(JSON.parse(fs.readFileSync(path.join(root,'.template-source/process/template-verification-legacy.json'))));
  else plan=planTemplateVerification({profile:requested,changedFiles:scope.files,root,base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256'],baselineAssessment:assessment,qualificationAssessment,qualificationReport:values['qualification-report'],qualificationReportDigest:values['qualification-report-sha256'],...(values.selection?{selection:values.selection}:{})});
  if(requested==='candidate'&&!values.base&&!plan.strategy) {plan=planTemplateVerification({profile:'release',changedFiles:scope.files,root});plan.requested_profile='candidate';plan.escalation_reason='未指定候选基线，使用全量验证防止遗漏已提交改动';}
  plan.scope=scope;
  const requestedConcurrency=Number(values.concurrency||plan.max_concurrency||1);if(!Number.isInteger(requestedConcurrency)||requestedConcurrency<1||requestedConcurrency>4)throw new TypeError('concurrency 必须为 1..4');
  const legacy=plan.strategy==='legacy-full'||plan.strategy==='legacy-reference'||plan.effective_profile==='release'&&plan.strategy!=='qualified-gates';
  const concurrency=legacy?1:requestedConcurrency,requestedMode=values['tooling-mode']||'legacy';
  if(!['legacy','optimized'].includes(requestedMode))throw new TypeError('tooling-mode 必须为 legacy 或 optimized');
  if(plan.strategy==='qualified-gates'){
    const {assertQualificationExecutionContract}=await import('./verification-report-validator.mjs');
    assertQualificationExecutionContract(plan,{concurrency:requestedConcurrency,toolingMode:requestedMode,testConcurrency:requestedMode==='legacy'?1:Math.min(2,requestedConcurrency)});
  }
  const mode=legacy?'legacy':requestedMode;
  plan.tooling={requested_mode:requestedMode,effective_mode:mode,verification_concurrency:concurrency,test_concurrency:mode==='legacy'?1:Math.min(2,concurrency),reason:legacy?'legacy-reference-serial':requestedMode==='optimized'?'explicit-qualified-execution':'legacy-tooling'};
  const reportDir=validateVerificationReportDirectory(root,values['report-dir']||path.join(fs.realpathSync(os.tmpdir()),`yss-template-verification-${randomUUID()}`));
  plan=addVerificationExecutionTasks(plan,{root,reference:plan.strategy==='legacy-reference',checkpoints:values.checkpoint,taskPackages:values['task-package'],reportDir});
  return {values,plan,scope,root,reportDir,concurrency,toolingMode:mode,purpose:'verification',invocation:{command:path.join(root,'scripts/run-template-verification'),args:argv}};
}
export {prepare as prepareVerificationPlan};
async function runPrepared(input) {
  const {root,reportDir,concurrency=1,toolingMode='legacy',purpose='verification',scope={kind:'complete-candidate'},invocation=null,values={},environment:providedEnvironment=process.env}=input;
  const controller=new AbortController(),interrupt=()=>controller.abort();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
  let report,logRoot,session,reference,sourceReceipt,started=performance.now(),before,exit=0,preparationStarted=false;
  const errors=[];
  const environment={...providedEnvironment,PYTHONDONTWRITEBYTECODE:'1',YSS_TEMPLATE_CONCURRENCY:String(concurrency),YSS_TOOLING_MODE:toolingMode,YSS_TOOLING_CONCURRENCY:String(toolingMode==='optimized'?Math.min(2,concurrency):1),...(reportDir?{YSS_TOOLING_REPORT_DIR:path.join(reportDir,'tooling')}:{})};
  let mode='template-source',plan=input.plan;
  try {
    if(reportDir)validateVerificationReportDirectory(root,reportDir);
    const modeResult=spawnSync(process.execPath,[path.join(root,'scripts/repository-mode')],{cwd:root,env:environment,encoding:'utf8'});
    if(modeResult.status!==0)throw new TypeError(modeResult.stderr||'仓库身份校验失败');mode=modeResult.stdout.trim();
    plan=addVerificationExecutionTasks(plan,{root,repositoryMode:mode,reference:plan.strategy==='legacy-reference',checkpoints:values.checkpoint,taskPackages:values['task-package'],purpose,reportDir});
    before=verificationInputDigest(root);
    report=createVerificationReport(plan,{root,inputDigest:before,concurrency,scope,invocation});report.purpose=purpose;report.experimental=purpose==='qualification';
    report.environment.repository_mode=mode;
    report.environment.tooling_mode=toolingMode;
    report.environment.test_concurrency=toolingMode==='optimized'?Math.min(2,concurrency):1;
    if(reportDir){fs.mkdirSync(reportDir);saveVerificationReport(reportDir,report);process.send?.({kind:'report-directory',directory:reportDir});}
    logRoot=reportDir?path.join(reportDir,'logs'):fs.mkdtempSync(path.join(os.tmpdir(),'yss-template-verification-'));
    const preflightTask=plan.commands.find(task=>task.kind==='preflight');
    const preflightRow=await runCommandToFiles(preflightTask.command,{cwd:root,environment,logRoot,sequence:'preflight',signal:controller.signal,onProcess:event=>process.send?.({kind:'command-process',...event})});
    preflightRow.id=preflightTask.id;preflightRow.task_id=preflightTask.task_id;preflightRow.gate_ids=preflightTask.gate_ids;preflightRow.group=preflightTask.group;preflightRow.index=plan.commands.indexOf(preflightTask);preflightRow.reused=false;
    preflightRow.log_digests=Object.fromEntries(['stdoutFile','stderrFile'].map(key=>[key,hash(fs.readFileSync(preflightRow[key]))]));
    report.results.push(preflightRow);if(reportDir)saveVerificationReport(reportDir,report);
    try{report.preflight=JSON.parse(fs.readFileSync(preflightRow.stdoutFile,'utf8'));}catch(error){throw new Error(`环境预检没有结构化结果: ${error.message}`);}
    if(preflightRow.code!==0||preflightRow.storageError||report.preflight.status!=='passed')throw new Error(`环境预检失败: ${(report.preflight.errors||[]).map(row=>`${row.name}: ${row.error}`).join('; ')}`);
    report.sources_manifest=report.preflight.sources_manifest||null;
    const missing=(plan.required_files||[]).filter(ref=>!fs.existsSync(path.join(root,ref)));if(missing.length)throw new Error(`缺少模板必需文件: ${missing.join(', ')}`);
    const runtimeMode=values['runtime-store']||'off';if(!['off','sqlite'].includes(runtimeMode))throw new TypeError('runtime-store 必须为 sqlite 或 off');
    session=beginRuntimeRun({root,kind:'template-verification',mode:runtimeMode,input:{input_sha256:before,plan},reportDir});
    const onResult=row=>{row.log_digests=Object.fromEntries(['stdoutFile','stderrFile'].filter(key=>row[key]&&fs.existsSync(row[key])).map(key=>[key,hash(fs.readFileSync(row[key]))]));report.results.push(row);if(row.storageError)errors.push(row.storageError);if(reportDir)saveVerificationReport(reportDir,report);};
    const legacyReference=plan.strategy==='legacy-reference';
    if(legacyReference)reference=await loadLegacyReferenceRunner(root,JSON.parse(fs.readFileSync(path.join(root,'.template-source/process/template-verification-legacy.json'))));
    if(reference)report.legacy_reference=reference.binding;
    const validateSource=()=>{
      if(!sourceReceipt)throw new TypeError('SOURCE_TEST_RECEIPT_MISSING');
      const receiptFile=path.join(reportDir,'consumption/source-test-receipt.json'),binding=report.source_test_receipts?.find(row=>row.ref===receiptFile);
      if(!binding||hash(fs.readFileSync(receiptFile))!==binding.sha256)throw new TypeError('SOURCE_TEST_RECEIPT_DRIFT');
      validateCliSourceConsumer(sourceReceipt,{root,expectedSource:report.sources_manifest.entries.find(row=>row.family==='spec'),directory:path.join(reportDir,'consumption/source-cli/spec'),artifact:report.artifacts.find(row=>row.source_tuple?.family==='spec')});
    };
    const executeFor=phase=>async(command,options)=>{
      // Tooling owns a per-file timeout. Never apply the 600s file budget to
      // its full multi-file preparation/test driver. Phase prefixes keep
      // separate scheduler invocations from overwriting each other's logs.
      const candidates=plan.commands.filter(task=>task.command===command),task=options.task||candidates[0];
      if(!task)throw new TypeError('ACTUAL_EXECUTION_TASK_MISSING');
      let execution=compileTaskExecution(task,{root,reportDir,sourceReceipt});
      if(execution?.source_consumer_ref){validateSource();execution={...execution,source_receipt_sha256:report.source_test_receipts.find(row=>row.ref===execution.source_consumer_ref).sha256};}
      const row=await runCommandToFiles(command,{...options,execution,sequence:`${phase}-${options.sequence}`,onProcess:event=>process.send?.({kind:'command-process',...event}),timeoutMs:/pnpm.*\.template-source\/tooling\/node\s+test/.test(command)?0:options.timeoutMs});
      if(execution?.source_consumer_ref)try{validateSource();}catch(error){row.code=1;row.error=[row.error,error.message].filter(Boolean).join('; ');}
      return row;
    };
    const preparationTasks=plan.commands.filter(task=>task.group==='artifact-preparation');
    if(preparationTasks.length){
      preparationStarted=true;
      const preparationPlan={...plan,strategy:'qualified-gates',groups:['artifact-preparation'],commands:preparationTasks};
      const prepIndexes=new Map(plan.commands.map((task,index)=>[task.task_id||task.id,index]));
      await runGroups(preparationPlan,mode,concurrency,{cwd:root,environment,execute:executeFor('artifact'),logRoot,signal:controller.signal,runtimeSession:session,runtimeEvent:'check-result',completedTasks:[{task:preflightTask,result:preflightRow}],onResult:row=>{
        const task=preparationPlan.commands[row.index];
        if(row.code===0&&!row.skipped&&!row.storageError)try{
          if(task.kind==='artifact-prepare'&&/^check\.cli-artifact-(?:spec|design|backend|frontend)$/.test(task.id)){
            const family=task.id.replace('check.cli-artifact-',''),artifact=JSON.parse(fs.readFileSync(path.join(reportDir,'artifacts',family,'artifact.json')));
            validateArtifact(artifact,report.sources_manifest.entries.find(source=>source.family===family));
            report.artifacts=[...(report.artifacts||[]).filter(existing=>existing.source_tuple?.family!==family),artifact];
          }
          if(task.kind==='artifact-consumers'){const receipt=validateReceipt(JSON.parse(fs.readFileSync(task.receipt_file)),{root,receiptFile:task.receipt_file,expectedSourcesManifest:report.sources_manifest});Object.assign(environment,receipt.environment);report.artifacts=receipt.artifacts;report.sources_manifest=receipt.sources_manifest;report.artifact_receipt={ref:task.receipt_file,sha256:hash(fs.readFileSync(task.receipt_file))};}
          if(task.kind==='source-test-consumer'){sourceReceipt=JSON.parse(fs.readFileSync(task.receipt_file));report.source_test_receipts=[{ref:task.receipt_file,sha256:hash(fs.readFileSync(task.receipt_file))}];validateSource();}
        }catch(error){row.code=1;row.error=[row.error,error.message].filter(Boolean).join('; ');}
        onResult({...row,index:prepIndexes.get(task.task_id),task_id:task.task_id,gate_ids:task.gate_ids});
      }});
    }
    const completedTasks=[preflightTask,...preparationTasks].map(task=>({task,result:report.results.find(row=>row.task_id===task.task_id)}));
    const completedIds=new Set(completedTasks.map(row=>row.task.id));
    const primary={...plan,commands:plan.commands.filter(task=>task.kind!=='preflight'&&task.kind!=='cleanup'&&task.group!=='artifact-preparation'&&(!legacyReference||task.group!=='postchecks')).map(task=>({...task,depends_on:legacyReference?(task.depends_on||[]).filter(id=>!completedIds.has(id)):task.depends_on})),groups:plan.groups.filter(group=>group!=='preflight'&&group!=='artifact-preparation'&&group!=='cleanup'&&(!legacyReference||group!=='postchecks'))};
    const execute=executeFor('check');
    const originalIndexes=new Map(plan.commands.map((task,index)=>[task.task_id||task.id,index]));
    const collect=row=>{const task=primary.commands[row.index];const adjusted={...row,id:task.id,task_id:task.task_id,gate_ids:task.gate_ids||[],index:originalIndexes.get(task.task_id||task.id)};if(row.reused){const origin=report.results.find(result=>!result.reused&&result.command===row.command&&result.stdoutFile===row.stdoutFile&&result.stderrFile===row.stderrFile);if(!origin)throw new Error('复用任务缺少同轮实际结果');adjusted.reused_from={id:origin.id,task_id:origin.task_id,index:origin.index};}onResult(adjusted);};
    const groups=await (reference?.runGroups||runGroups)(primary,mode,concurrency,{cwd:root,environment,execute,logRoot,signal:controller.signal,runtimeSession:session,runtimeEvent:'check-result',completedTasks:legacyReference?[]:completedTasks,onResult:collect});
    await printResults(groups);
    if(legacyReference&&!groups.flatMap(group=>group.results).some(row=>row.code!==0||row.storageError)&&!controller.signal.aborted) {
      for(const task of plan.commands.filter(task=>task.group==='postchecks')) {
        if(controller.signal.aborted)break;
        const row=await executeFor('post')(task.command,{task,cwd:root,environment,logRoot,sequence:originalIndexes.get(task.task_id),signal:controller.signal,runtimeSession:session});
        onResult({...row,id:task.id,task_id:task.task_id,gate_ids:task.gate_ids,group:task.group,index:originalIndexes.get(task.task_id),reused:false});
        if(row.code!==0||row.storageError)break;
      }
    }
    if(errors.length)throw new Error(`运行存储异常: ${errors.join('; ')}`);
    if(controller.signal.aborted){exit=130;throw new Error('验证被中断');}
    const failed=report.results.find(row=>row.code!==0||row.skipped);if(failed)throw new Error(`检查失败: ${failed.command}`);
    if(verificationInputDigest(root)!==before)throw new Error('核验命令修改了工作树；检查必须只读');
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
    if(report)try{report.input_after_sha256=verificationInputDigest(root);report.input_drift=report.input_after_sha256!==before;if(report.input_drift){report.status='failed';report.error=[report.error,'验证输入变化'].filter(Boolean).join('; ');exit=1;}}catch(error){report.status='failed';report.error=error.message;exit=1;}
    if(report){finalizeVerificationReport(report,{status:report.status,error:report.error,wallMs:Math.round(performance.now()-started),repositoryMode:mode});if(report.status==='passed'&&report.unexecuted.length){report.status='failed';report.error='存在未执行的选中任务';exit=1;}}
    if(session)try{session.recordEvent('unexecuted',report?.unexecuted||[]);session.registerFiles(reportDir||session.runDir);session.finish({status:report?.status||'failed',exitCode:exit,report});session.close();}catch(error){if(report){report.status='failed';report.error=[report.error,error.message].filter(Boolean).join('; ');}exit=1;try{session.close();}catch{}}
    if(report)try{if(reportDir)saveVerificationReport(reportDir,report);process.send?.({kind:'completed-report',report});}catch(error){process.stderr.write(`报告保存失败: ${error.message}\n`);exit=1;}
    try{reference?.dispose();}catch(error){process.stderr.write(`legacy reference 清理失败: ${error.message}\n`);process.exitCode=1;exit=1;}
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
  if(purpose!=='qualification')throw new TypeError('受控计划 seam 只允许 qualification，不能作为发布入口');
  root=fs.realpathSync(root);
  validateVerificationReportDirectory(root,reportDir);
  return superviseVerificationWorker({root,environment,signal,controlled:{plan,reportDir,purpose,concurrency,toolingMode,scope:{kind:'complete-candidate',qualification:true},values:{'runtime-store':'off'},invocation:{command:'executeVerificationPlan',args:[]}}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===workerFile) {
  if(process.argv[2]==='--controlled-verification-worker') {
    process.once('message',async message=>{if(message.kind!=='controlled-plan'){process.exitCode=1;return;}await runPrepared(message.input);process.disconnect?.();});
  } else {
    try {
      const input=await prepare(process.argv.slice(2),process.cwd());
      if(input.help)process.stdout.write('用法: scripts/run-template-verification --profile fast|candidate|release|legacy-full [--base <完整SHA>] [--baseline-report <文件> --baseline-report-sha256 <摘要>] [--plan --json] [--report-dir <仓库外新目录>] [--concurrency 1..4]\nlegacy-full 独立执行冻结旧runner；qualified Gate 只在固定基线和当前资格证据有效时启用。\n');
      else if(input.values.plan)process.stdout.write(`${JSON.stringify(input.plan,null,input.values.json?2:0)}\n`);
      else await runPrepared(input);
    }catch(error){process.stderr.write(`模板核验失败: ${error.message}\n`);process.exitCode=1;}
    process.disconnect?.();
  }
}
