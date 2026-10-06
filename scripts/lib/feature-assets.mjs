import {readInstanceMetadata,appliedManagedDigest} from './instance-metadata.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseDocument } from '../vendor/yaml.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw new Error(message); };
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const present = file => { try { fs.lstatSync(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const yaml = file => { const doc = parseDocument(fs.readFileSync(file, 'utf8'), {uniqueKeys:true}); if (doc.errors.length) fail('invalid-yaml: ' + file); return doc.toJS({maxAliasCount:0}); };
const toolDigest = () => digest(fs.readFileSync(import.meta.filename));

// Check every existing component; a candidate is never followed through a link.
export function safeAssetPath(root, ref) {
  if (typeof ref !== 'string' || !ref || path.isAbsolute(ref) || /[\\\x00-\x1f]/.test(ref) || ref.split('/').some(x => !x || x === '.' || x === '..')) fail('unsafe-path: ' + ref);
  let file = root;
  for (const part of ref.split('/')) { file = path.join(file, part); if (present(file) && fs.lstatSync(file).isSymbolicLink()) fail('symlink-refused: ' + ref); }
  return file;
}
function external(root, supplied) {
  if (!supplied || !path.isAbsolute(supplied)) fail('external-absolute-path-required');
  let ancestor=path.resolve(supplied), suffix=[];
  while (!present(ancestor)) { suffix.unshift(path.basename(ancestor)); ancestor=path.dirname(ancestor); }
  if (fs.lstatSync(ancestor).isSymbolicLink()) fail('external-symlink-refused');
  const resolved=path.join(fs.realpathSync(ancestor),...suffix);
  if (inside(root,resolved) || inside(resolved,root)) fail('archive-must-be-outside-project');
  return resolved;
}
function project(root, checkpoint) {
  root=fs.realpathSync(root);
  const identity=yaml(safeAssetPath(root,'yss-project.yaml'));
  if (identity.schema_version!==1 || identity.repository_mode!=='project-instance') fail('project-instance-required');
  const cp=yaml(safeAssetPath(root,checkpoint));
  if (cp.schema_version!==1 || cp.repository_mode!=='project-instance' || !/^[a-z0-9][a-z0-9-]*$/.test(cp.feature_id || '')) fail('checkpoint-identity-invalid');
  const base=`docs/.scratch/${cp.feature_id}`;
  if (!checkpoint.startsWith(base+'/')) fail('checkpoint-feature-mismatch');
  return {root,checkpoint,base};
}
function tree(root, ref, reportLinks=false) {
  if(reportLinks) {
    const parent=path.posix.dirname(ref);if(parent!=='.')safeAssetPath(root,parent);
    const file=path.join(root,ref);
    if(present(file)&&fs.lstatSync(file).isSymbolicLink())return {type:'symlink',target:fs.readlinkSync(file)};
  }
  const file=safeAssetPath(root,ref);
  if (!present(file)) return null;
  const stat=fs.lstatSync(file), mode=stat.mode&0o777;
  if (stat.isDirectory()) {
    const entries=fs.readdirSync(file).sort().map(name=>[name,tree(root,ref+'/'+name,reportLinks)]);
    return {type:'directory',mode,entries,digest:digest(json(entries))};
  }
  if (!stat.isFile()) fail('special-file-refused: '+ref);
  return {type:'file',mode,size:stat.size,digest:digest(fs.readFileSync(file))};
}
function same(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
function remainingMatches(current, expected) {
  if (!current) return true;
  if(current.type!=='directory'||expected.type!=='directory')return same(current,expected);
  return current.mode===expected.mode && current.entries.every(([name,child])=>{
    const original=expected.entries.find(([n])=>n===name);return original&&remainingMatches(child,original[1]);
  });
}
function flatten(node, ref, output=[]) {
  if (!node) return output;
  if(node.type==='symlink')return output;
  if (node.type==='file') output.push({ref,size:node.size,digest:node.digest,mode:node.mode});
  else for (const [name,child] of node.entries) flatten(child,ref+'/'+name,output);
  return output;
}
const cacheRefs = base => ['.chrome-profile','.chrome-baseline-profile'].map(n=>`${base}/verification/browser/${n}`);
const scanExcluded = new Set(['.git','node_modules','.codegraph','.graphify','.codex','.cursor','.pi']);
const toolSources=new Set(['scripts/feature-assets','scripts/lib/feature-assets.mjs','.template-spec/process/feature-assets.md']);
function sources(ctx) {
  const files=[], unknown=[];
  const managed=readInstanceMetadata(ctx.root)?.metadata?.managedFiles??{};
  function walk(dir, relative='') {
    for (const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const ref=relative ? relative+'/'+entry.name : entry.name;
      if (scanExcluded.has(entry.name) || cacheRefs(ctx.base).some(c=>ref===c||ref.startsWith(c+'/'))) continue;
      const file=path.join(dir,entry.name);
      if (entry.isSymbolicLink()) { unknown.push(ref+':symlink'); continue; }
      if (entry.isDirectory()) { walk(file,ref); continue; }
      if (!entry.isFile()) { unknown.push(ref+':special'); continue; }
      if (!/\.(md|ya?ml|json|[cm]?js|ts|tsx|jsx|py|sh|html|toml|txt)$/.test(ref) && path.extname(ref)) continue;
      if (fs.statSync(file).size>8*1024*1024) { unknown.push(ref+':oversize-text'); continue; }
      const bytes=fs.readFileSync(file); if (bytes.includes(0)) continue;
      const hash=digest(bytes);
      // Unchanged distributed framework files are generic readers, not feature bindings.
      // Locally edited/new files in these directories must still be scanned.
      const generic=toolSources.has(ref)||(/^scripts\/|^\.agents\/|^\.template-spec\//.test(ref)&&appliedManagedDigest(managed[ref])===hash);
      files.push({ref,digest:hash,text:generic?'':bytes.toString('utf8')});
    }
  }
  walk(ctx.root); return {files,unknown};
}
function references(ctx, ref, scan) {
  const filename=path.basename(ref), ids=[];
  if (/\/captures\/[^/]+-question\.yaml$/.test(ref)) {
    const capture=yaml(safeAssetPath(ctx.root,ref));
    for (const message of capture.messages||[]) if (message.id) ids.push(message.id);
  }
  const incoming=[], producers=[];
  for (const source of scan.files) {
    if (source.ref===ref) continue;
    source.text.split('\n').forEach((line,index)=>{
      if (line.includes(ref)||line.includes(filename)||ids.some(id=>line.includes(id))) {
        // A direct write-only summary sink is reproducible output, not a consumer.
        const writeOnly=filename==='summary.json' && /^\s*(?:await\s+)?(?:fs\.)?writeFile(?:Sync)?\(path\.join\([^\n]+['"]summary\.json['"]\)/.test(line);
        (writeOnly?producers:incoming).push({ref:source.ref,line:index+1,kind:writeOnly?'producer':'reference'});
      } else if (/\b(readFile|readFileSync|glob|globSync|readdir|readdirSync)\s*\(/.test(line) && /\$\{|\*\*|\+/.test(line) && (line.includes(ctx.base)||line.includes('verification')||line.includes('docs/'))) {
        incoming.push({ref:source.ref,line:index+1,kind:'unresolved-dynamic-reference'});
      }
    });
  }
  return {incoming,producers};
}
function classify(ctx,ref) {
  const relative=ref.slice(ctx.base.length+1), file=safeAssetPath(ctx.root,ref);
  if (cacheRefs(ctx.base).includes(ref)) return {kind:'browser-cache',action:'delete-cache'};
  if (relative==='verification/prototype-evidence-draft.yaml' && present(safeAssetPath(ctx.root,ctx.base+'/verification/prototype-evidence.yaml'))) return {kind:'superseded-draft',action:'archive'};
  if (relative==='plan/stage-items.yaml' && yaml(safeAssetPath(ctx.root,ctx.checkpoint)).stage_tracking?.items?.length) return {kind:'tracking-input',action:'archive'};
  if (relative==='verification/browser/summary.json' && present(safeAssetPath(ctx.root,ctx.base+'/verification/browser/browser-result.json'))) return {kind:'generated-summary',action:'archive'};
  if (/^gates\/captures\/[^/]+-question\.yaml$/.test(relative)) {
    const doc=yaml(file);
    if (doc.messages?.length && doc.messages.every(m=>m.actor_kind==='digital-human' && typeof m.id==='string' && !m.decision)) return {kind:'detached-question',action:'archive'};
  }
  return {kind:/^(gates|handoff|task-packages|verification)\//.test(relative)||/contract|checkpoint|context-reconciliation|domain-strategy|stage-decision/.test(relative)?'protected':'unknown',action:'keep'};
}
export function cacheOccupancy(file) {
  if (!['darwin','linux'].includes(process.platform)) return {status:'unknown',reason:'occupancy-platform-unsupported'};
  const ps=spawnSync('ps',['-axo','pid=,command='],{encoding:'utf8',maxBuffer:16*1024*1024});
  if (ps.status!==0) return {status:'unknown',reason:'process-inspection-failed'};
  const aliases=[file];
  // macOS /var and /private/var are the same storage but ps retains the spelling.
  if(file.startsWith('/private/var/'))aliases.push(file.slice('/private'.length));
  const pids=ps.stdout.split('\n').filter(line=>line.includes('--user-data-dir') && aliases.some(ref=>line.includes(ref))).map(line=>Number(line.trim().split(/\s+/)[0]));
  if (pids.length) return {status:'busy',pids};
  // lsof exit 1 with no diagnostic means no open files; failure is never "free".
  const opened=spawnSync('lsof',['-t','+D',file],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  if (opened.stdout?.trim()) return {status:'busy',pids:opened.stdout.trim().split(/\s+/).map(Number).filter(Number.isSafeInteger)};
  if (opened.status===0) return {status:'unknown',reason:'empty-occupancy-result'};
  if (opened.status!==1 || opened.stderr?.trim() || opened.error) return {status:'unknown',reason:'open-file-inspection-failed'};
  return {status:'free'};
}
export function inspectAssets({root,checkpoint}) {
  const ctx=project(root,checkpoint), scan=sources(ctx), inventory=tree(ctx.root,ctx.base,true),rows=flatten(inventory,ctx.base);
  const symlinks=[];function collect(node,ref){if(node.type==='symlink')symlinks.push({ref,target:node.target});else for(const [name,child]of node.entries||[])collect(child,ref+'/'+name);}collect(inventory,ctx.base);
  const groups=new Map(); for (const row of rows) { const list=groups.get(row.digest)||[]; list.push(row.ref); groups.set(row.digest,list); }
  const candidates=rows.filter(row=>classify(ctx,row.ref).action==='archive').map(row=>({ref:row.ref,...classify(ctx,row.ref),...references(ctx,row.ref,scan)}));
  return {schema_version:1,read_only:true,root:ctx.root,checkpoint,files:rows.length,bytes:rows.reduce((sum,row)=>sum+row.size,0),symlinks,duplicates:[...groups.values()].filter(rows=>rows.length>1),categories:rows.map(row=>({...row,...classify(ctx,row.ref)})),candidates,cache_candidates:cacheRefs(ctx.base).filter(ref=>present(safeAssetPath(ctx.root,ref))),scan_unknown:scan.unknown};
}
export function planAssets({root,checkpoint,candidates,archiveDir}) {
  const ctx=project(root,checkpoint), archive=external(ctx.root,archiveDir);
  if (!candidates?.length) fail('explicit-candidates-required');
  candidates=[...new Set(candidates)].sort();
  const scan=sources(ctx), actions=[];
  for (const ref of candidates) {
    if (!ref.startsWith(ctx.base+'/') || candidates.some(other=>other!==ref&&ref.startsWith(other+'/'))) fail('candidate-scope-invalid: '+ref);
    const observed=tree(ctx.root,ref); if (!observed) fail('candidate-missing: '+ref);
    const classification=classify(ctx,ref), refs=references(ctx,ref,scan);
    const reasons=[];
    if (refs.incoming.length) reasons.push('referenced-or-dynamic');
    if (scan.unknown.length) reasons.push('scan-incomplete');
    if (classification.action==='archive' && observed.type!=='file') reasons.push('archive-file-required');
    if (classification.action==='delete-cache' && observed.type!=='directory') reasons.push('cache-directory-required');
    if (classification.action==='keep') reasons.push(classification.kind);
    actions.push({ref,...classification,action:reasons.length?'keep':classification.action,reasons,observed,...refs});
  }
  const payload={schema_version:1,kind:'feature-assets-plan',root:ctx.root,checkpoint,archive_dir:archive,tool_digest:toolDigest(),scan_digest:digest(json(scan.files.filter(f=>!candidates.includes(f.ref)).map(({ref,digest})=>({ref,digest})))),scan_unknown:scan.unknown,candidates,actions};
  return {...payload,plan_id:digest(json(payload))};
}
function validatePlan(root,plan) {
  const {plan_id,...payload}=plan;
  if (plan.kind!=='feature-assets-plan'||plan.schema_version!==1||plan_id!==digest(json(payload))||plan.root!==fs.realpathSync(root)||plan.tool_digest!==toolDigest()) fail('invalid-or-changed-plan');
  project(root,plan.checkpoint); external(plan.root,plan.archive_dir);
  for(const item of plan.actions) { safeAssetPath(plan.root,item.ref); if(!plan.candidates.includes(item.ref))fail('invalid-plan-action'); }
}
function atomic(file,value) {
  const temp=file+'.tmp-'+process.pid;
  const fd=fs.openSync(temp,'wx',0o600);
  try { fs.writeFileSync(fd,json(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp,file);
}
function validateReceipt(receipt,plan) {
  if(receipt.schema_version!==1 || !Array.isArray(receipt.items) || receipt.items.length!==plan.actions.length)fail('invalid-receipt');
  for(let i=0;i<plan.actions.length;i++) {
    if(receipt.items[i].ref!==plan.actions[i].ref||receipt.items[i].action!==plan.actions[i].action)fail('invalid-receipt-action');
  }
}
function lock(dir,fn) {
  fs.mkdirSync(dir,{recursive:true,mode:0o700}); const file=safeAssetPath(dir,'.lock');
  if (present(file)) {
    const pid=Number(fs.readFileSync(file,'utf8'));
    if(!Number.isSafeInteger(pid)||pid<=0)fail('invalid-transaction-lock');
    try {process.kill(pid,0); fail('transaction-busy');} catch(e) {if(e.code!=='ESRCH')throw e;}
    fs.unlinkSync(file);
  }
  fs.writeFileSync(file,String(process.pid),{flag:'wx',mode:0o600});
  try {return fn();} finally {fs.unlinkSync(file);}
}
export function applyAssets({root,plan,onProgress=()=>{}}) {
  validatePlan(root,plan);
  const dir=plan.archive_dir,receiptFile=path.join(dir,'receipt.json');
  return lock(dir,()=>{
    const prior=present(receiptFile)?JSON.parse(fs.readFileSync(safeAssetPath(dir,'receipt.json'))):null;
    if(prior && (!same(prior.plan,plan)||prior.plan_id!==plan.plan_id))fail('receipt-plan-conflict');
    if(prior)validateReceipt(prior,plan);
    if(prior && ['applied','restored'].includes(prior.status))return {...prior,receipt_ref:receiptFile,reused:true};
    if(!prior) {
      const expected=planAssets({root,checkpoint:plan.checkpoint,candidates:plan.candidates,archiveDir:plan.archive_dir});
      if(!same(expected,plan))fail('plan-no-longer-current');
      if(fs.readdirSync(dir).some(name=>name!=='.lock'))fail('archive-directory-not-owned');
    }
    const ctx=project(root,plan.checkpoint), scan=sources(ctx);
    const scanDigest=digest(json(scan.files.filter(f=>!plan.candidates.includes(f.ref)).map(({ref,digest})=>({ref,digest}))));
    if(scanDigest!==plan.scan_digest || !same(scan.unknown,plan.scan_unknown))fail('reference-input-drift');
    const receipt=prior||{schema_version:1,plan_id:plan.plan_id,plan,status:'running',items:plan.actions.map(item=>({ref:item.ref,action:item.action,status:item.action==='keep'?'kept':'pending'}))};
    const save=()=>atomic(receiptFile,receipt);
    save();
    for(const item of receipt.items) {
      if(['archived','deleted','kept'].includes(item.status))continue;
      const action=plan.actions.find(a=>a.ref===item.ref), source=safeAssetPath(ctx.root,item.ref), current=tree(ctx.root,item.ref);
      const backupRef='files/'+item.ref,backup=safeAssetPath(dir,backupRef);
      if(!current && item.status==='copied' && same(tree(dir,backupRef),action.observed)) {item.status='archived';save();continue;}
      if(!current && item.status==='deleting') {item.status='deleted';save();continue;}
      const resumableDelete=item.status==='deleting' && action.action==='delete-cache' && remainingMatches(current,action.observed);
      if(!same(current,action.observed)&&!resumableDelete)fail('candidate-input-drift: '+item.ref);
      if(action.action==='delete-cache') {
        const occupancy=cacheOccupancy(source);
        if(occupancy.status!=='free') {item.status='retained';item.occupancy=occupancy;save();continue;}
        item.status='deleting';save();onProgress({event:'before-delete',ref:item.ref});
        if(!remainingMatches(tree(ctx.root,item.ref),action.observed)||cacheOccupancy(source).status!=='free')fail('cache-became-busy-or-changed');
        fs.rmSync(source,{recursive:true}); item.status='deleted'; save();
      } else if(action.action==='archive') {
        fs.mkdirSync(path.dirname(backup),{recursive:true,mode:0o700});
        if(!present(backup)) {fs.copyFileSync(source,backup,fs.constants.COPYFILE_EXCL);fs.chmodSync(backup,action.observed.mode);}
        if(!same(tree(dir,backupRef),action.observed))fail('archive-verification-failed');
        item.status='copied';save();onProgress({event:'copied',ref:item.ref});
        if(!same(tree(ctx.root,item.ref),action.observed))fail('archive-source-changed');
        fs.unlinkSync(source);item.status='archived';save();
      }
    }
    receipt.status=receipt.items.some(i=>i.status==='retained')?'partial':'applied';save();
    return {...receipt,receipt_ref:receiptFile};
  });
}
export function restoreAssets({root,receiptRef}) {
  root=fs.realpathSync(root); const file=external(root,receiptRef),dir=path.dirname(file);
  if(path.basename(file)!=='receipt.json')fail('receipt-path-invalid');
  return lock(dir,()=>{
    const receipt=JSON.parse(fs.readFileSync(safeAssetPath(dir,'receipt.json'))),plan=receipt.plan;
    validatePlan(root,plan); if(plan.archive_dir!==dir || receipt.plan_id!==plan.plan_id)fail('receipt-location-invalid');
    validateReceipt(receipt,plan);
    const restores=receipt.items.filter(i=>i.action==='archive'&&['archived','copied','restored'].includes(i.status));
    for(const item of restores) {
      const expected=plan.actions.find(a=>a.ref===item.ref)?.observed;
      if(!expected||!same(tree(dir,'files/'+item.ref),expected))fail('archive-integrity-failed');
      const current=tree(root,item.ref);if(current&&!same(current,expected))fail('restore-conflict: '+item.ref);
    }
    for(const item of restores) {
      const target=safeAssetPath(root,item.ref),expected=plan.actions.find(a=>a.ref===item.ref).observed;
      if(!present(target)) {
        fs.mkdirSync(path.dirname(target),{recursive:true});safeAssetPath(root,item.ref);
        fs.copyFileSync(safeAssetPath(dir,'files/'+item.ref),target,fs.constants.COPYFILE_EXCL);fs.chmodSync(target,expected.mode);
        if(!same(tree(root,item.ref),expected))fail('restore-verification-failed');
      }
      item.status='restored';atomic(file,receipt);
    }
    receipt.status='restored';atomic(file,receipt);return {...receipt,receipt_ref:file};
  });
}
