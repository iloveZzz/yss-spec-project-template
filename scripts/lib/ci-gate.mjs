import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, lstatSync, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import {runCommand as runBoundedCommand} from './command-runner.mjs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createIntakeSnapshotObserver} from './read-only-intake.mjs';
import {verificationToolRequirements} from '../../.template-source/scripts/lib/verification-preflight.mjs';
import { resolveMaintenanceOutput } from "./maintenance-storage.mjs";

const MODES = ["pr", "push", "slow"];
const SLOW_VERIFICATION_TIMEOUT_MS = 1000 * 1000;
const FULL_SHA = /^[0-9a-f]{40}$/;
/** 重步骤在任一前置步骤失败时跳过：先把便宜的失败原因交给作者，不在已知失败的候选上空耗数分钟。 */
const SKIPPED_AFTER_FAILURE = "前置步骤失败，已跳过";

/**
 * ci-gate 的步骤列表。步骤增减在此维护，不改执行逻辑。
 * - command：相对仓库根的命令；重步骤用函数按模式生成。
 * - run：进程内检查，返回 { ok, lines }。
 * - fix：失败时打印的修复建议，优先写可直接运行的命令。
 * - modes：只在列出的模式下执行，缺省为 pr 与 push 都执行；slow 模式只执行显式声明 slow 的步骤。
 * - env：该步骤附加的环境变量。
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
    verification_check_id: "check.skill-projection-identity",
    title: "技能投影与 canonical 一致",
    command: ["scripts/sync-skills", "--check"],
    fix: "scripts/sync-skills",
  },
  {
    id: "skill-lock",
    verification_check_id: "check.skill-lock-current",
    title: "技能锁与分发内容一致",
    command: ["scripts/update-skill-lock", "--check"],
    fix: "scripts/update-skill-lock",
  },
  {
    id: "lifecycle-registry",
    verification_check_id: "check.9f66238a57e457bf",
    title: "生命周期注册表",
    command: ["scripts/verify-lifecycle-registry"],
    fix: "按日志修正 lifecycle-registry.yaml；派生产物过期时运行 scripts/generate-lifecycle-artifacts；缺 jsonschema 时运行 scripts/ci-setup",
  },
  {
    id: "skill-registry",
    verification_check_id: "check.022dccdddca70b70",
    title: "技能路由注册表",
    command: ["scripts/verify-skill-registry"],
    fix: "按日志修正 .template-spec/agents/yss-skill-registry.yaml",
  },
  {
    id: "doc-facts",
    title: "说明文档事实",
    command: ["scripts/verify-doc-facts"],
    fix: "改为链接权威资产，不在说明文档复述数量或 revision；引用路径不存在时修正路径，或在 scripts/lib/doc-facts-patterns.json 的 pathRefs.allow 登记原因",
  },
  {
    id: "context-budget",
    title: "Agent 上下文预算",
    command: ["scripts/harness-metrics", "--check-budget"],
    fix: "精简常驻入口、隐式技能描述或最大的 SKILL.md；确需上调时在 .template-source/process/context-budget.json 写明理由",
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
    id: "verify-slow",
    title: "慢检查（tier: slow，按需或定时）",
    heavy: true,
    modes: ["slow"],
    env: { YSS_VERIFY_SLOW: "only" },
    command: (context) => ["scripts/verify-template-fast", "--report-dir", path.join(context.reportDir, "verification-slow")],
    fix: "查看 verification-slow 报告中失败的慢检查；本地用 YSS_VERIFY_SLOW=only scripts/verify-template-fast 复现",
  },
];

export function ciVerificationCheckIds() {
  return STEPS.filter(step => step.verification_check_id).map(step => step.verification_check_id);
}

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
  if (!MODES.includes(mode)) throw new TypeError("必须用 --mode pr、--mode push 或 --mode slow 指定模式");
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

function snapshotChanges(before,after) {
  const changes=[];
  if(!isDeepStrictEqual(before.git,after.git))changes.push('Git HEAD/index');
  for(const ref of new Set([...Object.keys(before.files),...Object.keys(after.files)]))if(!isDeepStrictEqual(before.files[ref],after.files[ref]))changes.push(ref);
  return changes;
}
function preparationChanges(root,before,after,needs) {
  const prefix='.template-source/tooling/node/node_modules/';
  const ignored=git(root,['check-ignore','-q','--',prefix]).status===0;
  const tracked=git(root,['ls-files','-z','--',prefix]);
  const allow=needs.tooling&&ignored&&tracked.status===0&&!tracked.stdout;
  return snapshotChanges(before,after).filter(ref=>!allow||!ref.startsWith(prefix));
}
export function readCiSetupEnvironment(file) {
  if(!existsSync(file))return {};
  if(!lstatSync(file).isFile())throw new TypeError('setup 环境必须为普通文件');
  const allowed=new Set(['YSS_NATIVE_SOURCE_ROOT','YSS_NATIVE_BINARY','YSS_NATIVE_BINARY_SHA256','YSS_NATIVE_PIN_FILE','YSS_NATIVE_PIN_SHA256','YSS_VUE_TOOLCHAIN','YSS_PLUGIN_CANDIDATE_RECEIPT','YSS_PLUGIN_CANDIDATE_RECEIPT_SHA256']),values={};
  for(const line of readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean)){
    const at=line.indexOf('='),key=line.slice(0,at),value=line.slice(at+1);
    if(at<1||!allowed.has(key)||Object.hasOwn(values,key)||!value||value.includes('\0'))throw new TypeError('setup 环境含未知、重复或非法变量');
    if(key.endsWith('_SHA256')){
      if(!/^[a-f0-9]{64}$/.test(value))throw new TypeError('setup 二进制摘要无效');
    }else{
      if(!path.isAbsolute(value))throw new TypeError('setup 路径必须为绝对路径');
      const stat=lstatSync(value);
      if(['YSS_NATIVE_BINARY','YSS_NATIVE_PIN_FILE','YSS_PLUGIN_CANDIDATE_RECEIPT'].includes(key)?!stat.isFile():!stat.isDirectory())throw new TypeError('setup 路径类型无效');
    }
    values[key]=value;
  }
  const native=['YSS_NATIVE_SOURCE_ROOT','YSS_NATIVE_BINARY','YSS_NATIVE_BINARY_SHA256'];
  if(native.some(key=>Object.hasOwn(values,key))){
    if(native.some(key=>!values[key]))throw new TypeError('setup 原生环境缺字段');
    if(createHash('sha256').update(readFileSync(values.YSS_NATIVE_BINARY)).digest('hex')!==values.YSS_NATIVE_BINARY_SHA256)throw new TypeError('setup 二进制摘要不匹配');
  }
  if(values.YSS_NATIVE_PIN_FILE||values.YSS_NATIVE_PIN_SHA256){
    if(!values.YSS_NATIVE_PIN_FILE||!values.YSS_NATIVE_PIN_SHA256||createHash('sha256').update(readFileSync(values.YSS_NATIVE_PIN_FILE)).digest('hex')!==values.YSS_NATIVE_PIN_SHA256)throw new TypeError('setup 本批 pin 缺失或摘要不匹配');
  }
  if(values.YSS_PLUGIN_CANDIDATE_RECEIPT||values.YSS_PLUGIN_CANDIDATE_RECEIPT_SHA256){
    if(!values.YSS_PLUGIN_CANDIDATE_RECEIPT||!values.YSS_PLUGIN_CANDIDATE_RECEIPT_SHA256||createHash('sha256').update(readFileSync(values.YSS_PLUGIN_CANDIDATE_RECEIPT)).digest('hex')!==values.YSS_PLUGIN_CANDIDATE_RECEIPT_SHA256)throw new TypeError('setup 插件候选凭据缺失或摘要不匹配');
  }
  return values;
}

async function runCommand({ root, command, logPath, env, stdout, stderr, timeoutMs=0 }) {
  if(timeoutMs){
    const result=await runBoundedCommand(path.join(root,command[0]),command.slice(1),{cwd:root,env,timeoutMs,stdoutFile:logPath+'.stdout',stderrFile:logPath+'.stderr'});
    writeFileSync(logPath,result.stdout+result.stderr+(result.termination?`\n验证执行终止: ${result.termination}\n`:''));
    stdout.write(result.stdout);stderr.write(result.stderr);
    return {status:result.status,code:result.actual_exit_code,signal:result.actual_exit_signal,observed:result.actual_exit_code_observed,termination:result.termination};
  }
  return new Promise((resolve) => {
    const log = createWriteStream(logPath);
    let settled=false;
    const done = (result, extra) => {
      if(settled)return;settled=true;
      if (extra) log.write(extra);
      log.end(() => resolve(result));
    };
    const child = spawn(path.join(root, command[0]), command.slice(1), { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => { log.write(chunk); stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { log.write(chunk); stderr.write(chunk); });
    child.on("error", (error) => {
      stderr.write(`${error.message}\n`);
      done({status:127,code:null,signal:null,observed:false}, `${error.message}\n`);
    });
    child.on("close", (code, signal) => done({status:code??(signal?128:1),code,signal,observed:Number.isInteger(code)}));
  });
}

function seconds(ms) { return `${(ms / 1000).toFixed(1)}s`; }

/** 依次执行 STEPS，记录命令、退出码、耗时与日志路径，并保证仓内没有新增改动。 */
export async function runGate({ root, mode, base, reportDir, steps: allSteps = STEPS, prepareTools = false, verification = {}, env = process.env, stdout = process.stdout, stderr = process.stderr }) {
  root=realpathSync(root);
  validateOptions({ root, mode, base, reportDir });
  const {selectVerificationInputs,compileExpectedVerificationPlan,validateVerificationReport,verificationInputDigest}=verification;
  const steps = allSteps.filter((step) => !step.verification_check_id && (step.modes ?? ["pr", "push"]).includes(mode));
  const directory = reportDir ?? defaultReportDir(root, mode);
  mkdirSync(directory, { recursive: true });
  if(prepareTools){
    const index=steps.findIndex(step=>['verify-template','verify-slow'].includes(step.id));
    if(index>=0)steps.splice(index,0,{id:'prepare-tools',title:'按所选计划准备工具',heavy:true,env:steps[index].env,command:['scripts/ci-setup','--requirements-file',path.join(directory,'tool-requirements.json')],fix:'查看准备日志，修正所选工具的版本、pin 或 frozen lock'});
  }
  const head = git(root, ["rev-parse", "HEAD"]).stdout.trim();
  const parent = git(root, ["rev-parse", "--verify", "--quiet", "HEAD^"]);
  const scopeBase = mode === "pr" ? base : (parent.status === 0 ? parent.stdout.trim() : null);
  const context = { root, mode, base, scopeBase, reportDir: directory };
  const report = { mode, base: base ?? null, scope_base: scopeBase, head, started_at: new Date().toISOString(), report_dir: directory, status: "running", duration_ms: null, steps: [] };
  const reportPath = path.join(directory, "report.json");
  const save = () => writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const observer=createIntakeSnapshotObserver();
  const snapshot=()=>observer.snapshot(root,{excludeIgnoredToolState:true});
  const before=snapshot();let finalBaseline=before,environment={...env};
  const phaseViolations=[];
  let guardsObserved=false;
  const started = Date.now();
  let failed = false;

  for (const [index, step] of steps.entries()) {
    const label = `[${index + 1}/${steps.length + 1}] ${step.id}`;
    const command = step.run ? null : (typeof step.command === "function" ? step.command(context) : step.command);
    const shown = command ? command.join(" ") : "(内置检查)";
    const entry = { id: step.id, title: step.title, command: shown, status: "running", exit_code: null, duration_ms: null, log: path.join(directory, `${String(index + 1).padStart(2, "0")}-${step.id}.log`), fix: step.fix ?? null };
    report.steps.push(entry);
    if(step.heavy&&!guardsObserved){
      guardsObserved=true;
      const changes=snapshotChanges(before,snapshot());
      if(changes.length){phaseViolations.push(...changes);failed=true;stderr.write(`入口守卫修改了验证输入: ${changes.join(', ')}\n`);}
    }
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
      try { outcome = await step.run(context); } catch (error) { outcome = { ok: false, lines: [error.message] }; }
      writeFileSync(entry.log, `${outcome.lines.join("\n")}\n`);
      (outcome.ok ? stdout : stderr).write(`${outcome.lines.join("\n")}\n`);
      entry.exit_code = outcome.ok ? 0 : 1;
    } else {
      const stepEnvironment=step.env?{...environment,...step.env}:environment;
      const verification=['verify-template','verify-slow'].includes(step.id);
      try {
        if(step.id==='prepare-tools'){
          const verificationStep=steps.find(item=>['verify-template','verify-slow'].includes(item.id));
          const verificationCommand=verificationStep.command(context);
          const selected=await selectVerificationInputs(verificationCommand.slice(1),root,{environment:stepEnvironment});
          const needs=verificationToolRequirements(selected.plan,{reportValidation:true}),setupFile=path.join(directory,'setup.env'),input=snapshot();
          report.tool_requirements=needs;
          writeFileSync(command[2],JSON.stringify(needs)+'\n');
          const actual=await runCommand({root,command,logPath:entry.log,env:{...stepEnvironment,YSS_CI_ENV_FILE:setupFile},stdout,stderr});
          entry.exit_code=actual.status;entry.child_exit_code=actual.code;entry.child_exit=actual;
          const after=snapshot(),changes=preparationChanges(root,input,after,needs);
          if(changes.length){phaseViolations.push(...changes);throw new TypeError(`工具准备修改了验证输入: ${changes.join(', ')}`);}
          if(entry.exit_code!==0)throw new TypeError(`工具准备失败: exit=${entry.exit_code}`);
          const exported=readCiSetupEnvironment(setupFile),prepared={...stepEnvironment,...exported};
          const reselected=await selectVerificationInputs(verificationCommand.slice(1),root,{environment:prepared});
          if(!isDeepStrictEqual(selected.plan,reselected.plan)||!isDeepStrictEqual(needs,verificationToolRequirements(reselected.plan,{reportValidation:true})))throw new TypeError('工具准备后计划或需求变化');
          environment={...environment,...exported};finalBaseline=after;
        }else {
          if(verification){
              await selectVerificationInputs(command.slice(1),root,{environment:stepEnvironment});
          }
          const actual=await runCommand({ root, command, logPath: entry.log, env: stepEnvironment, stdout, stderr, timeoutMs:step.id==='verify-slow'?SLOW_VERIFICATION_TIMEOUT_MS:0 });
          entry.exit_code=actual.status;entry.child_exit_code=actual.code;entry.child_exit=actual;
          if(verification){
            const args=['--profile','fast',...command.slice(1)],reportDirectory=command[command.indexOf('--report-dir')+1];
            const expectedPlan=compileExpectedVerificationPlan({root,args,environment:stepEnvironment,reportDirectory});
            const reportFile=path.join(reportDirectory,'report.json');
            const verificationReport=JSON.parse(readFileSync(reportFile,'utf8'));
            validateVerificationReport(verificationReport,{root,expectedPlan,reportDirectory,expectedInvocation:{command:path.join(root,'scripts/run-template-verification'),args},currentInputDigest:verificationInputDigest(root),observedExitCode:entry.exit_code,requireRelease:false});
            report.verification={report_file:reportFile,guard_task_ids:mode==='slow'?[]:ciVerificationCheckIds().filter(id=>expectedPlan.commands.some(item=>item.id===id))};
          }
        }
      } catch(error){
        const message=`验证报告或计划拒绝: ${error.message}\n`;
        appendFileSync(entry.log,message);stderr.write(message);entry.error=error.message;entry.exit_code=entry.exit_code||1;
      }
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

  const changes=[...new Set([...phaseViolations,...snapshotChanges(finalBaseline,snapshot())])];
  const guard = { id: "repository-unchanged", title: "检查期间验证输入保持一致", command: "(内置检查)", status: "passed", exit_code: 0, duration_ms: 0, log: path.join(directory, `${String(steps.length + 1).padStart(2, "0")}-repository-unchanged.log`), fix: null };
  if(changes.length){
    guard.status='failed';guard.exit_code=1;guard.fix='检查步骤只能读取验证输入；准备阶段仅允许所选 tooling 的忽略安装产物';
    writeFileSync(guard.log,changes.join('\n')+'\n');stderr.write(`失败 repository-unchanged: ${changes.join(', ')}\n`);failed=true;
  }else writeFileSync(guard.log,'验证输入与本阶段基线一致\n');
  report.input_observation_metrics=observer.metrics;
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
