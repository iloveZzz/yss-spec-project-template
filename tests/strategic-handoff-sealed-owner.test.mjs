import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeRoot} from './helpers/yss-instance.mjs';
import {approvedSpecFixture,designFixture,reconcile} from '../scripts/fixtures/spec-baseline/fixture.mjs';
import {exportSpecBaseline,importSpecBaseline} from '../scripts/fixtures/spec-baseline/package.mjs';
import {verifySpecBaselinePackage,verifySpecBaselineBinding,inspectSpecBaselineSource} from '../scripts/lib/spec-baseline.mjs';
import {hash,digest,read,json} from '../scripts/lib/strategic-handoff-io.mjs';
import {assertStrategicWorkUnitDecision} from '../scripts/lib/native-approval.mjs';
import {sourceApproval} from '../scripts/lib/strategic-handoff.mjs';
import {syntheticPlanSourceContext} from '../scripts/fixtures/plan-review-control/source-consumption-fixture.mjs';
import {withValidationPhase} from '../scripts/lib/validation-phase.mjs';

// Real native policy + complete approved synthetic source. No arbitrary virtual
// source root or partial Handoff document stands in for an authenticated package.
async function fixture(t){
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-sealed-owner-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const seed=makeRoot('sealed-spec-policy-','spec');t.after(()=>fs.rmSync(seed,{recursive:true,force:true}));
 const root=path.join(directory,'source'),bundle=path.join(directory,'baseline');
 const source=await approvedSpecFixture(root,{nativeSeed:seed,productDesign:false});
 await exportSpecBaseline({sourceRoot:root,checkpointRef:source.checkpointRef,output:bundle});
 // 用例会删除 source 再校验，所以暂存根必须选在整个用例期间都存在的临时实例（seed），不能用 source，也不能落到真实模板根。
 return {directory,root,bundle,source,verify:()=>verifySpecBaselinePackage(bundle,{root:seed})};
}
function inventory(root){const rows=[];const visit=ref=>{const file=path.join(root,ref),stat=fs.lstatSync(file);rows.push([ref,stat.mode,stat.mtimeMs,stat.isDirectory()?null:hash(fs.readFileSync(file))]);if(stat.isDirectory())for(const name of fs.readdirSync(file).sort())visit(path.join(ref,name));};visit('');return rows;}
function rewriteCheckpoint(f,change,{updateSource=true}={}){
 const manifest=read(path.join(f.bundle,'manifest.json')),row=manifest.files.find(row=>row.original_ref===f.source.checkpointRef),file=path.join(f.bundle,row.path),state=read(file);change(state);const bytes=Buffer.from(json(state));fs.writeFileSync(file,bytes);row.sha256=hash(bytes);row.size_bytes=bytes.length;if(updateSource)manifest.source.checkpoint_digest=hash(bytes);delete manifest.bundle_digest;manifest.bundle_digest=digest(manifest);fs.writeFileSync(path.join(f.bundle,'manifest.json'),json(manifest));
}

test('sealed approved Plan is verified from its manifest after the original source disappears',async t=>{
 const f=await fixture(t),before=inventory(f.bundle);fs.rmSync(f.root,{recursive:true,force:true});
 const proof=f.verify();assert.equal(proof.source.checkpoint_ref,f.source.checkpointRef);assert.equal(proof.state.gates['gate.plan-approved'].status,'approved');
 assert.deepEqual(inventory(f.bundle),before,'package bytes, modes and mtimes remain unchanged');
});

