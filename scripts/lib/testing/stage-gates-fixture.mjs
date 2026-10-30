// Synthetic protocol sources with real bytes, native checks and child executions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from '../../vendor/yaml.mjs';
import {stageContentFixture} from './stage-content-fixture.mjs';
import {buildDecisionFixture} from './user-decision-fixture.mjs';
const template=path.resolve(import.meta.dirname,'../../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function stageGatesFixture({existingRoot}={}) {
 const root=existingRoot||fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'stage-gates-')));
 const write=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));};
 const read=ref=>fs.readFileSync(path.join(root,ref));
 const asset=ref=>({ref,digest:hash(read(ref))});
 if(!existingRoot){
 fs.cpSync(path.join(template,'.template-spec/process'),path.join(root,'.template-spec/process'),{recursive:true});
 fs.copyFileSync(path.join(template,'CONTEXT.md'),path.join(root,'CONTEXT.md'));
 write('yss-project.yaml',{schema_version:2,repository_mode:'project-instance'});
  }
 const doc=ref=>parse(read(ref).toString());
 if(!existingRoot){
 const profile=doc('.template-spec/process/harness-profile.yaml');profile.lifecycle ||= {};profile.required_capabilities ||= [];for(const capability of ['role-independent-governance-v1','stage-gates-v1'])if(!profile.required_capabilities.includes(capability))profile.required_capabilities.push(capability);write('.template-spec/process/harness-profile.yaml',profile);
 const policyRef='.template-spec/process/orchestration-contract.yaml';const policy=doc(policyRef);if(!policy.parts.includes('orchestration/domain/stage-gates.yaml'))policy.parts.push('orchestration/domain/stage-gates.yaml');write(policyRef,policy);
 }
 const versionOf=ref=>{try{const d=doc(ref);return d.domain_version||d.package_version||'v1';}catch{return 'v1';}};
 const stage=doc('.template-spec/process/orchestration/domain/stage-gates.yaml').stage_gates;
 if(!existingRoot){
 const registry=doc('.template-spec/process/lifecycle-registry.yaml');
 registry.gates=stage.gates.map(g=>({...registry.gates[0],id:g.id,name:g.id,stage:g.work_stages[0]}));
 write('.template-spec/process/lifecycle-registry.yaml',registry);
 }
 let revision=0;
 const decisionDirectory=gate=>{let ref;do{ref=path.join(root,'decisions',gate,String(++revision));}while(fs.existsSync(ref));return ref;};
 function record({gateId='gate.plan-approved',subjectRef='subject.md',scope=['feature.demo'],extraAssets=[],argvByCheck={},notApplicable={},authorization}={}) {
  if(!fs.existsSync(path.join(root,subjectRef)))write(subjectRef,'synthetic stage subject\n');
  if(gateId==='gate.plan-approved'){if(!fs.existsSync(path.join(root,'domain.json')))stageContentFixture({root,write},{ui:false});extraAssets=[...new Set([...extraAssets,'domain.json','stage-decision.json'])].filter(ref=>ref!==subjectRef);}
  if(gateId==='gate.spec-baseline-approved' && !Object.keys(notApplicable).length) {
    if(!fs.existsSync(path.join(root,'stage-decision.json')))stageContentFixture({root,write},{ui:false});
    notApplicable={'check.prototype-reviewed':'本范围无 UI','check.prototype-verified':'本范围无 UI'};
    extraAssets=[...new Set([...extraAssets,'stage-decision.json','domain.json'])].filter(ref=>ref!==subjectRef);
  }
  if(gateId==='gate.spec-baseline-approved') {
    const hasSet=extraAssets.some(ref=>{try{return doc(ref).kind==='business-ticket-set';}catch{return false;}});
    if(!hasSet) {
      const specRef=read(subjectRef).toString().includes('content_profile: plan-spec-v1')?subjectRef:'spec.md';
      if(!fs.existsSync(path.join(root,specRef)) || !read(specRef).toString().includes('content_profile: plan-spec-v1'))write(specRef,'---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-1 | 当前输入校验 |\n## 验收标准\n| ID | 需求引用 |\n|---|---|\n| AC-1 | FR-1 |\n');
      const spec={...asset(specRef),version:'v1',digest:'sha256:'+asset(specRef).digest};
      const ticketRef='.test-spec/business-tickets/BT-1.md',setRef='.test-spec/business-ticket-set.json';
      write(ticketRef,'---\n'+JSON.stringify({schema_version:1,kind:'business-ticket',id:'BT-1',version:'v1',status:'ready-for-human',spec,requirement_refs:['FR-1'],acceptance_refs:['AC-1'],dependencies:[],source_refs:[],open_questions:[]})+'\n---\n# 当前输入校验\n## 业务结果\n输入得到有效结果\n## 范围\n当前输入\n## 非目标\n其他功能\n## 验收\nAC-1\n## 风险\n拒绝非法输入\n');
      write(setRef,{schema_version:1,kind:'business-ticket-set',id:'business-ticket-set.test',version:'v1',status:'ready-for-human',spec,tickets:[{id:'BT-1',...asset(ticketRef),version:'v1',digest:'sha256:'+asset(ticketRef).digest}],coverage_deferred:[]});
      extraAssets=[...new Set([...extraAssets,specRef,setRef,ticketRef])].filter(ref=>ref!==subjectRef);
    }
  }
  const d=authorization?null:buildDecisionFixture(decisionDirectory(gateId),{referenceRoot:root,boundary:gateId,scope,subjectRef:path.join(root,subjectRef),subjectVersion:versionOf(subjectRef),basis:extraAssets.map(ref=>({...asset(ref),digest:'sha256:'+asset(ref).digest,ref:path.join(root,ref),version:versionOf(ref)}))});
  const bound=asset(subjectRef),members=[bound,...extraAssets.map(asset)],checks=[];
  for(const id of stage.gates.find(g=>g.id===gateId).checks) {
   const argv=argvByCheck[id]||[process.execPath,'-e',"require('fs').readFileSync(process.argv[1])",subjectRef];
   const run=spawnSync(argv[0],argv.slice(1),{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});
   if(run.status!==0){let detail=run.stderr;try{const d=JSON.parse(run.stdout);detail=JSON.stringify(d.result?.diagnostics||d.result);}catch{detail ||= run.stdout;}throw new Error(id+': '+detail.slice(0,3000));}
   const evidenceRef=id+'.execution.json';
   write(evidenceRef,{phase:'execution',argv,exit_code:run.status,executed_at:new Date().toISOString(),result:'passed',blocking_findings:[],input_bindings:members,...(notApplicable[id]?{applicable:false,reason:notApplicable[id]}:{}),check_ids:[id]});
   checks.push({id,result:notApplicable[id]?'not-applicable':'passed',...(notApplicable[id]?{reason:notApplicable[id]}:{}),inputs:members,evidence:[asset(evidenceRef)]});
  }
  if(!checks.length)write('stage.execution.json',{phase:'execution',argv:[process.execPath,'-e','process.exit(0)'],exit_code:0,executed_at:new Date().toISOString(),result:'passed',blocking_findings:[]});
  const result={schema_version:1,kind:'stage-result',feature_id:scope[0],gate_id:gateId,scope,assets:members,checks,outcome:'approved',blocking_findings:[],provenance:{tool:'node',execution_ref:checks[0]?.evidence[0].ref||'stage.execution.json'},authorization:authorization||{kind:'user-decision',...asset(path.relative(root,d.ref))}};
  write('stage.json',result);
  return {result,decision:d,recordRef:'stage.json'};
 }
 return {root,write,read,asset,doc,record,stage,cleanup:()=>{if(!existingRoot)fs.rmSync(root,{recursive:true,force:true});}};
}
