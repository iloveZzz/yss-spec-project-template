import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const results=[];
for(const p of ['backend','frontend','design']){
 const snap=path.join(base,p),owner=p==='design'?'yss-strategic-design':'harness-orchestrator';
 const root=path.join(base,'fixtures',p);fs.mkdirSync(root,{recursive:true});
 const copy=ref=>{const target=path.join(root,ref);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(snap,ref),target);};
 for(const ref of ['.template-spec/process/harness-profile.yaml','.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/digital-human-roles.yaml',`.agents/skills/${owner}/references/orchestration-contract.yaml`,'scripts/verify-lifecycle-checkpoint'])copy(ref);
 fs.writeFileSync(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');
 const normal={schema_version:1,repository_mode:'project-instance',mode:'resume',status:'routing',stage:p==='design'?'stage.entry-triage':'stage.harness-entry',next_work_unit:p==='backend'?'work-unit.technical-design':p==='frontend'?'work-unit.frontend-engineering-design':'work-unit.plan-opportunity',blockers:[],gates:{},artifacts:{}};
 const cases=[['missing-tracking',normal],['terminal-register',{...normal,status:'completed',stage:p==='design'?'stage.ticket-formalization':'stage.verification',next_work_unit:null,stage_trace:{completed_work_unit:p==='design'?'work-unit.strategic-design-handoff':'work-unit.verification'}}]];
 if(p==='design')cases.push(['forbidden-local-route',{...normal,status:'routing',stage:'stage.plan',next_work_unit:'work-unit.technical-analysis'}]);
 for(const [name,value]of cases){
  fs.mkdirSync(path.join(root,'docs/.scratch/case'),{recursive:true});fs.writeFileSync(path.join(root,'docs/.scratch/case/checkpoint.json'),JSON.stringify(value,null,2));
  const args=[path.join(snap,'scripts/lifecycle-status'),'--root',root,'--checkpoint','docs/.scratch/case/checkpoint.json'];
  const text=spawnSync(process.execPath,[...args,'--format','text'],{encoding:'utf8',cwd:root});
  const json=spawnSync(process.execPath,args,{encoding:'utf8',cwd:root});
  fs.writeFileSync(path.join(base,`${p}-${name}.stdout.txt`),text.stdout);fs.writeFileSync(path.join(base,`${p}-${name}.stderr.txt`),text.stderr);
  fs.writeFileSync(path.join(base,`${p}-${name}.json`),json.stdout);
  const output=JSON.parse(json.stdout);
  results.push({profile:p,name,args,exit_code:text.status,stderr:text.stderr,stage:output.stage,next_stage:output.next_stage,work_unit:output.work_unit,blockers:output.blockers,next_step:output.next_step,presentation:output.presentation});
  if(p==='design'&&name==='forbidden-local-route'){
   const {assertStrategicCheckpointScope,loadHarnessProfile}=await import(pathToFileURL(path.join(snap,'scripts/lib/harness-profile.mjs')));
   try{assertStrategicCheckpointScope(value,{profile:loadHarnessProfile(path.join(root,'.template-spec/process/harness-profile.yaml')),root,checkpointPath:path.join(root,'docs/.scratch/case/checkpoint.json')});results.push({scope_checker:'unexpected pass'});}
   catch(e){results.push({scope_checker:'expected fail',error:e.message});}
  }
 }
}
fs.writeFileSync(path.join(base,'fixture-results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({profile,name,exit_code,next_stage,work_unit,blockers,next_step,scope_checker,error})=>({profile,name,exit_code,next_stage,work_unit,blockers,next_step,scope_checker,error})),null,2));
