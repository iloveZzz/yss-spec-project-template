import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS, checkNodeEngines, runGate, satisfiesNodeRange, validateOptions } from "../scripts/lib/ci-gate.mjs";
import {loadVerificationProfiles} from '../scripts/lib/template-verification.mjs';
import { readYssCliPin } from "../.template-source/scripts/lib/yss-cli-pin.mjs";

import {selectVerificationInputs} from '../.template-source/scripts/lib/template-verification-worker.mjs';
import {compileExpectedVerificationPlan,validateVerificationReport} from '../.template-source/scripts/lib/verification-report-validator.mjs';
import {verificationInputDigest} from '../scripts/lib/verification-report.mjs';
const verification={selectVerificationInputs,compileExpectedVerificationPlan,validateVerificationReport,verificationInputDigest};
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CI_GATE = path.join(ROOT, "scripts/ci-gate");
const CI_SETUP = path.join(ROOT, "scripts/ci-setup");
const STUB = `#!/usr/bin/env bash
name="$(basename "$0")"
[ -n "\${STUB_LOG:-}" ] && echo "$name $*" >>"$STUB_LOG"
if [[ " \${STUB_FAIL:-} " == *" $name "* ]]; then echo "$name 失败输出" >&2; exit 1; fi
if [ "\${STUB_WRITE_FROM:-}" = "$name" ]; then echo x >"$STUB_WRITE"; fi
echo "$name ok"
`;
const SETUP_MARKER = `#!/usr/bin/env bash\nYSS_CI_NODE_MAJOR="\${YSS_CI_NODE_MAJOR:-24}"\n`;

function sink() {
  return { text: "", write(chunk) { this.text += chunk; return true; } };
}

function sh(cwd, ...args) {
  const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

/** 带桩脚本的最小仓库：每个 STEPS 命令都是只记录参数的 bash 桩，真实检查由各自的测试覆盖。 */
function fixture(t, { engines = ">=22", nvmrc = "22", write, commits = 2, tooling = false, trackedOutput = false, gitlink = false, scopedGuards = false } = {}) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "yss-ci-gate-")));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "repo");
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(root,"yss-project.yaml"),"schema_version: 1\nrepository_mode: template-source\n");
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({ name: "fixture", private: true, ...(engines ? { engines: { node: engines } } : {}) })}\n`);
  if (nvmrc !== null) fs.writeFileSync(path.join(root, ".nvmrc"), `${nvmrc}\n`);
  fs.writeFileSync(path.join(root, "scripts/ci-setup"), SETUP_MARKER+`
