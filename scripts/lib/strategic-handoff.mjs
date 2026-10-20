import {nativeEvidenceVerify,nativeCoverage,NEEDS} from './native-evidence.mjs';

import {scopedConsumerCapabilities,consumerEntry} from './strategic-handoff-routing.mjs';
import {existsSync,lstatSync,readFileSync} from './validation-phase.mjs';
import {mkdirSync,mkdtempSync,renameSync,rmSync,cpSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {ensure,canonical,digest,hash,json,parse,read,safe,relative,files,write,project,schema,archive,ROOT,sourceContextRef} from './strategic-handoff-io.mjs';

import {parseContextContract} from './context-contract.mjs';

import {selectApprovalRecord} from './native-approval.mjs';

import {compareIndexes} from './strategic-handoff-rules.mjs';
const MAX_BYTES = 512 * 1024 * 1024;
const own = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const nonempty = x => typeof x === 'string' && x.trim();
const bytesDigest = (bytes, kind) => kind === 'canonical-json' ? digest(parse(bytes)) : kind === 'sha256-bytes' ? hash(bytes) : (() => { throw new TypeError(`未知摘要算法: ${kind}`); })();
const HANDOFF_SCHEMAS = new Map([[4,'.template-spec/process/schemas/strategic-design-handoff-v4.schema.json'],[5,'.template-spec/process/schemas/strategic-design-handoff-v5.schema.json']]);
const CAPABILITIES=['backend-technical-design','frontend-engineering-design','delivery-coordination'];
// 前端实现已从生命周期移除：交接包里仍声明前端消费者路线（协议兼容，常驻两代），但接收方不再生成或消费前端草案。
const CONSUMER_CAPABILITIES=['backend-technical-design','delivery-coordination'];

function sourceApprovalRecord(document, gateId) {
  return selectApprovalRecord(document, gateId);
}

function deliveryReadme(handoff) {
  const sources=Object.entries(handoff.source).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`- \`${key}\`: \`${value.persisted_ref}\` (${value.version}, ${value.digest})`);
  const routes=handoff.consumer_routes.map(route=>`- \`${route.capability}\`: \`${route.activation}\` (${route.route_id})`);
  const questions=handoff.tactical_design_questions.length?handoff.tactical_design_questions.map((_,index)=>`- tactical-design-question-${index+1}`).join('\n'):'- 无';
  const deferred=handoff.deferred_decisions_and_ownership.length?handoff.deferred_decisions_and_ownership.map(item=>`- ${item.decision_id||item.id||'deferred-decision'} / ${item.owner||'owner-unset'}`).join('\n'):'- 无';
  return `# 战略交接快照包\n\n此目录是由 Handoff v5 确定性生成的不可变研发交付件。业务正文保留在 \`payload/\`，本页只提供接收导航。\n\n## 范围\n\n- Handoff: \`${handoff.handoff_id}\`\n- Version: \`${handoff.handoff_version}\`\n- Schema: \`5\`\n\n## 来源资产\n\n${sources.join('\n')}\n\n## 消费者路线\n\n${routes.join('\n')}\n\n## 待决问题索引\n\n${questions}\n\n## 延期决定索引\n\n${deferred}\n\n## 接收命令\n\n\`\`\`bash\nscripts/strategic-handoff import --bundle <delivery-dir> --target-root <implementation-repository>\n\`\`\`\n`;
}

function isDeliveryDirectory(input) {
  return existsSync(input) && lstatSync(input).isDirectory() && existsSync(path.join(input,'delivery-record.json'));
}

function versionSchema(version, schemas, label) {
  if(!schemas.has(version))throw Object.assign(new TypeError(`${label} 未知 schema_version: ${String(version)}；支持版本: ${[...schemas.keys()].join(', ')}；请使用显式迁移器升级`),{code:label==='Handoff'&&version===3?'MIGRATION_REQUIRED':'CAPABILITY'});
  return schemas.get(version);
}