test('sealed checkpoint owner, approval reference and original bytes remain bound',async t=>{
 const f=await fixture(t),saved=path.join(f.directory,'saved');fs.cpSync(f.bundle,saved,{recursive:true});
 const reset=()=>{fs.rmSync(f.bundle,{recursive:true,force:true});fs.cpSync(saved,f.bundle,{recursive:true});};
 const cases=[
  ['different feature owner',state=>state.feature_id='feature.other',/PLAN_|APPROVAL_CURRENT_INVALID/],
  ['wrong gate approval reference',state=>state.gates['gate.plan-approved'].approval_ref='other-approval.json',/APPROVAL_CONTEXT_REQUIRED: 未绑定批准与主体: gate.plan-approved/],
  ['conflicting primary approval reference',state=>state.plan_approval_ref='other-approval.json',/INPUT: 输入不可读: other-approval.json/],
  ['future unapproved checkpoint',state=>state.gates['gate.plan-approved'].status='ready-for-human',/SPEC_BASELINE: 来源当前批准缺失: gate.plan-approved/],
 ];
 for(const [name,mutate,pattern]of cases)await t.test(name,()=>{try{rewriteCheckpoint(f,mutate);assert.throws(f.verify,pattern);}finally{reset();}});
 await t.test('raw checkpoint drift',()=>{const manifest=read(path.join(f.bundle,'manifest.json')),row=manifest.files.find(row=>row.original_ref===f.source.checkpointRef);fs.appendFileSync(path.join(f.bundle,row.path),'\n');try{assert.throws(f.verify,/SPEC_BASELINE_DIGEST/);}finally{reset();}});
 await t.test('missing original checkpoint',()=>{const manifest=read(path.join(f.bundle,'manifest.json')),row=manifest.files.find(row=>row.original_ref===f.source.checkpointRef);fs.unlinkSync(path.join(f.bundle,row.path));try{assert.throws(f.verify,/INPUT: 输入不可读: .*feature.supplier\/checkpoint.json/);}finally{reset();}});
 await t.test('owner requires its original digest',()=>{const manifest=read(path.join(f.bundle,'manifest.json'));delete manifest.source.checkpoint_digest;delete manifest.bundle_digest;manifest.bundle_digest=digest(manifest);fs.writeFileSync(path.join(f.bundle,'manifest.json'),json(manifest));try{assert.throws(f.verify,/SCHEMA/);}finally{reset();}});
 const before=inventory(f.bundle);f.verify();assert.deepEqual(inventory(f.bundle),before);
});

test('ordinary source validation keeps current Context and the selected checkpoint binding',async t=>{
 const f=await fixture(t),verify=()=>inspectSpecBaselineSource(f.root,f.source.checkpointRef),before=inventory(f.root);verify();assert.deepEqual(inventory(f.root),before);
 const context=path.join(f.root,'CONTEXT.md'),bytes=fs.readFileSync(context);fs.appendFileSync(context,'\n');try{assert.throws(verify,/CONTEXT_|EVIDENCE_DRIFT/);}finally{fs.writeFileSync(context,bytes);}
 const original=path.join(f.root,f.source.checkpointRef),checkpoint=fs.readFileSync(original);fs.writeFileSync(original,json({...f.source.state,feature_id:'feature.other'}));try{assert.throws(verify,/PLAN_|APPROVAL_CURRENT_INVALID/);}finally{fs.writeFileSync(original,checkpoint);}
 verify();
});