[ -n "\${STUB_LOG:-}" ] && echo "ci-setup $*" >> "$STUB_LOG"
if [ -n "\${SETUP_WAIT_RELEASE:-}" ]; then while [ ! -f "$SETUP_WAIT_RELEASE" ]; do sleep 0.01; done; fi
if [ -n "\${SETUP_FAIL:-}" ]; then exit 7; fi
if [ -n "\${SETUP_WRITE:-}" ]; then mkdir -p "$(dirname "$SETUP_WRITE")"; echo installed > "$SETUP_WRITE"; fi
if [ -n "\${SETUP_TOOLING_LOCK:-}" ]; then mkdir -p .template-source/tooling/node/node_modules/.pnpm; cp .template-source/tooling/node/pnpm-lock.yaml .template-source/tooling/node/node_modules/.pnpm/lock.yaml; fi
if [ -n "\${SETUP_CHMOD:-}" ]; then chmod +x "$SETUP_CHMOD"; fi
if [ -n "\${SETUP_STAGE:-}" ]; then git add "$SETUP_STAGE"; fi
if [ -n "\${SETUP_COMMIT:-}" ]; then git -c user.name=t -c user.email=t@example.invalid -c commit.gpgsign=false commit --allow-empty -qm mutate; fi
if [ -n "\${SETUP_SUBCOMMIT:-}" ]; then git -C vendor/nested -c user.name=t -c user.email=t@example.invalid -c commit.gpgsign=false commit --allow-empty -qm mutate; fi
if [ -n "\${SETUP_ENV:-}" ]; then printf '%s\\n' "$SETUP_ENV" > "$YSS_CI_ENV_FILE"; fi
`,{mode:0o755});
  const commands = new Set(["scripts/verify-template-candidate", "scripts/verify-template-fast"]);
  for (const step of STEPS) if (Array.isArray(step.command)) commands.add(step.command[0]);
  for (const command of commands) {
    fs.writeFileSync(path.join(root, command), STUB, { mode: 0o755 });
  }
  // Minimal policy keeps real selection, execution, logs and report validation,
  // while shell guards stand in for unrelated repository-wide guard contents.
  const original=loadVerificationProfiles(),ids=['check.skill-projection-identity','check.skill-lock-current','check.9f66238a57e457bf','check.022dccdddca70b70'];
  const checks=ids.map(id=>({...Object.values(original.groups).flatMap(g=>g.commands).find(x=>x.id===id),...original.profiles.fast.checks.find(x=>x.id===id),input_patterns:['README.md','docs/**'],resources:[],group:'guards'}));
  if(scopedGuards){
    for(const check of checks)check.input_patterns=['.agents/skills/**'];
    checks.push({...checks[0],id:'check.fixture-docs',run:'node -e "process.exit(0)"',input_patterns:['README.md','docs/**']});
  }
  const config={schema_version:1,groups:{guards:{commands:checks}},profiles:{fast:{checks},release:{}},routing:[{patterns:['README.md','docs/**'],groups:['guards']}],gates:[],syntax_files:[],required_files:[]};
  const fixtureEnv={};
  if(tooling){
    checks[0].resources=['pnpm-tooling'];
    const tools=path.join(root,'.template-source/tooling/node'),bin=path.join(directory,'bin');fs.mkdirSync(tools,{recursive:true});fs.mkdirSync(bin);
    fs.writeFileSync(path.join(tools,'package.json'),JSON.stringify({packageManager:'pnpm@10.15.0'}));fs.writeFileSync(path.join(tools,'pnpm-lock.yaml'),'lockfileVersion: 9\nimporters: {}\n');
    fs.writeFileSync(path.join(bin,'pnpm'),'#!/usr/bin/env bash\necho 10.15.0\n',{mode:0o755});Object.assign(fixtureEnv,{PATH:bin+path.delimiter+process.env.PATH,SETUP_TOOLING_LOCK:'1'});
  }
  fs.writeFileSync(path.join(root,'.gitignore'),'node_modules/\nignored-state/\n');
  if(trackedOutput){fs.mkdirSync(path.join(root,'.template-source/tooling/node/node_modules'),{recursive:true});fs.writeFileSync(path.join(root,'.template-source/tooling/node/node_modules/tracked'),'tracked');}
  fs.mkdirSync(path.join(root,'.template-source/process'),{recursive:true});fs.writeFileSync(path.join(root,'.template-source/process/template-verification-profiles.yaml'),JSON.stringify(config));
  fs.mkdirSync(path.join(root,'.template-source/scripts/lib'),{recursive:true});fs.copyFileSync(path.join(ROOT,'.template-source/scripts/lib/verification-preflight.mjs'),path.join(root,'.template-source/scripts/lib/verification-preflight.mjs'));
  const helper=path.join(directory,'fast.mjs');
  const url=ref=>JSON.stringify(path.join(ROOT,ref));
  fs.writeFileSync(helper,`
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {compileExpectedVerificationPlan} from ${url('.template-source/scripts/lib/verification-report-validator.mjs')};
import {compileTaskExecution} from ${url('.template-source/scripts/lib/verification-execution-plan.mjs')};
import {createVerificationReport,finalizeVerificationReport,saveVerificationReport,verificationInputDigest} from ${url('scripts/lib/verification-report.mjs')};
import {createHash} from 'node:crypto';
const root=process.cwd(),args=['--profile','fast',...process.argv.slice(2)],directory=args[args.indexOf('--report-dir')+1];
fs.appendFileSync(process.env.STUB_LOG,'verify-template-fast '+process.argv.slice(2).join(' ')+'\\n');
if(process.env.STUB_FAIL?.split(' ').includes('verify-template-fast'))process.exit(1);
if(process.env.STUB_WAIT_FAST){fs.writeFileSync(process.env.STUB_FAST_PID,String(process.pid));await new Promise(()=>setInterval(()=>{},1000));}
if(process.env.STUB_NO_REPORT)process.exit(0);
if(process.env.FAST_WRITE)fs.writeFileSync(process.env.FAST_WRITE,'mutated after preparation');
const plan=compileExpectedVerificationPlan({root,args,environment:process.env});fs.mkdirSync(directory,{recursive:true});
const report=createVerificationReport(plan,{root,inputDigest:verificationInputDigest(root),scope:plan.scope,concurrency:1,invocation:{command:path.join(root,'scripts/run-template-verification'),args}});
for(const [index,task] of plan.commands.entries()){
 const execution=compileTaskExecution(task,{root,reportDir:directory});
 const actual=execution?spawnSync(execution.file,execution.args,{cwd:root,env:{...process.env,...execution.environment},encoding:'utf8'}):spawnSync(task.command,{cwd:root,env:process.env,shell:true,encoding:'utf8'});
 const stdoutFile=path.join(directory,index+'.out'),stderrFile=path.join(directory,index+'.err');fs.writeFileSync(stdoutFile,actual.stdout||'');fs.writeFileSync(stderrFile,actual.stderr||'');
 report.results.push({...task,index,code:actual.status??1,actual_exit_code:actual.status,actual_exit_signal:actual.signal,actual_exit_code_observed:Number.isInteger(actual.status),...(execution?{actual_execution:execution}:{}),stdoutFile,stderrFile,log_digests:Object.fromEntries([['stdoutFile',stdoutFile],['stderrFile',stderrFile]].map(([key,file])=>[key,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))});
}
report.input_after_sha256=verificationInputDigest(root);report.input_drift=report.input_after_sha256!==report.input_sha256;
const code=report.results.some(x=>x.code!==0)||report.input_drift?1:0;report.final_exit={code,signal:null,observed:true};
finalizeVerificationReport(report,{status:code?'failed':'passed',wallMs:1,repositoryMode:'template-source'});if(process.env.STUB_TAMPER==='missing-guard'){report.plan.commands=report.plan.commands.filter(x=>x.id!=='check.skill-lock-current');report.results=report.results.filter(x=>x.id!=='check.skill-lock-current');}
if(process.env.STUB_TAMPER==='diagnostic')report.purpose='diagnostic';
if(process.env.STUB_TAMPER==='invocation')report.invocation.args=[];
if(process.env.STUB_TAMPER==='log')fs.unlinkSync(report.results[0].stdoutFile);
saveVerificationReport(directory,report);process.exitCode=code;
`);
  fs.writeFileSync(path.join(root,'scripts/verify-template-fast'),'#!/usr/bin/env node\nawait import('+JSON.stringify(helper)+');\n',{mode:0o755});
  if(gitlink){const child=path.join(root,'vendor/nested');fs.mkdirSync(child,{recursive:true});fs.writeFileSync(path.join(child,'file'),'child');sh(child,'init','-q');sh(child,'add','.');sh(child,'commit','-qm','nested');}
  sh(root, "init", "-q");
  sh(root, "add", "-A");
  if(trackedOutput)sh(root,'add','-f','.template-source/tooling/node/node_modules/tracked');
  sh(root, "commit", "-q", "-m", "fixture");
  const base = sh(root, "rev-parse", "HEAD");
  if (commits > 1) {
    fs.writeFileSync(path.join(root, "README.md"), "change\n");
    sh(root, "add", "-A");
    sh(root, "commit", "-q", "-m", "change");
  }
  if(write){fs.writeFileSync(path.join(root,write),'already dirty');}
  const reportDir = path.join(directory, "reports", "run");
  const stubLog = path.join(directory, "stub.log");
  return { root, base, reportDir, stubLog, directory, env:fixtureEnv, write: write ? path.join(root, write) : undefined };
}

async function gate(t, options = {}, env = {}) {
  const f = fixture(t, options.fixture);
  const out = sink();
  const err = sink();
  const result = await runGate({verification,
    root: f.root,
    mode: options.mode ?? "push",
    base: options.mode === "pr" ? f.base : undefined,
    reportDir: f.reportDir,
    steps: options.steps,
    prepareTools: options.prepareTools,
    env: { ...process.env, ...f.env, STUB_LOG: f.stubLog, ...(f.write ? { STUB_WRITE: f.write } : {}), ...env },
    stdout: out,
    stderr: err,
  });
  const calls = fs.existsSync(f.stubLog) ? fs.readFileSync(f.stubLog, "utf8").trim().split("\n") : [];
  return { ...f, ...result, out: out.text, err: err.text, calls };
}

test("步骤集中在一个数组里，按固定顺序执行合入检查", () => {
  assert.deepEqual(STEPS.map((step) => step.id), [
    "agent-config", "sync-skills", "skill-lock", "lifecycle-registry", "skill-registry", "doc-facts", "context-budget", "node-engines", "verify-template", "verify-slow",
  ]);
  assert.equal(new Set(STEPS.map((step) => step.id)).size, STEPS.length);
  assert.ok(STEPS.every((step) => step.title && (step.command || step.run)));
});

test("engines.node 范围：支持的写法按语义判断，不支持的写法直接拒绝", () => {
  const at = (range, version) => satisfiesNodeRange(range, version);
  assert.equal(at(">=22", [22, 0, 0]), true);
  assert.equal(at(">=22", [21, 9, 0]), false);
  assert.equal(at(">=22 <25", [24, 0, 0]), true);
  assert.equal(at(">=22 <25", [25, 0, 0]), false);
  assert.equal(at("22", [22, 3, 0]), true);
  assert.equal(at("22.x", [23, 0, 0]), false);
  assert.equal(at("^22.1.0", [22, 0, 0]), false);
  assert.equal(at("^22.1.0", [22, 5, 0]), true);
  assert.equal(at(">22", [22, 9, 0]), false);
  assert.equal(at(">22", [23, 0, 0]), true);
  assert.equal(at("<=22", [22, 9, 0]), true);
  assert.equal(at("20 || >=22", [21, 0, 0]), false);
  assert.equal(at("20 || >=22", [24, 0, 0]), true);
  for (const bad of ["lts/*", "~22.1", "", ">=22 - 24", "^0.3.0"]) {
    assert.throws(() => at(bad, [22, 0, 0]), TypeError, bad);
  }
});

test("三处 Node 版本声明一致时通过，并报告各自的取值", (t) => {
  const { root } = fixture(t);
  const result = checkNodeEngines(root);
  assert.deepEqual(result.findings, []);
  assert.equal(result.range, ">=22");
  assert.deepEqual(result.declared.map((item) => item.file), [".nvmrc", "scripts/ci-setup"]);
});

test("AC-012：engines.node 与 .nvmrc 不一致时同时指出两处", (t) => {
  const { root } = fixture(t, { engines: ">=24", nvmrc: "22" });
  const [finding, ...rest] = checkNodeEngines(root).findings;
  assert.equal(rest.length, 0);
  assert.equal(finding.file, ".nvmrc");
  assert.match(finding.detail, /engines\.node \(">=24"\)/);
  assert.match(finding.detail, /\.nvmrc \(22\)/);
});

test("运行器 Node 主版本超出 engines.node 时报告 scripts/ci-setup", (t) => {
  const { root } = fixture(t, { engines: ">=22 <24" });
  const findings = checkNodeEngines(root).findings;
  assert.deepEqual(findings.map((finding) => finding.file), ["scripts/ci-setup"]);
  assert.match(findings[0].detail, /YSS_CI_NODE_MAJOR 24/);
});

test("缺少声明或写法不受支持时失败而不是静默放行", (t) => {
  assert.match(checkNodeEngines(fixture(t, { engines: null }).root).findings[0].detail, /未声明 engines\.node/);
  assert.match(checkNodeEngines(fixture(t, { nvmrc: null }).root).findings[0].detail, /缺少 \.nvmrc/);
  assert.match(checkNodeEngines(fixture(t, { nvmrc: "lts/*" }).root).findings[0].detail, /不支持的写法/);
  assert.match(checkNodeEngines(fixture(t, { engines: "~22.1" }).root).findings[0].detail, /不支持的 engines\.node 写法/);
});

test("slow 模式只运行慢检查步骤，并以 YSS_VERIFY_SLOW=only 调用 fast", async (t) => {
  const run = await gate(t, { mode: "slow" });
  assert.equal(run.exitCode, 0, run.err);
  assert.deepEqual(run.report.steps.map((step) => step.id), ["verify-slow", "repository-unchanged"]);
  assert.equal(run.calls.length, 1);
  assert.match(run.calls[0], /^verify-template-fast --report-dir .*verification-slow$/);
  assert.deepEqual(STEPS.find((step) => step.id === "verify-slow").env, { YSS_VERIFY_SLOW: "only" });
});

test("AC-004：推送模式全部通过，报告在仓外，仓内没有新增文件", async (t) => {
  const run = await gate(t);
  assert.equal(run.exitCode, 0, run.err);
  assert.equal(run.report.status, "passed");
  assert.deepEqual(run.report.steps.map((step) => step.id), [...STEPS.filter((step) => !step.modes&&!step.verification_check_id).map((step) => step.id), "repository-unchanged"]);
  assert.ok(run.report.steps.every((step) => step.status === "passed" && step.exit_code === 0 && fs.existsSync(step.log)));
  assert.equal(run.reportPath, path.join(run.reportDir, "report.json"));
  assert.ok(path.relative(run.root, run.reportDir).startsWith(".."));
  assert.equal(sh(run.root, "status", "--porcelain", "--untracked-files=all"), "");
  assert.equal(run.report.head, sh(run.root, "rev-parse", "HEAD"));
  const parent = sh(run.root, "rev-parse", "HEAD^");
  assert.equal(run.report.scope_base, parent);
  assert.ok(run.calls.some((line) => line.startsWith("verify-template-fast ") && line.includes(`--base ${parent} --report-dir ${path.join(run.reportDir, "verification")}`)));
  assert.ok(!run.calls.some((line) => line.startsWith("verify-template-candidate")));
});

test("推送模式的 fast 以 HEAD^ 为范围基准，没有上一提交时不带 --base", async (t) => {
  const single = await gate(t, { fixture: { commits: 1 } });
  assert.equal(single.exitCode, 0, single.err);
  assert.equal(single.report.scope_base, null);
  const fast = single.calls.find((line) => line.startsWith("verify-template-fast "));
  assert.ok(fast && !fast.includes("--base"), fast);
});

test("PR 模式只执行 fast 阻断验证并传递完整 base SHA", async (t) => {
  const run = await gate(t, { mode: "pr" });
  assert.equal(run.exitCode, 0, run.err);
  assert.equal(run.report.base, run.base);
  assert.equal(run.report.scope_base, run.base);
  const fast = run.calls.filter((line) => line.startsWith("verify-template-fast "));
  assert.equal(fast.length, 1);
  assert.match(fast[0], new RegExp(`--base ${run.base} --report-dir ${path.join(run.reportDir, "verification").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  const candidate = run.calls.filter((line) => line.startsWith("verify-template-candidate "));
  assert.equal(candidate.length, 0);
  assert.ok(!run.report.steps.some((step) => step.id === "verify-candidate"));
});