export async function sourceApproval(record,roles,root,binding) {
 if(!binding?.approval_ref)throw new TypeError('APPROVAL_CONTEXT_REQUIRED: 源批准需要当前资产及独立批准引用');
 const document=read(safe(root,binding.approval_ref)),actual=document.kind==='review-bundle'?document.reviews?.find(row=>row.gate_id===record.gate_id):document;
 ensure(own(actual,record),'APPROVAL_CURRENT_INVALID: 待验记录不是当前来源批准');
 const contextRef=sourceContextRef(root,'CONTEXT.md');
 ensure(['CONTEXT.md','source-context.snapshot.md'].includes(contextRef),'READONLY_SOURCE_LAYOUT_REQUIRED: 源批准只支持显式固定 Context 快照');
 const snapshot=contextRef==='source-context.snapshot.md';
 return nativeCoverage(nativeEvidenceVerify({root,kind:'source-approval',group:'handoff',document:binding,extra:['--gate',record.gate_id,...(snapshot?['--source-context-snapshot']:[])],needs:[...NEEDS.sourceApproval,...(snapshot?NEEDS.sourceContextSnapshot:[])]}),'source_approval');
}

export async function inspectSource(root,handoffRef) {
 versionSchema(read(safe(root,handoffRef)).schema_version,HANDOFF_SCHEMAS,'Handoff');
 return nativeCoverage(nativeEvidenceVerify({root,group:'handoff',kind:'source',file:handoffRef,needs:NEEDS.handoffSource}),'handoff_source');
}
export function collectSourceClosure(root,handoffRef,handoff,config,{proof}={}) {
 const verified=proof||nativeCoverage(nativeEvidenceVerify({root,group:'handoff',kind:'source',file:handoffRef,needs:NEEDS.handoffSource}),'handoff_source');
 versionSchema(handoff.schema_version,HANDOFF_SCHEMAS,'Handoff');
 ensure(Array.isArray(verified.closure),'NATIVE_PROTOCOL: 来源缺少完整导出闭包');
 return new Map(verified.closure.map(row=>{const bytes=readFileSync(safe(root,row.ref));ensure(hash(bytes)===row.digest,'VALIDATION_INPUT_CHANGED: '+row.ref);return[row.ref,bytes];}));
}
// evidenceRoot 决定原生校验暂存外部包的位置（evidenceRoot/.work/native-candidates）；默认是模板根，夹具与并行测试传入自己的临时根，避免互相观察到对方的暂存目录。
export async function openBundle(input,action,{readOnly=false,evidenceRoot=ROOT}={}) {
 const temp=readOnly?null:mkdtempSync(path.join(tmpdir(),'yss-handoff-'));
 try {
  ensure(existsSync(input)&&!lstatSync(input).isSymbolicLink(),'交接包不存在或是 symlink');
  let root=path.resolve(input);
  if(lstatSync(root).isFile()){
   ensure(!readOnly,'readonly-extraction-required: 只读验证需要已展开目录');
   // Bind the original archive while Node materializes only the workflow callback view.
   readFileSync(root);const archiveRef=root;root=path.join(temp,'unpacked');mkdirSync(root);archive('unpack',archiveRef,root);
  }
  const result=nativeEvidenceVerify({root:evidenceRoot,group:'handoff',kind:'package',file:root,needs:NEEDS.handoffPackage});
  const source=nativeCoverage(result,'handoff_source'),pack=nativeCoverage(result,'handoff_package');
  versionSchema(source.handoff.schema_version,HANDOFF_SCHEMAS,'Handoff');
  return await action({root,manifest:pack.manifest,...source,changes:pack.changes});
 }finally{if(temp)rmSync(temp,{recursive:true,force:true});}
}
// inspected：调用方刚对同一 root/handoffRef 完成的 inspectSource 结果，传入后不再重复验证。
export async function exportBundle({sourceRoot,handoffRef,output,zip=false,previous,evidenceRoot,inspected}) {
  const root=project(sourceRoot); parseContextContract({root}); relative(handoffRef);
  const current=inspected||await inspectSource(root,handoffRef);
  let prior=null;
  if(previous)prior=await openBundle(previous, b=>({manifest:b.manifest,indexes:b.indexes,handoff:b.handoff,rulesBytes:readFileSync(safe(b.root,'indexes/rules.json')),scenariosBytes:readFileSync(safe(b.root,'indexes/scenarios.json'))}));
  if(prior){ensure(prior.manifest.bundle_id===current.handoff.handoff_id,'前版属于不同交接');ensure(Number(current.handoff.handoff_version.slice(1))>Number(prior.manifest.version.slice(1)),'更新必须提升交接版本');for(const[key,ref]of Object.entries(current.handoff.source)){const old=prior.handoff.source[key];if(old&&old.digest!==ref.digest)ensure(old.version!==ref.version,`源资产内容变化必须提升版本: ${key}`);}}
  const previousBundle=prior?{bundle_id:prior.manifest.bundle_id,version:prior.manifest.version,digest:prior.manifest.bundle_digest}:null;
  const snapshotFiles=collectSourceClosure(root,handoffRef,current.handoff,current.config,{proof:current});
  const target=path.resolve(output);
  ensure(!existsSync(target) && (!zip||!existsSync(`${target}.zip`)),'输出已存在，禁止覆盖');
  ensure(target!==root && !root.startsWith(`${target}${path.sep}`),'输出不能覆盖源仓');
  mkdirSync(path.dirname(target),{recursive:true});
  ensure(path.resolve(path.dirname(target))===path.dirname(target),'输出路径无效');
  const staging=mkdtempSync(path.join(path.dirname(target),'.handoff-staging-'));
  try {
    const entries=[];
    const put=(ref,bytes,original)=>{write(staging,ref,bytes);entries.push({path:ref,sha256:hash(bytes),size_bytes:bytes.length,...(original?{original_ref:original}:{})});};
    for(const [ref,bytes]of [...snapshotFiles].sort(([a],[b])=>a.localeCompare(b))) {
      const dest=current.handoff.schema_version===5?`payload/files/${ref==='CONTEXT.md'?'source-context.snapshot.md':ref}`:ref===handoffRef?'handoff.yaml':ref==='CONTEXT.md'?'payload/source-context.snapshot.md':`payload/files/${ref}`;
      ensure(!dest.endsWith('/CONTEXT.md'),'只允许源根词汇快照，禁止嵌套 CONTEXT.md');put(dest,bytes,ref);
    }
    put('indexes/rules.json',Buffer.from(json(current.indexes.rules)));
    put('indexes/scenarios.json',Buffer.from(json(current.indexes.scenarios)));
    put('indexes/changes.json',Buffer.from(json({previous_bundle:previousBundle,...compareIndexes(current.indexes,prior?.indexes)})));
    if(current.handoff.schema_version===5)put('README.md',Buffer.from(deliveryReadme(current.handoff)));
    if(prior){put('indexes/previous-manifest.json',Buffer.from(json(prior.manifest)));put('indexes/previous-rules.json',prior.rulesBytes);put('indexes/previous-scenarios.json',prior.scenariosBytes);}
    const body={schema_version:current.source_execution?2:1,...(current.source_execution?{source_execution:current.source_execution}:{}),bundle_id:current.handoff.handoff_id,version:current.handoff.handoff_version,handoff_ref:handoffRef,previous_bundle:previousBundle,files:entries.sort((a,b)=>a.path.localeCompare(b.path))};
    const manifest={...body,bundle_digest:digest(body)};write(staging,'manifest.json',json(manifest));
    await openBundle(staging,()=>null,evidenceRoot?{evidenceRoot}:{});
    // Recheck every captured source byte before publishing the immutable directory.
    for(const [ref,bytes]of snapshotFiles)ensure(hash(readFileSync(safe(root,ref)))===hash(bytes),`导出期间源文件变化: ${ref}`);
    if(zip)archive('pack',staging,`${staging}.zip`);
    ensure(!existsSync(target),'输出并发冲突');renameSync(staging,target);
    if(zip)renameSync(`${staging}.zip`,`${target}.zip`);
    return {result:'exported',bundle_id:manifest.bundle_id,version:manifest.version,bundle_digest:manifest.bundle_digest,output:target,...(zip?{zip:`${target}.zip`,zip_sha256:hash(readFileSync(`${target}.zip`))}:{})};
  } finally {rmSync(staging,{recursive:true,force:true});rmSync(`${staging}.zip`,{force:true});}
}

