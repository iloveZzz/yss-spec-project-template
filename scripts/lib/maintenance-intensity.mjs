import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";
import { validateMaintenanceReviewEvidence } from "./maintenance-review.mjs";
import { resolveMaintenanceReference } from './maintenance-storage.mjs';
import {spawnSync} from 'node:child_process';
import {readRepositoryMode} from './repository-mode.mjs';

import { validateCounterexample } from "./maintenance-counterexample.mjs";

const LEVELS = ["L1", "L2", "L3"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INTENSITY_POLICY = path.join(root, ".template-source/process/maintenance-intensity.yaml");

const REQUIRED_EVIDENCE = {
  L1: ["relevant-check"],
  L2: ["counterexample", "fresh-verification", "self-check"],
  L3: ["fresh-verification", "self-check"]
};

const REVIEW_MODES = {
  L1: new Set(["self-check", "human-checkpoint"]),
  L2: new Set(["self-check", "human-checkpoint", "focused-independent"]),
  L3: new Set(["self-check", "human-checkpoint", "focused-independent", "formal-independent"])
};

function ensure(condition, message) {
  if (!condition) throw new TypeError(message);
}

function loadTriggerLevels() {
  const document = parseDocument(readFileSync(INTENSITY_POLICY, "utf8"), { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "维护强度策略无法解析");
  const policy = document.toJS({ maxAliasCount: 0 });
  ensure(policy?.schema_version === 1 && LEVELS.includes(policy.default_level) && policy.levels && typeof policy.levels === "object", "维护强度策略 schema 无效");
  const pairs = [];
  for (const level of LEVELS) {
    const triggers = policy.levels[level]?.triggers;
    ensure(Array.isArray(triggers) && triggers.length > 0, `维护强度策略缺少 ${level} triggers`);
    for (const trigger of triggers) {
      ensure(typeof trigger === "string" && trigger.trim(), `${level} 包含无效 trigger`);
      pairs.push([trigger, level]);
    }
  }
  const map = new Map(pairs);
  ensure(map.size === pairs.length, "维护强度策略包含重复 trigger");
  ensure(Array.isArray(policy.counterexample_triggers) && policy.counterexample_triggers.every(x => map.has(x)), "反例触发策略无效");
  return { defaultLevel: policy.default_level, map, counterexamples: policy.counterexample_triggers };
}

const triggerLevels = loadTriggerLevels();

function levelRank(level) {
  return LEVELS.indexOf(level);
}

export function minimumIntensity(triggers) {
  ensure(Array.isArray(triggers), "triggers 必须是数组");
  if (triggers.length === 0) return triggerLevels.defaultLevel;
  let required = "L1";
  for (const trigger of triggers) {
    ensure(triggerLevels.map.has(trigger), `未知 trigger: ${trigger}`);
    const candidate = triggerLevels.map.get(trigger);
    if (levelRank(candidate) > levelRank(required)) required = candidate;
  }
  return required;
}

export function validateMaintenanceCheckpoint(data, options = {}) {
  ensure(data && typeof data === "object" && !Array.isArray(data), "checkpoint 必须是对象");
  const v1Fields = ["schema_version", "intensity", "classification_reason", "triggers", "changed_assets", "verification_evidence", "review_mode", "escalation"];
  const v2Fields = [...v1Fields, "target_state", "current_state", "verification_profile", "review_round", "candidate_digest"];
  const exactFields = data.schema_version === 2 ? v2Fields : v1Fields;
  const unknown = Object.keys(data).filter((key) => !exactFields.includes(key));
  ensure(unknown.length === 0, `checkpoint 包含未知字段: ${unknown.join(", ")}`);
  ensure([1, 2].includes(data.schema_version), "schema_version 必须为 1 或 2");
  ensure(LEVELS.includes(data.intensity), "intensity 必须是 L1、L2 或 L3");
  ensure(typeof data.classification_reason === "string" && data.classification_reason.trim(), "classification_reason 不能为空");
  ensure(Array.isArray(data.changed_assets) && data.changed_assets.length > 0 && data.changed_assets.every((item) => typeof item === "string" && item.trim()), "changed_assets 必须包含至少一个路径或资产引用");
  const minimum = minimumIntensity(data.triggers);
  ensure(levelRank(data.intensity) >= levelRank(minimum), `${data.triggers.join(", ") || "默认"} 至少要求 ${minimum}，不得声明为 ${data.intensity}`);
  ensure(typeof data.escalation === "string" && data.escalation.trim(), "escalation 必须说明 none 或升级原因");
  ensure(Array.isArray(data.verification_evidence), "verification_evidence 必须是数组");
  const kinds = new Set();
  for (const evidence of data.verification_evidence) {
    ensure(evidence && typeof evidence === "object" && !Array.isArray(evidence), "verification_evidence 条目必须是对象");
    ensure(typeof evidence.kind === "string" && evidence.kind.trim(), "verification_evidence.kind 不能为空");
    ensure(typeof evidence.command === "string" && evidence.command.trim(), "verification_evidence.command 不能为空");
    ensure(evidence.result === "pass", `验证证据必须是本轮实际通过结果: ${evidence.kind ?? "unknown"}`);
    if (evidence.evidence_ref?.startsWith('maintenance:')) {
      ensure(typeof evidence.evidence_digest === 'string', '仓外维护证据必须绑定 evidence_digest');
      resolveMaintenanceReference(evidence.evidence_ref, { root: options.baseDir || root, digest: evidence.evidence_digest });
    }
    if (["focused-independent-review", "formal-independent-review"].includes(evidence.kind)) {
      validateMaintenanceReviewEvidence(evidence, options);
    }
    kinds.add(evidence.kind);
  }
  const legacyFormalL3 = data.intensity === "L3" && data.review_mode === "formal-independent";
  const reviewKind = legacyFormalL3 ? "formal-independent-review" : data.review_mode === "focused-independent" ? "focused-independent-review" : null;
  if (data.schema_version === 2) validateCheckpointState(data, kinds, reviewKind,options);
  const requiredEvidence = legacyFormalL3
    ? ["red", "green", "refactor", "pressure-scenario", "fresh-verification", "formal-independent-review"]
    : [...REQUIRED_EVIDENCE[data.intensity].filter((kind) => !(reviewKind && kind === "self-check")), ...(reviewKind ? [reviewKind] : [])];
  for (const required of requiredEvidence) {
    const pendingByV2State = data.schema_version === 2 && data.current_state !== "release-ready" && required === reviewKind;
    if ((options.allowPendingReview === true || pendingByV2State) && required === reviewKind) continue;
    ensure(kinds.has(required), `${data.intensity} 缺少 ${required} 证据`);
  }
  ensure(REVIEW_MODES[data.intensity].has(data.review_mode), `${data.intensity} 不允许 review_mode=${data.review_mode}`);
  if (!options.history) for (const trigger of data.triggers.filter(x => triggerLevels.counterexamples.includes(x))) {
    const records = data.verification_evidence.filter(x => x.kind === "counterexample" && x.trigger === trigger);
    ensure(records.length > 0, `${trigger} 缺少定向 counterexample 运行证据`);
    for (const evidence of records) validateCounterexample(evidence, { root: options.baseDir || root, trigger });
  }
  return { historical_only: options.history === true, execution_authorization: "not-evaluated", intensity: data.intensity, minimum_intensity: minimum, current_state: options.history ? "historical-only" : data.schema_version === 2 ? data.current_state : "release-ready" };
}

function validateCheckpointState(data, evidenceKinds, reviewKind,options) {
  const states = ["implementation-ready", "review-ready", "release-ready", "needs-human"];
  const targets = ["implementation-ready", "review-ready", "release-ready"];
  const profiles = ["fast", "candidate", "release"];
  ensure(targets.includes(data.target_state), "target_state 无效");
  ensure(states.includes(data.current_state), "current_state 无效");
  ensure(profiles.includes(data.verification_profile), "verification_profile 无效");
  ensure(Number.isInteger(data.review_round) && data.review_round >= 0 && data.review_round <= 2, "review_round 必须为 0、1 或 2");
  ensure(data.candidate_digest === null || /^(?:sha256:)?[a-f0-9]{64}$/.test(data.candidate_digest), "candidate_digest 必须为 null 或 SHA-256");
  const targetRank = targets.indexOf(data.target_state);
  const currentRank = targets.indexOf(data.current_state);
  if (data.current_state !== "needs-human") ensure(currentRank <= targetRank, "current_state 不得越过 target_state");

  if (data.current_state === "implementation-ready") {
    ensure(data.verification_profile === "fast", "implementation-ready 必须使用 fast profile");
    ensure(data.review_round === 0, "implementation-ready 的 review_round 必须为 0");
    ensure(data.candidate_digest === null, "implementation-ready 不得冻结 candidate_digest");
    return;
  }

  const selfCheck = ["self-check", "human-checkpoint"].includes(data.review_mode);
  if (!selfCheck) {
    ensure(data.candidate_digest !== null, `${data.current_state} 必须绑定 candidate_digest`);
    ensure(data.review_round >= 1, `${data.current_state} 的 review_round 必须为 1 或 2`);
    for (const required of ["candidate-verification", "initial-release-verification", "review-task-packages"]) {
      ensure(evidenceKinds.has(required), `${data.current_state} 缺少 ${required} 证据`);
    }
    validateReleaseVerificationCommand(data, "initial-release-verification",options);
  } else {
    ensure(data.review_round === 0, "维护者自检不需要审查轮次");
    ensure(data.candidate_digest === null, "维护者自检不得冻结 candidate_digest");
  }
  if (data.current_state === "review-ready") {
    if (selfCheck) {
      ensure(data.verification_profile === "fast", "维护者自检的 review-ready 必须使用 fast profile");
    } else {
      ensure(data.verification_profile === "candidate", "review-ready 必须使用 candidate profile");
    }
    return;
  }
  if (data.current_state === "needs-human") {
    ensure(data.target_state === "release-ready", "needs-human 必须保留 release-ready 目标");
    ensure(data.review_round === 2, "needs-human 只允许在第二轮审查后进入");
    ensure(["candidate", "release"].includes(data.verification_profile), "needs-human 必须来自 candidate 或 release profile");
    return;
  }
  ensure(data.verification_profile === "release", "release-ready 必须使用 release profile");
  ensure(evidenceKinds.has("final-release-verification"), "release-ready 缺少 final-release-verification 证据");
  validateReleaseVerificationCommand(data, "final-release-verification",options);
  if (reviewKind) ensure(evidenceKinds.has(reviewKind), `release-ready 缺少 ${reviewKind} 证据`);
}

function validateReleaseVerificationCommand(data, kind,options) {
  const evidence = data.verification_evidence.filter((item) => item.kind === kind);
  ensure(evidence.length === 1, `${kind} 必须恰好提供一条完整门禁证据`);
  ensure(evidence[0].command === "scripts/verify-template", `${kind}.command 必须为 scripts/verify-template`);
  if(!options.history)validateMaintenanceVerificationEvidence(evidence[0],{root:options.baseDir||root,expectedPlan:options.expectedPlan});
}

export function validateMaintenanceVerificationEvidence(evidence,{root:sourceRoot=root,expectedPlan}={}){
 ensure(readRepositoryMode(sourceRoot)==='template-source','project-instance 不支持模板维护发布证据');
 ensure(evidence.command==='scripts/verify-template','维护发布证据必须为 scripts/verify-template');
 ensure(Array.isArray(evidence.args)&&evidence.args.every(value=>typeof value==='string'),'维护发布证据缺少实际 args');
 ensure(evidence.exit_code===0,'维护发布证据缺少实际退出码');
 ensure(typeof evidence.evidence_ref==='string'&&/^(?:sha256:)?[a-f0-9]{64}$/.test(evidence.evidence_digest),'维护发布证据缺少报告引用或摘要');
 const file=evidence.evidence_ref.startsWith('maintenance:')?resolveMaintenanceReference(evidence.evidence_ref,{root:sourceRoot,digest:evidence.evidence_digest}):path.resolve(sourceRoot,evidence.evidence_ref);
 // Keep checkpoint validation synchronous without importing the source-only
 // execution graph while reading ordinary or historical task packages.
 const moduleUrl=new URL('../../.template-source/scripts/lib/verification-report-validator.mjs',import.meta.url).href;
 const bridge=`import fs from 'node:fs';import path from 'node:path';
 const input=JSON.parse(fs.readFileSync(0,'utf8'));
 try {const {compileExpectedVerificationPlan,validateVerificationReport,assertEvidenceFile}=await import(input.moduleUrl);
 assertEvidenceFile(input.file,path.dirname(input.file),input.evidence.evidence_digest);
 const report=JSON.parse(fs.readFileSync(input.file,'utf8'));
 const plan=input.expectedPlan||compileExpectedVerificationPlan({root:input.root,args:input.evidence.args,reportDirectory:path.dirname(input.file)});
 const verified=validateVerificationReport(report,{root:input.root,expectedPlan:plan,reportDirectory:path.dirname(input.file),expectedInvocation:{command:path.join(input.root,'scripts/run-template-verification'),args:['--profile','release',...input.evidence.args]},observedExitCode:input.evidence.exit_code});
 process.stdout.write(JSON.stringify({report,verified}));
 }catch(error){process.stderr.write(error.message);process.exitCode=1;}`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',bridge],{cwd:sourceRoot,encoding:'utf8',input:JSON.stringify({moduleUrl,root:sourceRoot,file,evidence,expectedPlan}),maxBuffer:16*1024*1024,timeout:30000});
 ensure(result.status===0&&!result.error,result.error?.message||result.stderr||'维护发布报告校验未完成');
 return JSON.parse(result.stdout);
}

export function loadMaintenanceCheckpoint(source) {
  const filename = typeof source === 'string' && source.startsWith('maintenance:') ? resolveMaintenanceReference(source, { root }) : source;
  const raw = source === "-" ? readFileSync(0, "utf8") : readFileSync(filename, "utf8");
  const document = parseDocument(raw, { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "checkpoint 无法解析");
  return document.toJS({ maxAliasCount: 0 });
}
