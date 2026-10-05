import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { verificationInputDigest } from '../../../scripts/lib/verification-report.mjs';
import {loadVerificationProfiles,planTemplateVerification} from '../../../scripts/lib/template-verification.mjs';
import {addVerificationExecutionTasks} from './verification-execution-plan.mjs';
import {compileLegacyPlan,verifyLegacyManifest} from './legacy-verification.mjs';
import {LEGACY_SOURCE_COMMIT,LEGACY_COVERAGE_DIGEST} from './verification-gates.mjs';
import {sourceTuple,collectReleaseSources,validateArtifact} from './verification-artifacts.mjs';
import {parseArgs} from 'node:util';
import {validateJsonSchema} from '../../../scripts/lib/json-schema.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ensure = (condition, message) => { if (!condition) throw new TypeError(message); };
const key = (task, index) => task.task_id || `index.${index}`;
const selected = (plan, mode) => plan.commands.map((task,index)=>({...task,index})).filter(task=>!task.when||task.when===mode);

/** Recompile from repository policy and consumer arguments, not report.plan. */
export function compileExpectedVerificationPlan({root,args=[],fixedCommit,config,baselineAssessment}={}){
 root=fs.realpathSync(root);
 const {values}=parseArgs({args,strict:true,options:{profile:{type:'string',default:'release'},base:{type:'string'},'changed-file':{type:'string',multiple:true},selection:{type:'string'},'report-dir':{type:'string'},'baseline-report':{type:'string'},'baseline-report-sha256':{type:'string'},'qualification-report':{type:'string'},'qualification-report-sha256':{type:'string'},'runtime-store':{type:'string'},concurrency:{type:'string'},'tooling-mode':{type:'string'},checkpoint:{type:'string',multiple:true},'task-package':{type:'string',multiple:true}}});
 const git=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});ensure(r.status===0,r.stderr||'无法独立编译验证计划');return r.stdout;};
 const files=new Set(values['changed-file']||[]);
 if(values.base)git(['diff','--name-only','-z','--no-renames','--diff-filter=ACDMRTUXB',`${values.base}...${fixedCommit||'HEAD'}`]).split('\0').filter(Boolean).forEach(file=>files.add(file));
 if(!fixedCommit)for(const argv of [['diff','--name-only','-z','--no-renames'],['diff','--cached','--name-only','-z','--no-renames'],['ls-files','-z','--others','--exclude-standard']])git(argv).split('\0').filter(Boolean).forEach(file=>files.add(file));
 config??=loadVerificationProfiles(fixedCommit?git(['show',`${fixedCommit}:.template-source/process/template-verification-profiles.yaml`]):fs.readFileSync(path.join(root,'.template-source/process/template-verification-profiles.yaml'),'utf8'));
 if(!baselineAssessment&&values.base&&values['baseline-report']&&values['baseline-report-sha256'])baselineAssessment=validateBaselineReport({root,base:values.base,reportFile:values['baseline-report'],expectedDigest:values['baseline-report-sha256']});
 const reference=values.profile==='legacy-full';
 let plan;
 if(reference){
  const bytes=fixedCommit?git(['show',`${fixedCommit}:.template-source/process/template-verification-legacy.json`]):fs.readFileSync(path.join(root,'.template-source/process/template-verification-legacy.json'),'utf8');
  const manifest=JSON.parse(bytes),{coverage_digest,...body}=manifest;
  ensure(manifest.source_commit===LEGACY_SOURCE_COMMIT&&coverage_digest===LEGACY_COVERAGE_DIGEST&&hash(JSON.stringify(body))===coverage_digest,'冻结 legacy manifest 摘要漂移');
  if(config.gate_policy?.legacy_manifest_digest)ensure(coverage_digest===config.gate_policy.legacy_manifest_digest,'固定 policy 的 legacy manifest 摘要漂移');
  verifyLegacyManifest(root,manifest);plan=compileLegacyPlan(manifest);
 }else plan=planTemplateVerification({root,config,profile:values.profile,changedFiles:[...files],base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256'],baselineAssessment,qualificationReport:values['qualification-report'],qualificationReportDigest:values['qualification-report-sha256'],...(values.selection?{selection:values.selection}:{})});
 return addVerificationExecutionTasks(plan,{root,reference,reportDir:values['report-dir']?path.resolve(values['report-dir']):null,purpose:'verification',checkpoints:values.checkpoint||[],taskPackages:values['task-package']||[]});
}

export function assertEvidenceFile(file, directory, expectedDigest) {
  ensure(typeof file === 'string' && file.length > 0, '验证日志引用缺失');
  const absolute = path.resolve(directory, file), relative = path.relative(path.resolve(directory), absolute);
  ensure(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), '验证日志越界');
  let current = absolute;
  while (true) {
    ensure(!fs.lstatSync(current).isSymbolicLink(), '验证日志不能使用符号链接');
    if (current === path.resolve(directory)) break;
    current = path.dirname(current);
  }
  ensure(fs.lstatSync(absolute).isFile(), '验证日志必须是普通文件');
  if (expectedDigest) ensure(hash(fs.readFileSync(absolute)) === expectedDigest.replace(/^sha256:/,''), '验证日志摘要漂移');
  return absolute;
}

