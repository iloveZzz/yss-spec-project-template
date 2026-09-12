// Synthetic file-based mechanism fixtures; never use as real product evidence or approval.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { json, hash, treeDigest, files, read } from '../../lib/strategic-handoff-io.mjs';
import { fixture as strategicFixture } from '../strategic-handoff/fixture.mjs';
import { buildDecisionFixture } from '../user-decision/build-fixture.mjs';
export function baselineFixture(root,{sourceDocumentation=false}={}) {
 const put=(ref,value)=>{mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});writeFileSync(path.join(root,ref),Buffer.isBuffer(value)||typeof value==='string'?value:json(value));};
 const binding=ref=>({ref,digest:hash(readFileSync(path.join(root,ref)))});
 if(sourceDocumentation){put('source/README.md','Original documentation: [external](</original-source/docs/design.md>) and [license](LICENSE).');put('source/docs/raw-evidence.json',{ref:'/original-source/raw.json'});}
 put('source/src/App.vue','<template><button>提交</button></template>');put('source/pnpm-lock.yaml','lockfileVersion: 9');put('build/index.html','<button>提交</button>');
 put('evidence/build.log','SYNTHETIC fixture build passed');put('evidence/capture.log','SYNTHETIC fixture capture passed');put('replay.txt','Synthetic fixture: open /supplier and click 提交; no real browser run.');
 put('api/openapi.json',{openapi:'3.1.0',paths:{'/supplier':{post:{operationId:'submitSupplier'}}}});
 const source={repository_id:'repo.fixture-ui',project_id:'project.fixture-ui',source_commit:'1'.repeat(40),root_ref:'source',digest:treeDigest(root,'source'),lock:binding('source/pnpm-lock.yaml')};
 put('source-manifest.json',{schema_version:1,kind:'existing-ui-source-observation',repository_id:source.repository_id,project_id:source.project_id,source_commit:source.source_commit,source_digest:source.digest,files:files(root,'source').map(ref=>({path:ref.slice(7),digest:hash(readFileSync(path.join(root,ref)))}))});source.manifest=binding('source-manifest.json');
 const execution={schema_version:1,source_commit:source.source_commit,source_digest:source.digest,command:'synthetic fixture',executed_at:'2026-09-12T00:00:00Z',exit_code:0};
 put('build.json',{...execution,lock_digest:source.lock.digest,output:{ref:'build',digest:treeDigest(root,'build')},evidence:[binding('evidence/build.log')]});
 put('actions.txt','Open /supplier; click 提交');put('api/request.json',{body:{name:'fixture'}});put('api/response.json',{id:'fixture'});
 put('api/exchange.json',{schema_version:1,case_id:'submit',source_digest:source.digest,build_digest:binding('build.json').digest,openapi_digest:binding('api/openapi.json').digest,exchanges:[{operation_id:'submitSupplier',method:'POST',url:'http://127.0.0.1:9999/supplier',status:200,executed_at:'2026-09-12T00:00:00Z',request:binding('api/request.json'),response:binding('api/response.json')}]});
 const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(800,16);png.writeUInt32BE(600,20);put('images/submit.png',png);
 const cases=[{case_id:'submit',route:'/supplier',state:'success',viewport:{width:800,height:600},source_refs:['source/src/App.vue'],actions:binding('actions.txt'),image:binding('images/submit.png'),api:binding('api/exchange.json')}];
 put('capture.json',{...execution,build_digest:binding('build.json').digest,openapi_digest:binding('api/openapi.json').digest,ui_change:'none',evidence:[binding('evidence/capture.log')],cases});
 const data={schema_version:1,kind:'existing-ui-baseline',source_kind:'existing-registration',baseline_id:'existing-ui-baseline.supplier',version:'v1',status:'approved',ui_change:'none',source,build:binding('build.json'),capture:binding('capture.json'),openapi:binding('api/openapi.json'),replay:binding('replay.txt'),cases};put('existing-ui-baseline.json',data);
 return {data,put,binding,root};
}
export async function handoffFixture(root,{kind='existing-ui-baseline',backend=true,sourceDocumentation=false}={}) {
 const f=await strategicFixture(root,{handoffVersion:4,impacts:{ui:kind==='prototype',frontend:true,api:backend,backend,data:backend,cross_repo:backend,high_risk:false}});
 f.handoff.schema_version=5;f.handoff.ui_baseline_kind=kind;f.handoff.package_export.schema_version=2;f.handoff.package_export.ui_baseline_kind=kind;
 if(kind==='prototype'){f.sign();return f;}
 const b=baselineFixture(path.join(root,'existing-ui'),{sourceDocumentation});
 b.data.status='ready-for-human';b.put('existing-ui-baseline.json',b.data);
 const source=f.handoff.source,approvals=f.handoff.package_export.approvals;const productGate=approvals.prototype_ref.gate_id;
 delete source.prototype_ref;delete source.visual_baseline_ref;delete approvals.prototype_ref;delete approvals.visual_baseline_ref;delete f.handoff.package_export.prototype;
 source.existing_ui_baseline_ref={baseline_id:b.data.baseline_id,version:'v1',status:'approved',persisted_ref:'existing-ui',manifest_ref:'existing-ui-baseline.json',digest:b.binding('existing-ui-baseline.json').digest,case_ids:['submit']};
 const roles=read(path.join(root,'docs/agents/digital-human-roles.yaml'));
 // Use the source's existing prototype confirmation gate; never manufacture another product gate.
 roles.user_decision_policy.gates=[productGate];f.put('docs/agents/digital-human-roles.yaml',roles);
 // Sign legacy fixture bindings before adding the current user-decision binding.
 f.sign();
 approvals.existing_ui_baseline_ref={record_ref:'approvals/existing-ui.json',gate_id:productGate,digest_kind:'sha256-bytes'};
 const ref='existing-ui/existing-ui-baseline.json',scope=['feature.supplier'];
 const d=buildDecisionFixture(path.join(root,'decisions/ui'),{subjectRef:path.join(root,ref),boundary:productGate,scope});
 const relative=ref=>path.relative(root,ref).split(path.sep).join('/');d.record.request.items[0].subject.ref=ref;d.record.request.requester_source.ref=relative(d.record.request.requester_source.ref);d.present();d.record.responses=[];d.respond();d.record.request.presented_source.ref=relative(d.record.request.presented_source.ref);d.record.responses[0].source.ref=relative(d.record.responses[0].source.ref);d.save();
 f.put('approvals/existing-ui.json',{schema_version:1,gate_id:productGate,decision:'approved',actor_kind:'digital-human',role_id:'role.product-manager',runtime_id:'runtime.generic',principal_ref:'synthetic-maintenance-fixture',subject_ref:ref,approval_scope:scope,user_decision_ref:relative(d.ref),artifact_bindings:[{id:b.data.baseline_id,version:'v1',digest:source.existing_ui_baseline_ref.digest}]});
 const save=()=>{f.put('handoff.yaml',f.handoff);const approval=read(path.join(root,approvals.handoff.record_ref));approval.artifact_bindings[0].digest=hash(readFileSync(path.join(root,'handoff.yaml')));f.put(approvals.handoff.record_ref,approval);};save();
 return {...f,baseline:b,save};
}