test('无关文档仍拒绝坏锁，移交守卫只在 fast 执行一次',async t=>{
 const pass=await gate(t,{mode:'pr'});assert.equal(pass.exitCode,0,pass.err);
 for(const name of ['sync-skills','update-skill-lock','verify-lifecycle-registry','verify-skill-registry'])assert.equal(pass.calls.filter(x=>x.split(' ')[0]===name).length,1,name);
 assert.deepEqual(pass.report.verification.guard_task_ids,STEPS.filter(x=>x.verification_check_id).map(x=>x.verification_check_id));
 assert.equal(pass.report.steps.some(x=>x.verification_check_id||x.id==='skill-lock'),false);
 const bad=await gate(t,{mode:'pr'},{STUB_FAIL:'update-skill-lock'});assert.equal(bad.exitCode,1);
 const report=JSON.parse(fs.readFileSync(path.join(bad.reportDir,'verification/report.json')));assert.equal(report.results.find(x=>x.id==='check.skill-lock-current').actual_exit_code,1);
});

test('CI 四项前移守卫失败均不启动 fast',async t=>{
 for(const name of ['verify-agent-config','verify-doc-facts','harness-metrics']){const run=await gate(t,{mode:'pr',prepareTools:true},{STUB_FAIL:name});assert.equal(run.exitCode,1);assert.equal(run.calls.some(x=>x.startsWith('verify-template-fast ')||x.startsWith('ci-setup ')),false);}
 const run=await gate(t,{fixture:{engines:'>=24',nvmrc:'22'},prepareTools:true});assert.equal(run.exitCode,1);assert.equal(run.calls.some(x=>x.startsWith('verify-template-fast ')),false);
});

