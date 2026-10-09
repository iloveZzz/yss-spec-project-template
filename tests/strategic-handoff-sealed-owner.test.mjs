import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildPlanFixture} from '../scripts/fixtures/user-decision/plan-fixture.mjs';
import {localizeSyntheticPlanSource,syntheticPlanSourceContext} from '../scripts/fixtures/plan-review-control/source-consumption-fixture.mjs';
import {collectSourceClosure,sourceApproval} from '../scripts/lib/strategic-handoff.mjs';
import {read,hash,withSourceContextSnapshot} from '../scripts/lib/strategic-handoff-io.mjs';
import {approvedSpecFixture,designFixture,localPlanFixture,reconcile} from '../scripts/fixtures/spec-baseline/fixture.mjs';
import {exportSpecBaseline,importSpecBaseline} from '../scripts/fixtures/spec-baseline/package.mjs';
import {verifySpecBaselineBinding,importedApprovalOrigin} from '../scripts/lib/spec-baseline.mjs';

// Synthetic replies exercise the unchanged approved Plan protocol, never real approval.
function fixture(t) {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-sealed-plan-owner-')));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const root=path.join(directory,'source'),sealed=path.join(directory,'sealed');
  const plan=buildPlanFixture(root);localizeSyntheticPlanSource(plan);
  const source=syntheticPlanSourceContext(plan),checkpointRef='docs/.scratch/feature.demo/checkpoint.json';
  const checkpoint={...plan.state,checks:{},gates:{'gate.plan-approved':source.gate}};
  plan.write(checkpointRef,checkpoint);
  const handoffRef='synthetic-handoff.json',config={approvals:{plan:{record_ref:source.binding.approval_ref}},additional_files:[checkpointRef]};
  const handoff={schema_version:5,ui_baseline_kind:'not-applicable',source:{plan_ref:{persisted_ref:source.binding.ref}},evidence_and_version_digests:[],package_export:config};
  plan.write(handoffRef,handoff);
  const captured=collectSourceClosure(root,handoffRef,handoff,config);
  assert.ok(captured.has(checkpointRef));
  // The source may capture its local discovery configuration. This unit tests
  // inherited ownership where only the independently bound sealed CP is present.
  captured.delete('.template-spec/agents/issue-tracker.md');
  for(const [ref,bytes] of captured) {
    const file=path.join(sealed,ref==='CONTEXT.md'?'source-context.snapshot.md':ref);
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);
  }
  const record=read(path.join(sealed,source.binding.approval_ref)),roles=read(path.join(sealed,'.template-spec/agents/digital-human-roles.yaml'));
  const binding={...source.binding,checkpoint_ref:checkpointRef,checkpoint_digest:hash(captured.get(checkpointRef))};
  const consume=(current=binding)=>withSourceContextSnapshot(sealed,()=>sourceApproval(record,roles,sealed,current));
  return {root,sealed,plan,source,checkpoint,checkpointRef,binding,record,roles,consume};
}

function inventory(root) {
  const rows=[];
  const visit=ref=>{
    const file=path.join(root,ref),stat=fs.lstatSync(file);
    rows.push([ref,stat.mode,stat.mtimeMs,stat.isDirectory()?null:hash(fs.readFileSync(file))]);
    if(stat.isDirectory())for(const name of fs.readdirSync(file).sort())visit(path.join(ref,name));
  };
  visit('');return rows;
}

test('sealed approved Plan consumes its explicitly bound checkpoint without uncaptured Tracker',async t=>{
  const f=fixture(t),before=inventory(f.sealed);
  await assert.doesNotReject(f.consume());
  assert.deepEqual(inventory(f.sealed),before,'source bytes, modes and mtimes are unchanged');
  assert.equal(fs.existsSync(path.join(f.sealed,'.template-spec/agents/issue-tracker.md')),false);
});

test('sealed checkpoint binding cannot widen the current approved Plan owner',async t=>{
  const f=fixture(t),file=path.join(f.sealed,f.checkpointRef),bytes=fs.readFileSync(file);
  fs.copyFileSync(path.join(f.sealed,f.source.binding.approval_ref),path.join(f.sealed,'other-approval.json'));
  const altered=async (mutate,pattern)=>{
    const state=structuredClone(f.checkpoint);mutate(state);
    const next=Buffer.from(JSON.stringify(state));fs.writeFileSync(file,next);
    try{await assert.rejects(f.consume({...f.binding,checkpoint_digest:hash(next)}),pattern);}
    finally{fs.writeFileSync(file,bytes);}
  };
  await t.test('different feature owner',()=>altered(state=>{state.feature_id='feature.other';},/消费范围或作者不匹配/));
  await t.test('wrong gate approval reference',()=>altered(state=>{state.gates['gate.plan-approved'].approval_ref='other-approval.json';},/未绑定当前批准引用/));
  await t.test('conflicting primary approval reference',()=>altered(state=>{state.plan_approval_ref='other-approval.json';},/聚合批准引用冲突/));
  await t.test('future unapproved checkpoint',()=>altered(state=>{state.gates['gate.plan-approved'].status='ready-for-human';},/未绑定当前批准引用/));
  await t.test('raw checkpoint drift',async()=>{
    fs.writeFileSync(file,Buffer.concat([bytes,Buffer.from('\n')]));
    try{await assert.rejects(f.consume(),/原始字节漂移/);}finally{fs.writeFileSync(file,bytes);}
  });
  await t.test('missing original checkpoint',()=>assert.rejects(f.consume({...f.binding,checkpoint_ref:'future-checkpoint.json'}),/文件不可读: future-checkpoint/));
  await t.test('same approval bytes cannot choose another reference',()=>assert.rejects(f.consume({...f.binding,approval_ref:'other-approval.json'}),/未绑定当前批准引用/));
  await t.test('owner requires its original digest',()=>assert.rejects(f.consume({...f.binding,checkpoint_digest:undefined}),/原始字节漂移/));
  const before=inventory(f.sealed);await assert.doesNotReject(f.consume());assert.deepEqual(inventory(f.sealed),before);
});

