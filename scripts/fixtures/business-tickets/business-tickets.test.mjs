import {readSliceContract,sliceAcceptanceText,readSliceSources} from '../../lib/slice-contract.mjs';
import {prepareSliceImplementationContract} from '../../lib/slice-contract-preparation.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {stringify} from '../../vendor/yaml.mjs';
import {checkBusinessTickets,assertImplementationTicket,assertBusinessTicketTransition,assertSliceBusinessSources,assertBusinessCheckpoint,summarizeBusinessImplementation,businessSyncDiagnostics} from '../../lib/business-tickets.mjs';
const sha=x=>`sha256:${createHash('sha256').update(x).digest('hex')}`;
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'business-ticket-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:stringify(value));};
 const bind=ref=>({ref,version:'v1',digest:sha(fs.readFileSync(path.join(root,ref)))});
 put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  business_ticket_version: 1\n---\n');
 const dir='docs/.scratch/demo',setRef=`${dir}/business-ticket-set.yaml`,ref=`${dir}/business-tickets/BT-001.md`;
 put(`${dir}/spec.md`,'---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-001 | 管理员登记数据源 |\n## 验收标准\n| ID | 需求引用 |\n|---|---|\n| AC-001 | FR-001 |\n');
 const ticket={schema_version:1,kind:'business-ticket',id:'BT-001',version:'v1',status:'ready-for-human',spec:bind(`${dir}/spec.md`),requirement_refs:['FR-001'],acceptance_refs:['AC-001'],dependencies:[],source_refs:[],open_questions:[]};
 const set={schema_version:1,kind:'business-ticket-set',id:'business-ticket-set.demo',version:'v1',status:'ready-for-human',spec:ticket.spec,tickets:[],coverage_deferred:[],review_ref:`${dir}/review.yaml`};
 const save=()=>{put(ref,`---\n${stringify(ticket)}---\n# 数据源登记\n## 业务结果\n保存后可选择\n## 范围\n登记和连通性校验\n## 非目标\n无调度\n## 验收\n引用 AC-001\n## 风险\n校验失败保留输入\n`);set.tickets=[{id:ticket.id,...bind(ref)}];put(setRef,set);put(`${dir}/review.md`,'独立审查：范围、粒度、成功和失败条件与 Spec 一致。');put(set.review_ref,{schema_version:1,kind:'business-ticket-review',result:'passed',subject_ref:setRef,subject_digest:bind(setRef).digest,reviewer:'reviewer.fixture',drafter:'drafter.fixture',evidence:[bind(`${dir}/review.md`)]});};
 save();return {root,put,bind,setRef,ref,ticket,set,save,check:(mode='formal')=>checkBusinessTickets({root,setRef,mode})};
}
test('业务正式化不依赖工程、OpenAPI；批准仍未评估',t=>{const f=fixture(t),r=f.check();assert.equal(r.status,'passed',JSON.stringify(r));assert.deepEqual(r.unassessed,['approval-validity','semantic-review-truth']);assert.equal(fs.existsSync(path.join(f.root,'apps')),false);});
test('草案允许登记阻断未决项，正式化拒绝',t=>{const f=fixture(t);f.ticket.open_questions=[{id:'Q-001',question:'失败如何恢复',owner:'product',resolve_by:'Design',blocking:true}];f.save();assert.equal(f.check('draft').status,'passed');assert.ok(f.check().diagnostics.some(x=>x.code==='OPEN_BLOCKER'));});
test('需求与验收覆盖遗漏可定位',t=>{const f=fixture(t);f.ticket.acceptance_refs=[];f.save();assert.ok(f.check().diagnostics.some(x=>x.code==='COVERAGE_MISSING'&&x.locator==='AC-001'));});
test('依赖环与未知依赖阻断',t=>{const f=fixture(t);f.ticket.dependencies=['BT-001','BT-999'];f.save();assert.ok(f.check().diagnostics.some(x=>x.code==='DEPENDENCY_CYCLE'));assert.ok(f.check().diagnostics.some(x=>x.code==='DANGLING_DEPENDENCY'));});
test('摘要变化拒绝旧结果',t=>{const f=fixture(t);fs.appendFileSync(path.join(f.root,f.ref),'change');assert.ok(f.check().diagnostics.some(x=>x.code==='SOURCE_STALE'));});
test('禁止来源越界与符号链接',t=>{const f=fixture(t);f.set.spec={...f.set.spec,ref:'../external.md'};f.put(f.setRef,f.set);assert.ok(f.check().diagnostics.some(x=>x.code==='BUSINESS_PATH_INVALID'));f.set.spec=f.ticket.spec;f.put(f.setRef,f.set);fs.unlinkSync(path.join(f.root,f.ref));fs.symlinkSync('/etc/hosts',path.join(f.root,f.ref));assert.ok(f.check().diagnostics.some(x=>x.code==='BUSINESS_SYMLINK_FORBIDDEN'));});
test('内容类型隔离，不以目录判断实现资格',()=>{for(const kind of ['business-ticket','business-ticket-set','stage-work-item'])assert.throws(()=>assertImplementationTicket(`---\nkind: ${kind}\n---\n`,'docs/.scratch/demo/issues/a.md'));});
test('Spec 不可越过业务正式化；缺少集合不能完成',t=>{const f=fixture(t),state={business_ticket_set_ref:f.setRef};assert.throws(()=>assertBusinessTicketTransition(f.root,'work-unit.spec-synthesis','work-unit.technical-analysis',state),/BUSINESS_FORMALIZATION/);assert.doesNotThrow(()=>assertBusinessTicketTransition(f.root,'work-unit.spec-synthesis','work-unit.business-ticket-formalization',state));assert.throws(()=>assertBusinessTicketTransition(f.root,'work-unit.spec-synthesis','work-unit.prototype-design-v2',{}));});
test('旧实例可读，不自动启用；未知版本不能绕过',t=>{const f=fixture(t);f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n---\n');assert.doesNotThrow(()=>assertBusinessTicketTransition(f.root,'work-unit.spec-synthesis','work-unit.technical-analysis',{}));f.put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  business_ticket_version: 2\n---\n');assert.throws(()=>assertBusinessTicketTransition(f.root,'work-unit.spec-synthesis','work-unit.technical-analysis',{}),/VERSION_UNSUPPORTED/);});
test('独立审查不可自审或复用旧摘要',t=>{const f=fixture(t);const review={schema_version:1,kind:'business-ticket-review',result:'passed',subject_ref:f.setRef,subject_digest:f.bind(f.setRef).digest,reviewer:'same',drafter:'same',evidence:[f.bind(f.ref)]};f.put(f.set.review_ref,review);assert.ok(f.check().diagnostics.some(x=>x.code==='REVIEW_REQUIRED'));});
test('实现消费有界来源，一个业务票可供多个切片引用',t=>{const f=fixture(t),ticketText='---\nkind: vertical-slice-ticket\nbusiness_ticket_refs: [BT-001]\nacceptance_refs: [AC-001]\n---\n';for(let i=0;i<2;i++)assert.doesNotThrow(()=>assertSliceBusinessSources({root:f.root,ticketText,setBinding:f.bind(f.setRef)}));assert.throws(()=>assertSliceBusinessSources({root:f.root,ticketText:ticketText.replace('BT-001','BT-999'),setBinding:f.bind(f.setRef)}),/REFERENCE_REQUIRED/);});

