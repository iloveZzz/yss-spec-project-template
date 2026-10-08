// Synthetic protocol fixtures only. Production writes use native Go saved plans/transactions.
import path from 'node:path';
import {mkdirSync,renameSync,rmSync} from 'node:fs';
import {existsSync,readFileSync} from '../../lib/validation-phase.mjs';
import {readInstanceMetadata} from '../../lib/instance-metadata.mjs';
import {read,safe,ensure,hash,digest,json,relative,files,write,schema,project} from '../../lib/strategic-handoff-io.mjs';
import {inspectSpecBaselineSource,verifySpecBaselinePackage,verifySpecBaselineBinding} from '../../lib/spec-baseline.mjs';
import {withSourceContextSnapshot} from '../../lib/source-context-snapshot.mjs';
const packageSchema='.template-spec/process/schemas/spec-baseline-package.schema.json';
const receiptSchema='.template-spec/process/schemas/spec-baseline-import-receipt.schema.json';
const targetProfile='harness.business-ddd-strategy-handoff';
const identity=(root,profile)=>ensure(readInstanceMetadata(root)?.profile===profile,'Synthetic fixture Profile mismatch');
export async function exportSpecBaseline({sourceRoot=process.cwd(),checkpointRef,output,version='v1'}={}) {
  sourceRoot=project(sourceRoot);relative(checkpointRef);
  const proof=inspectSpecBaselineSource(sourceRoot,checkpointRef);
  const {collectSourceClosure}=await import('../../lib/strategic-handoff.mjs');
  const bindings=Object.fromEntries(Object.entries(proof.source).filter(([key,value])=>key.endsWith('_ref')&&value).map(([key,value])=>[key,{persisted_ref:value}]));
  const approvals=Object.fromEntries(['gate.plan-approved','gate.spec-baseline-approved'].map(gate=>[gate,{record_ref:proof.state.gates[gate].approval_ref}]));
  const captured=collectSourceClosure(sourceRoot,checkpointRef,{schema_version:3,source:bindings,evidence_and_version_digests:[]},{approvals,additional_files:['.yss.json','yss-project.yaml','.template-spec/process/harness-profile.yaml','.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/yss-skill-registry.yaml'],reference_map:{}},{businessMode:'draft'});
  const manifest={schema_version:1,kind:'spec-baseline',baseline_id:`spec-baseline.${proof.source.feature_id.replace(/^feature\./,'')}`,version,source:proof.source,files:[...captured].sort(([a],[b])=>a.localeCompare(b)).map(([ref,bytes])=>({path:`payload/files/${ref==='CONTEXT.md'?'source-context.snapshot.md':ref}`,original_ref:ref,sha256:hash(bytes),size_bytes:bytes.length}))};
  manifest.bundle_digest=digest(manifest);schema(manifest,packageSchema);
  output=path.resolve(output);ensure(!existsSync(output),'Spec baseline 导出目录已存在');
  const staging=`${output}.staging-${process.pid}`;ensure(!existsSync(staging),'Spec baseline 暂存目录已存在');
  mkdirSync(path.dirname(output),{recursive:true});mkdirSync(staging);
  try {
    for(const file of manifest.files)write(staging,file.path,captured.get(file.original_ref));
    write(staging,'manifest.json',json(manifest));verifySpecBaselinePackage(staging);
    // Re-read the source proof before publishing the frozen snapshot.
    inspectSpecBaselineSource(sourceRoot,checkpointRef,proof.source);renameSync(staging,output);
  } catch(error){rmSync(staging,{recursive:true,force:true});throw error;}
  return {result:'spec-baseline-exported',kind:'spec-baseline',baseline_id:manifest.baseline_id,version,bundle_digest:manifest.bundle_digest,package:output,ready_for_agent:false};
}

