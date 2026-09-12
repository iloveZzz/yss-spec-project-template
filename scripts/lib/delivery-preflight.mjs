import { assertExistingSliceStructure, createApprovedExecutionContext, verifySliceContractApproval } from './approved-execution-context.mjs';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { ROOT, read, parse, safe, hash, digest, ensure, schema, sourceApprovalPolicy } from './strategic-handoff-io.mjs';
import { parseContextContract } from './context-contract.mjs';
import { validateApprovalRecord } from './approval-record.mjs';
import { loadSkillRegistry } from './skill-registry.mjs';
import * as architecture from './backend-architecture.mjs';

const STAGES=['prepare','build','export','accept'];
const LATER=stage=>STAGES.slice(STAGES.indexOf(stage));
const OWNERS={governance:'工程接入负责人',architecture:'工程基线与边界审查负责人',openapi:'接口契约负责人',technical_design:'技术设计负责人','slice_contract.execution':'生命周期编排与合同批准方',slice_contract:'生命周期编排与合同批准方',ui_baseline:'产品设计负责人',build_artifact:'后端构建负责人',build:'后端构建负责人',deployment:'后端部署与验证负责人',strategic_handoff:'战略交付方',backend_delivery:'后端交付方',local_authorization:'目标仓接收负责人'};
const RECOVERY={governance:'完成工程接入登记或正常初始化，读取有效 yss-project.yaml 和根 CONTEXT.md 后重跑预检',architecture:'按工程接入与 backend-architecture 合同补齐原始登记、工程基线、观测 manifest，重新边界审查并编译',openapi:'回到 OpenAPI Draft 审查与 Freeze，绑定当前字节及真实批准',technical_design:'按已登记架构更新技术设计，补齐输入与审查并重新批准','slice_contract.execution':'读取当前 Slice 字节及本地主控批准，恢复 implementation-scope 原始决定后重试',slice_contract:'重新编译 Slice Implementation Contract 并取得当前合同批准',ui_baseline:'由产品设计负责人确认现有 UI 基线；有 UI 改动则回到原型设计',build_artifact:'绑定实际 JAR 文件并与构建 artifact_digest 核对',build:'使用批准合同正常构建，并记录实际输出摘要与验证',deployment:'部署当前构建，采集同进程身份与真实验证证据',strategic_handoff:'修正战略来源与批准，重新导出当前交接资产',backend_delivery:'从正常后端交付入口重新生成与当前来源一致的交付记录',local_authorization:'由目标仓负责人确认当前生产方、项目、route 和 slice 范围'};
const ASSETS={openapi:'build',technical_design:'build',slice_contract:'build',ui_baseline:'export',build:'export',build_artifact:'export',deployment:'export',strategic_handoff:'export',backend_delivery:'accept',local_authorization:'accept'};
const errorStatus=error=>error.code==='EXECUTION_CONTRACT_INVALID'?'conflict':/stale|漂移|过期|摘要/.test(error.message)?'stale':/unsupported|未知|不支持|版本/.test(error.message)?'unsupported':/不可读|ENOENT|缺少/.test(error.message)?'missing':'conflict';
const docBinding=(root,binding)=>{
  const bytes=readFileSync(safe(root,binding.ref));
  ensure(hash(bytes)===binding.digest,`stale: 资产摘要漂移: ${binding.ref}`);
  return parse(bytes);
};
const fileBinding=(root,binding)=>{ ensure(binding?.ref&&binding?.digest,'缺少证据 ref/digest');const bytes=readFileSync(safe(root,binding.ref));ensure(bytes.length>0&&hash(bytes)===binding.digest,`stale: 证据为空或摘要漂移: ${binding.ref}`);return bytes; };
const same=(a,b)=>digest(a)===digest(b);

export function invalidPreflightInput(message) {
  return {schema_version:1,result:'invalid-input',exit_code:2,stage:null,checks:[{code:'input.protocol',status:'conflict',owner:'交付编排方',source:'delivery-preflight-input',evidence:[],blocking_stages:STAGES,recovery:'按 delivery-preflight-input.schema.json 修正输入协议',message}]};
}

