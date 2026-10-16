// 原生领域协议与 Node 调用适配回放：固定预期决定通过或拒绝，另检查适配与原生输出一致。
// 夹具在测试里现场构建，改动夹具里的判定输入，回放就应当失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {nativeEvidenceVerify, nativeContractVerify, nativeLifecycleVerify, assertNativeCapabilities, NEEDS, missingCapabilities} from '../scripts/lib/native-evidence.mjs';
import {generateTaskPackageDefaults, validateTaskPackage} from '../scripts/lib/task-package.mjs';
import {parse as parseYamlText} from '../scripts/vendor/yaml.mjs';
import {fixture as handoffFixture, context as handoffContext} from '../scripts/fixtures/strategic-handoff/fixture.mjs';
import {exportBundle, openBundle, importBundle} from '../scripts/lib/strategic-handoff.mjs';
import {verifyConsumption} from '../scripts/lib/strategic-handoff-consumption.mjs';
import {verifyContextReconciliation} from '../scripts/lib/context-reconciliation.mjs';
import {readWorkLayout} from '../scripts/lib/work-layout.mjs';
import {attachScaffoldDecisionFixture} from '../scripts/fixtures/user-decision/build-fixture.mjs';
import {read as readHandoff, json as handoffJson} from '../scripts/lib/strategic-handoff-io.mjs';
import {makeRoot} from './helpers/yss-instance.mjs';
import {readdirSync, cpSync, unlinkSync, appendFileSync} from 'node:fs';
import {buildDecisionFixture} from '../scripts/lib/testing/user-decision-fixture.mjs';
import {validateUserDecision, assertUserDecisionRequirement} from '../scripts/lib/native-user-decision.mjs';
import {validateApprovalRecord, approvalExpectationFromSubject} from '../scripts/lib/native-approval.mjs';
import {approvalExpectationForBoundAsset} from '../scripts/lib/native-approval.mjs';
import {approvalExpectationFromState} from '../scripts/lib/native-approval.mjs';
import {decisionDigest} from '../scripts/lib/user-decision-core.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareReviewPackage} from '../scripts/lib/review-package.mjs';
import {approvalExpectedFromTask} from '../scripts/lib/review-capabilities.mjs';
import {loadRegistry} from '../scripts/lib/lifecycle-registry.mjs';
import {loadDigitalHumanRoles} from '../scripts/lib/digital-human-roles.mjs';
import {parseDocument} from '../scripts/vendor/yaml.mjs';
import {validateApprovalRecordFile, assertApprovedGateHasValidApproval} from '../scripts/lib/native-approval.mjs';

let binary;
try { binary = contextBinary().binary; } catch { binary = null; }
const skip = binary ? false : '需要固定版本的 yss（YSS_NATIVE_BINARY）';

// 两个运行位置：现场初始化的 spec 实例，以及模板源仓根本身（scripts/verify-* 在模板源里直接在仓根运行）。
const REPO = path.resolve(import.meta.dirname, '..');
let site = 'instance';
let instance;
function setup() {
  if (site === 'template-source') {
    const dir = path.join(REPO, '.work', `replay-${process.pid}`);
    mkdirSync(dir, {recursive: true});
    process.on('exit', () => rmSync(dir, {recursive: true, force: true}));
    return REPO;
  }
  if (instance) return instance;
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-replay-')));
  process.on('exit', () => rmSync(base, {recursive: true, force: true}));
  const init = spawnSync(binary, ['init', '--profile', 'spec', '--root', path.join(base, 'inst'), '--project-name', 'replay'], {encoding: 'utf8'});
  assert.equal(init.status, 0, init.stderr || init.stdout);
  return (instance = path.join(base, 'inst'));
}

const cleanupDirs = new Set(); // 退出时统一清理，避免给 process 加过多监听器
process.on('exit', () => { for (const dir of cleanupDirs) rmSync(dir, {recursive: true, force: true}); });
let seq = 0;
const fixture = (opts) => buildDecisionFixture(path.join(setup(), '.work', ...(site === 'template-source' ? [`replay-${process.pid}`] : ['replay']), `case-${++seq}`), opts);

const cases = {
  '真实单项回复通过': () => {},
  '无回复保持等待': (f) => { f.record.responses = []; },
  '被拒绝': (f) => { f.record.responses = []; f.respond({decision: 'rejected', text: 'rejected', approvedScope: []}); },
  '要求修改': (f) => { f.record.responses = []; f.respond({decision: 'changes-requested', text: 'changes-requested', approvedScope: []}); },
  '意思不明': (f) => { f.record.responses = []; f.respond({decision: 'unclear', text: 'unclear', approvedScope: []}); },
  '撤回': (f) => { f.respond({decision: 'revoked', text: '撤回同意', time: '2026-09-05T01:04:00Z'}); },
  '数字人代答': (f) => { f.record.responses = []; f.respond({actor: 'digital-human'}); },
  '默认选项冒充原始消息': (f) => { f.record.responses[0].source.kind = 'default-option'; },
  '记录原文与来源不一致': (f) => { f.record.responses[0].text = '我批准全部'; },
  '来源文件缺失': (f) => { f.record.responses[0].source.ref += '.missing'; },
  '只有 Agent 摘要': (f) => { f.record.responses[0].source.kind = 'agent-summary'; },
  '来源被篡改': (f) => { writeFileSync(f.record.responses[0].source.ref, '变更'); },
  '展示内容与当前请求不一致': (f) => { f.record.request.items[0].recommendation = '不同方案'; },
  '展示前回复': (f) => { f.record.responses = []; f.respond({time: '2026-09-05T01:01:00Z'}); },
  '批准依据被改动': (f) => { writeFileSync(f.requirement.subject_ref, '另一份内容'); },
  '批准范围扩大': (f) => { f.requirement.scope.push('new-feature'); },
  '相反原文被归一化成批准': (f) => { f.record.responses = []; f.respond({text: '不同意，需要修改', decision: 'approved'}); },
};

const decisionCaseCodes={
 '无回复保持等待':'user-decision-response-required','被拒绝':'user-decision-not-approved','要求修改':'user-decision-not-approved','意思不明':'user-decision-not-approved','撤回':'user-decision-not-approved',
 '数字人代答':'user-decision-responder-mismatch','默认选项冒充原始消息':'SCHEMA','记录原文与来源不一致':'user-decision-responder-mismatch','来源文件缺失':'INPUT','只有 Agent 摘要':'SCHEMA',
 '来源被篡改':'user-decision-source-changed','展示内容与当前请求不一致':'user-decision-presentation-mismatch','展示前回复':'user-decision-source-invalid','批准依据被改动':'user-decision-stale','批准范围扩大':'user-decision-subject-mismatch','相反原文被归一化成批准':'user-decision-ambiguous'
};

// 两边都拒绝，但拒绝码粒度不同：Node 对 schema 违规不带码，Go 统一报 SCHEMA；来源不可读时 Go 报 INPUT。结论一致即可。

