import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {collectReleaseSources, produceCliArtifact, prepareArtifactConsumers, verifyInstalledCliMigration, validateArtifact, sourceTuple} from './verification-artifacts.mjs';

const entry=fileURLToPath(import.meta.url);
const families=['spec','design','backend','frontend'];
const gates={spec:'check.verification-spec-cli',design:'check.verification-design-cli',backend:'check.verification-backend-cli',frontend:'check.verification-frontend-cli'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;
const ensure=(condition,message)=>{if(!condition)throw new TypeError(message);};
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function outside(root,directory){
  ensure(path.isAbsolute(directory),'产物目录必须为绝对路径');
  const relative=path.relative(fs.realpathSync(root),directory);
  ensure(relative==='..'||relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative),'产物目录必须位于源码仓库外');
}

/** Supplemental four-family tasks remain individually visible beside the old coverage. */
export function compileDeliveryPreparationTasks(plan,{root,reportDir}={}) {
  const enabled=plan.strategy==='qualification-shadow'||plan.strategy==='legacy-reference'||plan.strategy==='qualified-gates'&&plan.effective_profile==='release';
  if(!enabled)return {tasks:[],families:[],receiptFile:null,artifactDirectory:null};
  ensure(reportDir,'四 CLI 固定来源验证需要独立报告目录');outside(root,reportDir);
  const artifactDirectory=path.join(reportDir,'artifacts'),receiptFile=path.join(reportDir,'consumption','receipt.json');
  const candidateEntry=path.join(root,'.template-source/scripts/lib/verification-delivery-run.mjs');
  const command=(action,family)=>[process.execPath,candidateEntry,'--action',action,'--root',root,'--directory',reportDir,...family?['--family',family]:[]].map(quote).join(' ');
  const tasks=families.map(family=>({id:`check.cli-artifact-${family}`,task_id:`check.cli-artifact-${family}`,group:'artifact-preparation',kind:'artifact-prepare',gate_ids:[gates[family]],resources:['cli-artifact-production'],depends_on:['check.verification-environment'],command:command('prepare-cli',family)}));
  for(const family of families)tasks.push({id:`check.cli-migration-${family}`,task_id:`check.cli-migration-${family}`,group:'artifact-preparation',kind:'artifact-migration',gate_ids:['check.verification-cli-migration'],resources:['cli-artifact-consumption'],depends_on:[`check.cli-artifact-${family}`],command:command('migration',family)});
  tasks.push({id:'check.cli-artifact-consumers',task_id:'check.cli-artifact-consumers',group:'artifact-preparation',kind:'artifact-consumers',gate_ids:['check.verification-distribution'],depends_on:families.map(family=>`check.cli-artifact-${family}`),command:command('prepare-consumers'),receipt_file:receiptFile});
  const cleanupTask={id:'check.verification-artifact-cleanup',task_id:'check.verification-artifact-cleanup',group:'cleanup',kind:'cleanup',gate_ids:['check.verification-final-integrity'],depends_on:[],command:command('cleanup')};
  return {tasks,cleanupTask,receiptFile,artifactDirectory,families:[...families]};
}