/** expectedPlan is supplied by the consumer, never recovered from this report. */
export function validateVerificationReport(report, {root,expectedPlan,reportDirectory,expectedInvocation,currentInputDigest,observedExitCode,requireRelease=true,repositoryMode='template-source',historical=false,expectedSourcesManifest,expectedFamilies}={}) {
  ensure(report?.schema_version === 2 && report.kind === 'template-verification-report', '验证报告 v2 类型或版本不支持');
  validateJsonSchema(report,path.resolve(import.meta.dirname,'../../process/schemas/template-verification-report.schema.json'));
  ensure(report.status === 'passed', '验证报告未通过');
  if(!historical)ensure(report.root === fs.realpathSync(root), '验证报告属于其它源码');
  ensure(report.scope?.kind === 'complete-candidate', '验证范围不是完整候选');
  ensure(expectedPlan && Array.isArray(expectedPlan.commands), '独立期望任务台账缺失');
  ensure(report.plan && Array.isArray(report.plan.commands) && Array.isArray(report.results), '验证任务结果缺失');
  if (requireRelease) {
    ensure(report.plan.effective_profile === 'release' && report.purpose === 'verification', '验证报告必须使用 release profile 且不能为 qualification');
    ensure(report.plan.source_requirement === 'committed' && expectedPlan.source_requirement === 'committed', '发布验证必须绑定 committed 来源，不能用升级后的 fast 结果代替');
  }
  ensure(report.plan.strategy === expectedPlan.strategy && report.plan.policy_digest === expectedPlan.policy_digest, '验证策略或 policy 摘要不匹配');
  ensure(expectedInvocation && typeof expectedInvocation.command === 'string' && Array.isArray(expectedInvocation.args), '独立期望 invocation 缺失');
  assert.deepEqual(report.invocation, expectedInvocation, '验证 invocation 不匹配');
  ensure(report.final_exit?.observed === true && report.final_exit.code === 0 && report.final_exit.signal === null, '验证最终退出未观察或失败');
  if (observedExitCode !== undefined) ensure(observedExitCode === 0 && report.final_exit.code === observedExitCode, '外层实际退出与报告不匹配');
  ensure(Number.isFinite(Date.parse(report.started_at)) && Number.isFinite(Date.parse(report.finished_at)) && Date.parse(report.finished_at)>=Date.parse(report.started_at), '验证报告尚未完成或时间非法');
  ensure(report.input_drift === false && /^[a-f0-9]{64}$/.test(report.input_sha256) && report.input_after_sha256 === report.input_sha256, '验证输入漂移或摘要缺失');
  if (!historical) ensure(report.input_sha256 === (currentInputDigest || verificationInputDigest(root)), '验证源码已漂移');
  if(!expectedSourcesManifest&&!historical&&fs.existsSync(path.join(root,'.gitmodules'))){const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});ensure(head.status===0,'来源 HEAD 缺失');expectedSourcesManifest=collectReleaseSources({root,commit:head.stdout.trim()});}
  ensure(Array.isArray(report.unexecuted) && report.unexecuted.length === 0, '验证存在未执行任务');
  ensure((report.plan.selection?.effective !== 'allowlist' || report.plan.strategy === 'qualified-gates') && (report.plan.strategy==='qualified-gates'||!report.plan.selection?.omitted?.length), '未获资格的裁剪或遗漏');
  const expectedTasks=selected(expectedPlan,repositoryMode), actualTasks=selected(report.plan,repositoryMode);
  ensure(expectedTasks.length > 0 && actualTasks.length === expectedTasks.length, '验证任务集合不完整');
  const expectedKeys=expectedTasks.map(task=>key(task,task.index));
  ensure(new Set(expectedKeys).size===expectedKeys.length, '独立期望任务 ID 重复');
  assert.deepEqual(actualTasks.map(task=>key(task,task.index)),expectedKeys,'验证任务台账不匹配');
  ensure(report.results.length===expectedTasks.length,'结果包含未知或重复任务');
  if(expectedSourcesManifest){
    ensure(report.sources_manifest?.kind==='template-release-sources','精确来源清单缺失');
    assert.deepEqual(report.sources_manifest.entries.map(sourceTuple),expectedSourcesManifest.entries.map(sourceTuple),'精确来源 tuple 错配');
    assert.deepEqual(report.sources_manifest.families,expectedSourcesManifest.families,'实际 CLI 家族不匹配');
  }
  if(expectedFamilies)assert.deepEqual(report.sources_manifest?.families,expectedFamilies,'实际 CLI 家族不满足消费范围');
  const expectedGates=(expectedPlan.gates||[]).filter(g=>g.selected);
  assert.deepEqual(report.plan.gates||[],expectedPlan.gates||[],'验证 Gate 定义或全集不完整');
  assert.deepEqual((report.plan.gates||[]).filter(g=>g.selected).map(g=>g.id),expectedGates.map(g=>g.id),'验证 Gate 集合不完整');
  for (const task of expectedTasks) {
    const declared=actualTasks.find(row=>key(row,row.index)===key(task,task.index));
    assert.equal(declared.command,task.command,`验证任务内容不匹配: ${key(task,task.index)}`);assert.equal(declared.id,task.id,'验证 check ID 不匹配');
    assert.deepEqual(declared.gate_ids||[],task.gate_ids||[],'验证任务 Gate 归属不匹配');assert.deepEqual(declared.depends_on||[],task.depends_on||[],'验证任务依赖不匹配');
    const rows=report.results.filter(row=>task.task_id?row.task_id===task.task_id:row.index===task.index);
    ensure(rows.length===1,'验证任务结果缺失或重复');
    const row=rows[0];
    ensure(row.command===task.command && row.code===0 && !row.skipped && !row.storageError, '验证任务未通过');
    if (row.reused) {
      const origin=report.results.find(result=>row.reused_from?.task_id?result.task_id===row.reused_from.task_id:result.index===row.reused_from?.index);
      ensure(origin && origin!==row && !origin.reused && origin.command===row.command && origin.actual_exit_code_observed===true && origin.actual_exit_code===0 && !origin.actual_exit_signal, '复用任务没有同轮实际退出来源');
      ensure(row.stdoutFile===origin.stdoutFile && row.stderrFile===origin.stderrFile,'复用日志与实际执行不匹配');
    } else ensure(row.actual_exit_code_observed===true && row.actual_exit_code===0 && !row.actual_exit_signal, '任务实际退出未观察或失败');
    for (const name of ['stdoutFile','stderrFile']){ensure(/^[a-f0-9]{64}$/.test(row.log_digests?.[name]),'v2 日志摘要缺失');assertEvidenceFile(row[name],reportDirectory,row.log_digests[name]);}
  }
  for (const gate of expectedGates) {
    const expected=expectedTasks.filter(task=>task.gate_ids?.includes(gate.id)||gate.check_ids?.includes(task.id));
    ensure(expected.length>0,`Gate 没有执行任务: ${gate.id}`);
    const conclusion=report.gate_results?.find(row=>row.id===gate.id);
    ensure(conclusion?.status==='passed',`Gate 未通过: ${gate.id}`);
    assert.deepEqual(conclusion.task_ids,expected.map(task=>task.task_id||task.id),'Gate 任务证据不完整');
  }
  return {status:'passed',schema_version:2,tasks:expectedTasks.length,gates:expectedGates.length,input_sha256:report.input_sha256};
}

