#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseDocument} from './vendor/yaml.mjs';

try {
  const {values}=parseArgs({options:{source:{type:'string'},check:{type:'boolean'},apply:{type:'boolean'}},strict:true});
  if(!!values.check===!!values.apply||values.apply&&!values.source)throw Error('选择 --check，或 --source <固定Spec源码目录> --apply');
  const targetRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const identityDoc=parseDocument(fs.readFileSync(path.join(targetRoot,'yss-project.yaml'),'utf8'),{uniqueKeys:true,maxAliasCount:0});
  const identity=identityDoc.toJS({maxAliasCount:0});
  if(identityDoc.errors.length||identity.schema_version!==1||identity.repository_mode!=='template-source')throw Error('技能准备仅用于 template-source');
  const lock=JSON.parse(fs.readFileSync(path.join(targetRoot,'.template-source/profile-skills-source.json'),'utf8'));
  if(lock.configurationPath!=='.template-source/profile-skill-sync.json')throw Error('技能来源配置路径非法');
  const profileDoc=parseDocument(fs.readFileSync(path.join(targetRoot,'.template-spec/process/harness-profile.yaml'),'utf8'),{uniqueKeys:true,maxAliasCount:0});
  if(profileDoc.errors.length||profileDoc.toJS({maxAliasCount:0}).instantiation?.native_profile!==lock.profile)throw Error('技能来源锁与仓库 Profile 不一致');
  if(values.check&&!values.source){
    if(lock.schemaVersion!==1||!['backend','frontend'].includes(lock.profile)||!Array.isArray(lock.generatedRoots))throw Error('技能来源锁非法');
    const receiptFile=path.join(targetRoot,'.template-source/profile-skills-prepared.json');
    if(!fs.existsSync(receiptFile))throw Error('技能尚未准备；执行 node scripts/prepare-skills --source <固定Spec源码目录> --apply');
    const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
    if(receipt.schemaVersion!==1||receipt.profile!==lock.profile||receipt.skillsDigest!==lock.skillsDigest)throw Error('技能准备回执与来源锁不一致');
    const h=createHash('sha256'),covered=new Set();
    for(const [ref,entry]of Object.entries(receipt.files).sort(([a],[b])=>a<b?-1:a>b?1:0)){
      if(!/^(?:\.agents|\.codex|\.cursor|\.pi)\/skills\/[a-z0-9-]+(?:\/[^\\\x00-\x1f]+)?$/.test(ref)||ref.split('/').some(x=>x==='.'||x==='..'||!x))throw Error('准备回执路径非法');
      const file=path.join(targetRoot,ref),st=fs.lstatSync(file);
      if(entry.kind==='symlink'){
        const expected='../../.agents/skills/'+ref.split('/')[2];
        if(!st.isSymbolicLink()||fs.readlinkSync(file)!==expected||entry.target!==expected||!fs.existsSync(file))throw Error('技能投影链接漂移: '+ref);
      } else {
        if(!lock.generatedRoots.some(root=>ref.startsWith(root+'/'))||fs.realpathSync(file)!==file||!st.isFile())throw Error('生成技能路径漂移: '+ref);
        const bytes=fs.readFileSync(file),digest=createHash('sha256').update(bytes).digest('hex');
        if(digest!==entry.digest||(st.mode&0o777)!==entry.mode)throw Error('生成技能内容或权限漂移: '+ref);
        h.update(ref).update('\0').update(entry.mode.toString(8).padStart(4,'0')).update('\0').update(bytes).update('\0');covered.add(ref);
      }
    }
    const scan=ref=>{const file=path.join(targetRoot,ref),st=fs.lstatSync(file);if(st.isSymbolicLink())throw Error('生成技能包含链接: '+ref);if(st.isDirectory())for(const name of fs.readdirSync(file)){if(name==='__pycache__'||name==='.DS_Store'||/\.(pyc|pyo|iml)$/.test(name))continue;scan(ref+'/'+name);}else if(!covered.has(ref))throw Error('生成技能存在未知文件: '+ref);};
    for(const ref of lock.generatedRoots){
      if(!/^(?:\.agents|\.codex)\/skills\/[a-z0-9-]+$/.test(ref))throw Error('生成根路径非法');scan(ref);
      if(ref.startsWith('.agents/'))for(const runtime of ['.codex','.cursor','.pi']){
        const projected=runtime+'/skills/'+ref.split('/')[2],file=path.join(targetRoot,projected),entry=receipt.files[projected];
        if(!entry||entry.kind!=='symlink'||!fs.lstatSync(file).isSymbolicLink()||fs.realpathSync(file)!==path.join(targetRoot,ref))throw Error('缺少生成技能投影: '+projected);
      }
    }
    if(h.digest('hex')!==lock.skillsDigest)throw Error('生成技能摘要漂移');
    process.stdout.write(JSON.stringify({status:'ok',profile:lock.profile,sourceState:lock.sourceState,written:0,skillsDigest:lock.skillsDigest})+'\n');
    process.exit(0);
  }
  const root=path.resolve(values.source);
  if(fs.realpathSync(root)!==root||fs.lstatSync(root).isSymbolicLink())throw Error('Spec 来源必须是普通真实目录');
  if(lock.schemaVersion!==1||lock.sourceState!=='committed'||!/^[a-f0-9]{40}$/.test(lock.sourceCommit))throw Error('技能来源尚未固定提交；请先固定 Spec 来源并更新来源锁');
  const git=(args)=>{const r=spawnSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:64*1024*1024});if(r.status!==0)throw Error(r.stderr||'固定 Spec 来源核验失败');return r.stdout.trim();};
  if(git(['rev-parse','--show-toplevel'])!==root||git(['rev-parse','HEAD'])!==lock.sourceCommit)throw Error('Spec 来源提交与技能来源锁不一致');
  const sourceIdentity=parseDocument(git(['show',lock.sourceCommit+':yss-project.yaml']),{uniqueKeys:true,maxAliasCount:0});
  const sourcePolicy=JSON.parse(git(['show',lock.sourceCommit+':.template-source/distribution/bundle-profile.json']));
  if(sourceIdentity.errors.length||sourceIdentity.toJS().schema_version!==1||sourceIdentity.toJS().repository_mode!=='template-source'||sourcePolicy.schemaVersion!==1||sourcePolicy.profile!=='spec')throw Error('固定来源身份必须是 Spec template-source');
  const modules=['.template-source/scripts/lib/profile-skills-preparation.mjs','scripts/lib/profile-skill-sync.mjs'];
  for(const ref of modules){
    const file=path.join(root,ref);
    if(fs.realpathSync(file)!==file||!fs.lstatSync(file).isFile())throw Error('Spec 生成工具包含符号链接');
    const r=spawnSync('git',['-C',root,'show',lock.sourceCommit+':'+ref],{encoding:null,maxBuffer:64*1024*1024});
    if(r.status!==0||!r.stdout.equals(fs.readFileSync(file)))throw Error('Spec 生成工具与固定提交不一致');
  }
  if(git(['status','--porcelain=v1','--untracked-files=all','--','yss-project.yaml','.template-source/distribution/bundle-profile.json','.agents/skills','.codex/skills/product-design',lock.configurationPath,'.template-source/profile-skill-patches',...modules]))throw Error('Spec 相关来源含未提交修改');
  const {prepareStandaloneSkills}=await import(pathToFileURL(path.join(root,modules[0])).href);
  const result=prepareStandaloneSkills({root,targetRoot,check:values.check});
  process.stdout.write(JSON.stringify({status:'ok',profile:lock.profile,...result})+'\n');
} catch(error) {process.stderr.write(error.message+'\n');process.exitCode=1;}