test('业务 YAML 集合改扩展名也不能伪装为实现票',()=>{assert.throws(()=>assertImplementationTicket('kind: business-ticket-set\n','docs/.scratch/demo/issues/a.md'),/不能作为实现/);});
test('原始 AC 与 FR 对应关系不能交叉挪用',t=>{const f=fixture(t);f.ticket.requirement_refs=['FR-other'];f.save();assert.ok(f.check().diagnostics.some(x=>x.code==='AC_REQUIREMENT_MISMATCH'));});
test('规则定位不能匹配正文中偶然出现的相同字符串',t=>{const f=fixture(t);f.put('rules.md','# 规则\n只是提到 rule.001，不是稳定 ID。\n');f.ticket.source_refs=[{...f.bind('rules.md'),locator:'rule.001',locator_kind:'id'}];f.save();assert.ok(f.check().diagnostics.some(x=>x.code==='DANGLING_REFERENCE'));});
test('不能通过把 ready-for-agent 写入业务票获取资格',t=>{const f=fixture(t);f.ticket.status='ready-for-agent';f.save();assert.ok(f.check().diagnostics.some(x=>x.code==='BUSINESS_READINESS_FORBIDDEN'));});
test('实现验收必须属于选中业务票并指向原始 Spec',t=>{const f=fixture(t),ticketText='---\nkind: vertical-slice-ticket\nbusiness_ticket_refs: [BT-001]\nacceptance_refs: [AC-001]\n---\n';assert.throws(()=>assertSliceBusinessSources({root:f.root,ticketText,setBinding:f.bind(f.setRef),specBinding:f.ticket.spec,acceptance:{a:{source:'ticket',locator:'AC-001'}}}),/SOURCE_MISMATCH/);assert.doesNotThrow(()=>assertSliceBusinessSources({root:f.root,ticketText,setBinding:f.bind(f.setRef),specBinding:f.ticket.spec,acceptance:{a:{source:'spec',locator:'AC-001'}}}));});

