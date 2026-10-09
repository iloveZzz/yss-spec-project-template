import { normalizeSliceContract, sourceSliceContract, parseSliceYaml, selectSliceWorkUnit, selectedSliceWorkUnit } from './slice-contract.mjs';
import { hasLocalImplementationInputs, readProgressionTarget } from './lifecycle-progression.mjs';
import { contextBinary } from './native-context.mjs';
import { loadDeliveryProfile } from './harness-execution-scope.mjs';
import { existsSync } from './validation-phase.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, read, safe, ensure, digest } from './strategic-handoff-io.mjs';

// Shared synchronous adapter for existing compiler, lifecycle and task-package seams.
// Always re-executes the verifier; a caller-supplied "verified" flag is never evidence.
export function enforceFrontendDelivery(state={}, {root=ROOT,phase='inputs',localPhase=phase,checkpointRef,sliceRef,workUnitId}={}) {
  ensure(['preflight','design','contract','inputs','implementation','verification'].includes(phase),`未知前端交付阶段: ${phase}`);
  ensure(['preflight','design','contract','inputs','implementation','verification'].includes(localPhase),`未知本地前端交付阶段: ${localPhase}`);
  const selection=selectedSliceWorkUnit(state);
  if(state.schema_version===3)state=normalizeSliceContract(sourceSliceContract(state),{root});
  if(selection)state=selectSliceWorkUnit(state,selection.work_unit_id);
  const profile=loadDeliveryProfile(root);
  let contract;
  const contractRef=sliceRef||state.slice_contract_ref||state.contract?.slice_contract_ref;
  const dedicatedProfile=profile?.profile_id==='harness.frontend-delivery'||profile?.profile_id==='yss-harness-frontend';
  const selected=dedicatedProfile||profile?.frontend_delivery?.required===true||profile?.handoff?.consumer_capabilities?.includes('frontend-engineering-design');
  const identity=selected?read(safe(root,'yss-project.yaml')):null;
  if(selected)ensure(identity.schema_version===1&&['template-source','project-instance'].includes(identity.repository_mode),'前端项目仓库身份无效');
  const dedicated=dedicatedProfile&&identity.repository_mode==='project-instance';
  if(dedicated)ensure(state.contract?.kind!=='template-maintenance','前端产品项目不得用模板维护任务绕过输入条件');
  const localInputs=hasLocalImplementationInputs(root);
  let selectedUnit=selectedSliceWorkUnit(state),localContract;
  if(localInputs&&contractRef) {
    const file=safe(root,contractRef);
    if(existsSync(file)) {
      const raw=read(file),full=normalizeSliceContract(raw.slice_contract||raw,{root});
      localContract=full;
      selectedUnit=null;
      const unit=workUnitId||selection?.work_unit_id||(full.work_units?.some(item=>item.id===state.work_unit_id)?state.work_unit_id:null);
      if(unit) {
        ensure(full.work_units?.some(item=>item.id===unit),'前端输入工作单元不属于当前合同');
        selectedUnit=selectedSliceWorkUnit(selectSliceWorkUnit(full,unit));
      }
    }
  }
  if(!dedicated&&selectedUnit?.role_id==='role.backend-engineer')return {result:'not-applicable',ready_for_agent:false};
  const external=state.frontend_delivery||state.frontend?.delivery||state.resolution?.frontend_delivery||localContract?.frontend?.delivery||localContract?.resolution?.frontend_delivery;
  const frontendRequired=state.frontend?.status==='required'||['role.frontend-engineer','role.frontend-agent'].includes(selectedUnit?.role_id)||localContract?.frontend?.status==='required'||state.work_unit_id==='work-unit.frontend-implementation-verification'||localPhase==='verification';
  if(!external&&localInputs&&!contractRef&&!frontendRequired&&!['preflight','design'].includes(localPhase)&&profile?.lifecycle?.allowed_work_units?.includes(state.work_unit_id)&&state.contract?.kind!=='slice-implementation')return {result:'local-analysis',ready_for_agent:false};
  if(!external&&localInputs&&(frontendRequired||['preflight','design'].includes(localPhase)||(dedicated&&localPhase==='contract'))) {
    ensure(!checkpointRef||!state.checkpoint_ref||checkpointRef===state.checkpoint_ref,'本地前端输入checkpoint绑定冲突');
    const assetRef=contractRef||state.spec_ref;
    const explicitCheckpoint=checkpointRef||state.checkpoint_ref||(!assetRef?state.contract?.lifecycle_ref:null);
    const local=readProgressionTarget({root,checkpointRef:explicitCheckpoint,assetRef,includeDefault:true});
    ensure(local,'本地前端输入缺少唯一活动功能的 checkpoint 或当前 Slice 绑定');
    if(assetRef)ensure(readProgressionTarget({root,assetRef,includeDefault:true})?.checkpoint_ref===local.checkpoint_ref,'本地前端资产与明确checkpoint不属于同一当前功能');
    if(!local.consumers.some(item=>item.profile==='frontend'&&path.resolve(item.root)!==local.root))return verifyLocalInputs(local,{phase:localPhase,slice:state.slice_id||localContract?.slice_id,sliceRef:contractRef,specRef:state.spec_ref,workUnitId:workUnitId||selectedUnit?.work_unit_id});
    ensure(!frontendRequired,'frontend-delivery-required: 显式外部前端消费者缺少当前联合接收绑定');
  }
  if(['preflight','design'].includes(phase)) {
    const preflight=state.frontend_preflight||state.frontend?.preflight||state.resolution?.frontend_preflight;
    ensure(preflight?.preflight_ref,'frontend-preflight-required: 缺少 Frontend Strategic Preflight');
    const args=[path.join(ROOT,'scripts/verify-frontend-strategic-preflight'),'--root',root];
    if(preflight.digest)args.push('--expected-digest',preflight.digest);
    args.push(preflight.preflight_ref);
    const verified=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
    ensure(verified.status===0,`frontend-preflight-blocked: ${verified.error?.message||verified.stderr||verified.stdout}`);
    const result=JSON.parse(verified.stdout);ensure(result.result==='preflight-verified'&&result.ready_for_agent===false,'前端战略预检返回非法状态');
    return result;
  }
  let binding=state.frontend_delivery||state.frontend?.delivery||state.resolution?.frontend_delivery;
  if(contractRef) {
    // Legacy callers may supply an absolute external contract. Discover whether
    // the new boundary applies before enforcing its repository-relative policy.
    const file=path.resolve(root,contractRef);
    if(existsSync(file)) {
      const document=read(file);contract=document.slice_contract||document;
      if(contract.schema_version===3)contract=normalizeSliceContract(contract,{root});
      const direct=contract.frontend?.delivery, resolved=contract.resolution?.frontend_delivery;
      ensure(!direct||!resolved||digest(direct)===digest(resolved),'Slice Contract 前端交付绑定冲突');
      binding=direct||resolved||binding;
    }
  }
  const frontendStatus=contract?.frontend?.status||state.frontend?.status;
  const contractRequiresFrontend=typeof frontendStatus==='string'&&!['not-applicable','disabled'].includes(frontendStatus);
  if(!dedicated&&!binding&&!contractRequiresFrontend)return {result:'not-applicable'};
  if(contractRef)safe(root,contractRef);
  ensure(binding?.acceptance_ref,'frontend-delivery-required: 缺少战略与后端联合接收记录');
  const slice=contract?.slice_id||state.slice_id;
  ensure(!contract?.slice_id||!state.slice_id||contract.slice_id===state.slice_id,'前端任务与 Slice Contract 切片不一致');
  ensure(slice,'frontend-delivery-required: 缺少明确切片');
  if(['implementation','verification'].includes(phase)) {
    ensure(contract?.status==='approved','frontend-delivery-required: 必须读取已持久化的 approved Slice Contract');
    ensure(contract.frontend?.delivery||contract.resolution?.frontend_delivery,'frontend-delivery-required: Slice Contract 未绑定前端交付');
    ensure(binding.digest,'frontend-delivery-required: Slice Contract 未冻结接收记录摘要');
  }
  if(phase==='verification')ensure(state.frontend_implementation_verification_ref||contract?.frontend?.implementation_verification_ref,'frontend-delivery-required: 验证阶段缺少 frontend_implementation_verification 引用');
  const args=[path.join(ROOT,'scripts/verify-frontend-delivery'),'--root',root,'--slice',slice];
  if(binding.digest)args.push('--expected-digest',binding.digest);
  args.push(binding.acceptance_ref);
  const verified=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
  ensure(verified.status===0,`frontend-delivery-blocked: ${verified.error?.message||verified.stderr||verified.stdout}`);
  const result=JSON.parse(verified.stdout);
  ensure(result.result==='inputs-verified'&&result.ready_for_agent===false,'前端接收校验返回非法状态');
  return result;
}

