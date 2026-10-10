import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { STEPS } from "./ci-gate.mjs";
import { resolveMaintenanceOutput } from "./maintenance-storage.mjs";

/** 设为 off 时跳过本次检查；跳过会写入仓外 bypass 记录并在输出中声明。 */
export const SKIP_ENV = "YSS_AGENT_HOOK";
const CHECK_TIMEOUT_MS = 60_000;
const OUTPUT_LINES = 12;

const APPROVAL_RECORD = {
  id: "approval-record",
  title: "批准记录结构",
  fix: "按日志补齐批准记录；形状见 .template-spec/templates/approval-record-template.yaml",
};

const stepById = new Map(STEPS.map((step) => [step.id, step]));

/** 检查的标题、命令与修复建议都取自 ci-gate 的 STEPS，hook 只决定“哪些路径触发哪些步骤”。 */
function stepCheck(id, extra = {}) {
  const step = stepById.get(id);
  if (!step || !Array.isArray(step.command)) throw new Error(`agent-hook 规则引用了不存在或非命令的 ci-gate 步骤: ${id}`);
  return { id, title: step.title, command: step.command, fix: step.fix, ...extra };
}

const SKILL_FILES = /^(?:\.[^/]+\/skills\/|skills-lock\.json$)/;
const SKILL_REGISTRY = /^\.template-spec\/agents\/yss-skill-registry\.yaml$/;
const LIFECYCLE_FILES = /^\.template-spec\/process\/(?:lifecycle-registry\.yaml|lifecycle-registry-baseline(?:-v1)?\.json|lifecycle-artifact-map\.md|schemas\/lifecycle-registry\.schema\.json)$/;
const APPROVAL_FILES = /^\.work\/.+\/gates\/[^/]+-approval\.(?:ya?ml|json)$/;
const CODEX_FILES = /^(?:submodules\/[^/]+\/)?\.codex\//;

/**
 * 路径 → 检查。只放毫秒级的检查；fast、candidate 与全量验证属于 ci-gate，不在这里。
 * 投影根用 `.<运行时>/skills/` 的形状匹配，投影根增减时无需改这里。
 */
export const RULES = [
  { id: "skills", match: (file) => SKILL_FILES.test(file) || SKILL_REGISTRY.test(file), checks: () => [stepCheck("sync-skills"), stepCheck("skill-lock")] },
  { id: "skill-registry", match: (file) => SKILL_REGISTRY.test(file), checks: () => [stepCheck("skill-registry")] },
  { id: "lifecycle-registry", match: (file) => LIFECYCLE_FILES.test(file), checks: () => [stepCheck("lifecycle-registry")] },
  {
    id: "approval-record",
    match: (file) => APPROVAL_FILES.test(file),
    // 当前批准需要调用方给出 checkpoint；hook 不知道它，只做结构校验，不放行任何执行或发布。
    checks: (files) => files.map((file) => ({ ...APPROVAL_RECORD, command: ["scripts/verify-approval-record", "--history", file], target: file })),
  },
  { id: "agent-config", match: (file) => CODEX_FILES.test(file), checks: () => [stepCheck("agent-config")] },
];

/** 读取工作区相对 HEAD 的全部变更（已暂存、未暂存、未跟踪），重命名同时返回新旧路径。读取失败返回 null。 */
export function changedPaths(root) {
  const result = spawnSync("git", ["-C", root, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=all"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) return null;
  const entries = result.stdout.split("\0");
  const paths = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.length < 4) continue;
    paths.add(entry.slice(3));
    if (/[RC]/.test(entry.slice(0, 2))) {
      index += 1;
      if (entries[index]) paths.add(entries[index]);
    }
  }
  return [...paths].sort();
}

/** 把变更路径映射为去重后的检查列表；没有相关路径时返回空数组。 */
export function selectChecks(paths) {
  const selected = new Map();
  for (const rule of RULES) {
    const matched = paths.filter((file) => rule.match(file));
    if (matched.length === 0) continue;
    for (const check of rule.checks(matched)) {
      const key = check.command.join("\0");
      if (!selected.has(key)) selected.set(key, check);
    }
  }
  return [...selected.values()];
}

