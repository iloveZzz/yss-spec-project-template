import { applyDailyVerificationSelection, verificationCheckId } from './verification-selection.mjs';
import {buildReleasePlan, compileVerificationCheck, verificationPolicyDigest} from '../../.template-source/scripts/lib/verification-gates.mjs';
import {assertBaselineParameters,validateBaseline} from '../../.template-source/scripts/lib/verification-baseline.mjs';
import {assertVerificationSources,verificationSourceIdentities} from '../../.template-source/scripts/lib/verification-execution-plan.mjs';
import {STEPS,ciVerificationCheckIds} from './ci-gate.mjs';
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PROFILE_FILE = path.join(ROOT, ".template-source/process/template-verification-profiles.yaml");

function fail(message) { throw new TypeError(message); }
function ensure(condition, message) { if (!condition) fail(message); }

function globRegex(pattern) {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

function matches(file, pattern) { const expression=globRegex(pattern);return verificationSourceIdentities(file).some(ref=>expression.test(ref)); }

export function loadVerificationProfiles(source = readFileSync(PROFILE_FILE, "utf8")) {
  const document = parseDocument(source, { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "核验 profile 无法解析");
  const config = document.toJS({ maxAliasCount: 0 });
  ensure(config?.schema_version === 1, "核验 profile schema_version 必须为 1");
  ensure(config.profiles?.fast && config.profiles?.release && Object.keys(config.profiles).every(name=>['fast','release'].includes(name)), "必须只声明 fast、release profile");
  ensure(config.groups && typeof config.groups === "object", "核验 profile 缺少 groups");
  for (const rule of config.routing || []) {
    for (const field of ["patterns", "exclude_patterns", "groups"]) {
      if (rule[field] !== undefined) ensure(Array.isArray(rule[field]) && rule[field].every((value) => typeof value === "string" && value), `路由 ${field} 无效`);
    }
  }
  for (const [name, group] of Object.entries(config.groups)) {
    ensure(Array.isArray(group.commands), `检查组 ${name} 缺少 commands`);
    for (const entry of group.commands) {
      if (typeof entry === "string") continue;
      ensure(entry && typeof entry === "object", `检查组 ${name} 包含无效命令`);
      if(entry.id!==undefined)ensure(/^check\.[a-zA-Z0-9._-]+$/.test(entry.id),`检查组 ${name} 的 id 无效`);
      if(entry.inputs_complete!==undefined)ensure(typeof entry.inputs_complete==='boolean',`检查组 ${name} 的 inputs_complete 无效`);
      if(entry.require_committed_for!==undefined)ensure(Array.isArray(entry.require_committed_for)&&entry.require_committed_for.every(value=>value==='release'),`检查组 ${name} 的 require_committed_for 无效`);
      if (entry.lane !== undefined) ensure(typeof entry.lane === "string" && entry.lane, `检查组 ${name} 的 lane 无效`);
      for (const field of ["resources", "parallel_unless_env", "input_patterns", "depends_on"]) {
        if (entry[field] !== undefined) ensure(Array.isArray(entry[field]) && entry[field].every((value) => typeof value === "string" && value), `检查组 ${name} 的 ${field} 无效`);
      }
    }
  }
  if(config.supplemental_checks!==undefined) {
    ensure(Array.isArray(config.supplemental_checks),'补充检查必须为数组');
    const ids=new Set();
    for(const item of config.supplemental_checks) {
      ensure(item&&/^check\.[a-zA-Z0-9._-]+$/.test(item.id)&&!ids.has(item.id)&&typeof item.run==='string'&&item.run&&typeof item.group==='string'&&item.group&&Array.isArray(item.gate_ids)&&item.gate_ids.length&&item.gate_ids.every(id=>config.gates?.some(gate=>gate.id===id)), '补充检查定义或 Gate 绑定无效');
      ids.add(item.id);
    }
  }
  return config;
}

function matchedGroups(config, changedFiles) {
  const groups = new Set();
  const unknown = [];
  for (const file of changedFiles) {
    let routed = false;
    for (const rule of config.routing || []) {
      if ((rule.patterns || []).some((pattern) => matches(file, pattern)) &&
          !(rule.exclude_patterns || []).some((pattern) => matches(file, pattern))) {
        routed = true;
        for (const group of rule.groups || []) groups.add(group);
      }
    }
    if (!routed) unknown.push(file);
  }
  return { groups, unknown };
}

export function planTemplateVerification({ profile = "fast", changedFiles = [], config = loadVerificationProfiles(), selection, root = ROOT, base, baselineReport, baselineReportDigest, baselineAssessment, baselineValidator, qualificationReport, qualificationReportDigest, qualificationAssessment, ciGuards = false, includeSlow } = {}) {
  includeSlow??=process.env.YSS_VERIFY_SLOW==='only'?'only':process.env.YSS_VERIFY_SLOW==='1';
  ensure(!ciGuards||(profile==='fast'&&includeSlow!=='only'&&(!selection||selection==='allowlist')),'CI_GUARDS_FAST_ONLY');
  ensure([false,true,'only'].includes(includeSlow),'includeSlow 无效');
  ensure(['fast','release'].includes(profile)&&Object.hasOwn(config.profiles, profile), `未知核验 profile: ${profile}`);
  assertBaselineParameters({root,base,baselineReport,baselineReportDigest});
  if(baselineReport!==undefined) {
    const checked=validateBaseline({root,base,baselineReport,baselineReportDigest,assessment:baselineAssessment,validator:baselineValidator,policyDigest:verificationPolicyDigest(config)});
    ensure(checked.valid,`BASELINE_REPORT_INVALID: ${checked.reasons.join(', ')}`);
  }
  ensure(qualificationReport===undefined&&qualificationReportDigest===undefined&&qualificationAssessment===undefined,'QUALIFICATION_RETIRED');
  ensure(Array.isArray(changedFiles), "changedFiles 必须是数组");
  const normalized = [...new Set(changedFiles.map((file) => file.replaceAll("\\", "/")).filter(Boolean))].sort();
  ensure(normalized.every(file=>!path.posix.isAbsolute(file)&&!file.split('/').includes('..')), 'VERIFICATION_CHANGED_PATH_INVALID');
  const routed = matchedGroups(config, normalized);
  ensure(routed.unknown.length===0, `UNKNOWN_VERIFICATION_PATH: 未映射路径必须登记: ${routed.unknown.join(', ')}`);
  const effectiveProfile = profile, escalationReason = null;
  const daily=profile==='fast';
  if(daily)ensure(Array.isArray(config.profiles.fast.checks),'INCOMPLETE_VERIFICATION_INPUTS: fast checks 缺失');
  selection??=daily?'allowlist':'impact';
  if(!daily)ensure(selection==='impact','RELEASE_SELECTION_REFUSED');
  const groups = new Set();
  if (config.profiles[effectiveProfile].all_groups) Object.keys(config.groups).forEach((group) => groups.add(group));
  else {
    (config.profiles[effectiveProfile].always_groups || []).forEach((group) => groups.add(group));
    routed.groups.forEach((group) => groups.add(group));
  }
  const orderedGroups = Object.keys(config.groups).filter((group) => groups.has(group));
  const commands = [];
  for (const group of orderedGroups) {
    for (const entry of config.groups[group].commands) {
      commands.push(compileVerificationCheck(entry,{group,profile}));
    }
  }
  const compatibilityRequired = effectiveProfile === "release" || normalized.some((file) => (config.compatibility_patterns || []).some((pattern) => matches(file, pattern)));
  const plan = { source_requirement: profile === 'fast' ? 'current' : 'committed', compatibility_required: compatibilityRequired, requested_profile: profile, effective_profile: effectiveProfile, escalation_reason: escalationReason, changed_files: normalized, unknown_files: routed.unknown, groups: orderedGroups, commands, supplemental_checks:structuredClone(config.supplemental_checks||[]), required_files: config.required_files || [], syntax_files: config.syntax_files || [], max_concurrency: config.max_concurrency || 4 };
  // YSS_VERIFY_SLOW=1：fast 也执行命中的 tier: slow 检查；=only：只执行全部 tier: slow 检查（定时或按需）。
  if(ciGuards)for(const step of STEPS.filter(step=>step.verification_check_id)){
    const raw=config.profiles.fast.checks.find(check=>check.id===step.verification_check_id);
    const definition=Object.values(config.groups).flatMap(group=>group.commands).find(item=>verificationCheckId(typeof item==='string'?{run:item}:item)===step.verification_check_id);
    ensure(raw&&compileVerificationCheck({...definition,...raw},{profile}).command===step.command.join(' '),`CI_GUARD_BINDING: ${step.id}`);
  }
  if(daily)return {...applyDailyVerificationSelection(plan,{selection,config,includeSlow,mandatoryChecks:ciGuards?ciVerificationCheckIds():[],mandatoryReason:'ci-required'}),compatibility_required:false,policy_digest:verificationPolicyDigest(config),fallback_reasons:[]};
  const mandatory=(config.gates||[]).filter(g=>g.required_at_release&&g.execution_scope==='template-verification').flatMap(g=>g.check_ids);
  return buildReleasePlan(applyDailyVerificationSelection(plan,{selection:'allowlist',config,profile:'release',mandatoryChecks:mandatory}),{config});
}

export function assertRequiredFiles(plan, root = ROOT) {
  assertVerificationSources(plan,root);
}
