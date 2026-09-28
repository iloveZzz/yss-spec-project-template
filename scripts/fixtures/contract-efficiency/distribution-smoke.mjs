// Development snapshots only. Never writes the user's CLI repositories or claims release readiness.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {verificationInputDigest} from '../../lib/verification-report.mjs';
import {syncCore,syncTemplate} from '../../../.template-source/cli-core/build.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),output=process.argv[2];
if(!output)throw Error('distribution-smoke.mjs <report.json>');
const inputDigest=verificationInputDigest(root);
const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'contract-cli-smoke-'))),rows=[];
const report={kind:'development-distribution-smoke',status:'running',input_sha256:inputDigest,release_ready:false,rows};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const run=(cmd,args,cwd,env=process.env)=>{const r=spawnSync(cmd,args,{cwd,env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});if(r.status!==0)throw Error(`${cmd} ${args.join(' ')}: ${r.stderr||r.stdout||r.error?.message}`);return r.stdout;};
try{
 for(const [directory,source] of [['create-yss-spec','.'],['create-yss-strategic-design','submodules/yss-harness-design-agent'],['create-yss-harness-backend','submodules/yss-harness-backend-agent'],['create-yss-harness-frontend','submodules/yss-harness-frontend-agent']]){
  const original=path.join(root,'submodules',directory),cli=path.join(scratch,directory);
  fs.cpSync(original,cli,{recursive:true,filter:ref=>['','bin','src','scripts','config','vendor','package.json','pnpm-lock.yaml','template.manifest.json','template.snapshot.json','cli-core.lock.json'].includes(path.relative(original,ref).split(path.sep)[0])});
  const pkg=JSON.parse(fs.readFileSync(path.join(cli,'package.json')));
  if(directory==='create-yss-spec')run(process.execPath,['scripts/sync-template.js'],cli,{...process.env,YSS_SPEC_TEMPLATE_REPO:root});
  else{syncCore(root,'WORKTREE',cli);syncTemplate(path.join(root,source),'WORKTREE',cli);}
  const snapshot=JSON.parse(fs.readFileSync(path.join(cli,'template.snapshot.json')));if(snapshot.sourceState!=='working-tree')throw Error('Development source state must remain explicit');
  const pack=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',scratch],cli))[0];
  const install=path.join(scratch,`${directory}-installed`);
  run('npm',['install','--prefix',install,'--ignore-scripts','--offline','--no-audit','--no-fund',path.join(scratch,pack.filename)],scratch);
  const entry=path.join(install,'node_modules',pkg.name,'bin',pkg.name+'.js'),target=path.join(scratch,`${directory}-instance`);
  if(directory==='create-yss-spec')run(process.execPath,[entry,'--agent-runtime','codex','--project-name','Contract smoke','--business-domain','Template maintenance','--team-size','1','--issue-tracker','github','--no-example-docs','--target-dir',target],scratch);
  else run(process.execPath,[entry,'init','--target-dir',target,'--project-name','Contract smoke','--business-domain','Template maintenance','--json'],scratch);
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

  rows.push({package:pkg.name,source,source_state:snapshot.sourceState,template_commit:snapshot.templateCommit,package_install_init_sync:'passed',reader:'passed',review_preparation:'passed',intake_producer_runner_consumer:'passed',release_ready:false});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(`${pkg.name}: development package/install/init/sync/read passed`);
 }
 if(verificationInputDigest(root)!==inputDigest)throw Error('Distribution source changed during smoke');report.status='passed';
}catch(error){report.status='failed';report.error=error.message;throw error;}finally{fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');fs.rmSync(scratch,{recursive:true,force:true});}
