import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateNextRoute} from '../../lib/lifecycle-transition.mjs';
import {recordResearchVerification,RESEARCH_VALIDATOR} from '../../lib/maintenance-research.mjs';
import {hash} from '../../lib/strategic-handoff-io.mjs';
import {buildDecisionFixture} from '../user-decision/build-fixture.mjs';

test('research closes on current evidence, continuation requires bound authorization, repository identity cannot be spoofed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'research-terminal-'));
 const put=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));return{ref,digest:hash(fs.readFileSync(path.join(root,ref)))};};
 try {
  put('yss-project.yaml','schema_version: 1\nrepository_mode: template-source\n');
  put(RESEARCH_VALIDATOR,fs.readFileSync(RESEARCH_VALIDATOR,'utf8'));
  const ledger=JSON.parse(fs.readFileSync('.agents/skills/yss-research/assets/evidence-template.yaml'));
  ledger.search_log.forEach(s=>s.searched_at='2026-09-28');ledger.evidence_items[0].observed_at=ledger.evidence_items[0].evidence_date='2026-09-28';
  put('demo-research-brief.md',fs.readFileSync('.agents/skills/yss-research/assets/research-brief-template.md','utf8')+'\nclaim-001\n');put('demo-evidence.yaml',ledger);
  put('context.json',{status:'not-applicable',reason:'Synthetic template research'});
  const run=recordResearchVerification(root,'demo-research-brief.md','demo-evidence.yaml','verification');assert.equal(run.exit_code,0,fs.readFileSync(path.join(root,'verification/stderr.log'),'utf8'));
  const state={research_verification:run.binding,context_reconciliation:{status:'not-applicable',reason:'Template only',ref:'context.json'},evidence_refs:['context.json',run.binding.ref,'demo-research-brief.md','demo-evidence.yaml'],blocking_signals:[],drift:[],violation:[],new_impacts:[],stale_candidates:[]};
  const route=(next,s=state)=>validateNextRoute('work-unit.maintenance-research',next,s,{root});
  assert.equal(route(null).result,'allowed');
  assert.equal(route('work-unit.ssot-update').result,'blocked');
  const decision=buildDecisionFixture(path.join(root,'decision'),{boundary:'template-maintenance-scope',scope:['work-unit.ssot-update']});
  state.maintenance_authorization=put('authorization.json',decision.requirement);
  assert.equal(route('work-unit.ssot-update').result,'allowed');
  assert.equal(route('work-unit.plan-requirements').result,'blocked');
  assert.equal(route(null,{...state,blocking_signals:['missing-evidence']}).result,'blocked');
  put('demo-research-brief.md','Changed source');assert.equal(route(null).result,'blocked');
  assert.equal(validateNextRoute('work-unit.entry-triage','work-unit.ssot-update',null,{root}).result,'allowed');
  assert.equal(validateNextRoute('work-unit.entry-triage','work-unit.plan-requirements',{repository_mode:'project-instance'},{root}).result,'blocked');
  put('yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');
  put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n---\n');
  assert.equal(route(null,{...state,repository_mode:'template-source'}).result,'blocked');
  const product=validateNextRoute('work-unit.entry-triage','work-unit.plan-requirements',null,{root});assert.equal(product.result,'allowed',JSON.stringify(product));
  assert.equal(validateNextRoute('work-unit.entry-triage',null,null,{root}).result,'blocked');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
