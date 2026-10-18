import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {nativeContractVerify,nativeEvidenceVerify} from '../scripts/lib/native-evidence.mjs';
import {withValidationPhase} from '../scripts/lib/validation-phase.mjs';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {makeRoot} from './helpers/yss-instance.mjs';
import {checkBusinessTickets,ticketMetadata} from '../scripts/lib/business-tickets.mjs';
import {fixture as handoffFixture} from '../scripts/fixtures/strategic-handoff/fixture.mjs';
import {exportBundle} from '../scripts/lib/strategic-handoff.mjs';
import {digest as objectDigest} from '../scripts/lib/strategic-handoff-io.mjs';
import {parse as parseYaml} from '../scripts/vendor/yaml.mjs';
import {approvedSpecFixture,localPlanFixture,bindLocalPlanHandoff} from '../scripts/fixtures/spec-baseline/fixture.mjs';
import {pilotFixture} from '../scripts/fixtures/slice-contract-v3/pilot-fixture.mjs';

// Keep every absolute reference emitted by reused fixtures on the canonical path.
process.env.TMPDIR=fs.realpathSync(os.tmpdir());
const {binary}=contextBinary();
const sha=bytes=>`sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const run=args=>{const p=spawnSync(binary,args,{encoding:'utf8',maxBuffer:32*1024*1024});assert.equal(p.signal,null);assert.equal(p.error,undefined);return {...p,envelope:JSON.parse(p.stdout)};};
const body='\n# 登记来源\n## 业务结果\n登记成功\n## 范围\n当前来源\n## 非目标\n无运行操作\n## 验收\nAC-001\n## 风险\n保留失败输入\n';
function fixture(t) {
  const root=makeRoot('business-native-');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const put=(ref,value)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
  const bind=ref=>({ref,version:'v1',digest:sha(fs.readFileSync(path.join(root,ref)))});
  const setRef='docs/business/set.json',ticketRef='docs/business/business-tickets/BT-001.md',specRef='docs/business/spec.md';
  put(specRef,'---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-001 | 登记来源 |\n## 验收标准\n| ID | 需求引用 |\n|---|---|\n| AC-001 | FR-001 |\n');
  const ticket={schema_version:1,kind:'business-ticket',id:'BT-001',version:'v1',status:'ready-for-human',spec:bind(specRef),requirement_refs:['FR-001'],acceptance_refs:['AC-001'],dependencies:[],source_refs:[],open_questions:[]};
  const set={schema_version:1,kind:'business-ticket-set',id:'business-ticket-set.demo',version:'v1',status:'ready-for-human',spec:ticket.spec,tickets:[],coverage_deferred:[],review_ref:'docs/business/review.json'};
  const save=(content=body)=>{put(ticketRef,'---\n'+JSON.stringify(ticket)+'\n---\n'+content);set.tickets=[{id:'BT-001',...bind(ticketRef)}];put(setRef,set);put('docs/business/review-evidence.md','独立审查合成证据，不代表真实批准。\n');put(set.review_ref,{schema_version:1,kind:'business-ticket-review',result:'passed',subject_ref:setRef,subject_digest:bind(setRef).digest,reviewer:'reviewer.fixture',drafter:'drafter.fixture',evidence:[bind('docs/business/review-evidence.md')]});};
  save();return {root,put,bind,setRef,ticketRef,specRef,ticket,set,save};
}
function native(f,{mode='formal',reviewRef,file=f.setRef,extra=[]}={}) {
  const p=run(['contract','verify','--root',f.root,'--kind','business-tickets','--file',file,'--mode',mode,...(reviewRef?['--review-ref',reviewRef]:[]),...extra,'--json']);
  const report=p.envelope.result?.coverage?.business_tickets;
  assert.ok(report,JSON.stringify(p.envelope));assert.equal(report.read_only,true);assert.equal(report.execution_authorization,'not-evaluated');
  assert.equal(report.status==='passed',p.status===0,JSON.stringify(p.envelope));return {...p,report};
}
const codes=report=>report.diagnostics.map(x=>x.code);
const node=(f,mode='formal',reviewRef)=>checkBusinessTickets({root:f.root,setRef:f.setRef,mode,reviewRef});

test('业务调用方缺少原生执行器时拒绝，不回退进程内规则',t=>{
  const f=fixture(t),previous=process.env.YSS_NATIVE_BINARY;
  process.env.YSS_NATIVE_BINARY=path.join(f.root,'missing-yss');
  try {assert.throws(()=>node(f),/NATIVE|原生|二进制|不存在|ENOENT/);}
  finally {if(previous===undefined)delete process.env.YSS_NATIVE_BINARY;else process.env.YSS_NATIVE_BINARY=previous;}
});

for(const mode of ['draft','formal'])test(`公开业务报告：${mode} 与 Node 成功报告同形，业务闭包与完整读集分离`,t=>{
  const f=fixture(t),n=node(f,mode),g=native(f,{mode});assert.equal(g.status,0);assert.deepEqual(g.report,n);
  assert.ok(g.envelope.result.inputs.length>g.report.inputs.length);
  assert.ok(g.envelope.result.inputs.some(x=>x.ref.endsWith('business-tickets-v1.schema.json')));
  assert.ok(g.report.inputs.every(x=>!x.ref.startsWith('.template-spec/')));
  for(const input of g.report.inputs)assert.equal(input.digest,sha(fs.readFileSync(path.join(f.root,input.ref))));
});

test('公开业务报告：多条独立诊断和 uncovered 不被首错截断',t=>{
  const f=fixture(t);f.ticket.acceptance_refs=[];f.ticket.dependencies=['BT-001','BT-missing'];f.ticket.open_questions=[{id:'Q-1',question:'待解决',owner:'product',resolve_by:'Design',blocking:true}];f.ticket.status='draft';f.set.status='draft';f.save(body.replace('## 风险','## 其它'));
  const r=native(f).report;for(const code of ['COVERAGE_REQUIRED','COVERAGE_MISSING','DEPENDENCY_CYCLE','DANGLING_DEPENDENCY','OPEN_BLOCKER','TICKET_DRAFT','SET_DRAFT','REQUIRED_SECTION','SCHEMA_INVALID'])assert.ok(codes(r).includes(code),JSON.stringify(r));
  assert.deepEqual(r.uncovered,['AC-001']);assert.equal(r.status,'blocked');assert.ok(r.diagnostics.every(x=>Object.hasOwn(x,'locator')&&x.source_ref&&x.recovery));
});

test('公开业务报告：draft 容纳已登记阻断项，formal 拒绝',t=>{
  const f=fixture(t);f.ticket.status='draft';f.set.status='draft';f.ticket.open_questions=[{id:'Q-1',question:'待解决',owner:'product',resolve_by:'Design',blocking:true}];f.save();assert.equal(native(f,{mode:'draft'}).status,0);assert.ok(codes(native(f).report).includes('OPEN_BLOCKER'));
});

test('公开业务报告：Schema、ID、版本与原始字节绑定分别保留',t=>{
  const variants=[['SCHEMA_INVALID',f=>{f.ticket.extra=true;f.save();}],['BUSINESS_TICKET_INVALID',f=>{f.ticket.id='BT-other';f.save();}],['BUSINESS_TICKET_INVALID',f=>{f.ticket.version='v2';f.save();f.set.tickets[0].version='v1';f.put(f.setRef,f.set);}],['SOURCE_STALE',f=>fs.appendFileSync(path.join(f.root,f.ticketRef),'raw byte drift\n')],['DUPLICATE_ID',f=>{f.set.tickets.push({...f.set.tickets[0]});f.put(f.setRef,f.set);}],['SPEC_BINDING_MISMATCH',f=>{f.ticket.spec={...f.ticket.spec,version:'v2'};f.save();}],['BINDING_INVALID',f=>{f.ticket.source_refs=[{...f.bind(f.specRef),version:'future'}];f.save();}]];
  for(const [code,mutate]of variants){const f=fixture(t);mutate(f);assert.ok(codes(native(f).report).includes(code),code);}
});

test('公开业务报告：来源 locator 不接受正文偶然文本、示例或重复 ID',t=>{
  for(const text of ['# 规则\n只是提到 rule.1\n','## 示例\n| ID | 内容 |\n|---|---|\n| rule.1 | 虚构 |\n','{"rules":[{"id":"rule.1"},{"id":"rule.1"}]}']){
    const f=fixture(t),ref=text.startsWith('{')?'rules.json':'rules.md';f.put(ref,text);f.ticket.source_refs=[{...f.bind(ref),locator:'rule.1',locator_kind:'id'}];f.save();assert.ok(codes(native(f).report).includes('DANGLING_REFERENCE'));
  }
  const f=fixture(t);f.put('rules.md','## 真实来源\n| ID | 内容 |\n|---|---|\n| rule.1 | 有效规则 |\n');f.ticket.source_refs=[{...f.bind('rules.md'),locator:'rule.1',locator_kind:'id'}];f.save();assert.equal(native(f).status,0);
  f.ticket.requirement_refs=['FR-other'];f.save();assert.ok(codes(native(f).report).includes('AC_REQUIREMENT_MISMATCH'));
});

test('公开业务报告：延期责任、重复覆盖与 formal 决定绑定',t=>{
  const f=fixture(t);fs.appendFileSync(path.join(f.root,f.specRef),'| AC-002 | FR-001 |\n');f.ticket.spec=f.bind(f.specRef);f.set.spec=f.ticket.spec;
  const deferred={id:'AC-002',reason:'下一批',risk:'未交付',owner:'owner',target_version:'v2',followup_ticket_ref:'ticket.next',verification_plan:'验证 AC-002'};f.set.coverage_deferred=[deferred];f.save();assert.equal(native(f,{mode:'draft'}).status,0);assert.ok(codes(native(f).report).includes('DEFERRED_DECISION_REQUIRED'));
  f.put('decision.md','记录已有决定，不授予新批准。\n');deferred.decision=f.bind('decision.md');f.save();assert.equal(native(f).status,0);
  deferred.id='AC-001';delete deferred.owner;f.save();const c=codes(native(f).report);assert.ok(c.includes('DEFERRED_COVERAGE_INVALID'));assert.ok(c.includes('DEFERRED_INCOMPLETE'));assert.ok(c.includes('COVERAGE_MISSING'));
});

test('公开业务报告：独立审查、旧 subject、证据和显式 review-ref',t=>{
  const f=fixture(t),review=JSON.parse(fs.readFileSync(path.join(f.root,f.set.review_ref)));f.put('alternate-review.json',review);f.put(f.set.review_ref,{...review,reviewer:review.drafter});assert.ok(codes(native(f).report).includes('REVIEW_REQUIRED'));assert.deepEqual(native(f,{reviewRef:'alternate-review.json'}).report,node(f,'formal','alternate-review.json'));
  f.put(f.set.review_ref,{...review,subject_digest:'sha256:'+'0'.repeat(64)});assert.ok(codes(native(f).report).includes('REVIEW_REQUIRED'));
  f.put(f.set.review_ref,review);fs.appendFileSync(path.join(f.root,'docs/business/review-evidence.md'),'changed');assert.ok(codes(native(f).report).includes('SOURCE_STALE'));
});

for(const [name,mutate,code] of [
  ['推进意图不能作为审查证据', (f,review)=>{const ref='docs/business/progression-target.json';f.put(ref,{schema_version:1,kind:'lifecycle-progression-target',target:'spec-approved'});review.evidence.push(f.bind(ref));}, 'PROGRESSION_EVIDENCE'],
  ['同 ref 和 digest 不因合法版本不同获得重复权重', (f,review)=>{review.evidence.push({...review.evidence[0],version:'v2'});}, 'EVIDENCE_INVALID'],
])test(`业务审查 Basis：${name}`,t=>{
  const f=fixture(t),review=JSON.parse(fs.readFileSync(path.join(f.root,f.set.review_ref)));mutate(f,review);f.put(f.set.review_ref,review);
  const p=native(f);assert.equal(p.status,1,JSON.stringify(p.envelope));assert.equal(p.report.status,'blocked');assert.ok(codes(p.report).includes(code),JSON.stringify(p.report));
});

test('公开业务报告：路径与 symlink 拒绝，普通根不回退 Context snapshot',t=>{
  const f=fixture(t);f.set.spec={...f.set.spec,ref:'../outside.md'};f.put(f.setRef,f.set);assert.notEqual(native(f).status,0);
  f.set.spec=f.ticket.spec;f.save();const outside=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'business-outside-')),'ticket.md');t.after(()=>fs.rmSync(path.dirname(outside),{recursive:true,force:true}));fs.writeFileSync(outside,fs.readFileSync(path.join(f.root,f.ticketRef)));fs.unlinkSync(path.join(f.root,f.ticketRef));fs.symlinkSync(outside,path.join(f.root,f.ticketRef));assert.notEqual(native(f).status,0);
  const other=fixture(t);other.ticket.source_refs=[other.bind('CONTEXT.md')];other.save();fs.renameSync(path.join(other.root,'CONTEXT.md'),path.join(other.root,'source-context.snapshot.md'));const p=run(['contract','verify','--root',other.root,'--kind','business-tickets','--file',other.setRef,'--json']);assert.notEqual(p.status,0);assert.notEqual(p.envelope.result?.coverage?.business_tickets?.status,'passed');
});

test('公开业务报告：kind、参数、帮助与能力令牌一致',t=>{
  const f=fixture(t);assert.ok(run(['capabilities','--json']).envelope.result.nodeDelegation.includes('contract.business-tickets-report.v1'));
  const help=spawnSync(binary,['contract','verify','--help'],{encoding:'utf8'});assert.equal(help.status,0);for(const word of ['business-tickets','--mode','--review-ref'])assert.ok(help.stdout.includes(word));
  for(const args of [['--mode','future'],['--mode','draft','--history'],['--mode','draft','--schema','override.json']]){const p=run(['contract','verify','--root',f.root,'--kind','business-tickets','--file',f.setRef,...args,'--json']);assert.equal(p.status,2);}
  for(const flag of ['--mode','--review-ref'])assert.equal(run(['contract','verify','--root',f.root,'--kind','scaffold','--file',f.setRef,flag,'draft','--json']).status,2);
});

test('公开业务报告：真实导出快照保留来源视图、清单与严格 Handoff 消费',async t=>{
  const root=makeRoot('business-handoff-native-','design');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const seed=makeRoot('business-policy-seed-','design');t.after(()=>fs.rmSync(seed,{recursive:true,force:true}));
  const f={root,...await handoffFixture(root,{nativeSeed:seed,handoffVersion:5,businessTickets:true})};
  const ticketRef='source/business-tickets/BT-001.md',text=fs.readFileSync(path.join(root,ticketRef),'utf8'),ticket=ticketMetadata(text);ticket.source_refs.push({ref:'CONTEXT.md',version:'v1',digest:sha(fs.readFileSync(path.join(root,'CONTEXT.md')))});
  f.put(ticketRef,'---\n'+JSON.stringify(ticket)+'\n---\n'+text.split(/\n---\n/)[1]);const set=JSON.parse(fs.readFileSync(path.join(root,'source/tickets.yaml')));set.tickets[0].digest=sha(fs.readFileSync(path.join(root,ticketRef)));f.put('source/tickets.yaml',set);const review=JSON.parse(fs.readFileSync(path.join(root,'source/business-review.yaml')));review.subject_digest=sha(fs.readFileSync(path.join(root,'source/tickets.yaml')));f.put('source/business-review.yaml',review);f.handoff.source.business_ticket_set_ref.digest=review.subject_digest;f.sign();
  const currentPlan=localPlanFixture(f);bindLocalPlanHandoff(f,currentPlan);f.put('business-source-checkpoint.json',{schema_version:1,repository_mode:'project-instance',mode:'route',status:'routing',stage:'stage.plan',artifacts:{},context_reconciliation:{status:'reconciled',ref:'reconciliation.json',evidence_refs:['reconciliation.json']},next_work_unit:'work-unit.plan-requirements',ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[],...currentPlan.state});
  const prefix='docs/handoffs/strategic-design-handoff.supplier/v1/package',base=prefix+'/payload/files/',packageRoot=path.join(root,prefix);await exportBundle({sourceRoot:root,handoffRef:'handoff.yaml',output:packageRoot});
  const imported={root,setRef:base+'source/tickets.yaml'},snapshot=fs.readFileSync(path.join(packageRoot,'payload/files/source-context.snapshot.md'));const good=native(imported);assert.equal(good.status,0,JSON.stringify(good.envelope));assert.deepEqual(good.report,checkBusinessTickets({root,setRef:imported.setRef,mode:'formal'}));assert.ok(good.report.inputs.some(x=>x.ref===base+'source-context.snapshot.md'));assert.ok(good.envelope.result.inputs.some(x=>x.ref.endsWith('manifest.json')));assert.deepEqual(fs.readFileSync(path.join(packageRoot,'payload/files/source-context.snapshot.md')),snapshot);
  const gate=()=>run(['handoff','verify','--root',root,'--kind','package','--package',prefix,'--json']);const gateBefore=gate();assert.equal(gateBefore.status,0,JSON.stringify(gateBefore.envelope));
  const manifestFile=path.join(packageRoot,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));
  const reseal=()=>{for(const entry of manifest.files){const bytes=fs.readFileSync(path.join(packageRoot,entry.path));entry.sha256=sha(bytes);entry.size_bytes=bytes.length;}const {bundle_digest,...fields}=manifest;manifest.bundle_digest=objectDigest(fields);fs.writeFileSync(manifestFile,JSON.stringify(manifest));};
  const businessReview=path.join(packageRoot,'payload/files/source/business-review.yaml'),reviewBytes=fs.readFileSync(businessReview),invalidReview=parseYaml(reviewBytes.toString());invalidReview.reviewer=invalidReview.drafter;fs.writeFileSync(businessReview,JSON.stringify(invalidReview));reseal();assert.ok(codes(native(imported).report).includes('REVIEW_REQUIRED'));const deniedGate=gate();assert.equal(deniedGate.envelope.code,'REVIEW_REQUIRED',JSON.stringify(deniedGate.envelope));fs.writeFileSync(businessReview,reviewBytes);reseal();
  fs.appendFileSync(path.join(packageRoot,'payload/files/'+ticketRef),'tampered\n');assert.notEqual(native(imported).status,0);reseal();assert.ok(codes(native(imported).report).includes('SOURCE_STALE'));assert.notEqual(gate().status,0);
  f.put(prefix+'/unregistered.txt','extra');assert.notEqual(native(imported).status,0);fs.unlinkSync(path.join(root,prefix,'unregistered.txt'));
  const rolesFile=path.join(packageRoot,'payload/files/.template-spec/agents/digital-human-roles.yaml'),roles=parseYaml(fs.readFileSync(rolesFile,'utf8'));roles.user_decision_policy.required_capabilities.push('future-business-v99');fs.writeFileSync(rolesFile,JSON.stringify(roles));reseal();assert.notEqual(native(imported).status,0);
});

test('公开业务报告：非法结构安全阻断，未知导入布局明确拒绝',t=>{
  for(const mutate of [f=>{f.ticket.version=[];f.set.tickets[0].version=[];},f=>{f.ticket.dependencies={invalid:true};},f=>{f.ticket.source_refs=[null];},f=>{f.ticket.open_questions=[null];}]){
    const f=fixture(t);mutate(f);f.save();const p=native(f);assert.notEqual(p.status,0);assert.ok(codes(p.report).includes('SCHEMA_INVALID'));
  }
  const f=fixture(t);delete f.set.coverage_deferred;f.put(f.setRef,f.set);const absent=native(f);assert.ok(codes(absent.report).includes('SCHEMA_INVALID'));assert.deepEqual(absent.report.coverage_deferred,[]);
  for(const file of ['docs/spec-baselines/spec-baseline.demo/v1/package/payload/files/source/tickets.yaml','docs/handoffs/demo/v1/package/handoff.yaml']){const p=native(f,{file});assert.equal(p.status,2);assert.ok(codes(p.report).includes('INPUT'));assert.ok(p.report.diagnostics.some(row=>row.message.includes('manifest.json')));}
  for(const file of ['docs/spec-baselines/spec-baseline.demo/v1/arbitrary/source/tickets.yaml','docs/handoffs/demo/latest/package/handoff.yaml']){const p=native(f,{file});assert.equal(p.status,2);assert.ok(codes(p.report).includes('BUSINESS_SOURCE_LAYOUT_UNSUPPORTED'));}
});

test('原生 checkpoint：进入设计缺集合拒绝、恢复集合接受',async t=>{
 const root=makeRoot('checkpoint-business-missing-'),seed=makeRoot('checkpoint-business-seed-');
 t.after(()=>{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(seed,{recursive:true,force:true});});
 const f=await approvedSpecFixture(root,{nativeSeed:seed});
 f.plan.write(path.dirname(f.checkpointRef)+'/map.md',`---\ncheckpoint_ref: ${f.checkpointRef}\n---\n# Synthetic feature\n`);
 f.state.artifacts['artifact.plan-record']=f.state.artifacts['artifact.plan'];delete f.state.artifacts['artifact.plan'];
 f.state.stage='stage.spec-architecture';f.state.next_work_unit='work-unit.prototype-design-v2';
 const verify=()=>{f.plan.write(f.checkpointRef,f.state);const p=run(['lifecycle','verify','--root',root,'--checkpoint',f.checkpointRef,'--json']);const check=p.envelope.result.checks.find(x=>x.id==='business-checkpoint');assert.ok(check,JSON.stringify({code:p.envelope.code,checks:p.envelope.result.checks,diagnostics:p.envelope.result.diagnostics}));return check;};
 assert.equal(verify()?.status,'passed');
 const binding=f.state.artifacts['artifact.business-ticket-set'];delete f.state.artifacts['artifact.business-ticket-set'];delete f.state.business_ticket_set_ref;
 assert.equal(verify()?.status,'failed');
 f.state.artifacts['artifact.business-ticket-set']=binding;
 assert.equal(verify()?.status,'passed');
});

