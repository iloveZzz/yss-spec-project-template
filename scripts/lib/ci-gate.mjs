import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveMaintenanceOutput } from "./maintenance-storage.mjs";

const MODES = ["pr", "push"];
const FULL_SHA = /^[0-9a-f]{40}$/;
/** 重步骤在任一前置步骤失败时跳过：先把便宜的失败原因交给作者，不在已知失败的候选上空耗数分钟。 */
const SKIPPED_AFTER_FAILURE = "前置步骤失败，已跳过";

/**
 * ci-gate 的步骤列表。后续工作包只在这里追加数组项，不改执行逻辑。
 * - command：相对仓库根的命令；重步骤用函数按模式生成。
 * - run：进程内检查，返回 { ok, lines }。
 * - fix：失败时打印的修复建议，优先写可直接运行的命令。
 * - modes：只在列出的模式下执行，缺省为两种模式都执行。
 * - blocking：false 时失败只记录、不影响退出码。
 * - context.scopeBase：fast 的变更范围基准。PR 模式是目标分支 SHA；推送模式是 HEAD^（合并提交的第一亲本即上一个主分支顶点）。
 *   干净检出且不带 --base 时 fast 的变更文件数为 0，只会空过，所以必须带基准。
 */
export const STEPS = [
  {
    id: "agent-config",
    title: "Agent 配置安全",
    command: ["scripts/verify-agent-config"],
    fix: "从仓库删除关闭沙箱或审批的 Codex 项目配置；本机偏好放在用户级 ~/.codex/config.toml",
  },
  {
    id: "sync-skills",
    title: "技能投影与 canonical 一致",
    command: ["scripts/sync-skills", "--check"],
    fix: "scripts/sync-skills",
  },
  {
    id: "skill-lock",
    title: "技能锁与分发内容一致",
    command: ["scripts/update-skill-lock", "--check"],
    fix: "scripts/update-skill-lock",
  },
  {
    id: "lifecycle-registry",
    title: "生命周期注册表",
    command: ["scripts/verify-lifecycle-registry"],
    fix: "按日志修正 lifecycle-registry.yaml；派生产物过期时运行 scripts/generate-lifecycle-artifacts；缺 jsonschema 时运行 scripts/ci-setup",
  },
  {
    id: "skill-registry",
    title: "技能路由注册表",
    command: ["scripts/verify-skill-registry"],
    fix: "按日志修正 .template-spec/agents/yss-skill-registry.yaml",
  },
  {
    id: "doc-facts",
    title: "说明文档事实",
    command: ["scripts/verify-doc-facts"],
    fix: "改为链接权威资产，不在说明文档复述数量或 revision（模式表见 scripts/lib/doc-facts-patterns.json）",
  },
  {
    id: "node-engines",
    title: "Node 版本声明一致",
    run: (context) => runNodeEnginesCheck(context.root),
    fix: "让 package.json 的 engines.node、.nvmrc 与 scripts/ci-setup 的 YSS_CI_NODE_MAJOR 落在同一受支持范围",
  },
  {
    id: "verify-template",
    title: "模板验证（fast，按变更范围）",
    heavy: true,
    command: (context) => ["scripts/verify-template-fast", ...(context.scopeBase ? ["--base", context.scopeBase] : []), "--report-dir", path.join(context.reportDir, "verification")],
    fix: "查看该步骤日志与 verification 报告中第一个失败的检查；本地用同一命令复现",
  },
  {
    id: "verify-candidate",
    title: "候选验证（非阻断）",
    heavy: true,
    modes: ["pr"],
    // 规格风险表：candidate 依赖固定 yss 二进制，其 Bundle 逐提交绑定来源，托管 runner 上无法对新提交通过；
    // 先以 fast 为必需检查、candidate 只记录，按 NFR-002 基线与 Q-008 再决定是否转为必需。
    blocking: false,
    command: (context) => ["scripts/verify-template-candidate", "--base", context.base, "--report-dir", path.join(context.reportDir, "candidate")],
    fix: "非阻断：需要固定 yss 二进制（scripts/ci-setup --yss-commit），且其 Bundle 必须绑定被验证提交；见执行计划第 6 节 2026-10-11 记录",
  },
];

// ---------------------------------------------------------------------------
// Node 版本声明（FR-009）
// ---------------------------------------------------------------------------