const approvalRecord = {schema_version: 1, gate_id: 'gate.spec-baseline-approved', decision: 'approved', actor_kind: 'digital-human', role_id: 'role.product-manager', runtime_id: 'runtime.generic', principal_ref: 'instance:product'};
const goApproval = (extra) => {
  const file = path.join(setup(), '.work', ...(site === 'template-source' ? [`replay-${process.pid}`] : ['replay']), `approval-${++seq}.json`);
  mkdirSync(path.dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(approvalRecord));
  const r = nativeEvidenceVerify({root: setup(), kind: 'approval', file, extra});
  return {ok: r.exitCode === 0, code: r.diagnostics[0]?.code, message: r.message};
};

for (const where of ['instance', 'template-source']) test(`批准记录回放（${where}）：历史数字人记录可读，但没有当前上下文不能关闭关键门禁`, {skip}, () => {
  site = where;
  assert.doesNotThrow(() => validateApprovalRecord(approvalRecord, {history: true}));
  assert.equal(goApproval(['--history']).ok, true);
  assert.throws(() => validateApprovalRecord(approvalRecord, {requireApproved: true}), (error) => error.code === 'APPROVAL_CONTEXT_REQUIRED');
  const go = goApproval(['--require-approved']);
  assert.equal(go.ok, false, go.message);
});

// 薄壳冒烟：scripts/verify-user-decision 调用的子命令存在，退出码与信息透传；省略 --requirements 时由 yss 的 --from-record 反推。
const shell = (args) => spawnSync(path.join(REPO, 'scripts', 'verify-user-decision'), args, {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
test('verify-user-decision 薄壳：通过、拒绝、显式 requirements', {skip}, () => {
  site = 'template-source';
  const ok = fixture();
  ok.save();
  const pass = shell([ok.ref]);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /用户决定及当前批准范围校验通过/);
  const req = path.join(path.dirname(ok.ref), 'requirements.json');
  writeFileSync(req, JSON.stringify([ok.requirement]));
  assert.equal(shell(['--requirements', req, ok.ref]).status, 0);
  const bad = fixture();
  bad.record.responses = [];
  bad.save();
  const denied = shell([bad.ref]);
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /用户决定校验失败: .*user-decision/);
});