export function validateLegacyReport(report,{directory,expectedPlan,requireObserved=true,extraValidators=[]}={}) {
  ensure(report?.schema_version===1 && report.kind==='template-verification-report' && report.status==='passed','历史全量报告未通过或版本不支持');
  ensure(report.scope?.kind==='complete-candidate' && report.plan?.effective_profile==='release' && report.plan.selection?.effective!=='allowlist' && report.plan.selection?.omitted?.length===0,'历史报告不是完整发布集合');
  ensure(report.input_drift===false && /^[a-f0-9]{64}$/.test(report.input_sha256) && report.input_after_sha256===report.input_sha256,'历史报告输入漂移');
  ensure(Number.isFinite(Date.parse(report.started_at))&&Number.isFinite(Date.parse(report.finished_at)),'历史报告尚未完成');
  ensure(Array.isArray(report.unexecuted)&&report.unexecuted.every(row=>row.reason==='repository-mode'),'历史报告存在未执行命令');
  ensure(report.plan.commands?.length>0&&Array.isArray(report.results),'历史报告执行记录缺失');
  ensure(expectedPlan?.commands?.length>0,'历史报告缺少独立期望全量集合');
  assert.deepEqual(report.plan.commands.map(row=>row.command),expectedPlan.commands.map(row=>row.command),'历史期望全量任务不匹配');
  for(const [index,command] of report.plan.commands.entries()) {
    if(command.when&&command.when!=='template-source')continue;
    const rows=report.results.filter(result=>result.index===index&&result.group!=='postchecks');ensure(rows.length===1,'历史任务结果缺失或重复');const row=rows[0];
    ensure(row&&row.command===command.command&&row.code===0&&!row.skipped&&!row.storageError,'历史任务执行不完整');
    if(requireObserved)ensure(row.actual_exit_code_observed===true&&row.actual_exit_code===0&&!row.actual_exit_signal,'历史实际退出未观察');
    for(const file of [row.stdoutFile,row.stderrFile])assertEvidenceFile(file,directory);
  }
  assert.deepEqual(report.plan.syntax_files||[],expectedPlan.syntax_files||[],'历史 syntax 清单不完整');
  const post=report.results.filter(row=>row.group==='postchecks');
  const expectedPost=[...(expectedPlan.syntax_files||[]).map(file=>({command:'node',args:['--check',file]})),...extraValidators,{command:'git',args:['diff','--check']}];
  ensure(post.length===expectedPost.length,'历史 syntax 或终检执行结果不完整');
  ensure(report.results.length===expectedPlan.commands.filter(command=>!command.when||command.when==='template-source').length+expectedPost.length,'历史报告包含未知任务');
  for(const [index,expected] of expectedPost.entries()){
    const row=post[index];let argv;try{argv=JSON.parse(row.command);}catch{throw new TypeError('历史终检命令格式无效');}
    ensure(Array.isArray(argv)&&path.basename(argv[0]).replace(/\.exe$/,'')===expected.command&&row.code===0&&!row.storageError&&!row.skipped,'历史终检没有真实通过');
    assert.deepEqual(argv.slice(1),expected.args,'历史终检参数或顺序不匹配');
    ensure(row.actual_exit_code_observed===true&&row.actual_exit_code===0&&!row.actual_exit_signal,'历史终检实际退出未观察');
    for(const file of [row.stdoutFile,row.stderrFile])assertEvidenceFile(file,directory);
  }
  return report;
}

