// 唯一实现的最低测试（FR-011）：同一批合成夹具同时交给 Node 校验与固定版本 yss，结论（通过/拒绝及拒绝码）必须一致。
// 夹具在测试里现场构建，改动夹具里的判定输入，回放就应当失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {nativeEvidenceVerify, nativeContractVerify, nativeLifecycleVerify, nativeDelegationAvailable, rootBoundRead, NEEDS, missingCapabilities} from '../scripts/lib/native-evidence.mjs';
import {generateTaskPackageDefaults, validateTaskPackage} from '../scripts/lib/task-package.mjs';
import {parse as parseYamlText} from '../scripts/vendor/yaml.mjs';
import {fixture as handoffFixture, context as handoffContext} from '../scripts/fixtures/strategic-handoff/fixture.mjs';
import {exportBundle, openBundle, importBundle} from '../scripts/lib/strategic-handoff.mjs';
import {verifyConsumption} from '../scripts/lib/strategic-handoff-consumption.mjs';
import {verifyContextReconciliation} from '../scripts/lib/context-reconciliation.mjs';
import {read as readHandoff, json as handoffJson} from '../scripts/lib/strategic-handoff-io.mjs';
import {makeRoot} from './helpers/yss-instance.mjs';
import {readdirSync, cpSync, unlinkSync, appendFileSync} from 'node:fs';
import {buildDecisionFixture} from '../scripts/lib/testing/user-decision-fixture.mjs';
import {validateUserDecision, assertUserDecisionRequirement} from '../scripts/lib/user-decision.mjs';
import {validateApprovalRecord, approvalExpectationFromSubject} from '../scripts/lib/approval-record.mjs';
import {approvalExpectationForBoundAsset} from '../scripts/lib/approval-consumption.mjs';
import {approvalExpectationFromState} from '../scripts/lib/approval-current.mjs';
import {decisionDigest} from '../scripts/lib/user-decision-core.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareReviewPackage} from '../scripts/lib/review-package.mjs';
import {approvalExpectedFromTask} from '../scripts/lib/review-capabilities.mjs';
import {loadRegistry} from '../scripts/lib/lifecycle-registry.mjs';
import {loadDigitalHumanRoles} from '../scripts/lib/digital-human-roles.mjs';
import {parseDocument} from '../scripts/vendor/yaml.mjs';
import {validateApprovalRecordFile, assertApprovedGateHasValidApproval} from '../scripts/lib/approval-record.mjs';

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
const nodeVerdict = (f) => {
  try { validateUserDecision(f.record, {expected: [f.requirement]}); return {ok: true}; } catch (error) { return {ok: false, code: error.code}; }
};
const goVerdict = (f) => {
  f.save();
  const req = path.join(path.dirname(f.ref), 'requirements.json');
  writeFileSync(req, JSON.stringify([f.requirement]));
  const r = nativeEvidenceVerify({root: setup(), kind: 'user-decision', file: f.ref, extra: ['--requirements', req]});
  return {ok: r.exitCode === 0, code: r.diagnostics[0]?.code, message: r.message};
};

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

// 两边都拒绝，但拒绝码粒度不同：Node 对 schema 违规不带码，Go 统一报 SCHEMA；来源不可读时 Go 报 INPUT。结论一致即可。
const codeDiffers = new Set(['默认选项冒充原始消息', '来源文件缺失', '只有 Agent 摘要']);

for (const [name, mutate] of Object.entries(cases)) for (const where of ['instance', 'template-source']) {
  test(`用户决定回放（${where}）：${name}`, {skip}, () => {
    site = where;
    const f = fixture();
    mutate(f);
    const node = nodeVerdict(f);
    const go = goVerdict(f);
    assert.equal(go.ok, node.ok, `结论不一致：Node=${JSON.stringify(node)} Go=${JSON.stringify(go)}`);
    if (!node.ok && !codeDiffers.has(name)) assert.equal(go.code, node.code, `拒绝码不一致：Node=${node.code} Go=${go.code}（${go.message}）`);
  });
}

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

