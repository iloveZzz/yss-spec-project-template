import {readContractSource,contractSourceMetadata} from './contract-source.mjs';
import {sliceRepositories} from './slice-repositories.mjs';
import { sliceCheckApplicability } from './slice-applicability.mjs';
import path from 'node:path';
import fs, {withValidationPhase} from './validation-phase.mjs';
import { stringify } from '../vendor/yaml.mjs';
import { safe, hash, digest, write } from './strategic-handoff-io.mjs';
import { compileDefaultImplementationContract, digestDocument, loadCompilerContract } from './implementation-contract-compiler.mjs';
import { normalizeSliceContract, parseSliceYaml, readSliceSources, resolveSliceBasis, sourceSliceContract, sliceArchitectureEvidence } from './slice-contract.mjs';

const object=value=>value && typeof value==='object' && !Array.isArray(value);
const same=(a,b)=>digest(a)===digest(b);
const metadata=contractSourceMetadata;
function mergeFacts(left,right,path,report) {
  if(left===undefined)return structuredClone(right);
  if(right===undefined)return structuredClone(left);
  if(object(left)&&object(right))return Object.fromEntries([...new Set([...Object.keys(left),...Object.keys(right)])].map(key=>[key,mergeFacts(left[key],right[key],`${path}.${key}`,report)]));
  if(!same(left,right))report.blockers.push({field:path,reason:'conflict',before:left,after:right,recovery:'回到来源确认当前事实，不使用最后覆盖'});
  return structuredClone(left);
}
function markdownAcceptance(text) {
  const rows=text.split('\n'),result={};let active=false;
  rows.forEach((line,index)=>{
    if(/^##\s/.test(line))active=/验收/.test(line);
    if(active&&/^\s*-\s+(?:\[[ xX]\]\s*)?\S/.test(line)) {
      const id=/(?:AC|SC|验收)[-_][\w-]+/.exec(line)?.[0] || `acceptance-${Object.keys(result).length+1}`;
      if(result[id])throw new TypeError(`验收 ID 重复: ${id}`);
      result[id]={source:'ticket',locator:`lines:${index+1}-${index+1}`};
    }
  });return result;
}
function lifecycleSources(checkpoint,report) {
  const result={};
  for(const [artifact,key]of Object.entries({'artifact.spec':'spec','artifact.engineering-baseline':'engineering_baseline','artifact.architecture-review':'architecture_review','artifact.technical-design':'technical_design','artifact.data-architecture':'data_architecture','artifact.state-matrix':'state_matrix','artifact.prototype-deliverable':'prototype_deliverable','artifact.prototype-review':'prototype_review','artifact.prototype-confirmation':'prototype_confirmation','artifact.openapi-freeze-record':'openapi_freeze'})) {
    const value=checkpoint.artifacts?.[artifact];if(value===undefined)continue;
    if(typeof value==='string')result[key]={ref:value};
    else if(object(value)&&typeof value.ref==='string')result[key]=Object.fromEntries(['ref','version','digest','approval_ref'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
    else report.blockers.push({field:`artifacts.${artifact}`,reason:'上游引用不明确，需选择当前绑定'});
  }
  return result;
}
/** sources select existing assets; refinements contain ONLY new slice facts, never an approved contract. */
export function prepareSliceImplementationContract(options={}) {
 let result;
 try{return withValidationPhase({root:options.root,purpose:'slice-prepare',slice_id:options.ticket_ref,readOnly:true,signal:options.signal},()=>result=prepare(options));}
 catch(error){
  if(!result||!['VALIDATION_INPUT_CHANGED','VALIDATION_CANCELLED'].includes(error.code))throw error;
  result.slice_contract.status='blocked';result.report.blockers.push({code:error.code==='VALIDATION_INPUT_CHANGED'?'SLICE_INPUT_CONFLICT':error.code,field:'slice',source_ref:null,reason:`${error.message.includes('compiler-contract.yaml')?'编译规则来源冲突':'生成期间来源变化'}: ${error.message}`,responsibility:'professional-review',recovery:'重新读取当前来源并准备新草案'});return result;
 }
}
function prepare({root=process.cwd(),ticket_ref,checkpoint_ref,sources={},refinements={},approved_slice}={}) {
  const started=performance.now();
  const report={read_only:true,blockers:[],sources:{},provenance:[],reason_chains:{},checks:[]};
  const snapshots=new Map();
  const read=ref=>{if(!snapshots.has(ref))snapshots.set(ref,fs.readFileSync(safe(root,ref)));return snapshots.get(ref);};
  let contract={schema_version:3,status:'blocked'};
  try {
    let ticketText='',ticket={},saved={};
    try {ticketText=read(ticket_ref).toString('utf8');ticket=metadata(ticketText);}catch(error){report.blockers.push({code:'SLICE_SOURCE_UNREADABLE',field:'basis.ticket',source_ref:ticket_ref,reason:error.message});}
    if (ticket.kind === 'stage-work-item' || /\/work-items\//.test(ticket_ref || '')) report.blockers.push({code:'STAGE_WORK_ITEM_NOT_IMPLEMENTABLE',field:'basis.ticket',reason:'stage-work-item 不能作为实现 Ticket'});
    if(checkpoint_ref)try {saved=parseSliceYaml(read(checkpoint_ref));}catch(error){report.blockers.push({code:'SLICE_SOURCE_UNREADABLE',field:'checkpoint',source_ref:checkpoint_ref,reason:error.message});}
    const fromTicket=ticket.slice_implementation || {};
    const facts=mergeFacts(saved.slice_implementation || {},fromTicket,'slice',report);
    const input=mergeFacts(facts,refinements,'slice',report);
    for(const field of ['status','resolution','schema_version','readiness'])if(Object.hasOwn(input,field))report.blockers.push({field,reason:'由编译器生成，不接受调用方指定'});
    const inputKeys=['contract_id','contract_version','slice_id','sources','scope','applicability','recipe_ids','required_capabilities','conditions','acceptance','verification','work_units','extensions'];
    for(const field of Object.keys(input))if(!inputKeys.includes(field))report.blockers.push({field,reason:'未知输入字段，禁止静默丢弃'});
    contract={schema_version:3,contract_id:input.contract_id,contract_version:input.contract_version,slice_id:input.slice_id,status:'blocked'};
    for(const field of ['contract_id','contract_version','slice_id','scope','applicability','verification','work_units'])if(input[field]===undefined)report.blockers.push({code:'SLICE_INPUT_MISSING',field:`slice.${field}`,reason:'缺少切片必要输入',recovery:'优先从 Ticket / checkpoint 整理；只补缺失的切片细化'});
    for(const field of ['impacted_areas','allowed_write_paths'])if(input.scope?.[field]===undefined)report.blockers.push({code:'SLICE_INPUT_MISSING',field:`scope.${field}`,reason:'影响与授权范围未确定',responsibility:field==='allowed_write_paths'?'user-decision':'professional-review',recovery:'先确认影响与既有授权范围；不能从目录猜测'});

    const selected=mergeFacts(lifecycleSources(saved,report),mergeFacts(input.sources || {},sources,'sources',report),'sources',report);
    if(selected.ticket && (typeof selected.ticket==='string'?selected.ticket:selected.ticket.ref)!==ticket_ref)throw new TypeError('Ticket 来源冲突');
    selected.ticket=selected.ticket || {ref:ticket_ref};
    if(input.scope?.risk_level){selected.lifecycle_registry??={ref:'.template-spec/process/lifecycle-registry.yaml'};selected.process_tailoring??={ref:'.template-spec/process/harness-process-tailoring.md'};}
    if(!selected.context&&fs.existsSync(safe(root,'CONTEXT.md',{missing:true})))selected.context={ref:'CONTEXT.md'};
    const basis={},seen=new Map();
    for(const [key,value] of Object.entries(selected)) {
      try {
      if(typeof value==='string' && Object.hasOwn(selected,value)) {basis[key]=value;continue;}
      const binding=typeof value==='string'?{ref:value}:value;
      const source=readContractSource(binding,{root,read});
      const rawDigest=source.binding.digest;
      basis[key]=source.binding;
      if(seen.has(binding.ref)) {
        const previous=seen.get(binding.ref);
        if(!same(basis[key],basis[previous]))throw new TypeError(`来源绑定冲突: ${key}/${previous}`);
        basis[key]=previous;
      }else seen.set(binding.ref,key);
      report.provenance.push({target:`basis.${key}`,source_ref:binding.ref,digest:rawDigest,rule:'original-bytes'});
      }catch(error){report.blockers.push({code:(error.code==='ENOENT'||/文件不可读/.test(error.message))?'SLICE_SOURCE_UNREADABLE':/冲突/.test(error.message)?'SLICE_SOURCE_CONFLICT':'SLICE_SOURCE_INVALID',field:`basis.${key}`,source_ref:typeof value==='string'?value:value?.ref,reason:error.message,responsibility:'agent',recovery:'补齐当前来源或纠正绑定后重新准备'});}
    }
    const extraRequired=[...(input.applicability?.backend?.status==='required'?['technical_design','repository_registration','manifest','backend_repository','maven_wrapper']:[]),...(input.applicability?.frontend?.status==='required'?(input.applicability.frontend.baseline_kind==='existing-ui-baseline'?['existing_ui_baseline','frontend_delivery']:['requirement_freeze','low_fidelity_review','prototype_review','prototype_profile_decision','prototype_deliverable','prototype_deliverable_verification','prototype_confirmation','visual_baseline','state_matrix']):[]),...(input.applicability?.api?[input.applicability.api.status==='required'?'openapi_freeze':'no_api_impact_record']:[])];
    for(const key of ['spec','ticket','engineering_baseline','implementation_repository','build_architecture_checklist',...extraRequired,...(!input.scope?.risk_level?['architecture_review']:[])])if(!selected[key])report.blockers.push({code:'SLICE_SOURCE_MISSING',field:`basis.${key}`,reason:'缺少必要来源',responsibility:'agent',recovery:'绑定已有当前资产；不能用空文档替代'});
    contract.basis=basis;
    if(report.blockers.length){report.checks.push({check:'dependent-compilation',result:'not-executed',reason:'来源或输入存在独立阻断'});throw Object.assign(new Error('依赖未就绪'),{code:'SLICE_DEPENDENCIES_UNAVAILABLE'});}
    const sourceDoc=key=>basis[key]?metadata(read(resolveSliceBasis({basis},key).ref).toString('utf8')):{};
    const registration=sourceDoc('implementation_repository'),baseline=sourceDoc('engineering_baseline');
    const registeredRoot=registration.local_worktree?(registration.project_root&&registration.project_root!=='.'?path.resolve(registration.local_worktree,registration.project_root):registration.local_worktree):undefined;
    const scope={...(registeredRoot?{project_roots:[registeredRoot]}:{}),...input.scope};
    // Registration is an upper bound. Never use its allowed_write_paths as slice authorization.
    if(!input.extensions?.cross_repo?.repository_bindings&&registeredRoot&&scope.project_roots?.some(p=>p!==registeredRoot))throw new TypeError('实施仓库与登记冲突');
    if(!input.extensions?.cross_repo?.repository_bindings&&registration.allowed_write_paths && scope.allowed_write_paths) {
      const {withinSlicePath}=helpers;
      if(scope.allowed_write_paths.some(p=>!registration.allowed_write_paths.some(parent=>withinSlicePath(p,parent))))throw new TypeError('Slice 写范围超出登记');
    }
    const applicability=structuredClone(input.applicability);
    if(scope.risk_level){const calculated=sliceCheckApplicability(scope,sourceDoc('lifecycle_registry'));if(applicability.checks&&!same(applicability.checks,calculated))throw new TypeError('材料适用性与生命周期规则冲突');applicability.checks=calculated;}
    const architecture_identity=baseline.architecture_identity || registration.architecture_identity;
    if(baseline.architecture_identity&&registration.architecture_identity&&!same(baseline.architecture_identity,registration.architecture_identity))throw new TypeError('工程基线与登记架构冲突');
    const bound=key=>basis[key]?resolveSliceBasis({basis},key):undefined;
    const architecture_evidence=architecture_identity?sliceArchitectureEvidence({basis,resolution:{architecture_identity}},readSliceSources({basis},{root})):undefined;
    const compilerRules=loadCompilerContract();
    scope.full_reroute_triggers=[...new Set([...(compilerRules.full_reroute_triggers||[]),...(scope.full_reroute_triggers||[])])];
    for(const impact of input.extensions?.backend?.component_impacts||[])if(!compilerRules.impact_to_capabilities[impact])throw new TypeError(`未知组件影响: ${impact}`);
    const componentCapabilities=(input.extensions?.backend?.component_impacts||[]).flatMap(impact=>compilerRules.impact_to_capabilities[impact]||[]);
    const compileBase={root,slice_id:input.slice_id,conditions:input.conditions||[]};
    let compiled;
    if(input.extensions?.cross_repo?.repository_bindings) {
      const repositories=sliceRepositories({basis,scope,extensions:input.extensions,work_units:input.work_units,resolution:{}},readSliceSources({basis},{root}),{root});
      const results=Object.entries(repositories).map(([projectRoot,repo])=>{
        const recipeIds=repo.recipe_refs||(input.recipe_ids||[]).filter(id=>!id.startsWith('backend.')&&!id.startsWith('frontend.')||id.startsWith(`${repo.project.delivery_role}.`));
        const requiredCapabilities=repo.capability_refs||input.required_capabilities||[];
        if(recipeIds.some(id=>!(input.recipe_ids||[]).includes(id))||requiredCapabilities.some(id=>!(input.required_capabilities||[]).includes(id)))throw new TypeError('逐仓编译引用不属于切片新增输入');
        return compileDefaultImplementationContract({...compileBase,recipeIds,requiredCapabilities:[...requiredCapabilities,...(repo.project.delivery_role==='backend'?componentCapabilities:[])],architecture_identity:repo.resolution.architecture_identity,architecture_evidence:repo.resolution.architecture_evidence,technical_design:repo.resolution.technical_design,...(repo.resolution.frontend_delivery?{frontend_delivery:repo.resolution.frontend_delivery}:{}),...(approved_slice?{approved_slice,work_unit_id:input.work_units.find(u=>u.project_root===projectRoot)?.id}:{})});
      });
      if(results.some(r=>r.registry_digest!==results[0].registry_digest||r.compiler_contract_digest!==results[0].compiler_contract_digest))throw new TypeError('逐仓编译依据冲突：准备期间来源发生变化');
      const componentBindings=[...new Map(results.flatMap(result=>result.component_bindings||[]).map(binding=>[digestDocument(binding),binding])).values()];
      compiled={...results[0],required_capabilities:[...new Set(results.flatMap(r=>r.required_capabilities))],required_skills:[...new Set(results.flatMap(r=>r.required_skills))],recipe_ids:[...new Set(results.flatMap(r=>r.recipe_ids))],readiness_blockers:results.flatMap(r=>r.readiness_blockers||[]),reason_chains:Object.fromEntries(Object.keys(repositories).map((p,i)=>[p,results[i].reason_chains])),...(componentBindings.length?{component_bindings:componentBindings,component_bindings_digest:digestDocument(componentBindings)}:{})};
      delete compiled.architecture_identity;
    } else compiled=compileDefaultImplementationContract({...compileBase,recipeIds:input.recipe_ids||[],requiredCapabilities:[...new Set([...(input.required_capabilities||[]),...componentCapabilities])],architecture_identity,architecture_evidence,technical_design:bound('technical_design'),...(bound('frontend_delivery')?{frontend_delivery:{acceptance_ref:bound('frontend_delivery').ref,digest:bound('frontend_delivery').digest}}:{}),...(approved_slice?{approved_slice}:{})});
    if(compiled.compiler_contract_digest!==digest(compilerRules).slice(7))throw new TypeError('编译规则来源冲突：准备期间发生变化');
    const resolution=Object.fromEntries(['required_capabilities','required_skills','recipe_ids','conditions','registry_digest','compiler_contract_digest','architecture_identity','component_bindings','component_bindings_digest'].filter(key=>compiled[key]!==undefined).map(key=>[key,compiled[key]]));
    contract={schema_version:3,ticket_policy:{mode:'frozen-requirements',state_owner:'tracker-or-task-package'},contract_id:input.contract_id,contract_version:input.contract_version,slice_id:input.slice_id,status:'draft',basis,scope,applicability,resolution,acceptance:input.acceptance||markdownAcceptance(ticketText),verification:input.verification,work_units:input.work_units,...(input.extensions?{extensions:input.extensions}:{})};
    report.reason_chains=compiled.reason_chains;
    for(const reason of compiled.readiness_blockers||[])report.blockers.push({reason});
    normalizeSliceContract(contract,{root});
    report.checks.push({check:'structure-sources-scope-acceptance',result:'pass'});
    report.provenance.push({target:'resolution',source_ref:'.template-spec/agents/yss-skill-registry.yaml',digest:compiled.registry_digest,rule:'existing-capability-compiler'});
    for(const field of ['scope','acceptance','verification','work_units','applicability','extensions'])if(contract[field]) {
      const origins=[];
      if(saved.slice_implementation?.[field]!==undefined)origins.push({kind:'checkpoint',ref:checkpoint_ref});
      if(fromTicket[field]!==undefined)origins.push({kind:'ticket-metadata',ref:ticket_ref});
      if(refinements[field]!==undefined)origins.push({kind:'agent-refinement'});
      if(field==='scope'&&registeredRoot&&!input.scope?.project_roots)origins.push({kind:'repository-registration',ref:resolveSliceBasis({basis},'implementation_repository').ref});
      if(field==='scope'&&input.extensions?.cross_repo?.repository_bindings)for(const keys of Object.values(input.extensions.cross_repo.repository_bindings))origins.push({kind:'repository-registration',ref:resolveSliceBasis({basis},keys.implementation_repository).ref});
      if(field==='acceptance'&&!input.acceptance)origins.push({kind:'ticket-acceptance',ref:ticket_ref});
      if(field==='applicability'&&scope.risk_level)origins.push({kind:'lifecycle-rule',ref:resolveSliceBasis({basis},'lifecycle_registry').ref});
      report.provenance.push({target:field,origins,requires_professional_review:true});
    }
  }catch(error){if(error.code!=='SLICE_DEPENDENCIES_UNAVAILABLE')report.blockers.push({...(error.code?{code:error.code}:{}),reason:error.message,recovery:'补齐已确认输入后重新准备；草案不授予执行权限'});report.checks.push({check:'assembly',result:'not-executed',reason:'前置检查未通过'});}
  for(const [ref,bytes] of snapshots) {
    try {if(hash(fs.readFileSync(safe(root,ref)))!==hash(bytes))report.blockers.push({field:ref,reason:'生成期间来源变化'});}catch(error){report.blockers.push({field:ref,reason:error.message});}
    report.sources[ref]=hash(bytes);
  }
  report.blockers=report.blockers.map(b=>({code:b.code||(/conflict|冲突/.test(b.reason)?'SLICE_INPUT_CONFLICT':'SLICE_INPUT_INVALID'),field:b.field||'slice',source_ref:b.source_ref||null,responsibility:b.responsibility||(/user.decision|用户决定|实施授权/.test(b.reason)?'user-decision':/conflict|冲突|技术设计|架构/.test(b.reason)?'professional-review':'agent'),recovery:b.recovery||'核对所列来源并补齐细化后重新准备',...b}));
  report.blockers=report.blockers.filter((b,i,all)=>all.findIndex(x=>x.code===b.code&&x.field===b.field&&x.source_ref===b.source_ref)===i);
  contract.status=report.blockers.length?'blocked':'ready-for-lifecycle-review';
  report.metrics={elapsed_ms:Math.round(performance.now()-started),preparation_round:null,additional_human_confirmations:null,reapproval_reasons:[],measurement:'observed-preparation-only; interaction counts not recorded',unique_source_files:snapshots.size,refinement_fields:Object.keys(refinements).length,contract_bytes:Buffer.byteLength(stringify({slice_contract:contract}))};
  return {slice_contract:contract,report};
}
import * as helpers from './slice-contract.mjs';

export function persistSliceDraft(result,ref,{root=process.cwd()}={}) {
  if(!['draft','blocked','ready-for-lifecycle-review'].includes(result.slice_contract?.status))throw new TypeError('只能保存编译器草案');
  for(const [source,expected]of Object.entries(result.report?.sources||{}))if(hash(fs.readFileSync(safe(root,source)))!==expected)throw new TypeError(`stale: 保存前来源变化 ${source}`);
  if(result.slice_contract.status!=='blocked')normalizeSliceContract(result.slice_contract,{root});
  const bytes=stringify({slice_contract:result.slice_contract});
  const reportRef=`${ref}.preparation.json`;
  if(fs.existsSync(safe(root,reportRef,{missing:true})))throw Object.assign(new TypeError('EEXIST: 准备报告目标已存在'),{code:'EEXIST'});
  write(root,ref,bytes); // wx: never overwrite a draft or approval.
  write(root,reportRef,JSON.stringify({binding:{ref,digest:hash(bytes)},...result.report},null,2)+'\n');
  return ref;
}

/** Explicit, non-destructive migration; no new authorization is inferred. */
export function migrateSliceContractV2(document,{root=process.cwd(),ticket_ref,sources={},refinements={},...rest}={}) {
  const old=sourceSliceContract(document);
  if(old?.schema_version!==2)throw new TypeError('显式迁移只接受 Slice v2');
  const conflicts=[];
  const meaningful=value=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
  const compare=(a,b,label)=>{if(meaningful(a)&&meaningful(b)&&!same(a,b))conflicts.push({field:label,reason:'conflict',before:a,after:b});};
  for(const key of ['required_skills','required_capabilities'])compare(old.common?.[key],old.resolution?.[key],key);
  compare(old.frontend?.delivery,old.resolution?.frontend_delivery,'frontend_delivery');
  const constraintKeys=['application_boundary','transaction_boundary','persistence_strategy','aggregate_refs','invariant_refs','state_behavior_refs','gateway_boundary_ref','domain_test_seams','application_test_seams'];
  for(const key of constraintKeys)compare(old.backend?.[key],old.backend?.tactical_ddd?.[key],`backend.${key}`);
  if(refinements.contract_version===undefined||refinements.contract_version===String(old.contract_version))conflicts.push({field:'contract_version',reason:'迁移必须指定新版本'});
  if(old.readiness?.blockers?.length||old.readiness?.stale_inputs?.length)conflicts.push({field:'readiness',reason:'旧合同仍有阻断或过期输入'});
  const sourceMap=Object.fromEntries(Object.entries(old.lifecycle_refs||{}).filter(([,v])=>typeof v==='string'&&v).map(([k,v])=>[k,{ref:v}]));
  for(const [key,binding]of Object.entries({...old.resolution?.architecture_evidence,...(old.resolution?.technical_design?{technical_design:old.resolution.technical_design}:{})})) {
    if(!binding?.ref)continue;
    if(sourceMap[key]&&sourceMap[key].ref!==binding.ref)conflicts.push({field:`basis.${key}`,reason:'阅读引用与冻结绑定冲突'});
    sourceMap[key]=binding;
  }
  if(sourceMap.openapi_freeze_or_no_impact){sourceMap[old.contract?.api_impact?'openapi_freeze':'no_api_impact_record']=sourceMap.openapi_freeze_or_no_impact;delete sourceMap.openapi_freeze_or_no_impact;}
  const frontendBinding=old.frontend?.delivery||old.resolution?.frontend_delivery;
  if(frontendBinding)sourceMap.frontend_delivery={ref:frontendBinding.acceptance_ref,digest:frontendBinding.digest};
  if(sourceMap.tactical_design&&!sourceMap.technical_design)sourceMap.technical_design=sourceMap.tactical_design;
  const applicability=Object.fromEntries(['frontend','backend','api','cross_repo'].map(key=>{
    const required=key==='api'?old.contract?.api_impact:key==='cross_repo'?old.cross_repo?.repositories?.length>1:old[key]?.status==='required';
    const reason=old.readiness?.not_applicable?.find(x=>x.item===key)?.reason;
    return [key,required?{status:'required'}:{status:'not-applicable',reason:reason||refinements.applicability?.[key]?.reason}];
  }));
  const scopeKeys=['impacted_areas','implementation_path_policy','project_roots','allowed_write_paths','forbidden_patterns','context_plan','doubt_driven_review','human_review_points','full_reroute_triggers','optional_skills','unavailable_skills'];
  const scope=Object.fromEntries(scopeKeys.filter(k=>old.common?.[k]!==undefined).map(k=>[k,old.common[k]]));
  const checkUnknown=(value,known,prefix)=>{for(const [key,item]of Object.entries(value||{}))if(meaningful(item)&&!known.includes(key))conflicts.push({field:`${prefix}.${key}`,reason:'未映射约束，禁止静默丢弃'});};
  checkUnknown(old,['schema_version','contract_id','contract_version','slice_id','status','suggested_owner_role_id','lifecycle_refs','readiness','resolution','common','frontend','backend','contract','cross_repo','work_units'],'root');
  checkUnknown(old.common,[...scopeKeys,'required_capabilities','required_skills','verification_commands','expected_evidence_files','quality_baseline_ref'],'common');
  checkUnknown(old.resolution,['schema_version','status','slice_id','architecture_identity','architecture_identity_digest','architecture_evidence','technical_design','frontend_delivery','profile_maturity','readiness_blockers','skill_profiles','recipe_ids','conditions','required_capabilities','required_skills','component_bindings','component_bindings_digest','reason_chains','non_expanding_dependencies','excluded_conditional_dependencies','registry_digest','compiler_contract_digest','compiled_at','freshness'],'resolution');
  const ticketRef=ticket_ref||old.lifecycle_refs?.ticket;
  let acceptance=refinements.acceptance;
  if(!acceptance){try{acceptance=markdownAcceptance(fs.readFileSync(safe(root,ticketRef),'utf8'));}catch(error){conflicts.push({field:'acceptance',reason:error.message});acceptance={};}}
  const verification={},work_units=[],extensions={};
  for(const entry of old.work_units||[]) {
    const unit=entry.work_unit||entry;
    for(const key of ['allowed_write_paths','verification_commands','expected_evidence'])compare(entry[key],unit[key],`work_units.${entry.id}.${key}`);
    const projectRoot=unit.project_root||entry.project_root||(scope.project_roots?.length===1?scope.project_roots[0]:undefined);
    const acceptanceRefs=unit.acceptance_refs||(Object.keys(acceptance).length===1?Object.keys(acceptance):[]);
    const seams=[...(old.frontend?.component_test_seams||[]),...(old.frontend?.e2e_paths||[]),...(old.backend?.domain_test_seams||old.backend?.tactical_ddd?.domain_test_seams||[]),...(old.backend?.application_test_seams||old.backend?.tactical_ddd?.application_test_seams||[])];
    const evidence=[...new Set([...(old.common?.expected_evidence_files||[]),...(unit.expected_evidence||[])])];
    const refs=[];
    for(const command of new Set([...(old.common?.verification_commands||[]),...(unit.verification_commands||[])])) {
      const check={command,cwd:projectRoot,expected_evidence:evidence,test_seams:seams,acceptance_refs:acceptanceRefs};
      const existing=Object.entries(verification).find(([,v])=>same(v,check));
      const id=existing?.[0]||`verify-${Object.keys(verification).length+1}`;verification[id]=check;refs.push(id);
    }
    const allowed=unit.allowed_write_paths||entry.allowed_write_paths;
    const next={id:entry.id||unit.id,role_id:entry.role_id||unit.role_id,behavior:unit.behavior,primary_skill:unit.primary_skill,tdd_mode:unit.tdd_mode,verification_refs:refs,acceptance_refs:acceptanceRefs};
    for(const key of ['supporting_skills','controlled_generation','downstream_consumers','convergence_ref','forbidden_patterns'])if(meaningful(unit[key]||entry[key]))next[key]=unit[key]||entry[key];
    if(allowed&&!same(allowed,scope.allowed_write_paths))next.allowed_write_paths=allowed;
    if(scope.project_roots?.length>1)next.project_root=projectRoot;
    work_units.push(next);
    checkUnknown(unit,['id','behavior','role_id','runtime_id','execution_state','workflow_status','task_package_ref','contract_id','contract_version','architecture_identity','project_root','primary_skill','supporting_skills','tdd_mode','allowed_write_paths','expected_evidence','verification_commands','controlled_generation','acceptance_refs','downstream_consumers','convergence_ref','forbidden_patterns'],'work_unit');
  }
  const subset=(value,keys)=>Object.fromEntries(keys.filter(k=>meaningful(value?.[k])).map(k=>[k,value[k]]));
  if(applicability.frontend.status==='required')extensions.frontend=subset(old.frontend,['visual_baseline_case_ids','component_test_seams','e2e_paths','generated_api_client_ref','implementation_verification_ref']);
  if(applicability.backend.status==='required') {
    const constraints={...subset(old.backend,constraintKeys),...subset(old.backend?.tactical_ddd,constraintKeys)};
    extensions.backend={...subset(old.backend,['affected_layers','component_impacts','seam_deferred']),design_refs:['pointer:/design'],...(Object.keys(constraints).length?{constraints}:{})};
  }
  if(applicability.api.status==='required')extensions.api=subset(old.contract,['generated_clients','contract_tests','regeneration_commands']);
  if(applicability.cross_repo.status==='required')extensions.cross_repo=subset(old.cross_repo,['delivery_order','integration_verification','rollback_order']);
  for(const [section,data]of Object.entries({frontend:old.frontend,backend:old.backend})) {
    if(data?.status!=='required')continue;
    for(const key of ['allowed_write_paths','forbidden_patterns','verification_commands','expected_evidence_files'])if(meaningful(data[key])&&!same(data[key],old.common?.[key]))conflicts.push({field:`${section}.${key}`,reason:'独有约束须显式映射至对应工作单元'});
  }
  const knownSub=['status','required_skills','allowed_write_paths','forbidden_patterns','verification_commands','expected_evidence_files'];
  checkUnknown(old.frontend,[...knownSub,'approved_prototype_ref','state_matrix_ref','visual_baseline_ref','visual_baseline_case_ids','component_test_seams','e2e_paths','generated_api_client_ref','implementation_verification_ref','delivery'],'frontend');
  checkUnknown(old.backend,[...knownSub,...constraintKeys,'affected_layers','component_impacts','tactical_design_ref','tactical_design_version','tactical_ddd','seam_deferred'],'backend');
  checkUnknown(old.contract,['api_impact','freeze_ref','no_api_impact_ref','generated_clients','contract_tests','regeneration_commands'],'contract');
  checkUnknown(old.cross_repo,['repositories','delivery_order','integration_verification','rollback_order'],'cross_repo');
  const base={contract_id:old.contract_id,slice_id:old.slice_id,scope,applicability,recipe_ids:old.resolution?.recipe_ids,required_capabilities:old.resolution?.required_capabilities,conditions:old.resolution?.conditions,acceptance,verification,work_units,...(Object.keys(extensions).length?{extensions}:{})};
  const migrated=mergeFacts(base,refinements,'migration', {blockers:conflicts});
  migrated.contract_version=refinements.contract_version;
  const result=prepareSliceImplementationContract({root,ticket_ref:ticketRef,sources:mergeFacts(sourceMap,sources,'sources',{blockers:conflicts}),refinements:migrated,...rest});
  result.report.blockers.push(...conflicts);
  result.report.migration={from_schema:2,to_schema:3,approval_inherited:false};
  if(result.report.blockers.length)result.slice_contract.status='blocked';
  return result;
}
