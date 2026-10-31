import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import childProcess, {spawnSync} from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {installedFixture} from './installed-fixture.mjs';
import {professionalPlanFixture} from './professional-plan-fixture.mjs';
import {buildDecisionFixture} from '../../lib/testing/user-decision-fixture.mjs';
import {validateApprovalRecordFile} from '../../lib/native-approval.mjs';
import {assertUserDecisionRequirement,assertWorkUnitUserDecision,compareContinuationAssets} from '../../lib/native-user-decision.mjs';
const bin=process.env.YSS_NATIVE_BINARY;
assert.ok(bin&&path.isAbsolute(bin));
const fixture=installedFixture('backend'),{root,write,asset}=fixture,results=[];
const originalSpawn=childProcess.spawnSync;
childProcess.spawnSync=(file,args,options)=>{const observed=originalSpawn(file,args,options);if(file===bin)results.push({label:'observed-native-spawn',argv:[file,...args],cwd:options?.cwd??process.cwd(),exit:observed.status,stdout:String(observed.stdout??''),stderr:String(observed.stderr??'')});return observed;};
syncBuiltinESMExports();
const hash=x=>createHash('sha256').update(x).digest('hex');
const run=(label,args,expected='OK')=>{const argv=[...args,'--root',root,'--json'],r=spawnSync(bin,argv,{encoding:'utf8',maxBuffer:64*1024*1024});results.push({label,argv:[bin,...argv],cwd:root,exit:r.status,stdout:r.stdout,stderr:r.stderr});const parsed=JSON.parse(r.stdout);assert.equal(parsed.code,expected,`${label}: ${JSON.stringify(parsed.result?.diagnostics)}`);assert.equal(r.status===0,expected==='OK',label);return parsed.result;};
try{
 write('input.json',{scope:{impacted_areas:['wording']},status:'draft'});
 write('reconciliation.json',{status:'reconciled'});
 const task=fixture.draftTask({taskRef:'task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',impacts:['wording'],inputs:['input.json'],outputs:['drafts/design.json'],paths:['drafts']});
 const dimensions=['business_scope','acceptance','contract_commitments','authorization','risk_acceptance','quality','external_commitments'];
 const design=Object.fromEntries(dimensions.map(k=>[k,[`已批准${k}`]]));design.technical={choice:'current implementation detail'};design.evidence=[];
 write('drafts/design.json',JSON.stringify(design).replace('"current implementation detail"','9007199254740993'));
 fixture.finishTask(task);
 const candidate=asset('drafts/design.json');
 const reviewTask=fixture.draftTask({taskRef:'review-task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',impacts:['wording'],inputs:['input.json','task.json'],outputs:['reviews/result.json'],paths:['reviews']});
 const selected=reviewTask.skill_source,policy=reviewTask.policy;
 reviewTask.execution_state='Reviewer';
 reviewTask.review_context={candidate,policy,check_ids:selected.check_ids,approval_scope:task.allowed_write_paths,basis:[asset('task.json')],review:{mode:'self-check',provenance:reviewTask.provenance}};
 write('reviews/result.json',{status:'reconciled'});
 fixture.finishTask(reviewTask,{scope:['drafts'],candidate});
 run('raw-output-review',['contract','verify','--kind','task','--file','review-task.json']);
 const record={schema_version:3,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'agent',subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:[asset('task.json')],evidence_refs:[reviewTask.provenance.execution_ref],review_task_ref:'review-task.json',review_task_digest:asset('review-task.json').digest,check_ids:selected.check_ids,policy,review:reviewTask.review_context.review};write('approval.json',record);
 const expected={boundary:record.gate_id,subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:record.basis};write('expected.json',expected);
 run('approval3',['evidence','verify','--kind','approval','--file','approval.json','--expected','expected.json','--require-approved']);
 assert.ok(validateApprovalRecordFile('approval.json',{root,expected}));
 assert.deepEqual(assertWorkUnitUserDecision('work-unit.technical-design',{}, {root}),[]);
 assert.throws(()=>assertWorkUnitUserDecision('work-unit.unknown',{}, {root}), /缺少当前工作单元/);
 const old=structuredClone(design);old.technical.choice=9007199254740992;write('before.json',old);
 const comparison=compareContinuationAssets(asset('before.json'),candidate,{root});assert.equal(comparison.read_only,true);assert.equal(comparison.execution_allowed,false);assert.equal(comparison.difference.changes.length,1);assert.match(comparison.difference_json,/9007199254740993/);write('delta.json',comparison.difference_json);assert.match(fs.readFileSync(path.join(root,'delta.json'),'utf8'),/9007199254740993/);
 const mandate={schema_version:2,kind:'delivery-authorization',basis:[{ref:candidate.ref,digest:asset('before.json').digest}],external_rules:{state:'none-known'},targets:[{boundary:'gate.engineering-contract-approved',subject_ref:candidate.ref,scope:['drafts'],decision_basis:Object.fromEntries(dimensions.map(k=>[k,[`/${k}`]])),continuation_paths:{'implementation-detail':['/technical'],'evidence-supplement':['/evidence']}}]};write('mandate.json',mandate);
 const user=buildDecisionFixture(root,{boundary:'delivery-scope',scope:['drafts'],subjectRef:path.join(root,'mandate.json')});
 const proof={schema_version:2,kind:'approved-scope-continuation-v2',boundary:'gate.engineering-contract-approved',scope:['drafts'],subject:candidate,basis:[asset('task.json')],source:user.requirement,comparison:{before:asset('before.json'),after:candidate,differences:[{...asset('delta.json'),classification:'implementation-detail',reason:'Only original authorized technical choice changed'}],affected_check_ids:selected.check_ids,material_changes:[],decision_basis_unchanged:true},verification_results:reviewTask.verification_results,review:reviewTask.review_context.review,external_rules:{state:'none-known'}};write('continuation.json',proof);
 const requirement={boundary:proof.boundary,scope:['drafts'],subject_ref:candidate.ref,continuation_ref:'continuation.json'};write('requirements.json',requirement);
 run('continuation2',['evidence','verify','--kind','user-decision','--file','continuation.json','--requirements','requirements.json','--continuation']);
 assert.equal(assertUserDecisionRequirement(requirement,{root}).continued,true);
 const expanded={...proof,scope:['drafts','elsewhere']};write('expanded-continuation.json',expanded);write('expanded-requirements.json',{...requirement,scope:expanded.scope,continuation_ref:'expanded-continuation.json'});
 run('expanded-scope',['evidence','verify','--kind','user-decision','--file','expanded-continuation.json','--requirements','expanded-requirements.json','--continuation'],'user-decision-continuation-invalid');
 const responses=structuredClone(user.record.responses);user.record.responses=[];user.save();
 run('missing-source-reply',['evidence','verify','--kind','user-decision','--file','continuation.json','--requirements','requirements.json','--continuation'],'user-decision-response-required');
 user.record.responses=responses;user.save();
 const external={...proof,external_rules:{state:'known-unverifiable',requirements:[{rule_ref:'test-only:external-rule',scope:['drafts'],reason:'source unavailable'}]}};
 write('external-continuation.json',external);write('external-requirements.json',{...requirement,continuation_ref:'external-continuation.json'});
 run('unverifiable-external-rule',['evidence','verify','--kind','user-decision','--file','external-continuation.json','--requirements','external-requirements.json','--continuation'],'EXTERNAL_REQUIREMENT');
 const protectedMandate=structuredClone(mandate);protectedMandate.targets[0].decision_basis.quality=['/technical/choice'];delete protectedMandate.targets[0].continuation_paths['implementation-detail'];write('protected-mandate.json',protectedMandate);
 const protectedUser=buildDecisionFixture(path.join(root,'protected-source'),{boundary:'delivery-scope',scope:['drafts'],subjectRef:path.join(root,'protected-mandate.json')});
 write('protected-delta.json',{schema_version:1,changes:[]});const protectedProof=structuredClone(proof);protectedProof.source=protectedUser.requirement;protectedProof.comparison.differences=[{...asset('protected-delta.json'),classification:'presentation-only',reason:'claim representation only despite changed protected integer'}];write('protected-continuation.json',protectedProof);write('protected-requirements.json',{...requirement,continuation_ref:'protected-continuation.json'});
 run('protected-large-integer',['evidence','verify','--kind','user-decision','--file','protected-continuation.json','--requirements','protected-requirements.json','--continuation'],'user-decision-continuation-invalid');
 const originalDelta=fs.readFileSync(path.join(root,'delta.json'));
 write('delta.json',comparison.difference);proof.comparison.differences[0].digest=asset('delta.json').digest;write('continuation.json',proof);
 run('rounded-js-delta',['evidence','verify','--kind','user-decision','--file','continuation.json','--requirements','requirements.json','--continuation'],'user-decision-continuation-invalid');
 write('delta.json',{schema_version:1,changes:[]});proof.comparison.differences[0].digest=asset('delta.json').digest;write('continuation.json',proof);
 run('omitted-delta',['evidence','verify','--kind','user-decision','--file','continuation.json','--requirements','requirements.json','--continuation'],'user-decision-continuation-invalid');
 fs.writeFileSync(path.join(root,'delta.json'),originalDelta);proof.comparison.differences[0].digest=asset('delta.json').digest;write('continuation.json',proof);
 user.respond({text:'撤回批准',decision:'revoked',time:'2026-09-05T01:04:00Z'});user.save();
 run('revoked-source',['evidence','verify','--kind','user-decision','--file','continuation.json','--requirements','requirements.json','--continuation'],'user-decision-not-approved');
 fs.rmSync(path.join(root,'drafts/design.json'));
 write('bundle-input/domain.json',{title:'domain strategy'});write('bundle-input/stage.json',{title:'stage decision'});
 const subjects={'check.domain-strategy-approved':'bundle-input/domain.json','check.stage-decision-package-approved':'bundle-input/stage.json'};
 const professional=professionalPlanFixture(fixture,{subjects});
 const validated=fixture.run('current-multi-subject-bundle',['evidence','verify','--kind','approval','--file','professional/bundle.json','--checkpoint',professional.cpRef,'--require-approved']);
 assert.deepEqual(Object.fromEntries(professional.bundle.reviews.map(row=>[row.gate_id,row.subject_ref])),subjects);
 for(const [id,ref] of Object.entries(subjects))assert.equal(professional.current.checks[id].subject_ref,ref);
 assert.deepEqual(validated.coverage.approval_validated.map(row=>row.gate_id).sort(),Object.keys(subjects).sort());
 const bundleBytes=fixture.read('professional/bundle.json'),checkpointBytes=fixture.read(professional.cpRef);
 for(const [label,mutate,code] of [
  ['rejected',b=>{b.reviews[0].decision='rejected';},'APPROVAL_CURRENT_INVALID'],
  ['duplicate',b=>{b.reviews[1].gate_id=b.reviews[0].gate_id;},'APPROVAL_BUNDLE_INVALID'],
  ['scope',b=>{b.reviews[0].approval_scope=['elsewhere'];},'APPROVAL_CURRENT_INVALID'],
  ['subject',b=>{b.reviews[0].subject_ref=b.reviews[1].subject_ref;b.reviews[0].subject_digest=b.reviews[1].subject_digest;},'APPROVAL_CURRENT_INVALID'],
  ['task-digest',b=>{b.reviews[0].review_task_digest='0'.repeat(64);},'APPROVAL_BUNDLE_INVALID'],
  ['missing-evidence',b=>{b.reviews[0].evidence_refs=[];},'SCHEMA'],
  ['empty',b=>{b.reviews=[];},'SCHEMA'],
 ]){
  const altered=structuredClone(professional.bundle);mutate(altered);const ref=`bundle-probe/${label}.json`;write(ref,altered);
  fixture.run(`bundle-${label}`,['evidence','verify','--kind','approval','--file',ref,'--checkpoint',professional.cpRef,'--require-approved'],code);
 }
 const missing=structuredClone(professional.bundle);missing.reviews.pop();const missingRef='bundle-probe/missing.json';write(missingRef,missing);
 const subset=fixture.run('bundle-present-row-only',['evidence','verify','--kind','approval','--file',missingRef,'--checkpoint',professional.cpRef,'--require-approved']);
 assert.deepEqual(subset.coverage.approval_validated.map(row=>row.gate_id),[missing.reviews[0].gate_id]);assert.equal(subset.execution_authorization,'not-evaluated');
 fixture.run('bundle-missing-required-boundary',['evidence','verify','--kind','approval','--file',missingRef,'--checkpoint',professional.cpRef,'--gate',professional.bundle.reviews[1].gate_id,'--require-approved'],'APPROVAL_BUNDLE_INVALID');
 const partialEntry=structuredClone(professional.entry);
 for(const item of partialEntry.basis)if(item.ref==='professional/bundle.json'){item.ref=missingRef;item.digest=asset(missingRef).digest;}
 for(const check of Object.values(partialEntry.internal_checks))if(check.approval_ref==='professional/bundle.json')check.approval_ref=missingRef;
 const entryRef='bundle-probe/plan-entry.json';write(entryRef,partialEntry);
 const partialCheckpoint=structuredClone(professional.current);partialCheckpoint.plan_review_ref=entryRef;const cpRef='bundle-probe/checkpoint.json';write(cpRef,partialCheckpoint);
 const partial=spawnSync(bin,['contract','verify','--kind','plan-entry','--file',cpRef,'--root',root,'--json'],{encoding:'utf8',maxBuffer:64*1024*1024});
 const partialResult=JSON.parse(partial.stdout);assert.equal(partial.status,1);assert.ok(['PLAN_REVIEW_COVERAGE_REQUIRED','APPROVAL_BUNDLE_INVALID'].includes(partialResult.code),JSON.stringify(partialResult.result?.diagnostics));
 assert.deepEqual(fixture.read('professional/bundle.json'),bundleBytes);assert.deepEqual(fixture.read(professional.cpRef),checkpointBytes);
 console.log('Native approval3 and real-source continuation2 plus Node transport passed');
}finally{
 childProcess.spawnSync=originalSpawn;syncBuiltinESMExports();
 if(process.env.YSS_APPROVAL_RECEIPT)fs.writeFileSync(process.env.YSS_APPROVAL_RECEIPT,JSON.stringify({binary:bin,digest:hash(fs.readFileSync(bin)),pinned:false,root,results},null,2));
 fixture.cleanup();
}
