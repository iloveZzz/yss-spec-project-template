import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {hash} from '../../lib/strategic-handoff-io.mjs';
import {validateApiContractDecision,migrateApiContractDecision,prepareApiContractDecision} from '../../lib/api-contract-decision.mjs';
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'api-v2-'));
 const write=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));return{ref,digest:hash(fs.readFileSync(path.join(root,ref)))};};
 const assessment=write('assessment.json',{}),evidence=write('evidence.md','synthetic evidence only'),extra=write('extra.md','legacy branch evidence');
 const draft=write('docs/.scratch/synthetic/api/synthetic.yaml','openapi: 3.1.0\ninfo: {title: synthetic, version: v1}\npaths: {}\n');
 write('pnpm-lock.yaml',"lockfileVersion: '9.0'\npackages:\n  '@redocly/cli@2.0.0': {}\n");
 const validation=write('validation.json',{schema_version:1,kind:'openapi-draft-validation',template:false,status:'passed',draft:{ref:draft.ref,sha256:draft.digest,oas_version:'3.1.0'},toolchain:{package:'@redocly/cli',version:'2.0.0',lockfile_ref:'pnpm-lock.yaml',command:'pnpm exec redocly lint docs/.scratch/synthetic/api/synthetic.yaml',exit_code:0,executed_at:'2026-09-22T00:00:00Z',evidence_ref:evidence.ref},checks:Object.fromEntries(['single_document','oas_3_1','ref_resolution','path_parameters','operation_ids','lint'].map(k=>[k,'passed']))});
 const record={schema_version:1,kind:'openapi-draft-review',result:'approved',blocking_findings:[],draft_ref:draft.ref,draft_digest:draft.digest,evidence_refs:[evidence.ref]};
 const review=write('review.json',record);
 const v1={schema_version:1,kind:'api-contract-decision',decision_id:'api.synthetic',decision_version:'v1',status:'approved',current_version:true,impact:'required',assessment_ref:assessment.ref,assessment_digest:assessment.digest,evidence_refs:[evidence.ref],openapi:{id:'api',version:'v1',...draft},validation_record:validation,draft_review:{...review,...record,evidence_refs:[extra.ref]},freeze:{version:'v1',frozen_at:'2026-09-22T00:01:00Z',draft_ref:draft.ref,draft_digest:draft.digest}};
 delete v1.draft_review.schema_version;delete v1.draft_review.kind;
 const binding={...write('v1.json',v1),version:'v1',impact:'required'};
 return{root,write,v1,binding,record,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('v2 migration preserves old bytes and extra evidence, reduces fields, and never inherits approval',t=>{
 const f=fixture();try{
 const bytes=fs.readFileSync(path.join(f.root,'v1.json'));
 const migrated=migrateApiContractDecision(f.binding,{root:f.root,version:'v2'});
 assert.equal(migrated.status,'draft');assert.equal(migrated.schema_version,2);assert.ok(migrated.evidence_refs.includes('extra.md'));
 assert.deepEqual(fs.readFileSync(path.join(f.root,'v1.json')),bytes);
 const count=x=>x&&typeof x==='object'?Object.entries(x).reduce((n,[k,v])=>n+(!Array.isArray(x)?1:0)+count(v),0):0;
 assert.ok(count(migrated)<=count(f.v1)*.8);t.diagnostic(JSON.stringify({v1_fields:count(f.v1),v2_fields:count(migrated),reduction:1-count(migrated)/count(f.v1)}));
 let binding={...f.write('v2.json',migrated),version:'v2',impact:'required'};
 assert.throws(()=>validateApiContractDecision(binding,{root:f.root}),/批准|approved/);
 migrated.status='approved';binding={...f.write('v2.json',migrated),version:'v2',impact:'required'};
 const result=validateApiContractDecision(binding,{root:f.root});assert.deepEqual(result.openapi,f.v1.openapi);assert.equal(result.binding.digest,binding.digest);assert.equal(result.decision.draft_review.result,'approved');
 assert.throws(()=>migrateApiContractDecision(f.binding,{root:f.root,version:'v1'}),/版本/);
 migrated.freeze.version='v2';binding={...f.write('bad-freeze.json',migrated),version:'v2',impact:'required'};assert.throws(()=>validateApiContractDecision(binding,{root:f.root}),/Freeze/);
 }finally{f.cleanup();}
});
test('preparation generates all digests and rejects conflicting sources; actual review governs consumption',()=>{
 const f=fixture();try{
 const draft=prepareApiContractDecision({decision_id:'api.new',decision_version:'v1',impact:'not-applicable',assessment_ref:'assessment.json',evidence_refs:['evidence.md'],reason:'No public API change'},{root:f.root});assert.equal(draft.assessment_digest,f.v1.assessment_digest);assert.equal(draft.status,'draft');
 assert.throws(()=>prepareApiContractDecision({...draft,assessment_digest:'sha256:'+'0'.repeat(64)},{root:f.root}),/冲突/);
 const selected={decision_id:'api.new',decision_version:'v2',impact:'required',assessment_ref:f.v1.assessment_ref,evidence_refs:f.v1.evidence_refs,openapi:{id:f.v1.openapi.id,ref:f.v1.openapi.ref,version:f.v1.openapi.version},validation_record:{ref:f.v1.validation_record.ref},draft_review:{ref:f.v1.draft_review.ref},freeze:{version:'v1',frozen_at:f.v1.freeze.frozen_at}};
 const prepared=prepareApiContractDecision(selected,{root:f.root});assert.deepEqual(prepared.openapi,f.v1.openapi);assert.equal(prepared.draft_review.digest,f.v1.draft_review.digest);assert.equal(prepared.validation_record.digest,f.v1.validation_record.digest);
 assert.throws(()=>prepareApiContractDecision({...selected,assessment_digest:'sha256:'+'0'.repeat(64),draft_review:{ref:'missing-review.json'}},{root:f.root}),error=>error.conflicts.length===2&&error.message.includes('assessment')&&error.message.includes('missing-review'));
 assert.throws(()=>prepareApiContractDecision({...selected,schema_version:1},{root:f.root}),/显式 migrate/);
 const migrated=migrateApiContractDecision(f.binding,{root:f.root,version:'v2'});migrated.status='approved';
 f.record.result='rejected';migrated.draft_review=f.write('review.json',f.record);
 const binding={...f.write('v2.json',migrated),version:'v2',impact:'required'};assert.throws(()=>validateApiContractDecision(binding,{root:f.root}),/实际记录未批准/);
 }finally{f.cleanup();}
});
test('both API versions reject mismatched Drafts, unresolved review findings, missing evidence and stale versions',()=>{
 for(const version of [1,2])for(const scenario of ['draft','findings','evidence','version']){
  const f=fixture();try{
   const decision=version===1?structuredClone(f.v1):migrateApiContractDecision(f.binding,{root:f.root,version:'v2'});decision.status='approved';
   if(scenario==='draft')f.record.draft_ref='another.yaml';
   if(scenario==='findings')f.record.blocking_findings=['unresolved'];
   if(scenario==='evidence')fs.unlinkSync(path.join(f.root,'evidence.md'));
   const actualReview=f.write('review.json',f.record);Object.assign(decision.draft_review,actualReview);
   const binding={...f.write('candidate.json',decision),version:scenario==='version'?'v99':decision.decision_version,impact:'required'};
   assert.throws(()=>validateApiContractDecision(binding,{root:f.root}),scenario==='draft'?/未绑定/:scenario==='findings'?/阻断/:scenario==='evidence'?/ENOENT|不可读/:/版本/);
  }finally{f.cleanup();}
 }
});
