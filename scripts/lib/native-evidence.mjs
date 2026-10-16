// Domain validation runs in the fixed yss executable. This module only transports inputs and adopts its observed dependencies.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {contextBinary} from './native-context.mjs';
import {readFileSync,lstatSync,readdirSync,existsSync,withValidationPhase,acceptValidationDependencies,verifyValidationDependencies,atValidationFinish} from './validation-phase.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(root,file)=>file===root||file.startsWith(root+path.sep);
const fail=(code,message)=>{throw Object.assign(new Error(`${code}: ${message}`),{code});};
export const NEEDS={
 userDecision:['user-decision.requirements-object.v1','user-decision.validated-rows.v1','user-decision.result.v1'],
 approval:['approval.expected.v1','approval.binding.v1','approval.rule-rows.v1'],
 task:['task.directory-write-scope.v1'],checkpoint:['lifecycle.legacy-untracked-checkpoint.v1','template-source.verify-root.v1'],
 handoffPackage:['handoff.package-identity.v1','handoff.source-view.v1'],handoffSource:['handoff.source-view.v1'],
 handoffDelivery:['handoff.delivery-view.v1'],sourceApproval:['handoff.source-approval.v1'],sourceContextSnapshot:['handoff.source-context-snapshot.v1'],
 handoffConsumption:['handoff.consumption-report.v1'],specBaselinePackage:['handoff.spec-baseline-package.v1','handoff.spec-baseline-source-view.v1'],
 specBaselineBinding:['contract.spec-baseline-binding.v1'],businessTickets:['contract.business-tickets-report.v1','contract.business-tickets-source-views.v1'],
 contextReconciliation:['evidence.context-reconciliation.v1'],openapiValidation:['contract.openapi-validation.v1'],
 backendTerminal:['contract.backend-terminal.v1'],backendDeliveryPackage:['handoff.backend-delivery-package.v1'],
 scaffoldDecisions:['contract.scaffold-decisions.v1'],slicePreflight:['contract.slice-preflight-report.v1'],
 gateChecks:['contract.gate-checks.v1'],checkpointApprovals:['contract.checkpoint-approvals.v1'],planEntry:['contract.plan-entry.v1'],implementationScope:['contract.implementation-scope.v1'],
 checkpointUserDecisions:['contract.checkpoint-user-decisions.v1'],scaffoldUserDecision:['contract.scaffold-user-decision.v1'],
 dependencies:['governance.validation-dependencies.v1'],
 // managed 阅读视图的渲染、校验与启用在 yss 中完成；manual 实例不协商这三条（见 reading-view-bundle.mjs 的能力短路）。
 readingViews:['reading.views.v1'],readingRender:['reading.render.v1'],readingEnable:['reading.enable.v1']
};
const capabilityCache = new Map();
export function nativeCapabilities(environment = process.env) {
  const {binary, digest} = contextBinary(environment);
  const key = `${binary}\0${digest}`;
  if (!capabilityCache.has(key)) {
    const run = spawnSync(binary, ['capabilities', '--json'], {encoding: 'utf8', timeout: 30000});
    let tokens = [];
    try { tokens = JSON.parse(run.stdout).result?.nodeDelegation ?? []; } catch { tokens = []; }
    capabilityCache.set(key, new Set(tokens));
  }
  return capabilityCache.get(key);
}
// 能力缺失始终拒绝，不选择另一套校验器。
export function missingCapabilities(needs, environment = process.env) {
  let have;
  try { have = nativeCapabilities(environment); } catch { return [...needs]; }
  return needs.filter((token) => !have.has(token));
}
export function assertNativeCapabilities(needs, environment = process.env) {
  contextBinary(environment); // 找不到 yss 时给出定位错误，而不是「缺少能力」
  const missing = missingCapabilities(needs, environment);
  if (missing.length) throw new Error(`NATIVE_CAPABILITY: 当前 yss 缺少能力 ${missing.join('、')}，请升级 yss（yss upgrade）后重试`);
}