export function validateBaselineReport({root,base,reportFile,expectedDigest,expectedPlan}={}) {
  try {
    root=fs.realpathSync(root);
    ensure(/^[a-f0-9]{40}$/.test(base),'baseline 必须为完整 SHA');
    ensure(typeof reportFile==='string'&&path.isAbsolute(reportFile),'baseline-report 必须为绝对路径');
    const directory=fs.realpathSync(path.dirname(reportFile));reportFile=path.join(directory,path.basename(reportFile));assertEvidenceFile(reportFile,directory,expectedDigest);
    ensure(/^(?:sha256:)?[a-f0-9]{64}$/.test(expectedDigest),'baseline 报告摘要缺失');
    const outer=JSON.parse(fs.readFileSync(reportFile,'utf8'));
    ensure([1,2].includes(outer.schema_version)&&(outer.schema_version===1||outer.kind==='template-release-verification')&&outer.purpose!=='qualification','baseline 不是受支持的 verification 发布报告');
    ensure(outer.status==='passed'&&outer.requested_commit===base&&outer.template_commit===base,'baseline 提交未绑定通过报告');
    ensure(outer.commands?.length>0&&outer.commands.every(row=>row.exit_code===0),'baseline 外层实际命令未通过');
    for(const command of outer.commands){if(outer.schema_version===2)ensure(command.actual_exit_code_observed===true&&command.actual_exit_code===0&&!command.actual_exit_signal,'baseline 外层实际退出未观察');assertEvidenceFile(command.log,directory,command.log_sha256);}
    const fullFile=outer.full_verification?.report;assertEvidenceFile(fullFile,directory,outer.full_verification?.report_sha256);
    const full=JSON.parse(fs.readFileSync(fullFile,'utf8'));
    const invocation=outer.commands.find(row=>row.command==='scripts/verify-template');
    ensure(invocation&&Array.isArray(invocation.args),'baseline 原始 invocation 缺失');
    const previousIndex=invocation.args.indexOf('--base');
    if(previousIndex!==-1){const previous=invocation.args[previousIndex+1];ensure(/^[a-f0-9]{40}$/.test(previous)&&previous!==base,'baseline 链必须指向更早的完整 SHA');const lineage=spawnSync('git',['merge-base','--is-ancestor',previous,base],{cwd:root});ensure(lineage.status===0,'baseline 链不是固定报告提交的祖先');}
    if(full.schema_version===1){
      if(!expectedPlan){const r=spawnSync('git',['show',`${base}:.template-source/process/template-verification-profiles.yaml`],{cwd:root,encoding:'utf8'});ensure(r.status===0,'历史固定提交缺少独立全量策略');const config=loadVerificationProfiles(r.stdout);expectedPlan=planTemplateVerification({root,config,profile:'release',changedFiles:[]});}
      const extraValidators=[];
      for(let index=0;index<invocation.args.length;index++)if(['--checkpoint','--task-package'].includes(invocation.args[index])){
        const flag=invocation.args[index],file=invocation.args[++index];ensure(typeof file==='string'&&!file.startsWith('--'),'历史终检参数缺失');
        extraValidators.push({command:flag==='--checkpoint'?'verify-maintenance-checkpoint':'verify-digital-human-task-package',args:[file]});
      }
      validateLegacyReport(full,{directory:path.dirname(fullFile),expectedPlan,extraValidators});
    }
    else {
      expectedPlan??=compileExpectedVerificationPlan({root,args:invocation.args,fixedCommit:base});
      const fixedSources=collectReleaseSources({root,commit:base});
      validateVerificationReport(full,{root:full.root,expectedPlan,reportDirectory:path.dirname(fullFile),expectedInvocation:{command:path.join(full.root,'scripts/run-template-verification'),args:['--profile','release',...invocation.args]},historical:true,expectedSourcesManifest:fixedSources});
    }
    const ancestor=spawnSync('git',['merge-base','--is-ancestor',base,'HEAD'],{cwd:root});ensure(ancestor.status===0,'baseline 不是当前祖先');
    const sources=collectReleaseSources({root,commit:base,families:outer.cli_families||['spec']});
    if(outer.sources_manifest)assert.deepEqual(outer.sources_manifest.entries.map(sourceTuple),sources.entries.map(sourceTuple),'baseline 精确来源错配');
    return {valid:true,reasons:[],bindings:{base_sha:base,report_digest:hash(fs.readFileSync(reportFile)),report_file:reportFile,report_schema:outer.schema_version,strategy:full.schema_version===1||full.plan.strategy==='legacy-reference'?'legacy-full':full.plan.strategy,policy_digest:full.plan.policy_digest,sources_manifest:sources}};
  } catch(error) {return {valid:false,reasons:[error.message],bindings:null};}
}

