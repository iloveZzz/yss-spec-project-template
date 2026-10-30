import { verifySliceContractApproval } from './approved-execution-context.mjs';
import { readFileSync } from 'node:fs';
import { readSliceContract } from './slice-contract.mjs';
import { parseContent, ids } from './plan-spec-markdown.mjs';
import {authorizeBackendDelivery} from './lifecycle-execution-scope.mjs';
import { sourceApproval } from './strategic-handoff.mjs';
import { read, safe, ensure, hash, digest, project, schema, assertHandoffEvidenceRef } from './strategic-handoff-io.mjs';

// Evidence binds the deliverable basis, avoiding a circular hash through its own logs.
export function backendDeliveryBasis(delivery) {
  return digest(Object.fromEntries(['delivery_mode','delivery_id','version','strategic_bundle_digest','strategic_route_id','scope','openapi','slice_contract','build','environment'].filter(key=>delivery[key]!==undefined).map(key=>[key,delivery[key]])));
}

function boundFile(root, binding) {
  assertHandoffEvidenceRef(binding.ref);
  const bytes=readFileSync(safe(root,binding.ref));
  ensure(hash(bytes)===binding.digest,`交付资产摘要不一致: ${binding.ref}`);
  return bytes;
}

async function approvedFile(root, binding, gate) {
  const bytes=boundFile(root,binding);
  if(gate==='gate.slice-contract-approved'){verifySliceContractApproval(binding,{root});return bytes;}
  const record=read(safe(root,binding.approval_ref));
  await sourceApproval(record,undefined,root,binding);
  ensure((Array.isArray(gate)?gate:[gate]).includes(record.gate_id),`交付资产批准门禁不匹配: ${binding.ref}`);
  ensure(record.artifact_bindings?.some(x=>x.id===binding.id&&x.version===binding.version&&x.digest===binding.digest),`批准未绑定当前交付资产: ${binding.ref}`);
  return bytes;
}

function verification(root, binding, basis, kind) {
  boundFile(root,binding);
  const record=read(safe(root,binding.ref));
  schema(record,'.template-spec/process/schemas/backend-delivery-verification.schema.json');
  ensure(record.kind===kind&&record.subject_digest===basis,`验证未绑定当前交付: ${kind}`);
  ensure(record.results.every(x=>x.exit_code===0),`后端验证失败: ${kind}`);
  for(const result of record.results) {
    ensure(Number.isFinite(Date.parse(result.executed_at))&&Date.parse(result.executed_at)<=Date.now()+60000,'验证执行时间无效');
    result.evidence.forEach(file=>boundFile(root,file));
  }
  return record;
}

async function inspectDeliveryEvidence(root, ref, local = false) {
  project(root);
  const delivery=read(safe(root,ref));
  schema(delivery,'.template-spec/process/schemas/backend-delivery.schema.json');
  ensure(local?delivery.delivery_mode==='local-evidence':!delivery.delivery_mode,'本地证据不能作为外部交付；请使用本地后端终点核验');
  ensure(boundFile(root,delivery.environment.test_data).length>0,'测试数据准备说明为空');
  if(delivery.openapi.mode!=='not-applicable')await approvedFile(root,delivery.openapi,['gate.engineering-contract-approved','gate.openapi-frozen','gate.openapi-freeze-confirmed']);
  await approvedFile(root,delivery.slice_contract,'gate.slice-contract-approved');
  const contractDoc=read(safe(root,delivery.slice_contract.ref));
  const contract=contractDoc.slice_contract||contractDoc;
  ensure(contract.status==='approved'&&contract.slice_id===delivery.scope.slice_id&&contract.contract_id===delivery.slice_contract.id&&contract.contract_version===delivery.slice_contract.version,'后端 Slice Contract 身份/状态/切片不匹配');
  if(delivery.openapi.mode!=='not-applicable') {
    const api=read(safe(root,delivery.openapi.ref));
    ensure(/^3\.1\./.test(api.openapi),'后端交付必须使用 OpenAPI 3.1');
    const operations=Object.values(api.paths||{}).flatMap(item=>Object.entries(item).filter(([method])=>['get','put','post','delete','options','head','patch','trace'].includes(method)).map(([,operation])=>operation.operationId));
    ensure(delivery.scope.operation_ids.length>0&&delivery.scope.operation_ids.every(id=>operations.includes(id)),'交付接口不在冻结 OpenAPI 中');
  }
  const basis=backendDeliveryBasis(delivery);
  const tests=verification(root,delivery.verification.contract,basis,'backend-contract');
  verification(root,delivery.verification.deployment,basis,'backend-deployment');
  ensure(delivery.scope.operation_ids.every(id=>tests.operation_ids.includes(id)),'后端契约验证未覆盖交付接口');
  return {delivery,basis,tests};
}