test('CI 子进程退出 0 但缺守卫报告仍拒绝',async t=>{
 const run=await gate(t,{}, {STUB_NO_REPORT:'1'});assert.equal(run.exitCode,1);assert.equal(run.report.steps.find(x=>x.id==='verify-template').child_exit_code,0);assert.match(run.err,/报告|report/);
});

test('CI 拒绝缺守卫、诊断、旧调用及坏日志报告',async t=>{
 for(const value of ['missing-guard','diagnostic','invocation','log']){const run=await gate(t,{}, {STUB_TAMPER:value});assert.equal(run.exitCode,1,value);assert.match(run.err,/报告|report/);}
});

test("文档事实失败阻断整体并保留真实报告与日志，后续 fast 不再执行", async (t) => {
  const run = await gate(t, { mode: "pr" }, { STUB_FAIL: "verify-doc-facts" });
  assert.equal(run.exitCode, 1);
  assert.equal(run.report.status, "failed");
  const observed = run.report.steps.find((step) => step.id === "doc-facts");
  assert.equal(observed.status, "failed");
  assert.equal(observed.exit_code, 1);
  assert.match(fs.readFileSync(observed.log, "utf8"), /verify-doc-facts 失败输出/);
  assert.equal(run.report.steps.find((step) => step.id === "verify-template").status, "skipped");
  assert.ok(!run.calls.some((line) => line.startsWith("verify-template-fast ")));
});

test("PR 模式 fast 失败时报告失败并保留退出码", async (t) => {
  const run = await gate(t, { mode: "pr" }, { STUB_FAIL: "verify-template-fast" });
  assert.equal(run.exitCode, 1);
  assert.equal(run.report.steps.find((step) => step.id === "verify-template").exit_code, 1);
  assert.equal(run.report.status, "failed");
  assert.ok(!run.calls.some((line) => line.startsWith("verify-template-candidate")));
});