function verifyLocalInputs(feature,{phase,slice,sliceRef,specRef,workUnitId}) {
  const native=contextBinary(process.env);
  const args=['contract','verify','--root',feature.root,'--kind','frontend-delivery','--file',feature.checkpoint_ref,'--checkpoint',feature.checkpoint_ref,'--phase',phase,'--json'];
  if(slice)args.push('--slice',slice);
  if(workUnitId)args.push('--unit',workUnitId);
  const result=spawnSync(native.binary,args,{cwd:feature.root,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024,env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}});
  contextBinary({...process.env,YSS_NATIVE_BINARY:native.binary,YSS_NATIVE_BINARY_SHA256:native.digest});
  let envelope;try{envelope=JSON.parse(result.stdout);}catch{ensure(false,'CAPABILITY: 原生本地前端输入核验未返回 JSON');}
  ensure(!result.error&&!result.signal&&result.status===0&&envelope.command==='contract'&&envelope.status==='ok'&&envelope.code==='OK'&&envelope.outputVersion===1&&envelope.protocolVersion===1,`本地前端输入阻断: ${envelope.code||result.error?.message||result.stderr}`);
  const report=envelope.result,coverage=report?.coverage;
  ensure(report?.kind==='governance-semantic-verification'&&report.status==='passed'&&report.read_only===true&&report.approval_created===false&&report.execution_authorization==='not-evaluated','原生前端输入响应不能批准或授予实施');
  ensure(coverage?.delivery_mode==='local-approved-assets'&&coverage.ready_for_agent===false&&coverage.inputs_current===true&&coverage.root===feature.root&&coverage.checkpoint_ref===feature.checkpoint_ref&&coverage.phase===phase&&(!slice||coverage.slice_id===slice),'原生前端输入缺少当前功能、阶段或原始输入绑定');
  ensure((!sliceRef||coverage.slice_contract_ref===sliceRef)&&(!specRef||coverage.spec_ref===specRef),'原生前端输入没有核验调用者当前Spec或Slice原引用');
  ensure(['inputs-verified','preflight-verified'].includes(coverage.result),'原生前端输入返回未知结论');
  const current=readProgressionTarget({root:feature.root,checkpointRef:feature.checkpoint_ref,includeDefault:true});
  ensure(current?.config_digest===feature.config_digest&&current?.checkpoint_digest===feature.checkpoint_digest&&current?.contract_digest===feature.contract_digest,'本地前端输入核验期间功能或意图来源漂移');
  return coverage;
}
