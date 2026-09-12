import path from 'node:path';
import { readFileSync } from 'node:fs';
import { ROOT, read, parse, safe, hash, digest, schema } from './strategic-handoff-io.mjs';
import { countersignRuleForGate } from './digital-human-roles.mjs';
import { validateApprovalRecord } from './approval-record.mjs';
import { assertImplementationDecision } from './user-decision.mjs';
import { loadSkillRegistry } from './skill-registry.mjs';

const contexts=new WeakMap();
const gateId='gate.slice-contract-approved';
const check=(ok,code,message)=>{if(!ok){const error=new TypeError(`${code}: ${message}`);error.code=code;throw error;}};
const same=(a,b)=>digest(a)===digest(b);
const ioFor=root=>({root,read:ref=>readFileSync(safe(root,path.relative(root,ref).split(path.sep).join('/')))});

/** Existing registrations require persisted input sections; array properties disappear in JSON. */
export function assertExistingSliceStructure(contract) {
  const identity=contract?.resolution?.architecture_identity;
  if(identity?.schema_version!==2||identity.source_kind!=='existing-registration')return;
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  check(object(contract.lifecycle_refs),'EXECUTION_CONTRACT_INVALID','既有工程 Slice lifecycle_refs 必须是对象');
  for(const field of ['ticket','engineering_baseline'])check(typeof contract.lifecycle_refs[field]==='string'&&contract.lifecycle_refs[field].trim(),'EXECUTION_CONTRACT_INVALID',`既有工程 Slice 缺少 lifecycle_refs.${field}`);
  check(object(contract.readiness),'EXECUTION_CONTRACT_INVALID','既有工程 Slice readiness 必须是对象');
  for(const field of ['blockers','stale_inputs','not_applicable'])check(Array.isArray(contract.readiness[field]),'EXECUTION_CONTRACT_INVALID',`既有工程 Slice readiness.${field} 必须是数组`);
}

/** Reads original local approval; a contract's own approved status never establishes permission. */
export function verifySliceContractApproval(binding,{root=process.cwd(),contract:expected}={}) {
  root=path.resolve(root);
  check(binding?.ref&&binding?.digest&&binding?.approval_ref,'EXECUTION_APPROVAL_REQUIRED','需要当前持久化 Slice 的 ref/digest/approval_ref');
  const bytes=readFileSync(safe(root,binding.ref));
  check(hash(bytes)===binding.digest,'EXECUTION_CONTRACT_STALE','Slice 原始字节与绑定不一致');
  const document=parse(bytes),contract=document.slice_contract||document;
  check(contract.schema_version===2&&contract.status==='approved'&&typeof contract.contract_id==='string'&&contract.contract_id&&typeof contract.contract_version==='string'&&contract.contract_version&&typeof contract.slice_id==='string'&&contract.slice_id,'EXECUTION_CONTRACT_INVALID','需要已批准且有身份的持久化 Slice v2');
  assertExistingSliceStructure(contract);
  check((!binding.id||binding.id===contract.contract_id)&&(!binding.version||binding.version===contract.contract_version),'EXECUTION_CONTRACT_CONFLICT','当前合同身份或版本不匹配');
  if(expected)check(same(expected.slice_contract||expected,contract),'EXECUTION_CONTRACT_CONFLICT','调用方合同与持久化原字节不一致');
  const roles=read(safe(root,'docs/agents/digital-human-roles.yaml'));
  const approval=read(safe(root,binding.approval_ref));
  if(!countersignRuleForGate(roles.gate_policy,gateId)&&roles.gate_policy.orchestrator?.includes(gateId)) {
    // The current lifecycle already owns this gate. Consume its checkpoint and existing
    // implementation-scope decision instead of inventing an approval-record countersignature.
    check(approval?.gates&&approval?.human_review&&!approval.gate_id,'EXECUTION_APPROVAL_PROTOCOL','当前主控 gate 需要生命周期 checkpoint，不接受伪造 approval-record');
    schema(approval,'docs/process/schemas/lifecycle-checkpoint.schema.json');
    const gate=approval.gates?.[gateId],review=approval.human_review||{};
    check(approval.repository_mode==='project-instance'&&approval.status!=='blocked'&&approval.blockers.length===0,'EXECUTION_APPROVAL_BLOCKED','主控 checkpoint 仍有阻断或不是产品实例');
    check(gate?.status==='approved'&&gate.subject_ref===binding.ref,'EXECUTION_APPROVAL_SCOPE','主控 gate 未批准当前持久化 Slice');
    check(review.implementation?.slice_contract_ref===binding.ref,'EXECUTION_APPROVAL_SCOPE','实施批准不指向当前 Slice 原始文件');
    assertImplementationDecision({...review.implementation,user_decisions:review.user_decisions||[]},{...ioFor(root),rolesDoc:roles});
  } else {
    // Historical source profiles that declared this a countersign gate retain their policy.
    validateApprovalRecord(approval,{...ioFor(root),rolesDoc:roles,requireApproved:true});
    check(approval.gate_id===gateId&&approval.artifact_bindings?.some(item=>item.id===contract.contract_id&&item.version===contract.contract_version&&item.digest===binding.digest),'EXECUTION_APPROVAL_SCOPE','源会签未绑定当前 Slice 的身份、版本和字节');
  }
  return {contract,binding:structuredClone(binding),root};
}