// Full unmodified dedicated strategic source policy, captured from its canonical roles document.
// The assets/replies remain synthetic; the policy is not changed to make a gate exist.
export async function dedicatedDesignHandoffFixture(root) {
 const f=await handoffFixture(root),roles=read(new URL('./design-source-roles.json',import.meta.url));
 f.put('docs/agents/digital-human-roles.yaml',roles);
 const approvals=f.handoff.package_export.approvals;
 for(const key of ['business_ticket_set_ref','handoff'])approvals[key].gate_id='gate.strategic-design-handoff-approved';
 const {package_export,status,...delivery}=f.handoff;
 f.put('delivery-content.json',delivery);
 const asset=(ref,version,boundary)=>({ref,version,boundary,digest:hash(readFileSync(path.join(root,ref)))});
 f.put('delivery-scope.json',{schema_version:1,kind:'strategic-delivery-scope',delivery_ref:'delivery-content.json',assets:[asset('delivery-content.json','v1','gate.strategic-design-handoff-approved'),...Object.entries(f.handoff.source).map(([key,ref])=>asset(key==='existing_ui_baseline_ref'?`${ref.persisted_ref}/${ref.manifest_ref}`:ref.persisted_ref,ref.version,approvals[key].gate_id))]});
 f.put('handoff.yaml',f.handoff);
 for(const [key,approval]of Object.entries(approvals)) {
  const record=read(path.join(root,approval.record_ref));record.gate_id=approval.gate_id;
  if(approval.gate_id==='gate.strategic-design-handoff-approved')record.role_id='role.requirements-manager';
  if(key==='handoff')record.artifact_bindings[0].digest=hash(readFileSync(path.join(root,'handoff.yaml')));
  if(roles.user_decision_policy.gates.includes(record.gate_id)) {
   const ref=key==='handoff'?'delivery-scope.json':key==='existing_ui_baseline_ref'?'existing-ui/existing-ui-baseline.json':f.handoff.source[key].persisted_ref;
   const d=buildDecisionFixture(path.join(root,'current-decisions',key),{subjectRef:path.join(root,ref),boundary:record.gate_id,scope:['feature.supplier']});
   const relative=ref=>path.relative(root,ref).split(path.sep).join('/');d.record.request.items[0].subject.ref=ref;d.record.request.requester_source.ref=relative(d.record.request.requester_source.ref);d.present();d.record.responses=[];d.respond();d.record.request.presented_source.ref=relative(d.record.request.presented_source.ref);d.record.responses[0].source.ref=relative(d.record.responses[0].source.ref);d.save();
   Object.assign(record,{subject_ref:ref,approval_scope:['feature.supplier'],user_decision_ref:relative(d.ref)});
  }
  f.put(approval.record_ref,record);
 }
 return {...f,roles};
}
