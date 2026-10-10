import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {composeProfileSkills, loadProfileSyncConfig} from '../../../scripts/lib/profile-skill-sync.mjs';

export const SKILL_SOURCE_LOCK='.template-source/profile-skills-source.json';
const receiptRef='.template-source/profile-skills-prepared.json';
const configRef='.template-source/profile-skill-sync.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const fail=message=>{throw new TypeError(message);};
const present=file=>{try{return fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}};

function safe(root,ref,leafLink=false) {
  if(typeof ref!=='string'||!ref||path.isAbsolute(ref)||ref.split('/').some(x=>!x||x==='.'||x==='..')||/[\\\x00-\x1f]/.test(ref))fail('不安全技能路径: '+ref);
  let file=root;
  for(const [i,part] of ref.split('/').entries()){
    file=path.join(file,part);
    if(present(file)?.isSymbolicLink()&&(!leafLink||i!==ref.split('/').length-1))fail('技能路径包含符号链接: '+ref);
  }
  return file;
}
function state(file) {
  const info=present(file);
  if(!info)return null;
  if(info.isSymbolicLink())return {kind:'symlink',target:fs.readlinkSync(file)};
  if(!info.isFile())fail('技能目标不是普通文件: '+file);
  const content=fs.readFileSync(file);
  return {kind:'file',mode:info.mode&0o777,digest:hash(content),content};
}
const descriptor=entry=>entry?.kind==='file'?{kind:'file',mode:entry.mode,digest:entry.digest??hash(entry.content)}:entry;
const equal=(a,b)=>JSON.stringify(descriptor(a))===JSON.stringify(descriptor(b));
const fileEntry=({content,mode})=>({kind:'file',content,mode,digest:hash(content)});

export function skillCompositionDigest(view) {
  const h=createHash('sha256');
  for(const [ref,{content,mode}] of [...view].sort(([a],[b])=>a<b?-1:a>b?1:0))h.update(ref).update('\0').update(mode.toString(8).padStart(4,'0')).update('\0').update(content).update('\0');
  return h.digest('hex');
}
export function sharedSkillRoots(definition) {
  return [...(definition.exact??[]),...(definition.adapted??[])].map(x=>x.target??`.agents/skills/${x.id}`);
}
function projectionLinks(definition) {
  const result=new Map();
  for(const ref of sharedSkillRoots(definition)) {
    if(!/^\.agents\/skills\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref)){
      if(!/^\.codex\/skills\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref))fail('不支持的生成技能目录: '+ref);
      continue;
    }
    const id=ref.split('/')[2];
    for(const runtime of ['.codex','.cursor','.pi'])result.set(`${runtime}/skills/${id}`,{kind:'symlink',target:`../../.agents/skills/${id}`});
  }
  return result;
}
function walk(root,ref,output) {
  const file=safe(root,ref,true),info=present(file);
  if(!info)return;
  if(info.isDirectory())for(const name of fs.readdirSync(file)){
    if(name==='__pycache__'||name==='.DS_Store'||/\.(pyc|pyo|iml)$/.test(name))continue;
    walk(root,ref+'/'+name,output);
  }
  else output.add(ref);
}

