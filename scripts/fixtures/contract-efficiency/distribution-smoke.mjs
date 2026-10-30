// Fixed native consumer smoke; temporary instances never qualify a release.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {parseDocument} from '../../vendor/yaml.mjs';
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
const writingRef='.template-spec/process/document-writing.md',portableWritingRef='.agents/skills/i-have-adhd/references/document-writing.md',exampleRef='.template-spec/templates/examples/lifecycle-writing-examples.md',retroRef='.template-spec/templates/retro-report-template.md';
// The fixed CLI may embed an older committed template. Its verified export,
// rather than this test checkout, is the installation's byte/skill baseline.
function asset(target,source,ref){const actual=fs.readFileSync(path.join(target,ref));assert.deepEqual(actual,fs.readFileSync(path.join(source,ref)),ref);return hash(actual);}
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
function conflictDesignSkill(){
 for(const base of ['.agents/skills']){
  const conflict=path.join(scratch,`conflict-${base.split('/')[0].slice(1)}`);initializeNative('spec',conflict,options);
  const file=path.join(conflict,base,'yss-design-system/SKILL.md');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'# 用户已有设计技能定制\n');
  const before=state(conflict),plan=path.join(scratch,`${path.basename(conflict)}.json`);
  const preview=runNative(['skills','ensure','yss-design-system','--root',conflict,'--plan','--out',plan],options).result;
  assert.ok(preview.conflicts.includes(`${base}/yss-design-system/SKILL.md`),'Preview must expose the exact custom path');assert.deepEqual(state(conflict),before);
  runNative(['skills','ensure','yss-design-system','--root',conflict,'--apply','--plan-file',plan],{...options,expectedCode:'CONFLICT'});assert.deepEqual(state(conflict),before,'Apply refusal changed user bytes/modes/timestamps');
 }
}
function ensureSpec(target,inspection,source){
 // 初始治理闭包绑定真实受管记录；portable 写作技能不强制安装治理示例。
 assert.ok(inspection.distribution.installedSkills.includes('i-have-adhd'));
 const metadata=JSON.parse(fs.readFileSync(path.join(target,'.yss.json'),'utf8'));
 const initialExample=Object.hasOwn(metadata.managedFiles,exampleRef);
 if(inspection.initialPaths.includes(exampleRef))assert.ok(initialExample);
 assert.equal(fs.existsSync(path.join(target,exampleRef)),initialExample);
 const exampleHash=initialExample?asset(target,source,exampleRef):null;
 if(initialExample)assert.equal(exampleHash,inspection.files[exampleRef].digest);
 assert.equal(fs.existsSync(path.join(target,retroRef)),false);assert.equal(fs.existsSync(path.join(target,'.agents/skills/yss-design-system')),false);
 conflictDesignSkill();
 let before=state(target),plan=path.join(scratch,'design.json'),preview=runNative(['skills','ensure','yss-design-system','--root',target,'--plan','--out',plan],options).result;
 assert.ok(preview.changes.some(row=>row.path==='.agents/skills/yss-design-system/SKILL.md'));assert.deepEqual(state(target),before);
 runNative(['skills','ensure','yss-design-system','--root',target,'--apply','--plan-file',plan],options);const designHash=skill(target,source,'yss-design-system');
 before=state(target);applyNative('skills','spec',target,path.join(scratch,'design-replay.json'),['ensure','yss-design-system'],options);assert.deepEqual(state(target),before,'Satisfied design skill replay wrote files');
 return {initial_example:initialExample?'fixed-initialization-asset':'not-installed',lifecycle_writing_examples_sha256:exampleHash,design_skill_plan_apply_replay:'passed',design_skill_conflict_preservation:'passed',design_skill_hash:designHash};
}
try{
 assert.equal(hash(fs.readFileSync(binary)),pin.digest);
 const version=runNative(['version'],options).result;report.cli_version=version.version;report.cli_commit=version.cliCommit;report.cli_source_state=version.sourceState;
 for(const profile of NATIVE_PROFILES){
  const out=path.join(scratch,`${profile}-bundle`),exported=runNative(['bundle','export','--profile',profile,'--out',out],options).result,inspection=inspectNative(profile,options);
  assert.ok([4,5].includes(inspection.schemaVersion),'固定 Bundle 必须使用已知的当前 schema4/5');assert.deepEqual(exported.inspection,inspection);
  for(const row of exported.files){const file=path.join(out,row.path);assert.equal(hash(fs.readFileSync(file)),row.digest);assert.equal(fs.statSync(file).mode&0o777,row.mode);}
  report.bundle_exports.push({profile,template_commit:inspection.templateCommit,bundle_sha256:inspection.bundleHash,manifest_sha256:inspection.manifestHash,files:exported.files.length,status:'passed'});
  const target=path.join(scratch,`${profile}-instance`);initializeNative(profile,target,options);
  const writing={},skills={'i-have-adhd':skill(target,out,'i-have-adhd')};
  if(profile==='backend')writing.document_writing_sha256=asset(target,out,writingRef);
  if(inspection.files[portableWritingRef])writing.portable_document_writing_sha256=asset(target,out,portableWritingRef);
  if(profile==='spec')Object.assign(writing,ensureSpec(target,inspection,out));
  else{
   writing.lifecycle_writing_examples_sha256=asset(target,out,exampleRef);
   for(const name of ['diagnosing-bugs','grilling'])skills[name]=skill(target,out,name);
   writing.retro_sha256=asset(target,out,retroRef);for(const name of ['implement','tdd'])skills[name]=skill(target,out,name);
  }
  fs.writeFileSync(path.join(target,'contract-smoke.md'),'# 合同阅读验收\n\n目标：保留约束。\n');
  if(profile==='backend'){const view=JSON.parse(node([path.join(target,'scripts/contract'),'view','contract-smoke.md','--kind','spec','--json'],target));assert.equal(view.execution_allowed,false);assert.ok(view.markdown.includes('保留约束'));}
  runNative(['sync','--root',target],options);
  if(profile==='backend'){const review=JSON.parse(node([path.join(target,'scripts/contract'),'prepare-review','contract-smoke.md','contract-smoke.md','--kind','spec','--json'],target));assert.equal(review.approval_reusable,false);assert.equal(review.execution_allowed,false);}
  const initialized=execute('git',['init','-q',target],scratch);assert.equal(initialized.status,0,initialized.stderr);
  const identity=parseDocument(fs.readFileSync(path.join(target,'yss-project.yaml'),'utf8')).toJS();
  assert.equal(identity.schema_version,2);assert.equal(identity.repository_mode,'project-instance');
  const metadata=JSON.parse(fs.readFileSync(path.join(target,'.yss.json'),'utf8'));
  assert.equal(metadata.profile,profile);assert.equal(metadata.schemaVersion,inspection.schemaVersion);assert.equal(metadata.bundleSchemaVersion,inspection.schemaVersion);
  assert.equal(metadata.templateCommit,inspection.templateCommit);assert.equal(metadata.snapshotHash,inspection.sourceSnapshotHash);assert.equal(metadata.manifestHash,inspection.manifestHash);assert.equal(metadata.bundleHash,inspection.bundleHash);
  const profileRef='.template-spec/process/harness-profile.yaml',sourceProfile=parseDocument(fs.readFileSync(path.join(out,profileRef),'utf8')).toJS();
  const profileBytes=fs.readFileSync(path.join(target,profileRef)),activeProfile=parseDocument(profileBytes.toString()).toJS();
  assert.equal(sourceProfile.schema_version,3);assert.equal(sourceProfile.profile_id,metadata.profileId);assert.equal(activeProfile.schema_version,sourceProfile.schema_version);assert.equal(activeProfile.profile_id,sourceProfile.profile_id);assert.deepEqual(activeProfile.required_capabilities,sourceProfile.required_capabilities);
  assert.equal(hash(profileBytes),metadata.managedFiles[profileRef].lastApplied.digest);assert.equal(fs.statSync(path.join(target,profileRef)).mode&0o777,metadata.managedFiles[profileRef].lastApplied.mode);
  // Task2 intake is historical-only; current read-only consultation creates no task.
  const before=state(target);
  if(profile==='backend')runNative(['lifecycle','query','--root',target,'--id','work-unit.harness-entry'],options);
  else {const query=runNative(['skills','ensure','yss-design-system','--root',target],options).result;assert.equal(query.stats.changed,0);assert.equal(query.stats.conflicts,0);}
  assert.deepEqual(state(target),before,'Read-only query changed the instance');
  rows.push({profile,template_commit:inspection.templateCommit,template_source_state:inspection.sourceState,bundle_sha256:inspection.bundleHash,native_copy_export_init_sync:'passed',writing_assets:writing,installed_skill_hashes:skills,reader:profile==='backend'?'passed':'not-applicable',review_preparation:profile==='backend'?'passed':'not-applicable',legacy_task2_generation:'not-executed-historical-only',read_only_query:'passed',release_ready:false});save();console.log(`${profile}: fixed native export/init/sync and current read-only query passed`);
 }
 report.input_after_sha256=verificationInputDigest(root);report.input_drift=report.input_after_sha256!==inputDigest;assert.equal(report.input_drift,false,'Distribution source changed during smoke');
 report.binary_after_sha256=hash(fs.readFileSync(pin.binary));assert.equal(report.binary_after_sha256,pin.digest);report.status='passed';
}catch(error){report.status='failed';report.error=error.message;throw error;}finally{save();fs.rmSync(scratch,{recursive:true,force:true});}