test('verified upstream package and exact working assets remain bound across local consumption',async t=>{
 const f=await fixture(t),seed=makeRoot('sealed-design-policy-','design');t.after(()=>fs.rmSync(seed,{recursive:true,force:true}));
 const root=path.join(f.directory,'target');await designFixture(root,{nativeSeed:seed,productDesign:false});
 const imported=importSpecBaseline({bundle:f.bundle,targetRoot:root}),receipt=read(path.join(root,imported.receipt_ref));
 reconcile(root,'accepted-context.json',{receiptRef:imported.receipt_ref,sourceContextRef:receipt.package_ref+'/payload/files/source-context.snapshot.md'});
 const state={schema_version:1,repository_mode:'project-instance',mode:'route',status:'routing',stage:'stage.entry-triage',feature_id:f.source.state.feature_id,artifacts:{},checks:{},gates:{},context_reconciliation:{status:'reconciled',ref:'accepted-context.json',evidence_refs:['accepted-context.json']},upstream_spec_baseline:{receipt_ref:imported.receipt_ref,receipt_digest:imported.receipt_digest},next_work_unit:'work-unit.entry-triage',ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[]};
 const verify=()=>verifySpecBaselineBinding(state,{root}),before=inventory(path.join(root,receipt.package_ref)),proof=verify();assert.equal(proof.ready_for_agent,false);assert.deepEqual(inventory(path.join(root,receipt.package_ref)),before);
 assert.doesNotThrow(()=>assertStrategicWorkUnitDecision('work-unit.spec-synthesis',state,{root}));
 const sameBytesRef='same-spec-other-ref.md';fs.copyFileSync(path.join(root,proof.specRef),path.join(root,sameBytesRef));
 state.spec_ref=sameBytesRef;assert.throws(()=>assertStrategicWorkUnitDecision('work-unit.spec-synthesis',state,{root}),/目标 checkpoint Spec 与导入基线不一致/);delete state.spec_ref;
 state.artifacts['artifact.spec']={ref:sameBytesRef};assert.throws(()=>assertStrategicWorkUnitDecision('work-unit.spec-synthesis',state,{root}),/目标 checkpoint Spec 与导入基线不一致/);delete state.artifacts['artifact.spec'];
 const file=path.join(root,proof.working.business_ticket_set_ref),bytes=fs.readFileSync(file);
 assert.throws(()=>withValidationPhase({root,purpose:'upstream-working-set'},()=>{verify();fs.appendFileSync(file,'\n');}),/VALIDATION_INPUT_CHANGED/);fs.writeFileSync(file,bytes);
 const receiptFile=path.join(root,imported.receipt_ref),receiptBytes=fs.readFileSync(receiptFile);fs.appendFileSync(receiptFile,'\n');try{assert.throws(verify,/SPEC_BASELINE_DIGEST/);}finally{fs.writeFileSync(receiptFile,receiptBytes);}
 const unknown=path.join(root,receipt.package_ref,'unknown.json');fs.writeFileSync(unknown,'{}');try{assert.throws(verify,/SPEC_BASELINE_CLOSURE/);}finally{fs.unlinkSync(unknown);}
 state.feature_id='feature.other';assert.throws(verify,/SPEC_BASELINE_TARGET/);state.feature_id=f.source.state.feature_id;const restored=inventory(path.join(root,receipt.package_ref));verify();assert.deepEqual(inventory(path.join(root,receipt.package_ref)),restored);
});

// Ordinary source discovery must use the actual Tracker and identify one owner.
test('ordinary local Plan retains strict unique Tracker owner discovery',async t=>{
 const f=await fixture(t),binding=syntheticPlanSourceContext(f.source.plan).binding;
 const record=read(path.join(f.root,binding.approval_ref)),roles=read(path.join(f.root,'.template-spec/agents/digital-human-roles.yaml'));
 const verify=()=>sourceApproval(record,roles,f.root,binding);
 await verify();
 const duplicate=path.join(f.root,'.work/feature.supplier/duplicate.json');fs.copyFileSync(path.join(f.root,f.source.checkpointRef),duplicate);
 try{await assert.rejects(verify,/HANDOFF_PLAN_OWNER_REQUIRED: 来源 Plan 批准缺少唯一已导出的当前 checkpoint/);}finally{fs.unlinkSync(duplicate);}
 const checkpoint=path.join(f.root,f.source.checkpointRef),outside=path.join(f.root,'unregistered-owner/checkpoint.json');
 fs.mkdirSync(path.dirname(outside));fs.renameSync(checkpoint,outside);
 try{await assert.rejects(verify,/HANDOFF_PLAN_OWNER_REQUIRED: 来源 Plan 批准缺少唯一已导出的当前 checkpoint/);}finally{fs.renameSync(outside,checkpoint);fs.rmdirSync(path.dirname(outside));}
 const tracker=path.join(f.root,'.template-spec/agents/issue-tracker.md'),bytes=fs.readFileSync(tracker);
 // The historical default .work remains a compatible scan root after relocation.
 fs.writeFileSync(tracker,bytes.toString().replace('root: .work','root: relocated-work'));
 try{await verify();}finally{fs.writeFileSync(tracker,bytes);}
 fs.writeFileSync(tracker,bytes.toString().replace('root: .work','root: .git'));
 try{await assert.rejects(verify,/PATH: 拒绝越界或 Git 内部路径: \.git/);}finally{fs.writeFileSync(tracker,bytes);}
 fs.unlinkSync(tracker);try{await assert.rejects(verify,/INPUT:.*issue-tracker/);}finally{fs.writeFileSync(tracker,bytes);}
 await verify();
});
