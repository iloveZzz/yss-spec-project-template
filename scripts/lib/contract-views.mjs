import {readFileSync,withValidationPhase} from './validation-phase.mjs';
import {safe,hash,schema} from './strategic-handoff-io.mjs';
import {parseSliceYaml,readSliceContract} from './slice-contract.mjs';
import {renderSliceContractView,diffSliceContracts} from './slice-contract-views.mjs';

// This is a presentation adapter table, never a lifecycle or approval registry.
export const contractKinds=Object.freeze({
 slice:null,plan:null,spec:null,'product-design':null,'prototype-confirmation':null,'visual-baseline':null,
 'technical-design':'.agents/skills/yss-technical-design/references/technical-design.schema.json',
 'api-decision':'.template-spec/process/schemas/api-contract-decision.schema.json',
 'data-decision':'.template-spec/process/schemas/data-architecture-decision.schema.json',
 scaffold:'.template-spec/process/schemas/project-scaffold-contract.schema.json',
 'scaffold-decision':'.template-spec/process/schemas/scaffold-architecture-decisions.schema.json',
 handoff:null,'backend-delivery':'.template-spec/process/schemas/backend-delivery.schema.json',
 'frontend-acceptance':'.template-spec/process/schemas/frontend-delivery-acceptance.schema.json',approval:null,'user-decision':'.template-spec/process/schemas/user-decision.schema.json',
 'context-reconciliation':'.template-spec/process/schemas/context-reconciliation.schema.json'
});
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const stringify=v=>typeof v==='string'?v:JSON.stringify(v,null,2);
const metadata=/^(schema_version|kind|digest|sha256|subject_digest|.*_digest|.*_sha256|resolution|basis|inputs|sources|artifact_bindings|current_version)$/;
function display(value){
 if(Array.isArray(value))return value.map(display);
 if(!object(value))return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>!metadata.test(key)).map(([k,v])=>[k,display(v)]));
}
function validateKind(kind){if(!Object.hasOwn(contractKinds,kind))throw new TypeError(`未知合同类型 ${kind}；可用：${Object.keys(contractKinds).join(', ')}`);}
function load(ref,root){
 const bytes=readFileSync(safe(root,ref));
 if(/\.md$/i.test(ref)){
  const text=bytes.toString('utf8'),front=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  return{bytes,raw:{...(front?parseSliceYaml(front[1]):{}),正文:front?text.slice(front[0].length):text}};
 }
 const raw=parseSliceYaml(bytes);if(!object(raw))throw new TypeError('合同必须是结构化对象或 Markdown 文档');return{bytes,raw};
}
function references(value,root,rows=[],seen=new Set()){
 if(!value||typeof value!=='object')return rows;
 if(object(value)&&typeof value.ref==='string'&&typeof value.digest==='string'){
  const key=`${value.ref}\0${value.digest}`;
  if(!seen.has(key)){seen.add(key);try{rows.push({ref:value.ref,current:hash(readFileSync(safe(root,value.ref)))===value.digest});}catch(error){rows.push({ref:value.ref,current:false,error:error.message});}}
 }
 if(object(value))for(const [key,ref]of Object.entries(value))if(key.endsWith('_ref')&&typeof ref==='string'&&typeof value[key.replace(/_ref$/,'_digest')]==='string')references({ref,digest:value[key.replace(/_ref$/,'_digest')]},root,rows,seen);
 for(const child of Object.values(value))references(child,root,rows,seen);
 return rows;
}
function declaredBlockers(value,prefix=''){
 if(!value||typeof value!=='object')return[];
 const rows=[];
 for(const [key,child]of Object.entries(value)){
  const field=prefix?`${prefix}.${key}`:key;
  if(['blockers','blocking_findings','stale_inputs','readiness_blockers'].includes(key)&&Array.isArray(child))for(const item of child)rows.push(`${field}: ${stringify(item)}`);
  else rows.push(...declaredBlockers(child,field));
 }
 return rows;
}
function markdown(view){
 const lines=[`# ${view.kind} · ${view.binding.id||view.binding.ref}`,`版本：${view.binding.version||'源资产未声明'}；权威文件：${view.binding.ref}`,`摘要：${view.binding.digest}`,`检查：${view.checks.join('；')}。批准有效性未核验；本视图不授予执行权限。`];
 for(const [name,value]of Object.entries(view.content))if(value!==undefined)lines.push(`## ${name}`,stringify(value));
 if(view.blockers.length)lines.push('## 阻断与未决检查',...view.blockers.map(x=>`- ${x}`));
 return lines.join('\n\n')+'\n';
}
export function viewContract(ref,options={}){return withValidationPhase({root:options.root,purpose:'contract-view',slice_id:ref,work_unit_id:options.unit_id,readOnly:true},()=>view(ref,options));}
function view(ref,{root=process.cwd(),kind,profile='review',unit_id}={}){
 validateKind(kind);if(!['review','task','full'].includes(profile))throw new TypeError(`未知阅读档位 ${profile}`);
 let binding,content,checks=['可读取'],blockers=[],sourceChecks=[];
 if(kind==='slice'){
  const loaded=readSliceContract(ref,{root,diagnostic:true});binding=loaded.binding;blockers.push(...declaredBlockers(loaded.raw));
  const legacy=renderSliceContractView(ref,{root,unit_id:profile==='task'?unit_id:undefined});
  checks.push('Slice 结构及绑定来源');
  if(legacy.diagnostic_only){content={诊断:legacy.blockers,未校验的原合同:loaded.raw};blockers=legacy.blockers.map(b=>b.reason);}
  else if(profile==='full')content={权威合同:loaded.raw,完整视图:legacy};
  else if(profile==='review'){
   content={...legacy.summary,验收:legacy.acceptance,实施范围:{工程:loaded.raw.scope?.project_roots||legacy.constraints.project_roots,允许写入:loaded.raw.scope?.allowed_write_paths||legacy.constraints.allowed_write_paths},关键约束:loaded.raw.scope?.forbidden_patterns||legacy.constraints.forbidden_patterns,停止条件:'来源或批准过期、越界、缺证据、验证失败、drift / violation / new_impacts 时停止并回交。'};
   for(const key of ['risks','risk_acceptance','blockers','pending_decisions','constraints'])if(loaded.raw[key])content[key]=loaded.raw[key];
   for(const [label,pattern]of [['风险',/风险/],['关键取舍',/取舍/],['待决定事项',/待|决定/],['变化',/变化|变更/]])if(!Object.keys(content).some(k=>pattern.test(k)))content[label]='来源未说明，审阅时核实。';
   const reviewKnown=new Set(['schema_version','contract_id','contract_version','slice_id','status','basis','scope','common','lifecycle_refs','applicability','resolution','acceptance','verification','work_units','extensions','ticket_policy']);
   content.未分类约束=Object.fromEntries(Object.entries(loaded.raw).filter(([key])=>!reviewKnown.has(key)));
   content.专项约束=loaded.raw.extensions;content.适用性=loaded.raw.applicability;
   const extensions=loaded.raw.extensions||{};
   for(const [name,extension]of Object.entries(extensions))for(const [key,value]of Object.entries(extension))if(/risk|constraint|decision|block|exception|unknown/.test(key))content[`${name}.${key}`]=value;
  }else{
   if(!unit_id)throw new TypeError('task 视图必须指定 --unit');
   const units=loaded.contract.work_units.filter(u=>u.id===unit_id);if(units.length!==1)throw new TypeError(`工作单元缺失或不唯一: ${unit_id}`);
   content={当前任务:units[0].work_unit||units[0],全局约束:legacy.constraints,专项约束:legacy.extensions,编译约束:loaded.raw.resolution,适用性:loaded.raw.applicability,验收:legacy.acceptance,上游引用:Object.fromEntries(Object.entries(loaded.sources).map(([k,v])=>[k,{ref:v.ref,version:v.version}])),停止条件:'来源或批准过期、越界、缺证据、验证失败、drift / violation / new_impacts 时停止并回交。'};
   const known=new Set(['schema_version','contract_id','contract_version','slice_id','status','basis','scope','applicability','resolution','acceptance','verification','work_units','extensions','ticket_policy']);
   content.其他约束=Object.fromEntries(Object.entries(loaded.raw).filter(([k])=>!known.has(k)));
  }
 }else{
  const {bytes,raw}=load(ref,root);binding={ref,id:raw.contract_id||raw.technical_design_id||raw.decision_id||raw.request?.request_id||raw.handoff_id||raw.baseline_id||raw.spec_id||raw.plan_id||raw.id||null,version:raw.contract_version||raw.decision_version||raw.handoff_version||raw.version||null,digest:hash(bytes)};
  blockers.push(...declaredBlockers(raw));
  let schemaRef=contractKinds[kind];if(kind==='api-decision'&&raw.schema_version===2)schemaRef='.template-spec/process/schemas/api-contract-decision-v2.schema.json';
  if(kind==='frontend-acceptance'&&[1,3].includes(raw.schema_version))schemaRef=`.template-spec/process/schemas/frontend-delivery-acceptance${raw.schema_version===1?'-v1':'-v3'}.schema.json`;
  if(schemaRef)try{schema(raw,schemaRef);checks.push('结构校验');}catch(error){blockers.push(error.message);}
  else checks.push('结构与批准未核验，按资产所有者规则继续');
  sourceChecks=references(raw,root);if(sourceChecks.length)checks.push(`核对 ${sourceChecks.length} 项可识别来源摘要；其余语义由资产所有者核验`);for(const source of sourceChecks)if(!source.current)blockers.push(`来源不可读或过期：${source.ref}`);
  // Unknown business fields remain visible. Only well-known machine metadata is hidden.
  content=profile==='full'?{权威合同:raw,来源核对:sourceChecks}:display(raw);
  if(kind==='api-decision'&&raw.schema_version===2&&raw.draft_review){try{const review=load(raw.draft_review.ref,root).raw;content.实际审查记录=profile==='full'?review:display(review);if(review.result!=='approved'||!Array.isArray(review.blocking_findings)||review.blocking_findings.length)blockers.push('OpenAPI Draft Review 实际记录未批准或有阻断');if(review.draft_ref!==raw.openapi?.ref||review.draft_digest!==raw.openapi?.digest)blockers.push('Draft Review 未绑定当前 OpenAPI');}catch(error){blockers.push(error.message);}}
  if(profile==='task'){
   if(raw.work_units){if(!unit_id)throw new TypeError('含工作单元的合同必须指定 --unit');const matches=raw.work_units.filter(x=>x.id===unit_id);if(matches.length!==1)throw new TypeError(`工作单元缺失或不唯一: ${unit_id}`);content.work_units=matches;}
   content.机器绑定中的约束=Object.fromEntries(['resolution','basis','inputs','sources','artifact_bindings'].filter(k=>raw[k]!==undefined).map(k=>[k,raw[k]]));
   content.约束分类='保留未分类字段；本视图只允许阅读，执行影响由资产所有者核验。';
  }
 }
 const view={read_only:true,execution_allowed:false,kind,profile,binding,checks,approval_validity:'not-checked',content,blockers};view.markdown=markdown(view);return view;
}
export function diffContract(beforeRef,afterRef,{root=process.cwd(),beforeRoot=root,kind}={}){
 validateKind(kind);if(kind==='slice')return diffSliceContracts(beforeRef,afterRef,{root,beforeRoot});
 const before=load(beforeRef,beforeRoot),after=load(afterRef,root),changes=[];
 const walk=(a,b,p)=>{if(JSON.stringify(a)===JSON.stringify(b))return;if(object(a)&&object(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],p?`${p}.${key}`:key);}else changes.push({path:p,before:a??null,after:b??null,category:metadata.test(p.split('.').at(-1))?'binding-change':'requires-review'});};
 walk(before.raw,after.raw,'');const source_checks=[...references(before.raw,beforeRoot).map(x=>({...x,side:'before'})),...references(after.raw,root).map(x=>({...x,side:'after'}))];
 return{read_only:true,approval_reusable:false,execution_allowed:false,before:{ref:beforeRef,digest:hash(before.bytes)},after:{ref:afterRef,digest:hash(after.bytes)},bytes_changed:!before.bytes.equals(after.bytes),changes,source_checks,decision_impact:'必须按当前差异和授权延续协议核验；无法读取旧来源时影响未知。'};
}