test('业务票到多个 Slice 的 AC 覆盖可汇总且不宣布完成',t=>{const f=fixture(t);fs.appendFileSync(path.join(f.root,f.ticket.spec.ref),'| AC-002 | FR-001 |\n');f.ticket.spec=f.bind(f.ticket.spec.ref);f.set.spec=f.ticket.spec;f.ticket.acceptance_refs.push('AC-002');f.save();const slice=(n,ac)=>{const ref=`docs/.scratch/demo/issues/${n}.md`;f.put(ref,`---\nkind: vertical-slice-ticket\nbusiness_ticket_set_ref: ${f.setRef}\nbusiness_ticket_refs: [BT-001]\nacceptance_refs: [${ac}]\n---\n`);return ref;};const one=slice('one','AC-001'),two=slice('two','AC-002');assert.equal(summarizeBusinessImplementation({root:f.root,setRef:f.setRef,sliceRefs:[one]}).status,'partial');const r=summarizeBusinessImplementation({root:f.root,setRef:f.setRef,sliceRefs:[one,two]});assert.equal(r.status,'covered');assert.equal(r.implementation_completion,'not-evaluated');});
test('父 Ticket 声明已同步但业务摘要过期会被指出',t=>{const f=fixture(t);f.put('docs/.scratch/demo/parent-ticket.md',`---\nbusiness_ticket_set_ref: ${f.setRef}\nbusiness_ticket_set_digest: sha256:${'0'.repeat(64)}\n---\n`);assert.equal(businessSyncDiagnostics(f.root,f.setRef,f.check())[0].code,'BUSINESS_SYNC_STALE');});

test('正式编译入口拒绝移动到 issues 的业务票',t=>{const f=fixture(t),ref='docs/.scratch/demo/issues/spoof.md';f.put(ref,fs.readFileSync(path.join(f.root,f.ref),'utf8'));const result=prepareSliceImplementationContract({root:f.root,ticket_ref:ref});assert.equal(result.slice_contract.status,'blocked');assert.ok(result.report.blockers.some(x=>x.code==='TICKET_NOT_IMPLEMENTABLE'));});
test('启用新规则后 v2 仍可只读显示，但不能进入当前执行',t=>{const f=fixture(t);f.put('old.yaml',{schema_version:2,status:'approved',contract_id:'old',contract_version:'v1'});assert.doesNotThrow(()=>readSliceContract('old.yaml',{root:f.root,diagnostic:true}));assert.throws(()=>readSliceContract('old.yaml',{root:f.root}),/BUSINESS_SLICE_V3_REQUIRED/);});