function commandRecorder(directory) {
  const records=[];fs.mkdirSync(directory,{recursive:true});
  const run=(file,args,cwd,environment=process.env)=>{
    const start=Date.now(),result=spawnSync(file,args,{cwd,env:environment,encoding:'utf8',maxBuffer:64*1024*1024,timeout:600000});
    const prefix=String(records.length).padStart(3,'0'),stdoutFile=path.join(directory,`${prefix}.stdout.log`),stderrFile=path.join(directory,`${prefix}.stderr.log`);
    fs.writeFileSync(stdoutFile,result.stdout||'');fs.writeFileSync(stderrFile,result.stderr||'');
    const record={file,args,cwd,actual_exit_code:result.status,actual_exit_signal:result.signal,actual_exit_code_observed:Number.isInteger(result.status)&&!result.error,started_at:new Date(start).toISOString(),finished_at:new Date().toISOString(),duration_ms:Date.now()-start,stdoutFile,stderrFile,stdout_sha256:hash(result.stdout||''),stderr_sha256:hash(result.stderr||''),error:result.error?.message||null};
    records.push(record);fs.writeFileSync(path.join(directory,'commands.json'),JSON.stringify(records,null,2)+'\n');
    ensure(record.actual_exit_code_observed&&record.actual_exit_code===0&&record.actual_exit_signal===null,`产物命令失败: ${file} ${args.join(' ')}; ${record.error||result.stderr||`exit=${result.status} signal=${result.signal}`}`);
    return {stdout:result.stdout,status:result.status};
  };
  return {run,records};
}
function sources(root) {
  const result=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
  ensure(result.status===0,'固定来源 HEAD 不可读');return collectReleaseSources({root,commit:result.stdout.trim(),families});
}
function artifactFile(directory,family){return path.join(directory,'artifacts',family,'artifact.json');}

export function validateReceipt(envelope,{root,receiptFile,expectedSourcesManifest,requireLiveConsumers=true}={}) {
  ensure(envelope?.schema_version===1&&envelope.kind==='verification-artifact-consumers','产物准备回执类型无效');
  outside(root,receiptFile);
  const expected=expectedSourcesManifest||sources(root);
  ensure(JSON.stringify(envelope.sources_manifest.entries.map(sourceTuple))===JSON.stringify(expected.entries.map(sourceTuple)),'产物回执固定来源错配');
  ensure(envelope.artifacts?.length===4&&new Set(envelope.artifacts.map(row=>row.source_tuple.family)).size===4,'产物回执缺少四 CLI');
  for(const source of expected.entries){const artifact=envelope.artifacts.find(row=>row.source_tuple.family===source.family);ensure(artifact?.installed_root&&/^[a-f0-9]{64}$/.test(artifact.installed_tree_sha256||''),'产物回执缺少真实安装树');validateArtifact(artifact,source);}
  const consumption=path.dirname(receiptFile),allowed=new Set(['YSS_DEDICATED_CLI_ROOT','YSS_DEDICATED_INSTANCE_ROOT',...families.map(family=>`YSS_CLI_${family.toUpperCase()}_ROOT`)]);
  ensure(Object.keys(envelope.environment||{}).length===allowed.size,'产物回执环境字段缺失');
  for(const [key,value]of Object.entries(envelope.environment)){
    ensure(allowed.has(key)&&typeof value==='string'&&path.isAbsolute(value),'产物回执含非法环境字段');
    // 运行消费者必须存在；终检后的归档回执只消费已验证的不可变产物，
    // 不重新应用已清理测试实例的环境变量。
    const resolved=requireLiveConsumers?fs.realpathSync(value):path.resolve(value);
    const relative=path.relative(consumption,resolved);ensure(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'产物回执消费目录越界');
  }
  return envelope;
}

export function assembleQualificationIntegration({root,directory}={}) {
  const manifest=sources(root),artifacts=families.map(family=>read(artifactFile(directory,family)));
  const integrations=families.map(family=>read(path.join(directory,'migration-results',`${family}.json`)));
  const commands=[...artifacts.flatMap(row=>row.command_records||[]),...integrations.flatMap(row=>row.command_records||[])];
  for(const source of manifest.entries)validateArtifact(artifacts.find(row=>row.source_tuple.family===source.family),source);
  ensure(integrations.every(row=>row.status==='passed')&&commands.length>0,'四 CLI 集成尚未完成');
  for(const command of commands) {
    ensure(command.actual_exit_code_observed&&command.actual_exit_code===0&&command.actual_exit_signal===null,'四 CLI 内部命令未实际通过');
    for(const [file,digest]of [[command.stdoutFile,command.stdout_sha256],[command.stderrFile,command.stderr_sha256]])ensure(hash(fs.readFileSync(file))===digest,'四 CLI 内部日志摘要漂移');
  }
  const envelope={schema_version:2,kind:'template-release-verification',purpose:'qualification',status:'passed',
    verification_scope:'local-template-and-cli',release_readiness:'not-evaluated',
    requested_commit:manifest.root_commit,template_commit:manifest.root_commit,cli_families:[...families],sources_manifest:manifest,artifacts,cli_integrations:integrations,commands};
  const file=path.join(directory,'integration-record.json');write(file,envelope);return {file,sha256:hash(fs.readFileSync(file)),envelope};
}