/** Installed profile owns backend technical authoring; caller governance_root cannot grant it. */
export function backendPreflightCapability() {
  const profileRef=path.join(ROOT,'docs/process/harness-profile.yaml');
  const profile=existsSync(profileRef)?read(profileRef):null;
  const profileId=profile?.profile_id||'template.full';
  const ownsBackend=!profile||profileId==='harness.backend-delivery';
  const required=['.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs','.agents/skills/yss-technical-design/references/technical-design.schema.json','.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml'];
  const missing=ownsBackend?required.filter(ref=>!existsSync(path.join(ROOT,ref))):[];
  return {profile_id:profileId,owns_backend:ownsBackend,available:ownsBackend&&!missing.length,missing,
    reason:ownsBackend?(missing.length?`后端验证运行时分发不完整: ${missing.join(', ')}`:'当前安装拥有后端技术设计与合同验证能力'):`${profileId} 不拥有后端技术设计与实现合同编译职责；由主模板或 backend profile 验证`};
}
function requireBackendCapability(key) {
  const capability=backendPreflightCapability();
  if(capability.available)return;
  const error=new TypeError(`unsupported: ${capability.reason}`);
  error.code=key==='technical_design'?'PREFLIGHT_TECHNICAL_DESIGN_UNSUPPORTED':'PREFLIGHT_SLICE_CONTRACT_UNSUPPORTED';
  error.recovery=capability.owns_backend?'恢复当前后端 profile 的完整验证运行时分发，再从正常预检入口重跑':'将原始技术资产与批准绑定交给主模板或 backend 工程负责人核验；本 profile 通过已导出的受控交付包接收，不安装另一方创作技能';
  throw error;
}