export function parsePayload(text) {
  if (!text || !text.trim()) return {};
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/** 取 cwd 所在仓库的顶层目录；cwd 不在 Git 仓库内时返回 null。 */
export function repositoryRoot(cwd) {
  const result = spawnSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function runCheck(root, check, env) {
  const script = path.join(root, check.command[0]);
  if (!existsSync(script)) return { ...summary(check), status: "skipped", reason: `缺少 ${check.command[0]}` };
  const started = Date.now();
  const result = spawnSync(script, check.command.slice(1), { cwd: root, env, encoding: "utf8", timeout: CHECK_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
  const timedOut = result.error?.code === "ETIMEDOUT";
  const exitCode = result.status ?? (timedOut ? 124 : 127);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error && !timedOut ? `${result.error.message}\n` : ""}`.trim();
  return { ...summary(check), status: exitCode === 0 ? "passed" : "failed", exit_code: exitCode, duration_ms: Date.now() - started, ...(timedOut ? { reason: `超过 ${CHECK_TIMEOUT_MS / 1000}s` } : {}), output };
}

function summary(check) {
  return { id: check.id, title: check.title, command: check.command.join(" "), fix: check.fix };
}

function indent(text) {
  return text.split("\n").slice(0, OUTPUT_LINES).map((line) => `    ${line}`).join("\n");
}

export function formatFailures(failures) {
  const blocks = failures.map((item) => [
    `- ${item.title}（${item.command}）${item.reason ? `：${item.reason}` : ""}`,
    item.output ? indent(item.output) : null,
    `  修复：${item.fix}`,
  ].filter(Boolean).join("\n"));
  return [
    "agent-hook：以下检查未通过，请先修复再结束本轮：",
    ...blocks,
    `临时跳过：以 ${SKIP_ENV}=off 启动会话（跳过会被记录）。`,
  ].join("\n");
}

function writeReport(root, env, name, write) {
  try {
    const target = resolveMaintenanceOutput(`maintenance:agent-hook/${name}`, { root, home: env.YSS_RUNTIME_HOME });
    mkdirSync(path.dirname(target), { recursive: true });
    write(target);
    return target;
  } catch {
    return null; // 报告是尽力而为：非模板源仓库或存储不可用时不影响 hook 结论
  }
}

/**
 * 处理一次 Stop 事件。返回 { exitCode, stdout, stderr }：
 * - 无相关变更：0，无任何输出（Codex 要求 Stop 在 stdout 只输出 JSON 或为空）。
 * - 检查失败：2，原因写 stderr，两个运行时都据此阻止结束并把原因交给 agent。
 * - stop_hook_active 且仍失败：0，用 systemMessage 声明仍有问题。同一条件不连续阻断，避免 agent 无法结束会话；后续由 ci-gate 兜底。
 */
export function runHook({ root, payload = {}, env = process.env, clock = () => new Date() }) {
  const started = Date.now();
  const stamp = clock().toISOString();
  if (env[SKIP_ENV] === "off") {
    writeReport(root, env, "bypass.jsonl", (target) => appendFileSync(target, `${JSON.stringify({ at: stamp, root, session_id: payload.session_id ?? null })}\n`));
    return { exitCode: 0, stdout: `${JSON.stringify({ systemMessage: `agent-hook 已按 ${SKIP_ENV}=off 跳过本次检查，已记录。` })}\n`, stderr: "" };
  }
  const paths = changedPaths(root);
  if (paths === null) return { exitCode: 0, stdout: "", stderr: "" };
  const checks = selectChecks(paths);
  if (checks.length === 0) return { exitCode: 0, stdout: "", stderr: "" };

  const results = checks.map((check) => runCheck(root, check, env));
  const failures = results.filter((item) => item.status === "failed");
  const released = failures.length > 0 && payload.stop_hook_active === true;
  writeReport(root, env, "last-run.json", (target) => writeFileSync(target, `${JSON.stringify({
    at: stamp,
    root,
    session_id: payload.session_id ?? null,
    changed_paths: paths.length,
    status: failures.length === 0 ? "passed" : released ? "released-after-block" : "blocked",
    duration_ms: Date.now() - started,
    checks: results.map(({ output, ...rest }) => rest),
  }, null, 2)}\n`));

  if (failures.length === 0) return { exitCode: 0, stdout: "", stderr: "" };
  const message = formatFailures(failures);
  if (released) {
    return { exitCode: 0, stdout: `${JSON.stringify({ systemMessage: `${message}\n（已在上一次阻断后再次结束，本次放行；合入前 ci-gate 仍会拦截。）` })}\n`, stderr: "" };
  }
  return { exitCode: 2, stdout: "", stderr: `${message}\n` };
}