// 适配层：进程内入口 assertUserDecisionRequirement 委托给 yss 后，结论、拒绝码与已核验事项必须和进程内实现一致。
for (const [name, mutate] of Object.entries(cases)) {
  test(`适配层等价（assertUserDecisionRequirement）：${name}`, {skip}, () => {
    site = 'template-source';
    const f = fixture();
    mutate(f);
    f.save();
    const run = (native) => {
      try {
        const r = assertUserDecisionRequirement(f.requirement, {root: REPO, native});
        return {ok: true, validated: r.validated};
      } catch (error) { return {ok: false, code: error.code}; }
    };
    const inProcess = run(false);
    const delegated = run(true);
    assert.equal(delegated.ok, inProcess.ok, `结论不一致：进程内=${JSON.stringify(inProcess)} 委托=${JSON.stringify(delegated)}`);
    if (!inProcess.ok && !codeDiffers.has(name)) assert.equal(delegated.code, inProcess.code);
    if (inProcess.ok) assert.deepEqual(delegated.validated.map((row) => [row.item_id, row.boundary, row.principal_ref, row.scope]), inProcess.validated.map((row) => [row.item_id, row.boundary, row.principal_ref, row.scope]));
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

// 当前批准（v1，调用方给出显式期望）：进程内实现与委托给 yss 的结论、拒绝码必须一致，拒绝文案保留内部码。
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
    const run = (native) => {
      try { validateApprovalRecord(c.record, {requireApproved: true, root: REPO, expected: c.expected, native}); return {ok: true}; } catch (error) { return {ok: false, code: error.code, message: error.message}; }
    };
    const inProcess = run(false);
    const delegated = run(true);
    assert.equal(delegated.ok, inProcess.ok, `结论不一致：进程内=${JSON.stringify(inProcess)} 委托=${JSON.stringify(delegated)}`);
    if (!inProcess.ok) {
      // 期望算出后主体又被改动：进程内用冻结的期望得到「摘要过期」，委托时 yss 按绑定重新计算，主体已不满足期望前提得到「缺少上下文」。两边都拒绝，码不同（见设计 §11）。
      if (name !== '主体被改动') assert.equal(delegated.code, inProcess.code);
      assert.equal(delegated.native, undefined);
      // 进程内文案里的内部码（如 user-decision-responder-mismatch）委托后也必须保留
      for (const token of inProcess.message.match(/user-decision-[a-z-]+/g) ?? []) assert.match(delegated.message, new RegExp(token));
    }
  });
}

// v2 记录与组合包：用真实注册表和角色政策在模板源仓根生成待审包，批准后对拍进程内实现与委托。
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
    const check = (label, run) => {
      const inProcess = outcome(() => run(false)), delegated = outcome(() => run(true));
      assert.equal(delegated.ok, inProcess.ok, `${label} 结论不一致：进程内=${JSON.stringify(inProcess)} 委托=${JSON.stringify(delegated)}`);
      if (!inProcess.ok) { assert.equal(delegated.code, inProcess.code, label); if (name !== '审查人自签') assert.equal(delegated.native, true, `${label} 应已委托`); } // 自签在读取记录结构时就被进程内前置检查拒绝，到不了委托
    };
    check('组合包文件', (native) => validateApprovalRecordFile(path.join(REPO, c.bundleFile), {requireApproved: true, root: REPO, expected: c.expected, native}));
    check('单行记录', (native) => validateApprovalRecord(c.bundle.reviews[1], {requireApproved: true, root: REPO, expected: c.expected[1], native}));
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
    const run = (native) => outcome(() => assertApprovedGateHasValidApproval(gate, c.state, {root: REPO, checkpointPath: REPO, native}));
    const inProcess = run(false), delegated = run(true);
    assert.equal(delegated.ok, inProcess.ok, `结论不一致：进程内=${JSON.stringify(inProcess)} 委托=${JSON.stringify(delegated)}`);
    if (!inProcess.ok) { assert.equal(delegated.code, inProcess.code); assert.equal(delegated.native, true, '应已委托'); }
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
    const node = outcome(() => sources[source]());
    if (!node.ok) return; // 期望本身就无法算出时没有可对拍的期望
    const expected = sources[source]();
    const inProcess = outcome(() => validateApprovalRecordFile(path.join(REPO, c.state.approval_ref), {requireApproved: true, root: REPO, expected, native: false}));
    let viaYss;
    const delegated = outcome(() => { viaYss = validateApprovalRecordFile(path.join(REPO, c.state.approval_ref), {requireApproved: true, root: REPO, expected, native: true}); });
    assert.equal(delegated.ok, inProcess.ok, `结论不一致：进程内=${JSON.stringify(inProcess)} 委托=${JSON.stringify(delegated)}`);
    if (!inProcess.ok) assert.equal(delegated.code, inProcess.code);
    if (delegated.ok) assert.deepEqual(keyFields(viaYss.expected_by_yss), keyFields(expected));
  });
}