test('原生 checkpoint：正式化入口允许草案、出口拒绝草案并观察变化',async t=>{
 const root=makeRoot('checkpoint-business-draft-'),seed=makeRoot('checkpoint-business-seed-');
 t.after(()=>{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(seed,{recursive:true,force:true});});
 const f=await approvedSpecFixture(root,{nativeSeed:seed});
 f.plan.write(path.dirname(f.checkpointRef)+'/map.md',`---\ncheckpoint_ref: ${f.checkpointRef}\n---\n# Synthetic feature\n`);
 f.state.artifacts['artifact.plan-record']=f.state.artifacts['artifact.plan'];delete f.state.artifacts['artifact.plan'];
 const binding=f.state.artifacts['artifact.business-ticket-set'],set=parseYaml(fs.readFileSync(path.join(root,binding.ref),'utf8'));
 for(const row of set.tickets){
  const text=fs.readFileSync(path.join(root,row.ref),'utf8'),ticket=ticketMetadata(text);ticket.status='draft';
  f.strategic.put(row.ref,'---\n'+JSON.stringify(ticket)+'\n---\n'+text.split(/\n---\n/)[1]);row.digest=sha(fs.readFileSync(path.join(root,row.ref)));
 }
 set.status='draft';f.strategic.put(binding.ref,set);binding.digest=sha(fs.readFileSync(path.join(root,binding.ref)));
 const review=parseYaml(fs.readFileSync(path.join(root,set.review_ref),'utf8'));review.subject_digest=binding.digest;f.strategic.put(set.review_ref,review);
 f.state.stage='stage.ticket-formalization';f.state.next_work_unit='work-unit.business-ticket-formalization';
 const verify=()=>{f.plan.write(f.checkpointRef,f.state);const p=run(['lifecycle','verify','--root',root,'--checkpoint',f.checkpointRef,'--json']);const check=p.envelope.result.checks.find(x=>x.id==='business-checkpoint');assert.ok(check,JSON.stringify({code:p.envelope.code,checks:p.envelope.result.checks,diagnostics:p.envelope.result.diagnostics}));return check;};
 assert.equal(verify()?.status,'passed');
 f.state.next_work_unit='work-unit.strategic-design-handoff';assert.equal(verify()?.status,'failed');
 f.state.next_work_unit='work-unit.business-ticket-formalization';assert.equal(verify()?.status,'passed');
 fs.appendFileSync(path.join(root,set.tickets[0].ref),'\nchanged after binding\n');assert.equal(verify()?.status,'failed');
});

