import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pilot = '/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm';
const session = '/Users/zhudaoming/.codex/sessions/2026/09/12/rollout-2026-09-12T02-01-08-01a091a1-62fa-7df0-a615-fae2815d4a7a.jsonl';
const thread = '01a091a1-62fa-7df0-a615-fae2815d4a7a';
const principal = `codex://threads/${thread}#requester`;
const requesterId = 'msg_01a091a9-04e3-7310-9a78-8e6fdcbf841d';
const presentationId = 'msg_004f4532db4c0e56016aa45cf28eac87d0b33e0af835360f5f';
const responseId = 'msg_01a09219-0bb5-7d13-9686-fa335112ef2e';

const records = fs.readFileSync(session, 'utf8').trim().split('\n').map((line, index) => ({ ...JSON.parse(line), source_line: index + 1 }));
const messages = records.filter((record) => record.type === 'response_item' && record.payload.type === 'message' && ['assistant', 'user'].includes(record.payload.role)).map((record) => ({
  id: record.payload.id,
  original_ref: `codex://threads/${thread}#${record.payload.id}`,
  principal_ref: record.payload.role === 'user' ? principal : `codex://threads/${thread}#assistant`,
  actor_kind: record.payload.role === 'user' ? 'biological-human' : 'digital-human',
  sent_at: record.timestamp,
  text: record.payload.content.filter((item) => ['input_text', 'output_text'].includes(item.type)).map((item) => item.text).join('\n'),
  source_line: record.source_line,
}));
const picked = [requesterId, presentationId, responseId].map((id) => messages.find((message) => message.id === id));
if (picked.some((message) => !message)) throw new Error('当前请求、完整展示或真实回复缺失');
const presentationPosition = messages.findIndex((message) => message.id === presentationId);
if (messages[presentationPosition + 1]?.id !== responseId || picked[2].text.trim() !== '确认') throw new Error('回复不是完整展示后的紧邻“确认”');
if (!picked[1].text.includes('是否确认以上全部 7 项')) throw new Error('完整展示没有明确询问全部 7 项');

for (const target of [
  {
    root: path.join(pilot, 'strategy-governance'),
    snapshot: 'docs/.scratch/target-preview-existing-ui/handoff-draft/current-request-snapshot.json',
    source: 'docs/.scratch/target-preview-existing-ui/decisions/current-assets-source.json',
    decision: 'docs/.scratch/target-preview-existing-ui/decisions/current-assets.json',
  },
  {
    root: path.join(pilot, 'backend-governance'),
    snapshot: 'docs/.scratch/target-preview-pilot/existing-v2/current-request-snapshot.json',
    source: 'docs/.scratch/target-preview-pilot/existing-v2/current-assets-source.json',
    decision: 'docs/.scratch/target-preview-pilot/existing-v2/current-assets.json',
  },
]) {
  const { decisionDigest, requestDigest, validateUserDecision } = await import(pathToFileURL(path.join(target.root, 'scripts/lib/user-decision.mjs')));
  const sourceDocument = { source_kind: 'session-export', messages: picked };
  fs.mkdirSync(path.dirname(path.join(target.root, target.source)), { recursive: true });
  fs.writeFileSync(path.join(target.root, target.source), `${JSON.stringify(sourceDocument, null, 2)}\n`);
  const sourceBinding = (message) => ({ kind: 'session-export', ref: target.source, digest: decisionDigest(fs.readFileSync(path.join(target.root, target.source))), message_id: message.id });
  const frozen = JSON.parse(fs.readFileSync(path.join(target.root, target.snapshot), 'utf8'));
  const request = structuredClone(frozen.request);
  request.presented_source = sourceBinding(picked[1]);
  if (requestDigest(request) !== frozen.request_digest) throw new Error(`${target.snapshot}: 固定请求摘要变化`);
  const itemIds = request.items.map((item) => item.id);
  const approvedScope = [...new Set(request.items.flatMap((item) => item.scope))];
  const decision = {
    schema_version: 1,
    kind: 'user-decision',
    request,
    responses: [{
      source: sourceBinding(picked[2]),
      principal_ref: principal,
      responded_at: picked[2].sent_at,
      text: picked[2].text,
      request_digest: requestDigest(request),
      selection: itemIds.length === 1 ? 'single' : 'explicit-all',
      item_ids: itemIds,
      decision: 'approved',
      approved_scope: approvedScope,
    }],
  };
  const expected = request.items.map((item) => ({ boundary: item.boundary, subject_ref: item.subject.ref, scope: item.scope }));
  const verified = validateUserDecision(decision, { root: target.root, expected });
  fs.writeFileSync(path.join(target.root, target.decision), `${JSON.stringify(decision, null, 2)}\n`);
  fs.writeFileSync(path.join(target.root, target.decision.replace('.json', '-verification.json')), `${JSON.stringify({ result: 'verified-current-human-confirmation', original_session: session, source_lines: picked.map((message) => message.source_line), request_digest: requestDigest(request), verified }, null, 2)}\n`);
}

console.log('当前完整展示后的真实“确认”已按两仓固定请求验证；没有扩张批准范围。');
