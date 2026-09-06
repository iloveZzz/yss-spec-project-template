import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { openBackendDelivery } from './backend-delivery.mjs';
import { openBundle } from './strategic-handoff.mjs';
import { verifyConsumption } from './strategic-handoff-consumption.mjs';
import { read, safe, ensure, hash, schema, project } from './strategic-handoff-io.mjs';

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
  schema(acceptance,'docs/process/schemas/frontend-delivery-acceptance.schema.json');
  const acceptanceDigest=hash(readFileSync(file));
  if(expectedDigest)ensure(expectedDigest===acceptanceDigest,'前端接收记录摘要已变化，需重编译合同');
  ensure(sliceRef&&acceptance.slice_id===sliceRef,'前端接收记录与执行切片不匹配');
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
      const visualCases=bundle.handoff.source.visual_baseline_ref.case_ids;
      for(const item of acceptance.frontend_cases) {
        ensure(item.operation_ids.every(id=>delivery.scope.operation_ids.includes(id)),'前端用例依赖未交付接口');
        ensure(item.source_ids.every(id=>delivery.scope.source_ids.includes(id)),'前端用例依赖未交付规则/场景');
        ensure(item.visual_case_ids.every(id=>visualCases.includes(id)),'前端用例视觉基线悬空');
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