test('严格消费者：Spec baseline、checkpoint 与 progression 继续拒绝业务草案错误',async t=>{
  const root=makeRoot('business-native-spec-'),seed=makeRoot('business-native-spec-seed-');t.after(()=>{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(seed,{recursive:true,force:true});});
  const f=await approvedSpecFixture(root,{nativeSeed:seed});f.state.artifacts['artifact.plan-record']=f.state.artifacts['artifact.plan'];delete f.state.artifacts['artifact.plan'];f.plan.write(f.checkpointRef,f.state);const directory=path.dirname(f.checkpointRef);
  f.plan.write(directory+'/map.md',`---\ncheckpoint_ref: ${f.checkpointRef}\n---\n# Synthetic feature\n`);
  f.plan.write(directory+'/progression-target.json',{schema_version:1,kind:'lifecycle-progression-target',feature_id:f.state.feature_id,checkpoint_ref:f.checkpointRef,target:'spec-approved',intent_source:'user-request',consumers:[]});
  const output=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'business-baseline-export-')));t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
  const baseline=suffix=>run(['handoff','export','--root',root,'--kind','spec-baseline','--checkpoint',f.checkpointRef,'--out',path.join(output,suffix),'--json']);
  const checkpoint=()=>run(['lifecycle','verify','--root',root,'--checkpoint',f.checkpointRef,'--json']);
  const progression=()=>run(['lifecycle','target','--root',root,'--checkpoint',f.checkpointRef,'--json']);
  const base=baseline('valid');assert.equal(base.status,0,JSON.stringify(base.envelope));
  const analysis=f.state.checks['check.artifact-consistency-analyzed'];delete f.state.checks['check.artifact-consistency-analyzed'];f.plan.write(f.checkpointRef,f.state);
  const missingAnalysis=baseline('missing-analysis');assert.notEqual(missingAnalysis.status,0);assert.equal(missingAnalysis.envelope.code,'EVIDENCE_REQUIRED',JSON.stringify(missingAnalysis.envelope));assert.equal(fs.existsSync(path.join(output,'missing-analysis')),false);
  f.state.checks['check.artifact-consistency-analyzed']=analysis;f.plan.write(f.checkpointRef,f.state);
  const analysisFile=path.join(root,analysis.basis[0].ref),analysisBytes=fs.readFileSync(analysisFile);fs.appendFileSync(analysisFile,'\n');
  const staleAnalysis=baseline('stale-analysis');assert.notEqual(staleAnalysis.status,0);assert.equal(staleAnalysis.envelope.code,'EVIDENCE_DRIFT',JSON.stringify(staleAnalysis.envelope));assert.equal(fs.existsSync(path.join(output,'stale-analysis')),false);fs.writeFileSync(analysisFile,analysisBytes);
  const cp=checkpoint();assert.equal(cp.status,0,JSON.stringify(cp.envelope));
  const progress=progression();assert.equal(progress.status,0,JSON.stringify(progress.envelope));assert.equal(progress.envelope.result.progression.status,'reached',JSON.stringify(progress.envelope));
  const setRef='source/tickets.yaml',set=parseYaml(fs.readFileSync(path.join(root,setRef),'utf8')),ref=set.tickets[0].ref,text=fs.readFileSync(path.join(root,ref),'utf8'),ticket=ticketMetadata(text);ticket.acceptance_refs=[];f.strategic.put(ref,'---\n'+JSON.stringify(ticket)+'\n---\n'+text.split(/\n---\n/)[1]);set.tickets[0].digest=sha(fs.readFileSync(path.join(root,ref)));f.strategic.put(setRef,set);
  const current=native({root,setRef},{mode:'draft'});assert.ok(codes(current.report).includes('COVERAGE_MISSING'));
  const deniedBaseline=baseline('invalid');assert.notEqual(deniedBaseline.status,0);assert.ok(['SCHEMA_INVALID','REQUIRED_FIELD','COVERAGE_REQUIRED'].includes(deniedBaseline.envelope.code),JSON.stringify(deniedBaseline.envelope));assert.equal(fs.existsSync(path.join(output,'invalid')),false);
  const deniedCheckpoint=checkpoint();assert.notEqual(deniedCheckpoint.status,0);assert.ok(deniedCheckpoint.envelope.result.checks.some(x=>x.id==='business-checkpoint'&&x.status==='failed'),JSON.stringify(deniedCheckpoint.envelope));
  const deniedProgression=progression();assert.equal(deniedProgression.status,0,JSON.stringify(deniedProgression.envelope));assert.equal(deniedProgression.envelope.result.progression.status,'blocked',JSON.stringify(deniedProgression.envelope));assert.match(deniedProgression.envelope.result.progression.reason,/业务|business|acceptance_refs|SCHEMA/);
});

