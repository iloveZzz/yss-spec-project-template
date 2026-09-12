import { uiBaselineRef, uiBaselineCaseIds, uiBaselineKind, hasConsumerRoutes } from './ui-baseline.mjs';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openBackendDelivery } from './backend-delivery.mjs';
import { openBundle } from './strategic-handoff.mjs';
import { verifyConsumption } from './strategic-handoff-consumption.mjs';
import { read, safe, ensure, hash, schema, project, ROOT } from './strategic-handoff-io.mjs';

const ACCEPTANCE_SCHEMAS=new Map([[1,'docs/process/schemas/frontend-delivery-acceptance-v1.schema.json'],[2,'docs/process/schemas/frontend-delivery-acceptance.schema.json'],[3,'docs/process/schemas/frontend-delivery-acceptance-v3.schema.json']]);

function acceptanceSchema(version) {
  ensure(ACCEPTANCE_SCHEMAS.has(version),`Frontend Delivery Acceptance 未知 schema_version: ${String(version)}；支持版本: 1, 2, 3；既有 UI 接收请使用 3`);
  return ACCEPTANCE_SCHEMAS.get(version);
}

export async function verifyFrontendStrategicPreflight({root=process.cwd(),preflightRef,expectedDigest,readOnly=false}={}) {
  project(root);
  const file=safe(root,preflightRef),preflight=read(file);
  ensure([1,2].includes(preflight.schema_version),'Frontend Strategic Preflight 未知 schema_version');
  schema(preflight,preflight.schema_version===2?'docs/process/schemas/frontend-strategic-preflight-v2.schema.json':'docs/process/schemas/frontend-strategic-preflight.schema.json');
  const preflightDigest=hash(readFileSync(file));
  if(expectedDigest)ensure(expectedDigest===preflightDigest,'前端战略预检摘要已变化，需重编译合同');
  ensure(preflight.status==='verified','前端战略预检尚未 verified');
  const receipt=read(safe(root,preflight.import_receipt_ref));
  ensure(receipt.schema_version===2,'Frontend Strategic Preflight 仅接受 Import Receipt v2');
  const base=`docs/handoffs/${receipt.bundle_id}/${receipt.version}`;
  ensure(preflight.import_receipt_ref===`${base}/import-receipt.json`&&receipt.package_ref===`${base}/package`,'战略预检收据路径与身份不匹配');
  ensure(preflight.bundle_digest===receipt.bundle_digest,'战略预检与收据摘要不一致');
  const routeReceipt=receipt.routes.find(item=>item.route_id===preflight.route_id&&item.capability==='frontend-engineering-design');
  ensure(routeReceipt&&routeReceipt.activation!=='not-applicable','当前 Handoff 未启用前端工程设计路由');
  const reconciliation=spawnSync(process.execPath,[path.join(ROOT,'scripts/verify-context-reconciliation'),'--root',root,safe(root,preflight.context_reconciliation_ref)],{encoding:'utf8'});
  ensure(reconciliation.status===0,`前端战略预检 Context Reconciliation 未通过: ${reconciliation.error?.message||reconciliation.stderr}`);
  return openBundle(safe(root,receipt.package_ref),bundle=>{
    ensure(hasConsumerRoutes(bundle.handoff)&&bundle.manifest.bundle_digest===receipt.bundle_digest,'前端战略预检必须绑定支持消费者路由的当前交接包');
    const frontendRoute=bundle.handoff.consumer_routes.find(item=>item.route_id===preflight.route_id&&item.capability==='frontend-engineering-design');
    const backendRoute=bundle.handoff.consumer_routes.find(item=>item.capability==='backend-technical-design');
    ensure(frontendRoute&&frontendRoute.activation!=='not-applicable','前端路由未启用');
    const known=[...bundle.indexes.rules.map(item=>item.rule_id),...bundle.indexes.scenarios.filter(item=>item.critical).map(item=>item.scenario_id)].sort();
    ensure(JSON.stringify([...preflight.source_rule_refs].sort())===JSON.stringify(known),'前端战略预检未完整绑定源规则/关键场景');
    ensure((preflight.schema_version===2)===(bundle.handoff.schema_version===5),'前端预检与 Handoff 协议版本不匹配，禁止降级');
    if(preflight.schema_version===2)ensure(preflight.ui_baseline_kind===uiBaselineKind(bundle.handoff),'前端预检基线类型不一致');
    const expectedVisual=`${base}/package/payload/files/${uiBaselineRef(bundle.handoff).persisted_ref}/${uiBaselineRef(bundle.handoff).manifest_ref}`;
    ensure((preflight.schema_version===2?preflight.ui_baseline_ref:preflight.visual_baseline_ref)===expectedVisual,'前端战略预检 Visual Baseline 引用不一致');
    const expectedMode=backendRoute.activation==='not-applicable'?'not-applicable':'required';
    ensure(preflight.backend_dependency.mode===expectedMode&&preflight.backend_dependency.route_id===backendRoute.route_id,'前端战略预检后端依赖与消费者路由不一致');
    if(expectedMode==='not-applicable')ensure(preflight.backend_dependency.reason===backendRoute.reason&&JSON.stringify(preflight.backend_dependency.impact_refs)===JSON.stringify(backendRoute.impact_refs)&&JSON.stringify(preflight.backend_dependency.evidence_refs)===JSON.stringify(backendRoute.evidence_refs),'backend-not-applicable 依据与战略路由不一致');
    return {result:'preflight-verified',ready_for_agent:false,preflight_ref:preflightRef,preflight_digest:preflightDigest,strategic_bundle_digest:receipt.bundle_digest,ui_baseline_kind:uiBaselineKind(bundle.handoff),preflight_schema_version:preflight.schema_version,backend_dependency:expectedMode,next_action:'prepare-frontend-engineering-design-draft'};
  },{readOnly});
}

