import path from 'node:path';
import {existsSync, readFileSync} from './validation-phase.mjs';
import {readInstanceMetadata} from './instance-metadata.mjs';
import {assertGateChecks} from './lifecycle-controls.mjs';
import {assertPlanAggregateApproval} from './plan-spec-entry.mjs';
import {selectApprovalRecord} from './approval-record-io.mjs';
import {checkBusinessTickets} from './business-tickets.mjs';
import {verifyContextReconciliation} from './context-reconciliation.mjs';
import {parseContextContract,parseContextSource,resolveContextTermRefs,verifyContextSnapshot} from './context-contract.mjs';
import {withSourceContextSnapshot} from './source-context-snapshot.mjs';
import {read, safe, ensure, hash, digest, parse, relative, files, schema, sourceApprovalPolicy, assertHandoffEvidenceRef} from './strategic-handoff-io.mjs';

const packageSchema='.template-spec/process/schemas/spec-baseline-package.schema.json';
const receiptSchema='.template-spec/process/schemas/spec-baseline-import-receipt.schema.json';
const sourceProfile='harness.spec-template',targetProfile='harness.business-ddd-strategy-handoff';
const assetRef=(state,id,field)=>state[field] || state.artifacts?.[id]?.ref || '';
function relatedTermRefs(proof,glossary) {
  const required=new Set();
  const collect=value=>{if(Array.isArray(value)){value.forEach(collect);return;}if(value&&typeof value==='object'){if(Array.isArray(value.context_snapshot?.term_refs))value.context_snapshot.term_refs.forEach(ref=>required.add(ref));Object.values(value).forEach(collect);}};
  collect(proof.state);
  const refs=new Set([proof.source.plan_ref,proof.source.spec_ref,proof.source.domain_strategy_ref,proof.source.stage_decision_package_ref,proof.source.business_ticket_set_ref,proof.state.plan_review_ref,proof.state.context_reconciliation?.ref].filter(Boolean));
  if(proof.source.business_ticket_set_ref)for(const ticket of read(safe(proof.sourceRoot,proof.source.business_ticket_set_ref)).tickets || [])refs.add(ticket.ref);
  for(const ref of refs) {
    const bytes=readFileSync(safe(proof.sourceRoot,ref),'utf8').replace(/\r\n/g,'\n');
    if(/\.md$/i.test(ref)) {if(bytes.startsWith('---\n')){const end=bytes.indexOf('\n---',4);if(end>=0)collect(parse(bytes.slice(4,end)));}}
    else collect(parse(bytes));
  }
  if(!required.size)for(const term of glossary.business_terms)required.add(term.term_ref);
  return [...required];
}
function identity(root,profile) {
  const metadata=readInstanceMetadata(root);
  ensure(metadata?.kind==='native'&&metadata.profile===profile,`Spec baseline 必须使用已初始化的原生 ${profile} Profile`);
  for(const field of ['cliVersion','templateVersion','legacyCliVersion'])ensure(typeof metadata.metadata[field]==='string'&&metadata.metadata[field].trim(),`Spec baseline 原生身份缺少有效 ${field}`);
  const installed=read(safe(root,'.template-spec/process/harness-profile.yaml'));
  ensure(installed.schema_version===2&&installed.profile_id===metadata.metadata.profileId&&installed.instantiation?.cli_package==='yss'&&installed.instantiation?.native_profile===profile&&installed.instantiation?.metadata_file==='.yss.json','Spec baseline 安装Profile合同与原生身份不一致');
  return metadata.metadata;
}
export function inspectSpecBaselineSource(root,checkpointRef,expected) {
  const metadata=identity(root,'spec'),state=read(safe(root,checkpointRef));
  schema(state,'.template-spec/process/schemas/lifecycle-checkpoint.schema.json');
  ensure(state.repository_mode==='project-instance'&&state.context_reconciliation?.status==='reconciled'&&state.context_reconciliation.ref,'Spec baseline 来源必须有当前Context对账');
  verifyContextReconciliation(safe(root,state.context_reconciliation.ref),{root});
  ensure(!state.upstream_spec_baseline,'Spec baseline 来源必须为本地批准的 Spec');
  const registry=read(safe(root,'.template-spec/process/lifecycle-registry.yaml'));
  const rolesDoc=sourceApprovalPolicy(read(safe(root,'.template-spec/agents/digital-human-roles.yaml')));
  for(const gate of ['gate.plan-approved','gate.spec-baseline-approved'])assertGateChecks(gate,state,{root,registry,rolesDoc});
  assertPlanAggregateApproval(state,{root,registry,rolesDoc});
  const planReview=read(safe(root,state.plan_review_ref)),declaredPlan=assetRef(state,'artifact.plan','plan_ref');
  ensure(!declaredPlan||declaredPlan===planReview.plan_ref,'Spec baseline 当前 Plan 资产与批准审阅包引用冲突');
  const specRef=assetRef(state,'artifact.spec','spec_ref');
  ensure(specRef,'Spec baseline checkpoint 缺少当前 Spec 引用');
  ensure(state.artifacts?.['artifact.spec']?.status==='approved','Spec baseline 来源 Spec 资产必须当前 approved');
  ensure(!state.spec_ref||state.spec_ref===state.artifacts['artifact.spec'].ref,'Spec baseline spec_ref 与当前 Spec 资产引用冲突');
  const specDigest=hash(readFileSync(safe(root,specRef)));
  const basis=state.gates['gate.spec-baseline-approved'].basis;
  ensure(basis.some(row=>row.ref===specRef&&String(row.digest).replace(/^sha256:/,'')===specDigest.slice(7)),'Spec 批准未覆盖当前 Spec 原始字节');
  const specApproval=selectApprovalRecord(read(safe(root,state.gates['gate.spec-baseline-approved'].approval_ref)),'gate.spec-baseline-approved');
  ensure((specApproval.basis||[]).some(row=>row.ref===specRef&&String(row.digest).replace(/^sha256:/,'')===specDigest.slice(7))||(specApproval.subject_ref===specRef&&String(specApproval.subject_digest).replace(/^sha256:/,'')===specDigest.slice(7)),'当前 Spec 原始字节不在已验证批准的范围内');
  const source={profile_id:sourceProfile,feature_id:state.feature_id || state.feature || state.ticket_id || '',checkpoint_ref:checkpointRef,checkpoint_digest:hash(readFileSync(safe(root,checkpointRef))),template_commit:metadata.templateCommit,spec_ref:specRef,spec_digest:specDigest,
    plan_ref:declaredPlan||planReview.plan_ref,domain_strategy_ref:assetRef(state,'artifact.domain-strategy','domain_strategy_ref'),stage_decision_package_ref:assetRef(state,'artifact.stage-decision-package','stage_decision_package_ref'),business_ticket_set_ref:assetRef(state,'artifact.business-ticket-set','business_ticket_set_ref'),product_design_required:true};
  // The approved Plan review is the human-confirmed scope. Extra checkpoint rows cannot extend it.
  const planBasis=planReview.basis;
  for(const field of ['plan_ref','domain_strategy_ref','stage_decision_package_ref'])if(source[field]){
    const current=hash(readFileSync(safe(root,source[field]))).slice(7);
    ensure(planBasis.some(row=>row.ref===source[field]&&String(row.digest).replace(/^sha256:/,'')===current),`Spec baseline 当前 ${field} 未被有效 Plan 批准覆盖`);
  }
  ensure(source.business_ticket_set_ref,'Spec baseline checkpoint 缺少业务 Ticket 草案集合');
  const strategy=source.domain_strategy_ref?read(safe(root,source.domain_strategy_ref)):null;
  const stage=source.stage_decision_package_ref?read(safe(root,source.stage_decision_package_ref)):null;
  for(const [kind,value] of [['domain-strategy',strategy],['stage-decision-package',stage]])if(value){
    ensure([2,3].includes(value.schema_version),`Spec baseline 来源 ${kind} schema_version 不支持`);
    schema(value,`.template-spec/process/schemas/strategic-handoff-${kind}${value.schema_version===3?'-v3':''}.schema.json`);
    verifyContextSnapshot(value.context_snapshot,{root});
    ensure(value.status==='approved',`Spec baseline 来源 ${kind} 必须当前 approved`);
  }
  if(source.stage_decision_package_ref) {
    const binding=stage.domain_strategy_ref;
    ensure(strategy&&binding.domain_strategy_id===strategy.domain_strategy_id&&binding.domain_version===strategy.domain_version&&binding.status==='approved'&&binding.persisted_ref===source.domain_strategy_ref&&binding.digest===digest(strategy),'Spec baseline 阶段决策未绑定当前批准的领域策略');
    const impact=stage.impact_assessment;
    source.product_design_required=typeof impact.product_design==='boolean'?impact.product_design:impact.ui!==false;
  }
  if(source.business_ticket_set_ref) {
    const report=checkBusinessTickets({root,setRef:source.business_ticket_set_ref,mode:'draft'});
    ensure(report.status==='passed'&&report.spec.ref===specRef&&report.spec.digest===specDigest,'Spec baseline 业务票草案未绑定当前 Spec');
  }
  if(expected)ensure(digest(source)===digest(expected),'Spec baseline manifest 与源 checkpoint 事实不一致');
  return {source,state,registry,rolesDoc};
}

