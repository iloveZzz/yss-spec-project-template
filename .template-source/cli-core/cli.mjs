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
    ["init", "attach", "sync", "update", "upgrade"].includes(options.command),
    "未知命令",
  );
  ensure(
    !(options.apply && options.dryRun),
    "--apply 与 --dry-run 不可同时使用",
  );
  ensure(
    !options.gitInit || options.command === "init",
    "--git-init 仅用于 init",
  );
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
  const wantsJson = argv.includes("--json");
  try {
    const opts = parse(argv);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json")),
    );
    if (opts.help) {
      process.stdout.write(
        `${pkg.name} init|attach|sync|update|upgrade\n--target-dir <目录> --project-name <名称> --business-domain <领域> --team-size <规模>\n--issue-tracker <local-markdown|github|gitlab> --git-init --no-example-docs\nattach/sync 默认只预览，写入必须 --apply；冲突显式 --apply --force。\n--dry-run --json --version\n`,
      );
      return;
    }
    if (opts.version) {
      process.stdout.write(pkg.version + "\n");
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
    const bundle = loadBundle(packageRoot),
      target = targetPath(opts.targetDir || process.cwd());
    ensure(
      target !== packageRoot &&
        !target.startsWith(packageRoot + path.sep) &&
        !packageRoot.startsWith(target + path.sep),
      "目标不得覆盖 CLI 安装目录",
    );
    const result = execute(bundle, target, opts);
    process.stdout.write(wantsJson ? json(result) : formatPlan(result));
  } catch (error) {
    if (wantsJson)
      process.stdout.write(
        json({
          schemaVersion: 1,
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
  if (result.backupPath) lines.push(`备份和恢复清单：${result.backupPath}`);
  if (result.message) lines.push(result.message);
  return lines.join("\n") + "\n";
}
