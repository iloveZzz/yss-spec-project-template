import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pilot = '/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm';
const root = path.join(pilot, 'strategy-governance');
const session = '/Users/zhudaoming/.codex/sessions/2026/09/12/rollout-2026-09-12T02-01-08-01a091a1-62fa-7df0-a615-fae2815d4a7a.jsonl';
const thread = '01a091a1-62fa-7df0-a615-fae2815d4a7a';
const principal = `codex://threads/${thread}#requester`;
const presentationId = 'msg_004f4532db4c0e56016aa4ee35bf8087d0bcc349992ed7afee';
const responseId = 'msg_01a09444-c26e-7e92-85ca-b0c7e28b367f';
const preparedSnapshotRef = 'docs/.scratch/target-preview-existing-ui/handoff-draft/current-request-snapshot-03.json';
const currentSnapshotRef = 'docs/.scratch/target-preview-existing-ui/handoff-draft/current-request-snapshot.json';
const sourceRef = 'docs/.scratch/target-preview-existing-ui/decisions/current-assets-source-03.json';
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
if (!presentation || !response) throw new Error('校验器生成的展示或真实回复缺失');
if (!presentation.text.includes('是否确认以上全部 4 项')) throw new Error('展示没有明确询问全部 4 项');
if (response.text.trim() !== '确认') throw new Error('真实回复不是“确认”');
const between = messages.filter((message) => message.source_line > presentation.source_line && message.source_line < response.source_line);
if (between.length) throw new Error('最终展示与确认之间存在其他消息');

const { decisionDigest, requestDigest, validateUserDecision } = await import(pathToFileURL(path.join(root, 'scripts/lib/user-decision.mjs')));
const prepared = JSON.parse(fs.readFileSync(path.join(root, preparedSnapshotRef), 'utf8'));
if (requestDigest(prepared.request) !== prepared.request_digest) throw new Error('准备请求摘要漂移');
const sourceDocument = { source_kind: 'session-export', messages: [presentation, response] };
fs.mkdirSync(path.dirname(path.join(root, sourceRef)), { recursive: true });
fs.writeFileSync(path.join(root, sourceRef), `${JSON.stringify(sourceDocument, null, 2)}\n`);
const sourceDigest = decisionDigest(fs.readFileSync(path.join(root, sourceRef)));
const sourceBinding = (message) => ({ kind: 'session-export', ref: sourceRef, digest: sourceDigest, message_id: message.id });
const request = { ...prepared.request, presented_source: sourceBinding(presentation) };
const items = request.items;
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
const verified = validateUserDecision(decision, { root, expected });

const historyDir = path.join(root, 'docs/.scratch/target-preview-existing-ui/decisions/history');
fs.mkdirSync(historyDir, { recursive: true });
for (const [ref, name] of [[decisionRef, 'current-assets-before-scenario-rebind.json'], [verificationRef, 'current-assets-verification-before-scenario-rebind.json']]) {
  const from = path.join(root, ref);
  const to = path.join(historyDir, name);
  if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
}
const capturedSnapshot = { ...prepared, state: 'captured-approved', request, note: '校验器生成的四项请求经提问者真实确认；旧决定保留在 decisions/history。' };
fs.writeFileSync(path.join(root, currentSnapshotRef), `${JSON.stringify(capturedSnapshot, null, 2)}\n`);
fs.writeFileSync(path.join(root, decisionRef), `${JSON.stringify(decision, null, 2)}\n`);
fs.writeFileSync(path.join(root, verificationRef), `${JSON.stringify({
  result: 'verified-current-human-confirmation',
  original_session: session,
  source_lines: [presentation.source_line, response.source_line],
  request_digest: requestDigest(request),
  verified,
}, null, 2)}\n`);

console.log(JSON.stringify({ result: 'verified-current-human-confirmation', request_digest: requestDigest(request), source_lines: [presentation.source_line, response.source_line], verified }, null, 2));
