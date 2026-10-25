import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runCommandSync} from '../../lib/command-runner.mjs';
import {byteDigest,parseAsset} from '../../lib/structured-assets.mjs';
import {formatObservedTest,prepareTaskTestEdit} from '../../lib/daily-test-evidence.mjs';
import {buildDecisionFixture} from '../../lib/testing/user-decision-fixture.mjs';
const source=path.resolve(import.meta.dirname,'../../..'),bin=process.env.YSS_NATIVE_BINARY;
assert.ok(bin&&path.isAbsolute(bin));
const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'daily2-native-'))),root=path.join(temp,'governance'),repo=path.join(temp,'implementation'),results=[];
const hash=x=>createHash('sha256').update(x).digest('hex');
const put=(dir,ref,value)=>{const file=path.join(dir,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value));};
const write=(ref,value)=>put(root,ref,value),digest=ref=>'sha256:'+hash(fs.readFileSync(path.join(root,ref)));
const exec=(label,file,args,cwd)=>{const started_at=new Date().toISOString(),r=spawnSync(file,args,{cwd,encoding:'utf8'});results.push({label,argv:[file,...args],cwd,started_at,exit:r.status,stdout:r.stdout,stderr:r.stderr});return r;};
try{
 fs.mkdirSync(root,{recursive:true});fs.mkdirSync(repo,{recursive:true});
 fs.cpSync(path.join(source,'.template-spec/process'),path.join(root,'.template-spec/process'),{recursive:true});
 for(const ref of ['CONTEXT.md','AGENTS.md','.template-spec/agents/issue-tracker.md'])write(ref,fs.readFileSync(path.join(source,ref),'utf8'));
 write('yss-project.yaml',{schema_version:2,repository_mode:'project-instance'});
 write('.template-spec/process/harness-profile.yaml',{schema_version:3,profile_id:'harness.spec-template',status:'active',required_capabilities:['role-independent-governance-v1','stage-gates-v1'],lifecycle:{},execution:{}});
 write('facts.md','目标、验收、工程基线、可回滚范围和风险。\n');write('skill.md','本次适用检查\n');
 put(repo,'src/server.mjs','export const enabled=false;\n');
 const git=args=>{const r=exec('fixture-git','git',['-c','user.name=test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false',...args],repo);assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git(['init','-q']);git(['add','.']);git(['commit','-qm','baseline']);const base=git(['rev-parse','HEAD']);put(repo,'src/server.mjs','export const enabled=true;\n');
 const record={schema_version:2,policy_version:2,task_id:'DAILY-2',delivery_path:'daily',formal_bindings:[],goal_ref:'facts.md',acceptance_ref:'facts.md',repository:{root:repo,baseline_sha:base,baseline_ref:'facts.md',rollback_ref:'facts.md'},scope:{paths:['src'],impacts:['backend','no-api'],risk_ref:'facts.md'},skills:[{ref:'skill.md',digest:digest('skill.md')}],inputs:[],commands:[{argv:[process.execPath,'--check','src/server.mjs'],cwd:'.'}],api:{mode:'none',reason:'没有API变化'}};
 let sections='',testSequence=0;const task=()=>write('task.md',`# 日常任务\n${sections}<!-- yss-task-evidence -->\n\`\`\`json\n${JSON.stringify(record).replaceAll('<','\\u003c')}\n\`\`\`\n`);
 const run=(label,action='verify-daily',expected='OK')=>{task();const args=['lifecycle',action,'--root',root,'--task','task.md','--implementation-root',repo,'--base',base,'--json'];const r=exec(label,bin,args,root),p=JSON.parse(r.stdout);assert.equal(p.code,expected,`${label}: ${JSON.stringify(p.result?.diagnostics)}`);return p.result;};
 const human=label=>{task();const args=['lifecycle','route','--root',root,'--task','task.md','--implementation-root',repo,'--base',base,'--human'];const r=exec(label,bin,args,root);assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.includes('测试 → 适用复核（默认真实自检，按当前要求提供独立或外部复核）'),r.stdout);assert.ok(r.stdout.includes('本路由只读，不授予实现、批准或发布资格'),r.stdout);};
 const captureTest=current=>{
  const argv=record.commands[0].argv,executed_at=new Date().toISOString();
  const result=runCommandSync(argv[0],argv.slice(1),{cwd:repo});
  results.push({label:'actual-business-test',argv,cwd:repo,started_at:executed_at,...result});
  const refreshed=run('route-after-test','route');assert.equal(refreshed.candidate_digest,current.candidate_digest);
  const formatted=formatObservedTest({argv,cwd:repo,executed_at,candidate_digest:current.candidate_digest,result},{command_index:0,log_ref:'#测试运行 '+(++testSequence)});
  task();const before=fs.readFileSync(path.join(root,'task.md'),'utf8'),expected_task_digest=byteDigest(before);
  write('task.md',before+'用户并发修改');
  assert.throws(()=>prepareTaskTestEdit({expected_task_digest,current_markdown:fs.readFileSync(path.join(root,'task.md')),current_candidate_digest:current.candidate_digest,...formatted}));
  assert.equal(fs.readFileSync(path.join(root,'task.md'),'utf8'),before+'用户并发修改');
  write('task.md',before); // Remove only this fixture's concurrent-edit simulation.
  const reread=fs.readFileSync(path.join(root,'task.md'),'utf8');assert.equal(byteDigest(reread),expected_task_digest);
  const edit=prepareTaskTestEdit({expected_task_digest,current_markdown:reread,current_candidate_digest:current.candidate_digest,...formatted});
  assert.equal(byteDigest(fs.readFileSync(path.join(root,'task.md'))),expected_task_digest);
  const updated=reread.replace(edit.expected_old_text,()=>edit.replacement_text);write('task.md',updated);
  const marker=updated.indexOf('<!-- yss-task-evidence -->');sections=updated.slice('# 日常任务\n'.length,marker);
  const updatedRecord=parseAsset(updated.slice(marker).match(/```json\n([\s\S]*?)\n```/)[1],'record.json');
  record.tests=updatedRecord.tests;
  const after=run('route-after-write','route');assert.equal(after.candidate_digest,current.candidate_digest);
  return formatted;
 };
 const populate=()=>{
  const current=run('route-current','route');assert.equal(current.delivery_path,record.delivery_path);
  const implementationTime=new Date().toISOString();
  const argv=record.commands[0].argv,r=exec('actual-implementation',argv[0],argv.slice(1),repo);assert.equal(r.status,0);
  const provenance={tool:'node',task_ref:'task.md',execution_ref:'implementation.json',identity:{status:'unavailable',reason:'shell does not expose stable identity'}};
  const actual={tool:provenance.tool,task_ref:provenance.task_ref,identity:provenance.identity,argv,cwd:repo,exit_code:r.status,executed_at:implementationTime,stdout:r.stdout,stderr:r.stderr,candidate_digest:current.candidate_digest.slice(7),scope:record.scope.paths,result:'passed',blocking_findings:[]};
  write('implementation.json',actual);
  record.implementation={provenance,diff_digest:current.diff_digest,changed_files:current.changed_files};
  const formatted=captureTest(current);assert.equal(formatted.test.exit_code,0);
  const reviewRun=exec('actual-self-check',argv[0],argv.slice(1),repo);assert.equal(reviewRun.status,0);
  write('review-execution.json',{...actual,exit_code:reviewRun.status,executed_at:new Date().toISOString(),stdout:reviewRun.stdout,stderr:reviewRun.stderr});
  const assessment={mode:'self-check',provenance:{...provenance,execution_ref:'review-execution.json'}};
  const review={assessment,result:'passed',blocking_findings:[],candidate_digest:current.candidate_digest};write('review.json',review);record.review={...review,ref:'review.json',digest:digest('review.json')};return current;
 };
 const current=populate();assert.ok(record.tests[0].log_ref.startsWith('#'),'test evidence must use generated same-Ticket log');run('ordinary-selfcheck-without-registry');human('daily2-human-current');
 const defaultCommand=record.commands[0];
 for(const [index,payload] of ['<!-- yss-task-evidence -->', "$& $' $` $$"].entries()){
  record.commands[0]={argv:[process.execPath,'--input-type=module','-e','import assert from "node:assert/strict";import {enabled} from "./src/server.mjs";assert.ok(enabled);process.stdout.write(process.argv[1]);',payload],cwd:'.'};
  populate();run('literal-output-'+index);
  const originalLog=sections.split(record.tests[0].log_ref.replace('#','# ')+'\n')[1].split('\n# ')[0];
  assert.equal(parseAsset(originalLog.slice(8,-5),'log.json').stdout,payload);
 }
 record.commands[0]=defaultCommand;populate();run('ordinary-after-literal-output');
 put(repo,'src/server.mjs','export const enabled=;\n');const failedCandidate=run('route-failing-candidate','route');
 const failed=captureTest(failedCandidate);assert.notEqual(failed.test.exit_code,0);run('actual-failure-blocks-completion','verify-daily','DAILY_EVIDENCE');
 const failedBytes=failed.log_bytes;
 put(repo,'src/server.mjs','export const enabled="next";\n');populate();run('new-candidate-after-real-failure');assert.ok(sections.includes(failedBytes));
 put(repo,'src/server.mjs','export const enabled=true;\n');populate();run('restored-candidate-retains-old-failure');
 record.schema_version=1;run('mixed-record','route','DAILY_VERSION');record.schema_version=2;
 record.policy_version=99;run('unknown-policy','route','DAILY_VERSION');record.policy_version=2;
 record.tests[0].exit_code=1;run('failed-actual-test','verify-daily','DAILY_EVIDENCE');record.tests[0].exit_code=0;
 record.tests[0].status='not-run';run('not-run-test','verify-daily','DAILY_EVIDENCE');delete record.tests[0].status;
 const snapshot=structuredClone(record.review);record.review.blocking_findings=['open'];run('open-findings','verify-daily','DAILY_EVIDENCE');record.review=snapshot;
 put(repo,'src/server.mjs','export const enabled="drift";\n');run('current-diff-drift','verify-daily','DAILY_EVIDENCE');put(repo,'src/server.mjs','export const enabled=true;\n');
 record.external_rules={state:'known-unverifiable',requirements:[{rule_ref:'platform:required',scope:['src'],reason:'unavailable capture'}]};run('known-external-gap','verify-daily','EXTERNAL_REQUIREMENT');delete record.external_rules;
 // Required independent review comes from a frozen user source on a child path.
 const originalRecord=structuredClone(record);
 write('review-request.json',{source_kind:'session-export',messages:[{id:'request',actor_kind:'biological-human',principal_ref:'person.requester',original_ref:'test-only://independent-request',sent_at:'2026-09-05T01:00:00Z',text:'请独立复核 src/server.mjs'}]});
 write('review-requirement.json',{kind:'review-requirement',mode:'independent-review',scope:['src/server.mjs'],source:{kind:'session-export',ref:'review-request.json',digest:digest('review-request.json'),message_id:'request'}});
 record.inputs=[{ref:'review-requirement.json',digest:digest('review-requirement.json')}];const required=populate();run('bound-child-requires-independent','verify-daily','EVIDENCE_REVIEW');
 for(const [key,session] of [['implementation','impl-context'],['review','review-context']]){
  const provenance=key==='implementation'?record.implementation.provenance:record.review.assessment.provenance;
  provenance.identity={status:'available',principal_ref:'same-account',session_ref:session};
  const log=JSON.parse(fs.readFileSync(path.join(root,provenance.execution_ref),'utf8'));log.identity=provenance.identity;log.readonly=key==='review';write(provenance.execution_ref,log);
  write(session+'.json',{source_kind:'session-export',session_ref:session,messages:[{id:session,original_ref:'test-only://'+session,principal_ref:'same-account',sent_at:log.executed_at,text:provenance.execution_ref+' '+required.candidate_digest.slice(7)}]});
 }
 const assessment=record.review.assessment;assessment.mode='independent-review';assessment.independence={implementation:record.implementation.provenance,reviewer:assessment.provenance,implementation_context_ref:'impl-context.json',reviewer_context_ref:'review-context.json',evidence:{ref:'review-execution.json',digest:hash(fs.readFileSync(path.join(root,'review-execution.json')))},candidate:{ref:'task.md',digest:required.candidate_digest.slice(7)},scope:record.scope.paths,readonly:true};
 const persistReview=()=>{write('review.json',Object.fromEntries(Object.entries(record.review).filter(([k])=>!['ref','digest'].includes(k))));record.review.digest=digest('review.json');};
 persistReview();run('same-account-distinct-real-context');
 assessment.independence.reviewer_context_ref='impl-context.json';persistReview();run('same-context-not-independent','verify-daily','EVIDENCE_INDEPENDENCE');
 Object.assign(record,structuredClone(originalRecord));populate();
 // Same Ticket headings carry the actual original execution bytes, with no extra proof package.
 const reviewRaw=fs.readFileSync(path.join(root,'review-execution.json'),'utf8');sections+=`# Review execution\n\`\`\`json\n${reviewRaw}\n\`\`\`\n`;
 const fragmentReview={...record.review,assessment:{...record.review.assessment,provenance:{...record.review.assessment.provenance,execution_ref:'#Review execution'}}};delete fragmentReview.ref;delete fragmentReview.digest;write('review.json',fragmentReview);record.review={...fragmentReview,ref:'review.json',digest:digest('review.json')};run('same-ticket-original-fragment');
 const uniqueSections=sections;sections+=sections;run('ambiguous-heading','verify-daily','NEEDS_INFO');sections=uniqueSections;record.review=snapshot;write('review.json',Object.fromEntries(Object.entries(snapshot).filter(([k])=>!['ref','digest'].includes(k))));
 // A true user-decision record preserves original request, presented Spec-lite, response and current scope.
 write('spec-lite.md','当前功能、验收及 src 实现范围。\n');const user=buildDecisionFixture(path.join(root,'decision'),{boundary:'standard-change-approved',scope:['src'],subjectRef:path.join(root,'spec-lite.md')});
 record.delivery_path='standard';record.scope.impacts=['backend','no-api','behavior-change'];record.spec_lite={ref:'spec-lite.md',digest:digest('spec-lite.md')};
 record.standard_decision={id:'standard-change-approved',decision:'approved',actor_kind:'human',decided_by:'person.requester',spec_lite_digest:record.spec_lite.digest,response_ref:'decision/decision.json',response_digest:digest('decision/decision.json')};
 const standardBytes=fs.readFileSync(path.join(root,'spec-lite.md')),decisionBytes=fs.readFileSync(path.join(root,'decision/decision.json'));
 const standardCurrent=populate();run('standard-real-same-requester');human('standard2-human-current');
 sections+='# 任务进度\n验收→当前实现项→实际验证→完成；细化现有范围。\n';
 assert.equal(run('standard-progress-preserves-candidate','route').candidate_digest,standardCurrent.candidate_digest);
 captureTest(standardCurrent);run('standard-progress-continues');
 assert.deepEqual(fs.readFileSync(path.join(root,'spec-lite.md')),standardBytes);assert.deepEqual(fs.readFileSync(path.join(root,'decision/decision.json')),decisionBytes);
 user.respond({text:'撤回批准',decision:'rejected',time:'2026-09-05T01:04:00Z'});user.save();record.standard_decision.response_digest=digest('decision/decision.json');run('standard-revoked','route','user-decision-not-approved');
 // Backend uses its real current Profile policies and still requires actual business input.
 fs.cpSync(path.join(source,'profiles/backend/.template-spec/process'),path.join(root,'.template-spec/process'),{recursive:true});
 for(const key of Object.keys(record))delete record[key];Object.assign(record,structuredClone(originalRecord));
 record.business_input={mode:'standalone',side:'backend',ref:'facts.md',digest:digest('facts.md'),conflicts:[]};
 populate();run('backend-current-standalone-selfcheck');
 delete record.business_input;run('backend-missing-business-input','route','NEEDS_INFO');
 console.log('daily2 native current source, Backend and standard real-user scenarios passed');
}finally{
 if(process.env.YSS_DAILY_RECEIPT)fs.writeFileSync(process.env.YSS_DAILY_RECEIPT,JSON.stringify({binary:bin,sha256:hash(fs.readFileSync(bin)),pinned:false,results},null,2));
 fs.rmSync(temp,{recursive:true,force:true});
}
