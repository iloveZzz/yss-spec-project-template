// 唯一实现的最低测试（FR-011）：同一批合成夹具同时交给 Node 校验与固定版本 yss，结论（通过/拒绝及拒绝码）必须一致。
// 夹具在测试里现场构建，改动夹具里的判定输入，回放就应当失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {nativeEvidenceVerify, nativeContractVerify, nativeDelegationAvailable, rootBoundRead} from '../scripts/lib/native-evidence.mjs';
import {generateTaskPackageDefaults, validateTaskPackage} from '../scripts/lib/task-package.mjs';
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
