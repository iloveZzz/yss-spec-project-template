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
import {validateUserDecision} from '../scripts/lib/user-decision.mjs';
import {validateApprovalRecord} from '../scripts/lib/approval-record.mjs';

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