export function validateQualificationIntegration({root,reportFile,expectedDigest,expectedCommit}={}){
 try{
  ensure(typeof reportFile==='string'&&path.isAbsolute(reportFile)&&/^(?:sha256:)?[a-f0-9]{64}$/.test(expectedDigest),'integration 报告路径或摘要缺失');
  const directory=fs.realpathSync(path.dirname(reportFile));reportFile=path.join(directory,path.basename(reportFile));assertEvidenceFile(reportFile,directory,expectedDigest);
  const report=JSON.parse(fs.readFileSync(reportFile,'utf8')),commit=expectedCommit||report.requested_commit;
  ensure(report.schema_version===2&&report.kind==='template-release-verification'&&report.status==='passed'&&report.requested_commit===commit&&report.template_commit===commit,'integration 来源或结论未绑定');
  const families=['spec','design','backend','frontend'];assert.deepEqual(report.cli_families,families,'integration 未覆盖 all-four');
  const expected=collectReleaseSources({root,commit,families});
  assert.deepEqual(report.sources_manifest?.families,families,'integration 来源家族缺失');assert.deepEqual(report.sources_manifest?.entries?.map(sourceTuple),expected.entries.map(sourceTuple),'integration 精确来源错配');
  ensure(report.artifacts?.length===4&&report.cli_integrations?.length===4,'integration 缺少包或迁移真实产物');
  const commands=[...new Map([...(report.commands||[]),...report.artifacts.flatMap(row=>row.command_records||[]),...report.cli_integrations.flatMap(row=>row.command_records||[])].map(row=>[row.stdoutFile||path.resolve(directory,row.log||''),row])).values()];
  ensure(commands.length>0,'integration 没有实际命令');
  for(const row of commands){
   ensure(row.actual_exit_code_observed===true&&row.actual_exit_code===0&&!row.actual_exit_signal,'integration 命令实际退出未观察或失败');
   if(row.log)assertEvidenceFile(row.log,directory,row.log_sha256);
   else for(const [field,digestField] of [['stdoutFile','stdout_sha256'],['stderrFile','stderr_sha256']])assertEvidenceFile(row[field],directory,row[digestField]||row.log_digests?.[field]);
  }
  const requiredCases=['init','doctor','diff','sync-dry-run','sync-apply','migration-plan-read-only','migration-apply','idempotency','rollback','user-file-preservation'];
  for(const source of expected.entries){
   const artifacts=report.artifacts.filter(row=>row.source_tuple?.family===source.family);ensure(artifacts.length===1,'integration 包家族重复或缺失');validateArtifact(artifacts[0],source);
   const integrations=report.cli_integrations.filter(row=>row.family===source.family);ensure(integrations.length===1&&integrations[0].status==='passed','integration 迁移家族重复或未通过');
   ensure(requiredCases.every(value=>integrations[0].cases?.includes(value)),'integration 迁移风险未覆盖');
   const entry=path.join(artifacts[0].installed_root,'bin',`${source.package_name}.js`);
   const calls=commands.filter(row=>Array.isArray(row.args)&&row.args.includes(entry));
   ensure(calls.some(row=>!['doctor','diff','sync','migrate'].includes(row.args[1]))&&['doctor','diff','sync'].every(value=>calls.some(row=>row.args[1]===value)),'integration 缺少实际安装入口验收');
   ensure(calls.filter(row=>row.args[1]==='migrate'&&row.args[2]==='plan').length>=2&&calls.filter(row=>row.args[1]==='migrate'&&row.args[2]==='apply').length>=2&&calls.some(row=>row.args[1]==='migrate'&&row.args[2]==='rollback'&&row.args.includes('--apply')),'integration 缺少迁移幂等或回滚真实命令');
   ensure(commands.filter(row=>(row.command||row.file)==='npm'&&row.args?.[0]==='pack'&&row.cwd===artifacts[0].cli_root).length===1,'integration 同精确来源必须恰好一次 npm pack');
   ensure(commands.some(row=>(row.command||row.file)==='npm'&&row.args?.[0]==='install'&&row.args.includes(artifacts[0].packed_tarball_path||artifacts[0].tarball)),'integration 缺少真实 npm install');
  }
  return {valid:true,reasons:[],bindings:{families,root_commit:commit,sources_manifest:expected,report_digest:hash(fs.readFileSync(reportFile))}};
 }catch(error){return {valid:false,reasons:[error.message],bindings:null};}
}