/** Mechanical review material only; original decisions and semantic review remain authoritative. */
export function prepareContractReview(beforeRef, afterRef, options = {}) {
  const root = options.root || process.cwd();
  return withValidationPhase({root,purpose:'prepare-contract-review',readOnly:true}, () => {
    validateKind(options.kind);
    const gaps = [];
    const gap = (code, source_ref, reason, recovery) => gaps.push({code,source_ref,reason,recovery});
    const readView = (ref, side, sourceRoot) => {
      try {
        const value = viewContract(ref,{...options,root:sourceRoot,profile:'full'});
        for(const blocker of value.blockers)gap('SOURCE_INVALID',ref,blocker,'恢复当前权威来源并重新校验');
        return value;
      } catch(error) { gap('SOURCE_UNREADABLE',ref,`${side}: ${error.message}`,'提供可读取的原始资产；不推断历史内容');return null; }
    };
    const before = readView(beforeRef,'before',options.beforeRoot||root), after = readView(afterRef,'after',root);
    if(before?.binding.id && after?.binding.id && before.binding.id!==after.binding.id)gap('IDENTITY_CONFLICT',afterRef,'前后资产 ID 不一致','选择同一资产的前后版本');
    if(before?.binding.version && before.binding.version===after?.binding.version && before.binding.digest!==after.binding.digest)gap('VERSION_CONFLICT',afterRef,'相同版本包含不同字节','形成新候选版本并重新核验');
    let diff = null;
    if(before&&after)try{diff=diffContract(beforeRef,afterRef,options);}catch(error){gap('DIFF_UNAVAILABLE',afterRef,error.message,'先修复来源绑定与版本冲突');}
    let originalDecision = null;
    if(options.decision_ref) {
      try {
        const loaded=load(options.decision_ref,root);
        schema(loaded.raw,'.template-spec/process/schemas/user-decision.schema.json');
        originalDecision={ref:options.decision_ref,digest:hash(loaded.bytes),record:loaded.raw};
        for(const row of references(loaded.raw,root))if(!row.current)gap('DECISION_SOURCE_STALE',row.ref,row.error||'原决定来源摘要不匹配','恢复原决定快照；不得重绑旧回复');
      }catch(error){gap('DECISION_UNAVAILABLE',options.decision_ref,error.message,'提供有效的原始决定；本材料不能替代用户回复');}
    }
    if(!options.decision_ref)gaps.push({code:'DECISION_NOT_PROVIDED',source_ref:null,reason:'未提供原决定，不能判断批准延续',recovery:'需要沿用批准时提供原决定及原始回复来源',blocking:false});
    return {
      schema_version:1,kind:'contract-review-preparation',read_only:true,execution_allowed:false,
      approval_reusable:false,approval_validity:'not-checked',semantic_equivalence:'requires-independent-review',
      before:before?.binding||null,after:after?.binding||null,original_decision:originalDecision,
      decision_status:options.decision_ref?(originalDecision?'requires-validation':'missing-or-invalid'):'not-provided',
      source_views:{before:before?.content||null,after:after?.content||null},diff,gaps,
      review_required:['business_scope','acceptance','contract_commitments','authorization','risk_acceptance','quality','external_commitments'],
      next_action:gaps.some(x=>x.blocking!==false)?'repair-source-gaps':'independent-semantic-review',
      blockers:gaps.filter(x=>x.blocking!==false).map(item=>item.reason)
    };
  });
}
