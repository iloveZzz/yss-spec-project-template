import {begin,end} from './profile.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {crossRepoFixture} from '../slice-contract-v3/cross-repo-fixture.mjs';
import {approvedFixture} from '../delivery-preflight/approved-execution-fixture.mjs';
import {inspectSliceContract} from '../../lib/slice-execution-preflight.mjs';
import {renderSliceContractView} from '../../lib/slice-contract-views.mjs';
import {evaluateContractFreshness,loadCompilerContract} from '../../lib/implementation-contract-compiler.mjs';
import {loadSkillRegistry} from '../../lib/skill-registry.mjs';
import {prepareSliceImplementationContract} from '../../lib/slice-contract-preparation.mjs';
import {baselineFixture} from '../existing-ui-baseline/fixture.mjs';
import {validateExistingUiBaseline} from '../../lib/existing-ui-baseline.mjs';
const compactModule=new URL('../../lib/contract-views.mjs',import.meta.url);
const compactView=fs.existsSync(compactModule)?(await import(compactModule)).viewContract:null;
const scenario=process.argv[2]||'mvc';
const f=scenario==='cross-repo'?crossRepoFixture():scenario==='ddd'?approvedFixture('domain-driven'):pilotFixture();
try {
 if(scenario==='no-api'){
  const sources={...f.sources};delete sources.openapi_freeze;sources.no_api_impact_record=f.write('no-api.md','No API impact.');
  const refinements=structuredClone(f.refinements);refinements.scope.impacted_areas=['backend'];refinements.applicability.api={status:'not-applicable',reason:'No API impact'};delete refinements.extensions.api;
  const prepared=prepareSliceImplementationContract({root:f.root,ticket_ref:f.ticket,sources,refinements});if(prepared.report.blockers.length)throw Error(JSON.stringify(prepared.report.blockers));Object.assign(f.contract,prepared.slice_contract);
 }
 const ui=scenario==='frontend'?baselineFixture(path.join(f.root,'frontend-bundle')):null;
 const binding=scenario==='ddd'?f.binding:f.approve().binding;
 if(scenario==='stale')fs.appendFileSync(path.join(f.root,'spec.md'),'\nChanged source');
 if(scenario==='invalid-approval'){const record=JSON.parse(fs.readFileSync(path.join(f.root,binding.approval_ref)));record.gates['gate.slice-contract-approved'].status='blocked';f.write(binding.approval_ref,record);}
 let output,error;begin();const start=performance.now();
 try {output=scenario==='frontend'?validateExistingUiBaseline(ui.data,{bundleRoot:ui.root}):scenario==='view'?(compactView?compactView(binding.ref,{root:f.root,kind:'slice'}):renderSliceContractView(binding.ref,{root:f.root})):scenario==='ddd'?evaluateContractFreshness(f.contract,{root:f.root,registry:loadSkillRegistry(),compilerContract:loadCompilerContract(),approved_slice:binding,readOnly:true}):inspectSliceContract(binding.ref,{root:f.root,approval_ref:binding.approval_ref,work_unit_id:'work-unit.slice-backend'}).report;}catch(e){error=e.code||e.message;}
 const elapsed_ms=performance.now()-start,profile=end();
 const result=error?'rejected':(output?.blockers?.length||output?.errors?.length)?'rejected':output?.freshness==='stale'?'rejected':'passed';
 const expected=['stale','invalid-approval'].includes(scenario)?'rejected':'passed';
 if(result!==expected)throw Error(JSON.stringify({scenario,result,expected,error,output}));
 const children=fs.readdirSync(process.env.YSS_CONTRACT_PROFILE_DIR).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(path.join(process.env.YSS_CONTRACT_PROFILE_DIR,x))));
 const sums={reads:profile.reads,parses:profile.parses,hashes:profile.hashes,schema_requests:profile.schema_requests,executed_schema_jobs:profile.executed_schema_jobs,python:profile.spawns.python?.count||0,node:profile.spawns.node?.count||0};
 for(const c of children){for(const k of ['reads','parses','hashes','schema_requests','executed_schema_jobs'])sums[k]+=c[k];for(const k of ['python','node'])sums[k]+=c.spawns[k]?.count||0;}
 console.log(JSON.stringify({scenario,result,elapsed_ms,main:profile,tree:sums,markdown_bytes:output?.markdown?Buffer.byteLength(output.markdown):undefined}));
}finally{f.cleanup();}
