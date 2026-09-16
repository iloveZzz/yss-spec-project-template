import fs from 'node:fs';
import * as lifecycle from './lifecycle-transition.mjs';
import path from 'node:path';
import {digest,schema} from './strategic-handoff-io.mjs';
import {parseSliceYaml,resolveSliceBasis,withinSlicePath,sliceArchitectureEvidence} from './slice-contract.mjs';
const check=(ok,message)=>{if(!ok)throw new TypeError(`slice-repository-invalid: ${message}`);};
/** All file facts stay in basis. Repository entries only select those facts. */
export function sliceRepositories(contract,sources,{root=process.cwd()}={}) {
 const bindings=contract.extensions?.cross_repo?.repository_bindings;if(!bindings)return null;
 check(lifecycle.SLICE_REPOSITORY_PREPARATION_PROTOCOL===1&&typeof lifecycle.validateImplementationRepositoriesReady==='function','接收端不支持当前来源的多项目准备协议，不能套用本地默认规则');
 check(sources.repository_preparation,'缺少多项目准备结果');
 const preparation=parseSliceYaml(sources.repository_preparation.text);
 schema(preparation,'docs/process/schemas/implementation-repository-preparation-result.schema.json');
 const ready=lifecycle.validateImplementationRepositoriesReady({implementation_repository_preparation:preparation,delivery_impacts:Object.fromEntries(['backend','frontend'].map(role=>[role,preparation.projects.some(p=>p.delivery_role===role&&p.status!=='not-applicable')]))},{root,exists:ref=>fs.existsSync(path.resolve(root,ref)),read:ref=>fs.readFileSync(path.resolve(root,ref),'utf8')});
 check(ready.result!=='blocked',`多项目准备未就绪: ${ready.missing_requirements.join('; ')}`);
 check(new Set(Object.keys(bindings).map(p=>path.resolve(p))).size===Object.keys(bindings).length,'工程根存在路径别名，不能重复登记');
 const result={},identities=new Set();
 for(const [projectRoot,keys]of Object.entries(bindings)) {
  const references=Object.entries(keys).filter(([name])=>!['recipe_refs','capability_refs'].includes(name));
  const selected=Object.fromEntries(references.map(([name,key])=>{check(sources[key],`缺少 basis.${key}`);return[name,sources[key]];}));
  const registration=parseSliceYaml(selected.implementation_repository.text),baseline=parseSliceYaml(selected.engineering_baseline.text);
  const actual=path.resolve(registration.local_worktree,registration.project_root||'.');
  check(path.resolve(projectRoot)===actual,'工程根与逐仓登记冲突');
  const project=preparation.projects.filter(p=>p.project_id===registration.project_id&&p.repository_ref===selected.implementation_repository.ref);
  check(project.length===1&&project[0].status!=='not-applicable'&&path.resolve(project[0].project_root)===actual,'准备结果没有唯一当前工程');
  const identityKey=JSON.stringify([registration.repository_id,registration.project_id]);check(!identities.has(identityKey),'同一仓库工程不能重复绑定');identities.add(identityKey);
  check(registration.status==='current'&&baseline.status==='current','逐仓登记或基线非 current');
  check(registration.repository_id===baseline.repository_id&&registration.project_id===baseline.project_id,'逐仓基线身份冲突');
  check(Array.isArray(registration.allowed_write_paths)&&registration.allowed_write_paths.length,'登记缺少写边界');
  if(project[0].delivery_role==='backend')check(selected.technical_design&&project[0].design_prerequisites.technical_design.digest===selected.technical_design.digest&&project[0].design_prerequisites.technical_design.ref===selected.technical_design.ref,'多项目准备与切片技术设计绑定冲突');
  const identity=baseline.architecture_identity||registration.architecture_identity;
  if(baseline.architecture_identity&&registration.architecture_identity)check(digest(baseline.architecture_identity)===digest(registration.architecture_identity),'逐仓架构冲突');
  const basis=Object.fromEntries(references.map(([name,key])=>[name,resolveSliceBasis(contract,key)]));
  basis.repository_registration??=basis.implementation_repository;
  selected.repository_registration??=selected.implementation_repository;
  const resolution={...contract.resolution};delete resolution.architecture_identity;
  if(identity){resolution.architecture_identity=identity;resolution.architecture_identity_digest=digest(identity).slice(7);resolution.architecture_evidence=sliceArchitectureEvidence({basis,resolution},selected);}
  if(basis.technical_design)resolution.technical_design=basis.technical_design;
  if(basis.frontend_delivery)resolution.frontend_delivery={acceptance_ref:basis.frontend_delivery.ref,digest:basis.frontend_delivery.digest};
  result[projectRoot]={registration,project:project[0],basis,resolution,recipe_refs:keys.recipe_refs,capability_refs:keys.capability_refs};
 }
 check(Object.keys(result).length===contract.scope.project_roots.length&&contract.scope.project_roots.every(p=>result[p]),'多仓绑定必须完整覆盖工程根');
 for(const key of ['delivery_order','rollback_order'])check(contract.extensions.cross_repo[key].length===Object.keys(result).length&&contract.extensions.cross_repo[key].every(p=>result[p]),`${key} 必须完整且唯一列出工程根`);
 for(const unit of contract.work_units) {
  const repo=result[unit.project_root];check(repo,`工作单元 ${unit.id} 未选择唯一工程`);
  check((unit.allowed_write_paths||contract.scope.allowed_write_paths).every(p=>repo.registration.allowed_write_paths.some(parent=>withinSlicePath(p,parent))),`工作单元 ${unit.id} 超出逐仓登记`);
 }
 return result;
}