export function runDeliveryTask({root,directory,action,family}={}) {
  root=fs.realpathSync(root);directory=path.resolve(directory);outside(root,directory);
  ensure(['prepare-cli','migration','prepare-consumers','cleanup'].includes(action),'未知产物准备动作');
  if(action==='cleanup'){
    const start=performance.now();
    for(const name of families)fs.rmSync(path.join(directory,'artifacts',name,'cli'),{recursive:true,force:true});
    // Installed packages, logs, receipts and source manifests are formal evidence.
    // Only mutable test instances and clone workspaces are disposable.
    fs.rmSync(path.join(directory,'consumption','prepared','instances'),{recursive:true,force:true});
    fs.rmSync(path.join(directory,'migration'),{recursive:true,force:true});
    const record={kind:'verification-artifact-cleanup',status:'passed',duration_ms:performance.now()-start};write(path.join(directory,'cleanup.json'),record);return record;
  }
  const manifest=sources(root);
  if(action==='prepare-cli') {
    ensure(families.includes(family),'未知产物家族');const source=manifest.entries.find(row=>row.family===family),target=path.join(directory,'artifacts',family);
    ensure(!fs.existsSync(target),'产物家族目录必须为新目录');
    // Logs are a sibling so the real producer can require a fresh directory.
    const recorder=commandRecorder(path.join(directory,'artifact-logs',family));
    const artifact=produceCliArtifact({root,source,directory:target,run:recorder.run});
    const tarball=path.join(target,path.basename(artifact.tarball));fs.renameSync(artifact.tarball,tarball);artifact.tarball=tarball;
    artifact.command_records=recorder.records;write(artifactFile(directory,family),artifact);return artifact;
  }
  if(action==='migration'){
    ensure(families.includes(family),'未知迁移家族');const artifact=read(artifactFile(directory,family)),target=path.join(directory,'migration',family),recorder=commandRecorder(path.join(directory,'migration-logs',family));
    ensure(!fs.existsSync(target),'迁移消费目录必须为新目录');
    const result=verifyInstalledCliMigration({artifact,directory:target,run:recorder.run});
    write(path.join(directory,'migration-results',`${family}.json`),{...result,command_records:recorder.records});return result;
  }
  const artifacts=families.map(name=>read(artifactFile(directory,name))),recorder=commandRecorder(path.join(directory,'artifact-logs','consumers'));
  const consumers=prepareArtifactConsumers({artifacts,directory:path.join(directory,'consumption','prepared'),run:recorder.run});
  const envelope={schema_version:1,kind:'verification-artifact-consumers',sources_manifest:manifest,artifacts,environment:consumers.environment,command_records:recorder.records};
  const receiptFile=path.join(directory,'consumption','receipt.json');validateReceipt(envelope,{root,receiptFile,expectedSourcesManifest:manifest});write(receiptFile,envelope);return envelope;
}

if(process.argv[1]&&path.resolve(process.argv[1])===entry){
  try {
    const {values}=parseArgs({options:{action:{type:'string'},root:{type:'string'},directory:{type:'string'},family:{type:'string'}},strict:true});
    const result=runDeliveryTask(values);process.stdout.write(JSON.stringify({status:'passed',action:values.action,family:values.family||null,source_tuple:result.source_tuple||null})+'\n');
  }catch(error){process.stderr.write(`产物准备失败: ${error.message}\n`);process.exitCode=1;}
}
