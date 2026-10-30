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
export async function exportBundle() { throw Object.assign(new Error('legacy-strategic-handoff-unsupported'), {code:'UNPORTED'}); }

export async function openDelivery(input,action,{readOnly=false,evidenceRoot=ROOT}={}) {
 const root=path.resolve(input),result=nativeEvidenceVerify({root:evidenceRoot,group:'handoff',kind:'delivery',file:root,needs:NEEDS.handoffDelivery});
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

export async function finalizeDelivery() { throw Object.assign(new Error('legacy-strategic-handoff-unsupported'), {code:'UNPORTED'}); }
export async function importBundle() { throw Object.assign(new Error('legacy-strategic-handoff-unsupported'), {code:'UNPORTED'}); }