function pointer(value, ref) {
  ensure(ref.startsWith('/')&&!ref.includes('//'),'服务版本 JSON Pointer 无效');
  return ref.slice(1).split('/').reduce((node,key)=>node?.[key.replace(/~1/g,'/').replace(/~0/g,'~')],value);
}

export async function probeBackend(delivery) {
  const base=new URL(delivery.environment.base_url);
  const url=new URL(delivery.environment.revision_path,base);
  ensure(['http:','https:'].includes(base.protocol)&&!base.username&&!base.password&&!base.hash&&!base.search,'服务环境 URL 无效或包含凭据');
  ensure(url.origin===base.origin&&!url.username&&!url.password&&!url.hash&&!url.search,'版本探测必须在登记环境内');
  const headers={Accept:'application/json'};
  if(delivery.environment.authorization_env) {
    const authorization=process.env[delivery.environment.authorization_env];
    ensure(authorization,'版本探测缺少登记的授权环境配置');headers.Authorization=authorization;
  }
  const response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000),headers});
  ensure(response.ok,`真实接口不可用: HTTP ${response.status}`);
  const reader=response.body.getReader();let size=0;const chunks=[];
  try {
    while(true) { const {done,value}=await reader.read();if(done)break;size+=value.length;ensure(size<=1024*1024,'版本探测响应超限');chunks.push(value); }
  } finally { await reader.cancel(); }
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const expected={deployment_id:delivery.environment.deployment_id,source_commit:delivery.build.source_commit,openapi_digest:delivery.openapi.digest,artifact_digest:delivery.build.artifact_digest,test_data_digest:delivery.environment.test_data.digest};
  for(const [key,value] of Object.entries(expected))ensure(pointer(body,delivery.environment.revision_pointers[key])===value,`真实服务版本不匹配: ${key}`);
  return {command:`GET ${url.href}`,executed_at:new Date().toISOString(),exit_code:0,observed:expected};
}

