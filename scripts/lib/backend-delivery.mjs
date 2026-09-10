import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { openBundle, importBundle, sourceApproval } from './strategic-handoff.mjs';
import { read, safe, ensure, hash, digest, json, files, write, project, schema, archive, sourceApprovalPolicy } from './strategic-handoff-io.mjs';

// Evidence binds the deliverable basis, avoiding a circular hash through its own logs.
export function backendDeliveryBasis(delivery) {
  return digest(Object.fromEntries(['delivery_id','version','strategic_bundle_digest','scope','openapi','slice_contract','build','environment'].map(key=>[key,delivery[key]])));
}

function boundFile(root, binding) {
  const bytes=readFileSync(safe(root,binding.ref));
  ensure(hash(bytes)===binding.digest,`交付资产摘要不一致: ${binding.ref}`);
  return bytes;
}

async function approvedFile(root, binding, gate) {
  const bytes=boundFile(root,binding);
  const record=read(safe(root,binding.approval_ref));
  const roles=sourceApprovalPolicy(read(safe(root,'docs/agents/digital-human-roles.yaml')));
  await sourceApproval(record,roles,root);
  ensure((Array.isArray(gate)?gate:[gate]).includes(record.gate_id),`交付资产批准门禁不匹配: ${binding.ref}`);
  ensure(record.artifact_bindings?.some(x=>x.id===binding.id&&x.version===binding.version&&x.digest===binding.digest),`批准未绑定当前交付资产: ${binding.ref}`);
  return bytes;
}

function verification(root, binding, basis, kind) {
  boundFile(root,binding);
  const record=read(safe(root,binding.ref));
  schema(record,'docs/process/schemas/backend-delivery-verification.schema.json');
  ensure(record.kind===kind&&record.subject_digest===basis,`验证未绑定当前交付: ${kind}`);
  ensure(record.results.every(x=>x.exit_code===0),`后端验证失败: ${kind}`);
  for(const result of record.results) {
    ensure(Number.isFinite(Date.parse(result.executed_at))&&Date.parse(result.executed_at)<=Date.now()+60000,'验证执行时间无效');
    result.evidence.forEach(file=>boundFile(root,file));
  }
  return record;
}

export async function inspectBackendDelivery(root, ref) {
  project(root);
  const delivery=read(safe(root,ref));
  schema(delivery,'docs/process/schemas/backend-delivery.schema.json');
  ensure(boundFile(root,delivery.environment.test_data).length>0,'测试数据准备说明为空');
  await approvedFile(root,delivery.openapi,['gate.engineering-contract-approved','gate.openapi-frozen','gate.openapi-freeze-confirmed']);
  await approvedFile(root,delivery.slice_contract,'gate.slice-contract-approved');
  const contractDoc=read(safe(root,delivery.slice_contract.ref));
  const contract=contractDoc.slice_contract||contractDoc;
  ensure(contract.status==='approved'&&contract.slice_id===delivery.scope.slice_id&&contract.contract_id===delivery.slice_contract.id&&contract.contract_version===delivery.slice_contract.version,'后端 Slice Contract 身份/状态/切片不匹配');
  const api=read(safe(root,delivery.openapi.ref));
  ensure(/^3\.1\./.test(api.openapi),'后端交付必须使用 OpenAPI 3.1');
  const operations=Object.values(api.paths||{}).flatMap(item=>Object.entries(item).filter(([method])=>['get','put','post','delete','options','head','patch','trace'].includes(method)).map(([,operation])=>operation.operationId));
  ensure(delivery.scope.operation_ids.every(id=>operations.includes(id)),'交付接口不在冻结 OpenAPI 中');
  const basis=backendDeliveryBasis(delivery);
  const tests=verification(root,delivery.verification.contract,basis,'backend-contract');
  verification(root,delivery.verification.deployment,basis,'backend-deployment');
  return openBundle(safe(root,delivery.strategic_bundle_ref),bundle=>{
    ensure(bundle.manifest.bundle_digest===delivery.strategic_bundle_digest,'后端交付与战略版本不一致');
    const sources=new Set([...bundle.indexes.rules.map(x=>x.rule_id),...bundle.indexes.scenarios.map(x=>x.scenario_id)]);
    ensure(delivery.scope.source_ids.every(id=>sources.has(id)),'后端交付引用未知规则/场景');
    const scenarios=bundle.indexes.scenarios.filter(x=>delivery.scope.source_ids.includes(x.scenario_id));
    ensure(scenarios.length>0,'后端交付范围缺少业务成功/失败场景');
    for(const scenario of scenarios) {
      ensure(scenario.rule_refs.every(id=>delivery.scope.source_ids.includes(id)),'交付场景缺少关联规则');
      for(const outcome of ['success','failure'])ensure(tests.coverage.some(x=>x.source_id===scenario.scenario_id&&x.outcome===outcome),'后端交付缺少成功/失败场景验证');
    }
    ensure(delivery.scope.operation_ids.every(id=>tests.operation_ids.includes(id)),'后端契约验证未覆盖交付接口');
    return {delivery,basis};
  });
}