/** Read-only: never executes input commands, starts services, unpacks archives or writes receipts. */
export async function preflightDelivery(input,{stage,root=process.cwd()}={}) {
  try { ensure(STAGES.includes(stage),'未知阶段；必须是 prepare|build|export|accept');schema(input,'docs/process/schemas/delivery-preflight-input.schema.json'); }
  catch(error) { return invalidPreflightInput(error.message); }
  root=path.resolve(root,input.governance_root||'.');
  const deliveryKind=input.delivery_kind||'complete';
  const checks=[], documents={}, valid=new Set(), assets=input.assets||{};
  let execution;
  const downstream=key=>deliveryKind==='strategic-handoff'&&(key.startsWith('architecture')||key.startsWith('slice_contract')||['technical_design','slice_contract','build','build_artifact','deployment','backend_delivery','local_authorization'].includes(key)||(key==='openapi'&&!input.assets?.openapi));
  const add=(key,status,message,{code=key,from='prepare',evidence=[],source=key,recovery=RECOVERY[key]||RECOVERY.architecture}={})=>checks.push({code,status,owner:OWNERS[key]||OWNERS.architecture,source,evidence,blocking_stages:downstream(key)?[]:LATER(from),recovery,message});
  const run=async(key,action,options={})=>{
    try { await action();valid.add(key);add(key,'ready','当前原始资产与语义核验通过',options); }
    catch(error) { add(key,errorStatus(error),error.message,{...options,...(error.recovery?{recovery:error.recovery}:{}),code:typeof error.code==='string'?error.code:options.code||key}); }
  };
  const pending=(key,deps,options)=>add(key,'pending',`尚不可判定，依赖未就绪: ${deps.join(', ')}`,options);
  await run('governance',()=>{
    const project=read(safe(root,'yss-project.yaml'));
    ensure(project.schema_version===1&&project.repository_mode==='project-instance','交付预检只消费显式 project-instance；未知身份不得推测');
    parseContextContract({root});
  },{source:'yss-project.yaml / CONTEXT.md',evidence:['yss-project.yaml','CONTEXT.md']});
  if(input.planned_initialization) add('governance','not-applicable','此为拟初始化目标的只读诊断；预检不初始化，缺失的当前阶段前提仍明确阻断',{code:'governance.planned-initialization'});

  const bindings=input.architecture_bindings||{};
  for(const key of ['repository_registration','engineering_baseline','manifest']) {
    if(!bindings[key]) add('architecture','missing',`缺少原始架构来源: ${key}`,{code:`architecture.${key}`,source:key});
    else await run(`architecture.${key}`,()=>{documents[key]=docBinding(root,bindings[key]);verifyArchitectureDocument(key,documents[key],input.scope,root);},{source:key,evidence:[bindings[key].ref]});
  }
  if(!input.architecture_identity) add('architecture','missing','缺少 architecture_identity；不能从目录或数据库字符串推断',{code:'architecture.identity'});
  else await run('architecture.identity',()=>{
    architecture.validateArchitectureIdentity(input.architecture_identity);
    if(input.architecture_identity.source_kind==='existing-registration')ensure(input.architecture_identity.repository_id===input.scope.repository_id&&input.architecture_identity.project_id===input.scope.project_id,'架构身份与预检目标仓库/项目不一致');
  },{source:'architecture_identity'});
  if(valid.has('architecture.identity'))await run('architecture.profile',()=>{ensure(architecture.validateArchitectureIdentity(input.architecture_identity).maturity==='supported','不支持未达到 supported 的 architecture_profile');},{source:'architecture_profile'});
  if(['build','export','accept'].includes(stage)&&assets.slice_contract)await run('slice_contract.execution',()=>{requireBackendCapability('slice_contract');execution=createApprovedExecutionContext(assets.slice_contract,{root});},{from:'build',source:assets.slice_contract.approval_ref||'slice_contract',evidence:[assets.slice_contract.ref,...(assets.slice_contract.approval_ref?[assets.slice_contract.approval_ref]:[])]});
  const archDeps=['architecture.identity',...['repository_registration','engineering_baseline','manifest'].map(x=>`architecture.${x}`)];
  if(archDeps.every(x=>valid.has(x)))await run('architecture',()=>{
    ensure(typeof architecture.verifyArchitectureEvidence==='function','不支持既有工程原始证据验证，请同步支持该身份版本的模板运行时');
    architecture.verifyArchitectureEvidence(input.architecture_identity,bindings,{root,registry:loadSkillRegistry(),execution});
  },{source:'backend-architecture',evidence:Object.values(bindings).map(x=>x.ref)});
  else pending('architecture',archDeps.filter(x=>!valid.has(x)),{source:'backend-architecture'});

  // Load the delivery basis before checking deployment; dependency order must not hide drift.
  if(assets.backend_delivery)try{documents.backend_delivery=docBinding(root,assets.backend_delivery);}catch{}
  for(const [key,earliest] of Object.entries(ASSETS)) {
    const from=key==='backend_delivery'&&deliveryKind==='backend-delivery'?'export':earliest;
    if(deliveryKind==='backend-delivery'&&['ui_baseline','strategic_handoff'].includes(key)&&!assets[key])continue;
    if(key==='local_authorization'&&documents.backend_delivery?.schema_version!==2) {
      add(key,'not-applicable','当前未确认交付 v2；本地授权只在受控目标绑定协议 v2 生效',{from});continue;
    }
    if(key==='ui_baseline'&&input.scope.ui_mode==='not-applicable') {
      if(input.scope.ui_not_applicable_reason?.trim())add(key,'not-applicable',input.scope.ui_not_applicable_reason,{from});
      else add(key,'missing','无 UI 影响必须说明不适用原因',{from});
      continue;
    }
    if(!assets[key]) {add(key,'missing',`缺少 ${key} 原始资产绑定${STAGES.indexOf(stage)<STAGES.indexOf(from)?`；到 ${from} 阶段前补齐`:''}`,{from});continue;}
    await run(key,async()=>{
      const binding=assets[key];
      if(['technical_design','slice_contract'].includes(key))requireBackendCapability(key);
      if(key==='build_artifact'){fileBinding(root,binding);ensure(documents.build?.artifact_digest===binding.digest,'stale: 实际制品与构建记录摘要不一致');return;}
      const data=documents[key]=docBinding(root,binding);
      await verifyAsset(key,data,binding,{root,input,documents,assets,execution});
    },{from,source:assets[key].ref,evidence:[assets[key].ref,...(assets[key].approval_ref?[assets[key].approval_ref]:[])]});
  }
  if(deliveryKind==='backend-delivery')for(const key of ['ui_baseline','strategic_handoff'])if(!assets[key])add(key,valid.has('backend_delivery')?'ready':'pending',valid.has('backend_delivery')?'已通过交付绑定的战略包完成来源与 UI 基线只读复验':'尚不可判定，等待后端交付绑定的战略包核验',{code:`${key}.delivery-package`,from:'export',source:'backend_delivery.strategic_bundle_ref',evidence:assets.backend_delivery?[assets.backend_delivery.ref]:[]});
  // A present but unreadable dependency must not turn cross-asset agreement into a success.
  if(assets.slice_contract&&(!valid.has('technical_design')||!valid.has('architecture')))pending('slice_contract',['technical_design','architecture'].filter(x=>!valid.has(x)),{code:'slice_contract.dependencies',from:'build'});
  if(assets.deployment&&!valid.has('backend_delivery'))pending('deployment',['backend_delivery'],{code:'deployment.delivery-basis',from:'export'});
  const blocked=checks.some(x=>!['ready','not-applicable'].includes(x.status)&&x.blocking_stages.includes(stage));
  return {schema_version:1,result:blocked?'blocked':'ready',exit_code:blocked?1:0,stage,checks};
}