export async function inspectLocalBackendDelivery(root, ref, {checkpointRef, readOnly = true} = {}) {
  const inspected=await inspectDeliveryEvidence(root,ref,true),{delivery,tests}=inspected;
  const loaded=readSliceContract(delivery.slice_contract.ref,{root}),contract=loaded.contract;
  const authorization=checkpointRef?authorizeBackendDelivery({root,checkpointRef,assetRef:ref,readOnly,deliveryMode:'local-evidence'}):null;
  const business=authorization?.local_scope==='business';
  ensure(contract.backend?.status==='required','本地后端交付缺少批准的后端实现范围');
  ensure(business||(contract.frontend?.status==='not-applicable'&&!(contract.common?.impacted_areas||[]).some(item=>['ui','frontend'].includes(item))&&!(contract.work_units||[]).some(unit=>unit.role_id==='role.frontend-engineer')),'本地后端终点只消费已批准后端 Slice；不能扩大前端实现批准');
  const apiRequired=contract.contract?.api_impact===true||loaded.raw.applicability?.api?.status==='required';
  ensure(apiRequired===(delivery.openapi.mode!=='not-applicable'),'本地后端 API 影响与批准 Slice 不一致');
  if(!apiRequired) {
    boundFile(root,delivery.openapi);
    const decision=read(safe(root,delivery.openapi.ref));
    ensure(decision.status==='not-applicable'&&decision.slice_id===delivery.scope.slice_id&&delivery.scope.operation_ids.length===0&&contract.lifecycle_refs.openapi_freeze_or_no_impact===delivery.openapi.ref,'本地后端缺少当前 Slice 的 API 不适用依据');
  }else ensure(contract.lifecycle_refs.openapi_freeze_or_no_impact===delivery.openapi.ref,'本地后端未消费 Slice 当前冻结 OAS');
  const spec=loaded.sources.spec;
  ensure(spec,'本地后端需要 Slice 已绑定的当前 Spec');
  const parsed=parseContent(spec.text,spec.ref),known=new Set(parsed.supported?parsed.entries.filter(row=>['FR','AC'].includes(row.kind)).map(row=>row.id):ids(spec.text,['FR','AC']));
  const acceptance=Object.keys(loaded.raw.acceptance||{});
  ensure(acceptance.length>0&&delivery.scope.source_ids.every(id=>known.has(id))&&acceptance.every(id=>delivery.scope.source_ids.includes(id)),'本地后端 Spec/验收来源未完整绑定当前 Slice');
  for(const id of acceptance)for(const outcome of ['success','failure'])ensure(tests.coverage.some(row=>row.source_id===id&&row.outcome===outcome),'本地后端缺少当前验收成功/失败验证');
  return inspected;
}

function legacyUnsupported() {
  throw Object.assign(new Error('legacy-strategic-handoff-unsupported: 依赖旧战略包的外部后端交付验收已停止支持'), {code:'UNPORTED'});
}

export async function inspectBackendDelivery() { return legacyUnsupported(); }
export async function openBackendDelivery() { return legacyUnsupported(); }
export async function exportBackendDelivery() { return legacyUnsupported(); }
