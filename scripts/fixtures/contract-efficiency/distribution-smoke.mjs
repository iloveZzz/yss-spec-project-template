// Development snapshots only. Never writes the user's CLI repositories or claims release readiness.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {verificationInputDigest} from '../../lib/verification-report.mjs';
import {treeHash} from '../../lib/skill-supply-chain.mjs';
import {syncCore,syncTemplate} from '../../../.template-source/cli-core/build.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),output=process.argv[2];
if(!output)throw Error('distribution-smoke.mjs <report.json>');
const inputDigest=verificationInputDigest(root);
const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'contract-cli-smoke-'))),rows=[];
const report={kind:'development-distribution-smoke',status:'running',input_sha256:inputDigest,release_ready:false,pack_checks:[],rows};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const run=(cmd,args,cwd,env=process.env)=>{const r=spawnSync(cmd,args,{cwd,env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});if(r.status!==0)throw Error(`${cmd} ${args.join(' ')}: ${r.stderr||r.stdout||r.error?.message}`);return r.stdout;};
const writingRef='.template-spec/process/document-writing.md',exampleRef='.template-spec/templates/examples/lifecycle-writing-examples.md',retroRef='.template-spec/templates/retro-report-template.md';
const bytesHash=bytes=>createHash('sha256').update(bytes).digest('hex');
function packCli(cli,pkg){
 const diagnostic={package:pkg.name,version:pkg.version,status:'running'};report.pack_checks.push(diagnostic);
 const result=spawnSync('npm',['pack','--ignore-scripts','--json','--pack-destination',scratch],{cwd:cli,env:process.env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
 Object.assign(diagnostic,{exit_status:result.status,stdout_bytes:Buffer.byteLength(result.stdout||''),stderr_bytes:Buffer.byteLength(result.stderr||''),...(result.error?{error_code:result.error.code}: {})});
 assert.equal(result.status,0,'npm pack failed; see pack_checks command diagnostics');
 let parsed;try{parsed=JSON.parse(result.stdout);}catch{throw Error('npm pack did not return valid JSON');}
 // npm 12 emits a map keyed by package name; earlier npm releases emit an
 // array. Both must identify exactly one real package, with no empty fallback.
 diagnostic.output_shape=Array.isArray(parsed)?'array':parsed&&typeof parsed==='object'?'package-map':typeof parsed;
 let packages;
 if(Array.isArray(parsed))packages=parsed;
 else{
  assert.ok(parsed&&typeof parsed==='object','npm pack JSON must be an array or package map');
  assert.deepEqual(Object.keys(parsed),[pkg.name],'npm pack map must contain only the requested package');
  packages=[parsed[pkg.name]];
 }
 diagnostic.package_count=packages.length;
 assert.equal(packages.length,1,'npm pack must report exactly one package');
 const pack=packages[0];assert.ok(pack&&typeof pack==='object'&&!Array.isArray(pack),'npm pack package metadata missing');
 assert.equal(pack.name,pkg.name);assert.equal(pack.version,pkg.version);assert.equal(pack.id,`${pkg.name}@${pkg.version}`);
 const filename=`${pkg.name.replace('@','').replace('/','-')}-${pkg.version}.tgz`;assert.equal(pack.filename,filename,'Unexpected package artifact filename');
 const artifact=path.join(scratch,filename),info=fs.lstatSync(artifact);
 assert.ok(info.isFile()&&info.size>0,'npm pack did not create a non-empty regular artifact');
 assert.equal(info.size,pack.size,'Artifact size differs from npm pack metadata');
 const bytes=fs.readFileSync(artifact);
 assert.equal(createHash('sha1').update(bytes).digest('hex'),pack.shasum,'Artifact SHA-1 differs from npm pack metadata');
 assert.equal(`sha512-${createHash('sha512').update(bytes).digest('base64')}`,pack.integrity,'Artifact integrity differs from npm pack metadata');
 assert.ok(Array.isArray(pack.files)&&pack.files.some(file=>file.path==='package.json'),'npm pack metadata must list package.json');
 const packaged=JSON.parse(run('tar',['-xOf',artifact,'package/package.json'],scratch));
 assert.equal(packaged.name,pkg.name);assert.equal(packaged.version,pkg.version);assert.deepEqual(packaged.bin,pkg.bin,'Packaged CLI entrypoints differ from source metadata');
 Object.assign(diagnostic,{status:'passed',filename,artifact_bytes:info.size,artifact_sha256:bytesHash(bytes),artifact_metadata:'verified'});
 return {artifact,diagnostic};
}
const assertAsset=(target,ref)=>{
 const expected=fs.readFileSync(path.join(root,ref)),actual=fs.readFileSync(path.join(target,ref));
 assert.ok(actual.equals(expected),`Installed asset differs from canonical source: ${ref}`);
 return bytesHash(actual);
};
const assertSkill=(target,sourceRoot,name)=>{
 const lock=JSON.parse(fs.readFileSync(path.join(target,'skills-lock.json'))),expected=treeHash(path.join(sourceRoot,'.agents/skills',name));
 assert.equal(lock.skills.shared[name]?.effectiveHash,expected,`Installed lock differs from source Skill: ${name}`);
 for(const skillRoot of ['.agents/skills',...lock.projectionRoots]){
  assert.ok(fs.existsSync(path.join(target,skillRoot,name,'SKILL.md')),`Installed Skill missing: ${skillRoot}/${name}`);
  assert.equal(treeHash(path.join(target,skillRoot,name)),expected,`Installed Skill hash differs: ${skillRoot}/${name}`);
 }
 return expected;
};
// Include timestamps and modes so a replay that rewrites identical bytes is not
// mistaken for a no-write operation. All trees below are disposable instances.
function treeState(directory,prefix=''){
 return fs.readdirSync(path.join(directory,prefix)).sort().flatMap(name=>{
  const ref=prefix?`${prefix}/${name}`:name,absolute=path.join(directory,ref),info=fs.lstatSync(absolute);
  const item={ref,mode:info.mode,mtime:info.mtimeMs};
  if(info.isDirectory())return [{...item,type:'directory'},...treeState(directory,ref)];
  if(info.isSymbolicLink())return [{...item,type:'link',target:fs.readlinkSync(absolute)}];
  return [{...item,type:'file',hash:bytesHash(fs.readFileSync(absolute))}];
 });
}
function assertTddConflict(entry,target,directory){
 for(const skillRoot of ['.agents/skills','.codex/skills']){
  const conflict=path.join(scratch,`${directory}-conflict-${skillRoot.split('/')[0].slice(1)}`);
  fs.cpSync(target,conflict,{recursive:true});
  const file=path.join(conflict,skillRoot,'tdd/SKILL.md');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'# 用户已有 TDD 定制\n');
  const before=treeState(conflict);
  for(const mode of ['--plan','--apply']){
   const result=spawnSync(process.execPath,[entry,'skills','ensure','tdd',mode,'--target-dir',conflict],{cwd:scratch,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
   assert.notEqual(result.status,0,'Existing TDD paths must block installation');
   assert.match(`${result.stderr}\n${result.stdout}`,/路径已存在，拒绝覆盖:|路径已存在，拒绝覆盖：/);
   assert.deepEqual(treeState(conflict),before,`TDD conflict ${mode} changed user files`);
  }
 }
}
function ensureMainAssets(entry,target,directory){
 assert.equal(fs.existsSync(path.join(target,exampleRef)),false,'Lean init must not require uninstalled examples');
 assert.equal(fs.existsSync(path.join(target,retroRef)),false,'Lean init unexpectedly installed release-stage assets');
 assert.equal(fs.existsSync(path.join(target,'.agents/skills/tdd')),false,'TDD must remain on demand at init');
 assertTddConflict(entry,target,directory);
 let before=treeState(target);
 const plan=JSON.parse(run(process.execPath,[entry,'skills','ensure','tdd','--plan','--target-dir',target],scratch));
 assert.ok(plan.addSkills.includes('tdd'),'TDD plan must include the missing Skill');
 assert.ok(plan.paths.includes('.agents/skills/tdd/SKILL.md'),'TDD plan must include actual Skill files');
 assert.deepEqual(treeState(target),before,'TDD plan wrote instance files');
 run(process.execPath,[entry,'skills','ensure','tdd','--apply','--target-dir',target],scratch);
 const tddHash=assertSkill(target,root,'tdd');
 before=treeState(target);
 const replay=JSON.parse(run(process.execPath,[entry,'skills','ensure','tdd','--plan','--target-dir',target],scratch));
 assert.deepEqual(replay.addSkills,[]);assert.deepEqual(replay.paths,[]);
 run(process.execPath,[entry,'skills','ensure','tdd','--apply','--target-dir',target],scratch);
 assert.deepEqual(treeState(target),before,'Satisfied TDD ensure must not write');
 const stage='stage.verification-release-retrospective';before=treeState(target);
 const stagePlan=JSON.parse(run(process.execPath,[entry,'assets','ensure',stage,'--plan','--target-dir',target],scratch));
 assert.equal(stagePlan.addStage,stage);assert.ok(stagePlan.paths.includes(retroRef),'Release stage must install the retrospective asset');
 assert.deepEqual(treeState(target),before,'Stage plan wrote instance files');
 run(process.execPath,[entry,'assets','ensure',stage,'--apply','--target-dir',target],scratch);
 const retroHash=assertAsset(target,retroRef);before=treeState(target);
 run(process.execPath,[entry,'assets','ensure',stage,'--apply','--target-dir',target],scratch);
 assert.deepEqual(treeState(target),before,'Satisfied stage ensure must not write');
 return {initial_example:'intentionally-absent',retro_stage_ensure:'passed',retro_sha256:retroHash,tdd_plan_apply_replay:'passed',tdd_conflict_preservation:'passed',tdd_hash:tddHash};
}
try{
 report.npm_version=run('npm',['--version'],scratch).trim();
 for(const [directory,source] of [['create-yss-spec','.'],['create-yss-strategic-design','submodules/yss-harness-design-agent'],['create-yss-harness-backend','submodules/yss-harness-backend-agent'],['create-yss-harness-frontend','submodules/yss-harness-frontend-agent']]){
  const original=path.join(root,'submodules',directory),cli=path.join(scratch,directory);
  fs.cpSync(original,cli,{recursive:true,filter:ref=>['','bin','src','scripts','config','vendor','package.json','pnpm-lock.yaml','template.manifest.json','template.snapshot.json','cli-core.lock.json'].includes(path.relative(original,ref).split(path.sep)[0])});
  const pkg=JSON.parse(fs.readFileSync(path.join(cli,'package.json')));
  if(directory==='create-yss-spec')run(process.execPath,['scripts/sync-template.js'],cli,{...process.env,YSS_SPEC_TEMPLATE_REPO:root});
  else{syncCore(root,'WORKTREE',cli);syncTemplate(path.join(root,source),'WORKTREE',cli);}
  const snapshot=JSON.parse(fs.readFileSync(path.join(cli,'template.snapshot.json')));if(snapshot.sourceState!=='working-tree')throw Error('Development source state must remain explicit');
  const pack=packCli(cli,pkg);
  const install=path.join(scratch,`${directory}-installed`);
  run('npm',['install','--prefix',install,'--ignore-scripts','--offline','--no-audit','--no-fund',pack.artifact],scratch);
  const installedPkg=JSON.parse(fs.readFileSync(path.join(install,'node_modules',pkg.name,'package.json')));
  assert.equal(installedPkg.name,pkg.name);assert.equal(installedPkg.version,pkg.version);assert.deepEqual(installedPkg.bin,pkg.bin,'Installed CLI entrypoints differ from packaged metadata');
  const entry=path.join(install,'node_modules',pkg.name,'bin',pkg.name+'.js'),target=path.join(scratch,`${directory}-instance`);
  if(directory==='create-yss-spec')run(process.execPath,[entry,'--agent-runtime','codex','--project-name','Contract smoke','--business-domain','Template maintenance','--team-size','1','--issue-tracker','github','--no-example-docs','--target-dir',target],scratch);
  else run(process.execPath,[entry,'init','--target-dir',target,'--project-name','Contract smoke','--business-domain','Template maintenance','--json'],scratch);
  const writingAssets={document_writing_sha256:assertAsset(target,writingRef)},skillHashes={};
  skillHashes['i-have-adhd']=assertSkill(target,root,'i-have-adhd');
  if(directory==='create-yss-spec')Object.assign(writingAssets,ensureMainAssets(entry,target,directory));
  else{
   writingAssets.lifecycle_writing_examples_sha256=assertAsset(target,exampleRef);
   for(const name of ['diagnosing-bugs','grilling'])skillHashes[name]=assertSkill(target,root,name);
   if(directory==='create-yss-strategic-design'){
    skillHashes['yss-strategic-design']=assertSkill(target,path.join(root,source),'yss-strategic-design');
    const manifest=JSON.parse(fs.readFileSync(path.join(cli,'template.manifest.json')));
    assert.ok(manifest.excludePaths.includes(retroRef),'Design must retain its existing retrospective exclusion');
    assert.equal(fs.existsSync(path.join(target,retroRef)),false,'Design CLI included an excluded retrospective asset');
    writingAssets.retrospective='existing-profile-exclusion';
   }else{
    writingAssets.retro_sha256=assertAsset(target,retroRef);
    for(const name of ['implement','tdd'])skillHashes[name]=assertSkill(target,root,name);
   }
  }
  fs.writeFileSync(path.join(target,'contract-smoke.md'),'# 合同阅读验收\n\n目标：保留约束。\n');
  const view=JSON.parse(run(process.execPath,[path.join(target,'scripts/contract'),'view','contract-smoke.md','--kind','spec','--json'],target));
  if(view.execution_allowed!==false||!view.markdown.includes('保留约束'))throw Error('Installed reader did not preserve content');
  run(process.execPath,[entry,'sync','--target-dir',target,...(directory==='create-yss-spec'?['--dry-run']:['--json'])],scratch);
  const review=JSON.parse(run(process.execPath,[path.join(target,'scripts/contract'),'prepare-review','contract-smoke.md','contract-smoke.md','--kind','spec','--json'],target));
  if(review.approval_reusable!==false||review.execution_allowed!==false)throw Error('Review preparation granted approval');
  run('git',['init','-q',target],scratch);
  const specialist=['create-yss-harness-backend','create-yss-harness-frontend'].includes(directory),unit=specialist?'work-unit.harness-entry':'work-unit.entry-triage';
  const input=path.join(scratch,`${directory}-intake-input.json`),taskFile=path.join(scratch,`${directory}-task.json`),runDir=path.join(scratch,`${directory}-run`);
  fs.writeFileSync(input,JSON.stringify({role_id:specialist?'role.harness-orchestrator':'role.requirements-manager',task_id:'intake-smoke',work_unit_id:unit,actor_id:'maintainer',runtime_id:'runtime.generic',contract:{contract_id:'smoke',contract_version:1,contract_ref:'CONTEXT.md'},inputs:['CONTEXT.md'],objective:'read-only research',forbidden_actions:['write'],expected_outputs:['source references'],downstream_consumers:['owner'],convergence:{parent_work_unit:unit,convergence_ref:'current-session'}}));
  run(process.execPath,[path.join(target,'scripts/prepare-read-only-intake'),'--input',input,'--output',taskFile],target);
  const intake=JSON.parse(run(process.execPath,[path.join(target,'scripts/run-read-only-intake'),'--task',taskFile,'--run-dir',runDir],target));
  if(intake.workflow_status!=='resolved'||intake.verification_status!=='not-executed'||intake.result.next_route!==null)throw Error('Invalid generated intake completion');
  run(process.execPath,[path.join(target,'scripts/verify-digital-human-task-package'),path.join(runDir,'task-result.json'),'--run-dir',runDir],target);

  rows.push({package:pkg.name,source,source_state:snapshot.sourceState,template_commit:snapshot.templateCommit,package_artifact:pack.diagnostic,installed_package_metadata:'verified',package_install_init_sync:'passed',writing_assets:writingAssets,installed_skill_hashes:skillHashes,reader:'passed',review_preparation:'passed',intake_producer_runner_consumer:'passed',release_ready:false});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(`${pkg.name}: development package/install/init/sync/read passed`);
 }
 if(verificationInputDigest(root)!==inputDigest)throw Error('Distribution source changed during smoke');report.status='passed';
}catch(error){report.status='failed';report.error=error.message;throw error;}finally{fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');fs.rmSync(scratch,{recursive:true,force:true});}
