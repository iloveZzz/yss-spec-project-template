// Public migration driver. Adapters only prepare candidates; this module owns writes.
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {hash,json,ensure,stat,safe,descriptor,same,write,targetPath,governance} from './io.mjs';
import {guardNestedRepository,gitlinks,METADATA} from './identity.mjs';
import {applyTransaction,inspectState,recoveryPreview,recover as recoverTransaction} from './transaction.mjs';

const INDEX='.yss-harness-state/upgrade.json';
export function assertUpgradeVersion(from,to) {
  const parts=v=>{
    if(typeof v!=='string')return null;
    const match=v.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);
    if(!match)return null;
    const pre=match[4]?.split('.') || [];
    if(pre.some(x=>/^\d+$/.test(x) && x.length>1 && x[0]==='0'))return null;
    return {numbers:match.slice(1,4).map(BigInt),pre};
  };
  const a=parts(from),b=parts(to);ensure(a && b,'缺少可比较的 CLI 版本基线','VERSION');
  let order=0;
  for(let i=0;i<3 && !order;i++)order=b.numbers[i]>a.numbers[i]?1:b.numbers[i]<a.numbers[i]?-1:0;
  if(!order && (!a.pre.length || !b.pre.length))order=b.pre.length?-1:a.pre.length?1:0;
  else if(!order)for(let i=0;i<Math.max(a.pre.length,b.pre.length) && !order;i++){
    const x=a.pre[i],y=b.pre[i];
    if(x===undefined)order=1;else if(y===undefined)order=-1;
    else if(x!==y){const xn=/^\d+$/.test(x),yn=/^\d+$/.test(y);order=xn&&yn?(BigInt(y)>BigInt(x)?1:-1):xn!==yn?(xn?1:-1):(y>x?1:-1);}
  }
  ensure(order>=0,'migrate 不支持 CLI 降级','VERSION');
}
const OMIT=new Set(['.git','node_modules','.codegraph','.graphify','__pycache__','.DS_Store']);
export function inventory(root, prefix='', out={}) {
  for(const name of fs.readdirSync(safeDirectory(root,prefix)).sort()) {
    if(OMIT.has(name) || !prefix && name==='.yss-harness-state') continue;
    const ref=prefix?`${prefix}/${name}`:name, p=path.join(root,ref), s=fs.lstatSync(p);
    if(s.isSymbolicLink()) out[ref]={type:'symlink',link:fs.readlinkSync(p)};
    else if(s.isDirectory()) {out[ref]={type:'directory',mode:s.mode&0o777};inventory(root,ref,out);}
    else {ensure(s.isFile() && s.nlink===1,`不支持特殊文件/硬链接: ${ref}`,'PATH');out[ref]=descriptor(root,ref);}
  }
  return out;
}
function safeDirectory(root,ref) {return ref?safe(root,ref):root;}
export function copyCandidate(root,destination,tree=inventory(root)) {
  for(const [ref,d] of Object.entries(tree)) {
    const p=path.join(destination,ref);fs.mkdirSync(path.dirname(p),{recursive:true});
    if(d.type==='directory') fs.mkdirSync(p,{recursive:true,mode:d.mode});
    else if(d.type==='symlink') fs.symlinkSync(d.link,p);
    else {fs.copyFileSync(safe(root,ref),p);fs.chmodSync(p,d.mode);}
  }
}
const digest=value=>hash(JSON.stringify(value));
function gitStamp(root) {
  const r=spawnSync('git',['--no-optional-locks','-c','core.fsmonitor=false','-C',root,'ls-files','--stage','-z'],{encoding:'buffer',maxBuffer:32*1024*1024});
  const head=spawnSync('git',['--no-optional-locks','-C',root,'rev-parse','HEAD'],{encoding:'utf8'});
  return {index:r.status===0?hash(r.stdout):null,head:head.status===0?head.stdout.trim():null,links:gitlinks(root)};
}
function outside(root,p) {
  ensure(typeof p==='string' && path.isAbsolute(p),'计划与归档路径必须是绝对路径','PATH');
  const result=path.resolve(p);targetPath(path.dirname(result));
  ensure(result!==root && !result.startsWith(root+path.sep) && !root.startsWith(result+path.sep),'计划/归档必须位于项目外','PATH');
  ensure(!stat(result)?.isSymbolicLink(),'外部路径不能是符号链接','PATH');return result;
}
function durable(root,ref,bytes,mode=0o600) {
  const p=safe(root,ref);fs.mkdirSync(path.dirname(p),{recursive:true});
  const temp=p+'.writing-'+randomUUID();
  const fd=fs.openSync(temp,'wx',mode);
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.renameSync(temp,p);
  const dir=fs.openSync(path.dirname(p),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}
function readFile(p){ensure(stat(p)?.isFile() && !stat(p).isSymbolicLink() && stat(p).nlink===1,`不是普通文件: ${p}`,'PATH');return fs.readFileSync(p);}
function guard(root,adapter,ref) {
  if(ref!==adapter.family.metadataFile) governance(ref);
  ensure(ref!==INDEX,'不能迁移事务状态','PROTECTED');
  guardNestedRepository(root,ref);
  ensure(!gitlinks(root).some(p=>ref===p || ref.startsWith(p+'/')),`受保护 gitlink: ${ref}`,'PROTECTED');
  descriptor(root,ref);
}
function encode(operations) {return operations.map(op=>({path:op.path,before:op.before,after:op.after,...(op.after?{contentBase64:op.bytes.toString('base64')}:{})}));}
function validateOperations(root,adapter,ops) {
  ensure(Array.isArray(ops),'操作列表非法','PLAN');const paths=new Set();
  for(const op of ops){guard(root,adapter,op.path);ensure(!paths.has(op.path),'重复迁移路径','PLAN');paths.add(op.path);
    for(const d of [op.before,op.after]) ensure(d===null || d?.type==='file' && /^[a-f0-9]{64}$/.test(d.digest) && Number.isInteger(d.mode) && d.mode>=0 && d.mode<=0o777,'文件描述非法','PLAN');
    if(op.after) ensure(typeof op.contentBase64==='string' && hash(Buffer.from(op.contentBase64,'base64'))===op.after.digest,'候选内容摘要错误','PLAN');
  }
}
function assertExecutor(adapter,plan) {ensure(plan.schemaVersion===1 && plan.family===adapter.family.packageName && plan.executor===adapter.fingerprint,'CLI 家族/执行器与计划不一致','EXECUTOR');}
function checkPlan(adapter,plan) {
  const {planDigest,...body}=plan;ensure(planDigest===digest(body),'计划摘要错误','PLAN');assertExecutor(adapter,plan);
  targetPath(plan.target);ensure(fs.realpathSync(plan.target)===plan.target,'项目实际路径已变化','PATH');
  ensure(/^[a-f0-9-]{36}$/.test(plan.id) && !Number.isNaN(Date.parse(plan.createdAt)),'计划身份非法','PLAN');
  outside(plan.target,plan.archive);validateOperations(plan.target,adapter,plan.operations);
}
function index(root,adapter) {
  if(!stat(safe(root,INDEX)))return {schemaVersion:1,family:adapter.family.packageName,runs:[]};
  const value=JSON.parse(readFile(safe(root,INDEX)));
  ensure(value.schemaVersion===1 && value.family===adapter.family.packageName && Array.isArray(value.runs),'迁移索引身份不一致','STATE');return value;
}
function state(root,adapter) {
  if(!stat(safe(root,'.yss-harness-state')))return {pending:[]};
  return inspectState(root,adapter.family);
}
function lock(root,fn) {
  const file=safe(root,'.yss-harness-migrate.lock');
  if(stat(file)) {
    const owner=JSON.parse(readFile(file));ensure(owner.host===os.hostname() && Number.isInteger(owner.pid) && owner.pid>0,'无法判断迁移锁持有者','LOCKED');
    let alive=true;try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}
    ensure(!alive,'另一个迁移正在运行','LOCKED');fs.unlinkSync(file);
  }
  const fd=fs.openSync(file,'wx',0o600);fs.writeFileSync(fd,json({pid:process.pid,host:os.hostname()}));fs.fsyncSync(fd);fs.closeSync(fd);
  try{return fn();}finally{fs.unlinkSync(file);}
}
function observed(root) {const tree=inventory(root);delete tree['.yss-harness-migrate.lock'];return tree;}
function currentMatches(root,plan) {ensure(digest(observed(root))===digest(plan.inputs) && digest(gitStamp(root))===digest(plan.git),'计划后项目或 Git 输入已变化，请重新规划','STALE_PLAN');}
function record(root,idx,run,phase) {run.phase=phase;durable(root,INDEX,json(idx));durable(run.archive,'receipt.json',json(run));}
function loadArchived(root,adapter,run) {
  outside(root,run.archive);targetPath(run.archive);
  const plan=JSON.parse(readFile(safe(run.archive,'plan.json')));checkPlan(adapter,plan);
  ensure(plan.id===run.id && plan.planDigest===run.planDigest && plan.target===root && plan.archive===run.archive,'归档与回执不一致','STATE');
  const journalRef=safe(root,`.yss-harness-state/${adapter.family.side}/transactions/${plan.id}/journal.json`);
  if(stat(journalRef)){const journal=JSON.parse(readFile(journalRef));const shape=ops=>ops.map(({path,before,after})=>({path,before,after}));ensure(journal.id===plan.id && journal.profileId===adapter.family.profileId && digest(shape(journal.operations))===digest(shape(plan.operations)),'归档操作与原事务不一致','ARCHIVE');}
  else ensure(run.phase==='applying','原事务日志缺失','STATE');
  return plan;
}
function afterMatches(root,operations) {for(const op of operations)ensure(same(descriptor(root,op.path),op.after),`升级后已有修改: ${op.path}`,'CONCURRENT');}
function unchangedInputs(root,plan) {
  const changed=new Set(plan.operations.map(o=>o.path));
  const select=tree=>Object.fromEntries(Object.entries(tree).filter(([ref,d])=>!changed.has(ref) && !(d.type==='directory' && [...changed].some(p=>p.startsWith(ref+'/')))));
  ensure(digest(select(observed(root)))===digest(select(plan.inputs)) && digest(gitStamp(root))===digest(plan.git),'迁移期间未写入资产或 Git 状态变化','CONCURRENT');
}
function archivedBefore(plan) {
  return plan.operations.map((op,i)=>{
    let bytes;
    if(op.before){bytes=readFile(safe(plan.archive,`before/${i}`));ensure(hash(bytes)===op.before.digest,'备份摘要损坏','ARCHIVE');}
    return {path:op.path,before:op.after,after:op.before,bytes};
  });
}
function closeInterrupted(root,adapter,idx) {
  const pending=state(root,adapter);
  const validate=()=>{targetPath(root);ensure(!METADATA.some(ref=>ref!==adapter.family.metadataFile && stat(safe(root,ref))),'异族身份禁止恢复','IDENTITY');};
  validate();
  if(pending.pending.length)recoverTransaction(root,adapter.family,pending,validate);
  for(const run of idx.runs.filter(r=>['applying','rolling-back'].includes(r.phase))) {
    const plan=loadArchived(root,adapter,run);
    const journalPath=safe(root,`.yss-harness-state/${adapter.family.side}/transactions/${run.phase==='rolling-back'?run.rollbackId:run.id}/journal.json`);
    const journal=stat(journalPath)?JSON.parse(readFile(journalPath)):null;
    const succeeded=journal?.phase==='committed';
    if(succeeded)afterMatches(root,run.phase==='rolling-back'?plan.operations.map(o=>({...o,after:o.before})):plan.operations);
    record(root,idx,run,run.phase==='rolling-back'?(succeeded?'rolled-back':'applied'):(succeeded?'applied':'recovered'));
  }
}
export function migration(adapter,command,opts={}) {
  let plan;
  if(command==='apply'){ensure(opts.plan,'apply 需要 --plan','ARGS');plan=JSON.parse(readFile(path.resolve(opts.plan)));checkPlan(adapter,plan);}
  const root=targetPath(opts.targetDir || plan?.target || process.cwd());
  ensure(stat(root)?.isDirectory(),'项目目录不存在','PATH');
  ensure(!plan || plan.target===root,'计划与目标目录不一致','IDENTITY');
  if(command==='plan') {
    adapter.check(root,opts);
    ensure(!state(root,adapter).pending.length && !index(root,adapter).runs.some(r=>['applying','rolling-back'].includes(r.phase)),'请先 recover 未完成迁移','INTERRUPTED');
    const output=outside(root,path.resolve(opts.output || ''));
    ensure(opts.output && !stat(output),'--output 必须是项目外全新文件','PATH');
    const inputs=observed(root), git=gitStamp(root), id=randomUUID(),createdAt=new Date().toISOString();
    const archive=outside(root,path.resolve(opts.archiveDir || path.join(os.homedir(),'.yss-harness/archives',hash(root+'\0'+adapter.family.packageName),id)));
    ensure(!stat(archive),'归档目录必须全新','ARCHIVE');
    const resolutions=opts.resolutions?JSON.parse(readFile(path.resolve(opts.resolutions))):{};
    ensure(resolutions && typeof resolutions==='object' && !Array.isArray(resolutions),'冲突决议必须为路径映射','PLAN');
    const settings={prune:Boolean(opts.prune),migrateLayout:Boolean(opts.migrateLayout),resolutions};
    let prepared;try{prepared=adapter.prepare(root,settings,id,createdAt);}catch(e){if(e.code==='CONFLICT' || e.result?.conflicts?.length)e.result={...e.result,status:'blocked'};throw e;}
    const operations=encode(prepared.operations);validateOperations(root,adapter,operations);
    const body={schemaVersion:1,id,createdAt,target:root,family:adapter.family.packageName,executor:adapter.fingerprint,template:adapter.template,archive,settings,inputs,git,operations,changes:prepared.changes || [],rules:['managed-sync.v1',...(settings.migrateLayout?['layout-migration.v1']:[]),...(settings.prune?['retirement.v1']:[])]};
    plan={...body,planDigest:digest(body)};currentMatches(root,plan);
    durable(path.dirname(output),path.basename(output),json(plan));
    return {schemaVersion:1,command:'migrate plan',status:'planned',target:root,plan:output,planDigest:plan.planDigest,changes:plan.changes,operations:operations.length,archive};
  }
  const idx=index(root,adapter);
  if(command==='status'){adapter.check(root,{migrateLayout:true});return {schemaVersion:1,command:'migrate status',status:'ok',target:root,transactions:idx.runs,pending:state(root,adapter).pending.map(x=>x.journal.id)};}
  if(command==='recover') {
    // Preview uses existing journal validation, including drift and archive checks, without creating state.
    const pending=state(root,adapter);recoveryPreview(root,adapter.family,pending);for(const run of idx.runs.filter(r=>['applying','rolling-back'].includes(r.phase))){const p=loadArchived(root,adapter,run);archivedBefore(p);}
    if(!opts.apply)return {schemaVersion:1,status:'preview',target:root,transactions:idx.runs.filter(r=>['applying','rolling-back'].includes(r.phase)),pending:pending.pending.map(x=>x.journal.id)};
    return lock(root,()=>{closeInterrupted(root,adapter,idx);return {schemaVersion:1,status:'recovered',target:root,transactions:idx.runs};});
  }
  ensure(['apply','rollback'].includes(command),'未知 migrate 子命令','ARGS');
  if(command==='rollback' && !opts.apply) {
    ensure(!state(root,adapter).pending.length,'请先 recover 未完成事务','INTERRUPTED');
    const run=idx.runs.at(-1);ensure(run?.phase==='applied','没有可回退的最近成功迁移','STATE');
    const p=loadArchived(root,adapter,run);afterMatches(root,p.operations);const inverse=archivedBefore(p);
    return {schemaVersion:1,status:'preview',target:root,id:run.id,paths:inverse.map(o=>o.path)};
  }
  return lock(root,()=>{
    ensure(!state(root,adapter).pending.length && !idx.runs.some(r=>['applying','rolling-back'].includes(r.phase)),'请先 recover 未完成迁移','INTERRUPTED');
    if(command==='rollback') {
      const run=idx.runs.at(-1);ensure(run?.phase==='applied','没有可回退的最近成功迁移','STATE');
      plan=loadArchived(root,adapter,run);afterMatches(root,plan.operations);const inverse=archivedBefore(plan);
      if(!opts.apply)return {schemaVersion:1,status:'preview',target:root,id:run.id,paths:inverse.map(o=>o.path)};
      run.rollbackId=randomUUID();record(root,idx,run,'rolling-back');
      try{applyTransaction(root,adapter.family,inverse,op=>{if(op)guard(root,adapter,op.path);},run.rollbackId,false,()=>afterMatches(root,inverse));record(root,idx,run,'rolled-back');}
      catch(e){closeInterrupted(root,adapter,idx);throw e;}
      return {schemaVersion:1,status:'rolled-back',target:root,id:run.id,archive:run.archive};
    }
    const existing=idx.runs.find(r=>r.id===plan.id);
    if(existing){ensure(existing.phase==='applied' && existing.planDigest===plan.planDigest,'计划已执行或恢复，请重新规划','STATE');afterMatches(root,plan.operations);return {schemaVersion:1,status:'applied',target:root,reused:true,...existing};}
    adapter.check(root,plan.settings);currentMatches(root,plan);
    // Regenerate from the fixed executable and explicit resolutions: edited plans cannot add arbitrary writes.
    const rebuilt=encode(adapter.prepare(root,plan.settings,plan.id,plan.createdAt).operations);
    ensure(digest(rebuilt)===digest(plan.operations),'计划内容与固定执行器重新生成的结果不一致','PLAN');currentMatches(root,plan);
    if(!plan.operations.length)return {schemaVersion:1,status:'unchanged',target:root};
    ensure(!stat(plan.archive),'归档目录已存在','ARCHIVE');fs.mkdirSync(plan.archive,{recursive:true,mode:0o700});
    durable(plan.archive,'plan.json',json(plan));
    for(const [i,op]of plan.operations.entries())if(op.before){const bytes=readFile(safe(root,op.path));ensure(hash(bytes)===op.before.digest,'备份期间输入变化','CONCURRENT');durable(plan.archive,`before/${i}`,bytes,op.before.mode);}
    if(plan.settings.migrateLayout || plan.settings.prune || Object.keys(plan.settings.resolutions).length)copyCandidate(root,path.join(plan.archive,'project-copy'),plan.inputs);
    archivedBefore(plan);currentMatches(root,plan);
    // applyTransaction owns its durable WAL. Create its state before writing our receipt index.
    if(!stat(safe(root,'.yss-harness-state'))) {
      fs.mkdirSync(safe(root,`.yss-harness-state/${adapter.family.side}/transactions`),{recursive:true});
      durable(root,'.yss-harness-state/owner.json',json({schemaVersion:1,profileId:adapter.family.profileId}));
    }
    const run={schemaVersion:1,id:plan.id,planDigest:plan.planDigest,archive:plan.archive,family:plan.family,createdAt:plan.createdAt,template:plan.template,executor:plan.executor,phase:'applying'};idx.runs.push(run);record(root,idx,run,'applying');
    try {
      const ops=plan.operations.map(op=>({...op,bytes:op.after?Buffer.from(op.contentBase64,'base64'):undefined}));
      applyTransaction(root,adapter.family,ops,op=>{if(op)guard(root,adapter,op.path);else unchangedInputs(root,plan);},plan.id,false,()=>{const checks=adapter.verify(root);afterMatches(root,plan.operations);unchangedInputs(root,plan);run.verification={status:'passed',checks:checks || [],completedAt:new Date().toISOString()};});
      record(root,idx,run,'applied');
    }catch(e){closeInterrupted(root,adapter,idx);throw e;}
    return {schemaVersion:1,status:'applied',target:root,...run};
  });
}
export function parseMigration(argv) {
  const args=[...argv],command=args.shift() || 'status',opts={};
  ensure(['plan','apply','status','recover','rollback'].includes(command),'migrate plan|apply|status|recover|rollback','ARGS');
  const values={'--target-dir':'targetDir','--output':'output','--plan':'plan','--archive-dir':'archiveDir','--resolutions':'resolutions'};
  const flags={'--apply':'apply','--prune':'prune','--migrate-layout':'migrateLayout','--json':'json'};
  const allowed={plan:['targetDir','output','archiveDir','resolutions','prune','migrateLayout','json'],apply:['targetDir','plan','json'],status:['targetDir','json'],recover:['targetDir','apply','json'],rollback:['targetDir','apply','json']};
  while(args.length){const flag=args.shift(),key=values[flag] || flags[flag];ensure(key && allowed[command].includes(key),`不适用的参数: ${flag}`,'ARGS');ensure(!(key in opts),`重复参数: ${flag}`,'ARGS');if(values[flag]){ensure(args.length && !args[0].startsWith('--'),`参数缺少值: ${flag}`,'ARGS');opts[key]=args.shift();}else opts[key]=true;}
  return {command,opts};
}
