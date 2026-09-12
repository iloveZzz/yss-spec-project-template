import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pilot = '/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm';
const root = path.join(pilot, 'strategy-governance');
const session = '/Users/zhudaoming/.codex/sessions/2026/09/12/rollout-2026-09-12T02-01-08-01a091a1-62fa-7df0-a615-fae2815d4a7a.jsonl';
const thread = '01a091a1-62fa-7df0-a615-fae2815d4a7a';
const principal = `codex://threads/${thread}#requester`;
const presentationId = 'msg_004f4532db4c0e56016aa4b03b0ff087d0a33d1e519982ba75';
const responseId = 'msg_01a0942d-c40a-7852-ac02-c50cc23fd313';
const oldSnapshotRef = 'docs/.scratch/target-preview-existing-ui/handoff-draft/current-request-snapshot.json';
const sourceRef = 'docs/.scratch/target-preview-existing-ui/decisions/current-assets-source-02.json';
const decisionRef = 'docs/.scratch/target-preview-existing-ui/decisions/current-assets.json';
const verificationRef = 'docs/.scratch/target-preview-existing-ui/decisions/current-assets-verification.json';

const records = fs.readFileSync(session, 'utf8').trim().split('\n').map((line, index) => ({ ...JSON.parse(line), source_line: index + 1 }));
const messages = records.filter((record) => record.type === 'response_item' && record.payload?.type === 'message' && ['assistant', 'user'].includes(record.payload.role)).map((record) => ({
  id: record.payload.id,
  original_ref: `codex://threads/${thread}#${record.payload.id}`,
  principal_ref: record.payload.role === 'user' ? principal : `codex://threads/${thread}#assistant`,
  actor_kind: record.payload.role === 'user' ? 'biological-human' : 'digital-human',
  sent_at: record.timestamp,
  text: record.payload.content.filter((item) => ['input_text', 'output_text'].includes(item.type)).map((item) => item.text).join('\n'),
  source_line: record.source_line,
}));
const presentation = messages.find((message) => message.id === presentationId);
const response = messages.find((message) => message.id === responseId);
if (!presentation || !response) throw new Error('当前四项展示或真实回复缺失');
if (!presentation.text.includes('是否确认以上全部 4 项更新后的当前资产')) throw new Error('展示没有明确询问全部 4 项');
if (response.text.trim() !== '确认') throw new Error('真实回复不是“确认”');
if (Date.parse(response.sent_at) < Date.parse(presentation.sent_at)) throw new Error('真实回复早于展示');
const between = messages.filter((message) => message.source_line > presentation.source_line && message.source_line < response.source_line);
if (between.some((message) => !message.text.trim().startsWith('<environment_context>'))) throw new Error('展示与确认之间存在其他对话决定');