/** Frozen package readers validate original bytes and the source approval policy. */
export function verifySpecBaselinePackage(packageRoot) {
  const manifest=read(safe(packageRoot,'manifest.json'));schema(manifest,packageSchema);
  const {bundle_digest,...unsigned}=manifest;
  ensure(digest(unsigned)===bundle_digest,'Spec baseline manifest 摘要不一致');
  const seen=new Set(),originals=new Set();let size=0;
  for(const file of manifest.files) {
    relative(file.original_ref);assertHandoffEvidenceRef(file.original_ref);
    const expected=`payload/files/${file.original_ref==='CONTEXT.md'?'source-context.snapshot.md':file.original_ref}`;
    ensure(file.path===expected&&!seen.has(file.path)&&!originals.has(file.original_ref),'Spec baseline 文件重复或映射非法');
    seen.add(file.path);originals.add(file.original_ref);
    const bytes=readFileSync(safe(packageRoot,file.path));size+=bytes.length;
    ensure(bytes.length===file.size_bytes&&hash(bytes)===file.sha256,'Spec baseline 文件原始字节漂移: '+file.original_ref);
  }
  ensure(size<=104857600,'Spec baseline 超过大小限制');
  ensure(JSON.stringify(files(packageRoot).sort())===JSON.stringify(['manifest.json',...seen].sort()),'Spec baseline 存在未登记文件');
  const sourceRoot=safe(packageRoot,'payload/files');
  const proof=withSourceContextSnapshot(sourceRoot,()=>inspectSpecBaselineSource(sourceRoot,manifest.source.checkpoint_ref,manifest.source));
  return {manifest,sourceRoot,...proof};
}