test("非阻断步骤失败只记录，不改变退出码", async (t) => {
  const steps = [
    { id: "required", title: "必需", command: ["scripts/verify-doc-facts"] },
    { id: "observed", title: "观察", command: ["scripts/verify-skill-registry"], blocking: false, fix: "仅供观察" },
  ];
  const run = await gate(t, { steps }, { STUB_FAIL: "verify-skill-registry" });
  assert.equal(run.exitCode, 0);
  assert.equal(run.report.status, "passed");
  assert.equal(run.report.steps.find((step) => step.id === "observed").status, "failed-nonblocking");
});

test("检查步骤向仓内写文件时失败并指出文件", async (t) => {
  const run = await gate(t, { fixture: { write: "stray.txt" } }, { STUB_WRITE_FROM: "verify-doc-facts" });
  assert.equal(run.exitCode, 1);
  const guard = run.report.steps.at(-1);
  assert.equal(guard.id, "repository-unchanged");
  assert.equal(guard.status, "failed");
  assert.match(fs.readFileSync(guard.log, "utf8"), /stray\.txt/);
  assert.match(run.err, /repository-unchanged/);
});

test("缺失的命令记录为 127 而不是崩溃", async (t) => {
  const steps = [{ id: "missing", title: "缺失", command: ["scripts/does-not-exist"], fix: "补齐脚本" }];
  const run = await gate(t, { steps });
  assert.equal(run.exitCode, 1);
  assert.equal(run.report.steps[0].exit_code, 127);
});

test("选项校验：模式、base 与报告目录", (t) => {
  const f = fixture(t);
  const ok = { root: f.root, mode: "pr", base: f.base, reportDir: f.reportDir };
  assert.doesNotThrow(() => validateOptions(ok));
  assert.throws(() => validateOptions({ ...ok, mode: undefined }), /--mode/);
  assert.throws(() => validateOptions({ ...ok, base: undefined }), /需要 --base/);
  assert.throws(() => validateOptions({ ...ok, base: "main" }), /40 位/);
  assert.throws(() => validateOptions({ ...ok, base: f.base.slice(0, 12) }), /40 位/);
  assert.throws(() => validateOptions({ ...ok, base: "0".repeat(40) }), /找不到 base 提交/);
  assert.throws(() => validateOptions({ ...ok, mode: "push" }), /只用于 PR/);
  assert.throws(() => validateOptions({ ...ok, reportDir: "relative/dir" }), /绝对路径/);
  assert.throws(() => validateOptions({ ...ok, reportDir: path.join(f.root, "reports") }), /必须在仓库外/);
  fs.mkdirSync(f.reportDir, { recursive: true });
  fs.writeFileSync(path.join(f.reportDir, "old.json"), "{}");
  assert.throws(() => validateOptions(ok), /新目录或空目录/);
});

test("命令行：用法错误退出 2，帮助退出 0，仓库失败退出 1", (t) => {
  const f = fixture(t);
  const run = (...args) => spawnSync(CI_GATE, ["--root", f.root, ...args], { encoding: "utf8", env: { ...process.env, ...f.env, STUB_LOG: f.stubLog } });
  const noMode = run();
  assert.equal(noMode.status, 2);
  assert.match(noMode.stderr, /用法: scripts\/ci-gate/);
  assert.equal(run("--mode", "pr").status, 2);
  assert.equal(run("--mode", "push", "--bogus").status, 2);
  const help = run("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--mode pr --base/);
  const pass = run("--mode", "push", "--report-dir", f.reportDir);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /ci-gate 通过/);
  const failing = spawnSync(CI_GATE, ["--root", f.root, "--mode", "push", "--report-dir", `${f.reportDir}-2`], { encoding: "utf8", env: { ...process.env, STUB_FAIL: "verify-skill-registry" } });
  assert.equal(failing.status, 1);
});

