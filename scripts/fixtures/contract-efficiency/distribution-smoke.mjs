// Fixed native consumer smoke; temporary instances never qualify a release.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {verificationInputDigest} from '../../lib/verification-report.mjs';
import {treeHash} from '../../lib/skill-supply-chain.mjs';
import {NATIVE_PROFILES,nativeBinary,nativeDigest as hash,runNative,initializeNative,applyNative,inspectNative} from '../../../.template-source/scripts/lib/native-yss.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),output=process.argv[2]||(process.env.YSS_TOOLING_REPORT_DIR?path.join(process.env.YSS_TOOLING_REPORT_DIR,'native-distribution-smoke.json'):undefined);
if(!output)throw Error('distribution-smoke.mjs <report.json>');
assert.ok(path.isAbsolute(output)&&path.relative(root,output).startsWith(`..${path.sep}`),'报告须位于仓库外绝对路径');assert.equal(fs.existsSync(output),false,'报告路径必须全新');
fs.mkdirSync(path.dirname(output),{recursive:true});
const logDirectory=`${output}.logs`;fs.mkdirSync(logDirectory,{recursive:false});
const inputDigest=verificationInputDigest(root),scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'contract-native-smoke-'))),pin=nativeBinary(),rows=[];
const report={schema_version:2,kind:'native-distribution-smoke',status:'running',input_sha256:inputDigest,release_ready:false,binary_sha256:pin.digest,bundle_exports:[],commands:[],rows};
const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');save();
const binary=path.join(scratch,'yss');fs.copyFileSync(pin.binary,binary);fs.chmodSync(binary,fs.statSync(pin.binary).mode&0o777);
const environment={...process.env,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:pin.digest};
const execute=(command,args,cwd,env=environment)=>{
 const started=Date.now(),result=spawnSync(command,args,{cwd,env,encoding:'utf8',timeout:600000,maxBuffer:128*1024*1024});
 const stdout_ref=path.join(logDirectory,`${report.commands.length}.stdout.log`),stderr_ref=path.join(logDirectory,`${report.commands.length}.stderr.log`);fs.writeFileSync(stdout_ref,result.stdout||'');fs.writeFileSync(stderr_ref,result.stderr||'');
 report.commands.push({command,args,cwd,exit_code:result.status,exit_observed:Number.isInteger(result.status)&&!result.error,signal:result.signal,error:result.error?.message||null,duration_ms:Date.now()-started,stdout_ref,stderr_ref,stdout_sha256:hash(result.stdout||''),stderr_sha256:hash(result.stderr||'')});save();return result;
};
const options={environment,run:execute};
const node=(args,cwd)=>{const result=execute(process.execPath,args,cwd);assert.equal(result.status,0,result.stderr||result.stdout);assert.equal(result.error,undefined);return result.stdout;};
const writingRef='.template-spec/process/document-writing.md',exampleRef='.template-spec/templates/examples/lifecycle-writing-examples.md',retroRef='.template-spec/templates/retro-report-template.md';
function asset(target,ref){const actual=fs.readFileSync(path.join(target,ref));assert.deepEqual(actual,fs.readFileSync(path.join(root,ref)),ref);return hash(actual);}
function skill(target,source,name){
 const lock=JSON.parse(fs.readFileSync(path.join(target,'skills-lock.json'))),expected=treeHash(path.join(source,'.agents/skills',name));
 assert.equal(lock.skills.shared[name]?.effectiveHash,expected,`Skill lock differs: ${name}`);
 for(const base of ['.agents/skills',...lock.projectionRoots]){assert.ok(fs.existsSync(path.join(target,base,name,'SKILL.md')));assert.equal(treeHash(path.join(target,base,name)),expected,`Skill projection differs: ${base}/${name}`);}
 return expected;
}
// Include modes and timestamps: identical-byte rewrites still violate replay.
function state(directory,prefix=''){return fs.readdirSync(path.join(directory,prefix)).sort().flatMap(name=>{
 const ref=prefix?`${prefix}/${name}`:name,file=path.join(directory,ref),s=fs.lstatSync(file),item={ref,mode:s.mode,mtime:s.mtimeMs};
 if(s.isDirectory())return [{...item,type:'directory'},...state(directory,ref)];
 if(s.isSymbolicLink())return [{...item,type:'link',target:fs.readlinkSync(file)}];
 return [{...item,type:'file',digest:hash(fs.readFileSync(file))}];
});}
function conflictTdd(target){
 for(const base of ['.agents/skills','.codex/skills']){
  const conflict=path.join(scratch,`conflict-${base.split('/')[0].slice(1)}`);fs.cpSync(target,conflict,{recursive:true});
  const file=path.join(conflict,base,'tdd/SKILL.md');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'# 用户已有 TDD 定制\n');
  const before=state(conflict),plan=path.join(scratch,`${path.basename(conflict)}.json`);
  const preview=runNative(['skills','ensure','tdd','--root',conflict,'--plan','--out',plan],options).result;
  assert.ok(preview.conflicts.includes(`${base}/tdd/SKILL.md`),'Preview must expose the exact custom path');assert.deepEqual(state(conflict),before);
  runNative(['skills','ensure','tdd','--root',conflict,'--apply','--plan-file',plan],{...options,expectedCode:'CONFLICT'});assert.deepEqual(state(conflict),before,'Apply refusal changed user bytes/modes/timestamps');
 }
}
function ensureSpec(target){
 assert.equal(fs.existsSync(path.join(target,exampleRef)),false);assert.equal(fs.existsSync(path.join(target,retroRef)),false);assert.equal(fs.existsSync(path.join(target,'.agents/skills/tdd')),false);
 conflictTdd(target);
 let before=state(target),plan=path.join(scratch,'tdd.json'),preview=runNative(['skills','ensure','tdd','--root',target,'--plan','--out',plan],options).result;
 assert.ok(preview.changes.some(row=>row.path==='.agents/skills/tdd/SKILL.md'));assert.deepEqual(state(target),before);
 runNative(['skills','ensure','tdd','--root',target,'--apply','--plan-file',plan],options);const tddHash=skill(target,root,'tdd');
 before=state(target);applyNative('skills','spec',target,path.join(scratch,'tdd-replay.json'),['ensure','tdd'],options);assert.deepEqual(state(target),before,'Satisfied TDD replay wrote files');
 const stage='stage.verification-release-retrospective';before=state(target);plan=path.join(scratch,'stage.json');
 preview=runNative(['assets','ensure',stage,'--root',target,'--plan','--out',plan],options).result;assert.ok(preview.changes.some(row=>row.path===retroRef));assert.deepEqual(state(target),before);
 runNative(['assets','ensure',stage,'--root',target,'--apply','--plan-file',plan],options);const retroHash=asset(target,retroRef);
 before=state(target);applyNative('assets','spec',target,path.join(scratch,'stage-replay.json'),['ensure',stage],options);assert.deepEqual(state(target),before,'Satisfied stage replay wrote files');
 return {initial_example:'intentionally-absent',retro_stage_ensure:'passed',retro_sha256:retroHash,tdd_plan_apply_replay:'passed',tdd_conflict_preservation:'passed',tdd_hash:tddHash};
}
try{
 assert.equal(hash(fs.readFileSync(binary)),pin.digest);
 const version=runNative(['version'],options).result;report.cli_version=version.version;report.cli_commit=version.cliCommit;report.cli_source_state=version.sourceState;
 for(const profile of NATIVE_PROFILES){
  const out=path.join(scratch,`${profile}-bundle`),exported=runNative(['bundle','export','--profile',profile,'--out',out],options).result,inspection=inspectNative(profile,options);
  assert.equal(inspection.schemaVersion,2);assert.deepEqual(exported.inspection,inspection);
  for(const row of exported.files){const file=path.join(out,row.path);assert.equal(hash(fs.readFileSync(file)),row.digest);assert.equal(fs.statSync(file).mode&0o777,row.mode);}
  report.bundle_exports.push({profile,template_commit:inspection.templateCommit,bundle_sha256:inspection.bundleHash,manifest_sha256:inspection.manifestHash,files:exported.files.length,status:'passed'});
  const target=path.join(scratch,`${profile}-instance`);initializeNative(profile,target,options);
  const writing={document_writing_sha256:asset(target,writingRef)},skills={'i-have-adhd':skill(target,root,'i-have-adhd')};
  if(profile==='spec')Object.assign(writing,ensureSpec(target));
  else{
   writing.lifecycle_writing_examples_sha256=asset(target,exampleRef);
   for(const name of ['diagnosing-bugs','grilling'])skills[name]=skill(target,root,name);
   if(profile==='design'){skills['yss-strategic-design']=skill(target,path.join(root,'submodules/yss-harness-design-agent'),'yss-strategic-design');assert.ok(inspection.manifest.excludePaths.includes(retroRef));assert.equal(fs.existsSync(path.join(target,retroRef)),false);writing.retrospective='existing-profile-exclusion';}
   else{writing.retro_sha256=asset(target,retroRef);for(const name of ['implement','tdd'])skills[name]=skill(target,root,name);}
  }
  fs.writeFileSync(path.join(target,'contract-smoke.md'),'# 合同阅读验收\n\n目标：保留约束。\n');
  const view=JSON.parse(node([path.join(target,'scripts/contract'),'view','contract-smoke.md','--kind','spec','--json'],target));assert.equal(view.execution_allowed,false);assert.ok(view.markdown.includes('保留约束'));
  runNative(['sync','--root',target],options);
  const review=JSON.parse(node([path.join(target,'scripts/contract'),'prepare-review','contract-smoke.md','contract-smoke.md','--kind','spec','--json'],target));assert.equal(review.approval_reusable,false);assert.equal(review.execution_allowed,false);
  const initialized=execute('git',['init','-q',target],scratch);assert.equal(initialized.status,0,initialized.stderr);
  const specialist=profile==='backend'||profile==='frontend',unit=specialist?'work-unit.harness-entry':'work-unit.entry-triage',input=path.join(scratch,`${profile}-input.json`),task=path.join(scratch,`${profile}-task.json`),run=path.join(scratch,`${profile}-run`);
  fs.writeFileSync(input,JSON.stringify({role_id:specialist?'role.harness-orchestrator':'role.requirements-manager',task_id:'intake-smoke',work_unit_id:unit,actor_id:'maintainer',runtime_id:'runtime.generic',contract:{contract_id:'smoke',contract_version:1,contract_ref:'CONTEXT.md'},inputs:['CONTEXT.md'],objective:'read-only research',forbidden_actions:['write'],expected_outputs:['source references'],downstream_consumers:['owner'],convergence:{parent_work_unit:unit,convergence_ref:'current-session'}}));
  node([path.join(target,'scripts/prepare-read-only-intake'),'--input',input,'--output',task],target);
  const intake=JSON.parse(node([path.join(target,'scripts/run-read-only-intake'),'--task',task,'--run-dir',run],target));assert.equal(intake.workflow_status,'resolved');assert.equal(intake.verification_status,'not-executed');assert.equal(intake.result.next_route,null);
  node([path.join(target,'scripts/verify-digital-human-task-package'),path.join(run,'task-result.json'),'--run-dir',run],target);
  rows.push({profile,template_commit:inspection.templateCommit,template_source_state:inspection.sourceState,bundle_sha256:inspection.bundleHash,native_copy_export_init_sync:'passed',writing_assets:writing,installed_skill_hashes:skills,reader:'passed',review_preparation:'passed',intake_producer_runner_consumer:'passed',release_ready:false});save();console.log(`${profile}: fixed native export/init/sync/read/intake passed`);
 }
 report.input_after_sha256=verificationInputDigest(root);report.input_drift=report.input_after_sha256!==inputDigest;assert.equal(report.input_drift,false,'Distribution source changed during smoke');
 report.binary_after_sha256=hash(fs.readFileSync(pin.binary));assert.equal(report.binary_after_sha256,pin.digest);report.status='passed';
}catch(error){report.status='failed';report.error=error.message;throw error;}finally{save();fs.rmSync(scratch,{recursive:true,force:true});}
