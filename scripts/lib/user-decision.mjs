import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
import { loadDigitalHumanRoles } from "./digital-human-roles.mjs";
import { validateJsonSchema } from "./json-schema.mjs";

export function decisionError(code, detail) {
  const error = new TypeError(`${code}: ${detail}`);
  error.code = code;
  throw error;
}
const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) decisionError("user-decision-missing", label);
};
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
export const decisionDigest = (value) => `sha256:${createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))).digest("hex")}`;
export function requestDigest(request) {
  const { presented_source, ...snapshot } = request;
  return decisionDigest(snapshot);
}
export function decisionIO({ root = ROOT, read = (ref) => readFileSync(ref), ...rest } = {}) {
  const resolve = (ref) => /^(?:https?:|\w+:\/\/)/.test(ref) ? ref : path.resolve(root, ref);
  const bytes = (ref) => {
    requireText(ref, "可读引用");
    try { return read(resolve(ref)); } catch { decisionError("user-decision-source-unreadable", ref); }
  };
  const document = (ref) => {
    const doc = parseDocument(String(bytes(ref)), { maxAliasCount: 0, uniqueKeys: true });
    if (doc.errors.length || !doc.toJS()) decisionError("user-decision-source-invalid", ref);
    return doc.toJS({ maxAliasCount: 0 });
  };
  return { root, bytes, document, ...rest };
}

// A capture preserves original author/time/text/reference. It is evidence, not an identity signature.
function messageFromSource(source, io, policy) {
  if (!source || !policy.source_kinds.includes(source.kind)) decisionError("user-decision-source-invalid", "需要原始消息、会话导出或用户确认文件");
  const raw = io.bytes(source.ref);
  if (decisionDigest(raw) !== source.digest) decisionError("user-decision-source-changed", source.ref);
  const parsed = parseDocument(String(raw), { maxAliasCount: 0, uniqueKeys: true });
  if (parsed.errors.length) decisionError("user-decision-source-invalid", source.ref);
  const capture = parsed.toJS({ maxAliasCount: 0 });
  if (capture?.source_kind !== source.kind || !Array.isArray(capture.messages)) decisionError("user-decision-source-invalid", "来源不是原始消息封装");
  const matches = capture.messages.filter((message) => message.id === source.message_id);
  if (matches.length !== 1) decisionError("user-decision-source-invalid", "消息 ID 缺失或重复");
  const message = matches[0];
  for (const field of ["principal_ref", "original_ref", "sent_at", "text"]) requireText(message[field], `原始消息 ${field}`);
  if (!Number.isFinite(Date.parse(message.sent_at))) decisionError("user-decision-source-invalid", "原始消息时间无效");
  return { ...message, _preceding_message: capture.messages[capture.messages.indexOf(message) - 1] };
}

export function renderDecisionRequest(request) {
  return [
    `决定请求 ${request.id} (${requestDigest(request)})`,
    `提问者：${request.requester_ref}`,
    ...request.items.flatMap((item) => [
      `事项 ${item.id} / ${item.boundary}：${item.title}`,
      `资产：${item.subject.ref}；版本：${item.subject.version}；摘要：${item.subject.digest}`,
      `依据：${item.basis.map((asset) => `${asset.ref}@${asset.version} (${asset.digest})`).join("；") || "无额外依据"}`,
      `关键变化：${item.changes}`,
      `范围：${item.scope.join("；")}`,
      `风险：${item.risks.join("；") || "已评估，无已知残余风险"}`,
      `推荐方案：${item.recommendation}`,
      `批准后动作：${item.next_actions.join("；")}`,
      `回复负责人：${item.responder_ref}`,
    ]),
    "请明确批准、拒绝或提出修改；多事项回复须说明事项，或明确批准以上全部事项。",
  ].join("\n");
}

function checkAsset(asset, io) {
  if (decisionDigest(io.bytes(asset.ref)) !== asset.digest) decisionError("user-decision-stale", asset.ref);
}