export async function verifyFrontendDelivery({root=process.cwd(),acceptanceRef,sliceRef,expectedDigest}) {
  project(root);
  const file=safe(root,acceptanceRef), acceptance=read(file);
  schema(acceptance,acceptanceSchema(acceptance?.schema_version));
  const acceptanceDigest=hash(readFileSync(file));
  if(expectedDigest)ensure(expectedDigest===acceptanceDigest,'前端接收记录摘要已变化，需重编译合同');
  ensure(sliceRef&&acceptance.slice_id===sliceRef,'前端接收记录与执行切片不匹配');
  if(acceptance.schema_version>=2) {
    const preflight=await verifyFrontendStrategicPreflight({root,preflightRef:acceptance.strategic_preflight.ref,expectedDigest:acceptance.strategic_preflight.digest});
    ensure((acceptance.schema_version===3)===(preflight.preflight_schema_version===2),'前端接收与预检协议版本不匹配，禁止降级');
    if(acceptance.schema_version===3)ensure(acceptance.ui_baseline_kind===preflight.ui_baseline_kind,'前端接收基线类型不一致');
    ensure(preflight.strategic_bundle_digest===acceptance.strategic_handoff.bundle_digest,'前端接收与战略预检版本不一致');
    if(acceptance.backend_dependency.mode==='not-applicable') {
      ensure(!acceptance.backend_delivery,'backend-not-applicable 不得绑定后端交付收据');
      const strategic=await verifyConsumption(acceptance,{root,sliceRef,consumer:'frontend'});
      ensure(strategic.result==='verified',`战略承接阻断: ${JSON.stringify(strategic.issues)}`);
      const strategicReceipt=read(safe(root,acceptance.strategic_handoff.import_receipt_ref));
      return openBundle(safe(root,strategicReceipt.package_ref),bundle=>{
        ensure(acceptance.schema_version===3||bundle.handoff.schema_version!==5,'Handoff v5 必须使用前端接收 v3');
        const visualCases=uiBaselineCaseIds(bundle.handoff);
        const sourceIds=new Set([...bundle.indexes.rules.map(item=>item.rule_id),...bundle.indexes.scenarios.filter(item=>item.critical).map(item=>item.scenario_id)]);
        const ids=acceptance.frontend_cases.map(item=>item.case_id);ensure(new Set(ids).size===ids.length,'前端验收用例 ID 重复');
        for(const item of acceptance.frontend_cases){
          ensure(item.operation_ids.length===0,'backend-not-applicable 前端用例不得绑定 operation_ids');
          ensure(item.source_ids.every(id=>sourceIds.has(id)),'前端用例引用未知规则/场景');
          ensure((acceptance.schema_version===3?item.baseline_case_ids:item.visual_case_ids).every(id=>visualCases.includes(id)),'前端用例视觉基线悬空');
          const evidence=readFileSync(safe(root,item.evidence_ref));ensure(evidence.length>0&&hash(evidence)===item.evidence_digest,'前端承接用例说明为空或摘要漂移');
        }
        return {result:'inputs-verified',ready_for_agent:false,slice_id:sliceRef,acceptance_ref:acceptanceRef,acceptance_digest:acceptanceDigest,strategic_bundle_digest:strategic.consumed_bundle_digest,backend_dependency:'not-applicable',next_action:'prepare-or-revalidate-frontend-plan-and-slice-contract'};
      });
    }
    ensure(acceptance.backend_dependency.mode==='required','frontend backend_dependency.mode 非法');
  }
  const binding=acceptance.backend_delivery, receipt=read(safe(root,binding.import_receipt_ref));
  const base=`docs/backend-deliveries/${receipt.delivery_id}/${receipt.version}`;
  ensure(binding.import_receipt_ref===`${base}/import-receipt.json`&&receipt.package_ref===`${base}/package`,'后端收据路径与身份不匹配');
  ensure(receipt.bundle_digest===binding.bundle_digest,'后端收据与接收记录摘要不匹配');
  const versions=readdirSync(safe(root,`docs/backend-deliveries/${receipt.delivery_id}`)).filter(name=>/^v[1-9][0-9]*$/.test(name)&&existsSync(safe(root,`docs/backend-deliveries/${receipt.delivery_id}/${name}/import-receipt.json`,{missing:true}))).sort((a,b)=>Number(b.slice(1))-Number(a.slice(1)));
  ensure(versions[0]===receipt.version,'已接收更新的后端交付，旧前端接收记录 stale');
  return openBackendDelivery(safe(root,receipt.package_ref),async backend=>{
    const delivery=backend.delivery;
    ensure(backend.manifest.bundle_digest===receipt.bundle_digest&&backend.manifest.delivery_id===receipt.delivery_id&&backend.manifest.version===receipt.version,'后端包与收据不一致');
    ensure(delivery.scope.slice_id===sliceRef&&delivery.strategic_bundle_digest===acceptance.strategic_handoff.bundle_digest,'后端、战略与前端切片版本不一致');
    const strategic=await verifyConsumption(acceptance,{root,sliceRef,consumer:'frontend'});
    ensure(strategic.result==='verified',`战略承接阻断: ${JSON.stringify(strategic.issues)}`);
    const ids=acceptance.frontend_cases.map(item=>item.case_id);
    ensure(new Set(ids).size===ids.length,'前端验收用例 ID 重复');
    await openBundle(safe(backend.source,delivery.strategic_bundle_ref),bundle=>{
      ensure(acceptance.schema_version===3||bundle.handoff.schema_version!==5,'Handoff v5 必须使用前端接收 v3');
      const visualCases=uiBaselineCaseIds(bundle.handoff);
      for(const item of acceptance.frontend_cases) {
        if(acceptance.schema_version>=2)ensure(item.operation_ids.length>0,'有后端依赖时前端用例必须绑定已交付 operation_ids');
        ensure(item.operation_ids.every(id=>delivery.scope.operation_ids.includes(id)),'前端用例依赖未交付接口');
        ensure(item.source_ids.every(id=>delivery.scope.source_ids.includes(id)),'前端用例依赖未交付规则/场景');
        ensure((acceptance.schema_version===3?item.baseline_case_ids:item.visual_case_ids).every(id=>visualCases.includes(id)),'前端用例视觉基线悬空');
        const evidence=readFileSync(safe(root,item.evidence_ref));
        ensure(evidence.length>0&&hash(evidence)===item.evidence_digest,'前端承接用例说明为空或摘要漂移');
      }
    });
    for(const id of delivery.scope.source_ids) {
      const row=acceptance.strategic_handoff.rows.find(item=>item.source_id===id);
      ensure(row?.disposition==='mapped'&&row.dependent_slice_refs.includes(sliceRef),'当前交付规则/场景未承接到当前前端切片');
    }
    const actual=await probeBackend(delivery);
    return {result:'inputs-verified',ready_for_agent:false,slice_id:sliceRef,acceptance_ref:acceptanceRef,acceptance_digest:acceptanceDigest,backend_bundle_digest:receipt.bundle_digest,strategic_bundle_digest:strategic.consumed_bundle_digest,actual_verification:actual,next_action:'prepare-or-revalidate-frontend-plan-and-slice-contract'};
  });
}
