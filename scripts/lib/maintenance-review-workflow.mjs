import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { generateTaskPackageDefaults } from "./task-package.mjs";
import { loadMaintenanceCheckpoint, validateMaintenanceCheckpoint } from "./maintenance-intensity.mjs";
import { ROOT } from "./template-verification.mjs";

function fail(message) { throw new TypeError(message); }
function ensure(condition, message) { if (!condition) fail(message); }
function safeRef(value, field) {
  ensure(typeof value === "string" && value.trim(), `${field} 不能为空`);
  ensure(!path.isAbsolute(value), `${field} 必须是仓库相对路径`);
  const resolved = path.resolve(ROOT, value);
  ensure(!path.relative(ROOT, resolved).startsWith(".."), `${field} 不得越出仓库`);
  return resolved;
}
function loadYaml(ref, label) {
  const document = parseDocument(readFileSync(safeRef(ref, label), "utf8"), { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || `${label} 无法解析`);
  return document.toJS({ maxAliasCount: 0 });
}
function readableRef(value) {
  if (typeof value !== "string" || !value || /\s/.test(value) || path.isAbsolute(value)) return null;
  const resolved = path.resolve(ROOT, value);
  if (path.relative(ROOT, resolved).startsWith("..") || !existsSync(resolved)) return null;
  return value;
}
function slug(value) { return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }

const AXES = [
  { axis: "standards", role: "role.test-engineer", objective: "验证工程标准、可执行门禁和候选完整性" },
  { axis: "spec", role: "role.requirements-manager", objective: "验证流程语义、范围与单一事实来源一致性" },
  { axis: "lead", role: "role.lifecycle-orchestrator", objective: "汇总独立审查并裁决候选是否收敛" }
];

export function generateReviewerTaskPackages({ checkpointRef, candidateRef, outputDir, candidateKind, candidateRequirement, implementationActorId, round }) {
  const checkpoint = loadMaintenanceCheckpoint(safeRef(checkpointRef, "checkpointRef"));
  validateMaintenanceCheckpoint(checkpoint);
  ensure(checkpoint.schema_version === 2 && checkpoint.current_state === "review-ready", "只能为 review-ready checkpoint 生成审查任务包");
  ensure(round === checkpoint.review_round && [1, 2].includes(round), "round 必须与 checkpoint.review_round 一致且最多为 2");
  ensure(typeof candidateRequirement === "string" && candidateRequirement.trim(), "candidateRequirement 不能为空");
  ensure(typeof implementationActorId === "string" && implementationActorId.trim(), "implementationActorId 不能为空");
  const candidate = loadYaml(candidateRef, "candidateRef");
  ensure(typeof candidate.candidate_kind === "string" && candidate.candidate_kind.trim(), "candidate manifest 缺少 candidate_kind");
  if (candidateKind !== undefined) ensure(candidateKind === candidate.candidate_kind, "candidateKind 必须与 candidate manifest 一致");
  ensure(candidate.candidate_digest === checkpoint.candidate_digest, "候选 manifest 与 checkpoint 的 candidate_digest 不一致");
  safeRef(outputDir, "outputDir");
  const stem = slug(path.basename(checkpointRef, path.extname(checkpointRef)));
  const applicableRuleRefs = ["AGENTS.md", "CONTEXT.md", "docs/process/harness-process-tailoring.md", ".agents/skills/maintaining-skills/SKILL.md"];
  const candidateByteRefs = [candidateRef, candidate.snapshot_stream_ref, candidate.tracked_diff_ref].map(readableRef).filter(Boolean);
  const sourceEvidenceRefs = (checkpoint.verification_evidence || []).flatMap((evidence) => [readableRef(evidence.command), readableRef(evidence.evidence_ref)]).filter(Boolean);
  const allowedReadPaths = [...new Set([...candidateByteRefs, checkpointRef, ...sourceEvidenceRefs, ...applicableRuleRefs])];
  const upstreamVerificationResults = (checkpoint.verification_evidence || []).flatMap((evidence) => {
    const evidenceRef = readableRef(evidence.evidence_ref);
    if (!evidenceRef || typeof evidence.executed_at !== "string" || typeof evidence.command !== "string") return [];
    return [{ command: evidence.command, exit_code: 0, duration_ms: Number.isInteger(evidence.duration_ms) ? evidence.duration_ms : 0, executed_at: evidence.executed_at, evidence_ref: evidenceRef }];
  });
  const verificationCommands = [...new Set([...upstreamVerificationResults.map((result) => result.command), "git diff --check"])];
  return AXES.map(({ axis, role, objective }) => {
    const reportRef = `${outputDir}/${stem}-${axis}-review-round${round}.md`;
    const packageRef = `${outputDir}/${stem}-${axis}-review-task-round${round}.yaml`;
    const taskPackage = generateTaskPackageDefaults(role, {
      task_id: `${stem}-${axis}-review-round${round}`,
      work_unit_id: "work-unit.intensity-aware-review",
      actor_id: `reviewer.${stem}.${axis}.r${round}`,
      runtime_id: "runtime.skill-projection",
      execution_state: "Reviewer",
      workflow_status: "active",
      contract: {
        kind: "template-maintenance",
        contract_id: stem,
        contract_version: round,
        status: "issued",
        contract_ref: checkpointRef,
        maintenance_ref: checkpointRef,
        candidate_kind: candidate.candidate_kind,
        candidate_requirement: candidateRequirement,
        candidate_digest: checkpoint.candidate_digest,
        review_axis: axis,
        review_round: round,
        applicable_rule_refs: applicableRuleRefs
      },
      inputs: [...allowedReadPaths],
      allowed_read_paths: [...allowedReadPaths],
      objective: `${objective}；${candidateRequirement}`,
      allowed_write_paths: [reportRef],
      forbidden_actions: ["修改实现资产", "修改候选快照", "commit", "push", "批准发布"],
      expected_outputs: [`${axis} 审查结论`, "findings", "candidate_digest"],
      expected_evidence_files: [reportRef],
      verification_commands: verificationCommands,
      verification_results: upstreamVerificationResults,
      review_context: { implementation_actor_id: implementationActorId, implementation_task_id: `${stem}-implementation` },
      downstream_consumers: axis === "lead" ? ["role.lifecycle-orchestrator"] : [`reviewer.${stem}.lead.r${round}`],
      convergence: { parent_work_unit: "work-unit.intensity-aware-review", convergence_ref: checkpointRef, conflict_escalation: "violation 交实现者修复；drift/new_impacts 重新路由；第二轮仍阻断则 needs-human" }
    });
    return { axis, packageRef, reportRef, package: taskPackage };
  });
}

export function evaluateMaintenanceReviewRound({ review_round: round, candidate_digest: digest, findings = [] }) {
  ensure([1, 2].includes(round), "正式审查最多允许两轮");
  ensure(/^(?:sha256:)?[a-f0-9]{64}$/.test(digest), "candidate_digest 必须是 SHA-256");
  ensure(Array.isArray(findings), "findings 必须是数组");
  const blocking = findings.filter((finding) => ["violation", "drift", "new_impacts"].includes(finding?.disposition) && finding.status !== "resolved" && finding.status !== "not-applicable");
  const backlog = findings.filter((finding) => finding?.disposition === "judgement-call" && finding.status !== "resolved" && finding.status !== "not-applicable");
  return { review_round: round, candidate_digest: digest, current_state: blocking.length > 0 && round === 2 ? "needs-human" : "review-ready", action: blocking.length === 0 ? "eligible-for-final-verification" : round === 1 ? "repair-and-refreeze" : "stop-automatic-review", blocking_findings: blocking, backlog_findings: backlog };
}
