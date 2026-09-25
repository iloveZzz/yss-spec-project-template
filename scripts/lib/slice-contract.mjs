import {validateExistingUiBaseline} from './existing-ui-baseline.mjs';
import {sliceRepositories} from './slice-repositories.mjs';
import { sliceCheckApplicability } from './slice-applicability.mjs';
import fs, {validationMemo} from './validation-phase.mjs';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';
import { safe, hash, digest, schema } from './strategic-handoff-io.mjs';

const parseCache=Symbol('slice-yaml');
const originals = new WeakMap();
const sourceSnapshots = new WeakMap();
const nonempty = value => typeof value === 'string' && value.trim();
const unique = values => [...new Set(values)];
const fail = message => { throw new TypeError(`slice-contract-invalid: ${message}`); };
const requireThat = (ok, message) => { if (!ok) fail(message); };
export const sourceSliceContract = value => originals.get(value) || value?.slice_contract || value;
export function parseSliceYaml(bytes) {return validationMemo(parseCache,String(bytes),()=>parseSliceYamlFresh(bytes));}
function parseSliceYamlFresh(bytes) {
  const doc = parseDocument(String(bytes), { uniqueKeys: true, intAsBigInt: true });
  requireThat(!doc.errors.length, `YAML 无效: ${doc.errors[0]?.message}`);
  const value = doc.toJS({ maxAliasCount: 0 });
  const convert = item => {
    if (typeof item === 'bigint') {
      requireThat(item <= BigInt(Number.MAX_SAFE_INTEGER) && item >= BigInt(Number.MIN_SAFE_INTEGER), 'YAML 整数超出精确范围，请使用字符串');
      return Number(item);
    }
    if (Array.isArray(item)) return item.map(convert);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([k,v]) => [k,convert(v)]));
    requireThat(typeof item !== 'number' || Number.isFinite(item), 'YAML 非有限数值');
    return item;
  };
  return convert(value);
}
export function withinSlicePath(candidate, parent) {
  if (!nonempty(candidate) || !nonempty(parent)) return false;
  const rel = path.relative(path.resolve(parent), path.resolve(candidate));
  return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`));
}
function safeWritePath(value) {
  requireThat(nonempty(value) && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..') && !/[\x00-\x1f*?{}\[\]]/.test(value), `写范围必须为明确的仓库相对路径: ${value}`);
}
export function resolveSliceBasis(contract, key, stack = []) {
  requireThat(!stack.includes(key), `依据别名循环: ${[...stack,key].join(' -> ')}`);
  const binding = contract.basis?.[key];
  requireThat(binding !== undefined, `缺少上游依据 ${key}`);
  return typeof binding === 'string' ? resolveSliceBasis(contract,binding,[...stack,key]) : binding;
}
export function readSliceSources(contract, { root = process.cwd() } = {}) {
  const result = {}, bytesByPath=new Map();
  for (const key of Object.keys(contract.basis)) {
    const binding = resolveSliceBasis(contract,key);
    const file=safe(root,binding.ref);
    if(!bytesByPath.has(file))bytesByPath.set(file,fs.readFileSync(file));
    const bytes=bytesByPath.get(file);
    requireThat(hash(bytes) === binding.digest, `stale: 上游依据 ${key} 原始字节变化`);
    result[key] = { ...binding, text: bytes.toString('utf8') };
  }
  return result;
}
export function sliceArchitectureEvidence(contract,sources) {
  const identity=contract.resolution.architecture_identity;
  if(!identity)return undefined;
  const keys=['engineering_baseline','repository_registration','manifest'];
  if(identity.schema_version!==2)return Object.fromEntries(keys.map(key=>[key,parseSliceYaml(sources[key].text)]));
  const registration=parseSliceYaml(sources.repository_registration.text);
  const evidence={repository_registration:resolveSliceBasis(contract,'repository_registration')};
  for(const key of ['engineering_baseline','manifest']) {
    const original=registration.architecture_evidence?.[key],bound=resolveSliceBasis(contract,key);
    requireThat(original?.ref===bound.ref&&original?.digest===bound.digest,`登记与 ${key} 绑定冲突`);
    evidence[key]=original;
  }
  return evidence;
}
function requireKeys(value, names, label) {
  for (const name of names) requireThat(value[name] !== undefined, `${label} 缺少 ${name}`);
}
function locate(text, locator) {
  if(locator.startsWith('pointer:')) {
    const value=locator.slice(8).split('/').slice(1).reduce((current,key)=>current?.[key.replaceAll('~1','/').replaceAll('~0','~')],parseSliceYaml(text));
    requireThat(value!==undefined,`定位缺失: ${locator}`);return JSON.stringify(value);
  }
  const lines = text.split('\n');
  const range = /^lines:(\d+)-(\d+)$/.exec(locator);
  if (range) {
    const start=Number(range[1]),end=Number(range[2]);
    requireThat(start>=1&&end>=start&&end<=lines.length,`定位范围无效: ${locator}`);
    return lines.slice(start-1,end).join('\n');
  }
  const body=text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,'');
  const matches=body.split('\n').filter(line=>line.includes(locator));
  requireThat(matches.length===1, `定位缺失或不唯一: ${locator}`);
  return matches[0];
}
export function sliceAcceptanceText(contract, sources) {
  return Object.fromEntries(Object.entries(contract.acceptance).map(([id,item])=>{
    requireThat(sources[item.source],`验收 ${id} 来源缺失`);
    return [id,locate(sources[item.source].text,item.locator)];
  }));
}
/** Validate the authoritative v3 document, then expand inherited facts ONLY in memory. */
export function normalizeSliceContract(document, options = {}) {
  const raw = sourceSliceContract(document);
  requireThat(raw && [2,3].includes(raw.schema_version), 'Slice Implementation Contract schema v1 已停止支持；需要 schema v2 或 v3');
  if (raw.schema_version === 2) {
    const ref = raw.lifecycle_refs?.ticket;
    if (ref) {
      requireThat(!/\/work-items\//.test(ref), 'stage-work-item 不能作为实现 Ticket');
      const file = safe(options.root || process.cwd(), ref, { missing: true });
      if (fs.existsSync(file)) {
        const header = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
        requireThat(!header || parseSliceYaml(header[1])?.kind !== 'stage-work-item', 'stage-work-item 不能作为实现 Ticket');
      }
    }
    return structuredClone(raw);
  }
  schema(raw,'.template-spec/process/schemas/slice-implementation-contract-v3.schema.json');
  const sources=readSliceSources(raw,options), refs=Object.fromEntries(Object.entries(sources).map(([key,item])=>[key,item.ref]));
  requireKeys(refs,['spec','ticket','engineering_baseline','implementation_repository','build_architecture_checklist'],'依据');
  const ticketHeader = sources.ticket.text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  requireThat(!/\/work-items\//.test(refs.ticket) && (!ticketHeader || parseSliceYaml(ticketHeader[1])?.kind !== 'stage-work-item'), 'stage-work-item 不能作为实现 Ticket');
  if(!raw.applicability.checks)requireKeys(refs,['architecture_review'],'依据');
  else {
    requireKeys(refs,['lifecycle_registry','process_tailoring'],'适用性依据');
    const registry=parseSliceYaml(sources.lifecycle_registry.text),expected=sliceCheckApplicability(raw.scope,registry);
    requireThat(digest(raw.applicability.checks)===digest(expected),'材料适用性与生命周期规则冲突');
    if(expected['check.architecture-reviewed'].status==='required')requireKeys(refs,['architecture_review'],'命中检查');
  }
  if(raw.ticket_policy)requireThat(nonempty(sources.ticket.version),'冻结 Ticket 缺少需求版本');
  const extension=raw.extensions || {}, scope=raw.scope, resolution=structuredClone(raw.resolution);
  if(raw.ticket_policy&&scope.project_roots.length>1)requireThat(extension.cross_repo?.repository_bindings,'新跨仓草案缺少逐仓登记绑定');
  const repositories=sliceRepositories(raw,sources,options);
  for (const key of ['frontend','backend','api','cross_repo']) {
    const item=raw.applicability[key];
    if (item.status === 'required') requireThat(extension[key],`命中 ${key} 影响但缺少子合同`);
    else {
      requireThat(nonempty(item.reason),`${key} 不适用缺少理由`);
      requireThat(!extension[key],`${key} 不适用时不得保存空子合同`);
    }
  }
  for(const [impact,section]of [['frontend','frontend'],['ui','frontend'],['backend','backend'],['api','api'],['cross-repo','cross_repo']])if(scope.impacted_areas.includes(impact))requireThat(raw.applicability[section].status==='required',`影响面 ${impact} 与适用性冲突`);
  if(scope.impacted_areas.some(x=>['data','persistence'].includes(x)))requireKeys(refs,['data_architecture'],'数据依据');
  if (extension.frontend && raw.applicability.frontend.baseline_kind==='existing-ui-baseline') {
    requireThat(raw.applicability.frontend.ui_change==='none'&&!scope.impacted_areas.includes('ui'),'既有 UI 基线不能承接 UI 变化');
    requireKeys(refs,['existing_ui_baseline','frontend_delivery'],'既有 UI 依据');
    const observed=parseSliceYaml(sources.existing_ui_baseline.text);
    const validation=validateExistingUiBaseline(observed,{bundleRoot:path.dirname(safe(options.root||process.cwd(),sources.existing_ui_baseline.ref))});
    requireThat(validation.errors.length===0,`既有 UI 基线不可消费: ${validation.errors.join('; ')}`);
    requireThat(extension.frontend.visual_baseline_case_ids.every(id=>observed.cases.some(c=>c.case_id===id)),'既有 UI 用例未被基线覆盖');
  } else if (extension.frontend) requireKeys(refs,['requirement_freeze','low_fidelity_review','prototype_review','prototype_profile_decision','prototype_deliverable','prototype_deliverable_verification','prototype_confirmation','visual_baseline','state_matrix'],'前端依据');
  if (extension.backend) {
    requireKeys(refs,['technical_design','repository_registration','manifest','backend_repository','maven_wrapper'],'后端依据');
    requireThat(resolution.architecture_identity||repositories&&Object.values(repositories).some(r=>r.resolution.architecture_identity),'后端缺少架构身份');
    requireThat(nonempty(sources.technical_design.version),'技术设计缺少版本');
    for (const selector of extension.backend.design_refs) locate(sources.technical_design.text,selector);
  }
  requireKeys(refs,[extension.api?'openapi_freeze':'no_api_impact_record'],'API 依据');
  requireThat(!refs[extension.api?'no_api_impact_record':'openapi_freeze'],'API 影响结论冲突');
  for (const p of scope.allowed_write_paths) safeWritePath(p);
  requireThat(!scope.project_roots.some(p=>/^app\/(backend|frontend)(\/|$)/.test(p)), '禁止 app/backend 或 app/frontend');
  if (scope.implementation_path_policy !== 'external-repository-native') for(const p of scope.project_roots) requireThat(/^apps\/(backend|frontend)\/[^/]+/.test(p),'Harness 工程必须落入具体 project 目录');
  sliceAcceptanceText(raw,sources);
  const unitIds=new Set(), usedChecks=new Set(), covered=new Set();
  const expected=Object.keys(raw.acceptance);
  for(const [id,check] of Object.entries(raw.verification)) {
    requireThat(scope.project_roots.some(p=>withinSlicePath(check.cwd,p)),`验证 ${id} 的 cwd 未登记`);
    if(check.dependency_roots)requireThat(repositories&&check.dependency_roots.every(p=>repositories[p]),`验证 ${id} 依赖仓库未登记`);
    requireThat(check.acceptance_refs.length && check.acceptance_refs.every(ref=>expected.includes(ref)),`验证 ${id} 验收引用无效`);
  }
  const work_units=raw.work_units.map(unit=>{
    requireThat(!unitIds.has(unit.id),`工作单元重复: ${unit.id}`);unitIds.add(unit.id);
    const allowed=unit.allowed_write_paths || scope.allowed_write_paths;
    for(const p of allowed) { safeWritePath(p);requireThat(scope.allowed_write_paths.some(parent=>withinSlicePath(p,parent)),`任务 ${unit.id} 写范围越界: ${p}`); }
    const root=unit.project_root || (scope.project_roots.length===1?scope.project_roots[0]:null);
    requireThat(scope.project_roots.includes(root),`任务 ${unit.id} 必须选择登记的 project_root`);
    const checks=unique([...Object.keys(raw.verification).filter(id=>raw.verification[id].required_for_all),...unit.verification_refs]);
    requireThat(checks.every(id=>raw.verification[id]),`任务 ${unit.id} 引用未知验证`);
    requireThat(checks.every(id=>withinSlicePath(raw.verification[id].cwd,root)),`任务 ${unit.id} 验证执行仓库冲突`);
    const skills=[unit.primary_skill,...(unit.supporting_skills || [])];
    requireThat(skills.every(id=>resolution.required_skills.includes(id)),`任务 ${unit.id} Skill 不在冻结闭包内`);
    requireThat(unit.acceptance_refs.every(id=>expected.includes(id)&&checks.some(k=>raw.verification[k].acceptance_refs.includes(id))),`任务 ${unit.id} 验收没有验证覆盖`);
    for(const id of unit.acceptance_refs)covered.add(id);
    for(const id of checks)usedChecks.add(id);
    if(unit.tdd_mode==='controlled-generation') {
      requireThat(unit.controlled_generation,'controlled-generation 缺少受控例外');
      requireKeys(unit.controlled_generation,['exception_reason','generator','generator_inputs','expected_files','verification_commands','behavior_tests_after_generation'],'受控生成');
    } else requireThat(!unit.controlled_generation,'行为测试不得携带受控生成例外');
    const work_unit={...unit,allowed_write_paths:allowed,project_root:root,supporting_skills:unit.supporting_skills||[],verification:checks.map(id=>({id,...raw.verification[id]})),verification_commands:checks.map(id=>raw.verification[id].command),expected_evidence:unique(checks.flatMap(id=>raw.verification[id].expected_evidence)),forbidden_patterns:unique([...(scope.forbidden_patterns||[]),...(unit.forbidden_patterns||[])])};
    return {...work_unit,contract_id:raw.contract_id,contract_version:raw.contract_version,work_unit};
  });
  requireThat(expected.every(id=>covered.has(id)), '存在未被工作单元覆盖的验收');
  requireThat(Object.keys(raw.verification).every(id=>usedChecks.has(id)),'存在未分配的验证要求');
  if(repositories)for(const id of extension.cross_repo.integration_verification)requireThat(raw.verification[id]?.dependency_roots?.length,'联合验证必须引用有依赖仓库和明确 cwd 的 verification');
  const allChecks=Object.values(raw.verification);
  resolution.freshness='current'; // Only after every bound source was read and verified above.
  if(resolution.architecture_identity) {
    resolution.architecture_identity_digest=digest(resolution.architecture_identity).slice(7);
    resolution.architecture_evidence=sliceArchitectureEvidence(raw,sources);
  }
  if(refs.technical_design)resolution.technical_design=resolveSliceBasis(raw,'technical_design');
  if(refs.frontend_delivery)resolution.frontend_delivery={acceptance_ref:refs.frontend_delivery,digest:sources.frontend_delivery.digest};
  const common={...scope,required_capabilities:resolution.required_capabilities,required_skills:resolution.required_skills,verification_commands:allChecks.map(c=>c.command),expected_evidence_files:unique(allChecks.flatMap(c=>c.expected_evidence)),quality_baseline_ref:refs.engineering_baseline,forbidden_patterns:scope.forbidden_patterns||[],full_reroute_triggers:scope.full_reroute_triggers||[]};
  const normalized={...structuredClone(raw),...(repositories?{repositories}:{}),common,resolution,lifecycle_refs:{...refs,openapi_freeze_or_no_impact:refs.openapi_freeze||refs.no_api_impact_record},readiness:{blockers:[],stale_inputs:[],not_applicable:Object.entries(raw.applicability).filter(([,a])=>a.status==='not-applicable').map(([item,a])=>({item,reason:a.reason}))},work_units,
    frontend:extension.frontend?{status:'required',...extension.frontend,approved_prototype_ref:refs.prototype_confirmation,state_matrix_ref:refs.state_matrix,visual_baseline_ref:refs.visual_baseline,...(resolution.frontend_delivery?{delivery:resolution.frontend_delivery}:{})}:{status:'not-applicable'},
    backend:extension.backend?{status:'required',...extension.backend}:{status:'not-applicable'},
    contract:{api_impact:!!extension.api,...(extension.api?{freeze_ref:refs.openapi_freeze,...extension.api}:{no_api_impact_ref:refs.no_api_impact_record})},
    cross_repo:extension.cross_repo?{repositories:scope.project_roots,...extension.cross_repo}:{}
  };
  originals.set(normalized,raw);
  sourceSnapshots.set(normalized,sources);
  return normalized;
}
export function readSliceContract(ref,{root=process.cwd(),diagnostic=false}={}) {
  const bytes=fs.readFileSync(safe(root,ref)),raw=sourceSliceContract(parseSliceYaml(bytes));
  const contract=diagnostic&&raw.status==='blocked'?null:normalizeSliceContract(raw,{root});
  return {contract,raw,sources:structuredClone(sourceSnapshots.get(contract)||{}),binding:{ref,id:raw.contract_id,version:raw.contract_version,digest:hash(bytes)}};
}

/** Select only after full normalization; original raw identity is retained for approval comparison. */
export function selectSliceWorkUnit(contract,workUnitId) {
 if(!contract.repositories)return contract;
 const unit=contract.work_units.find(u=>u.id===workUnitId);
 requireThat(unit,'跨仓执行必须选择唯一 work_unit_id');
 const repo=contract.repositories[unit.project_root];
 const selected={...contract,backend:repo.project.delivery_role==='backend'?contract.backend:{status:'not-applicable'},frontend:repo.project.delivery_role==='frontend'?{...contract.frontend,...(repo.resolution.frontend_delivery?{delivery:repo.resolution.frontend_delivery}:{})}:{status:'not-applicable'},resolution:{...repo.resolution,freshness:contract.resolution.freshness},common:{...contract.common,project_roots:[unit.project_root],allowed_write_paths:unit.allowed_write_paths},lifecycle_refs:{...contract.lifecycle_refs,...Object.fromEntries(Object.entries(repo.basis).map(([k,v])=>[k,v.ref]))}};
 originals.set(selected,sourceSliceContract(contract));return selected;
}