/** One proof reader for entry, resume, transitions, business formalization and final export. */
export function verifySpecBaselineBinding(state,{root=process.cwd(),requireReconciliation=true}={}) {
  const binding=state?.upstream_spec_baseline;ensure(binding,'Spec baseline checkpoint 缺少 upstream_spec_baseline 绑定');
  identity(root,'design');
  const receiptBytes=readFileSync(safe(root,binding.receipt_ref));ensure(hash(receiptBytes)===binding.receipt_digest,'Spec baseline receipt 字节漂移');
  const receipt=read(safe(root,binding.receipt_ref));schema(receipt,receiptSchema);
  const base=`docs/spec-baselines/${receipt.baseline_id}/${receipt.version}`;
  ensure(binding.receipt_ref===`${base}/receipt.json`&&receipt.package_ref===`${base}/package`&&receipt.working_set_ref===`${base}/working-set.json`,'Spec baseline receipt 路径/身份不一致');
  const proof=verifySpecBaselinePackage(safe(root,receipt.package_ref));
  ensure(proof.manifest.bundle_digest===receipt.bundle_digest&&proof.manifest.baseline_id===receipt.baseline_id&&proof.manifest.version===receipt.version,'Spec baseline receipt 未绑定当前包');
  const working=read(safe(root,receipt.working_set_ref));
  ensure(working.schema_version===1&&working.kind==='spec-baseline-working-set'&&working.baseline_id===receipt.baseline_id&&working.version===receipt.version,'Spec baseline 工作集身份或版本不一致');
  const sourceSet=withSourceContextSnapshot(proof.sourceRoot,()=>read(safe(proof.sourceRoot,proof.source.business_ticket_set_ref)));
  const editable=new Set([proof.source.business_ticket_set_ref,...sourceSet.tickets.map(ticket=>ticket.ref)]);
  const expectedAssets=Object.fromEntries(proof.manifest.files.map(file=>[file.original_ref,editable.has(file.original_ref)?`${base}/working-files/${file.original_ref}`:`${receipt.package_ref}/${file.path}`]));
  ensure(working.assets&&Object.keys(working.assets).length===Object.keys(expectedAssets).length&&Object.entries(expectedAssets).every(([ref,target])=>working.assets[ref]===target),'Spec baseline 工作集必须完整且精确映射冻结manifest');
  ensure(working.business_ticket_set_ref===expectedAssets[proof.source.business_ticket_set_ref],'Spec baseline 工作集业务票集合引用不一致');
  for(const ref of editable)readFileSync(safe(root,expectedAssets[ref]));
  const specRef=`${receipt.package_ref}/payload/files/${proof.source.spec_ref}`;
  ensure(working.assets?.[proof.source.spec_ref]===specRef&&hash(readFileSync(safe(root,specRef)))===proof.source.spec_digest,'Spec baseline 工作集 Spec 已漂移');
  if(requireReconciliation) {
    ensure(state.feature_id===proof.source.feature_id,'目标 checkpoint feature_id 与 Spec baseline 不一致');
    const reconciliation=state.context_reconciliation?.ref || state.context_reconciliation_ref;
    ensure(reconciliation,'Spec baseline 接入须完成目标 Context 对账');
    verifyContextReconciliation(safe(root,reconciliation),{root});
    const localSpec=state.gates?.['gate.spec-baseline-approved']?.status==='approved';
    const localPlan=state.gates?.['gate.plan-approved']?.status==='approved';
    if(localSpec) {
      const registry=read(safe(root,'.template-spec/process/lifecycle-registry.yaml')),rolesDoc=read(safe(root,'.template-spec/agents/digital-human-roles.yaml'));
      assertGateChecks('gate.spec-baseline-approved',state,{root,registry,rolesDoc});
      const ref=assetRef(state,'artifact.spec','spec_ref');ensure(ref,'当前本地 Spec 批准缺少独立资产引用');
      const digest=hash(readFileSync(safe(root,ref))).slice(7);
      ensure(state.gates['gate.spec-baseline-approved'].basis.some(row=>row.ref===ref&&String(row.digest).replace(/^sha256:/,'')===digest),'当前本地 Spec 批准未覆盖 Spec 原始字节');
      if(localPlan){assertGateChecks('gate.plan-approved',state,{root,registry,rolesDoc});assertPlanAggregateApproval(state,{root,registry,rolesDoc});}
    }
    const record=read(safe(root,reconciliation));
    if(!(localSpec&&localPlan)) {
      ensure(record.evidence_refs.includes(binding.receipt_ref)&&record.evidence_refs.includes(`${receipt.package_ref}/payload/files/source-context.snapshot.md`),'Context 对账未绑定 Spec baseline Receipt 与源词汇快照');
      const glossary=parseContextSource(readFileSync(safe(proof.sourceRoot,'source-context.snapshot.md'),'utf8')),required=relatedTermRefs(proof,glossary);
      ensure(required.every(ref=>record.context_snapshot.term_refs.includes(ref)),'Context 对账未覆盖导入 Spec 的上游术语');
      const target=parseContextContract({root}),originalTerms=resolveContextTermRefs(glossary,required).terms,currentTerms=resolveContextTermRefs(target,required).terms;
      const meaning=term=>({term_ref:term.term_ref,term:term.term,meaning:term.meaning,english_identifier:term.english_identifier,context_id:term.context_id,forbidden_aliases:[...term.forbidden_aliases].sort()});
      ensure(digest(originalTerms.map(meaning).sort((a,b)=>a.term_ref.localeCompare(b.term_ref)))===digest(currentTerms.map(meaning).sort((a,b)=>a.term_ref.localeCompare(b.term_ref))),'目标 Context 与批准 Spec 的上游术语冲突，须先解决冲突并重新对账');
    }
  }
  const next=proof.source.product_design_required?(proof.registry.work_units.some(row=>row.id==='work-unit.prototype-design-v2')?'work-unit.prototype-design-v2':'work-unit.prototype-design'):'work-unit.business-ticket-formalization';
  const targetRegistry=read(safe(root,'.template-spec/process/lifecycle-registry.yaml'));
  const nextWorkUnit=next==='work-unit.prototype-design-v2'&&!targetRegistry.work_units.some(row=>row.id===next)?'work-unit.prototype-design':next;
  ensure(targetRegistry.work_units.some(row=>row.id===nextWorkUnit),'目标 Profile 缺少已登记设计接入单元');
  return {...proof,receipt,working,specRef,next_work_unit:nextWorkUnit,result:'spec-baseline-verified',ready_for_agent:false};
}

