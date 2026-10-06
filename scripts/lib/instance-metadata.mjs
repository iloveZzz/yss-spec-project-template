import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from './validation-phase.mjs';
import { parseAsset } from './structured-assets.mjs';

const profiles={spec:{id:'harness.spec-template',legacy:'.yss-template.json'},design:{id:'harness.business-ddd-strategy-handoff',legacy:'.yss-harness-design.json'},backend:{id:'harness.backend-delivery',legacy:'.yss-harness-backend.json'},frontend:{id:'harness.frontend-delivery',legacy:'.yss-harness-frontend.json'}};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const ensure=(ok,message)=>{if(!ok)throw new TypeError('INSTANCE_IDENTITY: '+message);};
function read(root,ref){let cursor=root;for(const part of ref.split('/')){cursor=path.join(cursor,part);const stat=lstatSync(cursor,{throwIfNoEntry:false});if(!stat)return null;ensure(!stat.isSymbolicLink()&&(cursor===path.join(root,ref)?stat.isFile():stat.isDirectory()),'身份路径必须为普通文件: '+ref);}return parseAsset(readFileSync(cursor),ref);}
function descriptor(value){ensure(value?.type==='file'&&hex(value.digest)&&[420,493].includes(value.mode),'未知受管文件描述');return {type:value.type,digest:value.digest,mode:value.mode};}
function managedDigest(managed){ensure(managed&&typeof managed==='object'&&!Array.isArray(managed),'受管基线缺失');const ordered=[];for(const ref of Object.keys(managed).sort()){ensure(ref&&!ref.startsWith('/')&&!ref.includes('\\')&&!ref.split('/').some(p=>!p||p==='.'||p==='..'||p.toLowerCase()==='.git'),'受管路径越界');const item=managed[ref];ordered.push(JSON.stringify(ref)+':'+JSON.stringify({baseline:descriptor(item.baseline),lastApplied:descriptor(item.lastApplied),ownership:item.ownership}));ensure(typeof item.ownership==='string','归属缺失');}return sha(('{'+ordered.join(',')+'}').replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));}
function validateBindings(root,native){
 for(const [ref,profile,plugin] of [
  ['.yss-backend-plugin.json','spec','yss-backend-delivery'],
  ['.yss-product-design-plugin.json','design','yss-product-design'],
 ]){
  const binding=read(root,ref);
  if(!binding)continue;
  ensure(native,'插件 binding 缺少匹配原生身份: '+ref);
  ensure(native.schemaVersion===2&&native.profile===profile&&binding.schema_version===2&&binding.plugin===plugin&&binding.profile===profile&&binding.template_commit===native.templateCommit&&binding.bundle_hash===native.bundleHash&&hex(binding.binary_sha256),'插件 binding 与原生身份或来源不一致: '+ref);
 }
}
/** Native identity wins only after validation; preserved legacy bytes are lineage. */
export function readInstanceMetadata(root){
 root=path.resolve(root);const native=read(root,'.yss.json'),legacy=[];for(const [profile,p] of Object.entries(profiles)){const value=read(root,p.legacy);if(value)legacy.push({profile,metadataRef:p.legacy,metadata:value,kind:'legacy'});}
 ensure(legacy.length<=1,'检测到多个旧家族 metadata');
 if(!native){validateBindings(root,null);return legacy[0]??null;}
 ensure([1,2].includes(native.schemaVersion)&&native.protocolVersion===1,'未知 native metadata 或协议');const p=profiles[native.profile];ensure(p&&native.profileId===p.id&&(!legacy.length||legacy[0].profile===native.profile),'native 与家族身份矛盾');
 ensure(native.templateSourceState==='committed'&&/^[a-f0-9]{40}$/.test(native.templateCommit)&&hex(native.snapshotHash)&&hex(native.manifestHash),'native 来源缺失或不合法');
 if(native.schemaVersion===2)ensure(native.bundleSchemaVersion===2&&hex(native.bundleHash)&&['committed','working-tree','unknown'].includes(native.cliSourceState)&&(!native.cliCommit||/^[a-f0-9]{40}$/.test(native.cliCommit))&&(native.cliSourceState!=='committed'||native.cliCommit),'native v2来源不合法');
 ensure(native.variables&&native.distribution&&hex(native.baselineDigest)&&managedDigest(native.managedFiles)===native.baselineDigest,'native 受管基线摘要不一致');
 validateBindings(root,native);
 return {kind:'native',profile:native.profile,metadataRef:'.yss.json',metadata:native};
}
export function appliedManagedDigest(item){return item?.lastApplied?.digest??item?.contentHash;}