// shortcut: 同一来源根的并行薄壳校验会观测对方暂存目录；当前需串行，仓外认证运输尚未实现。
const ownedTransportPaths=new Set();
function transport(root) {
 const created=[];
 const dir=path.join(root,'.work','native-candidates',`input-${process.pid}-${randomUUID()}`);
 const create=directory=>{try{const st=fs.lstatSync(directory);if(st.isSymbolicLink()||!st.isDirectory())fail('NATIVE_INPUT_INVALID',`传输祖先必须是普通目录: ${directory}`);if(directory!==path.parse(directory).root)create(path.dirname(directory));return;}catch(error){if(error.code!=='ENOENT')throw error;}create(path.dirname(directory));fs.mkdirSync(directory);created.push(directory);ownedTransportPaths.add(directory);};
 let initialized=false;
 return {get dir(){if(!initialized){create(dir);initialized=true;}return dir;},created,cleanup(){if(!initialized)return;fs.rmSync(dir,{recursive:true,force:true});ownedTransportPaths.delete(dir);for(const directory of [...ownedTransportPaths].sort((a,b)=>b.length-a.length)){if(!fs.existsSync(directory))ownedTransportPaths.delete(directory);else if(!fs.readdirSync(directory).length){fs.rmdirSync(directory);ownedTransportPaths.delete(directory);}}}};
}
function copyObserved(source,target) {
 const stat=lstatSync(source);
 if(stat.isSymbolicLink())fail('NATIVE_INPUT_INVALID','外部输入不能包含符号链接');
 if(stat.isDirectory()){fs.mkdirSync(target);for(const name of readdirSync(source))copyObserved(path.join(source,name),path.join(target,name));fs.chmodSync(target,stat.mode&0o7777);}
 else if(stat.isFile()){fs.writeFileSync(target,readFileSync(source));fs.chmodSync(target,stat.mode&0o7777);}
 else fail('NATIVE_INPUT_INVALID','外部输入只能是普通文件或目录');
}
function normalizedDependencies(receipt,root,transfers,created,inputs=[],explicitRoots=[]) {
 if(receipt?.schema_version!==1||!Array.isArray(receipt.files)||!Array.isArray(receipt.observations))fail('NATIVE_PROTOCOL','缺少受控原生依赖回执');
 // Verify exactly what Go observed before removing any transport files.
 const roots=new Set([root,...explicitRoots]),fileDigests=new Map(receipt.files.map(row=>[row.file,row.digest]));
 // External roots must be backed by this fixed invocation's authenticated input
 // descriptors and the same observed physical bytes; arbitrary reported roots
 // and virtual archive members do not grant a new filesystem boundary.
 for(const input of inputs){if(!path.isAbsolute(input.root||'')||typeof input.ref!=='string'||path.isAbsolute(input.ref)||input.ref.includes(':')||input.ref.split(/[\\/]/).includes('..'))continue;const file=path.resolve(input.root,input.ref),expected=input.descriptor?.digest?.replace(/^sha256:/,'');if(input.descriptor?.type==='file'&&inside(input.root,file)&&fileDigests.get(file)===expected&&/^[a-f0-9]{64}$/.test(expected))roots.add(input.root);}
 for(const row of receipt.files)if(typeof row.file!=='string'||!path.isAbsolute(row.file)||![...roots].some(base=>inside(base,row.file)))fail('NATIVE_PROTOCOL','原生文件依赖越出本次认证来源');
 for(const row of receipt.observations)if(typeof row.file!=='string'||!path.isAbsolute(row.file)||![...roots].some(base=>inside(base,row.file)||(row.kind==='stat'&&inside(row.file,base))))fail('NATIVE_PROTOCOL','原生路径依赖越出本次认证来源');
 verifyValidationDependencies(receipt);
 const ephemeral=file=>created.some(dir=>inside(dir,file));
 const map=file=>{const transfer=transfers.find(row=>inside(row.target,file));return transfer?path.join(transfer.source,path.relative(transfer.target,file)):file;};
 const files=receipt.files.filter(row=>!ephemeral(row.file)||transfers.some(t=>inside(t.target,row.file))).map(row=>({...row,file:map(row.file)}));
 // Physical source files were observed during copying. Native staging inode values
 // describe the copy, so only byte dependencies are mapped back to the original.
 const observations=receipt.observations.filter(row=>!ephemeral(row.file)).map(row=>{
  if(row.kind!=='directory')return row;
  return {...row,value:row.value.filter(name=>!ownedTransportPaths.has(path.join(row.file,name)))};
 });
 return {schema_version:1,files,observations};
}
function decodeEnvelope(run,command) {
 let envelope;try{envelope=JSON.parse(run.stdout);}catch{fail('NATIVE_PROTOCOL',`非 JSON 响应: ${run.stderr||run.stdout}`.slice(0,600));}
 if(envelope.outputVersion!==1||envelope.protocolVersion!==1||envelope.command!==command||!['ok','error'].includes(envelope.status)||![0,1,2].includes(run.status)||(envelope.status==='ok')!==(run.status===0)||(envelope.code==='OK')!==(run.status===0))fail('NATIVE_PROTOCOL','协议与实际退出码不一致');
 return envelope;
}
// 通用的一次性原生调用：协商能力、核对固定二进制摘要、解码 envelope。不收集依赖回执，只用于不进入验证阶段的 yss 命令（阅读视图的渲染、校验与启用）。
// 业务拒绝（退出码 1、2）原样返回，由调用方按错误码处理；只有协议、中断和能力缺失抛出。
export function nativeInvoke({root,args,needs=[],environment=process.env,timeout=120000}) {
 assertNativeCapabilities(needs,environment);
 const {binary,digest:binaryDigest}=contextBinary(environment),fixedEnvironment={...environment,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:binaryDigest};
 const argv=args.includes('--json')?args:[...args,'--json'];
 contextBinary(fixedEnvironment);
 const run=spawnSync(binary,argv,{cwd:root,env:fixedEnvironment,encoding:'utf8',timeout,maxBuffer:64*1024*1024});
 contextBinary(fixedEnvironment);
 if(run.error||run.signal||!Number.isInteger(run.status))fail('NATIVE_INTERRUPTED',run.error?.message||run.signal);
 const envelope=decodeEnvelope(run,args[0]);
 return {exitCode:run.status,status:envelope.status,code:envelope.code,result:envelope.result,message:envelope.result?.message??envelope.code,envelope};
}
export function nativeEvidenceVerify({root:given,kind,file,extra=[],environment=process.env,group='evidence',selector,document,documents={},needs=[]}) {
 const root=fs.realpathSync(given);
 assertNativeCapabilities([...needs,...NEEDS.dependencies],environment);
 return withValidationPhase({root,purpose:`native-${group}-${kind}`,readOnly:true},()=>{
  const temporary=transport(root),transfers=[];let deferred=false;
  try {
   const stage=(ref,name)=>{
    const source=path.resolve(root,ref);
    if(inside(root,source))return path.relative(root,source).split(path.sep).join('/');
    const target=path.join(temporary.dir,name+(lstatSync(source).isFile()?path.extname(source):''));copyObserved(source,target);transfers.push({source,target});
    return path.relative(root,target).split(path.sep).join('/');
   };
   let selected;
   if(document!==undefined){selected=path.join(temporary.dir,'candidate.json');fs.writeFileSync(selected,JSON.stringify(document));selected=path.relative(root,selected);}
   else selected=stage(file,'input');
   const flags=[...extra];
   for(const [flag,value]of Object.entries(documents)){const target=path.join(temporary.dir,flag.replace(/[^a-z-]/g,'')+'.json');fs.writeFileSync(target,JSON.stringify(value));flags.push(flag,path.relative(root,target));}
   const selectedFlag=selector||(group==='lifecycle'?'--checkpoint':group==='handoff'&&['package','spec-baseline','backend-delivery','delivery'].includes(kind)?'--package':'--file');
   const args=[group,'verify','--root',root,...(group==='lifecycle'?[]:['--kind',kind]),selectedFlag,selected,...flags,'--json'];
   const {binary,digest:binaryDigest}=contextBinary(environment),fixedEnvironment={...environment,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:binaryDigest};
   const execute=()=>{contextBinary(fixedEnvironment);const result=spawnSync(binary,args,{cwd:root,env:fixedEnvironment,encoding:'utf8',timeout:120000,maxBuffer:64*1024*1024});contextBinary(fixedEnvironment);return result;};
   const run=execute();
   if(run.error||run.signal||!Number.isInteger(run.status))fail('NATIVE_INTERRUPTED',run.error?.message||run.signal);
   const envelope=decodeEnvelope(run,group);
   const receipt=envelope.result?.validation_dependencies;
   // Argument/identity errors can happen before a validation Context exists.
   if(receipt){
    const explicitRoots=transfers.map(row=>row.source);for(let i=0;i<flags.length;i++)if(['--run-dir','--tool-root','--template-checkout'].includes(flags[i])&&typeof flags[i+1]==='string')explicitRoots.push(path.resolve(root,flags[++i]));
    const adopted=normalizedDependencies(receipt,root,transfers,temporary.created,envelope.result.inputs,explicitRoots),git=envelope.result.git_inputs;
    if(!Array.isArray(git))fail('NATIVE_PROTOCOL','缺少 Git 观测清单');
    if(git.length){const observed=JSON.stringify(git);atValidationFinish(()=>{const replay=execute();let after;try{after=JSON.parse(replay.stdout);}catch{fail('VALIDATION_INPUT_CHANGED','Git 复验响应无效');}if(replay.error||replay.signal||replay.status!==run.status||after.command!==group||JSON.stringify(after.result?.git_inputs)!==observed)fail('VALIDATION_INPUT_CHANGED','原生 Git 观测已改变');},()=>temporary.cleanup());deferred=true;}
    else temporary.cleanup();acceptValidationDependencies(adopted);
   }
   else if(run.status===0)fail('NATIVE_PROTOCOL','成功响应缺少受控依赖');
   const diagnostics=envelope.result?.diagnostics??[];
   return {exitCode:run.status,status:envelope.status,code:envelope.code,diagnostics,message:diagnostics.map(row=>`${row.code}: ${row.message}`).join('；')||envelope.code,envelope};
  } finally {if(!deferred)temporary.cleanup();}
 });
}
export function nativeCoverage(result,key,{allowBlocked=false}={}) {
 const value=result.envelope.result?.coverage?.[key];
 if(result.exitCode!==0&&(!allowBlocked||!value))throw Object.assign(new Error(result.message),{code:result.diagnostics[0]?.code??result.code,native:true});
 if(!value||typeof value!=='object')fail('NATIVE_PROTOCOL',`缺少 ${key} 报告`);
 if(value.status&&((value.status==='passed')!==(result.exitCode===0)))fail('NATIVE_PROTOCOL',`${key} 与实际退出码不一致`);
 return value;
}
export const nativeContractVerify=options=>nativeEvidenceVerify({...options,group:'contract'});
export const nativeLifecycleVerify=options=>nativeEvidenceVerify({...options,kind:'checkpoint',group:'lifecycle'});
export function nativeUserDecisionRequirement({root,requirement,environment=process.env}) {
 if(!requirement?.user_decision_ref&&!requirement?.continuation_ref)fail('user-decision-missing','缺少当前用户决定或延续记录引用');
 const continuation=Boolean(requirement.continuation_ref),result=nativeEvidenceVerify({root,kind:'user-decision',file:requirement.continuation_ref||requirement.user_decision_ref,documents:{'--requirements':[requirement]},extra:continuation?['--continuation']:[],environment,needs:NEEDS.userDecision});
 if(continuation){const continued=nativeCoverage(result,'user_decision_continuation'),validated=result.envelope.result.coverage.user_decision_validated;if(!Array.isArray(validated)||!continued.continued)fail('NATIVE_PROTOCOL','缺少延续核验结果');return {validated,...continued};}
 return nativeCoverage(result,'user_decision_result');
}
export function nativeApprovalRecord({root,record,file,gate,expected,environment=process.env}) {
 const result=nativeEvidenceVerify({root,kind:'approval',file,document:record,documents:expected===undefined?{}:{'--expected':expected},extra:['--require-approved',...(gate?['--gate',gate]:[])],needs:NEEDS.approval,environment});
 if(result.exitCode!==0)throw Object.assign(new Error(result.message),{code:result.diagnostics[0]?.code??result.code,native:true});
 const rules=result.envelope.result?.coverage?.approval_validated;
 if(!Array.isArray(rules)||!rules.length)fail('NATIVE_PROTOCOL','缺少批准结果');
 const done=rules.map(row=>({...row.rule,subject_ref:row.subject_ref??(Array.isArray(expected)?expected.find(e=>e.boundary===row.gate_id):expected)?.subject_ref,approval_scope:row.approval_scope??(Array.isArray(expected)?expected.find(e=>e.boundary===row.gate_id):expected)?.approval_scope,execution_authorization:'not-evaluated'}));
 return Array.isArray(expected)?done:done[0];
}
export function nativeHandoffConsumption({root,data,sliceRef,consumer='tactical',environment=process.env}) {
 const result=nativeEvidenceVerify({root,kind:'consumption',document:data,group:'handoff',extra:[...(sliceRef?['--slice',sliceRef]:[]),...(consumer==='tactical'?[]:['--consumer',consumer])],environment,needs:NEEDS.handoffConsumption});
 return nativeCoverage(result,'handoff_consumption',{allowBlocked:true});
}
