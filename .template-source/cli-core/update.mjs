import path from "node:path";
import { runCommandSync } from "./command-runner.mjs";
import { ensure, stat } from "./io.mjs";
function npm(args, cwd) {
  const r = runCommandSync("npm", args, { cwd, timeoutMs: 120000 });
  ensure(
    !r.error && r.status === 0,
    `npm ${args[0]} 失败: ${r.termination || r.error?.message || r.stderr}`,
    "UPDATE",
  );
  return r.stdout.trim();
}
function version(v) {
  ensure(/^\d+\.\d+\.\d+$/.test(v), `不支持的稳定版本号: ${v}`, "UPDATE");
  return v.split(".").map(Number);
}
export function update(packageRoot, pkg, opts) {
  packageRoot = path.resolve(packageRoot);
  const packageName = pkg.name;
  ensure(
    /^create-yss-harness-(backend|frontend)$/.test(packageName),
    "未知升级包名",
  );
  const latestVersion = npm(["view", packageName, "version"]).replace(
    /^"|"$/g,
    "",
  );
  const current = version(pkg.version),
    latest = version(latestVersion);
  let comparison = 0;
  for (let i = 0; i < 3; i++) {
    if (latest[i] !== current[i]) {
      comparison = latest[i] > current[i] ? 1 : -1;
      break;
    }
  }
  const result = {
    schemaVersion: 1,
    command: opts.command,
    packageName,
    currentVersion: pkg.version,
    latestVersion,
    status: "current",
    advice: `npx ${packageName}@latest --help`,
  };
  if (comparison < 0 || (comparison === 0 && !opts.force)) return result;
  let kind = "unknown",
    cwd,
    args;
  if (packageRoot.split(path.sep).includes("_npx")) kind = "npx";
  else if (stat(path.join(packageRoot, ".git"))) kind = "source";
  else {
    const prefix = path.resolve(npm(["prefix", "-g"]));
    if (
      [
        path.join(prefix, "lib", "node_modules", packageName),
        path.join(prefix, "node_modules", packageName),
      ].includes(packageRoot)
    ) {
      kind = "global";
      args = ["install", "-g", `${packageName}@latest`];
    } else if (
      path.basename(path.dirname(packageRoot)) === "node_modules" &&
      path.basename(packageRoot) === packageName
    ) {
      kind = "local";
      cwd = path.dirname(path.dirname(packageRoot));
      args = ["install", `${packageName}@latest`];
    }
  }
  result.installKind = kind;
  result.status = args ? (opts.dryRun ? "preview" : "updated") : "instructions";
  if (args) {
    result.commandLine = ["npm", ...args];
    result.cwd = cwd || null;
    if (!opts.dryRun) result.output = npm(args, cwd);
  }
  return result;
}
