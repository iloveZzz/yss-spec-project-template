import {enforceHarnessTaskScope} from './harness-execution-scope.mjs';
import { readFileSync } from 'node:fs';
import { ROOT, hash, safe, digest } from './strategic-handoff-io.mjs';
import { normalizeSliceContract, withinSlicePath, parseSliceYaml } from './slice-contract.mjs';
import { createApprovedExecutionContext, assertApprovedExecutionContext } from './approved-execution-context.mjs';
import { assertImplementationDecision } from './user-decision.mjs';
import { taskPackageDefaults, loadDigitalHumanRoles } from './digital-human-roles.mjs';
import { validateTaskPackageSchema } from './task-package-schema.mjs';
const fail=message=>{throw new TypeError(message);};
const equalArrays=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
function generateTaskPackageDefaults(roleId,overrides,{rolesDoc}={}) {
  const defaults=taskPackageDefaults(roleId,rolesDoc||loadDigitalHumanRoles());
  return {schema_version:1,role_id:roleId,skill_source:{registry_ref:'docs/agents/digital-human-roles.yaml',defaults_ref:`taskPackageDefaults(${roleId})`,core_skills:defaults.core_skills,forbidden_skills:defaults.forbidden_skills},...overrides};
}

/** Compile dispatch from the approved YAML. Only runtime identity and task ID come from the caller. */
export function compileSliceTaskPackage(binding,{root=ROOT,work_unit_id,task_id,actor_id,runtime_id,execution_state='Worker',rolesDoc,user_decisions}={}) {
  const actualRoles=parseSliceYaml(readFileSync(safe(root,'docs/agents/digital-human-roles.yaml')));
  if(rolesDoc&&digest(rolesDoc)!==digest(actualRoles))fail('调用方不能替换接收端角色能力');
  rolesDoc=actualRoles;
  if(!actualRoles.runtimes.some(runtime=>runtime.id===runtime_id))fail('接收端不支持该 runtime_id');
  const execution=createApprovedExecutionContext(binding,{root,work_unit_id});
  const {contract}=assertApprovedExecutionContext(execution,{root});
  if(contract.schema_version!==3)fail('v3 派发编译入口只接受 v3；v2 保留原派发路径');
  const unit=contract.work_units.find(item=>item.id===work_unit_id);
  if(!unit)fail('未找到指定 Slice 工作单元');
  const checkpoint=readSliceDispatchApproval(root,binding.approval_ref);
  const decisions=user_decisions||checkpoint.human_review?.user_decisions;
  const output=generateTaskPackageDefaults(unit.role_id,{
    task_id,work_unit_id,actor_id,runtime_id,execution_state,workflow_status:'not-started',stage_id:'stage.vertical-slice-implementation',
    contract:{kind:'slice-implementation',contract_id:contract.contract_id,contract_version:contract.contract_version,status:'issued',contract_ref:binding.ref,slice_contract_ref:binding.ref,gate_refs:[binding.approval_ref]},
    inputs:[binding.ref,...new Set(Object.values(contract.lifecycle_refs))],
    objective:`${unit.behavior}（执行目录：${unit.project_root}；完整约束读取 ${binding.ref}）`,
    allowed_write_paths:unit.allowed_write_paths,forbidden_actions:[...unit.work_unit.forbidden_patterns,'来源过期、越界、缺证据、验证失败或新增影响时停止并回交'],
    expected_outputs:[unit.behavior],expected_evidence_files:unit.work_unit.expected_evidence,verification_commands:unit.work_unit.verification_commands,verification_results:[],
    downstream_consumers:unit.downstream_consumers||['role.lifecycle-orchestrator'],convergence:{parent_work_unit:'work-unit.slice-implementation',convergence_ref:unit.convergence_ref||binding.approval_ref,conflict_escalation:'返回生命周期主控'},user_decisions:decisions
  },{rolesDoc});
  enforceHarnessTaskScope(output,{root});
  validateTaskPackageSchema(output);
  assertSliceV3TaskPackage(output,contract,{root});
  return output;
}
function readSliceDispatchApproval(root,ref) {return parseSliceYaml(readFileSync(safe(root,ref)));}
export function assertSliceV3TaskPackage(value,slice,{root=ROOT}={}) {
  enforceHarnessTaskScope(value,{root});
  const contract=value.contract;
  const current=normalizeSliceContract(slice,{root});
  const roles=parseSliceYaml(readFileSync(safe(root,'docs/agents/digital-human-roles.yaml'))),defaults=taskPackageDefaults(value.role_id,roles);
  if(!roles.runtimes.some(runtime=>runtime.id===value.runtime_id)||!defaults.stages.includes(value.stage_id))fail('接收端角色或运行时不支持当前任务');
  if(!equalArrays(value.skill_source.core_skills,defaults.core_skills)||!equalArrays(value.skill_source.forbidden_skills,defaults.forbidden_skills))fail('任务角色能力与接收端不一致');
  const unit=current.work_units.find(item=>item.id===value.work_unit_id);
  if(unit&&[unit.primary_skill,...(unit.supporting_skills||[])].some(skill=>defaults.forbidden_skills.includes(skill)))fail('工作单元使用接收角色禁用 Skill');
  if(!unit||unit.role_id!==value.role_id||current.contract_id!==contract.contract_id||current.contract_version!==contract.contract_version)fail('任务身份与 Slice v3 不一致');
  if(!Array.isArray(contract.gate_refs)||contract.gate_refs.length!==1)fail('Slice v3 派发需要唯一批准 checkpoint 引用');
  const bytes=readFileSync(safe(root,contract.slice_contract_ref));
  const execution=createApprovedExecutionContext({ref:contract.slice_contract_ref,digest:hash(bytes),id:current.contract_id,version:current.contract_version,approval_ref:contract.gate_refs[0]},{root,work_unit_id:value.work_unit_id});
  assertApprovedExecutionContext(execution,{root,contract:current});
  for(const allowed of value.allowed_write_paths)if(!unit.allowed_write_paths.some(parent=>withinSlicePath(allowed,parent)))fail('任务写范围超出 Slice v3');
  for(const key of ['verification_commands','expected_evidence_files']) {
    const required=key==='verification_commands'?unit.work_unit.verification_commands:unit.work_unit.expected_evidence;
    if(!equalArrays(value[key],required))fail(`任务包遗漏或替换 Slice v3 ${key}`);
  }
  for(const item of unit.work_unit.forbidden_patterns)if(!value.forbidden_actions.includes(item))fail('任务包遗漏全局约束');
  if(value.execution_state==='Worker')assertImplementationDecision({slice_contract_ref:contract.slice_contract_ref,vertical_slice_ticket_ref:current.lifecycle_refs.ticket,user_decisions:value.user_decisions},{root});
  return value;
}
