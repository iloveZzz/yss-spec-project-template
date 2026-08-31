import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadDigitalHumanRoles, taskPackageDefaults } from "./digital-human-roles.mjs";
import { loadRegistry, ROOT } from "./lifecycle-registry.mjs";
import { loadMaintenanceCheckpoint, validateMaintenanceCheckpoint } from "./maintenance-intensity.mjs";
import { validateNextRoute } from "./lifecycle-transition.mjs";
import { harnessProfileContract } from "./harness-profile.mjs";

export const TASK_PACKAGE_SCHEMA = path.join(ROOT, "docs/process/schemas/digital-human-task-package.schema.json");
export const LEGACY_TASK_PACKAGE_SCHEMA = path.join(ROOT, "docs/process/schemas/subagent-task-package.schema.json");
export const TASK_PACKAGE_REGISTRY_REF = "docs/agents/digital-human-roles.yaml";
export const CONTRACT_KINDS = new Set(["lifecycle-work-unit", "slice-implementation", "template-maintenance"]);
export const EXECUTION_STATES = new Set(["Explorer", "Drafter", "Worker", "Reviewer", "Verifier"]);
export const WORKFLOW_STATUSES = new Set(["not-started", "active", "paused", "resolved", "failed"]);

function fail(message) { throw new TypeError(message); }
function requireString(value, field) { if (typeof value !== "string" || !value.trim()) fail(`${field} 不能为空`); }
function equalArrays(actual, expected) { return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]); }

function parseYaml(source, label) {
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length > 0) fail(`无法解析${label}: ${document.errors[0].message}`);
  return document.toJS({ maxAliasCount: 0 });
}

function assertSafeRelativePath(value, field) {
  requireString(value, field);
  if (path.isAbsolute(value)) fail(`${field} 必须是仓库相对路径`);
  const resolved = path.resolve(ROOT, value);
  const relative = path.relative(ROOT, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) fail(`${field} 不得越出仓库根目录`);
  return resolved;
}