test('verify-approval-record 薄壳：历史结构可读，没有当前上下文不放行', {skip}, () => {
  site = 'template-source';
  const file = path.join(setup(), '.work', `replay-${process.pid}`, 'approval-shell.json');
  mkdirSync(path.dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(approvalRecord));
  const run = (args) => spawnSync(path.join(REPO, 'scripts', 'verify-approval-record'), args, {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
  const history = run(['--history', file]);
  assert.equal(history.status, 0, history.stderr);
  assert.match(history.stdout, /历史兼容结构检查完成/);
  const current = run([file]);
  assert.notEqual(current.status, 0);
  assert.match(current.stderr, /会签记录校验失败/);
});

// 决定适配的预期取自夹具定义，不能把同一原生核心调用两次作为独立等价证据。
for (const [name, mutate] of Object.entries(cases)) {
  test(`决定适配固定预期：${name}`, {skip}, () => {
    site = 'template-source';const f = fixture();mutate(f);f.save();
    if(name==='真实单项回复通过'){
      const result=assertUserDecisionRequirement(f.requirement,{root:REPO});
      assert.deepEqual(result.validated.map(row=>row.item_id),[f.record.request.items[0].id]);
    }else assert.throws(()=>assertUserDecisionRequirement(f.requirement,{root:REPO}),error=>error.native===true&&error.code===decisionCaseCodes[name]);
  });
}

test('verify-user-decision 薄壳：延续模式缺 continuation_ref 时拒绝，不静默通过', {skip}, () => {
  site = 'template-source';
  const f = fixture();
  const input = path.join(path.dirname(f.ref), 'requirement.json');
  writeFileSync(input, JSON.stringify(f.requirement));
  const run = spawnSync(path.join(REPO, 'scripts', 'verify-user-decision'), ['--continuation', input], {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /continuation_ref/);
});

// 当前批准（v1）使用独立期望来源，固定正反例必须保持。
function currentApprovalCase() {
  site = 'template-source';
  const boundary = 'gate.product-design-approved';
  const f = fixture({boundary});
  const evidence = f.write('review-evidence.log', 'synthetic independent comparison');
  const basis = [{ref: evidence, digest: decisionDigest(readFileSync(evidence)).slice(7)}];
  const subjectRef = f.write('subject.json', JSON.stringify({gate_id: boundary, approval_scope: f.requirement.scope, basis, drafter_principal_ref: 'synthetic.drafter'}));
  f.requirement.subject_ref = subjectRef;
  f.record.request.items[0].subject.ref = subjectRef;
  f.record.request.items[0].subject.digest = decisionDigest(readFileSync(subjectRef));
  f.present(); f.record.responses = []; f.respond(); f.save();
  const expected = approvalExpectationFromSubject(boundary, subjectRef, {root: REPO});
  const record = {schema_version: 1, gate_id: boundary, decision: 'approved', actor_kind: 'biological-human', role_id: 'role.biological-human', runtime_id: 'runtime.generic', principal_ref: 'person.requester', subject_ref: subjectRef, approval_scope: f.requirement.scope, user_decision_ref: f.ref, subject_digest: decisionDigest(readFileSync(subjectRef)).slice(7), drafter_principal_ref: 'synthetic.drafter', basis};
  return {f, record, expected, evidence, subjectRef};
}
const approvalCases = {
  '通过': () => {},
  '审查人不是原回复者': (c) => { c.record.principal_ref = 'person.someone-else'; },
  '起草者自签': (c) => { c.record.principal_ref = 'synthetic.drafter'; },
  '期望范围不同': (c) => { c.expected.approval_scope = ['other.scope']; },
  '主体被改动': (c) => { writeFileSync(c.subjectRef, JSON.stringify({changed: true})); },
  '依据过期': (c) => { writeFileSync(c.evidence, 'tampered'); },
  '缺少起草者来源': (c) => { delete c.expected.drafter_principal_ref; },
  '生物人门禁由数字人签': (c) => { c.record.actor_kind = 'digital-human'; c.record.role_id = 'role.product-manager'; },
};
for (const [name, mutate] of Object.entries(approvalCases)) {
  test(`适配层等价（validateApprovalRecord 当前批准）：${name}`, {skip}, () => {
    const c = currentApprovalCase();
    mutate(c);
    const run=()=>validateApprovalRecord(c.record,{requireApproved:true,root:REPO,expected:c.expected});
    if(name==='通过')assert.equal(run().execution_authorization,'not-evaluated');
    else assert.throws(run,error=>error.native===true&&error.code===(name==='缺少起草者来源'?'APPROVAL_CONTEXT_REQUIRED':'APPROVAL_CURRENT_INVALID'),name);

  });
}

// v2 记录与组合包：用真实注册表和角色政策生成待审包；受改动的行拒绝，未改动的另一行仍通过。
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function v2Case() {
  site = 'template-source';
  setup();
  const rel = path.join('.work', `replay-${process.pid}`, `v2-${++seq}`);
  const abs = path.join(REPO, rel);
  mkdirSync(abs, {recursive: true});
  const checkIds = ['check.openapi-draft-reviewed', 'check.engineering-baseline-accepted'];
  const checks = {};
  checkIds.forEach((id, i) => {
    const subject = path.join(rel, `subject-${i}.yaml`), evidence = path.join(rel, `evidence-${i}.txt`);
    writeFileSync(path.join(REPO, subject), `schema_version: 1\nsubject: ${i}\n`);
    writeFileSync(path.join(REPO, evidence), `actual evidence ${i}\n`);
    checks[id] = {applicable: true, status: 'pending', subject_ref: subject, subject_digest: sha(readFileSync(path.join(REPO, subject))), approval_scope: [`scope-${i}`], drafter_principal_ref: `instance:author-${i}`, basis: [{ref: evidence, digest: sha(readFileSync(path.join(REPO, evidence)))}], evidence_refs: [evidence]};
  });
  const checkpointRef = path.join(rel, 'checkpoint.json');
  writeFileSync(path.join(REPO, checkpointRef), JSON.stringify({checks, gates: {}}));
  const registry = loadRegistry(), rolesDoc = loadDigitalHumanRoles();
  const result = prepareReviewPackage({root: REPO, registry, checkpointRef, checkIds, roleId: 'role.test-engineer', runtimeId: 'runtime.generic', actorId: 'agent.reviewer', reviewerPrincipalRef: 'instance:qa', drafterPrincipalRef: 'instance:packet-owner', implementationActorId: 'agent.worker', taskId: 'review.api-baseline', reviewSessionId: 'session:one', workUnitId: 'work-unit.technical-analysis', outputDir: path.join(rel, 'reviews')});
  const task = JSON.parse(readFileSync(path.join(REPO, result.task_ref)));
  const bundle = parseDocument(readFileSync(path.join(REPO, result.bundle_ref), 'utf8')).toJS();
  for (const row of bundle.reviews) row.decision = 'approved';
  const expectedFor = (row) => approvalExpectedFromTask(task, {root: REPO, rolesDoc, registry, boundary: row.gate_id, reviewTaskRef: result.task_ref, reviewTaskDigest: result.task_digest});
  const expected = bundle.reviews.map(expectedFor);
  const bundleFile = path.join(rel, 'reviews', 'approved-bundle.json');
  const write = () => writeFileSync(path.join(REPO, bundleFile), JSON.stringify(bundle));
  write();
  return {bundle, expected, bundleFile, write, result, task, rel};
}
const outcome = (run) => { try { run(); return {ok: true}; } catch (error) { return {ok: false, code: error.code, message: error.message, native: error.native}; } };
const v2Cases = {
  '通过': () => {},
  '仍是 pending': (c) => { c.bundle.reviews[0].decision = 'pending'; c.write(); },
  '审查人自签': (c) => { c.bundle.reviews[0].principal_ref = c.bundle.reviews[0].drafter_principal_ref; c.write(); },
  '期望范围与任务不符': (c) => { c.expected[0].approval_scope = ['other']; },
  '任务摘要过期': (c) => { c.expected[0].review_context = {...c.expected[0].review_context, review_task_digest: '0'.repeat(64)}; },
  '主体被改动': (c) => { writeFileSync(path.join(REPO, c.bundle.reviews[0].subject_ref), 'schema_version: 1\nsubject: changed\n'); },
};
for (const [name, mutate] of Object.entries(v2Cases)) {
  test(`适配层等价（v2 组合包与单行）：${name}`, {skip}, () => {
    const c = v2Case();
    mutate(c);
    const bundle=()=>validateApprovalRecordFile(path.join(REPO,c.bundleFile),{requireApproved:true,root:REPO,expected:c.expected});
    if(name==='通过')assert.doesNotThrow(bundle);else assert.throws(bundle,error=>error.native===true&&error.code===(name==='审查人自签'?'APPROVAL_BUNDLE_INVALID':['任务摘要过期','主体被改动'].includes(name)?'REVIEW_BINDING_STALE':'APPROVAL_CURRENT_INVALID'));
    const single=()=>validateApprovalRecord(c.bundle.reviews[1],{requireApproved:true,root:REPO,expected:c.expected[1]});
    if(name==='主体被改动')assert.throws(single,error=>error.code==='REVIEW_BINDING_STALE');else assert.doesNotThrow(single);

  });
}

// 门禁状态：checkpoint 里 approved 的门禁由状态算出期望，再判定其批准记录（assertApprovedGateHasValidApproval 的委托）。
function gateStateCase() {
  const c = currentApprovalCase();
  const rel = (file) => path.relative(REPO, file);
  const approvalRef = path.join(path.dirname(rel(c.f.ref)), 'approval.json');
  const state = {status: 'approved', approval_ref: approvalRef, subject_ref: rel(c.subjectRef), approval_scope: [...c.record.approval_scope], basis: c.record.basis.map((asset) => ({ref: rel(asset.ref), digest: asset.digest})), drafter_principal_ref: 'synthetic.drafter'};
  c.record.subject_ref = rel(c.subjectRef);
  c.record.basis = state.basis;
  c.record.user_decision_ref = rel(c.f.ref);
  const writeRecord = () => writeFileSync(path.join(REPO, approvalRef), JSON.stringify(c.record));
  writeRecord();
  return {...c, state, writeRecord};
}
const gateCases = {
  '通过': () => {},
  '审查人不是原回复者': (c) => { c.record.principal_ref = 'person.someone-else'; c.writeRecord(); },
  '起草者自签': (c) => { c.record.principal_ref = 'synthetic.drafter'; c.writeRecord(); },
  '状态范围与记录不同': (c) => { c.state.approval_scope = ['other.scope']; },
  '主体被改动': (c) => { writeFileSync(c.subjectRef, JSON.stringify({changed: true})); },
  '依据过期': (c) => { writeFileSync(c.evidence, 'tampered'); },
};
for (const [name, mutate] of Object.entries(gateCases)) {
  test(`适配层等价（assertApprovedGateHasValidApproval 门禁状态）：${name}`, {skip}, () => {
    const c = gateStateCase();
    mutate(c);
    const gate = 'gate.product-design-approved';
    const run=()=>assertApprovedGateHasValidApproval(gate,c.state,{root:REPO,checkpointPath:REPO});
    if(name==='通过')assert.doesNotThrow(run);else assert.throws(run,error=>error.native===true&&error.code==='APPROVAL_CURRENT_INVALID');

  });
}

// 期望由 yss 计算：Node 三种期望来源（状态、主体、绑定资产）算出的期望，与 yss 按同一绑定算出的期望逐字段一致，且判定一致。
const strip = (digest) => String(digest).replace(/^sha256:/, '');
const keyFields = (expected) => ({boundary: expected.boundary, subject_ref: expected.subject_ref, subject_digest: strip(expected.subject_digest), approval_scope: [...expected.approval_scope].sort(), basis: expected.basis.map((asset) => ({ref: asset.ref, digest: strip(asset.digest)})), drafter_principal_ref: expected.drafter_principal_ref, review_package: expected.review_package});
function bindingCase() {
  const c = gateStateCase();
  const gate = 'gate.product-design-approved';
  const rel = (file) => path.relative(REPO, file);
  const sources = {
    '状态': () => approvalExpectationFromState(gate, c.state, {root: REPO}),
    '主体': () => approvalExpectationFromSubject(gate, rel(c.subjectRef), {root: REPO}),
    '绑定资产': () => approvalExpectationForBoundAsset(gate, rel(c.subjectRef), {root: REPO, scope: c.state.approval_scope}),
  };
  return {c, gate, sources};
}
for (const source of ['状态', '主体', '绑定资产']) for (const [name, mutate] of Object.entries({'通过': () => {}, '审查人不是原回复者': (c) => { c.record.principal_ref = 'person.someone-else'; c.writeRecord(); }, '主体被改动': (c) => { writeFileSync(c.subjectRef, JSON.stringify({changed: true})); }})) {
  test(`期望由 yss 计算（${source}）：${name}`, {skip}, () => {
    const {c, gate, sources} = bindingCase();
    // 主体与绑定资产来源要求主体自带范围与依据；夹具里 subject.json 已含这些，且记录用相对引用
    mutate(c);
    if(name==='主体被改动'){
      assert.throws(()=>validateApprovalRecordFile(path.join(REPO,c.state.approval_ref),{requireApproved:true,root:REPO,expected:sources[source]()}),error=>['APPROVAL_CONTEXT_REQUIRED','APPROVAL_CURRENT_INVALID'].includes(error.code));return;
    }
    const expected=sources[source](),run=()=>validateApprovalRecordFile(path.join(REPO,c.state.approval_ref),{requireApproved:true,root:REPO,expected});
    if(name==='通过')assert.equal(run().execution_authorization,'not-evaluated');else assert.throws(run,error=>error.native===true&&error.code==='APPROVAL_CURRENT_INVALID');

  });
}

test('期望被调用方改动后不再采用绑定：委托的判定以改动后的期望为准', {skip}, () => {
  const {c, gate, sources} = bindingCase();
  const expected = sources['状态']();
  expected.approval_scope = ['other.scope'];
  assert.throws(()=>validateApprovalRecordFile(path.join(REPO,c.state.approval_ref),{requireApproved:true,root:REPO,expected}),error=>error.native===true&&error.code==='APPROVAL_CURRENT_INVALID');
});

// 校验适配没有任意读取器或缺能力回退分支；退役文件由专门的分发检查覆盖。
// 任务包（contract verify --kind task）：同一批生命周期任务包同时交给 Node 与 yss，结论一致；
// 写范围条目允许以「/」结尾表示目录（Node 生成的任务包就是这样写），通配符「**」不是支持的写法，两边结论可以不同（见 AR-10 总结）。
function taskPackage() {
  site = 'template-source';
  setup();
  const dir = path.join(REPO, '.work', `replay-${process.pid}`);
  mkdirSync(dir, {recursive: true});
  const evidence = path.join(dir, `task-evidence-${++seq}.json`);
  writeFileSync(evidence, JSON.stringify({ok: true}));
  return {dir, value: generateTaskPackageDefaults('role.requirements-manager', {task_id: 'task-discovery', work_unit_id: 'work-unit.plan-opportunity', actor_id: 'role.requirements-manager.instance-1', stage_id: 'stage.plan', runtime_id: 'runtime.skill-projection', execution_state: 'Worker', workflow_status: 'not-started',
    contract: {kind: 'lifecycle-work-unit', contract_id: 'lifecycle-discovery', contract_version: 1, status: 'issued', contract_ref: '.template-spec/process/lifecycle-registry.yaml', lifecycle_ref: '.template-spec/process/lifecycle-registry.yaml', artifact_refs: ['artifact.plan-record'], gate_refs: []},
    inputs: ['CONTEXT.md'], objective: '执行有界生命周期工作单元', allowed_write_paths: ['docs/.scratch/'], forbidden_actions: ['不得越过主控门禁'], expected_outputs: ['结构化工作结果'], expected_evidence_files: [path.relative(REPO, evidence)], verification_commands: ['scripts/verify-template'], verification_results: [], downstream_consumers: ['role.lifecycle-orchestrator'],
    convergence: {parent_work_unit: 'work-unit.plan-opportunity', convergence_ref: 'checkpoint:test', conflict_escalation: '返回主控'}})};
}
test('verify-digital-human-task-package 薄壳：通过与拒绝都透传', {skip}, () => {
  const c = taskPackage();
  const file = path.join(c.dir, `task-shell-${++seq}.json`);
  writeFileSync(file, JSON.stringify(c.value));
  const run = (f) => spawnSync(path.join(REPO, 'scripts', 'verify-digital-human-task-package'), [f], {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
  const ok = run(file);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /数字人任务包验证通过/);
  c.value.work_unit_id = 'work-unit.unknown';
  writeFileSync(file, JSON.stringify(c.value));
  const bad = run(file);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /数字人任务包验证失败/);
});

// 生命周期 checkpoint：在真实实例里用 yss stage plan/apply 生成带阶段跟踪的 checkpoint，
// 同一批变体交给实例自带的 Node 校验脚本与 yss lifecycle verify，通过/拒绝结论必须一致。
function trackedCheckpoint() {
  site = 'instance';
  const inst = setup();
  const feature = `.work/replay-checkpoint-${++seq}`;
  mkdirSync(path.join(inst, feature, 'plan'), {recursive: true});
  writeFileSync(path.join(inst, feature, 'plan/input.md'), '# 已确认的问题\n');
  const template = parseYamlText(readFileSync(path.join(inst, '.template-spec/process/templates/lifecycle-checkpoint-template.yaml'), 'utf8'));
  const ref = `${feature}/checkpoint.json`;
  writeFileSync(path.join(inst, ref), JSON.stringify({...template, feature_id: `feature.replay${seq}`, stage: 'stage.plan', next_work_unit: 'work-unit.plan-requirements', stage_trace: {...template.stage_trace, stage: 'stage.plan'}}));
  writeFileSync(path.join(inst, feature, 'map.md'), `---\ncheckpoint_ref: ${ref}\n---\n# 登记\n`);
  writeFileSync(path.join(inst, `replay-items-${seq}.json`), JSON.stringify([{id: 'scope', title: '明确导入覆盖规则', stage: 'stage.plan', work_unit: 'work-unit.plan-requirements', owner: '需求负责人', scope: '明确重复数据如何处理', acceptance: ['覆盖规则有明确实例'], source_refs: [`${feature}/plan/input.md`]}]));
  const plan = spawnSync(binary, ['stage', 'plan', '--root', inst, '--checkpoint', ref, '--items', `replay-items-${seq}.json`], {cwd: inst, encoding: 'utf8'});
  assert.equal(plan.status, 0, plan.stderr);
  writeFileSync(path.join(inst, `replay-stage-plan-${seq}.json`), plan.stdout);
  const applied = spawnSync(binary, ['stage', 'apply', '--root', inst, '--plan-file', `replay-stage-plan-${seq}.json`, '--json'], {cwd: inst, encoding: 'utf8'});
  assert.equal(applied.status, 0, applied.stdout);
  return {inst, ref, base: JSON.parse(readFileSync(path.join(inst, ref), 'utf8'))};
}
// 带已批准门禁的 checkpoint：门禁状态、批准记录、用户决定、主体与依据全部落在实例内，
// 通过实例自带的 Node 脚本与 yss 各校验一次；覆盖批准路径在整份 checkpoint 里的结论。
// 旧实例（tracker 没有 lifecycle_tracking_version）的未跟踪 checkpoint：Node 不要求功能身份与跟踪，yss 必须与之一致。
// 能力缺失显式拒绝，不能把参数错误或回退当成领域结论。
test('能力协商：旧 yss 拒绝并提示升级；新 yss 放行', {skip}, () => {
  const stubDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-old-')));
  process.on('exit', () => rmSync(stubDir, {recursive: true, force: true}));
  const stub = path.join(stubDir, 'yss');
  writeFileSync(stub, '#!/bin/sh\necho \'{"outputVersion":1,"status":"ok","code":"OK","result":{"nodeDelegation":["user-decision.requirements-object.v1"]}}\'\n', {mode: 0o755});
  const env = {...process.env};
  for (const key of Object.keys(env)) if (key === 'YSS_BINARY' || key.startsWith('YSS_NATIVE_') || key.startsWith('YSS_RELEASE_')) delete env[key];
  env.YSS_NATIVE_BINARY = stub;
  env.YSS_NATIVE_BINARY_SHA256 = createHash('sha256').update(readFileSync(stub)).digest('hex');
  assert.deepEqual(missingCapabilities(NEEDS.approval, env), NEEDS.approval);
  assert.deepEqual(missingCapabilities(['user-decision.requirements-object.v1'], env), []);
  assert.throws(()=>assertNativeCapabilities(NEEDS.approval,env),/NATIVE_CAPABILITY/);
  assert.doesNotThrow(()=>assertNativeCapabilities(NEEDS.approval));
  const shell = spawnSync(path.join(REPO, 'scripts', 'verify-approval-record'), ['--history', 'x.json'], {encoding: 'utf8', env});
  assert.notEqual(shell.status, 0);
  assert.match(shell.stderr, /缺少能力.*升级 yss/);
});

// 战略交接包（handoff verify --kind package）：Node 导出的包，被篡改后 Node 的 openBundle 与 yss 的校验结论必须一致。
let designInstance;
const listFiles = (dir, rel = '') => readdirSync(path.join(dir, rel), {withFileTypes: true}).flatMap((e) => e.isDirectory() ? listFiles(dir, path.join(rel, e.name)) : [path.join(rel, e.name)]);
// 战略交接消费（handoff verify --kind consumption）：Node 的 verifyConsumption 与 yss 的报告逐字段一致（含摘要、issues、blocked_slice_refs），
// Node 抛出错误的用例，yss 必须同样拒绝。
let consumptionBuilt;
async function consumptionCase() {
  consumptionBuilt ??= buildConsumption(); // 导出、导入一次，各用例只改各自的战术合同副本
  const built = await consumptionBuilt;
  return {target: built.target, tactical: structuredClone(built.tactical), snapshot: built.snapshot};
}
async function buildConsumption() {
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-consume-replay-')));
  cleanupDirs.add(base);
  const source = path.join(base, 'source');
  mkdirSync(source);
  const f = await handoffFixture(source, {handoffVersion: 4});
  const out = path.join(base, 'package');
  await exportBundle({sourceRoot: source, handoffRef: 'handoff.yaml', output: out});
  const target = makeRoot('yss-consume-', 'backend');
  writeFileSync(path.join(target, 'CONTEXT.md'), handoffContext);
  const imported = await importBundle({bundle: out, targetRoot: target});
  const draft = readHandoff(path.join(target, imported.traceability_ref));
  const tactical = {schema_version: 1, status: 'approved', strategic_handoff: {...draft, context_reconciliation_ref: 'reconciliation.yaml'}, behavior_catalog: [{behavior_id: 'behavior.submit'}], test_seams: [{seam_id: 'test-seam.submit', subject_ref: 'behavior.submit'}]};
  writeFileSync(path.join(target, 'reconciliation.yaml'), handoffJson({schema_version: 1, repository_mode: 'project-instance', stage: 'stage.system-data-engineering', work_unit: 'work-unit.technical-analysis', status: 'reconciled', context_snapshot: f.snapshot, changes: {added: ['Global/Supplier'], updated: [], deprecated: []}, unresolved_terms: [], evidence_refs: ['CONTEXT.md']}));
  for (const row of tactical.strategic_handoff.rows) Object.assign(row, {disposition: 'implemented', tactical_refs: ['behavior.submit'], test_seam_refs: ['test-seam.submit'], scenario_tests: [{outcome: 'success', seam_ref: 'test-seam.submit'}, {outcome: 'failure', seam_ref: 'test-seam.submit'}], evidence_refs: ['CONTEXT.md'], dependency_status: 'known', dependent_slice_refs: ['slice.submit']});
  return {target, tactical, snapshot: f.snapshot};
}
const sortKeys = (value) => Array.isArray(value) ? value.map(sortKeys) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])])) : value;
const consumptionCases = {
  '整体消费通过': {mutate: () => {}},
  '延期阻断依赖切片': {slice: 'slice.submit', mutate: (t) => Object.assign(t.strategic_handoff.rows[0], {disposition: 'deferred', reason: '分批实现', risk: '不能提交', owner: '需求负责人', followup_ticket_ref: 'ticket.followup', verification_plan: '提交测试', target_version: 'v2'})},
  '延期不阻断无关切片': {slice: 'slice.other', mutate: (t) => Object.assign(t.strategic_handoff.rows[0], {disposition: 'deferred', reason: '分批实现', risk: '不能提交', owner: '需求负责人', followup_ticket_ref: 'ticket.followup', verification_plan: '提交测试', target_version: 'v2'})},
  '未知依赖扩大阻断': {slice: 'slice.other', mutate: (t) => Object.assign(t.strategic_handoff.rows[0], {disposition: 'deferred', reason: '分批实现', risk: '不能提交', owner: '需求负责人', followup_ticket_ref: 'ticket.followup', verification_plan: '提交测试', target_version: 'v2', dependency_status: 'unknown'})},
  '缺少承接行': {mutate: (t) => { t.strategic_handoff.rows.pop(); }},
  '来源摘要过期': {mutate: (t) => { t.strategic_handoff.rows[0].source_digest = `sha256:${'1'.repeat(64)}`; }},
  '承接行指向不存在的来源': {mutate: (t) => { t.strategic_handoff.rows.push({...t.strategic_handoff.rows[0], source_id: 'rule.ghost'}); }},
  '战术落点悬空': {mutate: (t) => { t.strategic_handoff.rows[0].tactical_refs = ['aggregate.fake']; }},
  '切片只能消费 approved 合同': {slice: 'slice.submit', mutate: (t) => { t.status = 'draft'; }},
  '重复承接': {mutate: (t) => { t.strategic_handoff.rows.push(structuredClone(t.strategic_handoff.rows[0])); }},
};
test('verify-strategic-handoff-consumption 薄壳：通过、阻断、拒绝都与旧输出同形', {skip}, async () => {
  const {target, tactical} = await consumptionCase();
  const run = (value, args = []) => {
    writeFileSync(path.join(target, 'shell-tactical.json'), JSON.stringify(value));
    return spawnSync(path.join(REPO, 'scripts', 'verify-strategic-handoff-consumption'), ['--root', target, ...args, path.join(target, 'shell-tactical.json')], {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
  };
  const ok = run(tactical);
  assert.equal(ok.status, 0, ok.stderr);
  const report = JSON.parse(ok.stdout);
  assert.equal(report.result, 'verified');
  assert.deepEqual(Object.keys(report).slice(0, 3), ['result', 'bundle_digest', 'consumed_bundle_digest']);
  const blocked = structuredClone(tactical);
  Object.assign(blocked.strategic_handoff.rows[0], {disposition: 'deferred', reason: '分批实现', risk: '不能提交', owner: '需求负责人', followup_ticket_ref: 'ticket.followup', verification_plan: '提交测试', target_version: 'v2'});
  const stopped = run(blocked, ['--slice', 'slice.submit']);
  assert.equal(stopped.status, 1);
  assert.equal(JSON.parse(stopped.stdout).result, 'blocked');
  const bad = structuredClone(tactical);
  bad.strategic_handoff.rows[0].tactical_refs = ['aggregate.fake'];
  const rejected = run(bad);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /"result":"blocked"/);
});

// 消费结果保留固定业务预期。
for (const [name, spec] of Object.entries({'整体消费通过': consumptionCases['整体消费通过'], '延期阻断依赖切片': consumptionCases['延期阻断依赖切片'], '延期不阻断无关切片': consumptionCases['延期不阻断无关切片'], '缺少承接行': consumptionCases['缺少承接行']})) {
  test(`消费适配固定预期：${name}`, {skip}, async () => {
    const {target,tactical}=await consumptionCase();spec.mutate(tactical);
    const report=await verifyConsumption(tactical,{root:target,...(spec.slice?{sliceRef:spec.slice}:{})});
    assert.equal(report.result,['整体消费通过','延期不阻断无关切片'].includes(name)?'verified':'blocked');
  });
}

// Context 对账记录（evidence verify --kind context-reconciliation）：Node 的 verifyContextReconciliation 与 yss 结论一致。
// OpenAPI Draft validation record：预期经删除 Node 实现前的 17 组对拍确认，三类正式输入通过，其余拒绝。
const openapiDraft = `openapi: 3.1.0
info: { title: Example, version: 0.1.0-draft }
paths:
  /widgets/{id}:
    get:
      operationId: getWidget
      parameters:
        - { $ref: '#/components/parameters/WidgetId' }
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Widget' }
components:
  parameters:
    WidgetId:
      name: id
      in: path
      required: true
      schema: { type: string }
  schemas:
    Widget:
      type: object
      properties: { id: { type: string } }
`;
const sha256 = (text) => `sha256:${createHash('sha256').update(text).digest('hex')}`;
function openapiCase({draft = openapiDraft, record = (r) => r, extraFiles = {}, lock = "lockfileVersion: '9.0'\npackages:\n  '@redocly/cli@2.0.0': {}\n", withEvidence = true, draftName = 'example.yaml'} = {}) {
  const target = makeRoot('yss-openapi-replay-');
  const feature = `example${++seq}`;
  const base = readWorkLayout(target).featureRoot(feature);
  const draftRef = `${base}/api/${draftName}`;
  const evidenceRef = `${base}/api/lint.txt`;
  const put = (ref, text) => { mkdirSync(path.dirname(path.join(target, ref)), {recursive: true}); writeFileSync(path.join(target, ref), text); };
  const schemaRef = '.template-spec/process/schemas/openapi-draft-validation-record.schema.json';
  put(schemaRef, readFileSync(path.join(REPO, schemaRef), 'utf8'));
  put(draftRef, draft);
  if (withEvidence) put(evidenceRef, 'redocly lint passed\n');
  put('pnpm-lock.yaml', lock);
  for (const [ref, text] of Object.entries(extraFiles)) put(`${base}/api/${ref}`, text);
  const value = record({
    schema_version: 1, kind: 'openapi-draft-validation', template: false, status: 'passed',
    draft: {ref: draftRef, sha256: sha256(draft), oas_version: '3.1.0'},
    toolchain: {package: '@redocly/cli', version: '2.0.0', lockfile_ref: 'pnpm-lock.yaml', command: `pnpm exec redocly lint ${draftRef}`, exit_code: 0, executed_at: '2026-09-10T00:00:00Z', evidence_ref: evidenceRef},
    checks: {single_document: 'passed', oas_3_1: 'passed', ref_resolution: 'passed', path_parameters: 'passed', operation_ids: 'passed', lint: 'passed'},
  }, {draftRef, base});
  const ref = `openapi-record-${seq}.json`;
  put(ref, JSON.stringify(value));
  return {target, ref, draftRef};
}
const openapiVariants = {
  '通过': {},
  '摘要过期': {record: (r) => ({...r, draft: {...r.draft, sha256: `sha256:${'0'.repeat(64)}`}})},
  'lint 失败': {record: (r) => ({...r, status: 'blocked', toolchain: {...r.toolchain, exit_code: 1}, checks: {...r.checks, lint: 'blocked'}})},
  '命令指向其他 Draft': {record: (r, c) => ({...r, toolchain: {...r.toolchain, command: `pnpm exec redocly lint ${c.base}/api/other.yaml`}})},
  '锁文件未绑定版本': {record: (r) => ({...r, toolchain: {...r.toolchain, version: '2.1.0'}})},
  '锁文件为 pnpm 9 风格': {lock: "lockfileVersion: '9.0'\npackages:\n  '@redocly/cli':\n    version: 2.0.0\n"},
  '$ref 无法解析': {draft: openapiDraft.replace('#/components/schemas/Widget', '#/components/schemas/Missing')},
  'operationId 重复': {draft: openapiDraft.replace('      responses:', '      responses:').replace('paths:', 'paths:\n  /other:\n    get:\n      operationId: getWidget\n      responses:\n        \'200\': { description: ok }')},
  '缺少 required path 参数': {draft: openapiDraft.replace("        - { $ref: '#/components/parameters/WidgetId' }\n", '')},
  'OAS 3.0': {draft: openapiDraft.replace('openapi: 3.1.0', 'openapi: 3.0.3'), record: (r) => ({...r, draft: {...r.draft, oas_version: '3.0.3'}})},
  '远程 $ref': {draft: openapiDraft.replace('#/components/schemas/Widget', 'https://example.com/w.yaml#/Widget')},
  '$ref 越出 API 目录': {draft: openapiDraft.replace('#/components/schemas/Widget', '../../outside.yaml#/Widget')},
  '指向其他文件的合法 $ref': {draft: openapiDraft.replace('#/components/schemas/Widget', 'shared.yaml#/Widget'), extraFiles: {'shared.yaml': 'Widget:\n  type: object\n'}},
  '证据文件不存在': {withEvidence: false},
  '正式记录被标成模板': {record: (r) => ({...r, template: true})},
  'Draft 不在功能包 API 目录': {record: (r, c) => ({...r, draft: {...r.draft, ref: 'docs/loose.yaml'}, toolchain: {...r.toolchain, command: 'pnpm exec redocly lint docs/loose.yaml'}})},
};
for (const [name, spec] of Object.entries(openapiVariants)) {
  test(`OpenAPI Draft validation 回放：${name}`, {skip}, () => {
    const c = openapiCase(spec);
    const expectedPassed = ['通过', '锁文件为 pnpm 9 风格', '指向其他文件的合法 $ref'].includes(name);
    const go = nativeContractVerify({root: c.target, kind: 'openapi-validation', file: c.ref});
    assert.equal(go.exitCode === 0, expectedPassed, `固定预期不一致：${name} Go=${go.exitCode} ${go.message.slice(0, 160)}`);
    if (expectedPassed) assert.equal(go.envelope.result.coverage.openapi_validation.draft_ref, c.draftRef);
    else assert.doesNotMatch(go.message, /ENOENT.*openapi-record/, '拒绝原因不能是找不到记录文件');
  });
}
test('OpenAPI Draft validation 回放：--allow-template 只接受模板记录', {skip}, () => {
  const ref = '.template-spec/api/templates/openapi-draft-validation-record-template.yaml';
  const go = nativeContractVerify({root: REPO, kind: 'openapi-validation', file: ref, extra: ['--allow-template']});
  assert.equal(go.exitCode, 0, go.message);
  assert.equal(go.envelope.result.coverage.openapi_validation.template, true);
  // 正式记录加 --allow-template 必须拒绝（模板标记为 false）
  const c = openapiCase();
  assert.notEqual(nativeContractVerify({root: c.target, kind: 'openapi-validation', file: c.ref, extra: ['--allow-template']}).exitCode, 0);
});

// 脚手架架构选择记录（contract verify --kind scaffold-decisions）：yss 的结论与录制的预期一致（预期来自 AR-12 对拍时 Node 实现的结论：通过 2 类，其余全部拒绝；Node 对照实现已随 AR-12b 删除）。
const scaffoldConfirmation = {confirmed_by: 'user', channel: 'codex', confirmation_ref: 'turn://1', confirmed_at: '2026-09-05T01:00:00+08:00', normalized_text: '确认 MVC'};
const scaffoldDecision = (extra = {}) => ({decision_id: 'scaffold-decision.main', project_id: 'main', parent_project_id: null, status: 'lifecycle-approved', recommended_architecture: 'layered-mvc', recommendation_reasons: ['CRUD 与报表为主'], confirmed_architecture: 'layered-mvc', override_reason: null,
  inheritance_mode: 'root-default', inherited_from: null, platform_profile: 'spring-boot-2.7-jdk8', architecture_profile: 'layered-mvc-service', verification_database: 'h2', production_database: 'not-bound', requested_capabilities: ['feign-client'],
  resolved_modules: ['server', 'service', 'repository', 'client', 'feign-client'], resolution_version: 1, user_confirmation: scaffoldConfirmation, decision_inputs_digest: `sha256:${'1'.repeat(64)}`, ...extra});
const scaffoldChild = (extra = {}) => scaffoldDecision({decision_id: 'scaffold-decision.child', project_id: 'child', parent_project_id: 'main', recommended_architecture: 'domain-driven', recommendation_reasons: ['存在复杂状态机'], override_reason: '继承本体的统一架构',
  inheritance_mode: 'inherit', inherited_from: 'main', requested_capabilities: [], resolved_modules: ['server', 'service', 'repository'], ...extra});
const scaffoldVariants = {
  '单个 MVC 决定通过': {decisions: [scaffoldDecision()], ok: true},
  '子项目继承通过': {decisions: [scaffoldDecision(), scaffoldChild()], ok: true},
  '缺少用户确认引用': {decisions: [scaffoldDecision({user_confirmation: {...scaffoldConfirmation, confirmation_ref: null}})]},
  '模块闭包缺少 capability 模块': {decisions: [scaffoldDecision({resolved_modules: ['server', 'service', 'repository']})]},
  '继承值与父项目不一致': {decisions: [scaffoldDecision(), scaffoldChild({confirmed_architecture: 'domain-driven', override_reason: null})]},
  '覆盖推荐没有说明': {decisions: [scaffoldDecision({recommended_architecture: 'domain-driven'})]},
  'project_id 重复': {decisions: [scaffoldDecision(), scaffoldDecision({decision_id: 'scaffold-decision.other'})]},
  '引用不存在的父项目': {decisions: [scaffoldChild({parent_project_id: 'ghost', inherited_from: 'ghost'})]},
  '根默认却声明父项目': {decisions: [scaffoldDecision({parent_project_id: 'x'})]},
  '未知架构 Profile': {decisions: [scaffoldDecision({architecture_profile: 'no-such-profile'})]},
  '未知平台': {decisions: [scaffoldDecision()], afterAttach: (d) => { d.platform_profile = 'spring-boot-9'; }},
  '数据库绑定不是 h2': {decisions: [scaffoldDecision({verification_database: 'mysql'})]},
  '正式记录标成模板': {decisions: [scaffoldDecision()], template: true},
  '用户所见快照被改（输入摘要变化）': {decisions: [scaffoldDecision()], afterAttach: (d) => { d.decision_inputs_digest = `sha256:${'2'.repeat(64)}`; }},
};
for (const [name, spec] of Object.entries(scaffoldVariants)) {
  test(`脚手架架构选择回放：${name}`, {skip}, () => {
    const target = makeRoot('yss-scaffold-replay-', 'backend'); // 平台目录与证据只在 Backend 实例里
    const record = {schema_version: 1, kind: 'scaffold-architecture-decisions', template: spec.template ?? false, status: 'current',
      decisions: spec.decisions.map((decision) => attachScaffoldDecisionFixture(path.join(target, '.work', `scaffold-${++seq}`, decision.project_id), decision))};
    if (spec.afterAttach) record.decisions.forEach(spec.afterAttach);
    const ref = `scaffold-decisions-${seq}.json`;
    writeFileSync(path.join(target, ref), JSON.stringify(record));
    const go = nativeContractVerify({root: target, kind: 'scaffold-decisions', file: ref});
    assert.equal(go.exitCode === 0, spec.ok === true, `结论与录制预期不一致：预期${spec.ok ? '通过' : '拒绝'}，yss=${go.exitCode} ${go.message.slice(0, 160)}`);
    if (!spec.ok) assert.doesNotMatch(go.message, /输入不可读|ENOENT/, '拒绝原因不能是找不到记录文件');
  });
}
test('脚手架架构选择回放：--allow-template 接受模板记录', {skip}, () => {
  const ref = '.template-spec/process/templates/scaffold-architecture-decisions-template.yaml';
  const go = nativeContractVerify({root: REPO, kind: 'scaffold-decisions', file: ref, extra: ['--allow-template']});
  assert.equal(go.exitCode, 0, go.message);
  assert.notEqual(nativeContractVerify({root: REPO, kind: 'scaffold-decisions', file: ref}).exitCode, 0);
});

test('维护任务回放：嵌套 Git 不阻断仓外证据，登记仓库与符号链接仍受保护', {skip}, () => {
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'maintenance-task-replay-')));
  cleanupDirs.add(base);
  const root = path.join(base, 'template'), home = path.join(base, 'runtime');
  mkdirSync(root);
  for (const ref of ['yss-project.yaml', 'CONTEXT.md', '.template-spec', '.agents/skills/yss-product-lifecycle/references', '.template-source/process/maintenance-intensity.yaml']) {
    mkdirSync(path.dirname(path.join(root, ref)), {recursive: true});
    cpSync(path.join(REPO, ref), path.join(root, ref), {recursive: true, verbatimSymlinks: true});
  }
  const maintenance = path.join(home, createHash('sha256').update(root).digest('hex'), 'maintenance/checkpoints');
  mkdirSync(maintenance, {recursive: true});
  writeFileSync(path.join(maintenance, 'fixture.json'), JSON.stringify({schema_version: 1, intensity: 'L1', classification_reason: 'maintenance read fixture', triggers: ['textual-only'], changed_assets: ['CONTEXT.md'], verification_evidence: [{kind: 'relevant-check', command: 'fixture', result: 'pass'}], review_mode: 'self-check', escalation: 'none'}));
  const value = generateTaskPackageDefaults('role.backend-engineer', {task_id: 'maintenance-read', work_unit_id: 'work-unit.maintenance-research', actor_id: 'fixture.worker', runtime_id: 'runtime.generic', execution_state: 'Worker', workflow_status: 'active',
    contract: {kind: 'template-maintenance', contract_id: 'fixture', contract_version: 1, status: 'issued', contract_ref: 'CONTEXT.md', maintenance_ref: 'maintenance:checkpoints/fixture.json'},
    inputs: ['CONTEXT.md'], objective: '核验维护引用读取边界', allowed_write_paths: ['CONTEXT.md'], forbidden_actions: ['修改实现'], expected_outputs: ['校验结果'], expected_evidence_files: ['CONTEXT.md'], verification_commands: ['fixture'], verification_results: [], downstream_consumers: ['fixture.controller'], convergence: {parent_work_unit: 'work-unit.maintenance-research', convergence_ref: 'CONTEXT.md', conflict_escalation: 'fixture.controller'}});
  writeFileSync(path.join(root, 'task.json'), JSON.stringify(value));
  const verify = (runtimeHome = home) => nativeContractVerify({root, kind: 'task', file: 'task.json', environment: {...process.env, YSS_RUNTIME_HOME: runtimeHome}});
  const pass = () => { const r = verify(); assert.equal(r.exitCode, 0, r.message); };
  pass();
  const child = path.join(root, '.work/cli'); mkdirSync(path.join(child, '.git'), {recursive: true}); pass();
  rmSync(path.join(child, '.git'), {recursive: true}); writeFileSync(path.join(child, '.git'), 'gitdir: /fixture-only'); pass(); unlinkSync(path.join(child, '.git'));
  mkdirSync(path.join(child, 'node_modules')); writeFileSync(path.join(child, 'node_modules/package.json'), '{}'); pass(); rmSync(path.join(child, 'node_modules'), {recursive: true});
  const external = path.join(base, 'registered'); mkdirSync(external);
  writeFileSync(path.join(child, 'registration.json'), JSON.stringify({project_root: external}));
  const denied = verify(path.join(external, 'runtime')); assert.notEqual(denied.exitCode, 0); assert.match(denied.message, /已登记仓库/);
  for (const name of ['.git', 'node_modules', 'linked']) {
    // 真实链接必须拒绝，不能被目录过滤规则隐藏。
    symlinkSync(external, path.join(child, name), 'dir');
    const linked = verify(); assert.notEqual(linked.exitCode, 0); assert.match(linked.message, /符号链接/); unlinkSync(path.join(child, name));
  }
  unlinkSync(path.join(child, 'registration.json'));
  const runtimeRoot = path.join(base, 'runtime-instance');
  const initialized = spawnSync(binary, ['init', '--profile', 'spec', '--root', runtimeRoot, '--project-name', 'capacity'], {encoding: 'utf8'});
  assert.equal(initialized.status, 0, initialized.stderr || initialized.stdout);
  const crowded = path.join(runtimeRoot, '.work/crowded'); mkdirSync(crowded, {recursive: true});
  for (let i = 0; i < 20000; i++) writeFileSync(path.join(crowded, 'file-' + String(i).padStart(5, '0') + '.txt'), '');
  const inspect = runtimeHome => spawnSync(binary, ['runtime', 'inspect', '--root', runtimeRoot, '--json'], {encoding: 'utf8', env: {...process.env, YSS_RUNTIME_HOME: runtimeHome}});
  const ordinary = inspect(home); assert.equal(ordinary.status, 0, ordinary.stderr || ordinary.stdout);
  // 登记项排在全部普通文件之后，证明普通路径保护完整扫描，不能到达上限后成功截断。
  writeFileSync(path.join(crowded, 'z-registration.json'), JSON.stringify({project_root: external}));
  const protectedLate = inspect(path.join(external, 'runtime'));
  assert.notEqual(protectedLate.status, 0); assert.match(protectedLate.stderr + protectedLate.stdout, /已登记仓库/);
  renameSync(crowded, path.join(root, '.work/crowded'));
  const bounded = verify(); assert.notEqual(bounded.exitCode, 0); assert.match(bounded.message, /20000/);

});
