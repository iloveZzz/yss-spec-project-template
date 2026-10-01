import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {viewContract} from './contract-views.mjs';
import {readFileSync,existsSync,withValidationPhase,validationDependencies} from './validation-phase.mjs';
import {safe,hash,ROOT,schema} from './strategic-handoff-io.mjs';
import {parseSliceYaml} from './slice-contract.mjs';
import {READING_POLICY,readingPolicy,managedReading,readingLocation} from './reading-view-policy.mjs';
const json=value=>JSON.stringify(value,null,2)+'\n';
const BEGIN='<!-- YSS-READING:BEGIN -->',END='<!-- YSS-READING:END -->';
const kinds={'artifact.domain-strategy':'domain-strategy',domain_strategy:'domain-strategy','domain-strategy':'domain-strategy','artifact.stage-decision-package':'stage-decision-package',stage_decision:'stage-decision-package','stage-decision-package':'stage-decision-package'};
const bytes=(root,ref)=>{const file=safe(root,ref,{missing:true});return existsSync(file)?readFileSync(file):null;};
const descriptor=(root,ref)=>{const b=bytes(root,ref);return b===null?null:hash(b);};
function identity(root){const id=parseSliceYaml(bytes(root,'yss-project.yaml'));if(id?.schema_version!==1||id.repository_mode!=='project-instance')throw Error('reading-project-instance-required');}
function toolClosure(){
 const found=new Map();
 const visit=ref=>{if(found.has(ref))return;const file=safe(ROOT,ref),content=readFileSync(file);found.set(ref,hash(content));
  if(/\.(mjs|js)$/.test(ref))for(const match of content.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(path.posix.normalize(path.posix.join(path.posix.dirname(ref),match[1])));
 };
 for(const ref of ['scripts/lib/reading-view-bundle.mjs','scripts/contract'])visit(ref);
 return Object.fromEntries([...found].sort(([a],[b])=>a.localeCompare(b)));
}
function navigation(text){
 const starts=text.split(BEGIN).length-1,ends=text.split(END).length-1;
 if(!starts&&!ends)return {manual:text,block:null};
 if(starts!==1||ends!==1||text.indexOf(END)<text.indexOf(BEGIN))throw Error('reading-navigation-marker-conflict');
 const a=text.indexOf(BEGIN),b=text.indexOf(END)+END.length;
 return {manual:text.slice(0,a)+text.slice(b),block:text.slice(a,b),a,b};
}
function build(root,checkpoint){
 return withValidationPhase({root,purpose:'reading-bundle',readOnly:true},()=>{
  identity(root);readingPolicy(root);
  if(!bytes(root,'CONTEXT.md'))throw Error('reading-context-required');
  const loc=readingLocation(checkpoint),raw=parseSliceYaml(bytes(root,checkpoint)),assets=[{ref:checkpoint,kind:'checkpoint'}],seen=new Set();
  for(const [key,value]of Object.entries(raw.artifacts||{})){
   const kind=kinds[key];if(!kind)continue;
   const ref=typeof value==='string'?value:value?.ref;
   if(!ref){if(['missing','not-applicable'].includes(value?.status))continue;throw Error(`reading-artifact-ref-required: ${key}`);}
   if(seen.has(kind))throw Error(`reading-artifact-duplicate: ${kind}`);seen.add(kind);assets.push({ref,kind});
  }
  const outputs={},diagnostics=[],referenceBindings=[];
  const bindReferences=(value,key='')=>{
   if(typeof value==='string'&&(/^(ref|.*_ref|evidence_refs)$/.test(key))&&(/^(docs\/|\.template-spec\/|CONTEXT\.md)/.test(value))){
    const ref=value.split('#')[0];
    if(ref.startsWith(loc.directory+'/')||ref===loc.base+'/map.md')throw Error('reading-self-dependency');
    referenceBindings.push({scope:'project',ref,digest:descriptor(root,ref)});
   }else if(value&&typeof value==='object')for(const [child,v]of Object.entries(value))bindReferences(v,Array.isArray(value)?key:child);
  };
  bindReferences(raw);
  for(const asset of assets){
   bindReferences(parseSliceYaml(bytes(root,asset.ref)));
   const view=viewContract(asset.ref,{root,kind:asset.kind});
   bindReferences(view.presentation);
   diagnostics.push(...view.blockers.map(reason=>({ref:asset.ref,reason})));
   const name=asset.kind==='checkpoint'?'status':asset.kind;
   outputs[`${loc.directory}/${name}.review.md`]=view.markdown;
  }
  const block=[BEGIN,'## 阅读导航','',...Object.keys(outputs).map(ref=>`- [${path.posix.basename(ref)}](./${path.posix.relative(loc.base,ref)})`),'','以上为来源快照；提交审阅或交接前运行 `scripts/contract check-views --checkpoint '+checkpoint+'`。',END].join('\n');
  const renderer=toolClosure();
  readFileSync(safe(ROOT,'.template-spec/process/schemas/reading-manifest.schema.json'));
  const dependencies=validationDependencies().files.map(row=>{
   const local=path.relative(root,row.file);return !local.startsWith('..')&&!path.isAbsolute(local)?{scope:'project',ref:local,digest:'sha256:'+row.digest}:{scope:'tool',ref:path.relative(ROOT,row.file),digest:'sha256:'+row.digest};
  }).sort((a,b)=>(a.scope+a.ref).localeCompare(b.scope+b.ref));
  for(const row of referenceBindings)if(!dependencies.some(item=>item.scope===row.scope&&item.ref===row.ref))dependencies.push(row);
  // A missing policy is also an input; adding one invalidates the previous package.
  if(!dependencies.some(row=>row.scope==='project'&&row.ref===READING_POLICY))dependencies.push({scope:'project',ref:READING_POLICY,digest:null});
  const manifest={schema_version:1,checkpoint_ref:checkpoint,renderer,dependencies,outputs:Object.fromEntries(Object.entries(outputs).map(([ref,text])=>[ref,hash(text)])),navigation:{ref:`${loc.base}/map.md`,block_digest:hash(block)},diagnostics};
  schema(manifest,'.template-spec/process/schemas/reading-manifest.schema.json');
  return {loc,outputs,block,manifest};
 });
}
function oldManifest(root,loc){
 const value=bytes(root,`${loc.directory}/.manifest.json`);if(!value)return null;
 try{const m=JSON.parse(value);if(m.schema_version!==1||!m.outputs||!m.navigation||typeof m.outputs!=='object')throw Error();
  for(const ref of Object.keys(m.outputs))if(!new RegExp(`^${loc.directory.replaceAll('.','\\.')}/(?:domain-strategy|stage-decision-package|status)\\.review\\.md$`).test(ref))throw Error();
  if(m.navigation.ref!==`${loc.base}/map.md`)throw Error();return m;
 }catch{throw Error('reading-manifest-invalid: preserve files; restore last valid manifest before rebuilding');}
}
function changesFor(root,built){
 const old=oldManifest(root,built.loc),changes=[],mapRef=built.manifest.navigation.ref,mapBytes=bytes(root,mapRef),currentMap=mapBytes?.toString('utf8')||'',nav=navigation(currentMap);
 for(const [ref,text]of Object.entries(built.outputs)){
  const before=bytes(root,ref);if(before&&(!old?.outputs[ref]||hash(before)!==old.outputs[ref]))throw Error(`reading-output-conflict: ${ref}`);
  if(!before||before.toString('utf8')!==text)changes.push({ref,before:before?.toString('base64')??null,after:Buffer.from(text).toString('base64')});
 }
 for(const ref of Object.keys(old?.outputs||{}))if(!Object.hasOwn(built.outputs,ref))throw Error(`reading-retired-output-needs-review: ${ref}`);
 if(nav.block&&(!old||hash(nav.block)!==old.navigation.block_digest))throw Error(`reading-output-conflict: ${mapRef}`);
 const nextMap=nav.block?currentMap.slice(0,nav.a)+built.block+currentMap.slice(nav.b):currentMap+(currentMap.endsWith('\n')?'':'\n')+'\n'+built.block+'\n';
 if(nextMap!==currentMap)changes.push({ref:mapRef,before:mapBytes?.toString('base64')??null,after:Buffer.from(nextMap).toString('base64')});
 const manifestRef=`${built.loc.directory}/.manifest.json`,before=bytes(root,manifestRef),after=json(built.manifest);
 if(before?.toString('utf8')!==after)changes.push({ref:manifestRef,before:before?.toString('base64')??null,after:Buffer.from(after).toString('base64')});
 return changes;
}
function verifyInputs(root,built){
 for(const row of built.manifest.dependencies)if(descriptor(row.scope==='project'?root:ROOT,row.ref)!==row.digest)throw Error(`reading-input-drift: ${row.ref}`);
 if(json(toolClosure())!==json(built.manifest.renderer))throw Error('reading-renderer-drift');
}
function atomic(root,ref,value){const file=safe(root,ref,{missing:true});fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${randomUUID()}`;try{fs.writeFileSync(tmp,value,{flag:'wx',mode:fs.existsSync(file)?fs.statSync(file).mode&0o777:0o644});safe(root,ref,{missing:true});fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
function same(root,ref,encoded){const current=bytes(root,ref);return encoded===null?current===null:current!==null&&hash(current)===hash(Buffer.from(encoded,'base64'));}
function recover(root,loc){
 const ref=`${loc.directory}/.transaction.json`,content=bytes(root,ref);if(!content)return;
 const journal=JSON.parse(content);
 if(journal.schema_version!==1||!Array.isArray(journal.changes))throw Error('reading-recovery-journal-invalid');
 for(const c of journal.changes){if(![`${loc.base}/map.md`,`${loc.directory}/.manifest.json`,...['domain-strategy','stage-decision-package','status'].map(k=>`${loc.directory}/${k}.review.md`)].includes(c.ref)||!(c.before===null||typeof c.before==='string')||typeof c.after!=='string')throw Error('reading-recovery-journal-invalid');}
 const conflicts=[];
 for(const c of [...journal.changes].reverse()){
  if(same(root,c.ref,c.before))continue;
  if(!same(root,c.ref,c.after)){conflicts.push(c.ref);continue;}
  if(c.before===null)fs.unlinkSync(safe(root,c.ref));else atomic(root,c.ref,Buffer.from(c.before,'base64'));
 }
 if(conflicts.length)throw Error(`reading-recovery-conflict: ${conflicts.join(', ')}`);
 fs.unlinkSync(safe(root,ref));
}
function locked(root,loc,action){
 const lockRef=`${loc.directory}/${loc.lock_name||'.lock'}`,file=safe(root,lockRef,{missing:true});fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file)){
  const old=fs.readFileSync(file);let pid;try{pid=JSON.parse(old).pid;if(!Number.isInteger(pid)||pid<=0)throw Error();}catch{throw Error('reading-lock-invalid');}
  try{process.kill(pid,0);throw Error('reading-busy');}catch(error){if(error.code!=='ESRCH')throw error;}
  const recoveryLock=safe(root,`${lockRef}.recovery`,{missing:true});
  fs.writeFileSync(recoveryLock,String(process.pid),{flag:'wx'});
  try{if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==hash(old))throw Error('reading-busy');fs.unlinkSync(file);}
  finally{fs.unlinkSync(recoveryLock);}
 }
 const token=json({pid:process.pid,token:randomUUID()});fs.writeFileSync(file,token,{flag:'wx'});
 try{if(loc.recover!==false)recover(root,loc);return action();}finally{if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===token)fs.unlinkSync(file);}
}
export function renderReadingBundle(root,checkpoint,{afterWrite}={}){
 root=path.resolve(root);identity(root);const loc=readingLocation(checkpoint);
 return locked(root,loc,()=>{
  const built=build(root,checkpoint),changes=changesFor(root,built);verifyInputs(root,built);
  if(!changes.length)return {status:'unchanged',checkpoint_ref:checkpoint,diagnostics:built.manifest.diagnostics};
  const journalRef=`${loc.directory}/.transaction.json`;
  atomic(root,journalRef,json({schema_version:1,changes}));
  try{
   for(const [index,c]of changes.entries()){
    verifyInputs(root,built);if(!same(root,c.ref,c.before))throw Error(`reading-output-conflict: ${c.ref}`);
    atomic(root,c.ref,Buffer.from(c.after,'base64'));afterWrite?.(c,index+1);
   }
   verifyInputs(root,built);
   for(const c of changes)if(!same(root,c.ref,c.after))throw Error(`reading-output-conflict: ${c.ref}`);
   fs.unlinkSync(safe(root,journalRef));
   return {status:'rendered',checkpoint_ref:checkpoint,changed_refs:changes.map(c=>c.ref),diagnostics:built.manifest.diagnostics};
  }catch(error){try{recover(root,loc);}catch(recovery){throw Error(`${error.message}; ${recovery.message}`);}throw error;}
 });
}
export function checkReadingViews(root,checkpoint,{required=false}={}){
 identity(root);const enabled=managedReading(root,checkpoint);
 if(!required&&!enabled)return {status:'manual',read_only:true,execution_allowed:false,blockers:[]};
 try{
  const loc=readingLocation(checkpoint);
  if(bytes(root,`${loc.directory}/.transaction.json`)||bytes(root,`${loc.directory}/.lock`))throw Error('reading-update-incomplete');
  const expected=build(root,checkpoint),actual=oldManifest(root,loc),reasons=[];
  if(!actual||json(actual)!==json(expected.manifest))reasons.push('reading-manifest-stale');
  for(const [ref,digest]of Object.entries(expected.manifest.outputs))if(descriptor(root,ref)!==digest)reasons.push(`reading-output-stale: ${ref}`);
  if(hash(navigation(bytes(root,expected.manifest.navigation.ref)?.toString('utf8')||'').block||'')!==expected.manifest.navigation.block_digest)reasons.push('reading-navigation-stale');
  verifyInputs(root,expected);
  return {status:reasons.length?'stale':'current',read_only:true,execution_allowed:false,approval_validity:'not-checked',blockers:reasons,diagnostics:expected.manifest.diagnostics,recovery:`scripts/contract render --checkpoint ${checkpoint}`};
 }catch(error){return {status:'stale',read_only:true,execution_allowed:false,blockers:[error.message],recovery:`scripts/contract render --checkpoint ${checkpoint}`};}
}
export function planEnableReading(root,checkpoint){
 identity(root);root=path.resolve(root);const built=build(root,checkpoint),changes=changesFor(root,built),policy=readingPolicy(root);
 const nextPolicy={...policy,mode:'managed',checkpoints:[...new Set([...policy.checkpoints,checkpoint])].sort()};
 const payload={schema_version:1,kind:'reading-enable-plan',root,checkpoint_ref:checkpoint,policy_before:descriptor(root,READING_POLICY),policy_after:nextPolicy,dependencies:built.manifest.dependencies,renderer:built.manifest.renderer,outputs_before:Object.fromEntries([...Object.keys(built.outputs),built.manifest.navigation.ref,`${built.loc.directory}/.manifest.json`].map(ref=>[ref,descriptor(root,ref)])),preview:changes.map(c=>({ref:c.ref,before_digest:c.before===null?null:hash(Buffer.from(c.before,'base64')),after:Buffer.from(c.after,'base64').toString('utf8')}))};
 return {...payload,plan_id:hash(json(payload))};
}
function applyEnableReadingLocked(root,plan){
 const {plan_id,...payload}=plan;if(plan.kind!=='reading-enable-plan'||plan.root!==path.resolve(root)||hash(json(payload))!==plan_id)throw Error('reading-enable-plan-invalid');
 const policy=readingPolicy(root);
 if(json(policy)===json(plan.policy_after)&&checkReadingViews(root,plan.checkpoint_ref).status==='current')return {status:'unchanged'};
 const current=planEnableReading(root,plan.checkpoint_ref);if(json(current)!==json(plan))throw Error('reading-enable-plan-stale');
 const before=bytes(root,READING_POLICY);atomic(root,READING_POLICY,json(plan.policy_after));
 try{return {status:'enabled',reading_update:renderReadingBundle(root,plan.checkpoint_ref)};}
 catch(error){if(descriptor(root,READING_POLICY)===hash(json(plan.policy_after))){if(before===null)fs.unlinkSync(safe(root,READING_POLICY));else atomic(root,READING_POLICY,before);}throw error;}
}
export function finalizeReading(root,checkpoint,sourceOperation){
 try{if(!managedReading(root,checkpoint))return {...sourceOperation,source_operation:sourceOperation.status,reading_update:{status:'manual'}};
  return {...sourceOperation,source_operation:sourceOperation.status,reading_update:renderReadingBundle(root,checkpoint)};
 }catch(error){return {...sourceOperation,source_operation:sourceOperation.status,reading_update:{status:'failed',error:error.message,recovery:`scripts/contract render --checkpoint ${checkpoint}`}};}
}
export function readingCheckpointsForAsset(root,ref,kind){
 if(!['domain-strategy','stage-decision-package','checkpoint','tracking-migration'].includes(kind))return [];
 const policy=readingPolicy(root);if(policy.mode!=='managed')return [];
 return policy.checkpoints.filter(checkpoint=>ref.startsWith(readingLocation(checkpoint).base+'/'));
}
export function assertReadingTransition(root,decisionState,currentWorkUnit){
 const ref=decisionState?.checkpoint_ref||decisionState?.checkpoint?.ref;
 if(!ref){const policy=readingPolicy(root);if(policy.mode==='managed'&&policy.checkpoints.length&&['work-unit.plan-requirements','work-unit.domain-strategy-design','work-unit.stage-decision-package','work-unit.spec-synthesis'].includes(currentWorkUnit))throw Error('reading-checkpoint-ref-required');return {status:'not-applicable'};}
 if(!managedReading(root,ref))return {status:'manual'};
 const result=checkReadingViews(root,ref);if(result.blockers.length)throw Error(`reading-views-stale: ${result.blockers.join('; ')}`);return result;
}
export function saveReadingComparison(root,checkpoint,result){
 const loc=readingLocation(checkpoint);
 if(result.blockers?.length||!result.diff||!result.diff.markdown)throw Error('reading-comparison-source-invalid');
 const report=result.diff.markdown+'\n批准有效性：not-checked；原决定及语义审阅仍按准备结果处理。\n';
 const id=hash(json({before:result.before,after:result.after,report,renderer:toolClosure()})).slice(7),ref=`${loc.directory}/changes/${id}.md`,file=safe(root,ref,{missing:true});
 if(fs.existsSync(file)){if(fs.readFileSync(file,'utf8')!==report)throw Error('reading-comparison-conflict');return {ref,digest:hash(report),status:'unchanged'};}
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,report,{flag:'wx'});return {ref,digest:hash(report),status:'saved'};
}

export function applyEnableReading(root,plan){
 identity(root);
 return locked(root,{base:'.template-spec/process',directory:'.template-spec/process',lock_name:'.reading-enable.lock',recover:false},()=>applyEnableReadingLocked(root,plan));
}
