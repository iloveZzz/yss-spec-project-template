// Synthetic sources for tests only. Never use these helpers to record a real user's approval.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { decisionDigest, requestDigest, renderDecisionRequest } from "../../lib/user-decision.mjs";
export function buildDecisionFixture(root, { boundary = "gate.spec-baseline-approved", scope = ["feature.demo"], subjectRef, subjectContent = "冻结业务基线 v1\n", extraItems = [] } = {}) {
  mkdirSync(root, { recursive: true });
  const write = (name, value) => {
    const ref = path.join(root, name);
    writeFileSync(ref, typeof value === "string" ? value : JSON.stringify(value, null, 2));
    return ref;
  };
  const subject = subjectRef || write("subject.md", subjectContent);
  const capture = (name, principal, actor, sentAt, text, kind = "session-export", replyTo = null) => {
    const value = { source_kind: kind, messages: [{ id: name, principal_ref: principal, actor_kind: actor, sent_at: sentAt, text, ...(replyTo ? { reply_to: replyTo } : {}), original_ref: `test-only://${name}` }] };
    const ref = write(`${name}.json`, value);
    return { kind, ref, digest: decisionDigest(readFileSync(ref)), message_id: name };
  };
  const record = { schema_version: 1, kind: "user-decision", request: {
    id: "request.demo", requester_ref: "person.requester",
    requester_source: capture("requester", "person.requester", "biological-human", "2026-09-05T01:00:00Z", "请整理可审阅的功能方案。"),
    items: [{ id: "decision.demo", boundary, title: "确认本次范围", subject: { ref: subject, version: "v1", digest: decisionDigest(readFileSync(subject)) }, basis: [], scope, changes: "新增已列明范围", risks: [], recommendation: "批准上述范围", next_actions: ["进入下一工作单元"], responder_ref: "person.requester" }, ...extraItems],
  }, responses: [] };
  const present = () => { record.request.presented_source = capture("presentation", "agent.orchestrator", "digital-human", "2026-09-05T01:02:00Z", renderDecisionRequest(record.request)); };
  present();
  const respond = ({ principal = "person.requester", actor = "biological-human", text = "同意", decision = "approved", selection = record.request.items.length === 1 ? "single" : "explicit-all", itemIds = record.request.items.map((item) => item.id), approvedScope = record.request.items.flatMap((item) => item.scope), time = "2026-09-05T01:03:00Z", name = `reply-${record.responses.length}` } = {}) => {
    record.responses.push({ source: capture(name, principal, actor, time, text, "session-export", JSON.parse(readFileSync(record.request.presented_source.ref, "utf8")).messages[0].original_ref), principal_ref: principal, responded_at: time, text, request_digest: requestDigest(record.request), selection, item_ids: itemIds, decision, approved_scope: approvedScope });
  };
  respond({ text: extraItems.length ? "同意以上全部事项" : "同意" });
  const ref = path.join(root, "decision.json");
  const save = () => writeFileSync(ref, JSON.stringify(record, null, 2));
  save();
  return { record, ref, save, write, capture, present, respond, requirement: { boundary, subject_ref: subject, scope: [...scope], user_decision_ref: ref } };
}
export function buildImplementationFixture(root, ticketRef) {
  mkdirSync(root, { recursive: true });
  const baselineRef = path.join(root, "engineering-baseline.md");
  const contractRef = path.join(root, "slice-contract.json");
  const scopeRef = path.join(root, "implementation-scope.json");
  writeFileSync(baselineRef, "已采纳工程基线 v1\n");
  const contract = { lifecycle_refs: { ticket: ticketRef, engineering_baseline: baselineRef }, common: { project_roots: ["external/demo"], allowed_write_paths: ["src/demo/**"] } };
  writeFileSync(contractRef, JSON.stringify(contract));
  const asset = (ref) => ({ ref, version: "v1", digest: decisionDigest(readFileSync(ref)) });
  writeFileSync(scopeRef, JSON.stringify({ kind: "implementation-scope", slices: [{ ticket_ref: ticketRef, contract: asset(contractRef), repositories: contract.common.project_roots, allowed_write_paths: contract.common.allowed_write_paths, baselines: [asset(baselineRef)] }] }));
  const fixture = buildDecisionFixture(root, { boundary: "implementation-scope", scope: [ticketRef], subjectRef: scopeRef });
  return { ...fixture, state: { slice_contract_ref: contractRef, vertical_slice_ticket_ref: ticketRef, user_decisions: [fixture.requirement] } };
}

export function attachScaffoldDecisionFixture(root, decision) {
  mkdirSync(root, { recursive: true });
  const { user_confirmation, status, decision_inputs_digest, ...snapshot } = decision;
  const snapshotRef = path.join(root, "scaffold-inputs.json");
  writeFileSync(snapshotRef, JSON.stringify(snapshot));
  const f = buildDecisionFixture(root, { boundary: "scaffold-choice", subjectRef: snapshotRef, scope: [decision.project_id, decision.confirmed_architecture, decision.decision_inputs_digest] });
  return { ...decision, user_confirmation: { ...user_confirmation, user_decision_ref: f.ref, decision_subject_ref: snapshotRef } };
}
if (process.argv[2] === "--scaffold") {
  const file = process.argv[3];
  const value = JSON.parse(readFileSync(file, "utf8"));
  value.decisions = value.decisions.map((decision) => attachScaffoldDecisionFixture(path.join(path.dirname(file), `user-decision-${decision.project_id}`), decision));
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
