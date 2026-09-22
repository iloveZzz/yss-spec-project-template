// Synthetic mechanism test data only; not user approval or production evidence.
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {readSliceContract} from '../../lib/slice-contract.mjs';
import {validateBackendReview} from '../../lib/backend-review.mjs';
import {captureMaintenanceCandidate} from '../../lib/maintenance-candidate.mjs';
import {validateNextRoute} from '../../lib/lifecycle-transition.mjs';
import {compileStandardsCoverage} from '../../lib/backend-standards-coverage.mjs';
import path from 'node:path';
import {treeHash} from '../../lib/skill-supply-chain.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function terminalReviewFixture() {
 const previous=process.env.TMPDIR;process.env.TMPDIR=fs.realpathSync(tmpdir());
 let f;try{f=pilotFixture();}finally{if(previous===undefined)delete process.env.TMPDIR;else process.env.TMPDIR=previous;}
 f.write('api.yaml',{openapi:'3.1.0',info:{title:'Synthetic API',version:'1'},paths:{'/suppliers':{post:{operationId:'submitSupplier',responses:{'200':{description:'OK'}}}}}});
 f.contract.basis.openapi_freeze.digest='sha256:'+sha(fs.readFileSync(`${f.root}/api.yaml`));
 const {binding,decision,checkpoint}=f.approve();
 const relative=ref=>path.relative(f.root,ref).split(path.sep).join('/');
 decision.record.request.items[0].subject.ref='v3-scope.json';
 decision.record.request.requester_source.ref=relative(decision.record.request.requester_source.ref);
 decision.present();decision.record.responses=[];decision.respond();
 decision.record.request.presented_source.ref=relative(decision.record.request.presented_source.ref);
 decision.record.responses[0].source.ref=relative(decision.record.responses[0].source.ref);decision.save();
 checkpoint.human_review.user_decisions=[{...decision.requirement,subject_ref:'v3-scope.json',user_decision_ref:relative(decision.ref)}];
 f.write(binding.approval_ref,checkpoint);
 const before=f.git('rev-parse','HEAD');fs.appendFileSync(path.join(f.project,'.git/info/exclude'),'\nmvnw\n');

 const contract=readSliceContract(binding.ref,{root:f.root}).contract;
 const tree=f.git('rev-parse','HEAD^{tree}');
 const input={scope_kind:'change',slice_contract_ref:binding.ref,approval_ref:binding.approval_ref,project_root:f.project,review_mode:'committed',review_base_ref:before,implementation_candidate_ref:f.git('rev-parse','HEAD'),candidate_digest:tree,implementation_actor_id:'implementer',implementation_instance_id:'worker-session',actual_skill_impacts:[]};
 f.write('checks.log','Synthetic mechanism evidence, not certification.');
 const record={skill:'code-review',result:'completed',contract_digest:binding.digest,candidate_digest:tree,reviewer:{actor_id:'reviewer',runtime_id:'runtime.generic',instance_id:'review-session'},implementer:{actor_id:'implementer',runtime_id:'runtime.generic',instance_id:'worker-session'},axes:{Standards:'passed',Spec:'passed'},findings:[],constraint_results:[],verification_results:[{command:'synthetic-check',executed_at:new Date().toISOString(),exit_code:0,candidate_digest:tree,evidence_ref:'checks.log',evidence_digest:sha(fs.readFileSync(`${f.root}/checks.log`))}]};
 for(const skill of new Set([...contract.resolution.required_skills,'yss-cache'])) {
  fs.cpSync(new URL(`../../../.agents/skills/${skill}`,import.meta.url),path.join(f.root,'.agents/skills',skill),{recursive:true});
 }
 f.write('skills-lock.json',{version:3,skills:{shared:Object.fromEntries([...contract.resolution.required_skills,'yss-cache'].map(skill=>[skill,{effectiveHash:treeHash(path.join(f.root,'.agents/skills',skill))}]))}});
 const refreshCoverage=()=>{record.constraint_results=[];
 const coverage=compileStandardsCoverage({root:f.root,projectRoot:f.project,contract,scope_kind:'change',comparison_ref:before});
 f.write('coverage.json',coverage);input.standards_coverage_ref='coverage.json';input.standards_coverage_digest=sha(fs.readFileSync(`${f.root}/coverage.json`));
 for(const rule of coverage.constraints)record.constraint_results.push({axis:'Standards',skill:rule.skill,constraint_id:rule.constraint_id,constraint:'Synthetic concrete rule verification',status:rule.applicability==='required'?'passed':'not-applicable',reason:'Synthetic fixture contains no such behavior',applicability_basis:rule.applicability_basis,rule_ref:rule.rule_ref,rule_digest:rule.rule_digest,code_ref:'src/main/java/web/Boundary.java:1',evidence_ref:'checks.log',evidence_digest:record.verification_results[0].evidence_digest,review_notes:'Synthetic full-text semantic protocol evidence; not a real independent review.'});
 };refreshCoverage();
 const state={review_input:input,review_result_ref:'review-result.json'};
 const save=()=>f.write(state.review_result_ref,record);save();
 return {...f,record,state,save,binding,refreshCoverage};
}