async function approved(root,binding,gates) {
  ensure(binding.approval_ref&&binding.id&&binding.version,'缺少当前资产 id/version/approval_ref');
  const record=read(safe(root,binding.approval_ref));
  const roles=sourceApprovalPolicy(read(safe(root,'docs/agents/digital-human-roles.yaml')));
  validateApprovalRecord(record,{rolesDoc:roles,requireApproved:true,root,read:ref=>readFileSync(safe(root,path.relative(root,ref).split(path.sep).join('/')))});
  ensure(gates.includes(record.gate_id),'资产批准使用错误门禁');
  ensure(record.artifact_bindings?.some(x=>x.id===binding.id&&x.version===binding.version&&x.digest===binding.digest),'stale: 批准未绑定当前资产身份、版本及字节');
}

async function verifyAsset(key,data,binding,{root,input,documents,assets,execution}) {
  ensure(data&&typeof data==='object'&&!Array.isArray(data),`${key} 必须是结构化资产`);
  if(key==='openapi') {
    ensure(/^3\.1\./.test(data.openapi)&&data.info?.title&&data.info?.version&&data.paths,'必须提供完整 OpenAPI 3.1 文档');
    const operations=Object.values(data.paths).flatMap(item=>Object.entries(item).filter(([method])=>['get','put','post','delete','options','head','patch','trace'].includes(method)).map(([,operation])=>operation.operationId));
    ensure(new Set(operations).size===operations.length&&operations.every(x=>typeof x==='string'&&x),'OpenAPI operationId 缺失或重复');
    ensure(input.scope.operation_ids.every(id=>operations.includes(id)),'预检接口范围不在冻结 OpenAPI 中');
    await approved(root,binding,['gate.engineering-contract-approved','gate.openapi-frozen','gate.openapi-freeze-confirmed']);
  } else if(key==='technical_design') {
    schema(data,'.agents/skills/yss-technical-design/references/technical-design.schema.json');
    ensure(data.schema_version===2&&data.status==='approved','技术设计必须是已批准 v2 合同');
    ensure(data.digest===digest(Object.fromEntries(Object.entries(data).filter(([k])=>k!=='digest'))),'stale: 技术设计自摘要不匹配');
    ensure(data.architecture?.family===input.architecture_identity?.architecture_family,'技术设计与登记架构冲突');
    for(const asset of data.inputs)fileBinding(root,asset);
    const {validateTechnicalDesign}=await import('../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs');
    await validateTechnicalDesign(data,{root,sliceRef:input.scope.slice_id,readOnly:true,execution});
    await approved(root,binding,['gate.engineering-contract-approved','gate.technical-design-approved']);
  } else if(key==='slice_contract') {
    const contract=data.slice_contract||data;
    assertExistingSliceStructure(contract);
    ensure(contract.schema_version===2&&contract.status==='approved'&&contract.slice_id===input.scope.slice_id,'Slice 合同版本、批准状态或切片不匹配');
    ensure(binding.id===contract.contract_id&&binding.version===contract.contract_version,'Slice 合同身份与引用不一致');
    const compiler=read(safe(ROOT,'.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml'));
    for(const [section,fields]of Object.entries(compiler.slice_contract_required))for(const field of fields)ensure(Object.hasOwn(section==='root'?contract:contract[section]||{},field),`合同缺少 ${section}.${field}`);
    ensure(contract.readiness.blockers.length===0&&contract.readiness.stale_inputs.length===0,'Slice 合同仍有 blocker 或 stale input');
    const resolution=contract.resolution;
    ensure(resolution.freshness==='current','Slice resolution 非 current');
    ensure(resolution.registry_digest===digest(loadSkillRegistry()).slice(7)&&resolution.compiler_contract_digest===digest(compiler).slice(7),'stale: 编译事实源已变化，需重新编译');
    ensure(same(resolution.architecture_identity,input.architecture_identity),'Slice 架构与登记不一致');
    ensure(resolution.architecture_identity_digest===architecture.architectureDigest(input.architecture_identity),'stale: Slice 架构摘要漂移');
    if(assets.technical_design)ensure(resolution.technical_design?.ref===assets.technical_design.ref&&resolution.technical_design?.digest===assets.technical_design.digest,'Slice 技术设计绑定不一致');
    verifySliceContractApproval(binding,{root,contract});
  } else if(key==='strategic_handoff') {
    const {inspectSource}=await import('./strategic-handoff.mjs');
    await inspectSource(root,binding.ref);
    const {uiBaselineRef,uiBaselineKind}=await import('./ui-baseline.mjs');
    const ui=uiBaselineRef(data);
    ensure(input.scope.ui_mode!=='not-applicable','战略交接含 UI 基线，不能声明为无 UI 影响');
    ensure(uiBaselineKind(data)===(input.scope.ui_mode==='prototype'?'prototype':'existing-ui-baseline'),'战略交接与预检 UI 来源类型不一致');
    if(assets.ui_baseline)ensure(assets.ui_baseline.ref===`${ui.persisted_ref}/${ui.manifest_ref}`,'战略交接 UI 基线与预检输入不一致');
  } else if(key==='ui_baseline') {
    if(input.scope.ui_mode==='prototype') {
      const {validateVisualBaseline}=await import('../../.agents/skills/yss-prototype-stage/scripts/visual-baseline-contract.mjs');
      const result=await validateVisualBaseline(data,{bundleRoot:path.dirname(safe(root,binding.ref))});
      ensure(!result.errors.length,result.errors.join('; '));
    } else {
      const modulePath=path.join(ROOT,'scripts/lib/existing-ui-baseline.mjs');
      ensure(existsSync(modulePath),'不支持 existing-ui-baseline 的当前运行时');
      const module=await import('./existing-ui-baseline.mjs');
      const verify=module.validateExistingUiBaseline||module.verifyExistingUiBaseline;
      ensure(typeof verify==='function','不支持既有 UI 基线验证接口');
      const result=await verify(data,{bundleRoot:path.dirname(safe(root,binding.ref))});
      ensure(!result?.errors?.length&&result?.result!=='blocked',JSON.stringify(result));
    }
    ensure((input.scope.ui_mode==='prototype'?data.status==='approved':['ready-for-human','approved'].includes(data.status))&&data.baseline_id===binding.id&&data.version===binding.version,'UI 基线身份、版本或待确认状态不一致');
    if(data.openapi&&assets.openapi)ensure(data.openapi.digest===assets.openapi.digest,'UI 基线与冻结 API 字节不一致');
    await approved(root,binding,['gate.product-design-approved','gate.user-confirmation']);
  } else if(key==='build') {
    // Same build shape used by backend-delivery, captured independently before packaging.
    const deliverySchema=read(safe(ROOT,'docs/process/schemas/backend-delivery.schema.json'));
    const buildRules=deliverySchema.properties.build;
    // Validate in memory to avoid writing a generated schema: check the published required fields.
    for(const field of buildRules.required||[])ensure(Object.hasOwn(data,field),`构建缺少交付协议字段: ${field}`);
    ensure(/^[a-f0-9]{40}$/.test(data.source_commit),'构建 source_commit 必须为固定 Git 提交');
    if(documents.manifest?.source?.base_commit)ensure(documents.manifest.source.base_commit===data.source_commit,'构建与观测 manifest 的固定源码提交不一致');
    ensure(/^sha256:[0-9a-f]{64}$/.test(data.artifact_digest),'构建制品摘要无效');
    ensure(Object.keys(data).every(key=>Object.hasOwn(buildRules.properties,key)),'构建包含交付协议未定义字段');
  } else if(key==='deployment') {
    schema(data,'docs/process/schemas/backend-delivery-verification.schema.json');
    ensure(data.kind==='backend-deployment','部署证据 kind 必须为 backend-deployment');
    for(const result of data.results) {
      ensure(result.exit_code===0&&Number.isFinite(Date.parse(result.executed_at))&&Date.parse(result.executed_at)<=Date.now()+60000,'部署执行结果或时间无效');
      result.evidence.forEach(file=>fileBinding(root,file));
    }
    if(documents.backend_delivery) {
      const {backendDeliveryBasis}=await import('./backend-delivery.mjs');
      ensure(data.subject_digest===backendDeliveryBasis(documents.backend_delivery),'stale: 部署验证未绑定当前交付依据');
    }
  } else if(key==='backend_delivery') {
    schema(data,`docs/process/schemas/backend-delivery${data.schema_version===2?'-v2':''}.schema.json`);
    ensure(data.scope.slice_id===input.scope.slice_id&&input.scope.operation_ids.every(id=>data.scope.operation_ids.includes(id)),'后端交付切片/接口范围不匹配');
    for(const asset of ['openapi','slice_contract'])if(assets[asset])ensure(data[asset].ref===assets[asset].ref&&data[asset].digest===assets[asset].digest,'后端交付引用与预检输入不一致');
    for(const asset of [data.environment.test_data,...Object.values(data.verification)])fileBinding(root,asset);
    if(assets.build)ensure(same(data.build,documents.build),'后端交付构建与预检构建不一致');
    if(assets.deployment)ensure(data.verification.deployment.ref===assets.deployment.ref&&data.verification.deployment.digest===assets.deployment.digest,'后端交付部署验证不一致');
    const {inspectBackendDelivery}=await import('./backend-delivery.mjs');
    await inspectBackendDelivery(root,binding.ref,{readOnly:true});
  } else if(key==='local_authorization') {
    throw new TypeError('不支持尚未确认的目标授权协议；须先执行 S3a 并使用确认后的只读授权验证入口');
  }
}

