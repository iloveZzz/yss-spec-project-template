// 唯一实现的最低测试（FR-011）：同一批合成夹具同时交给 Node 校验与固定版本 yss，结论（通过/拒绝及拒绝码）必须一致。
// 夹具在测试里现场构建，改动夹具里的判定输入，回放就应当失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {nativeEvidenceVerify} from '../scripts/lib/native-evidence.mjs';
import {buildDecisionFixture} from '../scripts/lib/testing/user-decision-fixture.mjs';
import {validateUserDecision, assertUserDecisionRequirement} from '../scripts/lib/user-decision.mjs';
import {validateApprovalRecord, approvalExpectationFromSubject} from '../scripts/lib/approval-record.mjs';
import {decisionDigest} from '../scripts/lib/user-decision-core.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareReviewPackage} from '../scripts/lib/review-package.mjs';
import {approvalExpectedFromTask} from '../scripts/lib/review-capabilities.mjs';
import {loadRegistry} from '../scripts/lib/lifecycle-registry.mjs';
import {loadDigitalHumanRoles} from '../scripts/lib/digital-human-roles.mjs';
import {parseDocument} from '../scripts/vendor/yaml.mjs';
import {validateApprovalRecordFile} from '../scripts/lib/approval-record.mjs';

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
      assert.equal(delegated.code, inProcess.code);
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
