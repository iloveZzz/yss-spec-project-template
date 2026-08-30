import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";
import { validateTaskPackageSchema } from "./task-package-schema.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REVIEW_KIND_TO_MODE = new Map([
  ["focused-independent-review", "focused-independent"],
  ["formal-independent-review", "formal-independent"]
]);
const STRUCTURED_FIELDS = [
  "schema_version",
  "record_kind",
  "review_mode",
  "status",
  "reviewer_id",
  "implementation_actor_id",
  "candidate_digest",
  "candidate_snapshot_ref",
  "task_package_ref",
  "review_report_ref",
  "reviewed_at",
  "findings"
];
const REQUEST_ONLY_PATTERNS = [
  /只(?:提出|用于|是一份?).{0,12}审查请求/,
  /不是.{0,16}(?:独立审查|审查).{0,12}(?:结论|记录)/,
  /不(?:是|构成).{0,20}(?:审查结论|通过结论)/,
  /须由(?:其他|非实施者|独立审查者).{0,40}(?:改写|给出结论|完成审查)/,
  /本条\s*result=pass\s*只表示.{0,60}不表示审查已通过/
];
const LEGACY_FORMAL_REVIEW_REFS = new Set([
  ".template-source/evidence/maintenance/digital-human-task-package-formal-independent-review-2026-08-27.md",
  ".template-source/evidence/maintenance/git-submodule-scope-l3-review-request-writable-oracle-2026-08-24.md",
  ".template-source/evidence/maintenance/lifecycle-ticket-transition-formal-independent-review-2026-08-27.md",
  ".template-source/evidence/maintenance/yss-stage-decision-l3-formal-independent-review-2026-08-27.md",
  ".template-source/evidence/maintenance/yss-tactical-design-formal-independent-review-2026-08-27.md"
]);

function ensure(condition, message) {
  if (!condition) throw new TypeError(message);
}

function parseYamlOrJson(source, label) {
  const document = parseDocument(source, { uniqueKeys: true, maxAliasCount: 0 });
  ensure(document.errors.length === 0, `${label} 无法解析: ${document.errors[0]?.message ?? "unknown error"}`);
  const value = document.toJS({ maxAliasCount: 0 });
  ensure(value && typeof value === "object" && !Array.isArray(value), `${label} 必须是对象`);
  return value;
}

function resolvePortableFile(relativeRef, baseDir, label) {
  ensure(typeof relativeRef === "string" && relativeRef.trim(), `${label} 不能为空`);
  ensure(!path.isAbsolute(relativeRef), `${label} 必须是仓库相对路径`);
  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(resolvedBase, relativeRef);
  ensure(resolved === resolvedBase || resolved.startsWith(`${resolvedBase}${path.sep}`), `${label} 不得越过仓库根`);
  ensure(existsSync(resolved) && lstatSync(resolved).isFile(), `${label} 不可读: ${relativeRef}`);
  const realBase = realpathSync(resolvedBase);
  const realTarget = realpathSync(resolved);
  ensure(realTarget === realBase || realTarget.startsWith(`${realBase}${path.sep}`), `${label} 经 symlink 越过仓库根`);
  return realTarget;
}

function resolvePortableDirectory(relativeRef, baseDir, label) {
  ensure(typeof relativeRef === "string" && relativeRef.trim(), `${label} 不能为空`);
  ensure(!path.isAbsolute(relativeRef), `${label} 必须是仓库相对路径`);
  const realBase = realpathSync(path.resolve(baseDir));
  const resolved = path.resolve(baseDir, relativeRef);
  ensure(existsSync(resolved) && lstatSync(resolved).isDirectory(), `${label} 不可读: ${relativeRef}`);
  const realTarget = realpathSync(resolved);
  ensure(realTarget === realBase || realTarget.startsWith(`${realBase}${path.sep}`), `${label} 经 symlink 越过仓库根`);
  return realTarget;
}

function hasReviewIdentity(body) {
  return /(?:审查角色|审查者|reviewer_id)\s*[：:]/i.test(body);
}