function verifyArchitectureDocument(key,data,scope,root) {
  ensure(data&&typeof data==='object'&&!Array.isArray(data),'原始架构资产必须是对象');
  architecture.validateArchitectureIdentity(data.architecture_identity);
  if(data.architecture_identity.schema_version!==2)return;
  ensure(data.repository_id===scope.repository_id&&data.project_id===scope.project_id,'原始来源与目标仓库/项目不一致');
  if(key==='repository_registration') {
    ensure(data.status==='current','stale: 工程登记不是 current');
    for(const field of ['local_worktree','project_root','owner','repository_url'])ensure(typeof data[field]==='string'&&data[field].trim(),`工程登记缺少 ${field}`);
    ensure(Array.isArray(data.verification_commands)&&data.verification_commands.length,'工程登记缺少可执行验证入口');
  } else {
    ensure(data.schema_version===1&&data.kind===(key==='manifest'?'existing-project-observation':'existing-engineering-baseline'),'既有原始资产来源类型/版本不匹配');
    ensure(data.source&&/^[a-f0-9]{40}$/.test(data.source.base_commit)&&Array.isArray(data.source.files)&&data.source.files.length&&Array.isArray(data.source.roots)&&data.source.roots.length,'原始资产缺少固定源码提交/文件集/根范围');
    ensure(Array.isArray(data.build_units)&&data.build_units.length,'原始资产缺少实际构建单元');
    if(key==='engineering_baseline') {
      ensure(data.status==='current','stale: 工程基线不是 current');
      fileBinding(root,data.boundary_review);
    }
  }
}