function assertReadableEvidenceRef(value, field) {
  requireString(value, field);
  if (/^https?:\/\//.test(value)) return;
  const evidencePath = assertSafeRelativePath(value, field);
  if (!existsSync(evidencePath)) fail(`${field} 不可读: ${value}`);
}

export function loadTaskPackage(filePath) {
  const sourcePath = path.resolve(filePath);
  if (!existsSync(sourcePath)) fail(`任务包不存在: ${filePath}`);
  const value = parseYaml(readFileSync(sourcePath, "utf8"), "任务包");
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("任务包必须是对象");
  return { value, sourcePath };
}

export function validateTaskPackageSchema(value, schemaPath = TASK_PACKAGE_SCHEMA) {
  const effectiveSchema = path.resolve(schemaPath) === path.resolve(LEGACY_TASK_PACKAGE_SCHEMA) ? TASK_PACKAGE_SCHEMA : schemaPath;
  if (!existsSync(effectiveSchema)) fail(`缺少任务包 schema: ${effectiveSchema}`);
  const validator = String.raw`
import json
import sys
from jsonschema import Draft202012Validator
schema = json.load(open(sys.argv[1], encoding="utf-8"))
value = json.load(sys.stdin)
errors = sorted(Draft202012Validator(schema).iter_errors(value), key=lambda error: list(error.absolute_path))
for error in errors:
    location = ".".join(str(part) for part in error.absolute_path) or "<root>"
    print(f"{location}: {error.message}", file=sys.stderr)
sys.exit(1 if errors else 0)
`;
  const result = spawnSync("python3", ["-c", validator, effectiveSchema], { cwd: ROOT, encoding: "utf8", input: JSON.stringify(value) });
  if (result.status !== 0) fail(`${result.stdout}${result.stderr}`.trim());
}

function validateSkillSource(value, registry) {
  const defaults = taskPackageDefaults(value.role_id, registry);
  if (value.skill_source.registry_ref !== TASK_PACKAGE_REGISTRY_REF) fail(`skill_source.registry_ref 必须为 ${TASK_PACKAGE_REGISTRY_REF}`);
  if (value.skill_source.defaults_ref !== `taskPackageDefaults(${value.role_id})`) fail(`skill_source.defaults_ref 必须为 taskPackageDefaults(${value.role_id})`);
  if (!equalArrays(value.skill_source.core_skills, defaults.core_skills)) fail("skill_source.core_skills 必须与角色注册表完全一致");
  if (!equalArrays(value.skill_source.forbidden_skills, defaults.forbidden_skills)) fail("skill_source.forbidden_skills 必须与角色注册表完全一致");
}

function validateCommon(value, registry, lifecycle) {
  const workUnit = lifecycle.work_units.find((item) => item.id === value.work_unit_id);
  if (!workUnit && value.contract.kind !== "slice-implementation") fail(`未知 work_unit_id: ${value.work_unit_id}`);
  const roleDefaults = taskPackageDefaults(value.role_id, registry);
  if (value.profile_id && value.profile_id !== harnessProfileContract.profile_id) fail(`未知 profile_id: ${value.profile_id}`);
  const runtimeIds = new Set((registry.runtimes || []).map((runtime) => runtime.id));
  if (!runtimeIds.has(value.runtime_id)) fail(`未知 runtime_id: ${value.runtime_id}`);
  if (!EXECUTION_STATES.has(value.execution_state)) fail(`execution_state 无效: ${value.execution_state}`);
  if (!WORKFLOW_STATUSES.has(value.workflow_status)) fail(`workflow_status 无效: ${value.workflow_status}`);
  if (value.stage_id) {
    if (!lifecycle.stages.some((stage) => stage.id === value.stage_id)) fail(`未知 stage_id: ${value.stage_id}`);
    if (!roleDefaults.stages.includes(value.stage_id)) fail(`role_id 未覆盖 stage_id: ${value.role_id} -> ${value.stage_id}`);
  }
  validateSkillSource(value, registry);
  for (const allowed of value.allowed_write_paths) assertSafeRelativePath(allowed, "allowed_write_paths 条目");
  if (value.execution_state === "Reviewer" && value.review_context.implementation_actor_id === value.actor_id) fail("Reviewer 必须与实现者使用不同 actor_id");
  const commands = new Set(value.verification_commands);
  for (const result of value.verification_results) {
    if (!commands.has(result.command)) fail(`verification_results 命令未声明: ${result.command}`);
    assertReadableEvidenceRef(result.evidence_ref, "verification_results.evidence_ref");
  }
  const completed = value.workflow_status === "resolved" || value.result?.result === "completed";
  if (completed) {
    if (!value.result || value.result.result !== "completed") fail("resolved/完成任务必须返回 result=completed 的 Workflow Execution Result");
    if (value.workflow_status !== "resolved") fail("result=completed 的任务包必须处于 resolved 状态");
    for (const field of ["result_schema", "work_unit", "workflow_reference", "skill", "changed_files", "evidence_refs", "deferred_seams", "drift", "violation", "new_impacts", "stale_candidates", "next_route", "blocking_signals"]) {
      if (value.result[field] === undefined) fail(`result=completed 时 ${field} 不能为空`);
    }
    if (value.result.result_schema !== "workflow-execution-result-v1") fail("result_schema 必须为 workflow-execution-result-v1");
    if (value.result.work_unit !== value.work_unit_id) fail("Workflow Execution Result.work_unit 必须与任务包 work_unit_id 一致");
    const routeResult = validateNextRoute(value.result.work_unit, value.result.next_route, { profileId: value.profile_id || value.result.profile_id });
    if (routeResult.result !== "allowed") fail(`Workflow Execution Result next_route 非法: ${routeResult.blocking_signals.join(", ")}`);
    value.expected_evidence_files.forEach((ref) => assertReadableEvidenceRef(ref, "expected_evidence_files"));
    if (value.verification_results.length === 0) fail("已完成任务必须包含 verification_results");
    if (value.verification_results.some((result) => result.exit_code !== 0)) fail("已完成任务的验证命令必须全部成功");
    const resultCommands = new Set(value.verification_results.map((result) => result.command));
    if (value.verification_commands.some((command) => !resultCommands.has(command))) fail("已完成任务必须覆盖全部 verification_commands");
  }
  if (value.result) {
    for (const field of ["new_impacts", "stale_candidates", "blocking_signals", "drift", "violation"]) {
      if (value.result.result === "completed" && Array.isArray(value.result[field]) && value.result[field].length > 0) fail(`result=completed 时 ${field} 必须为空`);
    }
    if (value.result.result === "completed") {
      if (!Array.isArray(value.result.evidence_refs) || value.result.evidence_refs.length === 0) fail("result=completed 时 evidence_refs 不能为空");
      value.result.evidence_refs.forEach((ref) => assertReadableEvidenceRef(ref, "result.evidence_refs"));
    }
    if (Array.isArray(value.result.changed_files)) {
      for (const changed of value.result.changed_files) {
        const changedPath = assertSafeRelativePath(changed, "changed_files 条目");
        if (!value.allowed_write_paths.some((allowed) => {
          const allowedPath = assertSafeRelativePath(allowed, "allowed_write_paths 条目");
          const relative = path.relative(allowedPath, changedPath);
          return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
        })) fail(`changed_files 超出 allowed_write_paths: ${changed}`);
      }
    }
  }
  return workUnit;
}

function validateContract(value, registry, lifecycle) {
  const contract = value.contract;
  const implementationWorkUnit = "work-unit.slice-implementation";
  const workUnit = lifecycle.work_units.find((item) => item.id === value.work_unit_id);
  if (!CONTRACT_KINDS.has(contract.kind)) fail(`未知 contract.kind: ${contract.kind}`);
  if (!new Set(["issued", "stale", "blocked"]).has(contract.status)) fail(`contract.status 无效: ${contract.status}`);
  if (contract.status === "stale" && value.workflow_status !== "paused") fail("stale 任务包必须暂停，待主控重新路由");
  assertReadableEvidenceRef(contract.contract_ref, "contract.contract_ref");
  if (contract.kind === "lifecycle-work-unit") {
    if (value.work_unit_id === implementationWorkUnit || value.convergence.parent_work_unit === implementationWorkUnit) {
      fail("lifecycle-work-unit 不得冒充垂直切片实现任务；实现任务必须使用 slice-implementation");
    }
    if (workUnit?.scope === "template-source") fail("template-source 工作单元必须使用 template-maintenance");
    if (contract.slice_contract_ref || contract.maintenance_ref) fail("lifecycle-work-unit 不得携带专项合同引用");
    assertReadableEvidenceRef(contract.lifecycle_ref, "contract.lifecycle_ref");
    return;
  }
  if (contract.kind === "template-maintenance") {
    if (contract.slice_contract_ref || contract.lifecycle_ref) fail("template-maintenance 不得携带其他合同引用");
    const checkpointPath = assertSafeRelativePath(contract.maintenance_ref, "contract.maintenance_ref");
    if (!existsSync(checkpointPath)) fail(`维护 checkpoint 不存在: ${contract.maintenance_ref}`);
    validateMaintenanceCheckpoint(loadMaintenanceCheckpoint(contract.maintenance_ref));
    if (lifecycle.work_units.find((item) => item.id === value.work_unit_id)?.scope !== "template-source") fail("template-maintenance 必须绑定 template-source work unit");
    return;
  }
  if (contract.lifecycle_ref || contract.maintenance_ref) fail("slice-implementation 不得携带其他合同引用");
  if (!/^stage\.vertical-slice-implementation$/.test(value.stage_id)) fail("slice-implementation 必须绑定垂直切片实现阶段");
  if (value.convergence.parent_work_unit !== implementationWorkUnit) fail("slice-implementation 必须汇合到 work-unit.slice-implementation");
  if (/^https?:\/\//.test(contract.slice_contract_ref)) fail("slice_contract_ref 必须引用本地已持久化的 Slice Implementation Contract");
  const contractPath = assertSafeRelativePath(contract.slice_contract_ref, "contract.slice_contract_ref");
  if (!existsSync(contractPath)) fail(`Slice Implementation Contract 不存在: ${contract.slice_contract_ref}`);
  const document = parseYaml(readFileSync(contractPath, "utf8"), "Slice Implementation Contract");
  const slice = document.slice_contract || document;
  if (slice.schema_version !== 1 || typeof slice.slice_id !== "string" || !slice.lifecycle_refs || !slice.readiness || !Array.isArray(slice.work_units)) fail("Slice Implementation Contract 缺少 schema_version/slice_id/lifecycle_refs/readiness/work_units");
  if (slice.contract_id !== contract.contract_id || slice.contract_version !== contract.contract_version || slice.status !== "approved") fail("Slice Contract 必须是当前 approved 版本");
  const sliceUnit = slice.work_units.find((item) => item && item.id === value.work_unit_id);
  if (!sliceUnit) fail(`Slice Implementation Contract 缺少 work_unit_id: ${value.work_unit_id}`);
  for (const field of ["role_id", "runtime_id", "task_package_ref", "contract_id", "contract_version", "allowed_write_paths"]) if (sliceUnit[field] === undefined) fail(`Slice Contract work_unit 缺少 ${field}`);
  if (sliceUnit.role_id !== value.role_id || sliceUnit.runtime_id !== value.runtime_id || sliceUnit.contract_id !== contract.contract_id || sliceUnit.contract_version !== contract.contract_version || sliceUnit.task_package_ref !== value.work_unit_id) fail("任务包与 Slice Contract work_unit 不一致");
  for (const allowed of value.allowed_write_paths) if (!sliceUnit.allowed_write_paths.includes(allowed)) fail(`allowed_write_paths 未获 Slice Contract 授权: ${allowed}`);
}

export function validateTaskPackage(value, { rolesDoc, lifecycleDoc } = {}) {
  validateTaskPackageSchema(value);
  const registry = rolesDoc || loadDigitalHumanRoles();
  const lifecycle = lifecycleDoc || loadRegistry();
  validateCommon(value, registry, lifecycle);
  validateContract(value, registry, lifecycle);
  return value;
}

export function generateTaskPackageDefaults(roleId, overrides = {}, { rolesDoc } = {}) {
  const defaults = taskPackageDefaults(roleId, rolesDoc || loadDigitalHumanRoles());
  return {
    schema_version: 1,
    role_id: defaults.role_id,
    skill_source: {
      registry_ref: TASK_PACKAGE_REGISTRY_REF,
      defaults_ref: `taskPackageDefaults(${roleId})`,
      core_skills: defaults.core_skills,
      forbidden_skills: defaults.forbidden_skills
    },
    ...overrides
  };
}

export function validateTaskPackageSet(packages, options = {}) {
  if (!Array.isArray(packages) || packages.length === 0) fail("任务包集合不能为空");
  packages.forEach((pkg) => validateTaskPackage(pkg, options));
  const slicePackages = packages.filter((pkg) => pkg.contract.kind === "slice-implementation");
  if (slicePackages.length > 0) {
    const contracts = new Set(slicePackages.map((pkg) => `${pkg.contract.contract_id}@${pkg.contract.contract_version}`));
    if (contracts.size !== 1) fail("同一切片的任务包必须消费同一 contract_id/contract_version");
    const workers = new Set(slicePackages.filter((pkg) => pkg.execution_state === "Worker").map((pkg) => pkg.actor_id));
    slicePackages.filter((pkg) => pkg.execution_state === "Reviewer").forEach((pkg) => { if (workers.has(pkg.actor_id)) fail("Reviewer 不得与实现者使用同一 actor_id"); });
  }
  return packages;
}