export function planSkillPreparation({root,targetRoot,config,profile,sourceLock}) {
  root=path.resolve(root);targetRoot=path.resolve(targetRoot);
  if(present(targetRoot)?.isSymbolicLink())fail('目标根不能是符号链接');
  const definition=config.profiles[profile],view=composeProfileSkills({root,config,profile});
  const compositionDigest=skillCompositionDigest(view);
  if(sourceLock&&(sourceLock.profile!==profile||sourceLock.skillsDigest!==compositionDigest||sourceLock.configurationHash!==hash(fs.readFileSync(path.join(root,configRef)))))fail('技能来源锁与生成结果不匹配');
  const desired=new Map([...view].map(([ref,entry])=>[ref,fileEntry(entry)]));
  for(const pair of projectionLinks(definition))desired.set(...pair);
  const receiptFile=safe(targetRoot,receiptRef),prior=present(receiptFile)?JSON.parse(fs.readFileSync(receiptFile)):null;
  if(prior&&(prior.schemaVersion!==1||prior.profile!==profile||!prior.files))fail('技能准备回执非法');
  const roots=sharedSkillRoots(definition),owned=new Set(desired.keys());
  for(const ref of Object.keys(prior?.files??{})){
    // Never let an edited receipt claim profile-local or unrelated assets.
    if(!roots.some(r=>ref.startsWith(r+'/'))&&!projectionLinks(definition).has(ref))fail('准备回执越过当前技能范围: '+ref);
    owned.add(ref);
  }
  for(const ref of roots)walk(targetRoot,ref,owned);
  for(const ref of projectionLinks(definition).keys()){
    const info=present(safe(targetRoot,ref,true));
    if(info?.isDirectory())walk(targetRoot,ref,owned);
  }
  const changes=[],issues=[];
  for(const ref of [...owned].sort()){
    const before=state(safe(targetRoot,ref,true)),after=desired.get(ref)??null;
    if(equal(before,after))continue;
    if(before&&!equal(before,prior?.files?.[ref]??null))issues.push({path:ref,message:'生成技能已修改或目标被未知内容占用'});
    else changes.push({path:ref,before,after});
  }
  const receipt=json({schemaVersion:1,profile,skillsDigest:compositionDigest,files:Object.fromEntries([...desired].map(([ref,entry])=>[ref,descriptor(entry)]))});
  const beforeReceipt=state(receiptFile),afterReceipt=fileEntry({content:receipt,mode:0o644});
  if(!equal(beforeReceipt,afterReceipt))changes.push({path:receiptRef,before:beforeReceipt,after:afterReceipt});
  return {targetRoot,profile,view,skillsDigest:compositionDigest,changes,issues};
}
export function applySkillPreparation(plan,{write=fs.writeFileSync}={}) {
  if(plan.issues.length)fail('技能准备冲突: '+plan.issues.map(x=>x.path).join(', '));
  // Reobserve every input before writing, including a previously missing target.
  for(const change of plan.changes)if(!equal(state(safe(plan.targetRoot,change.path,true)),change.before))fail('技能准备预览后发生变化: '+change.path);
  const touched=[],created=[];
  const put=(ref,entry,useWrite)=>{
    const file=safe(plan.targetRoot,ref,true);
    if(present(file))fs.unlinkSync(file);
    if(!entry)return;
    let dir=path.dirname(file);const missing=[];
    while(!present(dir)){missing.push(dir);dir=path.dirname(dir);}
    fs.mkdirSync(path.dirname(file),{recursive:true});created.push(...missing.reverse());
    if(entry.kind==='symlink')fs.symlinkSync(entry.target,file,'dir');
    else {useWrite(file,entry.content,{mode:entry.mode});fs.chmodSync(file,entry.mode);}
  };
  try {
    for(const change of plan.changes){touched.push(change);put(change.path,change.after,write);}
  } catch(error) {
    for(const change of touched.reverse())put(change.path,change.before,fs.writeFileSync);
    for(const dir of [...new Set(created)].reverse())if(present(dir)?.isDirectory()&&fs.readdirSync(dir).length===0)fs.rmdirSync(dir);
    throw error;
  }
  return {written:plan.changes.length,skillsDigest:plan.skillsDigest};
}

export function makeSkillSourceLock({root,config,profile}) {
  const revision=spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'});
  if(revision.status!==0||!/^[a-f0-9]{40}$/.test(revision.stdout.trim()))fail('Spec 来源提交不可读');
  const refs=['.agents/skills','.codex/skills/product-design',configRef,'.template-source/profile-skill-patches','scripts/lib/profile-skill-sync.mjs','.template-source/scripts/lib/profile-skills-preparation.mjs'];
  const status=spawnSync('git',['-C',root,'status','--porcelain=v1','--untracked-files=all','--',...refs],{encoding:'utf8',maxBuffer:64*1024*1024});
  if(status.status!==0)fail('Spec 来源状态不可读');
  return {schemaVersion:1,profile,sourceCommit:revision.stdout.trim(),sourceState:status.stdout?'working-tree':'committed',configurationPath:configRef,configurationHash:hash(fs.readFileSync(path.join(root,configRef))),skillsDigest:skillCompositionDigest(composeProfileSkills({root,config,profile})),generatedRoots:sharedSkillRoots(config.profiles[profile])};
}
export function prepareStandaloneSkills({root,targetRoot,check}) {
  const lock=JSON.parse(fs.readFileSync(safe(targetRoot,SKILL_SOURCE_LOCK)));
  if(lock.schemaVersion!==1||lock.sourceState!=='committed')fail('技能来源尚未固定提交；请先固定 Spec 来源并更新来源锁');
  const config=loadProfileSyncConfig(root),plan=planSkillPreparation({root,targetRoot,config,profile:lock.profile,sourceLock:lock});
  if(plan.issues.length)fail('技能准备冲突: '+plan.issues.map(x=>x.path).join(', '));
  if(check&&plan.changes.length)fail('技能尚未准备或已漂移；执行 node scripts/prepare-skills --source <固定Spec源码目录> --apply');
  return check?{written:0,skillsDigest:plan.skillsDigest}:applySkillPreparation(plan);
}
