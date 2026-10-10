// Intent metadata is never an approval basis. All original candidate source stays
// current except the exact current feature materials certified by native readonly
// transaction validation. No project-subtree or governance-directory exemption.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseDocument} from '../vendor/yaml.mjs';
import {readProgressionTarget, evaluateProgressionTarget, hasLocalImplementationInputs} from './lifecycle-progression.mjs';
import {canonicalManagedMode} from './drift-report.mjs';
import {inspectMaintenanceCandidate} from './maintenance-candidate.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const contexts=new WeakMap();
const ensure=(ok,message)=>{if(!ok)throw new TypeError(`implementation-candidate: ${message}`);};
const safeRef=ref=>typeof ref==='string'&&ref.length>0&&!path.isAbsolute(ref)&&!/[\\\x00-\x1f\x7f]/.test(ref)&&ref.split('/').every(p=>p&&p!=='.'&&p!=='..'&&p.toLowerCase()!=='.git');
function file(root,ref){ensure(safeRef(ref),'unsafe candidate reference');let current=root;for(const part of ref.split('/')){current=path.join(current,part);const stat=fs.lstatSync(current);ensure(!stat.isSymbolicLink(),'candidate path symlink');}ensure(fs.lstatSync(current).isFile(),'candidate reference not a file');return current;}
function environment(){const result={...process.env};for(const key of Object.keys(result))if(key.startsWith('GIT_'))delete result[key];return {...result,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:os.devNull,GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};}
function git(root,args,{input,env,encoding=null}={}){const result=spawnSync('git',['--no-pager','--no-optional-locks','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','diff.autoRefreshIndex=false',...args],{cwd:root,input,encoding,env:env??environment(),timeout:30000,maxBuffer:512*1024*1024});ensure(!result.error&&!result.signal&&result.status===0,`git ${args[0]} failed: ${result.stderr?.toString().trim()}`);return result.stdout;}
const textGit=(root,args)=>git(root,args,{encoding:'utf8'}).trim();
const nul=bytes=>bytes.toString('utf8').split('\0').filter(Boolean);
const paths=(root,args)=>nul(git(root,[...args,'-z']));
const pathspec=refs=>refs.map(ref=>`:(top,literal,exclude)${ref}`);
function eligibleMaterials({root,projectRoot,assetRef,env}){
 if(!assetRef||fs.realpathSync(root)!==textGit(projectRoot,['rev-parse','--show-toplevel'])||!hasLocalImplementationInputs(root))return {refs:[],observations:[],intent:null};
 const asset=file(root,assetRef),bytes=fs.readFileSync(asset),doc=parseDocument(String(bytes),{uniqueKeys:true,maxAliasCount:0});ensure(!doc.errors.length,'candidate Slice parse');
 const raw=doc.toJS({maxAliasCount:0});const roots=raw.scope?.project_roots??raw.common?.project_roots;
 ensure(Array.isArray(roots)&&roots.some(ref=>typeof ref==='string'&&fs.realpathSync(path.resolve(root,ref))===projectRoot),'candidate project outside bound Slice');
 const intent=readProgressionTarget({root,assetRef,includeDefault:true});
 if(!intent)return {refs:[],observations:[],intent:null};
 const projection=evaluateProgressionTarget({root,assetRef,env:{...(env??process.env),GIT_OPTIONAL_LOCKS:'0'}});const materials=projection.intent_materials;
 ensure(materials?.schema_version===1&&materials.kind==='lifecycle-target-intent-materials'&&materials.root===intent.root&&materials.feature_id===intent.feature_id&&materials.checkpoint_ref===intent.checkpoint_ref&&materials.config_ref===intent.config_ref&&Array.isArray(materials.files)&&Object.keys(materials).every(key=>['schema_version','kind','root','feature_id','checkpoint_ref','config_ref','files'].includes(key)),'CAPABILITY: missing current intent materials');
 const refs=[],observations=[{ref:assetRef,digest:sha(bytes),mode:fs.statSync(asset).mode&0o777}];
 for(const ref of [intent.checkpoint_ref,intent.contract_ref,intent.map_ref,'.yss.json','yss-project.yaml','.template-spec/process/harness-profile.yaml','.template-spec/agents/issue-tracker.md']){const absolute=file(root,ref);observations.push({ref,digest:sha(fs.readFileSync(absolute)),mode:fs.statSync(absolute).mode&0o777});}
 if(intent.config_digest!==null){const absolute=file(root,intent.config_ref),stat=fs.statSync(absolute);ensure('sha256:'+sha(fs.readFileSync(absolute))===intent.config_digest,'intent config stale');refs.push(intent.config_ref);observations.push({ref:intent.config_ref,digest:intent.config_digest.slice(7),mode:stat.mode&0o777});}
 for(const item of materials.files){
  ensure(item&&Object.keys(item).every(k=>['ref','digest','mode'].includes(k))&&safeRef(item.ref)&&(/^\.yss\/transactions\/[a-f0-9]{32}\/(?:plan\.json|journal\.json|intent\.wal|objects\/[a-f0-9]{64})$/.test(item.ref)||item.ref==='.yss/transactions/.lock')&&/^sha256:[a-f0-9]{64}$/.test(item.digest)&&Number.isInteger(item.mode)&&item.mode>=0&&item.mode<=0o777,'invalid target transaction material');
  if(item.ref==='.yss/transactions/.lock')ensure(item.mode===canonicalManagedMode(0o600)&&item.digest==='sha256:'+sha(Buffer.alloc(0))&&materials.files.some(member=>/^\.yss\/transactions\/[a-f0-9]{32}\//.test(member.ref)),'target transaction mutex requires a certified matching archive and empty protocol bytes');
  ensure(!refs.includes(item.ref),'duplicate intent material');const absolute=file(root,item.ref),stat=fs.statSync(absolute);
  ensure(canonicalManagedMode(stat.mode)===item.mode&&(stat.mode&0o7000)===0&&sha(fs.readFileSync(absolute))===item.digest.slice(7),'target transaction material stale');refs.push(item.ref);observations.push({ref:item.ref,digest:item.digest.slice(7),mode:stat.mode&0o777});
 }
 return {refs:refs.sort(),observations,intent};
}
function observationCurrent(context){const c=contexts.get(context);ensure(c,'unverified candidate context');for(const item of c.observations){const absolute=file(c.root,item.ref);ensure(sha(fs.readFileSync(absolute))===item.digest&&(fs.statSync(absolute).mode&0o777)===item.mode,'candidate intent material changed during validation');}return c;}
function packedTree(repositoryRoot,base,diff){
 // Git alone interprets the original full binary patch. Objects/index are private;
 // import only the immutable base tree into that database. Even readonly Git
 // alternates can refresh a source loose object's mtime when writing a matching
 // blob, so no source alternate is exposed to mutation commands.
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yss-candidate-index-'));
 try{
  git(temp,['init','--bare','-q',temp]);
  const env={...environment(),GIT_DIR:temp,GIT_INDEX_FILE:path.join(temp,'candidate.index'),GIT_OBJECT_DIRECTORY:path.join(temp,'objects')};
  const baseTree=textGit(repositoryRoot,['rev-parse',`${base}^{tree}`]);
  const pack=git(repositoryRoot,['pack-objects','--stdout','--revs'],{input:Buffer.from(baseTree+'\n')});
  git(temp,['index-pack','--stdin'],{env,input:pack});
  git(temp,['read-tree',baseTree],{env});if(diff.length)git(temp,['apply','--cached','--binary','--whitespace=nowarn','-'],{env,input:diff});
  const tree=git(temp,['write-tree'],{env,encoding:'utf8'}).trim();
  // Keep both derived trees in the same private database for the comparison.
  return {temp,env,tree,baseTree};
 }catch(error){fs.rmSync(temp,{recursive:true,force:true});throw error;}
}
function trackedCurrent(c,original){
 const current=git(c.repositoryRoot,['diff','--no-ext-diff','--no-textconv','--binary','--full-index',original.manifest.merge_base]);
 if(current.equals(original.trackedDiff))return;
 ensure(c.refs.length,'tracked candidate stale');
 const privateGit=packedTree(c.repositoryRoot,original.manifest.merge_base,original.trackedDiff);
 try{
  git(privateGit.temp,['read-tree',privateGit.baseTree],{env:privateGit.env});
  if(current.length)git(privateGit.temp,['apply','--cached','--binary','--whitespace=nowarn','-'],{env:privateGit.env,input:current});
  const tree=git(privateGit.temp,['write-tree'],{env:privateGit.env,encoding:'utf8'}).trim();
  ensure(!git(privateGit.temp,['diff','--no-ext-diff','--no-textconv','--name-only','-z',privateGit.tree,tree,'--',...pathspec(c.refs)],{env:privateGit.env}).length,'tracked candidate stale outside current intent');
 }finally{fs.rmSync(privateGit.temp,{recursive:true,force:true});}
}
function untrackedCurrent(c,original){
 // Packed inventory names are relative to the captured project. Git's tracked
 // patch and this complete current inventory remain relative to the Git root.
 // Derive that single known prefix without rewriting the original packed bytes.
 const prefix=path.relative(c.repositoryRoot,c.projectRoot).split(path.sep).join('/');
 ensure(prefix===''||safeRef(prefix),'candidate project outside repository');
 const repositoryRef=ref=>{ensure(safeRef(ref),'unsafe packed candidate path');return prefix?prefix+'/'+ref:ref;};
 const legacyExclusions=original?.manifest.excluded_paths??[];
 ensure(legacyExclusions.every(ref=>safeRef(ref)&&ref.startsWith('.template-source/evidence/maintenance/')),'candidate exclusions must be legacy evidence only');
 const exclusions=legacyExclusions.map(repositoryRef);
 const included=ref=>!c.refs.includes(ref)&&!exclusions.some(p=>ref===p||ref.startsWith(p+'/'));
 const actual=paths(c.repositoryRoot,['ls-files','--others','--exclude-standard']).filter(included).sort();
 const entries=(original?.entries??[]).map(entry=>({entry,ref:repositoryRef(entry.path)})).filter(item=>included(item.ref));
 ensure(JSON.stringify(actual)===JSON.stringify(entries.map(item=>item.ref).sort()),'untracked candidate inventory stale');
 for(const {entry,ref} of entries){const absolute=path.join(c.repositoryRoot,ref),stat=fs.lstatSync(absolute);ensure(stat.mode===entry.mode&&(entry.kind==='symlink'?stat.isSymbolicLink():stat.isFile()),`untracked candidate mode/kind stale: ${ref}`);const bytes=entry.kind==='symlink'?Buffer.from(fs.readlinkSync(absolute)):fs.readFileSync(file(c.repositoryRoot,ref));ensure(bytes.equals(entry.content),`untracked candidate stale: ${ref}`);}
}
function checkCurrent(c,input,original){
 if(input.review_mode==='committed'){
  ensure(/^[a-f0-9]{40}$/.test(input.implementation_candidate_ref),'candidate commit must be immutable');const tree=textGit(c.repositoryRoot,['rev-parse',`${input.implementation_candidate_ref}^{tree}`]);ensure(tree===input.candidate_digest,'committed candidate digest mismatch');
  for(const refs of [[input.implementation_candidate_ref,'HEAD'],['--cached',input.implementation_candidate_ref],[input.implementation_candidate_ref]])ensure(!git(c.repositoryRoot,['diff','--no-ext-diff','--no-textconv','--binary','--full-index',...refs,'--',...pathspec(c.refs)]).length,'committed candidate is not current outside intent');untrackedCurrent(c);
 }else{ensure(input.review_mode==='worktree','unsupported candidate mode');ensure(original.manifest.candidate_digest===input.candidate_digest,'snapshot digest mismatch');trackedCurrent(c,original);untrackedCurrent(c,original);}
}
/** Call only after the original Slice/project approval is consumed. No caller exclusions. */
export function inspectImplementationCandidate(input,{root,projectRoot,assetRef=input?.slice_contract_ref,env}={}){
 root=fs.realpathSync(root);projectRoot=fs.realpathSync(projectRoot);const repositoryRoot=textGit(projectRoot,['rev-parse','--show-toplevel']);
 const original=input.review_mode==='worktree'?inspectMaintenanceCandidate({manifestPath:file(projectRoot,input.candidate_snapshot_ref),root:projectRoot}):null;
 const c={root,projectRoot,repositoryRoot,input:structuredClone(input),original,refs:[],observations:[],intent:null};
 // Keep unchanged and ordinary external repositories on their existing strict route.
 try{checkCurrent(c,input,original);}catch(error){Object.assign(c,eligibleMaterials({root,projectRoot,assetRef,env}));checkCurrent(c,input,original);}
 const context=Object.freeze({});contexts.set(context,c);observationCurrent(context);return context;
}
export function candidateSourceCommit(context){const c=observationCurrent(context);return c.refs.length&&c.input.review_mode==='committed'?c.input.implementation_candidate_ref:textGit(c.repositoryRoot,['rev-parse','HEAD']);}
export function candidateChangedPaths(context,comparisonRef,recorded=[]){
 const c=observationCurrent(context);ensure(/^[a-f0-9]{40}$/.test(comparisonRef),'comparison commit required');const prefix=path.relative(c.repositoryRoot,c.projectRoot).split(path.sep).join('/');
 // Coverage retains its original spellings: tracked names are Git-root relative,
 // while ls-files from the project emits project-relative untracked names. The
 // full-repository candidate guard independently checks every outside input.
 let tracked;
 if(c.input.review_mode==='committed')tracked=paths(c.repositoryRoot,['diff','--no-ext-diff','--no-textconv','--name-only',comparisonRef,c.input.implementation_candidate_ref]);
 else{
  const original=packedTree(c.repositoryRoot,c.original.manifest.merge_base,c.original.trackedDiff);
  try{ensure(comparisonRef===c.original.manifest.merge_base,'worktree coverage comparison must bind original merge-base');tracked=nul(git(original.temp,['diff','--no-ext-diff','--no-textconv','--name-only','-z',original.baseTree,original.tree],{env:original.env}));}
  finally{fs.rmSync(original.temp,{recursive:true,force:true});}
 }
 tracked=tracked.filter(ref=>!c.refs.includes(ref));
 const untracked=paths(c.projectRoot,['ls-files','--others','--exclude-standard']).filter(ref=>!c.refs.includes(prefix?prefix+'/'+ref:ref));
 const original=recorded.filter(ref=>c.refs.includes(ref)||(prefix&&c.refs.includes(prefix+'/'+ref)));
 return [...new Set([...tracked,...untracked,...original])].sort();
}
export function candidateHasIntentMaterial(context,projectRelativeRef){const c=observationCurrent(context);const ref=path.relative(c.repositoryRoot,path.resolve(c.projectRoot,projectRelativeRef)).split(path.sep).join('/');return c.refs.includes(ref);}
export function candidateCoverageSource(context,recordedSource){const c=observationCurrent(context);if(!c.refs.length)return textGit(c.repositoryRoot,['rev-parse','HEAD']);const source=c.input.review_mode==='committed'?c.input.implementation_candidate_ref:recordedSource;ensure(/^[a-f0-9]{40}$/.test(source),'recorded coverage source commit required');ensure(!git(c.repositoryRoot,['diff','--no-ext-diff','--no-textconv','--name-only','-z',source,'HEAD','--',...pathspec(c.refs)]).length,'coverage source HEAD stale outside intent');return source;}
/** Architecture baseline may have implementation changes; only HEAD movement is exempt. */
export function inspectCandidateBaseCommit({root,projectRoot,assetRef,baseCommit,env}={}){
 root=fs.realpathSync(root);projectRoot=fs.realpathSync(projectRoot);const repositoryRoot=textGit(projectRoot,['rev-parse','--show-toplevel']);
 const c={root,projectRoot,repositoryRoot,refs:[],observations:[],intent:null};
 if(textGit(repositoryRoot,['rev-parse','HEAD'])!==baseCommit){Object.assign(c,eligibleMaterials({root,projectRoot,assetRef,env}));ensure(c.refs.length&&!git(repositoryRoot,['diff','--no-ext-diff','--no-textconv','--name-only','-z',baseCommit,'HEAD','--',...pathspec(c.refs)]).length,'candidate base commit stale outside intent');}
 else if(assetRef&&root===repositoryRoot&&git(repositoryRoot,['status','--porcelain']).length&&hasLocalImplementationInputs(root))Object.assign(c,eligibleMaterials({root,projectRoot,assetRef,env}));
 const context=Object.freeze({});contexts.set(context,c);observationCurrent(context);return context;
}

// Preserve original coverage rows only for native-certified intent materials; the
// original coverage byte digest is verified by its review-input consumer.
export function candidateCoverageInventory(context,current,recorded){
 observationCurrent(context);if(!contexts.get(context).refs.length)return current;ensure(Array.isArray(recorded),'original coverage inventory required');
 const map=new Map(current.filter(row=>!candidateHasIntentMaterial(context,row.path)).map(row=>[row.path,row]));
 for(const row of recorded)if(candidateHasIntentMaterial(context,row.path))map.set(row.path,row);
 return [...map.values()].sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