test('ordinary local Plan retains strict unique Tracker owner discovery',async t=>{
  const f=fixture(t),before=inventory(f.root);
  assert.equal(fs.existsSync(path.join(f.root,'source-context.snapshot.md')),false,'ordinary local Plan reads its original CONTEXT');
  await assert.doesNotReject(sourceApproval(f.record,f.roles,f.root,f.source.binding));
  assert.deepEqual(inventory(f.root),before);
  const handoffRef='synthetic-handoff.json',handoff=read(path.join(f.root,handoffRef));
  const captured=collectSourceClosure(f.root,handoffRef,handoff,handoff.package_export);
  const trackerRef='.template-spec/agents/issue-tracker.md';
  assert.deepEqual(captured.get(trackerRef),fs.readFileSync(path.join(f.root,trackerRef)),'capture the original local owner discovery configuration');
  const snapshot=path.join(path.dirname(f.root),'local-snapshot');
  for(const [ref,bytes]of captured){const file=path.join(snapshot,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}
  const snapshotBefore=inventory(snapshot);
  await assert.doesNotReject(sourceApproval(f.record,f.roles,snapshot,f.source.binding));
  assert.deepEqual(inventory(snapshot),snapshotBefore,'a reconstructed local owner remains uniquely qualified without writing');
  const context=path.join(f.root,'CONTEXT.md'),contextBytes=fs.readFileSync(context);
  fs.writeFileSync(context,Buffer.concat([contextBytes,Buffer.from('\n')]));
  try{await assert.rejects(sourceApproval(f.record,f.roles,f.root,f.source.binding),/源 Plan 当前消费依据不匹配/);}
  finally{fs.writeFileSync(context,contextBytes);}
  await assert.doesNotReject(sourceApproval(f.record,f.roles,f.root,f.source.binding));
  const tracker=path.join(f.root,'.template-spec/agents/issue-tracker.md'),trackerBytes=fs.readFileSync(tracker);
  fs.unlinkSync(tracker);
  try{await assert.rejects(sourceApproval(f.record,f.roles,f.root,f.source.binding),/ENOENT.*issue-tracker/);}
  finally{fs.writeFileSync(tracker,trackerBytes);}
  f.plan.write('docs/.scratch/feature.demo/duplicate.json',f.checkpoint);
  await assert.rejects(sourceApproval(f.record,f.roles,f.root,f.source.binding),/APPROVAL_CONTEXT_REQUIRED.*找到 2 个/);
});

test('current local reapproval preserves a verified upstream package as immutable evidence',async t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-local-sealed-closure-')));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const sourceRoot=path.join(directory,'source'),root=path.join(directory,'local'),bundle=path.join(directory,'baseline');
  const source=await approvedSpecFixture(sourceRoot,{productDesign:false}),local=await designFixture(root,{productDesign:false});
  await exportSpecBaseline({sourceRoot,checkpointRef:source.checkpointRef,output:bundle});
  const imported=importSpecBaseline({bundle,targetRoot:root}),plan=localPlanFixture(local);
  const context=local.handoff.source.spec_ref.approval_context,approvalRef=local.handoff.package_export.approvals.spec_ref.record_ref;
  const bound=ref=>({ref,digest:hash(fs.readFileSync(path.join(root,ref))).slice(7)});
  const basis=[...context.basis,bound(context.subject_ref),bound(approvalRef)];
  const gate={...context,status:'approved',approval_ref:approvalRef,basis,reason:'Synthetic current local Spec approval',evidence_refs:basis.map(row=>row.ref),evidence:{'evidence.approval-record':[approvalRef]}};
  delete gate.review_package;
  const checkpoint={...plan.state,stage:'stage.entry-triage',upstream_spec_baseline:{receipt_ref:imported.receipt_ref,receipt_digest:imported.receipt_digest},context_reconciliation:{status:'reconciled',ref:'reconciliation.json'},artifacts:{'artifact.spec':{ref:local.handoff.source.spec_ref.persisted_ref,status:'approved'}},gates:{...plan.state.gates,'gate.spec-baseline-approved':gate}};
  const proof=verifySpecBaselineBinding(checkpoint,{root});
  const checkpointRef='local-current.json',handoffRef='synthetic-closure.json';
  local.put(checkpointRef,checkpoint);
  const handoff={schema_version:5,ui_baseline_kind:'not-applicable',source:{current_checkpoint:{persisted_ref:checkpointRef}},evidence_and_version_digests:[]},config={approvals:{},additional_files:[]};
  local.put(handoffRef,handoff);
  const collect=()=>collectSourceClosure(root,handoffRef,handoff,config),before=inventory(root),captured=collect();
  const snapshot=path.join(directory,'local-snapshot');
  for(const [ref,bytes]of captured){const file=path.join(snapshot,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}
  const snapshotBefore=inventory(snapshot);
  assert.doesNotThrow(()=>verifySpecBaselineBinding(read(path.join(snapshot,checkpointRef)),{root:snapshot}),'captured source is sufficient to revalidate the original upstream binding');
  assert.deepEqual(inventory(snapshot),snapshotBefore,'reopening the captured source changes no bytes, modes or mtimes');
  for(const ref of Object.values(proof.working.assets))assert.deepEqual(captured.get(ref),fs.readFileSync(path.join(root,ref)),'capture the exact verified working-set asset bytes');
  for(const file of proof.manifest.files)assert.deepEqual(captured.get(`${proof.receipt.package_ref}/${file.path}`),fs.readFileSync(path.join(root,proof.receipt.package_ref,file.path)));
  assert.ok(captured.has(`${proof.receipt.package_ref}/manifest.json`));
  assert.deepEqual(inventory(root),before,'collection preserves source bytes, modes and mtimes');
  await t.test('inherited origin preserves its exact verified working assets',()=>{
    const reconciliationRef='inherited-reconciliation.json',inheritedRef='synthetic-inherited-closure.json';
    reconcile(root,reconciliationRef,{receiptRef:imported.receipt_ref,sourceContextRef:`${proof.receipt.package_ref}/payload/files/source-context.snapshot.md`});
    const binding={persisted_ref:proof.specRef,approval_context:{source_baseline:{receipt_ref:imported.receipt_ref,receipt_digest:imported.receipt_digest,source_ref:proof.source.spec_ref,context_reconciliation_ref:reconciliationRef}}};
    const inherited={schema_version:5,ui_baseline_kind:'not-applicable',source:{spec_ref:binding},evidence_and_version_digests:[]};
    local.put(inheritedRef,inherited);
    const inheritedBefore=inventory(root),inheritedProof=importedApprovalOrigin(root,binding),inheritedCaptured=collectSourceClosure(root,inheritedRef,inherited,config);
    for(const ref of Object.values(inheritedProof.working.assets))assert.deepEqual(inheritedCaptured.get(ref),fs.readFileSync(path.join(root,ref)));
    const inheritedSnapshot=path.join(directory,'inherited-snapshot');
    for(const [ref,bytes]of inheritedCaptured){const file=path.join(inheritedSnapshot,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}
    const inheritedSnapshotBefore=inventory(inheritedSnapshot);
    assert.doesNotThrow(()=>importedApprovalOrigin(inheritedSnapshot,binding),'the inherited source closure revalidates without uncaptured working dependencies');
    assert.deepEqual(inventory(inheritedSnapshot),inheritedSnapshotBefore);
    assert.deepEqual(inventory(root),inheritedBefore);
  });
  const alteredFile=async(ref,change,pattern)=>{
    const file=path.join(root,ref),bytes=fs.readFileSync(file);fs.writeFileSync(file,change(bytes));
    try{assert.throws(collect,pattern);}finally{fs.writeFileSync(file,bytes);}
  };
  await t.test('receipt raw bytes drift',()=>alteredFile(imported.receipt_ref,bytes=>Buffer.concat([bytes,Buffer.from('\n')]),/receipt 字节漂移/));
  await t.test('unknown package inventory',()=>{
    const file=path.join(root,proof.receipt.package_ref,'unknown.json');fs.writeFileSync(file,'{}');
    try{assert.throws(collect,/未登记文件/);}finally{fs.unlinkSync(file);}
  });
  await t.test('stale local Context',()=>alteredFile('CONTEXT.md',bytes=>Buffer.concat([bytes,Buffer.from('\n')]),/lifecycle-control-blocked: 证据过期: CONTEXT.md/));
  await t.test('wrong current feature',()=>alteredFile(checkpointRef,()=>Buffer.from(JSON.stringify({...checkpoint,feature_id:'feature.other'})),/feature_id/));
  await t.test('wrong receipt version',()=>alteredFile(imported.receipt_ref,bytes=>{
    const receipt=JSON.parse(bytes);receipt.version='v2';const changed=Buffer.from(JSON.stringify(receipt));
    local.put(checkpointRef,{...checkpoint,upstream_spec_baseline:{...checkpoint.upstream_spec_baseline,receipt_digest:hash(changed)}});return changed;
  },/路径\/身份不一致/));
  local.put(checkpointRef,checkpoint);
  const finalBefore=inventory(root);collect();assert.deepEqual(inventory(root),finalBefore);
});