export async function openDelivery(input,action,{readOnly=false}={}) {
 const root=path.resolve(input),result=nativeEvidenceVerify({root:ROOT,group:'handoff',kind:'delivery',file:root,needs:NEEDS.handoffDelivery});
 const source=nativeCoverage(result,'handoff_source'),pack=nativeCoverage(result,'handoff_package'),delivery=nativeCoverage(result,'handoff_delivery');
 // Native report locators belong to its transport root; consume the verified original delivery here.
 const recordBytes=readFileSync(safe(root,'delivery-record.json'));ensure(hash(recordBytes)===delivery.record_digest,'VALIDATION_INPUT_CHANGED: delivery record');
 const packageRoot=safe(root,delivery.record.package_ref);
 return action({root:packageRoot,manifest:pack.manifest,...source,changes:pack.changes,deliveryRoot:root,packageRoot,record:delivery.record,recordBytes,verification:delivery.verification});
}

function assertDeliveryRecordBinding(record,bundle) {
  schema(record,'.template-spec/process/schemas/strategic-handoff-delivery.schema.json');
  ensure(record.handoff.id===bundle.manifest.bundle_id&&record.handoff.version===bundle.manifest.version&&record.handoff.schema_version===bundle.handoff.schema_version,'delivery record 的 Handoff 身份不一致');
  ensure(record.bundle_digest===bundle.manifest.bundle_digest&&record.manifest_ref==='package/manifest.json','delivery record 的包摘要或清单引用不一致');
  const handoffEntry=bundle.manifest.files.find(file=>file.original_ref===record.handoff.ref);
  ensure(handoffEntry&&handoffEntry.sha256===record.handoff.sha256,'delivery record 的 Handoff 源摘要不一致');
  const sourceAssets=Object.entries(bundle.handoff.source).sort(([a],[b])=>a.localeCompare(b)).map(([sourceKey,value])=>({source_key:sourceKey,id:value.id||value.baseline_id,version:value.version,ref:value.persisted_ref,digest:value.digest}));
  ensure(own(sourceAssets,record.source_assets),'delivery record 的来源资产不一致');
  ensure(own(bundle.handoff.consumer_routes.map(({route_id,capability,activation})=>({route_id,capability,activation})),record.consumer_routes),'delivery record 的消费者路由不一致');
  const previous=bundle.manifest.previous_bundle?{handoff_id:bundle.manifest.previous_bundle.bundle_id,version:bundle.manifest.previous_bundle.version,bundle_digest:bundle.manifest.previous_bundle.digest}:null;
  ensure(own(previous,record.previous_delivery),'delivery record 的上一版本身份不一致');
}