function executionBasis(verified,{allowCompilerDrift=false}={}) {
  const {contract}=verified,resolution=contract.resolution||{};
  const compiler=read(safe(ROOT,'.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml'));
  if(!allowCompilerDrift)for(const [section,fields] of Object.entries(compiler.slice_contract_required))for(const field of fields)check(Object.hasOwn(section==='root'?contract:contract[section]||{},field),'EXECUTION_CONTRACT_INVALID',`合同缺少 ${section}.${field}`);
  check(Array.isArray(contract.common?.allowed_write_paths)&&contract.common.allowed_write_paths.length>0&&contract.common.allowed_write_paths.every(value=>typeof value==='string'&&value.trim()),'EXECUTION_SCOPE_MISSING','合同缺少已批准写范围');
  check(Array.isArray(contract.readiness?.blockers)&&!contract.readiness.blockers.length&&Array.isArray(contract.readiness?.stale_inputs)&&!contract.readiness.stale_inputs.length,'EXECUTION_CONTRACT_STALE','合同就绪条件仍有阻断或过期输入');
  if(!allowCompilerDrift)check(resolution.registry_digest===digest(loadSkillRegistry()).slice(7)&&resolution.compiler_contract_digest===digest(compiler).slice(7),'EXECUTION_CONTRACT_STALE','编译依据已改变，应重新编译批准');
  check(resolution.freshness==='current','EXECUTION_CONTRACT_STALE','resolution 不是 current');
  if(resolution.architecture_identity)check(resolution.architecture_identity_digest===digest(resolution.architecture_identity).slice(7),'EXECUTION_CONTRACT_STALE','编译架构身份摘要不一致');
  return verified;
}

export function createApprovedExecutionContext(binding,options={}) {
  const verified=executionBasis(verifySliceContractApproval(binding,options));
  const context=Object.freeze({kind:'approved-slice-execution-context'});
  contexts.set(context,{binding:verified.binding,root:verified.root,allowCompilerDrift:false});
  return context;
}

/** A prior approved scope may authenticate bounded output while current compiler facts are recomputed. */
export function createApprovedRecompilationContext(binding,options={}) {
  const verified=executionBasis(verifySliceContractApproval(binding,options),{allowCompilerDrift:true});
  const context=Object.freeze({kind:'approved-slice-recompilation-context'});
  contexts.set(context,{binding:verified.binding,root:verified.root,allowCompilerDrift:true});
  return context;
}

/** Revalidate original bytes on every boundary; a serialized/caller-invented context is rejected. */
export function assertApprovedExecutionContext(context,{root=process.cwd(),contract,architectureIdentity,architectureEvidence,technicalDesign,sliceId}={}) {
  const saved=contexts.get(context);
  check(saved&&saved.root===path.resolve(root),'EXECUTION_CONTEXT_UNTRUSTED','只允许从当前原始 Slice 与本地批准生成的执行上下文');
  const verified=executionBasis(verifySliceContractApproval(saved.binding,{root,contract}),{allowCompilerDrift:saved.allowCompilerDrift});
  const current=verified.contract,resolution=current.resolution;
  if(sliceId)check(current.slice_id===sliceId,'EXECUTION_SCOPE_CONFLICT','执行上下文属于另一切片');
  if(architectureIdentity)check(same(resolution.architecture_identity,architectureIdentity),'EXECUTION_INPUT_REPLACED','执行上下文不允许替换架构身份或固定源码输入');
  if(architectureEvidence)check(same(resolution.architecture_evidence,architectureEvidence),'EXECUTION_INPUT_REPLACED','执行上下文不允许替换原始架构证据');
  if(technicalDesign) {
    const binding=resolution.technical_design;
    check(binding?.ref&&binding.digest,'EXECUTION_DESIGN_MISSING','Slice 未绑定当前技术设计');
    const bytes=readFileSync(safe(root,binding.ref));
    check(hash(bytes)===binding.digest&&same(parse(bytes),technicalDesign),'EXECUTION_INPUT_REPLACED','执行上下文不允许替换技术设计');
  }
  return {allowed_write_paths:[...current.common.allowed_write_paths],contract:current};
}

export function approvedExecutionBinding(context) {
  const saved=contexts.get(context);
  check(saved,'EXECUTION_CONTEXT_UNTRUSTED','不能序列化未验证的执行上下文');
  return structuredClone(saved.binding);
}