test("ci-setup：dry-run 只打印计划，覆盖工具链、yss 构建、pnpm 与 Python", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const result = spawnSync(CI_SETUP, ["--dry-run", "--toolchain", "--yss-commit", sha], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(result.status, 0, result.stderr);
  for (const expected of [/Node 主版本必须是 24/, /repository-mode/, new RegExp(sha), /pnpm --dir \.template-source\/tooling\/node install --frozen-lockfile/, /jsonschema==4\.23\.0/, /环境准备完成/]) {
    assert.match(result.stdout, expected);
  }
  assert.doesNotMatch(result.stdout, /submodule update|sync-profile-skills/, "Profile 已并入根仓，CI 不再初始化子模块或物化技能");
  const shallow = spawnSync(CI_SETUP, ["--dry-run", "--toolchain"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.doesNotMatch(shallow.stdout, /submodules\/yss-cli/, "yss-cli 不再是 submodule");
  const minimal = spawnSync(CI_SETUP, ["--dry-run", "--no-python"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(minimal.status, 0, minimal.stderr);
  assert.doesNotMatch(minimal.stdout, /jsonschema|submodule update|yss-cli|sync-profile-skills/);
});

test("ci-setup：--print-versions 无 Node 也能打印 GITHUB_OUTPUT 版本，且不要求 CI 环境", (t) => {
  const noNodePath = fs.mkdtempSync(path.join(os.tmpdir(), "yss-ci-no-node-"));
  t.after(() => fs.rmSync(noNodePath, { recursive: true, force: true }));
  const result = spawnSync("/bin/bash", [CI_SETUP, "--print-versions"], { encoding: "utf8", env: { ...process.env, PATH: noNodePath, CI: "", YSS_CI_NODE_MAJOR: "", YSS_CI_PYTHON_MINOR: "" } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "node=24\npython=3.12\n");
  const overridden = spawnSync(CI_SETUP, ["--print-versions"], { encoding: "utf8", env: { ...process.env, CI: "", YSS_CI_NODE_MAJOR: "26", YSS_CI_PYTHON_MINOR: "3.13" } });
  assert.equal(overridden.stdout, "node=26\npython=3.13\n");
});

test("ci-setup：Python 必须恰为目标版本，缺失时的补装与 Go 的补装都写进 dry-run 计划", () => {
  const plan = spawnSync(CI_SETUP, ["--dry-run", "--toolchain"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /不是 3\.12 时，在 root 容器内经 uv==\d+\.\d+\.\d+ 补装/);
  assert.match(plan.stdout, /Go：版本取自 yss-cli 固定文件的 go_version/);
  assert.match(plan.stdout, /go\.dev 公布的 sha256/);
  const source = fs.readFileSync(CI_SETUP, "utf8");
  assert.doesNotMatch(source, /PYTHON_FLOOR/);
  assert.match(source, /sha256sum -c/);
});

// 真实 shell 与 Git checkout；候选构建在入口以 42 停止，只证明 bootstrap 路由，不生成发行资格。
function setupFixture(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "yss-ci-setup-")));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "template"), cli = path.join(directory, "cli"), bin = path.join(directory, "bin");
  const write = (base, ref, value, mode = 0o644) => {
    const target = path.join(base, ref);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value, { mode });
  };
  for (const ref of ["scripts/ci-setup", ".template-source/scripts/lib/yss-cli-pin.mjs", ".template-source/scripts/lib/verification-preflight.mjs"]) {
    write(root, ref, fs.readFileSync(path.join(ROOT, ref)), 0o755);
  }
  write(root, "scripts/repository-mode", "#!/usr/bin/env bash\necho template-source\n", 0o755);
  const pin = structuredClone(readYssCliPin(ROOT));
  write(cli, "go.mod", `module fixture\ngo ${pin.go_version}\n`);
  write(cli, "internal/bundle/assets/bundles.json.gz", "committed bundle bytes\n");
  write(cli, "tools/build-candidate.mjs", 'if (process.env.GOTOOLCHAIN !== "local") process.exit(44); console.error("candidate-entry-reached"); process.exit(42);\n');
  sh(cli, "init", "-q"); sh(cli, "add", "-A"); sh(cli, "commit", "-qm", "fixed bootstrap fixture");
  pin.commit = sh(cli, "rev-parse", "HEAD");
  write(root, ".template-source/distribution/yss-cli-pin.json", JSON.stringify(pin));
  write(bin, "id", "#!/usr/bin/env bash\necho 1000\n", 0o755); // Never provision the host, even when tests run as root.
  write(bin, "go", `#!/usr/bin/env bash
if [[ "$*" == "env GOVERSION" ]]; then echo "$TEST_GO_VERSION"; exit 0; fi
if [[ "$1" == run ]]; then echo regenerated > internal/bundle/assets/bundles.json.gz; exit 0; fi
exit 43
`, 0o755);
  fs.symlinkSync(process.execPath, path.join(bin, "node"));
  const readPin = spawnSync(path.join(bin, "node"), [path.join(root, ".template-source/scripts/lib/yss-cli-pin.mjs"), "commit"], { encoding: "utf8" });
  assert.equal(readPin.status, 0, readPin.stderr);
  assert.equal(readPin.stdout.trim(), pin.commit);
  return { root, cli, pin, directory, bin, run(version, extra = {}, args = ["--no-python", "--yss-commit", "pin"]) {
    const temp = fs.mkdtempSync(path.join(directory, "run-"));
    const result = spawnSync(path.join(root, "scripts/ci-setup"), args, {
      encoding: "utf8", env: { ...process.env, CI: "", YSS_CI_ALLOW_LOCAL: "1", YSS_CI_NODE_MAJOR: process.versions.node.split(".")[0],
        YSS_CI_GO_VERSION: "", GOTOOLCHAIN: "auto", YSS_CLI_REPOSITORY: cli, RUNNER_TEMP: temp,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`, TEST_GO_VERSION: `go${version}`, ...extra },
    });
    return { ...result, checkout: path.join(temp, `yss-cli-${pin.commit}`) };
  } };
}

test("ci-setup：构建前拒绝较新或较旧 Go，环境覆盖不能偏离 pin", (t) => {
  const f = setupFixture(t);
  const [major, minor, patch] = f.pin.go_version.split(".").map(Number);
  for (const version of [`${major}.${minor}.${patch + 1}`, `${major}.${minor - 1}.0`]) {
    const result = f.run(version);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /需要精确 Go/);
    assert.equal(fs.existsSync(result.checkout), false, "版本不符必须在 checkout 和构建前拒绝");
  }
  const overridden = f.run(f.pin.go_version, { YSS_CI_GO_VERSION: `${major}.${minor}.${patch + 1}` });
  assert.equal(overridden.status, 1, overridden.stderr);
  assert.match(overridden.stderr, /YSS_CI_GO_VERSION.*go_version/);
});

test("ci-setup：固定 Go 构建提交内资产，不在 bootstrap 重生成 Bundle", (t) => {
  const f = setupFixture(t), result = f.run(f.pin.go_version);
  assert.equal(result.status, 42, result.stderr); // Reached the real candidate command after all checkout/clean guards.
  assert.match(result.stderr, /candidate-entry-reached/);
  assert.equal(sh(result.checkout, "rev-parse", "HEAD"), f.pin.commit);
  assert.equal(sh(result.checkout, "status", "--porcelain"), "");
  assert.equal(fs.readFileSync(path.join(result.checkout, "internal/bundle/assets/bundles.json.gz"), "utf8"), "committed bundle bytes\n");
});

test("ci-setup：本机非 dry-run 拒绝执行，非法参数退出 2", () => {
  const local = spawnSync(CI_SETUP, [], { encoding: "utf8", env: { ...process.env, CI: "", YSS_CI_ALLOW_LOCAL: "" } });
  assert.equal(local.status, 2);
  assert.match(local.stderr, /只在 CI 环境运行/);
  assert.equal(spawnSync(CI_SETUP, ["--dry-run", "--yss-commit", "main"], { encoding: "utf8" }).status, 2);
  const pinned = spawnSync(CI_SETUP, ["--dry-run", "--yss-commit", "pin"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(pinned.status, 0, pinned.stderr);
  const pin = readYssCliPin(ROOT);
  assert.match(pinned.stdout, new RegExp(`从固定提交 ${pin.commit} 构建 yss`));
  const retired = spawnSync(CI_SETUP, ["--dry-run", "--yss-commit", "gitlink"], { encoding: "utf8", env: { ...process.env, CI: "" } });
  assert.equal(retired.status, 2, "gitlink 已取消，必须明确拒绝而不是静默回退");
  assert.match(retired.stderr, /已取消.*pin/);
  const source = fs.readFileSync(CI_SETUP, "utf8");
  assert.match(source, /构建出的 yss 与固定文件的摘要不符/, "固定提交构建后必须核对固定摘要");
  assert.equal(spawnSync(CI_SETUP, ["--bogus"], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync("bash", ["-n", CI_SETUP], { encoding: "utf8" }).status, 0);
});

test("仓库自身的 Node 版本声明三处一致", () => {
  assert.deepEqual(checkNodeEngines(ROOT).findings, []);
});


test('需求文件仅准备所选工具且拒绝非法结构、路径和混用',t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ci-setup-requirements-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const file=path.join(directory,'requirements.json'),none={schema_version:1,python:'none',go:false,native_cli:false,tooling:false,vue:false};
 const run=(value,args=[])=>{fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value));return spawnSync(CI_SETUP,['--dry-run','--requirements-file',file,...args],{encoding:'utf8',env:{...process.env,CI:''}});};
 const schema=run({...none,python:'jsonschema'});assert.equal(schema.status,0,schema.stderr);assert.match(schema.stdout,/jsonschema==4\.23\.0/);assert.doesNotMatch(schema.stdout,/构建 yss|pnpm|作者工具链|Go：/);
 const runtime=run({...none,python:'runtime'});assert.equal(runtime.status,0,runtime.stderr);assert.match(runtime.stdout,/Python/);assert.doesNotMatch(runtime.stdout,/pip install.*jsonschema/);
 const vue=run({...none,vue:true});assert.equal(vue.status,0,vue.stderr);assert.match(vue.stdout,/原型作者工具链/);assert.doesNotMatch(vue.stdout,/pnpm --dir \.template-source\/tooling\/node install|Go：/);
 const native=run({...none,native_cli:true});assert.equal(native.status,0,native.stderr);assert.match(native.stdout,/构建 yss/);assert.match(native.stdout,/Go：/);assert.doesNotMatch(native.stdout,/pnpm --dir \.template-source\/tooling\/node install/);
 for(const bad of ['{',{}, {...none,native_cli:'false'},{...none,unknown:'$(touch sentinel)'}])assert.notEqual(run(bad).status,0);
 for(const args of [['--no-python'],['--toolchain'],['--yss-commit','pin']])assert.notEqual(run(none,args).status,0);
 assert.notEqual(spawnSync(CI_SETUP,['--dry-run','--requirements-file','relative.json'],{encoding:'utf8'}).status,0);
 const f=setupFixture(t),input=path.join(f.directory,'native.json');fs.writeFileSync(input,JSON.stringify({...none,native_cli:true}));
 assert.equal(f.run(f.pin.go_version,{},['--requirements-file',input]).status,42);
 assert.match(f.run('0.0.1',{},['--requirements-file',input]).stderr,/需要精确 Go/);
});

test('准备只接受受控导出数据，shell 字符串不执行',async t=>{
 const f=fixture(t),sentinel=path.join(f.root,'sentinel'),vue=path.join(f.directory,'$(touch sentinel) `touch sentinel`');fs.mkdirSync(vue);
 const run=async(value)=>{const reportDir=path.join(f.directory,'export-'+Math.random());return runGate({verification,root:f.root,mode:'push',reportDir,prepareTools:true,env:{...process.env,...f.env,STUB_LOG:f.stubLog,SETUP_ENV:value},stdout:sink(),stderr:sink()});};
 const safe=await run('YSS_VUE_TOOLCHAIN='+vue);assert.equal(safe.exitCode,0,JSON.stringify(safe.report));assert.equal(fs.existsSync(sentinel),false);
 for(const value of ['EVIL=bad','YSS_VUE_TOOLCHAIN=relative','YSS_NATIVE_BINARY_SHA256=bad','YSS_VUE_TOOLCHAIN=/does-not-exist','YSS_VUE_TOOLCHAIN='+vue+'\nYSS_VUE_TOOLCHAIN='+vue]){const result=await run(value);assert.equal(result.exitCode,1,value);assert.equal(result.report.steps.find(x=>x.id==='verify-template').status,'skipped');}
 assert.equal(fs.existsSync(sentinel),false);
});

test('输入观察拒绝同一已有脏文件在守卫阶段再次变化',async t=>{
 const f=fixture(t,{write:'README.md'}),out=sink();
 const result=await runGate({verification,root:f.root,mode:'push',reportDir:f.reportDir,prepareTools:true,env:{...process.env,...f.env,STUB_LOG:f.stubLog,STUB_WRITE_FROM:'verify-doc-facts',STUB_WRITE:f.write},stdout:out,stderr:sink()});
 assert.equal(result.exitCode,1);assert.equal(fs.readFileSync(f.stubLog,'utf8').includes('ci-setup '),false);assert.equal(result.report.steps.at(-1).status,'failed');
});

test('输入观察仅在准备阶段允许忽略且未跟踪的 tooling 安装产物',async t=>{
 const execute=async({tooling=true,trackedOutput=false,gitlink=false,write='.template-source/tooling/node/node_modules/installed',after=false,extra={}}={})=>{
  const f=fixture(t,{tooling,trackedOutput,gitlink}),file=path.join(f.root,write),out=sink(),err=sink();
  const result=await runGate({verification,root:f.root,mode:'push',reportDir:f.reportDir,prepareTools:true,env:{...process.env,...f.env,STUB_LOG:f.stubLog,SETUP_WRITE:file,...after?{FAST_WRITE:file}:{},...Object.fromEntries(Object.entries(extra).map(([key,value])=>[key,value==='FILE'?file:value]))},stdout:out,stderr:err});
  return {...result,calls:fs.readFileSync(f.stubLog,'utf8'),err:err.text};
 };
 const good=await execute();assert.equal(good.exitCode,0,good.err);assert.equal(good.report.steps.filter(x=>x.id==='prepare-tools').length,1);assert.equal(good.calls.split('\n').filter(x=>x.startsWith('ci-setup ')).length,1);
 for(const options of [{tooling:false},{write:'README.md'},{write:'ignored-state/unrelated'},{trackedOutput:true},{after:true},{write:'README.md',extra:{SETUP_CHMOD:'FILE'}},{write:'README.md',extra:{SETUP_STAGE:'FILE'}},{extra:{SETUP_COMMIT:'1'}},{gitlink:true,extra:{SETUP_SUBCOMMIT:'1'}},{extra:{SETUP_FAIL:'1'}}]){const bad=await execute(options);assert.equal(bad.exitCode,1,JSON.stringify(options));if(!options.after)assert.equal(bad.calls.includes('verify-template-fast '),false,JSON.stringify(options));}
});


test('原始需求选择拒绝未知输入时不启动准备',async t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.root,'unmapped.asset'),'unknown');
 const result=await runGate({verification,root:f.root,mode:'push',reportDir:f.reportDir,prepareTools:true,env:{...process.env,STUB_LOG:f.stubLog},stdout:sink(),stderr:sink()});
 assert.equal(result.exitCode,1);assert.match(result.report.steps.find(x=>x.id==='prepare-tools').error,/UNKNOWN_VERIFICATION_PATH/);assert.equal(fs.readFileSync(f.stubLog,'utf8').includes('ci-setup '),false);
});


test('符号链接 root 接受同一真实成功报告',async t=>{
 const f=fixture(t),link=path.join(f.directory,'repo-link');fs.symlinkSync(f.root,link);
 const run=spawnSync(CI_GATE,['--root',link,'--mode','push','--report-dir',f.reportDir],{encoding:'utf8',env:{...process.env,STUB_LOG:f.stubLog}});
 assert.equal(run.status,0,run.stderr);const report=JSON.parse(fs.readFileSync(path.join(f.reportDir,'report.json')));assert.equal(report.steps.find(x=>x.id==='verify-template').child_exit_code,0);
});

test('slow 准备不消耗验证本身1000秒预算，超时保留实际退出', {timeout:10000},async t=>{
 const f=fixture(t),release=path.join(f.directory,'release-setup'),pidFile=path.join(f.directory,'fast-pid');
 const realSetTimeout=setTimeout;
 t.mock.timers.enable({apis:['setTimeout']});let finished=false,pid;
 t.after(()=>{if(pid)try{process.kill(pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}});
 const run=runGate({verification,root:f.root,mode:'slow',reportDir:f.reportDir,prepareTools:true,env:{...process.env,STUB_LOG:f.stubLog,SETUP_WAIT_RELEASE:release,STUB_WAIT_FAST:'1',STUB_FAST_PID:pidFile},stdout:sink(),stderr:sink()}).then(value=>{finished=true;return value;});
 const waitFor=async predicate=>{const end=Date.now()+2000;while(!predicate()&&Date.now()<end)await new Promise(setImmediate);assert.equal(predicate(),true);};
 await waitFor(()=>fs.existsSync(f.stubLog)&&fs.readFileSync(f.stubLog,'utf8').includes('ci-setup '));
 t.mock.timers.tick(1000000);await new Promise(setImmediate);assert.equal(finished,false,'准备阶段不使用测试计时器');
 fs.writeFileSync(release,'release');await waitFor(()=>fs.existsSync(pidFile));pid=Number(fs.readFileSync(pidFile,'utf8'));
 t.mock.timers.tick(999999);await new Promise(resolve=>realSetTimeout(resolve,50));assert.equal(finished,false,'验证在1000秒前不会超时，包括原300秒边界');
 t.mock.timers.tick(1);await waitFor(()=>finished);
 const result=await run,step=result.report.steps.find(x=>x.id==='verify-slow');
 assert.equal(result.exitCode,1);assert.equal(step.exit_code,124);assert.equal(step.child_exit.termination,'timeout');assert.ok(step.child_exit.signal||Number.isInteger(step.child_exit.code));
 assert.equal(result.report.tool_requirements.python,'jsonschema','外层报告消费始终需要 schema');
});

 test('普通 CI 按变更选择，不强制无关注册表和技能锁检查',async t=>{
 const run=await gate(t,{mode:'pr',fixture:{scopedGuards:true}});
 assert.equal(run.exitCode,0,run.err);
 for(const name of ['sync-skills','update-skill-lock','verify-lifecycle-registry','verify-skill-registry'])assert.equal(run.calls.filter(x=>x.split(' ')[0]===name).length,0,name);
 assert.deepEqual(run.report.verification.guard_task_ids,[]);
 });