test('严格消费者：Slice 不将 blocked 业务审查当作可执行来源',async t=>{
  const seed=makeRoot('business-native-slice-seed-','backend');t.after(()=>fs.rmSync(seed,{recursive:true,force:true}));
  const specText='---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-1 | 提交申请 |\n## 验收标准\n| ID | 需求引用 |\n|---|---|\n| AC-1 | FR-1 |\n';
  const load=ref=>import(pathToFileURL(path.join(seed,ref)));const nativeReaders={compiler:await load('scripts/lib/implementation-contract-compiler.mjs'),preparation:await load('scripts/lib/slice-contract-preparation.mjs'),slice:await load('scripts/lib/slice-contract.mjs')};
  const f=pilotFixture({nativeSeed:seed,nativeReaders,specText,apiRequired:false});f.root=fs.realpathSync(f.root);t.after(()=>f.cleanup());const approved=f.approve();
  const verify=()=>run(['contract','verify','--root',f.root,'--kind','slice','--file','slice-v3.yaml','--approval-ref',approved.binding.approval_ref,'--json']);
  const valid=verify();assert.equal(valid.status,0,JSON.stringify(valid.envelope));
  const setRef='.work/profile/business-ticket-set.yaml',reviewRef='.work/profile/business-review.json',review=parseYaml(fs.readFileSync(path.join(f.root,reviewRef),'utf8'));review.reviewer=review.drafter;f.write(reviewRef,review);
  assert.ok(codes(native({root:f.root,setRef}).report).includes('REVIEW_REQUIRED'));
  const denied=verify();assert.notEqual(denied.status,0);assert.equal(denied.envelope.code,'REVIEW_REQUIRED',JSON.stringify(denied.envelope));
});

