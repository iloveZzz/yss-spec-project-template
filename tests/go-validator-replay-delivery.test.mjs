// AR-12 backend/frontend 域的等价回放（FR-011）：同一份真实 Backend 实例夹具同时交给 Node 校验与固定版本 yss，结论必须一致。
// 夹具构建较慢（约 40 秒，含 git 与交付包），所以独立成文件，只在相关路径变化时选中。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {nativeContractVerify, nativeEvidenceVerify} from '../scripts/lib/native-evidence.mjs';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {makeRoot} from './helpers/yss-instance.mjs';
import {backendProfileTerminalFixture} from '../scripts/fixtures/backend-delivery/backend-profile-terminal-fixture.mjs';

let binary;
try { binary = contextBinary().binary; } catch { binary = null; }
const skip = binary ? false : '需要固定版本的 yss（YSS_NATIVE_BINARY）';

// 后端终点（contract verify --kind backend-delivery-terminal）与后端交付包（handoff verify --kind backend-delivery）：
// 夹具根自己携带的 Node 实现（真实 Backend 实例的脚本）与 yss 对拍。
test('后端交付回放（终点与交付包）：通过与反例结论一致', {skip}, async (t) => {
  const seed = makeRoot('yss-backend-seed-', 'backend');
  const f = await backendProfileTerminalFixture({nativeSeed: seed});
  t.after(() => f.cleanup());
  const verify = () => f.terminalModule.verifyBackendDeliveryTerminal(f.root, {checkpointRef: f.checkpointRef});
  const nodeVerdict = async () => { try { return {ok: true, value: await verify()}; } catch (error) { return {ok: false, message: String(error.message).slice(0, 120)}; } };
  const goVerdict = () => nativeContractVerify({root: f.root, kind: 'backend-delivery-terminal', file: f.checkpointRef, extra: ['--checkpoint', f.checkpointRef]});
  const before = fs.readFileSync(path.join(f.root, f.checkpointRef));
  const checkpoint = JSON.parse(before);
  const restore = (...entries) => { fs.writeFileSync(path.join(f.root, f.checkpointRef), before); for (const [ref, bytes] of entries) fs.writeFileSync(path.join(f.root, ref), bytes); };
  const compare = async (name, expectOk) => {
    const node = await nodeVerdict(), go = goVerdict();
    assert.equal(node.ok, expectOk, `${name}：Node 结论与预期不符 ${JSON.stringify(node)}`);
    assert.equal(go.exitCode === 0, expectOk, `${name}：yss 结论与预期不符 ${go.exitCode} ${go.message.slice(0, 200)}`);
    return {node, go};
  };

  await t.test('当前终点通过，结果字段与 Node 一致', async () => {
    const {node, go} = await compare('通过', true);
    const coverage = go.envelope.result.coverage;
    assert.deepEqual(Object.fromEntries(Object.entries(coverage).sort()), Object.fromEntries(Object.entries(node.value).sort()));
  });

  const changes = {
    '缺少 check.design-reviewed': (next) => { delete next.checks['check.design-reviewed']; },
    '终点 Slice 不属于当前 checkpoint': (next) => { next.human_review.implementation.slice_contract_ref = 'other-slice.yaml'; },
    'checkpoint 属于别的 Profile': (next) => { next.profile_id = 'harness.frontend-delivery'; },
  };
  for (const [name, mutate] of Object.entries(changes)) {
    await t.test(name, async () => {
      const next = structuredClone(checkpoint); mutate(next); f.write(f.checkpointRef, next);
      try { await compare(name, false); } finally { restore(); }
    });
  }

  await t.test('缺少实际契约验证报告', async () => {
    const ref = f.delivery.verification.contract.ref, bytes = fs.readFileSync(path.join(f.root, ref));
    fs.rmSync(path.join(f.root, ref));
    try { await compare('缺报告', false); } finally { restore([ref, bytes]); }
  });

  await t.test('终点缺少下游接收责任', async () => {
    const ref = f.terminalRef, bytes = fs.readFileSync(path.join(f.root, ref));
    const record = JSON.parse(bytes); delete record.downstream.owner;
    fs.writeFileSync(path.join(f.root, ref), JSON.stringify(record));
    try { await compare('缺下游', false); } finally { restore([ref, bytes]); }
  });

  await t.test('独立审查状态原始字节变化', async () => {
    const ref = f.terminal.review_state.ref, bytes = fs.readFileSync(path.join(f.root, ref));
    fs.writeFileSync(path.join(f.root, ref), Buffer.concat([bytes, Buffer.from('\n')]));
    try { await compare('审查状态变化', false); } finally { restore([ref, bytes]); }
  });

  await t.test('交付记录原始字节变化', async () => {
    const ref = f.terminal.delivery.ref, bytes = fs.readFileSync(path.join(f.root, ref));
    fs.writeFileSync(path.join(f.root, ref), Buffer.concat([bytes, Buffer.from('\n')]));
    try { await compare('交付记录变化', false); } finally { restore([ref, bytes]); }
  });

  await t.test('Fresh Verification 报告没有类型', async () => {
    f.write('untyped-fresh.json', {status: 'passed', reason: 'A status is not actual execution evidence.'});
    const gate = checkpoint.gates['gate.fresh-verification-passed'];
    const subjectBytes = fs.readFileSync(path.join(f.root, gate.subject_ref)), approvalBytes = fs.readFileSync(path.join(f.root, gate.approval_ref));
    const subject = JSON.parse(subjectBytes), approval = JSON.parse(approvalBytes), unknown = {ref: 'untyped-fresh.json', digest: f.file('untyped-fresh.json').digest.slice(7)};
    subject.basis.push(unknown); f.write(gate.subject_ref, subject);
    approval.basis = subject.basis; approval.subject_digest = f.file(gate.subject_ref).digest.slice(7); f.write(gate.approval_ref, approval);
    const next = structuredClone(checkpoint), nextGate = next.gates['gate.fresh-verification-passed'];
    nextGate.subject_digest = approval.subject_digest;
    nextGate.basis = [...subject.basis, {ref: nextGate.subject_ref, digest: approval.subject_digest}, {ref: nextGate.approval_ref, digest: f.file(nextGate.approval_ref).digest.slice(7)}];
    nextGate.evidence['evidence.fresh-verification'] = ['untyped-fresh.json'];
    f.write(f.checkpointRef, next);
    try { await compare('无类型 Fresh', false); } finally { restore([gate.subject_ref, subjectBytes], [gate.approval_ref, approvalBytes]); }
  });

  await t.test('还原后重新通过', async () => { await compare('还原', true); });

  // 薄壳冒烟：complete-backend-delivery verify 只调用 yss，结果与 Node 实现同形，失败退出码透传。
  const shell = (...args) => spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../scripts/complete-backend-delivery'), 'verify', '--root', f.root, ...args], {encoding: 'utf8', env: process.env});
  await t.test('薄壳：通过时输出与 Node 同形的 JSON，退出码 0', async () => {
    const run = shell('--checkpoint', f.checkpointRef);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(run.stdout), await verify());
    assert.deepEqual(Object.keys(JSON.parse(run.stdout)).slice(0, 4), ['result', 'delivery_id', 'version', 'next_work_unit']);
  });
  await t.test('薄壳：被拒绝时 stderr 为 blocked JSON，退出码非 0', async () => {
    const next = structuredClone(checkpoint); delete next.checks['check.design-reviewed']; f.write(f.checkpointRef, next);
    try {
      const run = shell('--checkpoint', f.checkpointRef);
      assert.notEqual(run.status, 0);
      assert.equal(JSON.parse(run.stderr).result, 'blocked');
      assert.equal(run.stdout, '');
    } finally { restore(); }
  });

  // Slice 执行前检查（contract verify --kind slice-preflight）：实例自带的 inspectSliceContract 与 yss 的报告逐字段一致（结构、批准、新鲜度三层）。
  const preflightModule = await import(pathToFileURL(path.join(f.root, 'scripts/lib/slice-execution-preflight.mjs')));
  const sliceRef = f.binding.ref, sliceApproval = f.binding.approval_ref;
  const nodePreflight = (ref = sliceRef, approval = sliceApproval) => { try { return {report: preflightModule.inspectSliceContract(ref, {root: f.root, ...(approval ? {approval_ref: approval} : {})}).report}; } catch (error) { return {error: String(error.message).slice(0, 120)}; } };
  const goPreflight = (ref = sliceRef, approval = sliceApproval) => { const run = nativeContractVerify({root: f.root, kind: 'slice-preflight', file: ref, extra: approval ? ['--approval-ref', approval] : []}); return {run, report: run.envelope.result?.coverage?.slice_preflight}; };
  const sortKeys = (value) => Array.isArray(value) ? value.map(sortKeys) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort().map(([k, v]) => [k, sortKeys(v)])) : value;
  const comparePreflight = (name, {sameBlockers = true} = {}) => {
    const node = nodePreflight(), go = goPreflight();
    assert.ok(node.report && go.report, `${name}：两边都应给出报告 Node=${JSON.stringify(node)} Go=${go.run.message}`);
    assert.equal(go.run.exitCode === 0, node.report.blockers.length === 0, `${name}：退出结论不一致`);
    if (sameBlockers) assert.deepEqual(sortKeys(go.report), sortKeys(node.report));
    else { assert.deepEqual(sortKeys({...go.report, blockers: 0}), sortKeys({...node.report, blockers: 0})); assert.ok(go.report.blockers.length > 0 && node.report.blockers.length > 0); }
    return {node, go};
  };
  await t.test('Slice 执行前检查：当前批准的 Slice 报告一致且允许执行', () => { const {node} = comparePreflight('通过'); assert.equal(node.report.execution_allowed, true); });
  await t.test('Slice 执行前检查：不给批准引用时只报告可读性与结构', () => {
    const node = nodePreflight(sliceRef, null), go = goPreflight(sliceRef, null);
    assert.deepEqual(sortKeys(go.report), sortKeys(node.report)); assert.equal(go.report.execution_allowed, false); assert.equal(go.run.exitCode, 0);
  });
  const touch = (ref, edit) => { const file = path.join(f.root, ref), bytes = fs.readFileSync(file); edit(file); return () => fs.writeFileSync(file, bytes); };
  await t.test('Slice 执行前检查：Skill 注册表内容变化属于批准层阻断', () => { const undo = touch('.template-spec/agents/yss-skill-registry.yaml', (file) => fs.appendFileSync(file, '\nzz_extra: 1\n')); try { comparePreflight('注册表变化'); } finally { undo(); } });
  await t.test('Slice 执行前检查：Compiler 合同内容变化属于批准层阻断', () => { const undo = touch('.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml', (file) => fs.appendFileSync(file, '\nzz_extra: 1\n')); try { comparePreflight('Compiler 变化'); } finally { undo(); } });
  await t.test('Slice 执行前检查：Slice 原始字节变化，批准失效（原因码按各自实现命名，只比较结论）', () => { const undo = touch(sliceRef, (file) => fs.appendFileSync(file, '\n# x\n')); try { const {node} = comparePreflight('字节变化', {sameBlockers: false}); assert.equal(node.report.checks.approval, 'failed'); } finally { undo(); } });
  await t.test('Slice 执行前检查：批准引用不存在', () => { const node = nodePreflight(sliceRef, 'no-such.json'), go = goPreflight(sliceRef, 'no-such.json'); assert.equal(node.report.checks.approval, 'failed'); assert.equal(go.report.checks.approval, 'failed'); assert.equal(go.report.execution_allowed, false); assert.notEqual(go.run.exitCode, 0); });
  await t.test('Slice 执行前检查：上游技术设计原始字节变化，合同无法读取', () => { const undo = touch('technical-design.json', (file) => fs.appendFileSync(file, '\n \n')); try { assert.ok(nodePreflight().error); const go = goPreflight(); assert.notEqual(go.run.exitCode, 0); assert.equal(go.report, undefined); } finally { undo(); } });

  await t.test('薄壳：slice-contract verify 只调用 yss，报告与 Node 同形（含键序），有阻断时退出码非 0', () => {
    const shell = (...args) => spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../scripts/slice-contract'), 'verify', '--root', f.root, sliceRef, ...args], {encoding: 'utf8', env: process.env});
    const ok = shell('--approval-ref', sliceApproval);
    assert.equal(ok.status, 0, ok.stderr);
    assert.deepEqual(JSON.parse(ok.stdout), nodePreflight().report);
    assert.equal(ok.stdout, `${JSON.stringify(nodePreflight().report, null, 2)}\n`);
    const undo = touch(sliceRef, (file) => fs.appendFileSync(file, '\n# x\n'));
    try { const blocked = shell('--approval-ref', sliceApproval); assert.notEqual(blocked.status, 0); assert.equal(JSON.parse(blocked.stdout).execution_allowed, false); } finally { undo(); }
  });

  // 后端交付包（handoff verify --kind backend-delivery）：实例自带的 openBackendDelivery 与 yss 对同一个包的结论一致。
  const producer = await import(pathToFileURL(path.join(f.root, 'scripts/lib/backend-delivery.mjs')));
  const nodePackage = async (input) => { try { return {ok: true, value: await producer.openBackendDelivery(input, (b) => ({result: 'verified', delivery_id: b.delivery.delivery_id, version: b.delivery.version, bundle_digest: b.manifest.bundle_digest, live_service_checked: false}))}; } catch (error) { return {ok: false, message: String(error.message).slice(0, 120)}; } };
  const goPackage = (input) => nativeEvidenceVerify({root: f.root, kind: 'backend-delivery', file: input, group: 'handoff'});
  const packageRef = f.terminal.bundle_ref;
  let variant = 0;
  const copyPackage = () => { const ref = `.work/package-variants/p${++variant}`; fs.mkdirSync(path.join(f.root, path.dirname(ref)), {recursive: true}); fs.cpSync(path.join(f.root, packageRef), path.join(f.root, ref), {recursive: true}); return ref; };
  const comparePackage = async (name, ref, expectOk) => {
    const node = await nodePackage(path.join(f.root, ref)), go = goPackage(ref);
    assert.equal(node.ok, expectOk, `${name}：Node 结论与预期不符 ${JSON.stringify(node)}`);
    assert.equal(go.exitCode === 0, expectOk, `${name}：yss 结论与预期不符 ${go.exitCode} ${go.message.slice(0, 200)}`);
    return {node, go};
  };
  await t.test('交付包目录通过，coverage 与 Node 一致', async () => {
    const {node, go} = await comparePackage('原包', packageRef, true);
    assert.deepEqual(go.envelope.result.coverage, node.value);
  });
  await t.test('交付包 ZIP 通过', async () => {
    const out = '.work/package-variants/zip-source';
    await producer.exportBackendDelivery({sourceRoot: f.root, deliveryRef: 'profile-delivery.json', output: path.join(f.root, out), zip: true});
    await comparePackage('ZIP', `${out}.zip`, true);
  });
  const manifestOf = (ref) => JSON.parse(fs.readFileSync(path.join(f.root, ref, 'manifest.json'), 'utf8'));
  const packageChanges = {
    '载荷文件被改一个字节': (ref) => { const file = manifestOf(ref).files[0].path; fs.appendFileSync(path.join(f.root, ref, file), '\n'); },
    '清单列出的文件被删': (ref) => { fs.rmSync(path.join(f.root, ref, manifestOf(ref).files[0].path)); },
    '包里多出清单没有的文件': (ref) => { fs.writeFileSync(path.join(f.root, ref, 'extra.txt'), 'x'); },
    '清单 bundle_digest 被改': (ref) => { const m = manifestOf(ref); m.bundle_digest = `sha256:${'0'.repeat(64)}`; fs.writeFileSync(path.join(f.root, ref, 'manifest.json'), JSON.stringify(m, null, 2)); },
    '清单版本被改但摘要未更新': (ref) => { const m = manifestOf(ref); m.version = 'v9'; fs.writeFileSync(path.join(f.root, ref, 'manifest.json'), JSON.stringify(m, null, 2)); },
    '缺清单': (ref) => { fs.rmSync(path.join(f.root, ref, 'manifest.json')); },
  };
  for (const [name, mutate] of Object.entries(packageChanges)) {
    await t.test(`交付包：${name}`, async () => { const ref = copyPackage(); mutate(ref); await comparePackage(name, ref, false); });
  }
  await t.test('薄壳：backend-delivery verify 只调用 yss', async () => {
    const run = spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../scripts/backend-delivery'), 'verify', '--bundle', path.join(f.root, packageRef)], {encoding: 'utf8', env: process.env});
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(run.stdout), (await nodePackage(path.join(f.root, packageRef))).value);
    const bad = copyPackage(); packageChanges['载荷文件被改一个字节'](bad);
    const rejected = spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../scripts/backend-delivery'), 'verify', '--bundle', path.join(f.root, bad)], {encoding: 'utf8', env: process.env});
    assert.notEqual(rejected.status, 0);
    assert.equal(JSON.parse(rejected.stderr).result, 'blocked');
  });
});