export function validateUserDecision(record, options = {}) {
  const io = decisionIO(options);
  const policy = (options.rolesDoc || loadDigitalHumanRoles()).user_decision_policy;
  validateJsonSchema(record, path.join(ROOT, "docs/process/schemas/user-decision.schema.json"), { label: "用户决定记录" });
  const { request, responses } = record;
  const originalRequest = messageFromSource(request.requester_source, io, policy);
  if (originalRequest.actor_kind !== "biological-human" || originalRequest.principal_ref !== request.requester_ref) decisionError("user-decision-responder-mismatch", "提问者来源不匹配");
  const presentation = messageFromSource(request.presented_source, io, policy);
  const presentedFields = request.items.flatMap((item) => [item.title, item.subject.ref, item.subject.version, item.changes, item.recommendation, ...item.scope, ...item.risks, ...item.next_actions, ...item.basis.flatMap((asset) => [asset.ref, asset.version])]);
  // Preserve equivalent historical presentations without requiring a new templated message.
  if (presentation.text !== renderDecisionRequest(request) && !presentedFields.every((field) => presentation.text.includes(field))) decisionError("user-decision-presentation-mismatch", "原始展示未覆盖当前资产、版本、变化、风险、范围和后续动作");
  if (Date.parse(presentation.sent_at) < Date.parse(originalRequest.sent_at)) decisionError("user-decision-source-invalid", "展示时间早于用户请求");
  const items = new Map();
  for (const item of request.items) {
    if (items.has(item.id)) decisionError("user-decision-ambiguous", "事项 ID 重复");
    items.set(item.id, item);
    if (item.responder_ref !== request.requester_ref) {
      const delegated = messageFromSource(item.delegation_source, io, policy);
      if (delegated.actor_kind !== "biological-human" || delegated.principal_ref !== request.requester_ref || !delegated.text.includes(item.responder_ref) || !delegated.text.includes(item.id)) decisionError("user-decision-delegation-invalid", "负责人须有提问者指向该事项的指定原文");
      if (Date.parse(delegated.sent_at) > Date.parse(presentation.sent_at)) decisionError("user-decision-delegation-invalid", "须先指定负责人再展示当前请求");
    }
  }
  const outcomes = new Map();
  const messageIds = new Set();
  let previousTime = -Infinity;
  for (const response of responses) {
    const source = messageFromSource(response.source, io, policy);
    const identity = `${response.source.ref}#${response.source.message_id}`;
    if (messageIds.has(identity)) decisionError("user-decision-ambiguous", "回复消息重复");
    messageIds.add(identity);
    if (source.reply_to !== presentation.original_ref && source.request_digest !== requestDigest(request) && !(source._preceding_message?.original_ref === presentation.original_ref && source._preceding_message?.text === presentation.text)) decisionError("user-decision-subject-mismatch", "原始回复没有指向当前请求的来源关联");
    if (source.actor_kind !== "biological-human" || source.principal_ref !== response.principal_ref || source.sent_at !== response.responded_at || source.text !== response.text) decisionError("user-decision-responder-mismatch", "记录与原始回复身份、时间或原文不一致");
    if (response.request_digest !== requestDigest(request)) decisionError("user-decision-stale", "回复绑定的请求快照已变化");
    const time = Date.parse(response.responded_at);
    if (time < Date.parse(presentation.sent_at) || time < previousTime) decisionError("user-decision-source-invalid", "回复须在展示之后并按原始时间排序");
    previousTime = time;
    if (response.decision === "approved") {
      const explicit = source.decision === "approved" && Array.isArray(source.item_ids) && response.item_ids.every((id) => source.item_ids.includes(id));
      if (!explicit && (!/(同意|批准|确认|接受|可以|好的|^好[。！!\s]*$|\b(?:approve|approved|agree|agreed|accept|yes|ok)\b)/i.test(source.text) || /(不同意|不批准|拒绝|反对|不要|需[要]?修改|请修改|暂不|reject|decline|do not approve|don't approve|disagree)/i.test(source.text))) decisionError("user-decision-ambiguous", "原文不能明确支持批准结论");
      if (!explicit && response.selection === "explicit-all" && items.size > 1 && !/(全部|所有|\ball\b)/i.test(source.text)) decisionError("user-decision-ambiguous", "批量批准原文必须明确全部事项");
      if (!explicit && response.selection === "explicit-items" && items.size > 1 && response.item_ids.some((id) => !source.text.includes(id) && !source.text.includes(items.get(id)?.title))) decisionError("user-decision-ambiguous", "原文未指向所选事项");
    }
    if (response.selection === "single" && items.size !== 1) decisionError("user-decision-ambiguous", "多事项不能用单项回复");
    if (items.size > 1 && /^(继续|continue|go ahead)[。.!！\s]*$/i.test(response.text.trim())) decisionError("user-decision-ambiguous", "继续不能解释为批准全部事项");
    if (response.selection === "explicit-all" && (response.item_ids.length !== items.size || [...items.keys()].some((id) => !response.item_ids.includes(id)))) decisionError("user-decision-ambiguous", "全部批准必须枚举全部事项");
    for (const id of response.item_ids) {
      const item = items.get(id);
      if (!item) decisionError("user-decision-subject-mismatch", id);
      if (item.responder_ref !== response.principal_ref) decisionError("user-decision-responder-mismatch", id);
      if (response.decision === "approved" && (response.approved_scope.length === 0 || response.approved_scope.some((scope) => !response.item_ids.some((selected) => items.get(selected)?.scope.includes(scope))))) decisionError("user-decision-scope-mismatch", id);
      const previous = outcomes.get(id);
      if (response.decision === "approved" && previous?.decision === "approved") {
        outcomes.set(id, { ...response, approved_scope: [...new Set([...previous.approved_scope, ...response.approved_scope])] });
      } else outcomes.set(id, response);
    }
  }
  const validated = [];
  for (const expected of options.expected || []) {
    requireText(expected.boundary, "当前决定边界");
    requireText(expected.subject_ref, "当前资产引用");
    if (!Array.isArray(expected.scope) || expected.scope.length === 0) decisionError("user-decision-scope-mismatch", "当前批准范围缺失");
    const matches = request.items.filter((item) => item.boundary === expected.boundary && item.subject.ref === expected.subject_ref && expected.scope.every((scope) => item.scope.includes(scope)));
    if (matches.length !== 1) decisionError("user-decision-subject-mismatch", expected.boundary);
    const item = matches[0];
    checkAsset(item.subject, io);
    item.basis.forEach((asset) => checkAsset(asset, io));
    const answer = outcomes.get(item.id);
    if (!answer) decisionError("user-decision-response-required", item.id);
    if (answer.decision !== "approved") decisionError("user-decision-not-approved", `${item.id}: ${answer.decision}`);
    if (!expected.scope.every((scope) => answer.approved_scope.includes(scope))) decisionError("user-decision-scope-mismatch", item.id);
    validated.push({ item_id: item.id, boundary: expected.boundary, principal_ref: answer.principal_ref, scope: expected.scope });
  }
  return { request_id: request.id, validated, outcomes: Object.fromEntries([...outcomes].map(([id, answer]) => [id, answer.decision])) };
}

export function verifyUserDecisionFile(ref, options = {}) {
  const io = decisionIO(options);
  requireText(ref, "user_decision_ref");
  return validateUserDecision(io.document(ref), options);
}

export function assertUserDecisionRequirement(requirement, options = {}) {
  if (!requirement) decisionError("user-decision-response-required", "缺少当前决定及其范围");
  return verifyUserDecisionFile(requirement.user_decision_ref, { ...options, expected: [requirement] });
}

export function assertWorkUnitUserDecision(workUnit, state, options = {}) {
  const policy = (options.rolesDoc || loadDigitalHumanRoles()).user_decision_policy;
  const boundaries = [...(policy.work_unit_gates?.[workUnit] || []), ...(policy.work_units[workUnit] ? [policy.work_units[workUnit]] : [])];
  for (const boundary of boundaries) {
    const notApplicable = state?.user_decision_not_applicable?.find((item) => item.boundary === boundary);
    // Only existing conditional technical gates may be untriggered; an executed business decision cannot be skipped.
    if (workUnit === "work-unit.technical-analysis" && notApplicable?.reason?.trim()) continue;
    const requirement = state?.user_decisions?.find((item) => item.boundary === boundary);
    if (!requirement) decisionError("user-decision-response-required", boundary);
    assertUserDecisionRequirement(requirement, options);
  }
}

export function assertImplementationDecision(state, options = {}) {
  const requirement = state?.user_decisions?.find((item) => item.boundary === "implementation-scope");
  const ticketRef = state?.vertical_slice_ticket_ref;
  if (!requirement || !requirement.scope?.includes(ticketRef)) decisionError("user-decision-scope-mismatch", "实施范围必须包含当前切片");
  assertUserDecisionRequirement(requirement, options);
  const io = decisionIO(options);
  const manifest = io.document(requirement.subject_ref);
  const slices = manifest.slices?.filter((slice) => slice.ticket_ref === ticketRef);
  if (manifest.kind !== "implementation-scope" || slices?.length !== 1) decisionError("user-decision-subject-mismatch", "实施范围清单未绑定当前切片");
  const slice = slices[0];
  requireText(state.slice_contract_ref, "当前持久化 Slice 合同引用");
  if (state.slice_contract_ref !== slice.contract?.ref) decisionError("user-decision-subject-mismatch", "当前合同不在批准清单中");
  checkAsset(slice.contract, io);
  const content = io.document(slice.contract.ref);
  const contract = content.slice_contract || content;
  if (contract.lifecycle_refs?.ticket !== ticketRef) decisionError("user-decision-subject-mismatch", "持久化合同的切片引用不匹配");
  for (const [manifestKey, contractKey] of [["repositories", "project_roots"], ["allowed_write_paths", "allowed_write_paths"]]) {
    if (!Array.isArray(slice[manifestKey]) || slice[manifestKey].length === 0 || JSON.stringify([...slice[manifestKey]].sort()) !== JSON.stringify([...(contract.common?.[contractKey] || [])].sort())) decisionError("user-decision-scope-mismatch", manifestKey);
  }
  if (!Array.isArray(slice.baselines) || !slice.baselines.some((asset) => asset.ref === contract.lifecycle_refs?.engineering_baseline)) decisionError("user-decision-scope-mismatch", "工程基线缺失");
  slice.baselines.forEach((asset) => checkAsset(asset, io));
}

export function scaffoldDecisionSnapshot(decision) {
  const { user_confirmation, status, decision_inputs_digest, ...inputs } = decision;
  return inputs;
}
export function assertScaffoldUserDecision(decision, options = {}) {
  const confirmation = decision.user_confirmation || {};
  const requirement = { boundary: "scaffold-choice", subject_ref: confirmation.decision_subject_ref, scope: [decision.project_id, decision.confirmed_architecture, decision.decision_inputs_digest], user_decision_ref: confirmation.user_decision_ref };
  assertUserDecisionRequirement(requirement, options);
  const io = decisionIO(options);
  if (decisionDigest(io.document(requirement.subject_ref)) !== decisionDigest(scaffoldDecisionSnapshot(decision))) decisionError("user-decision-stale", "脚手架输入与用户所见快照不一致");
}