const RANGE_TOKEN = /^(>=|<=|>|<|=|\^)?v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/;
const CI_SETUP_NODE = /^YSS_CI_NODE_MAJOR="\$\{YSS_CI_NODE_MAJOR:-(\d+)\}"$/m;

function compareTuple(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function boundsOf(match, token, range) {
  const parts = [match[2], match[3], match[4]].filter((part) => part !== undefined && part !== "x" && part !== "*").map(Number);
  const lower = [parts[0], parts[1] ?? 0, parts[2] ?? 0];
  const upper = parts.length === 1 ? [parts[0] + 1, 0, 0] : parts.length === 2 ? [parts[0], parts[1] + 1, 0] : [parts[0], parts[1], parts[2] + 1];
  if (match[1] === "^" && parts[0] === 0) throw new TypeError(`不支持的 engines.node 写法 "${token}"（范围 "${range}"）`);
  return { lower, upper };
}

function comparatorHolds(token, version, range) {
  const match = RANGE_TOKEN.exec(token);
  if (!match) throw new TypeError(`不支持的 engines.node 写法 "${token}"（范围 "${range}"）`);
  const { lower, upper } = boundsOf(match, token, range);
  switch (match[1] ?? "=") {
    case ">=": return compareTuple(version, lower) >= 0;
    case ">": return compareTuple(version, upper) >= 0;
    case "<": return compareTuple(version, lower) < 0;
    case "<=": return compareTuple(version, upper) < 0;
    case "^": return compareTuple(version, lower) >= 0 && compareTuple(version, [lower[0] + 1, 0, 0]) < 0;
    default: return compareTuple(version, lower) >= 0 && compareTuple(version, upper) < 0;
  }
}

/** 只支持 >=、>、<=、<、=、^、主次版本通配与 ||；其它写法抛错，避免静默放行。 */
export function satisfiesNodeRange(range, version) {
  if (typeof range !== "string" || !range.trim()) throw new TypeError("engines.node 必须是非空字符串");
  return range.split("||").some((alternative) => {
    const tokens = alternative.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) throw new TypeError(`不支持的 engines.node 写法 "${range}"`);
    return tokens.every((token) => comparatorHolds(token, version, range));
  });
}

function nvmrcFloor(text) {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(text.trim());
  return match ? [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)] : null;
}

/** 三处声明必须一致：package.json 的 engines.node 是范围，.nvmrc 与 ci-setup 的运行器主版本都必须落在范围内。 */
export function checkNodeEngines(root) {
  const findings = [];
  const read = (relative) => (existsSync(path.join(root, relative)) ? readFileSync(path.join(root, relative), "utf8") : null);
  let range = null;
  const packageText = read("package.json");
  if (packageText === null) findings.push({ file: "package.json", detail: "缺少 package.json" });
  else {
    try { range = JSON.parse(packageText).engines?.node ?? null; } catch (error) { findings.push({ file: "package.json", detail: `无法解析: ${error.message}` }); }
    if (range === null && findings.length === 0) findings.push({ file: "package.json", detail: "未声明 engines.node" });
  }
  const declared = [];
  const nvmrcText = read(".nvmrc");
  if (nvmrcText === null) findings.push({ file: ".nvmrc", detail: "缺少 .nvmrc" });
  else {
    const floor = nvmrcFloor(nvmrcText);
    if (!floor) findings.push({ file: ".nvmrc", detail: `不支持的写法 "${nvmrcText.trim()}"，请写数字版本如 22` });
    else declared.push({ file: ".nvmrc", label: nvmrcText.trim(), version: floor });
  }
  const setupText = read("scripts/ci-setup");
  const setupMatch = setupText === null ? null : CI_SETUP_NODE.exec(setupText);
  if (!setupMatch) findings.push({ file: "scripts/ci-setup", detail: "未找到 YSS_CI_NODE_MAJOR 默认值，无法确认运行器 Node 主版本" });
  else declared.push({ file: "scripts/ci-setup", label: `YSS_CI_NODE_MAJOR ${setupMatch[1]}`, version: [Number(setupMatch[1]), 0, 0] });
  if (typeof range === "string") {
    for (const item of declared) {
      let ok;
      try { ok = satisfiesNodeRange(range, item.version); } catch (error) { findings.push({ file: "package.json", detail: error.message }); break; }
      if (!ok) findings.push({ file: item.file, detail: `package.json engines.node ("${range}") 与 ${item.file} (${item.label}) 不一致` });
    }
  }
  return { findings, range, declared };
}

