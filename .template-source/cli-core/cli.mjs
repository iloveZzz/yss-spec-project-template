import { createInterface } from "node:readline/promises";
import { doctor } from "./verification.mjs";
import { inspectState, recoveryPreview, recover } from "./transaction.mjs";
import { identity, recoveryIdentity } from "./identity.mjs";
import * as fs from "node:fs";
import path from "node:path";
import { loadBundle } from "./bundle.mjs";
import { update } from "./update.mjs";
import { execute } from "./engine.mjs";
import { ensure, targetPath, stat, write, json } from "./io.mjs";
export function parse(argv) {
  const args = [...argv],
    options = {
      command: "init",
      projectName: "",
      businessDomain: "未指定",
      teamSize: "未指定",
      issueTracker: "local-markdown",
      includeExampleDocs: true,
    };
  if (args[0] && !args[0].startsWith("-")) options.command = args.shift();
  const values = {
    "--target-dir": "targetDir",
    "--project-name": "projectName",
    "--business-domain": "businessDomain",
    "--team-size": "teamSize",
    "--issue-tracker": "issueTracker",
  };
  const flags = {
    "--plan": "plan",
    "--prune": "prune",
    "--apply": "apply",
    "--dry-run": "dryRun",
    "--force": "force",
    "--json": "json",
    "--git-init": "gitInit",
    "--help": "help",
    "-h": "help",
    "--version": "version",
    "-v": "version",
    "--include-example-docs": "includeExampleDocs",
  };
  while (args.length) {
    const flag = args.shift();
    if (values[flag]) {
      ensure(args.length && !args[0].startsWith("-"), `${flag} 缺少值`);
      options[values[flag]] = args.shift();
    } else if (flag === "--no-example-docs") options.includeExampleDocs = false;
    else if (flags[flag]) options[flags[flag]] = true;
    else throw new Error(`未知参数: ${flag}`);
  }
  ensure(
    ["init", "attach", "sync", "diff", "doctor", "recover", "update", "upgrade"].includes(options.command),
    "未知命令",
  );
  ensure(
    !(options.apply && (options.dryRun || options.plan)),
    "--apply 与 --dry-run 不可同时使用",
  );
  ensure(
    !options.gitInit || options.command === "init",
    "--git-init 仅用于 init",
  );
  const accepted = {
    init: ['projectName','businessDomain','teamSize','targetDir','issueTracker','gitInit','includeExampleDocs','dryRun'],
    attach: ['projectName','businessDomain','teamSize','targetDir','issueTracker','includeExampleDocs','dryRun','apply','force','plan'],
    sync: ['targetDir','dryRun','apply','force','plan','prune'],
    diff: ['targetDir','dryRun'], doctor: ['targetDir'], recover: ['targetDir','dryRun','apply'],
    update: ['dryRun','force'], upgrade: ['dryRun','force'],
  };
  if (!options.help && !options.version) for (const flag of argv.filter(x=>x.startsWith('-'))) {
    const key = flag === '--no-example-docs' ? 'includeExampleDocs' : values[flag] || flags[flag];
    ensure(['help','version','json'].includes(key) || accepted[options.command].includes(key), `${flag} 不适用于 ${options.command}`);
  }
  if (options.issueTracker === "local") options.issueTracker = "local-markdown";
  ensure(
    ["local-markdown", "github", "gitlab"].includes(options.issueTracker),
    "issue-tracker 必须为 local-markdown、github 或 gitlab",
  );
  for (const k of ["projectName", "businessDomain", "teamSize"])
    ensure(!/[\x00-\x1f\x7f]/.test(options[k]), `${k} 不允许控制字符`);
  return options;
}
export async function main(packageRoot, argv = process.argv.slice(2)) {
  packageRoot = path.resolve(packageRoot);
  const wantsJson = argv.includes("--json");
  try {
    const opts = parse(argv);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json")),
    );
    if (opts.help) {
      const help = `${pkg.name} init|attach|sync|diff|doctor|recover|update|upgrade\n--target-dir <目录> --project-name <名称> --business-domain <领域> --team-size <规模>\n--issue-tracker <local-markdown|github|gitlab> --git-init --no-example-docs\nattach/sync 默认只预览，写入必须 --apply；冲突显式 --apply --force。\n--plan --prune（仅 sync） --dry-run --json --version\ndoctor/diff/recover 默认只读；recover --apply 恢复未完成事务。init 只接受空目录。\n`;
      process.stdout.write(wantsJson ? json({schemaVersion:1,command:"help",status:"ok",help}) : help);
      return;
    }
    if (opts.version) {
      process.stdout.write(wantsJson ? json({schemaVersion:1,command:"version",status:"ok",packageName:pkg.name,cliVersion:pkg.version}) : pkg.version + "\n");
      return;
    }
    if (["update", "upgrade"].includes(opts.command)) {
      const result = update(packageRoot, pkg, opts);
      process.stdout.write(
        wantsJson
          ? json(result)
          : `${result.status}: ${result.currentVersion} → ${result.latestVersion}\n${result.advice}\n`,
      );
      return;
    }
    if (pkg.name === 'create-yss-harness-design' && opts.command === 'init') {
      const required = ['projectName','businessDomain','targetDir'];
      const missing = required.filter(k=>!opts[k] || opts[k]==='未指定');
      if (missing.length && process.stdin.isTTY && !wantsJson) {
        const rl=createInterface({input:process.stdin,output:process.stderr});
        try { for(const key of missing) opts[key]=(await rl.question(({projectName:'项目名称',businessDomain:'业务领域',targetDir:'目标目录'})[key]+': ')).trim(); }
        finally { rl.close(); }
      }
      ensure(required.every(k=>opts[k] && opts[k]!=='未指定'),'init 需要 --project-name、--business-domain 和 --target-dir');
      ensure(!required.some(k=>/[\x00-\x1f\x7f]/.test(opts[k])),'初始化参数含控制字符');
    }
    const bundle = loadBundle(packageRoot),
      target = targetPath(opts.targetDir || process.cwd());
    ensure(
      target !== packageRoot &&
        !target.startsWith(packageRoot + path.sep) &&
        !packageRoot.startsWith(target + path.sep),
      "目标不得覆盖 CLI 安装目录",
    );
    let result;
    if (opts.command === 'doctor') result = doctor(bundle,target);
    else if (opts.command === 'recover') {
      ensure(stat(target)?.isDirectory(),'恢复目标不存在','PATH');
      const state=inspectState(target,bundle.family);
      if (!state.pending.length) { identity(target,bundle,'recover');result={schemaVersion:1,command:'recover',status:'preview',target,transactions:[],message:'没有未完成事务'}; }
      else {
        const validate=()=>recoveryIdentity(target,bundle,state);
        result=opts.apply ? recover(target,bundle.family,state,validate) : recoveryPreview(target,bundle.family,state,validate);
        result.command='recover';
      }
    } else result = execute(bundle, target, opts);
    if (result.status === 'error') process.exitCode=1;
    process.stdout.write(wantsJson ? json(result) : formatPlan(result));
  } catch (error) {
    if (wantsJson)
      process.stdout.write(
        json({
          schemaVersion: 1,
          command: argv[0]?.startsWith("-") ? "init" : argv[0] || "init",
          ...error.result,
          status: "error",
          code: error.code || "INVALID",
          message: error.message,
        }),
      );
    if (error.result && !wantsJson)
      process.stdout.write(formatPlan(error.result));
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  }
}

function formatPlan(result) {
  const lines = [
    `${result.status}: ${result.target}`,
    `CLI ${result.cliVersion || "-"} / core ${result.coreVersion || "-"} / template ${result.templateCommit || "-"}`,
  ];
  for (const change of result.changes || [])
    lines.push(`${change.action.padEnd(10)} ${change.path}`);
  for (const check of result.checks || []) lines.push(`[${check.status}] ${check.name}: ${check.message || ''}`);
  for (const transaction of result.transactions || []) lines.push(`恢复事务 ${transaction.id || transaction}: ${transaction.backupPath || ''}`);
  if (result.advice) lines.push(result.advice);
  if (result.backupPath) lines.push(`备份和恢复清单：${result.backupPath}`);
  if (result.message) lines.push(result.message);
  return lines.join("\n") + "\n";
}