export function assertImportedSpecPrerequisite(state,{root=process.cwd()}={}) {
  const proof=verifySpecBaselineBinding(state,{root});
  const ref=assetRef(state,'artifact.spec','spec_ref');
  ensure(state.gates?.['gate.spec-baseline-approved']?.status==='approved'||!ref||ref===proof.specRef,'目标 checkpoint Spec 与导入基线不一致');
  return proof;
}

export function importedApprovalOrigin(root,binding) {
  const origin=binding?.approval_context?.source_baseline;if(!origin)return null;
  const receipt=read(safe(root,origin.receipt_ref)),manifest=read(safe(root,`${receipt.package_ref}/manifest.json`));
  const proof=verifySpecBaselineBinding({feature_id:manifest.source.feature_id,upstream_spec_baseline:{receipt_ref:origin.receipt_ref,receipt_digest:origin.receipt_digest},context_reconciliation:{ref:origin.context_reconciliation_ref}},{root});
  ensure([proof.source.spec_ref,proof.source.domain_strategy_ref,proof.source.stage_decision_package_ref,proof.source.plan_ref].filter(Boolean).includes(origin.source_ref),'不可继承该 Spec baseline 资产批准');
  ensure(binding.persisted_ref===`${proof.receipt.package_ref}/payload/files/${origin.source_ref}`,'继承批准资产引用与源快照不一致');
  return {...proof,origin};
}