function runNodeEnginesCheck(root) {
  const { findings, range, declared } = checkNodeEngines(root);
  const lines = findings.length > 0
    ? findings.map((finding) => `${finding.file}: ${finding.detail}`)
    : [`engines.node "${range}"；${declared.map((item) => `${item.file} ${item.label}`).join("；")}`];
  return { ok: findings.length === 0, lines };
}

// ---------------------------------------------------------------------------
// 选项与执行
// ---------------------------------------------------------------------------

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function realOrSelf(target) {
  let cursor = path.resolve(target);
  const rest = [];
  while (!existsSync(cursor)) {
    rest.unshift(path.basename(cursor));
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return path.join(realpathSync(cursor), ...rest);
}

function git(root, args) {
  return spawnSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

export function validateOptions({ root, mode, base, reportDir }) {
  if (!MODES.includes(mode)) throw new TypeError("必须用 --mode pr 或 --mode push 指定模式");
  if (mode === "pr") {
    if (!base) throw new TypeError("PR 模式需要 --base <目标分支的完整提交 SHA>");
    if (!FULL_SHA.test(base)) throw new TypeError("--base 必须是 40 位小写十六进制的完整提交 SHA，不接受分支名或缩写");
    if (git(root, ["cat-file", "-e", `${base}^{commit}`]).status !== 0) {
      throw new TypeError(`本地找不到 base 提交 ${base}；CI 检出需包含目标分支历史（GitHub 用 fetch-depth: 0，GitLab 设 GIT_DEPTH: 0）`);
    }
  } else if (base) {
    throw new TypeError("--base 只用于 PR 模式");
  }
  if (reportDir !== undefined) {
    if (!path.isAbsolute(reportDir)) throw new TypeError("--report-dir 必须是绝对路径");
    if (isInside(realOrSelf(root), realOrSelf(reportDir))) throw new TypeError("--report-dir 必须在仓库外，仓内不得新增文件");
    if (existsSync(reportDir) && readdirSync(reportDir).length > 0) throw new TypeError("--report-dir 必须是新目录或空目录，避免混入旧报告");
  }
}

function defaultReportDir(root, mode) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return resolveMaintenanceOutput(`maintenance:ci-gate/${mode}-${stamp}-${process.pid}`, { root });
}

function worktreeState(root) {
  const result = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (result.status !== 0) throw new TypeError(`无法读取 git 状态: ${result.stderr.trim()}`);
  return new Set(result.stdout.split("\n").filter(Boolean));
}

function runCommand({ root, command, logPath, env, stdout, stderr }) {
  return new Promise((resolve) => {
    const log = createWriteStream(logPath);
    const done = (code, extra) => {
      if (extra) log.write(extra);
      log.end(() => resolve(code));
    };
    const child = spawn(path.join(root, command[0]), command.slice(1), { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => { log.write(chunk); stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { log.write(chunk); stderr.write(chunk); });
    child.on("error", (error) => {
      stderr.write(`${error.message}\n`);
      done(127, `${error.message}\n`);
    });
    child.on("close", (code, signal) => done(code ?? (signal ? 128 : 1)));
  });
}

function seconds(ms) { return `${(ms / 1000).toFixed(1)}s`; }

/** 依次执行 STEPS，记录命令、退出码、耗时与日志路径，并保证仓内没有新增改动。 */
export async function runGate({ root, mode, base, reportDir, steps: allSteps = STEPS, env = process.env, stdout = process.stdout, stderr = process.stderr }) {
  validateOptions({ root, mode, base, reportDir });
  const steps = allSteps.filter((step) => !step.modes || step.modes.includes(mode));
  const directory = reportDir ?? defaultReportDir(root, mode);
  mkdirSync(directory, { recursive: true });
  const head = git(root, ["rev-parse", "HEAD"]).stdout.trim();
  const parent = git(root, ["rev-parse", "--verify", "--quiet", "HEAD^"]);
  const scopeBase = mode === "pr" ? base : (parent.status === 0 ? parent.stdout.trim() : null);
  const context = { root, mode, base, scopeBase, reportDir: directory };
  const report = { mode, base: base ?? null, scope_base: scopeBase, head, started_at: new Date().toISOString(), report_dir: directory, status: "running", duration_ms: null, steps: [] };
  const reportPath = path.join(directory, "report.json");
  const save = () => writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const before = worktreeState(root);
  const started = Date.now();
  let failed = false;

  for (const [index, step] of steps.entries()) {
    const label = `[${index + 1}/${steps.length + 1}] ${step.id}`;
    const command = step.run ? null : (typeof step.command === "function" ? step.command(context) : step.command);
    const shown = command ? command.join(" ") : "(内置检查)";
    const entry = { id: step.id, title: step.title, command: shown, status: "running", exit_code: null, duration_ms: null, log: path.join(directory, `${String(index + 1).padStart(2, "0")}-${step.id}.log`), fix: step.fix ?? null };
    report.steps.push(entry);
    if (step.heavy && failed) {
      Object.assign(entry, { status: "skipped", reason: SKIPPED_AFTER_FAILURE });
      writeFileSync(entry.log, `${SKIPPED_AFTER_FAILURE}\n`);
      stdout.write(`${label} 跳过 — ${step.title}（${SKIPPED_AFTER_FAILURE}）\n`);
      save();
      continue;
    }
    stdout.write(`${label} ${step.title} — ${shown}\n`);
    const stepStart = Date.now();
    if (step.run) {
      let outcome;
      try { outcome = step.run(context); } catch (error) { outcome = { ok: false, lines: [error.message] }; }
      writeFileSync(entry.log, `${outcome.lines.join("\n")}\n`);
      (outcome.ok ? stdout : stderr).write(`${outcome.lines.join("\n")}\n`);
      entry.exit_code = outcome.ok ? 0 : 1;
    } else {
      entry.exit_code = await runCommand({ root, command, logPath: entry.log, env, stdout, stderr });
    }
    entry.duration_ms = Date.now() - stepStart;
    const passed = entry.exit_code === 0;
    entry.status = passed ? "passed" : (step.blocking === false ? "failed-nonblocking" : "failed");
    if (entry.status === "failed") failed = true;
    stdout.write(`${passed ? "通过" : "失败"} ${step.id}（退出码 ${entry.exit_code}，${seconds(entry.duration_ms)}）\n`);
    if (!passed) {
      stderr.write(`  步骤: ${step.id} — ${step.title}\n  命令: ${shown}\n  日志: ${entry.log}\n${step.fix ? `  修复: ${step.fix}\n` : ""}`);
    }
    save();
  }

  const after = worktreeState(root);
  const added = [...after].filter((line) => !before.has(line));
  const removed = [...before].filter((line) => !after.has(line));
  const guard = { id: "repository-unchanged", title: "检查期间仓库无新增改动", command: "(内置检查)", status: "passed", exit_code: 0, duration_ms: 0, log: path.join(directory, `${String(steps.length + 1).padStart(2, "0")}-repository-unchanged.log`), fix: null };
  if (added.length > 0 || removed.length > 0) {
    guard.status = "failed";
    guard.exit_code = 1;
    guard.fix = "检查步骤只能读取仓库；把写入改到仓外报告目录";
    const lines = [...added.map((line) => `新增/变化: ${line}`), ...removed.map((line) => `消失: ${line}`)];
    writeFileSync(guard.log, `${lines.join("\n")}\n`);
    stderr.write(`失败 repository-unchanged\n  步骤: repository-unchanged — ${guard.title}\n${lines.map((line) => `  ${line}`).join("\n")}\n  日志: ${guard.log}\n  修复: ${guard.fix}\n`);
    failed = true;
  } else {
    writeFileSync(guard.log, "仓库状态与检查前一致\n");
  }
  report.steps.push(guard);

  report.duration_ms = Date.now() - started;
  report.status = failed ? "failed" : "passed";
  save();
  const names = report.steps.filter((entry) => entry.status === "failed").map((entry) => entry.id);
  stdout.write(failed
    ? `ci-gate 失败：${names.join("、")}（${seconds(report.duration_ms)}）；报告 ${reportPath}\n`
    : `ci-gate 通过：${report.steps.length} 步（${seconds(report.duration_ms)}）；报告 ${reportPath}\n`);
  return { status: report.status, exitCode: failed ? 1 : 0, report, reportPath };
}