function validManifest(manifest,root) {
  ensure(manifest.schema_version===1&&manifest.kind==='backend-delivery','后端包类型或 schema 不支持');
  const {bundle_digest,...body}=manifest;
  ensure(bundle_digest===digest(body),'后端包清单摘要不一致');
  ensure(Array.isArray(manifest.files)&&manifest.files.length<=20000,'后端包文件清单无效');
  const names=manifest.files.map(x=>x.path);
  ensure(new Set(names.map(x=>x.toLowerCase())).size===names.length,'后端包路径重复');
  ensure(json([...names,'manifest.json'].sort())===json(files(root).sort()),'后端包文件缺失或存在未登记文件');
  ensure(manifest.files.reduce((total,file)=>total+file.size_bytes,0)<=512*1024*1024,'后端包大小超限');
  const originals=manifest.files.filter(x=>x.original_ref).map(x=>x.original_ref);
  ensure(new Set(originals.map(x=>x.toLowerCase())).size===originals.length,'后端包源路径重复');
  const captured = new Map();
  for(const file of manifest.files) {
    const bytes=readFileSync(safe(root,file.path));
    ensure(bytes.length===file.size_bytes&&hash(bytes)===file.sha256,`后端包文件摘要不一致: ${file.path}`);
    captured.set(file.path, bytes);
  }
  return captured;
}

export async function openBackendDelivery(input, action) {
  const temporary=mkdtempSync(path.join(tmpdir(),'yss-backend-delivery-'));
  try {
    ensure(existsSync(input)&&!lstatSync(input).isSymbolicLink(),'后端交付包不存在或是 symlink');
    let root=path.resolve(input);
    if(lstatSync(root).isFile()) { root=path.join(temporary,'unpacked');mkdirSync(root);archive('unpack',path.resolve(input),root); }
    const manifest=read(safe(root,'manifest.json'));const captured=validManifest(manifest,root);
    const source=path.join(temporary,'source');mkdirSync(source);
    for(const file of manifest.files)if(file.original_ref)write(source,file.original_ref,captured.get(file.path));
    const inspected=await inspectBackendDelivery(source,manifest.delivery_ref);
    ensure(manifest.delivery_id===inspected.delivery.delivery_id&&manifest.version===inspected.delivery.version,'后端包身份不一致');
    return await action({root,source,manifest,...inspected});
  } finally { rmSync(temporary,{recursive:true,force:true}); }
}