export function assertImportReceipt(root,receipt,bundle,capability) {
  ensure(receipt.schema_version===(bundle.handoff.schema_version===5?3:bundle.handoff.schema_version===4?2:1),'Import Receipt 与 Handoff 协议版本不匹配，v5须使用真实交付记录 Receipt v3');
  const base=`docs/handoffs/${receipt.bundle_id}/${receipt.version}`;
  ensure(receipt.package_ref===`${base}/package`&&receipt.bundle_digest===bundle.manifest.bundle_digest,'Import Receipt 与当前包不一致');
  if(receipt.schema_version>=2)schema(receipt,receipt.schema_version===3?'.template-spec/process/schemas/strategic-handoff-import-receipt-v3.schema.json':'.template-spec/process/schemas/strategic-handoff-import-receipt.schema.json');
  if(receipt.schema_version!==3)return;
  ensure(receipt.source_delivery_record_ref===`${base}/source-delivery-record.json`,'交付记录引用与收据路径不一致');
  const bytes=readFileSync(safe(root,receipt.source_delivery_record_ref));ensure(hash(bytes)===receipt.source_delivery_record_sha256,'交付记录字节漂移');
  assertDeliveryRecordBinding(parse(bytes),bundle);
  const profileRef=path.join(root,'.template-spec/process/harness-profile.yaml'),physicalProfile=existsSync(profileRef)?read(profileRef).profile_id:'yss-full-lifecycle';
  const selected=capability?[capability]:receipt.selected_consumer_capabilities;
  for(const id of selected){const route=bundle.handoff.consumer_routes.find(row=>row.capability===id);ensure(route&&receipt.selected_consumer_capabilities.includes(id),'收据未选择当前消费者能力');consumerEntry(root,id,route.entry_work_unit);ensure(receipt.target_profile_id===physicalProfile,'收据消费者与当前Profile不一致');const bound=receipt.routes.find(row=>row.capability===id);ensure(bound?.route_id===route.route_id&&bound.activation===route.activation,'收据消费者路由与原交付不一致');}
}

