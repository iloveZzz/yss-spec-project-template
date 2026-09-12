import {assertApprovedExecutionContext} from './approved-execution-context.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,lstatSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseDocument} from '../vendor/yaml.mjs';
import {validateApprovalRecord} from './approval-record.mjs';

const sha=bytes=>`sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export const existingArchitectureDigest=x=>sha(JSON.stringify(stable(x)));
const text=x=>typeof x==='string'&&x.trim().length>0;
const digest=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
function requireThat(ok,code,message){if(!ok){const e=new TypeError(`${code}: ${message}`);e.code=code;throw e;}}
function relative(ref){requireThat(text(ref)&&!path.isAbsolute(ref)&&!/[\\\x00-\x1f]/.test(ref)&&ref.split('/').every(x=>x&&x!=='.'&&x!=='..'),'ARCH_PATH','证据路径必须为安全相对路径');return ref;}
function file(root,ref){relative(ref);let current=realpathSync(root);for(const part of ref.split('/')){current=path.join(current,part);requireThat(!lstatSync(current).isSymbolicLink(),'ARCH_PATH',`不允许 symlink: ${ref}`);}requireThat(lstatSync(current).isFile(),'ARCH_PATH',`不是文件: ${ref}`);return current;}
function parse(bytes){const doc=parseDocument(String(bytes),{uniqueKeys:true,maxAliasCount:0});requireThat(!doc.errors.length,'ARCH_EVIDENCE_FORMAT',doc.errors[0]?.message);return doc.toJS({maxAliasCount:0});}
function bound(root,binding){requireThat(binding&&text(binding.ref)&&digest(binding.digest),'ARCH_EVIDENCE_REF','缺少原始证据 ref/digest');const bytes=readFileSync(file(root,binding.ref));requireThat(sha(bytes)===binding.digest,'ARCH_EVIDENCE_STALE',`原始证据已改变: ${binding.ref}`);return parse(bytes);}
function same(a,b,code,label){requireThat(existingArchitectureDigest(a)===existingArchitectureDigest(b),code,label);}
const FIELDS=['schema_version','source_kind','architecture_family','architecture_profile','repository_id','project_id','source_digest','build_units_digest'];
export function validateExistingArchitecture(identity,registry){
 requireThat(identity?.schema_version===2&&identity.source_kind==='existing-registration','ARCH_SOURCE_UNSUPPORTED','仅支持 existing-registration v2');
 requireThat(FIELDS.every(k=>identity[k]!==undefined)&&Object.keys(identity).every(k=>FIELDS.includes(k)),'ARCH_IDENTITY_SHAPE','既有身份字段缺失或混入生成事实');
 const p=registry.existing_project_profiles?.[identity.architecture_profile];
 requireThat(p&&p.source_kind==='existing-registration'&&p.build_system==='maven'&&p.architecture_family===identity.architecture_family,'ARCH_PROFILE_UNSUPPORTED','未支持的既有工程架构/Profile');
 requireThat(['domain-driven','layered-mvc'].includes(identity.architecture_family)&&text(identity.repository_id)&&text(identity.project_id)&&digest(identity.source_digest)&&digest(identity.build_units_digest),'ARCH_IDENTITY_SHAPE','既有身份未绑定项目或源码/构建摘要');
 return p;
}
const beneath=(ref,scope)=>scope==='.'||ref===scope||ref.startsWith(`${scope}/`);
const excluded=ref=>ref.split('/').some(x=>['.git','target','node_modules'].includes(x));
function listFiles(root,prefix=''){return readdirSync(path.join(root,prefix),{withFileTypes:true}).flatMap(entry=>{const ref=prefix?`${prefix}/${entry.name}`:entry.name;if(excluded(ref))return[];requireThat(!entry.isSymbolicLink(),'ARCH_PATH',`源码中出现 symlink: ${ref}`);return entry.isDirectory()?listFiles(root,ref):[ref];});}
function inspectMaven(root,units){
 // Only parses XML; never invokes Maven or executes project-supplied commands.
 const script=`import json,sys,xml.etree.ElementTree as ET\nout=[]\nfor p in json.load(sys.stdin):\n r=ET.parse(p).getroot(); ns={'m':'http://maven.apache.org/POM/4.0.0'}; q=lambda s:r.find(s,ns)\n aid=q('m:artifactId'); aid=aid if aid is not None else q('artifactId')\n deps=[e.text.strip() for e in r.findall('m:dependencies/m:dependency/m:artifactId',ns)+r.findall('m:profiles/m:profile/m:dependencies/m:dependency/m:artifactId',ns)+r.findall('dependencies/dependency/artifactId') if e.text]\n modules=[e.text.strip() for e in r.findall('.//m:modules/m:module',ns)+r.findall('.//modules/module') if e.text]\n out.append({'artifact_id':aid.text.strip() if aid is not None else '', 'dependencies':deps, 'modules':modules})\nprint(json.dumps(out))`;
 try{return JSON.parse(execFileSync('python3',['-c',script],{input:JSON.stringify(units.map(u=>file(root,u.pom_ref))),encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024}));}catch(error){requireThat(false,'ARCH_BUILD_INVALID',`无法读取实际 Maven 构建单元: ${error.message}`);}
}
export function verifyExistingArchitecture(identity,bindings,{root,registry,execution}={}){
 const profile=validateExistingArchitecture(identity,registry);
 requireThat(text(root),'ARCH_EVIDENCE_REF','需要治理 root');
 const baseline=bound(root,bindings?.engineering_baseline),registration=bound(root,bindings?.repository_registration),manifest=bound(root,bindings?.manifest);
 for(const [name,record] of Object.entries({baseline,registration,manifest})){
  same(identity,record.architecture_identity,'ARCH_IDENTITY_CONFLICT',`${name} 架构身份与合同不一致`);
  requireThat(record.repository_id===identity.repository_id&&record.project_id===identity.project_id,'ARCH_REPOSITORY_CONFLICT',`${name} 仓库/项目不一致`);
 }
 requireThat(manifest.kind==='existing-project-observation'&&manifest.schema_version===1,'ARCH_MANIFEST_KIND','需要既有工程观测 manifest，不能冒充脚手架');
 requireThat(baseline.kind==='existing-engineering-baseline'&&baseline.schema_version===1,'ARCH_BASELINE_KIND','需要既有工程基线');
 requireThat(registration.status==='current'&&baseline.status==='current','ARCH_EVIDENCE_STALE','登记/工程基线不是 current');
 requireThat(text(registration.local_worktree)&&text(registration.project_root)&&text(registration.owner)&&text(registration.repository_url),'ARCH_REGISTRATION_MISSING','登记缺根路径、仓库来源或责任人');
 for(const key of ['engineering_baseline','manifest'])same(registration.architecture_evidence?.[key],bindings[key],'ARCH_EVIDENCE_CONFLICT',`登记未引用当前${key}`);
 const repositoryRoot=realpathSync(registration.local_worktree);
 const projectRoot=registration.project_root==='.'?repositoryRoot:path.join(repositoryRoot,relative(registration.project_root));
 requireThat(realpathSync(projectRoot)===projectRoot,'ARCH_PATH','工程根存在符号链接');
 const git=(args)=>execFileSync('git',['-C',repositoryRoot,...args],{encoding:'utf8',timeout:15000,maxBuffer:32*1024*1024}).trim();
 requireThat(git(['rev-parse','--show-toplevel'])===repositoryRoot,'ARCH_REPOSITORY_CONFLICT','登记根不是实际 Git 根');
 const source=manifest.source;
 requireThat(source&&/^[a-f0-9]{40}$/.test(source.base_commit)&&Array.isArray(source.files)&&source.files.length&&Array.isArray(source.roots)&&source.roots.length,'ARCH_SOURCE_MISSING','源码基线缺固定提交、文件清单或根范围');
 requireThat(git(['rev-parse',`${source.base_commit}^{commit}`])===source.base_commit,'ARCH_SOURCE_STALE','固定基础提交不可读');
 requireThat(git(['remote','get-url','origin'])===registration.repository_url,'ARCH_REPOSITORY_CONFLICT','实际 origin 与登记来源不一致');
 requireThat(git(['rev-parse','HEAD'])===source.base_commit,'ARCH_SOURCE_STALE','工作树 HEAD 与批准固定输入不一致');
 same(source,baseline.source,'ARCH_SOURCE_CONFLICT','工程基线与观测的源码范围不一致');
 requireThat(existingArchitectureDigest(source)===identity.source_digest,'ARCH_SOURCE_STALE','固定源码基线摘要不一致');
 for(const ref of source.roots)if(ref!=='.')relative(ref);
 const sourcePaths=source.files.map(x=>x.path);requireThat(new Set(sourcePaths).size===sourcePaths.length,'ARCH_SOURCE_INVALID','源码路径重复');
 const prefix=registration.project_root==='.'?'':`${registration.project_root}/`;
 const tree=git(['ls-tree','-r',source.base_commit]).split('\n').filter(Boolean).map(line=>{const [meta,ref]=line.split('\t');return{ref,blob:meta.split(' ')[2],mode:meta.split(' ')[0]};}).filter(x=>x.ref.startsWith(prefix)).map(x=>({...x,path:x.ref.slice(prefix.length)})).filter(x=>!excluded(x.path)&&source.roots.some(scope=>beneath(x.path,scope)));
 requireThat(tree.every(x=>['100644','100755'].includes(x.mode)),'ARCH_SOURCE_INVALID','源码范围包含 gitlink 或 symlink，需单独登记');
 same(sourcePaths.slice().sort(),tree.map(x=>x.path).sort(),'ARCH_SOURCE_INCOMPLETE','源码清单未覆盖声明范围的固定提交文件');
 const treeMap=new Map(tree.map(x=>[x.path,x.blob]));
 const changes=[];
 for(const item of source.files){
  relative(item.path);requireThat(digest(item.sha256),'ARCH_SOURCE_INVALID','源码摘要格式无效');
  let bytes;
  try { bytes=readFileSync(file(projectRoot,item.path)); } catch(error) { if(error.code==='ENOENT'){changes.push(item.path);continue;} throw error; }
  const actual=sha(bytes);const baseBlob=treeMap.get(item.path);
  requireThat(item.base_blob===baseBlob,'ARCH_SOURCE_STALE',`基础 Git blob 不一致: ${item.path}`);
  const currentBlob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if(actual!==item.sha256){changes.push(item.path);continue;}
  if(currentBlob!==baseBlob)requireThat(source.patches?.some(p=>p.path===item.path&&p.base_blob===baseBlob&&p.sha256===actual),'ARCH_SOURCE_UNDECLARED',`未登记基线补丁: ${item.path}`);
 }
 const observed=[...new Set(source.roots.flatMap(scope=>{ const entry=path.join(projectRoot,scope); try { const stat=lstatSync(entry); requireThat(!stat.isSymbolicLink(),'ARCH_PATH',`源码根出现 symlink: ${scope}`); return stat.isDirectory()?listFiles(projectRoot,scope==='.'?'':scope):[scope]; } catch(error) { if(error.code==='ENOENT')return [];throw error; } }))];
 for(const ref of observed)if(!sourcePaths.includes(ref))changes.push(ref);
 const units=manifest.build_units;
 requireThat(Array.isArray(units)&&units.length&&units.every(u=>text(u.id)&&text(u.pom_ref)&&Array.isArray(u.roles)&&Array.isArray(u.depends_on)),'ARCH_BUILD_MISSING','缺少实际构建单元/角色/依赖');
 same(units,baseline.build_units,'ARCH_BUILD_CONFLICT','三方构建单元映射不一致');
 requireThat(existingArchitectureDigest(units)===identity.build_units_digest,'ARCH_BUILD_STALE','构建单元摘要不一致');
 requireThat(new Set(units.map(u=>u.id)).size===units.length,'ARCH_BUILD_CONFLICT','构建单元重复');
 const inspected=inspectMaven(projectRoot,units);const artifactMap=new Map(inspected.map((m,i)=>[m.artifact_id,units[i].id]));
 for(const [i,u] of units.entries()){
  requireThat(sourcePaths.includes(u.pom_ref),'ARCH_BUILD_CONFLICT',`POM未冻结: ${u.pom_ref}`);
  requireThat(u.artifact_id===inspected[i].artifact_id,'ARCH_BUILD_CONFLICT',`artifactId不一致: ${u.id}`);
  for(const module of inspected[i].modules){
   requireThat(!module.includes('${'),'ARCH_BUILD_UNRESOLVED',`Maven module 路径尚未解析: ${u.id}`);
   const child=path.posix.normalize(path.posix.join(path.posix.dirname(u.pom_ref),module,'pom.xml'));
   relative(child); requireThat(units.some(unit=>unit.pom_ref===child),'ARCH_BUILD_INCOMPLETE',`实际 reactor 模块未登记: ${child}`);
  }
  const deps=[...new Set(inspected[i].dependencies.filter(a=>artifactMap.has(a)).map(a=>artifactMap.get(a)))].sort();
  same([...u.depends_on].sort(),deps,'ARCH_BUILD_CONFLICT',`实际模块依赖不一致: ${u.id}`);
 }
 requireThat(Array.isArray(registration.allowed_write_paths)&&registration.allowed_write_paths.length,'ARCH_REGISTRATION_MISSING','登记缺少允许写范围');
 for(const ref of registration.allowed_write_paths) if(ref!=='.')relative(ref);
 requireThat(profile.required_roles.every(role=>units.some(u=>u.roles.includes(role))),'ARCH_BOUNDARY_MISSING','实际构建单元未覆盖架构责任');
 requireThat(Array.isArray(baseline.boundary_scope)&&baseline.boundary_scope.length,'ARCH_BOUNDARY_MISSING','必须明确既有架构适用源码范围，不能推定整个混合仓同构');
 baseline.boundary_scope.forEach(relative);
 for(const unit of units)for(const role of unit.roles){
  const refs=unit.role_paths?.[role];
  requireThat(Array.isArray(refs)&&refs.length,'ARCH_BOUNDARY_MISSING',`缺少责任源码映射: ${unit.id}/${role}`);
  for(const ref of refs){relative(ref);requireThat(sourcePaths.some(p=>beneath(p,ref))&&baseline.boundary_scope.some(scope=>beneath(ref,scope)),'ARCH_BOUNDARY_CONFLICT',`责任源码映射未在已冻结边界内: ${ref}`);}
 }
 requireThat(Array.isArray(baseline.verification_commands)&&baseline.verification_commands.length&&Array.isArray(registration.verification_commands),'ARCH_VERIFICATION_MISSING','缺少登记验证命令');
 same(baseline.verification_commands,registration.verification_commands,'ARCH_VERIFICATION_CONFLICT','验证入口不一致');
 const review=bound(root,baseline.boundary_review);
 const rolesFile=path.join(root,'docs/agents/digital-human-roles.yaml');
 const roles=parse(readFileSync(rolesFile));
 validateApprovalRecord(review,{rolesDoc:roles,requireApproved:true,root});
 requireThat(['check.architecture-reviewed','gate.technical-design-approved'].includes(review.gate_id)&&text(baseline.id)&&text(baseline.version),'ARCH_REVIEW_MISSING','需要架构边界审查');
 const basis=existingArchitectureDigest(Object.fromEntries(Object.entries(baseline).filter(([k])=>k!=='boundary_review')));
 requireThat(review.artifact_bindings?.some(x=>x.id===baseline.id&&x.version===baseline.version&&x.digest===basis),'ARCH_REVIEW_STALE','架构审查未绑定当前基线');
 requireThat(text(review.principal_ref)&&review.principal_ref!==baseline.author,'ARCH_REVIEW_INVALID','起草者不能自审');
 requireThat(text(baseline.author),'ARCH_REVIEW_INVALID','工程基线缺少起草者');
 requireThat(Array.isArray(review.evidence_refs)&&review.evidence_refs.length,'ARCH_REVIEW_MISSING','缺少可读边界审查证据');
 review.evidence_refs.forEach(ref=>file(root,ref));
 requireThat(baseline.databases?.verification&&baseline.databases?.production,'ARCH_DATABASE_MISSING','需分别声明验证与生产数据库状态');
 for(const [kind,record] of Object.entries(baseline.databases)){
  requireThat(['declared','verified','unknown','not-applicable'].includes(record.status),'ARCH_DATABASE_INVALID',`${kind} 数据库状态无效`);
  if(record.status==='verified'){
   requireThat(text(record.engine)&&text(record.version)&&text(record.environment_id),'ARCH_DATABASE_INVALID','数据库验证未绑定环境和版本');
   const evidence=bound(root,record.verification);requireThat(evidence.source_digest===identity.source_digest&&evidence.engine===record.engine&&evidence.version===record.version&&evidence.environment_id===record.environment_id,'ARCH_DATABASE_STALE','实库验证与声明/源码不一致');
   requireThat(Array.isArray(evidence.results)&&evidence.results.length&&evidence.results.every(r=>text(r.command)&&r.exit_code===0&&Number.isFinite(Date.parse(r.executed_at))&&Array.isArray(r.evidence)&&r.evidence.length),'ARCH_DATABASE_UNVERIFIED','不能用数据库声明代替实际执行');
   evidence.results.forEach(r=>r.evidence.forEach(b=>{requireThat(text(b?.ref)&&digest(b.digest),'ARCH_DATABASE_UNVERIFIED','缺少原始执行日志');requireThat(sha(readFileSync(file(root,b.ref)))===b.digest,'ARCH_DATABASE_STALE','实际执行日志摘要不一致');}));
  }
 }
 if(changes.length){
  requireThat(execution,'ARCH_SOURCE_STALE',`固定源码改变: ${changes.join(', ')}`);
  const permission=assertApprovedExecutionContext(execution,{root,architectureIdentity:identity,architectureEvidence:bindings});
  const allowed=permission.allowed_write_paths.map(x=>{if(path.isAbsolute(x)){const rel=path.relative(projectRoot,x).split(path.sep).join('/');return rel==='.'||rel===''?'.':relative(rel);}return x==='.'?'.':relative(x);});
  requireThat(changes.every(ref=>allowed.some(scope=>beneath(ref,scope))&&registration.allowed_write_paths.some(scope=>beneath(ref,scope))),'ARCH_SOURCE_OUT_OF_SCOPE','输出增量超出批准写范围');
 }
 return {source_kind:'existing-registration',bindings:structuredClone(bindings),project_root:projectRoot,source_digest:identity.source_digest,build_units_digest:identity.build_units_digest,changed_files:[...new Set(changes)].sort(),profile_maturity:profile.maturity};
}