export async function exportBackendDelivery({sourceRoot,deliveryRef,output,zip=false}) {
  const root=project(sourceRoot), target=path.resolve(output);
  ensure(!existsSync(target)&&(!zip||!existsSync(`${target}.zip`)),'后端包输出已存在');
  const {delivery}=await inspectBackendDelivery(root,deliveryRef);
  const refs=new Set([deliveryRef,'yss-project.yaml','CONTEXT.md','docs/agents/digital-human-roles.yaml',delivery.openapi.ref,delivery.openapi.approval_ref,delivery.slice_contract.ref,delivery.slice_contract.approval_ref,delivery.environment.test_data.ref,...delivery.supporting_files]);
  for(const binding of Object.values(delivery.verification)) {
    refs.add(binding.ref);
    for(const result of read(safe(root,binding.ref)).results)for(const file of result.evidence)refs.add(file.ref);
  }
  // Keep the original strategic bytes and paths; offline validation reconstructs a temporary source view.
  const strategy=safe(root,delivery.strategic_bundle_ref);
  if(lstatSync(strategy).isDirectory())files(root,delivery.strategic_bundle_ref).forEach(ref=>refs.add(ref));
  else refs.add(delivery.strategic_bundle_ref);
  ensure(refs.size<=20000,'后端包文件数量超限');
  const captured=[...refs].sort().map(ref=>({ref,bytes:readFileSync(safe(root,ref))}));
  mkdirSync(path.dirname(target),{recursive:true});
  const staging=mkdtempSync(path.join(path.dirname(target),'.backend-export-'));
  try {
    const entries=[];
    for(const {ref,bytes} of captured) {
      const name=ref==='CONTEXT.md'?'payload/source-context.snapshot.md':`payload/files/${ref}`;
      write(staging,name,bytes);entries.push({path:name,original_ref:ref,size_bytes:bytes.length,sha256:hash(bytes)});
    }
    const body={schema_version:1,kind:'backend-delivery',delivery_id:delivery.delivery_id,version:delivery.version,delivery_ref:deliveryRef,files:entries};
    const manifest={...body,bundle_digest:digest(body)};write(staging,'manifest.json',json(manifest));
    await openBackendDelivery(staging,()=>null);
    for(const {ref,bytes} of captured)ensure(hash(readFileSync(safe(root,ref)))===hash(bytes),`导出期间后端源资产变化: ${ref}`);
    if(zip)archive('pack',staging,`${staging}.zip`);
    ensure(!existsSync(target)&&(!zip||!existsSync(`${target}.zip`)),'后端包输出并发冲突');
    renameSync(staging,target);if(zip)renameSync(`${staging}.zip`,`${target}.zip`);
    return {result:'exported',delivery_id:delivery.delivery_id,version:delivery.version,bundle_digest:manifest.bundle_digest,output:target,...(zip?{zip:`${target}.zip`}:{})};
  } finally { rmSync(staging,{recursive:true,force:true});rmSync(`${staging}.zip`,{force:true}); }
}

export async function importBackendDelivery({bundle,targetRoot}) {
  const target=project(targetRoot);
  return openBackendDelivery(bundle,async b=>{
    const ref=`docs/backend-deliveries/${b.delivery.delivery_id}/${b.delivery.version}`;
    const destination=safe(target,ref,{missing:true});
    if(existsSync(destination)) {
      const receipt=read(safe(destination,'import-receipt.json'));
      ensure(receipt.bundle_digest===b.manifest.bundle_digest,'同 ID/version 后端包内容冲突');
      await openBackendDelivery(safe(destination,'package'),()=>null);
      return {result:'already-imported',receipt_ref:`${ref}/import-receipt.json`,acceptance_ref:`${ref}/frontend-acceptance-draft.json`};
    }
    const strategic=await importBundle({bundle:safe(b.source,b.delivery.strategic_bundle_ref),targetRoot:target});
    const strategicReceipt=read(safe(target,strategic.receipt_ref));
    const trace=read(safe(target,`${path.posix.dirname(strategic.receipt_ref)}/tactical-traceability-draft.json`));
    mkdirSync(path.dirname(destination),{recursive:true});
    const staging=mkdtempSync(path.join(path.dirname(destination),'.backend-import-'));
    try {
      cpSync(b.root,path.join(staging,'package'),{recursive:true,errorOnExist:true,force:false});
      const receipt={schema_version:1,delivery_id:b.delivery.delivery_id,version:b.delivery.version,bundle_digest:b.manifest.bundle_digest,package_ref:`${ref}/package`};
      write(staging,'import-receipt.json',json(receipt));
      write(staging,'frontend-acceptance-draft.json',json({schema_version:1,status:'draft',slice_id:b.delivery.scope.slice_id,backend_delivery:{import_receipt_ref:`${ref}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest},strategic_handoff:{import_receipt_ref:strategic.receipt_ref,bundle_digest:strategicReceipt.bundle_digest,context_reconciliation_ref:'',rows:trace.rows.map(({tactical_refs,test_seam_refs,...row})=>({...row,frontend_case_refs:[]}))},frontend_cases:[]}));
      ensure(!existsSync(destination),'后端包导入并发冲突');renameSync(staging,destination);
      return {result:'imported-pending-acceptance',receipt_ref:`${ref}/import-receipt.json`,acceptance_ref:`${ref}/frontend-acceptance-draft.json`};
    } finally { rmSync(staging,{recursive:true,force:true}); }
  });
}