test('native transport rejects a symlink ancestor before writing and preserves external input mode',t=>{
 const f=fixture(t),outside=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'native-transport-')));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
 const work=path.join(f.root,'.work');fs.mkdirSync(work,{recursive:true});fs.symlinkSync(outside,path.join(work,'native-candidates'));
 assert.throws(()=>nativeContractVerify({root:f.root,kind:'business-tickets',document:f.set,extra:['--mode','draft']}),/NATIVE_INPUT_INVALID:.*传输祖先/);
 assert.deepEqual(fs.readdirSync(outside),[]);fs.unlinkSync(path.join(work,'native-candidates'));
 const original=path.join(outside,'input.json');fs.writeFileSync(original,fs.readFileSync(path.join(f.root,'.template-spec/templates/approval-record-template.json')));fs.chmodSync(original,0o600);
 const verify=()=>nativeEvidenceVerify({root:f.root,kind:'approval',file:original,extra:['--history']});
 const result=verify();assert.equal(result.exitCode,0,result.message);
 const staged=result.envelope.result.inputs.find(row=>row.ref.endsWith('/input.json'));assert.ok(staged);assert.equal(staged.descriptor.mode,0o600);
 assert.throws(()=>withValidationPhase({root:f.root,purpose:'external-mode'},()=>{assert.equal(verify().exitCode,0);fs.chmodSync(original,0o644);}),/VALIDATION_INPUT_CHANGED/);
});
