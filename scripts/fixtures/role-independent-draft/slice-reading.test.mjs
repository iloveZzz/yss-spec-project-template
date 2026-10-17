import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {parseDocument} from '../../vendor/yaml.mjs';
import {readSliceContract} from '../../lib/slice-contract.mjs';
import {renderSliceContractView} from '../../lib/slice-contract-views.mjs';
import {viewContract} from '../../lib/contract-views.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),source=path.resolve(here,'../../..'),bin=process.env.YSS_NATIVE_BINARY;
assert.ok(bin&&path.isAbsolute(bin),'YSS_NATIVE_BINARY must name the current development binary');
const hash=b=>createHash('sha256').update(b).digest('hex');
const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
const digest=x=>hash(JSON.stringify(canon(x)));
for(const ticketPolicy of [false,true])test(`Slice4 sources and Node views preserve acceptance (ticket_policy=${ticketPolicy})`,()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'slice4-reading-')));
 const write=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));};
 try{
 fs.cpSync(path.join(source,'.template-spec/process'),path.join(root,'.template-spec/process'),{recursive:true});
 write('yss-project.yaml',{schema_version:2,repository_mode:'project-instance'});
 write('.template-spec/process/harness-profile.yaml',{schema_version:3,profile_id:'harness.spec-template',status:'active',required_capabilities:['role-independent-governance-v1'],lifecycle:{},execution:{}});
 fs.copyFileSync(path.join(source,'CONTEXT.md'),path.join(root,'CONTEXT.md'));
 const registryRef='.template-spec/agents/yss-skill-registry.yaml',compilerRef='.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml';
 for(const ref of [registryRef,compilerRef])write(ref,fs.readFileSync(path.join(source,ref),'utf8'));
 const basis={};for(const name of ['spec','ticket','engineering_baseline','implementation_repository','architecture_review','build_architecture_checklist','no_api_impact_record']){const ref=`${name}.md`,text=`---\nkind: implementation-ticket\n---\n# ${name}\nAC-1: 有效输入成功，非法输入拒绝。\n`;write(ref,text);basis[name]={ref,digest:'sha256:'+hash(text)};}
 const contract={schema_version:4,contract_id:'contract.test',contract_version:'v1',slice_id:'slice.test',status:'draft',basis,scope:{impacted_areas:['domain'],implementation_path_policy:'external-repository-native',project_roots:[root],allowed_write_paths:['src']},applicability:Object.fromEntries(['frontend','backend','api','cross_repo'].map(k=>[k,{status:'not-applicable',reason:'本场景无该交付影响'}])),resolution:{required_capabilities:['contract.request-validation'],required_skills:['yss-validation'],recipe_ids:[],conditions:[],registry_digest:digest(parseDocument(fs.readFileSync(path.join(root,registryRef),'utf8')).toJS()),compiler_contract_digest:digest(parseDocument(fs.readFileSync(path.join(root,compilerRef),'utf8')).toJS())},acceptance:{'AC-1':{source:'ticket',locator:'AC-1'}},verification:{test:{command:'pnpm test',cwd:root,expected_evidence:['test.log'],test_seams:['validate'],acceptance_refs:['AC-1']}},work_units:[{id:'validate',behavior:'校验输入',check_ids:['gate.delivery-accepted'],primary_skill:'yss-validation',tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-1']}]};
  contract.basis.ticket.version='v1';
  if(ticketPolicy)contract.ticket_policy={mode:'frozen-requirements',state_owner:'tracker-or-task-package'};
  write('slice.json',contract);
  const loaded=readSliceContract('slice.json',{root});
  const rendered=renderSliceContractView('slice.json',{root});
  assert.match(loaded.sources.ticket.text,/AC-1: 有效输入成功，非法输入拒绝。/);
  assert.equal(loaded.sources.ticket.digest,contract.basis.ticket.digest);
  assert.equal(rendered.sources.ticket.digest,contract.basis.ticket.digest);
  assert.equal(rendered.acceptance['AC-1'],'AC-1: 有效输入成功，非法输入拒绝。');
  if(ticketPolicy)assert.equal(rendered.ticket_state.owner,'tracker-or-task-package');
  for(const profile of ['review','task','full']){
   const view=viewContract('slice.json',{root,kind:'slice',profile,unit_id:profile==='task'?'validate':undefined,task_layout:'focused'});
   assert.match(view.markdown,/有效输入成功，非法输入拒绝/);
   assert.equal(view.read_only,true);assert.equal(view.execution_allowed,false);
   if(profile==='task')assert.equal(view.content.上游引用.ticket.ref,'ticket.md');
  }
  write('ticket.md','changed source');
  assert.throws(()=>readSliceContract('slice.json',{root}),/stale|来源|摘要|原始字节/i);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