// Consume only after native identity, the lock's physical preflight and its
// canonical content check. Platform groups may be nested without a root SKILL.
export function nativeInstalledSkillRefs(metadata, lock, { platformSkills = [], platformManifests = {} } = {}) {
 const requireContract=(ok,message)=>{if(!ok)throw new TypeError('INSTANCE_DISTRIBUTION: '+message);};
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const sameSet=(left,right)=>left.length===right.length&&[...left].sort().every((value,index)=>value===[...right].sort()[index]);
 const runtimeRoots={codex:'.codex/skills',cursor:'.cursor/skills',pi:'.pi/skills'};
 requireContract(lock?.version===3&&lock.canonicalRoot==='.agents/skills'&&object(lock.skills?.shared)&&object(lock.skills?.platform)&&Array.isArray(lock.projectionRoots),'缺少合法原生 skills-lock 分组合同');
 const roots=lock.projectionRoots,runtimes=metadata.distribution?.runtimes??[];
 requireContract(Array.isArray(runtimes)&&new Set(runtimes).size===runtimes.length&&runtimes.every(runtime=>Object.hasOwn(runtimeRoots,runtime)),'未知或重复运行时声明');
 requireContract(new Set(roots).size===roots.length&&sameSet(roots,runtimes.map(runtime=>runtimeRoots[runtime])),'Skill 平台范围与实例运行时不一致');
 const installed=metadata.distribution?.installedSkills??[];
 requireContract(Array.isArray(installed)&&new Set(installed).size===installed.length&&installed.every(name=>typeof name==='string'&&/^[a-z0-9][a-z0-9-]*$/.test(name)),'未知或重复 installedSkills 声明');
 const shared=lock.skills.shared,platform=lock.skills.platform;
 requireContract(Object.keys(platform).every(root=>roots.includes(root)&&object(platform[root])),'平台 Skill 声明越过所选运行时');
 const declared=[...new Set([...Object.keys(shared),...Object.values(platform).flatMap(group=>Object.keys(group))])];
 requireContract(installed.every(name=>declared.includes(name)),'未知 installedSkills 声明: '+installed.filter(name=>!declared.includes(name)).join(', '));
 requireContract(object(metadata.managedFiles),'缺少原生受管基线');
 const refs=new Set();
 function required(ref) {
  requireContract(Object.hasOwn(metadata.managedFiles,ref),'Skill 缺少必需受管记录: '+ref);
  requireContract(['managed','managed-customizable','generated'].includes(metadata.managedFiles[ref].ownership),'Skill 受管记录不能被豁免: '+ref);
 }
 function members(prefix,requiredRef=null) {
  const entries=Object.entries(metadata.managedFiles).filter(([ref])=>ref.startsWith(prefix+'/'));
  requireContract(entries.length>0,'Skill 缺少必需受管记录: '+prefix);
  if(requiredRef)required(requiredRef);
  for(const [ref,record]of entries){
   // Ordinary project auxiliaries retain the existing ownership exemption.
   // Explicit source and alias entries are checked by required() separately.
   if(['user-owned','protected'].includes(record.ownership))continue;
   requireContract(['managed','managed-customizable','generated'].includes(record.ownership),'Skill 受管记录不能被豁免: '+ref);
   descriptor(record.baseline);descriptor(record.lastApplied);refs.add(ref);
  }
 }
 for(const name of installed){
  if(Object.hasOwn(shared,name)){
   requireContract(object(shared[name])&&Array.isArray(shared[name].targets)&&sameSet(shared[name].targets,['.agents/skills',...roots]),'共享 Skill targets 与运行时不一致: '+name);
   requireContract(!Object.values(platform).some(group=>Object.hasOwn(group,name)),'Skill 不能同时声明为共享及平台专属: '+name);
   for(const root of ['.agents/skills',...roots])members(root+'/'+name,root+'/'+name+'/SKILL.md');
  }else{
   for(const root of roots)if(Object.hasOwn(platform[root]??{},name)){
    const entry=platform[root][name];requireContract(object(entry)&&Array.isArray(entry.targets)&&sameSet(entry.targets,[root]),'平台 Skill targets 不一致: '+root+'/'+name);
    const prefix=root+'/'+name;
    const source=platformSkills.find(skill=>skill.id===name&&skill.root===root);
    requireContract(source&&root==='.codex/skills','未知平台 Skill 来源: '+prefix);
    requireContract(Array.isArray(source.aliases)&&source.aliases.length>0&&source.aliases.every(alias=>typeof alias==='string'&&alias.startsWith(name+':')&&/^[a-z0-9][a-z0-9-]*$/.test(alias.slice(name.length+1))),'平台 Skill 缺少明确注册 alias: '+prefix);
    const manifest=platformManifests[prefix];
    requireContract(object(manifest)&&typeof manifest.skills==='string','平台 Skill 缺少固定 source manifest: '+prefix);
    // The current Codex plugin contract declares a local skills directory. Do
    // not infer an abstract group-root SKILL or follow an undeclared source.
    const directory=manifest.skills.replace(/^\.\//,'').replace(/\/$/,'');
    requireContract(directory&&!path.posix.isAbsolute(directory)&&!directory.includes('\\')&&!/[\x00-\x1f:]/.test(directory)&&!directory.split('/').some(part=>!part||part==='.'||part==='..'),'平台 Skill source 路径越界: '+prefix);
    required(prefix+'/.codex-plugin/plugin.json');
    for(const alias of source.aliases)required(prefix+'/'+directory+'/'+alias.slice(name.length+1)+'/SKILL.md');
    members(prefix);
   }
  }
 }
 return [...refs].sort();
}