export async function finalizeDelivery({sourceRoot,handoffRef,zip=false,previous}) {
  const root=project(sourceRoot);parseContextContract({root});relative(handoffRef);
  const current=await inspectSource(root,handoffRef);
  ensure(current.handoff.schema_version===5,'migration-required: v3/v4 只允许历史 verify/import；修改或重新交付必须迁移到 Handoff v5 并重新批准');
  const delivery=path.join(root,'docs/deliveries/strategic',current.handoff.handoff_id,current.handoff.handoff_version);
  const parent=path.dirname(delivery);mkdirSync(parent,{recursive:true});
  let previousPackage=previous;
  if(previous&&isDeliveryDirectory(path.resolve(previous)))previousPackage=await openDelivery(path.resolve(previous),value=>value.packageRoot);
  const stage=mkdtempSync(path.join(parent,'.delivery-staging-'));
  try {
    const exported=await exportBundle({sourceRoot:root,handoffRef,output:path.join(stage,'package'),zip,previous:previousPackage,inspected:current});
    // exportBundle 已对 staging 包整包验真；这里只读取同一份 manifest，不再重复验证。
    const manifest=read(path.join(stage,'package','manifest.json'));
    const handoffEntry=manifest.files.find(file=>file.original_ref===handoffRef);
    ensure(handoffEntry,'交付包缺少 Handoff 源文件');
    const verification={schema_version:1,kind:'strategic-delivery-verification-v1',result:'verified',command:`scripts/strategic-handoff verify --bundle docs/deliveries/strategic/${current.handoff.handoff_id}/${current.handoff.handoff_version}`,exit_code:0,executed_at:new Date().toISOString(),package_ref:'package',manifest_ref:'package/manifest.json',bundle_digest:exported.bundle_digest};
    schema(verification,'.template-spec/process/schemas/strategic-handoff-delivery-verification.schema.json');write(stage,'verification.json',json(verification));
    const sourceAssets=Object.entries(current.handoff.source).sort(([a],[b])=>a.localeCompare(b)).map(([sourceKey,value])=>({source_key:sourceKey,id:value.id||value.baseline_id,version:value.version,ref:value.persisted_ref,digest:value.digest}));
    const previousDelivery=manifest.previous_bundle?{handoff_id:manifest.previous_bundle.bundle_id,version:manifest.previous_bundle.version,bundle_digest:manifest.previous_bundle.digest}:null;
    const record={schema_version:1,kind:'strategic-handoff-delivery-v1',status:'packaged',handoff:{id:current.handoff.handoff_id,version:current.handoff.handoff_version,ref:handoffRef,sha256:handoffEntry.sha256,schema_version:5},source_assets:sourceAssets,package_ref:'package',manifest_ref:'package/manifest.json',bundle_digest:exported.bundle_digest,verification_ref:'verification.json',consumer_routes:current.handoff.consumer_routes.map(({route_id,capability,activation})=>({route_id,capability,activation})),...(zip?{zip:{ref:'package.zip',sha256:exported.zip_sha256}}:{}),previous_delivery:previousDelivery};
    schema(record,'.template-spec/process/schemas/strategic-handoff-delivery.schema.json');write(stage,'delivery-record.json',json(record));
    await openDelivery(stage,()=>null);
    if(existsSync(delivery)){
      const existing=await openDelivery(delivery,value=>value.record);
      ensure(existing.bundle_digest===record.bundle_digest&&existing.handoff.sha256===record.handoff.sha256,'delivery-version-conflict: 同 Handoff ID/version 已存在不同内容；请提升 handoff_version 并重新批准');
      return {result:'already-packaged',handoff_id:record.handoff.id,version:record.handoff.version,bundle_digest:record.bundle_digest,delivery};
    }
    renameSync(stage,delivery);
    return {result:'packaged',handoff_id:record.handoff.id,version:record.handoff.version,bundle_digest:record.bundle_digest,delivery,...(zip?{zip:path.join(delivery,'package.zip'),zip_sha256:record.zip.sha256}:{})};
  } finally {rmSync(stage,{recursive:true,force:true});}
}
export async function importBundle({bundle,targetRoot}) {
  const target=project(targetRoot);const context=parseContextContract({root:target});
  const open=isDeliveryDirectory(path.resolve(bundle))?action=>openDelivery(path.resolve(bundle),action):action=>openBundle(bundle,action);
  return open(async b=>{
    const rel=`docs/handoffs/${b.manifest.bundle_id}/${b.manifest.version}`,dest=safe(target,rel,{missing:true});
    if(existsSync(dest)) {
      const receipt=read(safe(dest,'import-receipt.json'));
      ensure(receipt.bundle_digest===b.manifest.bundle_digest,'同 ID/version 内容冲突');
      await openBundle(safe(dest,'package'),existing=>assertImportReceipt(target,receipt,existing));
      return {result:'already-imported',receipt_ref:`${rel}/import-receipt.json`};
    }
    ensure(b.handoff.schema_version!==5||b.recordBytes,'Handoff v5 接入必须消费正式 delivery wrapper 与 Receipt v3');
    const terms=[];
    for(const operation of ['added','updated','deprecated'])for(const expected of b.handoff.context_delta[operation]) {
      const actual=context.terms_by_ref.get(expected.term_ref);
      const equal=actual&&['term','meaning','english_identifier','context_id','forbidden_aliases'].every(key=>own(expected[key],actual[key]));
      terms.push({operation,term_ref:expected.term_ref,expected,current:actual||null,status:operation==='deprecated'?(actual?'pending':'matched'):(equal?'matched':actual?'conflict':'pending')});
    }
    const rows=[...b.indexes.rules.map(x=>({source_id:x.rule_id,source_digest:x.source_digest,kind:'rule'})),...b.indexes.scenarios.filter(x=>x.critical).map(x=>({source_id:x.scenario_id,source_digest:x.source_digest,kind:'scenario'})),...(b.business?.tickets||[]).map(x=>({source_id:x.id,source_digest:x.source_digest,kind:'business-ticket',business_ticket_ref:`${rel}/package/payload/files/${x.ref}`}))].map(x=>({...x,disposition:'pending',tactical_refs:[],test_seam_refs:[],evidence_refs:[],dependent_slice_refs:[],dependency_status:'unknown'}));
    mkdirSync(path.dirname(dest),{recursive:true});const stage=mkdtempSync(path.join(path.dirname(dest),'.import-staging-'));
    try {
      cpSync(b.root,path.join(stage,'package'),{recursive:true,errorOnExist:true,force:false});
      let receipt;
      if(b.handoff.schema_version===3){
        receipt={schema_version:1,bundle_id:b.manifest.bundle_id,version:b.manifest.version,bundle_digest:b.manifest.bundle_digest,package_ref:`${rel}/package`,target_context_digest:context.document_digest,status:'pending-context-reconciliation'};
        write(stage,'import-receipt.json',json(receipt));write(stage,'context-reconciliation-draft.json',json({schema_version:1,status:'draft',import_receipt_ref:`${rel}/import-receipt.json`,target_context_digest:context.document_digest,terms}));
        write(stage,'tactical-traceability-draft.json',json({schema_version:1,import_receipt_ref:`${rel}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest,rows}));
        write(stage,'upstream-change-impact.json',json({schema_version:1,previous_bundle:b.manifest.previous_bundle,changed_source_ids:[...b.changes.updated,...b.changes.removed],added_source_ids:b.changes.added,status:'requires-lifecycle-reconciliation',policy:'mark-dependent-tactical-and-slice-contracts-stale; unknown-dependency-blocks-all'}));
      }else{
        const profileRef=path.join(target,'.template-spec/process/harness-profile.yaml');
        const profile=existsSync(profileRef)?read(profileRef):null;
        const capabilities=scopedConsumerCapabilities(target,(profile?.handoff?.consumer_capabilities||CONSUMER_CAPABILITIES).filter(capability=>capability!=='frontend-engineering-design'));
        ensure(Array.isArray(capabilities)&&capabilities.length&&capabilities.every(capability=>CONSUMER_CAPABILITIES.includes(capability)),'目标 profile 未声明受支持的消费者能力（前端消费者已移除）');
        const selected=b.handoff.consumer_routes.filter(route=>capabilities.includes(route.capability));
        ensure(selected.length===capabilities.length,'目标 profile 的消费者能力在 Handoff v4 中缺失');
        const commonRefs=[`${rel}/context-reconciliation-draft.json`,`${rel}/upstream-change-impact.json`];
        const routeRecords=selected.map(route=>{
          const artifactRefs=[...commonRefs];
          if(route.activation!=='not-applicable'&&route.capability==='backend-technical-design')artifactRefs.push(`${rel}/backend-technical-traceability-draft.json`);
          if(route.activation!=='not-applicable'&&route.capability==='delivery-coordination')artifactRefs.push(`${rel}/consumer-status-index-draft.json`);
          return {route_id:route.route_id,capability:route.capability,activation:route.activation,artifact_refs:artifactRefs};
        });
        const fromDelivery=Boolean(b.recordBytes);
        if(fromDelivery)write(stage,'source-delivery-record.json',b.recordBytes);
        receipt={schema_version:fromDelivery?3:2,bundle_id:b.manifest.bundle_id,version:b.manifest.version,bundle_digest:b.manifest.bundle_digest,package_ref:`${rel}/package`,...(fromDelivery?{source_delivery_record_ref:`${rel}/source-delivery-record.json`,source_delivery_record_sha256:hash(b.recordBytes),ready_for_agent:false}:{}),target_context_digest:context.document_digest,target_profile_id:profile?.profile_id||'yss-full-lifecycle',selected_consumer_capabilities:capabilities,routes:routeRecords,status:'pending-context-reconciliation'};
        schema(receipt,fromDelivery?'.template-spec/process/schemas/strategic-handoff-import-receipt-v3.schema.json':'.template-spec/process/schemas/strategic-handoff-import-receipt.schema.json');
        write(stage,'import-receipt.json',json(receipt));
        write(stage,'context-reconciliation-draft.json',json({schema_version:2,status:'draft',import_receipt_ref:`${rel}/import-receipt.json`,target_context_digest:context.document_digest,route_ids:selected.map(route=>route.route_id),terms}));
        write(stage,'upstream-change-impact.json',json({schema_version:2,previous_bundle:b.manifest.previous_bundle,...(b.business?{business_ticket_set_ref:`${rel}/package/payload/files/${b.handoff.source.business_ticket_set_ref.persisted_ref}`,business_ticket_status:'requires-current-source-and-dependency-reconciliation',business_ticket_ids:b.business.tickets.map(t=>t.id)}:{}),routes:selected.map(route=>({route_id:route.route_id,capability:route.capability,activation:route.activation,changed_source_ids:[...b.changes.updated,...b.changes.removed],added_source_ids:b.changes.added,status:'requires-lifecycle-reconciliation'})),policy:'mark-only-known-dependent-contracts-stale; unknown-dependency-or-design-basis-change-blocks-all'}));
        const backendRoute=b.handoff.consumer_routes.find(route=>route.capability==='backend-technical-design');
        const coordinationRoute=b.handoff.consumer_routes.find(route=>route.capability==='delivery-coordination');
        if(capabilities.includes('backend-technical-design')&&backendRoute.activation!=='not-applicable')write(stage,'backend-technical-traceability-draft.json',json({schema_version:2,route_id:backendRoute.route_id,import_receipt_ref:`${rel}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest,rows}));
        if(capabilities.includes('delivery-coordination')&&coordinationRoute.activation!=='not-applicable')write(stage,'consumer-status-index-draft.json',json({schema_version:1,status:'draft',import_receipt_ref:`${rel}/import-receipt.json`,routes:b.handoff.consumer_routes.map(route=>({route_id:route.route_id,capability:route.capability,activation:route.activation,consumer_status:route.activation==='not-applicable'?'not-applicable':'pending',receipt_refs:[],acceptance_refs:[],feedback_refs:[]}))}));
      }
      ensure(!existsSync(dest),'导入并发冲突');renameSync(stage,dest);
      const traceabilityRef=b.handoff.schema_version===3?`${rel}/tactical-traceability-draft.json`:receipt.routes.find(route=>route.capability==='backend-technical-design')?.artifact_refs.find(ref=>ref.endsWith('backend-technical-traceability-draft.json'))||receipt.routes.find(route=>route.capability==='frontend-engineering-design')?.artifact_refs.find(ref=>ref.endsWith('frontend-traceability-draft.json'));
      return {result:'imported-pending-reconciliation',receipt_ref:`${rel}/import-receipt.json`,...(traceabilityRef?{traceability_ref:traceabilityRef}:{})};
    }finally{rmSync(stage,{recursive:true,force:true});}
  });
}