function hasApprovedConclusion(body) {
  return /^(?:[-*]\s*)?(?:审查结论|结论)\s*[：:]\s*(?:`|\*\*)?(?:pass|approved|通过)/imu.test(body)
    || /^通过[。.]?/mu.test(body)
    || /本次(?:正式|聚焦)?独立审查通过/u.test(body)
    || /裁决[：:]\s*(?!.*未闭合).{0,40}(?:通过|闭合)/u.test(body);
}

function validateReviewReportBody(body, label, { expectedMode, allowLegacyFormal = false } = {}) {
  ensure(!REQUEST_ONLY_PATTERNS.some((pattern) => pattern.test(body)), `${label} 只是审查请求或实施者自述，不是独立审查结论`);
  ensure(!/(?:审查结论|结论|status|裁决)\s*[：:]?[^\n]{0,30}(?:未通过|changes-requested|blocked|失败|未闭合)/iu.test(body), `${label} 包含明确的否定或阻断结论`);
  ensure(!/(?:不能|不得|不可|尚未|不应|无法)[^\n]{0,40}(?:正式)?独立审查通过/iu.test(body), `${label} 在否定语境中提及审查通过`);
  if (expectedMode === "formal-independent" && allowLegacyFormal) {
    ensure(/legacy_formal_review\s*:\s*true/i.test(body), `${label} 的历史 L3 Markdown 缺少 legacy_formal_review: true 标记`);
  }
  ensure(hasReviewIdentity(body), `${label} 缺少审查身份`);
  ensure(hasApprovedConclusion(body), `${label} 缺少明确的独立审查通过结论`);
}

function readLength(buffer, offset, bytes, label) {
  ensure(offset + bytes <= buffer.length, `候选流缺少 ${label} 长度`);
  const value = bytes === 8 ? buffer.readBigUInt64BE(offset) : BigInt(buffer.readUInt32BE(offset));
  ensure(value <= BigInt(Number.MAX_SAFE_INTEGER), `候选流 ${label} 长度过大`);
  return { value: Number(value), offset: offset + bytes };
}

function validateWorktreeStream(stream, trackedDiff, manifest, untrackedRoot, baseDir) {
  const magic = Buffer.from("YSS-WORKTREE-CANDIDATE-V1\0", "ascii");
  ensure(stream.subarray(0, magic.length).equals(magic), "候选流缺少 YSS-WORKTREE-CANDIDATE-V1 magic header");
  let offset = magic.length;
  ensure(stream[offset] === 0x54, "候选流缺少 tracked record");
  offset += 1;
  let length = readLength(stream, offset, 8, "tracked record");
  offset = length.offset;
  ensure(offset + length.value <= stream.length, "候选流 tracked record 截断");
  ensure(stream.subarray(offset, offset + length.value).equals(trackedDiff), "tracked_diff_ref 与候选流 tracked record 不一致");
  offset += length.value;
  const paths = [];
  let previousPath = null;
  while (offset < stream.length) {
    ensure(stream[offset] === 0x55, "候选流包含未知 record kind");
    offset += 1;
    length = readLength(stream, offset, 8, "untracked path");
    offset = length.offset;
    ensure(offset + length.value <= stream.length, "候选流 untracked path 截断");
    const rawPath = stream.subarray(offset, offset + length.value);
    offset += length.value;
    ensure(previousPath === null || Buffer.compare(previousPath, rawPath) < 0, "候选流 untracked path 未按 bytewise 严格排序");
    previousPath = rawPath;
    const relativePath = rawPath.toString("utf8");
    ensure(Buffer.from(relativePath).equals(rawPath) && relativePath && !path.isAbsolute(relativePath) && !relativePath.split(/[\\/]/).includes(".."), "候选流包含无效 untracked path");
    length = readLength(stream, offset, 4, "untracked mode");
    offset = length.offset;
    ensure(offset < stream.length && [0x52, 0x4c].includes(stream[offset]), "候选流 untracked kind 无效");
    offset += 1;
    length = readLength(stream, offset, 8, "untracked content");
    offset = length.offset;
    ensure(offset + length.value <= stream.length, "候选流 untracked content 截断");
    const content = stream.subarray(offset, offset + length.value);
    offset += length.value;
    const storedPath = resolvePortableFile(path.join(manifest.untracked_root_ref, relativePath), baseDir, `untracked snapshot ${relativePath}`);
    ensure(readFileSync(storedPath).equals(content), `untracked snapshot 与候选流不一致: ${relativePath}`);
    paths.push(relativePath);
  }
  ensure(JSON.stringify(paths) === JSON.stringify(manifest.untracked_files), "manifest.untracked_files 与候选流不一致");
  if (paths.length > 0) ensure(untrackedRoot, "worktree manifest 缺少 untracked_root_ref");
}

function validateCandidateManifest(manifest, record, baseDir) {
  for (const field of ["review_mode", "review_base_ref", "merge_base", "implementation_candidate_ref", "candidate_snapshot_ref", "candidate_digest", "tracked_diff_command", "commit_list_command"]) {
    ensure(typeof manifest[field] === "string" && manifest[field].trim(), `候选 manifest 缺少 ${field}`);
  }
  ensure(["committed", "worktree"].includes(manifest.review_mode), "候选 manifest.review_mode 无效");
  ensure(manifest.candidate_snapshot_ref === record.candidate_snapshot_ref, "manifest.candidate_snapshot_ref 未绑定实际 manifest");
  ensure(manifest.candidate_digest === record.candidate_digest, "独立审查记录与候选 manifest 的 digest 不一致");
  if (manifest.review_mode === "worktree") {
    ensure(typeof manifest.untracked_inventory_command === "string" && manifest.untracked_inventory_command.trim(), "worktree manifest 缺少 untracked_inventory_command");
    ensure(typeof manifest.untracked_diff_command === "string" && manifest.untracked_diff_command.trim(), "worktree manifest 缺少 untracked_diff_command");
    ensure(Array.isArray(manifest.untracked_files), "worktree manifest 缺少 untracked_files");
    ensure(typeof manifest.snapshot_stream_ref === "string" && manifest.snapshot_stream_ref.trim(), "worktree manifest 缺少 snapshot_stream_ref");
    ensure(typeof manifest.tracked_diff_ref === "string" && manifest.tracked_diff_ref.trim(), "worktree manifest 缺少 tracked_diff_ref");
    const streamPath = resolvePortableFile(manifest.snapshot_stream_ref, baseDir, "snapshot_stream_ref");
    const trackedDiffPath = resolvePortableFile(manifest.tracked_diff_ref, baseDir, "tracked_diff_ref");
    const untrackedRoot = manifest.untracked_files.length > 0 ? resolvePortableDirectory(manifest.untracked_root_ref, baseDir, "untracked_root_ref") : null;
    const stream = readFileSync(streamPath);
    const actualDigest = createHash("sha256").update(stream).digest("hex");
    ensure(actualDigest === record.candidate_digest.replace(/^sha256:/, ""), "candidate_digest 与冻结候选字节不一致");
    validateWorktreeStream(stream, readFileSync(trackedDiffPath), manifest, untrackedRoot, baseDir);
  }
}

function validateTaskPackageBinding(taskPackage, record) {
  validateTaskPackageSchema(taskPackage);
  ensure(taskPackage.execution_state === "Reviewer", "审查任务包 execution_state 必须为 Reviewer");
  ensure(taskPackage.actor_id === record.reviewer_id, "审查任务包 actor_id 未绑定 reviewer_id");
  ensure(taskPackage.review_context?.implementation_actor_id === record.implementation_actor_id, "审查任务包未绑定 implementation_actor_id");
  ensure(taskPackage.contract?.kind === "template-maintenance" && taskPackage.contract?.status === "issued", "审查任务包必须绑定 issued template-maintenance 合同");
  ensure(Array.isArray(taskPackage.skill_source?.core_skills) && Array.isArray(taskPackage.skill_source?.forbidden_skills), "审查任务包缺少角色技能闭包");
  ensure(Array.isArray(taskPackage.inputs) && taskPackage.inputs.includes(record.candidate_snapshot_ref), "审查任务包 inputs 未绑定 candidate_snapshot_ref");
  ensure(Array.isArray(taskPackage.expected_evidence_files) && taskPackage.expected_evidence_files.includes(record.review_report_ref), "审查任务包未声明 review_report_ref");
  ensure(Array.isArray(taskPackage.forbidden_actions) && Array.isArray(taskPackage.expected_outputs), "审查任务包缺少禁止事项或预期输出");
}

function validateApprovedFindings(findings) {
  ensure(Array.isArray(findings), "findings 必须是数组");
  const blockingDispositions = new Set(["violation", "drift", "new_impacts"]);
  for (const finding of findings) {
    ensure(finding && typeof finding === "object" && !Array.isArray(finding), "finding 必须是对象");
    for (const field of ["id", "severity", "disposition", "status", "summary"]) ensure(typeof finding[field] === "string" && finding[field].trim(), `finding 缺少 ${field}`);
    ensure(!blockingDispositions.has(finding.disposition), `approved 记录不得包含 ${finding.disposition} finding`);
    ensure(["resolved", "not-applicable"].includes(finding.status), "approved 记录不得包含未关闭 finding");
  }
}

function validateStructuredRecord(record, expectedMode, baseDir, recordRef) {
  const unknown = Object.keys(record).filter((key) => !STRUCTURED_FIELDS.includes(key));
  ensure(unknown.length === 0, `维护独立审查记录包含未知字段: ${unknown.join(", ")}`);
  for (const field of STRUCTURED_FIELDS) ensure(field in record, `维护独立审查记录缺少字段: ${field}`);
  ensure(record.schema_version === 1, "维护独立审查记录 schema_version 必须为 1");
  ensure(record.record_kind === "maintenance-independent-review", "record_kind 必须为 maintenance-independent-review");
  ensure(record.review_mode === expectedMode, `review_mode 必须为 ${expectedMode}`);
  ensure(record.status === "approved", "维护独立审查记录必须明确 status=approved");
  for (const field of ["reviewer_id", "implementation_actor_id", "candidate_snapshot_ref", "task_package_ref", "review_report_ref", "reviewed_at"]) {
    ensure(typeof record[field] === "string" && record[field].trim(), `${field} 不能为空`);
  }
  ensure(record.reviewer_id !== record.implementation_actor_id, "独立审查者不得与实施者相同");
  ensure(/^(?:sha256:)?[a-f0-9]{64}$/.test(record.candidate_digest), "candidate_digest 必须是 SHA-256");
  ensure(!Number.isNaN(Date.parse(record.reviewed_at)), "reviewed_at 必须是可解析时间");
  validateApprovedFindings(record.findings);

  const manifestPath = resolvePortableFile(record.candidate_snapshot_ref, baseDir, "candidate_snapshot_ref");
  const manifest = parseYamlOrJson(readFileSync(manifestPath, "utf8"), "候选 manifest");
  validateCandidateManifest(manifest, record, baseDir);

  const taskPackagePath = resolvePortableFile(record.task_package_ref, baseDir, "task_package_ref");
  validateTaskPackageBinding(parseYamlOrJson(readFileSync(taskPackagePath, "utf8"), "审查任务包"), record);
  const reportPath = resolvePortableFile(record.review_report_ref, baseDir, "review_report_ref");
  const report = readFileSync(reportPath, "utf8");
  validateReviewReportBody(report, record.review_report_ref, { expectedMode });
  ensure(report.includes(record.reviewer_id), "审查报告未绑定 reviewer_id");
  ensure(report.includes(record.implementation_actor_id), "审查报告未绑定 implementation_actor_id");
  ensure(report.includes(record.candidate_digest), "审查报告未绑定 candidate_digest");
  return { review_mode: expectedMode, record_ref: recordRef, candidate_digest: record.candidate_digest };
}

export function validateMaintenanceReviewEvidence(evidence, { baseDir = ROOT } = {}) {
  const expectedMode = REVIEW_KIND_TO_MODE.get(evidence?.kind);
  ensure(expectedMode, `未知独立审查证据类型: ${evidence?.kind ?? "unknown"}`);
  const evidencePath = resolvePortableFile(evidence.command, baseDir, `${evidence.kind}.command`);
  const source = readFileSync(evidencePath, "utf8");
  if (/\.ya?ml$|\.json$/i.test(evidence.command)) {
    return validateStructuredRecord(parseYamlOrJson(source, "维护独立审查记录"), expectedMode, baseDir, evidence.command);
  }
  ensure(/\.md$/i.test(evidence.command), `${evidence.kind}.command 必须引用 Markdown 结论或结构化 YAML/JSON 记录`);
  if (expectedMode === "formal-independent") ensure(LEGACY_FORMAL_REVIEW_REFS.has(evidence.command), `${evidence.command} 不在历史 L3 Markdown allowlist；新 L3 必须使用结构化记录`);
  validateReviewReportBody(source, evidence.command, { expectedMode, allowLegacyFormal: true });
  return { review_mode: expectedMode, record_ref: evidence.command, legacy: true };
}
