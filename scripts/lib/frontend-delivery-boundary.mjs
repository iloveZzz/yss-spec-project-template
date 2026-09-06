import { loadDeliveryProfile } from './harness-execution-scope.mjs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, read, safe, ensure, digest } from './strategic-handoff-io.mjs';

// Shared synchronous adapter for existing compiler, lifecycle and task-package seams.
// Always re-executes the verifier; a caller-supplied "verified" flag is never evidence.
export function enforceFrontendDelivery(state={}, {root=ROOT,phase='inputs'}={}) {
  const profile=loadDeliveryProfile(root);
  let contract;
  const contractRef=state.slice_contract_ref||state.contract?.slice_contract_ref;
  const selected=profile?.profile_id==='harness.frontend-delivery'||profile?.frontend_delivery?.required===true;
  const identity=selected?read(safe(root,'yss-project.yaml')):null;
  if(selected)ensure(identity.schema_version===1&&['template-source','project-instance'].includes(identity.repository_mode),'前端项目仓库身份无效');
  const dedicated=selected&&identity.repository_mode==='project-instance';
  if(dedicated)ensure(state.contract?.kind!=='template-maintenance','前端产品项目不得用模板维护任务绕过输入条件');
  let binding=state.frontend_delivery||state.frontend?.delivery||state.resolution?.frontend_delivery;
  if(contractRef) {
    // Legacy callers may supply an absolute external contract. Discover whether
    // the new boundary applies before enforcing its repository-relative policy.
    const file=path.resolve(root,contractRef);
    if(existsSync(file)) {
      const document=read(file);contract=document.slice_contract||document;
      const direct=contract.frontend?.delivery, resolved=contract.resolution?.frontend_delivery;
      ensure(!direct||!resolved||digest(direct)===digest(resolved),'Slice Contract 前端交付绑定冲突');
      binding=direct||resolved||binding;
    }
  }
  if(!dedicated&&!binding)return {result:'not-applicable'};
  if(contractRef)safe(root,contractRef);
  ensure(binding?.acceptance_ref,'frontend-delivery-required: 缺少战略与后端联合接收记录');
  const slice=contract?.slice_id||state.slice_id;
  ensure(!contract?.slice_id||!state.slice_id||contract.slice_id===state.slice_id,'前端任务与 Slice Contract 切片不一致');
  ensure(slice,'frontend-delivery-required: 缺少明确切片');
  if(phase==='implementation') {
    ensure(contract?.status==='approved','frontend-delivery-required: 必须读取已持久化的 approved Slice Contract');
    ensure(contract.frontend?.delivery||contract.resolution?.frontend_delivery,'frontend-delivery-required: Slice Contract 未绑定前端交付');
    ensure(binding.digest,'frontend-delivery-required: Slice Contract 未冻结接收记录摘要');
  }
  const args=[path.join(ROOT,'scripts/verify-frontend-delivery'),'--root',root,'--slice',slice];
  if(binding.digest)args.push('--expected-digest',binding.digest);
  args.push(binding.acceptance_ref);
  const verified=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
  ensure(verified.status===0,`frontend-delivery-blocked: ${verified.error?.message||verified.stderr||verified.stdout}`);
  const result=JSON.parse(verified.stdout);
  ensure(result.result==='inputs-verified'&&result.ready_for_agent===false,'前端接收校验返回非法状态');
  return result;
}