test('期望被调用方改动后不再采用绑定：委托的判定以改动后的期望为准', {skip}, () => {
  const {c, gate, sources} = bindingCase();
  const expected = sources['状态']();
  expected.approval_scope = ['other.scope'];
  const run = (native) => outcome(() => validateApprovalRecordFile(path.join(REPO, c.state.approval_ref), {requireApproved: true, root: REPO, expected, native}));
  const inProcess = run(false), delegated = run(true);
  assert.equal(inProcess.ok, false);
  assert.equal(delegated.ok, false);
  assert.equal(delegated.code, inProcess.code);
  assert.equal(delegated.native, true);
});

// 委托判断：只按项目根读取的读取器与同根默认规则不阻止委托，其他自带读取器或规则仍然阻止（过渡期不改变进程内语义）。
test('委托判断：rootBoundRead 与 defaultAuthorities 放行，自带虚拟读取器与自带规则仍阻止', {skip}, () => {
  const read = (ref) => ref;
  assert.equal(nativeDelegationAvailable(REPO, {}), true);
  assert.equal(nativeDelegationAvailable(REPO, {read: rootBoundRead(read.bind(null))}), true);
  assert.equal(nativeDelegationAvailable(REPO, {read}), false);
  assert.equal(nativeDelegationAvailable(REPO, {rolesDoc: {}}), false);
  assert.equal(nativeDelegationAvailable(REPO, {rolesDoc: {}, registry: {}, defaultAuthorities: true}), true);
  assert.equal(nativeDelegationAvailable(REPO, {rolesDoc: {}, defaultAuthorities: true, native: false}), false);
});

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
const taskCases = {
  '通过（目录以 / 结尾）': () => {},
  '通过（无尾斜杠）': (p) => { p.allowed_write_paths = ['docs/x']; },
  '角色未覆盖阶段': (p) => { p.role_id = 'role.test-engineer'; },
  '写路径是绝对路径': (p) => { p.allowed_write_paths = ['/etc/']; },
  '缺目标': (p) => { delete p.objective; },
  '未知工作单元': (p) => { p.work_unit_id = 'work-unit.unknown'; },
  '合同引用不可读': (p) => { p.contract.contract_ref = 'none.yaml'; },
};
for (const [name, mutate] of Object.entries(taskCases)) {
  test(`任务包回放：${name}`, {skip}, () => {
    const c = taskPackage();
    mutate(c.value);
    const node = outcome(() => validateTaskPackage(c.value, {}));
    const file = path.join(c.dir, `task-${++seq}.json`);
    writeFileSync(file, JSON.stringify(c.value));
    const r = nativeContractVerify({root: REPO, kind: 'task', file: path.relative(REPO, file)});
    assert.equal(r.exitCode === 0, node.ok, `结论不一致：Node=${JSON.stringify(node)} Go=${r.exitCode} ${r.message}`);
  });
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
const checkpointVariants = {
  '原样': (x) => x,
  'mode=audit': (x) => ({...x, mode: 'audit'}),
  'status=running': (x) => ({...x, status: 'running'}),
  'status=completed 无阶段验收': (x) => ({...x, status: 'completed', next_work_unit: null}),
  'status=paused-human-gate 无对账': (x) => ({...x, status: 'paused-human-gate'}),
  'status=blocked 有阻塞': (x) => ({...x, status: 'blocked', blockers: ['缺少输入']}),
  '未知 status': (x) => ({...x, status: 'unknown'}),
  '下一工作单元未登记': (x) => ({...x, next_work_unit: 'work-unit.unknown'}),
  'next=null': (x) => ({...x, next_work_unit: null}),
  'next=spec-synthesis 缺 Plan 审阅包': (x) => ({...x, next_work_unit: 'work-unit.spec-synthesis'}),
  'next=slice-implementation 缺业务票': (x) => ({...x, next_work_unit: 'work-unit.slice-implementation'}),
  'stage 与 trace 不一致': (x) => ({...x, stage: 'stage.spec-architecture'}),
  '边界 handoff 缺依据': (x) => ({...x, phase_boundary: {decision: 'handoff'}}),
  '边界 handoff 有依据': (x) => ({...x, phase_boundary: {decision: 'handoff', reason: 't', source_ref: 'CONTEXT.md', destination_ref: 'AGENTS.md'}}),
  '边界未知': (x) => ({...x, phase_boundary: {decision: 'unknown', reason: 't'}}),
  '缺 gates': (x) => { const y = structuredClone(x); delete y.gates; return y; },
  '引用不存在的用户决定': (x) => ({...x, status: 'running', human_review: {...x.human_review, required_decisions: [{boundary: 'gate.plan-approved', subject_ref: 'none.md', scope: ['a'], user_decision_ref: 'none.json'}]}}),
  '仓库身份矛盾': (x) => ({...x, repository_mode: 'template-source'}),
  '多余字段': (x) => ({...x, surprise: 1}),
  'schema_version=2': (x) => ({...x, schema_version: 2}),
};
for (const [name, mutate] of Object.entries(checkpointVariants)) {
  test(`checkpoint 回放：${name}`, {skip}, () => {
    const {inst, ref, base} = trackedCheckpoint();
    writeFileSync(path.join(inst, ref), JSON.stringify(mutate(structuredClone(base))));
    const node = spawnSync(process.execPath, [path.join(inst, 'scripts/verify-lifecycle-checkpoint'), ref], {cwd: inst, encoding: 'utf8'});
    const go = nativeLifecycleVerify({root: inst, file: ref});
    assert.equal(go.exitCode === 0, node.status === 0, `结论不一致：Node=${node.status} ${node.stderr.trim().slice(0, 120)} Go=${go.exitCode} ${go.message.slice(0, 120)}`);
  });
}

// 带已批准门禁的 checkpoint：门禁状态、批准记录、用户决定、主体与依据全部落在实例内，
// 通过实例自带的 Node 脚本与 yss 各校验一次；覆盖批准路径在整份 checkpoint 里的结论。
function approvedGateCheckpoint() {
  const c = trackedCheckpoint();
  const gate = 'gate.spec-baseline-approved';
  const dir = path.join(path.dirname(c.ref), 'approval');
  mkdirSync(path.join(c.inst, dir), {recursive: true});
  const rel = (name) => path.join(dir, name);
  const put = (name, value) => { writeFileSync(path.join(c.inst, rel(name)), typeof value === 'string' ? value : JSON.stringify(value)); return rel(name); };
  const evidenceRef = put('evidence.log', 'synthetic independent comparison');
  const evidence = {ref: evidenceRef, digest: decisionDigest(readFileSync(path.join(c.inst, evidenceRef))).slice(7)};
  const subjectRef = put('subject.json', {gate_id: gate, approval_scope: ['feature.demo'], basis: [evidence], drafter_principal_ref: 'synthetic.drafter'});
  const decision = buildDecisionFixture(path.join(c.inst, dir, 'decision'), {boundary: gate, subjectRef: path.join(c.inst, subjectRef)});
  // 夹具里的引用是绝对路径；决定与请求都落在实例内，保持绝对路径即可
  decision.record.request.items[0].subject.ref = subjectRef; // 批准记录用实例相对引用，决定里的主体引用必须相同
  decision.record.request.items[0].subject.digest = decisionDigest(readFileSync(path.join(c.inst, subjectRef)));
  decision.present(); decision.record.responses = []; decision.respond(); decision.save();
  const subjectDigest = decisionDigest(readFileSync(path.join(c.inst, subjectRef))).slice(7);
  const record = {schema_version: 1, gate_id: gate, decision: 'approved', actor_kind: 'digital-human', role_id: 'role.product-manager', runtime_id: 'runtime.generic', principal_ref: 'synthetic.reviewer', drafter_principal_ref: 'synthetic.drafter', subject_ref: subjectRef, subject_digest: subjectDigest, approval_scope: ['feature.demo'], basis: [evidence], user_decision_ref: path.relative(c.inst, decision.ref)};
  const approvalRef = put('approval.json', record);
  const state = {status: 'approved', reason: '同步骤批准', evidence_refs: [evidenceRef, approvalRef, subjectRef], evidence: {'evidence.approval-record': [approvalRef]}, approval_ref: approvalRef, subject_ref: subjectRef, subject_digest: subjectDigest, approval_scope: ['feature.demo'], basis: [evidence], drafter_principal_ref: 'synthetic.drafter'};
  const a = {...c, gate, state, record, approvalRef, put, subjectRef, evidenceRef, decision, stateOverride: {}, withGate: (x) => {
    // 状态里的依据摘要在写出 checkpoint 时按当前文件字节计算，变异用例只改变它要测的那一项
    const digest = (ref) => decisionDigest(readFileSync(path.join(c.inst, ref))).slice(7);
    const gateState = structuredClone(state);
    gateState.basis = [{ref: evidenceRef, digest: digest(evidenceRef)}, {ref: subjectRef, digest: digest(subjectRef)}, {ref: approvalRef, digest: digest(approvalRef)}];
    return {...x, gates: {...x.gates, [gate]: Object.assign(gateState, a.state, {basis: gateState.basis})}};
  }};
  return a;
}
const approvedCases = {
  '批准有效': () => {},
  '审查人自签': (a) => { a.record.principal_ref = 'synthetic.drafter'; a.put('approval.json', a.record); },
  '会签角色不对': (a) => { a.record.role_id = 'role.test-engineer'; a.put('approval.json', a.record); },
  '主体被改动': (a) => { writeFileSync(path.join(a.inst, a.subjectRef), JSON.stringify({changed: true})); },
  '依据被改动': (a) => { writeFileSync(path.join(a.inst, a.evidenceRef), 'tampered'); },
  '状态范围与记录不同': (a) => { a.state.approval_scope = ['other.scope']; },
  '缺批准引用': (a) => { delete a.state.approval_ref; },
  '批准引用不存在': (a) => { a.state.approval_ref = 'none/approval.json'; },
};
for (const [name, mutate] of Object.entries(approvedCases)) {
  test(`checkpoint 回放（带批准门禁）：${name}`, {skip}, () => {
    const a = approvedGateCheckpoint();
    mutate(a);
    writeFileSync(path.join(a.inst, a.ref), JSON.stringify(a.withGate(a.base)));
    const node = spawnSync(process.execPath, [path.join(a.inst, 'scripts/verify-lifecycle-checkpoint'), a.ref], {cwd: a.inst, encoding: 'utf8'});
    const go = nativeLifecycleVerify({root: a.inst, file: a.ref});
    assert.equal(go.exitCode === 0, node.status === 0, `结论不一致：Node=${node.status} ${node.stderr.trim().slice(0, 160)} Go=${go.exitCode} ${go.message.slice(0, 160)}`);
    if (name === '批准有效') assert.equal(node.status, 0, `基线夹具本身必须通过：${node.stderr.trim().slice(0, 200)}`);
  });
}

// 旧实例（tracker 没有 lifecycle_tracking_version）的未跟踪 checkpoint：Node 不要求功能身份与跟踪，yss 必须与之一致。
const legacyCases = {
  '模板基线': (x) => x,
  'next=null': (x) => ({...x, next_work_unit: null}),
  'mode=audit': (x) => ({...x, mode: 'audit'}),
  '边界 handoff 缺依据': (x) => ({...x, phase_boundary: {decision: 'handoff'}}),
  '边界 handoff 有依据': (x) => ({...x, phase_boundary: {decision: 'handoff', reason: 't', source_ref: 'CONTEXT.md', destination_ref: 'AGENTS.md'}}),
  'status=completed 无验收': (x) => ({...x, status: 'completed', next_work_unit: null}),
  '下一工作单元未登记': (x) => ({...x, next_work_unit: 'work-unit.unknown'}),
};
for (const [name, mutate] of Object.entries(legacyCases)) {
  test(`checkpoint 回放（旧实例未启用追踪）：${name}`, {skip}, () => {
    site = 'instance';
    const inst = setup();
    const dir = `.work/replay-legacy-${++seq}`;
    mkdirSync(path.join(inst, dir), {recursive: true});
    const tracker = path.join(inst, '.template-spec/agents/issue-tracker.md');
    const original = readFileSync(tracker, 'utf8');
    writeFileSync(tracker, '---\ntracker: {platform: local-markdown, root: docs/.scratch}\n---\n');
    try {
      const template = parseYamlText(readFileSync(path.join(inst, '.template-spec/process/templates/lifecycle-checkpoint-template.yaml'), 'utf8'));
      const ref = `${dir}/checkpoint.json`;
      writeFileSync(path.join(inst, ref), JSON.stringify(mutate(structuredClone(template))));
      const node = spawnSync(process.execPath, [path.join(inst, 'scripts/verify-lifecycle-checkpoint'), ref], {cwd: inst, encoding: 'utf8'});
      const go = nativeLifecycleVerify({root: inst, file: ref});
      assert.equal(go.exitCode === 0, node.status === 0, `结论不一致：Node=${node.status} ${node.stderr.trim().slice(0, 160)} Go=${go.exitCode} ${go.message.slice(0, 160)}`);
    } finally { writeFileSync(tracker, original); }
  });
}

// 能力协商：yss 比这些脚本旧（没有对应能力令牌）时，进程内入口退回 Node 实现，命令行薄壳给出升级提示，而不是把 yss 的参数错误当成校验结论。
test('能力协商：旧 yss 不委托，薄壳提示升级；新 yss 放行', {skip}, () => {
  const stubDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-old-')));
  process.on('exit', () => rmSync(stubDir, {recursive: true, force: true}));
  const stub = path.join(stubDir, 'yss');
  writeFileSync(stub, '#!/bin/sh\necho \'{"outputVersion":1,"status":"ok","code":"OK","result":{"nodeDelegation":["user-decision.requirements-object.v1"]}}\'\n', {mode: 0o755});
  const env = {...process.env, YSS_NATIVE_BINARY: stub};
  assert.deepEqual(missingCapabilities(NEEDS.approval, env), NEEDS.approval);
  assert.deepEqual(missingCapabilities(['user-decision.requirements-object.v1'], env), []);
  assert.equal(nativeDelegationAvailable(REPO, {}, env, [], NEEDS.approval), false);
  assert.equal(nativeDelegationAvailable(REPO, {}, process.env, [], NEEDS.approval), true);
  const shell = spawnSync(path.join(REPO, 'scripts', 'verify-approval-record'), ['--history', 'x.json'], {encoding: 'utf8', env});
  assert.notEqual(shell.status, 0);
  assert.match(shell.stderr, /缺少能力.*升级 yss/);
});

// 战略交接包（handoff verify --kind package）：Node 导出的包，被篡改后 Node 的 openBundle 与 yss 的校验结论必须一致。
let designInstance;
function designRoot() {
  if (designInstance) return designInstance;
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-replay-design-')));
  process.on('exit', () => rmSync(base, {recursive: true, force: true}));
  const init = spawnSync(binary, ['init', '--profile', 'design', '--root', path.join(base, 'inst'), '--project-name', 'replay'], {encoding: 'utf8'});
  assert.equal(init.status, 0, init.stderr || init.stdout);
  return (designInstance = path.join(base, 'inst'));
}
const listFiles = (dir, rel = '') => readdirSync(path.join(dir, rel), {withFileTypes: true}).flatMap((e) => e.isDirectory() ? listFiles(dir, path.join(rel, e.name)) : [path.join(rel, e.name)]);
const handoffVariants = {
  '原包': () => {},
  '载荷文件被改一个字节': (dir) => { const f = listFiles(dir).find((x) => x.startsWith('payload/files/')); appendFileSync(path.join(dir, f), ' '); },
  '清单列出的文件被删': (dir) => { unlinkSync(path.join(dir, listFiles(dir).find((x) => x.startsWith('payload/files/')))); },
  '包里多出清单没有的文件': (dir) => { writeFileSync(path.join(dir, 'payload/files/extra.md'), '额外文件'); },
  '清单 bundle_digest 被改': (dir) => { const m = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')); m.bundle_digest = `sha256:${'0'.repeat(64)}`; writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2)); },
  '清单版本被改但摘要未更新': (dir) => { const m = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')); m.version = 'v9'; writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2)); },
  '索引文件被改': (dir) => { appendFileSync(path.join(dir, 'indexes/rules.json'), ' '); },
  '缺清单': (dir) => { unlinkSync(path.join(dir, 'manifest.json')); },
};
for (const [name, mutate] of Object.entries(handoffVariants)) {
  test(`交接包回放：${name}`, {skip}, async () => {
    const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-handoff-replay-')));
    try {
      const source = path.join(base, 'source');
      mkdirSync(source);
      await handoffFixture(source);
      const out = path.join(base, 'package');
      await exportBundle({sourceRoot: source, handoffRef: 'handoff.yaml', output: out});
      mutate(out);
      let node;
      try { await openBundle(out, (b) => b.manifest.bundle_digest); node = {ok: true}; } catch (error) { node = {ok: false, message: String(error.message).slice(0, 120)}; }
      const inst = designRoot();
      const rel = `.work/replay-handoff-${++seq}`;
      mkdirSync(path.join(inst, '.work'), {recursive: true});
      cpSync(out, path.join(inst, rel), {recursive: true});
      const go = nativeEvidenceVerify({root: inst, kind: 'package', file: rel, group: 'handoff', extra: []});
      assert.equal(go.exitCode === 0, node.ok, `结论不一致：Node=${JSON.stringify(node)} Go=${go.exitCode} ${go.message.slice(0, 160)}`);
    } finally { rmSync(base, {recursive: true, force: true}); }
  });
}

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
  const f = await handoffFixture(source);
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
for (const [name, spec] of Object.entries(consumptionCases)) {
  test(`交接消费回放：${name}`, {skip}, async () => {
    const {target, tactical} = await consumptionCase();
    spec.mutate(tactical);
    let node;
    try { node = {report: await verifyConsumption(tactical, {root: target, ...(spec.slice ? {sliceRef: spec.slice} : {})})}; } catch (error) { node = {error: String(error.message).slice(0, 100)}; }
    writeFileSync(path.join(target, 'tactical.json'), JSON.stringify(tactical));
    const go = nativeEvidenceVerify({root: target, kind: 'consumption', file: 'tactical.json', group: 'handoff', extra: [...(spec.slice ? ['--slice', spec.slice] : [])]});
    const report = go.envelope.result?.coverage?.handoff_consumption;
    if (node.error) { assert.notEqual(go.exitCode, 0, `Node 拒绝（${node.error}）而 yss 通过`); return; }
    assert.ok(report, `yss 没有返回报告：${go.message}`);
    assert.deepEqual(sortKeys(report), sortKeys(node.report));
    assert.equal(go.exitCode === 0, node.report.result === 'verified');
  });
}

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

// 进程内入口 verifyConsumption 委托给 yss 后，报告与进程内实现一致（native:false 为进程内）。
for (const [name, spec] of Object.entries({'整体消费通过': consumptionCases['整体消费通过'], '延期阻断依赖切片': consumptionCases['延期阻断依赖切片'], '延期不阻断无关切片': consumptionCases['延期不阻断无关切片'], '缺少承接行': consumptionCases['缺少承接行']})) {
  test(`适配层等价（verifyConsumption）：${name}`, {skip}, async () => {
    const {target, tactical} = await consumptionCase();
    spec.mutate(tactical);
    const options = {root: target, ...(spec.slice ? {sliceRef: spec.slice} : {})};
    const inProcess = await verifyConsumption(tactical, {...options, native: false});
    const delegated = await verifyConsumption(tactical, options);
    assert.deepEqual(sortKeys(delegated), sortKeys(inProcess));
  });
}

// Context 对账记录（evidence verify --kind context-reconciliation）：Node 的 verifyContextReconciliation 与 yss 结论一致。
const reconciliationBase = (snapshot) => ({schema_version: 1, repository_mode: 'project-instance', stage: 'stage.system-data-engineering', work_unit: 'work-unit.technical-analysis', status: 'reconciled', context_snapshot: snapshot, changes: {added: ['Global/Supplier'], updated: [], deprecated: []}, unresolved_terms: [], evidence_refs: ['CONTEXT.md']});
const reconciliationVariants = {
  '已对账': (r) => r,
  '状态 blocked 且有未解决术语': (r) => ({...r, status: 'blocked', unresolved_terms: [{term: 'Supplier', reason: '冲突', owner: '需求负责人', next_action: '回交战略方'}]}),
  'project-instance 但状态 pending': (r) => ({...r, status: 'pending'}),
  'reconciled 却有未解决术语': (r) => ({...r, unresolved_terms: [{term: 'Supplier', reason: '冲突', owner: '需求负责人', next_action: '回交战略方'}]}),
  '变更了不存在的术语': (r) => ({...r, changes: {added: ['Global/Ghost'], updated: [], deprecated: []}}),
  '同一术语跨分类重复': (r) => ({...r, changes: {added: ['Global/Supplier'], updated: ['Global/Supplier'], deprecated: []}}),
  '证据文件不存在': (r) => ({...r, evidence_refs: ['missing-evidence.md']}),
  '快照摘要不一致': (r) => ({...r, context_snapshot: {...r.context_snapshot, document_digest: `sha256:${'2'.repeat(64)}`}}),
  '仓库身份矛盾': (r) => ({...r, repository_mode: 'template-source'}),
  '缺少必填字段': (r) => { const x = {...r}; delete x.work_unit; return x; },
};
for (const [name, mutate] of Object.entries(reconciliationVariants)) {
  test(`Context 对账回放：${name}`, {skip}, async () => {
    const {target, snapshot} = await consumptionCase();
    const ref = `reconciliation-variant-${++seq}.json`;
    writeFileSync(path.join(target, ref), JSON.stringify(mutate(structuredClone(reconciliationBase(snapshot)))));
    let node;
    try { verifyContextReconciliation(path.join(target, ref), {root: target}); node = {ok: true}; } catch (error) { node = {ok: false, message: String(error.message).slice(0, 100)}; }
    const go = nativeEvidenceVerify({root: target, kind: 'context-reconciliation', file: ref});
    assert.equal(go.exitCode === 0, node.ok, `结论不一致：Node=${JSON.stringify(node)} Go=${go.exitCode} ${go.message.slice(0, 160)}`);
    if (name === '已对账') assert.equal(node.ok, true, `基线必须通过：${node.message}`);
    else assert.doesNotMatch(String(node.message), /ENOENT/, '拒绝原因不能是找不到记录文件');
  });
}