function buildWorkingSet(proof,base) {
  const assets=Object.fromEntries(proof.manifest.files.map(file=>[file.original_ref,`${base}/package/${file.path}`]));
  const editable=new Set();
  if(proof.source.business_ticket_set_ref) {
    const set=withSourceContextSnapshot(proof.sourceRoot,()=>read(safe(proof.sourceRoot,proof.source.business_ticket_set_ref)));
    editable.add(proof.source.business_ticket_set_ref);
    for(const item of set.tickets || [])editable.add(item.ref);
  }
  for(const ref of editable)assets[ref]=`${base}/working-files/${ref}`;
  const rebind=value=>Array.isArray(value)?value.map(rebind):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[key,rebind(v)])):typeof value==='string'&&assets[value]?assets[value]:value;
  const copies=new Map();
  for(const ref of editable) {
    const original=readFileSync(safe(proof.sourceRoot,ref),'utf8');
    if(ref===proof.source.business_ticket_set_ref)continue;
    let text=original;
    for(const [from,to]of Object.entries(assets).sort(([a],[b])=>b.length-a.length))text=text.split(from).join(to);
    // Only manifest-mapped local Markdown hrefs move with the synthetic working ticket.
    text=text.replace(/(\[[^\]]*\]\(\s*)(<?)([^)\s>]+)(>?)([^)]*\))/g,(match,start,open,href,close,end)=>{
      if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href))return match;
      const parts=href.match(/^([^?#]+)([?#].*)?$/);if(!parts)return match;
      const mapped=Object.values(assets).includes(parts[1])?parts[1]:assets[parts[1]]||assets[path.posix.normalize(path.posix.join(path.posix.dirname(ref),parts[1]))];
      return mapped?start+open+path.posix.relative(path.posix.dirname(assets[ref]),mapped)+(parts[2]||'')+close+end:match;
    });
    copies.set(assets[ref],Buffer.from(text));
  }
  if(proof.source.business_ticket_set_ref) {
    const set=rebind(read(safe(proof.sourceRoot,proof.source.business_ticket_set_ref)));
    for(const item of set.tickets || [])item.digest=hash(copies.get(item.ref));
    copies.set(assets[proof.source.business_ticket_set_ref],Buffer.from(json(set)));
  }
  return {working:{schema_version:1,kind:'spec-baseline-working-set',baseline_id:proof.manifest.baseline_id,version:proof.manifest.version,assets,business_ticket_set_ref:assets[proof.source.business_ticket_set_ref] || ''},copies};
}
export function importSpecBaseline({bundle,targetRoot=process.cwd()}={}) {
  targetRoot=project(targetRoot);identity(targetRoot,'design');
  const proof=verifySpecBaselinePackage(path.resolve(bundle)),{manifest}=proof;
  const base=`docs/spec-baselines/${manifest.baseline_id}/${manifest.version}`,receiptRef=`${base}/receipt.json`;
  if(existsSync(path.join(targetRoot,base))) {
    const old=read(safe(targetRoot,receiptRef));ensure(old.bundle_digest===manifest.bundle_digest,'Spec baseline 身份/版本冲突');
    verifySpecBaselineBinding({upstream_spec_baseline:{receipt_ref:receiptRef,receipt_digest:hash(readFileSync(safe(targetRoot,receiptRef)))}},{root:targetRoot,requireReconciliation:false});
    return {result:'spec-baseline-already-imported',receipt_ref:receiptRef,receipt_digest:hash(readFileSync(safe(targetRoot,receiptRef))),ready_for_agent:false};
  }
  const receipt={schema_version:1,kind:'spec-baseline-import',baseline_id:manifest.baseline_id,version:manifest.version,bundle_digest:manifest.bundle_digest,package_ref:`${base}/package`,target_profile_id:targetProfile,target_context_digest:hash(readFileSync(safe(targetRoot,'CONTEXT.md'))),status:'imported-pending-context-reconciliation',ready_for_agent:false,working_set_ref:`${base}/working-set.json`};schema(receipt,receiptSchema);
  const {working,copies}=buildWorkingSet(proof,base),staging=`${base}.staging-${process.pid}`;
  ensure(!existsSync(path.join(targetRoot,staging)),'Spec baseline 暂存目录已存在');
  const stagedRef=ref=>staging+ref.slice(base.length);
  try {
    for(const ref of files(path.resolve(bundle)))write(targetRoot,`${staging}/package/${ref}`,readFileSync(safe(path.resolve(bundle),ref)));
    for(const [ref,bytes]of copies)write(targetRoot,stagedRef(ref),bytes);
    write(targetRoot,`${staging}/working-set.json`,json(working));write(targetRoot,`${staging}/receipt.json`,json(receipt));
    verifySpecBaselinePackage(safe(targetRoot,`${staging}/package`));
    mkdirSync(path.dirname(path.join(targetRoot,base)),{recursive:true});renameSync(path.join(targetRoot,staging),path.join(targetRoot,base));
  }catch(error){rmSync(path.join(targetRoot,staging),{recursive:true,force:true});throw error;}
  return {result:'spec-baseline-imported',receipt_ref:receiptRef,receipt_digest:hash(readFileSync(safe(targetRoot,receiptRef))),working_set_ref:receipt.working_set_ref,status:receipt.status,ready_for_agent:false,pending:['target-context-reconciliation','design-entry-receipt-acceptance']};
}
