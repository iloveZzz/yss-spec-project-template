// Synthetic fixture preparation only; captured decisions never authorize product work.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildDecisionFixture} from './scripts/lib/testing/user-decision-fixture.mjs';
import {verifyUserDecisionFile} from './scripts/lib/native-user-decision.mjs';
const root=process.cwd(),id=JSON.parse(fs.readFileSync('scenario-input.json','utf8')).id,bin=process.env.YSS_NATIVE_BINARY;
assert.ok(bin&&path.isAbsolute(bin),'real pinned native binary required');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
const digest=ref=>'sha256:'+hash(fs.readFileSync(path.join(root,ref)));
const calls=[];
function run(file,args,cwd=root){const r=spawnSync(file,args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024});calls.push({argv:[file,...args],cwd,exit_code:r.status,stdout:r.stdout,stderr:r.stderr});return r;}
let input;
if(id.startsWith('formal-')){
 const receipt=path.join(root,'.eval-tmp/chain.json');
 const ownerSeed=path.join(root,'.eval-tmp/native-backend');
 fs.cpSync('native-backend-seed',ownerSeed,{recursive:true});
 for(const args of [['init','-q'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','Test fixture baseline']])assert.equal(run('git',args,ownerSeed).status,0);

 const r=spawnSync(process.execPath,['--test','scripts/fixtures/role-independent-draft/worker-chain.test.mjs'],{cwd:root,env:{...process.env,YSS_CHAIN_EXISTING_ROOT:ownerSeed,YSS_CHAIN_PRESERVE:'1',YSS_CHAIN_STOP_AFTER_SLICE_APPROVAL:'1',YSS_CHAIN_RECEIPT:receipt},encoding:'utf8',maxBuffer:32*1024*1024});
 assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
 const chain=JSON.parse(fs.readFileSync(receipt,'utf8')),owner=chain.root,stage=JSON.parse(fs.readFileSync(path.join(owner,'worker-stage.json'),'utf8'));
 assert.ok(owner.startsWith(root+path.sep)&&stage.project.startsWith(root+path.sep),'fixture roots must stay in workspace');
 const argv=['contract','verify','--kind','slice','--file',stage.sliceRef,'--approval-ref',stage.cpRef,'--root',owner,'--json'];
 const approved=chain.calls.findLast(call=>call.label==='actual-approved-slice4');assert.equal(approved?.exit_code,0,'current approved Slice must verify before mutation');
 if(id==='formal-missing-contract')fs.unlinkSync(path.join(owner,stage.sliceRef));
 const check=id==='formal-valid-contract'?{status:approved.exit_code,stdout:approved.stdout}:run(bin,argv,owner);assert.equal(check.status===0,id==='formal-valid-contract',check.stdout);
 const protectedRoots=[owner,stage.project];
 const files=protectedRoots.flatMap(dir=>fs.readdirSync(dir,{recursive:true}).filter(ref=>!ref.split(path.sep).includes('.git')).map(ref=>path.join(dir,ref)).filter(file=>fs.lstatSync(file).isFile())).sort();
 input={test_data_only:true,id,root:owner,approval_ref:stage.cpRef,slice_ref:stage.sliceRef,protected_roots:protectedRoots.map(dir=>path.relative(root,dir)),contract_check:JSON.parse(check.stdout),protected:files.map(file=>({ref:path.relative(root,file),sha256:hash(fs.readFileSync(file))})),preparation_receipt:receipt,preparation_checks:chain.calls.length};
}else{
 write('yss-project.yaml',{schema_version:2,repository_mode:'project-instance'});
 write('.template-spec/process/harness-profile.yaml',{schema_version:3,profile_id:'harness.spec-template',status:'active',required_capabilities:['role-independent-governance-v1','stage-gates-v1'],lifecycle:{},execution:{}});
 write('facts.md','TEST DATA ONLY：修复闭区间边界；保留接口，10/20 包含、9/21 排除；只改 src；可回滚本次差异。\n');
 const base=run('git',['rev-parse','HEAD']).stdout.trim();assert.match(base,/^[0-9a-f]{40}$/);
 const record={schema_version:2,policy_version:2,task_id:'MATT-CLOSURE',delivery_path:id.startsWith('standard-')?'standard':'daily',formal_bindings:[],goal_ref:'facts.md',acceptance_ref:'facts.md',repository:{root,baseline_sha:base,baseline_ref:'facts.md',rollback_ref:'facts.md'},scope:{paths:['src'],impacts:['backend','no-api'],risk_ref:'facts.md'},skills:[{ref:'.agents/skills/tdd/SKILL.md',digest:digest('.agents/skills/tdd/SKILL.md')}],inputs:[],commands:[{argv:[process.execPath,'--test','test/range.test.mjs'],cwd:'.'}],api:{mode:'none',reason:'只改纯函数，不影响 API'}};
 let user;
 if(id.startsWith('standard-')){
  write('spec-lite.md','TEST DATA ONLY：当前功能和验收为闭区间，src/range.mjs 两端包含，保持接口。\n');
  user=buildDecisionFixture(path.join(root,'decision'),{boundary:'standard-change-approved',scope:['src'],subjectRef:path.join(root,'spec-lite.md'),referenceRoot:root});
  record.scope.impacts.push('behavior-change');record.spec_lite={ref:'spec-lite.md',digest:digest('spec-lite.md')};
  record.standard_decision={id:'standard-change-approved',decision:'approved',actor_kind:'human',decided_by:'person.requester',spec_lite_digest:record.spec_lite.digest,response_ref:'decision/decision.json',response_digest:digest('decision/decision.json')};
 }else{
  user=buildDecisionFixture(path.join(root,'decision'),{boundary:'daily-change-approved',scope:['src'],subjectRef:path.join(root,'facts.md'),referenceRoot:root});
 }
 const task=()=>write('task.md','# TEST DATA ONLY — 当前任务\n<!-- yss-task-evidence -->\n```json\n'+JSON.stringify(record)+'\n```\n');
 task();const argv=['lifecycle','route','--root',root,'--task','task.md','--implementation-root',root,'--base',base,'--json'];
 const original=run(bin,argv);assert.equal(original.status,0,original.stdout+original.stderr);
 verifyUserDecisionFile('decision/decision.json',{root});
 if(id==='standard-changed')fs.appendFileSync(path.join(root,'spec-lite.md'),'变更：下界改为排除，旧决定未确认此变化。\n');
 if(id==='daily-revoked'){user.respond({text:'撤回本次 src 范围的实现批准',decision:'rejected',time:'2026-09-05T01:04:00Z'});user.save();}
 const current=run(bin,argv);assert.equal(current.status===0,id!=='standard-changed',current.stdout);
 let decision;
 try{decision={status:'approved',result:verifyUserDecisionFile('decision/decision.json',{root})};}catch(error){decision={status:'rejected',code:error.code,message:error.message};}
 assert.equal(decision.status==='approved',!['daily-revoked','standard-changed'].includes(id),JSON.stringify(decision));
 const files=['task.md','facts.md','decision/decision.json','src/range.mjs',...(id.startsWith('standard-')?['spec-lite.md']:[])];
 input={test_data_only:true,id,root,task_ref:'task.md',route:JSON.parse(current.stdout),decision,protected:files.map(ref=>({ref,sha256:hash(fs.readFileSync(path.join(root,ref)))}))};
}
write('verified-input.json',{...input,binary_sha256:hash(fs.readFileSync(bin)),calls});
console.log(JSON.stringify({id,prepared:true,route:input.route?.code,decision:input.decision?.status,contract:input.contract_check?.code}));