test('手改 checkpoint 进入 Design 不能跳过 Spec 业务草案',t=>{const f=fixture(t),state={stage:'stage.spec-architecture',status:'running',next_work_unit:'work-unit.prototype-design-v2'};assert.throws(()=>assertBusinessCheckpoint(f.root,state),/BUSINESS_CHECKPOINT_BLOCKED/);state.artifacts={'artifact.business-ticket-set':{ref:f.setRef}};assert.doesNotThrow(()=>assertBusinessCheckpoint(f.root,state));});
test('Design 可携带草案进入业务正式化，离开前必须正式化',t=>{
  const f=fixture(t);f.ticket.status='draft';f.set.status='draft';f.save();
  const state={stage:'stage.ticket-formalization',status:'running',next_work_unit:'work-unit.business-ticket-formalization',artifacts:{'artifact.business-ticket-set':{ref:f.setRef}}};
  assert.doesNotThrow(()=>assertBusinessCheckpoint(f.root,state));
  state.next_work_unit='work-unit.strategic-design-handoff';
  assert.throws(()=>assertBusinessCheckpoint(f.root,state),/BUSINESS_CHECKPOINT_BLOCKED/);
});
test('真实编译从业务票自动绑定原始 Spec AC，FR 中的交叉引用不造成重复定位',t=>{
  const f=fixture(t),ref='docs/.scratch/demo/issues/one.md';
  fs.appendFileSync(path.join(f.root,f.ticket.spec.ref),'\n在其他叙述中引用 AC-001，不是另一条验收。\n');
  f.ticket.spec=f.bind(f.ticket.spec.ref);f.set.spec=f.ticket.spec;f.save();
  f.put(ref,`---\n${stringify({kind:'vertical-slice-ticket',status:'ready-for-human',requirement_version:'v1',business_ticket_set_ref:f.setRef,business_ticket_refs:['BT-001'],acceptance_refs:['AC-001']})}---\n## 验收标准\n- AC-001 登记数据源\n`);
  const sources={spec:{ref:f.ticket.spec.ref},ticket:{ref,version:'v1'}};
  for(const name of ['engineering_baseline','implementation_repository','architecture_review','build_architecture_checklist','no_api_impact_record']){f.put(`${name}.md`,String(name));sources[name]={ref:`${name}.md`};}
  const refinements={contract_id:'contract.business',contract_version:'v1',slice_id:'slice.business',scope:{impacted_areas:[],implementation_path_policy:'external-repository-native',project_roots:[f.root],allowed_write_paths:['src']},applicability:Object.fromEntries(['frontend','backend','api','cross_repo'].map(key=>[key,{status:'not-applicable',reason:'合成无该技术影响的机制测试'}])),required_capabilities:['quality.java-code-style'],verification:{test:{command:'pnpm test',cwd:f.root,expected_evidence:['test.log'],test_seams:['input'],acceptance_refs:['AC-001']}},work_units:[{id:'validate',behavior:'验证输入',role_id:'role.backend-engineer',primary_skill:'alibaba-java-code-style',tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-001']}]};
  for(const input of [refinements,{...refinements,acceptance:{'AC-001':{source:'spec',locator:'AC-001'}}}]) {
    const result=prepareSliceImplementationContract({root:f.root,ticket_ref:ref,sources,refinements:input});
    assert.equal(result.slice_contract.status,'ready-for-lifecycle-review',JSON.stringify(result.report.blockers));
    assert.deepEqual(result.slice_contract.acceptance,{'AC-001':{source:'spec',locator:'AC-001'}});
    assert.equal(result.slice_contract.basis.business_ticket_set.ref,f.setRef);
    const text=sliceAcceptanceText(result.slice_contract,readSliceSources(result.slice_contract,{root:f.root}))['AC-001'];
    assert.match(text,/FR-001/);assert.doesNotMatch(text,/其他叙述/);
  }
});