const { decisionDigest, requestDigest, validateUserDecision } = await import(pathToFileURL(path.join(root, 'scripts/lib/user-decision.mjs')));
const oldSnapshot = JSON.parse(fs.readFileSync(path.join(root, oldSnapshotRef), 'utf8'));
const baseItems = new Map(oldSnapshot.request.items.map((item) => [item.id, item]));
const definitions = [
  ['domain', 'Domain Strategy', 'sha256:8650c1ab5879e19ce3d822b15cfbce52d9daa40a3b8ade67b4c4b36d4c509397', '两个已实际验证场景改为'],
  ['stage', 'Stage Decision', 'sha256:4410bf0fc948ac376b7aaee0c659d2b20f4d4f07baf7a0189fc91540b830dbf1', '重新绑定上述 Domain Strategy；阶段范围未改变。'],
  ['plan', 'Plan Entry Review', 'sha256:dcbc66b0f1dd306907fe51790fc4feeba0108cca4c83418f5928e5c3e6d40d14', '仅更新受影响的依据摘要。'],
  ['delivery', 'Delivery Scope', 'sha256:bb017bd01c353c87494944350f074cdc97434d7a10c0c88a399d702c83d069de', '重新绑定派生交接内容和上述来源。'],
];
const items = definitions.map(([id, title, digest, changes]) => {
  const base = baseItems.get(id);
  if (!base) throw new Error(`旧固定请求缺少事项: ${id}`);
  return {
    ...base,
    title,
    subject: { ...base.subject, version: '当前', digest },
    changes,
    risks: ['该确认不包含 Git 提交、推送、npm 发布或生产发布。'],
    recommendation: '确认后我将继续正式批准和导出 Handoff，并完成真实 S0–S6/O1。',
    next_actions: ['正式批准和导出 Handoff', '完成真实 S0–S6/O1'],
  };
});
const request = {
  id: 'current-assets-20260912-strategy-rebind-02',
  requester_ref: oldSnapshot.request.requester_ref,
  requester_source: oldSnapshot.request.requester_source,
  items,
};
const snapshot = {
  state: 'captured-approved',
  request,
  request_digest: requestDigest(request),
  note: '当前四项资产在场景状态机械修正后重新展示，并由提问者真实确认。旧决定保留在 history。',
};
const sourceDocument = { source_kind: 'session-export', messages: [presentation, response] };
fs.mkdirSync(path.dirname(path.join(root, sourceRef)), { recursive: true });
fs.writeFileSync(path.join(root, sourceRef), `${JSON.stringify(sourceDocument, null, 2)}\n`);
const sourceBinding = (message) => ({
  kind: 'session-export',
  ref: sourceRef,
  digest: decisionDigest(fs.readFileSync(path.join(root, sourceRef))),
  message_id: message.id,
});
request.presented_source = sourceBinding(presentation);
const decision = {
  schema_version: 1,
  kind: 'user-decision',
  request,
  responses: [{
    source: sourceBinding(response),
    principal_ref: principal,
    responded_at: response.sent_at,
    text: response.text,
    request_digest: requestDigest(request),
    selection: 'explicit-all',
    item_ids: items.map((item) => item.id),
    decision: 'approved',
    approved_scope: [...new Set(items.flatMap((item) => item.scope))],
  }],
};
const expected = items.map((item) => ({ boundary: item.boundary, subject_ref: item.subject.ref, scope: item.scope }));
const presentedFields = items.flatMap((item) => [item.title, item.subject.ref, item.subject.version, item.changes, item.recommendation, ...item.scope, ...item.risks, ...item.next_actions, ...item.basis.flatMap((asset) => [asset.ref, asset.version])]);
const missingPresentedFields = [...new Set(presentedFields.filter((field) => !presentation.text.includes(field)))];
if (missingPresentedFields.length) throw new Error(`展示缺少字段: ${JSON.stringify(missingPresentedFields)}`);
const verified = validateUserDecision(decision, { root, expected });

const historyDir = path.join(root, 'docs/.scratch/target-preview-existing-ui/decisions/history');
fs.mkdirSync(historyDir, { recursive: true });
for (const [ref, name] of [[decisionRef, 'current-assets-before-scenario-rebind.json'], [verificationRef, 'current-assets-verification-before-scenario-rebind.json']]) {
  const from = path.join(root, ref);
  const to = path.join(historyDir, name);
  if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
}
fs.writeFileSync(path.join(root, oldSnapshotRef), `${JSON.stringify(snapshot, null, 2)}\n`);
fs.writeFileSync(path.join(root, decisionRef), `${JSON.stringify(decision, null, 2)}\n`);
fs.writeFileSync(path.join(root, verificationRef), `${JSON.stringify({
  result: 'verified-current-human-confirmation',
  original_session: session,
  source_lines: [presentation.source_line, response.source_line],
  ignored_intervening_context_lines: between.map((message) => message.source_line),
  request_digest: requestDigest(request),
  verified,
}, null, 2)}\n`);

console.log(JSON.stringify({ result: 'verified-current-human-confirmation', request_digest: requestDigest(request), source_lines: [presentation.source_line, response.source_line], verified }, null, 2));
