import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, rmSync, writeFileSync } from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";

function killTree(child, signal) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, signal);
  } catch (error) { if (error.code !== "ESRCH") throw error; }
}

/** Bounded lifetime for external tools; stdout is never mixed with progress. */
export function runCommand(command, args, { cwd, env = process.env, timeoutMs = 0, signal, stdoutFile, stderrFile, secrets = [], progress = false } = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new TypeError("timeoutMs 必须是非负毫秒数");
  if (signal?.aborted) return Promise.resolve({ status: 1, stdout: "", stderr: "command cancelled", termination: "cancelled", duration_ms: 0 });
  return new Promise(resolve => {
    const started = performance.now();
    const argumentSecrets = args.flatMap(value => { try { const url = new URL(value); return url.password ? [url.password, decodeURIComponent(url.password)] : []; } catch { return []; } });
    const secretNames = new Map(Object.entries(env).filter(([key]) => /(?:PASSWORD|TOKEN|SECRET)$/.test(key) || key === "MAVEN_REPO_USERNAME").map(([key,value]) => [value,key]));
    const replacement = secret => secretNames.has(secret) ? `[REDACTED:${secretNames.get(secret)}]` : "[REDACTED]";
    const sensitive = [...secrets, ...argumentSecrets, ...secretNames.keys()].filter(value => typeof value === "string" && value.length > 0).sort((a, b) => b.length - a.length);
    const redact = text => sensitive.reduce((value, secret) => value.replaceAll(secret, replacement(secret)), text);
    if (progress) process.stderr.write(`[开始] ${redact(command + " " + args.join(" "))}\n`);
    for (const file of [stdoutFile, stderrFile]) if (file) writeFileSync(file, "");
    const child = spawn(command, args, { cwd, env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
    let termination = null, escalation, timer, errorMessage;
    const makeStream = file => {
      const decoder = new StringDecoder("utf8");
      let pending = "", captured = "";
      const emit = text => { captured += text; if (file) appendFileSync(file, text); };
      function consume(final = false) {
        let output = "", cursor = 0;
        while (cursor < pending.length) {
          const match = sensitive.find(secret => pending.startsWith(secret, cursor));
          if (match) { output += replacement(match); cursor += match.length; continue; }
          if (!final && sensitive.some(secret => secret.startsWith(pending.slice(cursor)))) break;
          output += pending[cursor++];
        }
        pending = pending.slice(cursor);
        emit(output);
      }
      return { write(bytes) { pending += decoder.write(bytes); consume(); }, end() { pending += decoder.end(); consume(true); return captured; } };
    };
    const stdout = makeStream(stdoutFile), stderr = makeStream(stderrFile);
    function cancel(reason) {
      if (termination) return;
      termination = reason;
      killTree(child, "SIGTERM");
      escalation = setTimeout(() => killTree(child, "SIGKILL"), 1000);
    }
    const abort = () => cancel("cancelled");
    const onInterrupt = () => cancel("cancelled");
    signal?.addEventListener("abort", abort, { once: true });
    process.on("SIGINT", onInterrupt); process.on("SIGTERM", onInterrupt);
    if (timeoutMs) timer = setTimeout(() => cancel("timeout"), timeoutMs);
    child.stdout.on("data", bytes => stdout.write(bytes));
    child.stderr.on("data", bytes => stderr.write(bytes));
    child.on("error", error => { errorMessage = redact(error.message); });
    child.on("close", (code, exitSignal) => {
      clearTimeout(timer); clearTimeout(escalation);
      // A group leader can exit before its descendants close redirected streams.
      if (termination) killTree(child, "SIGKILL");
      signal?.removeEventListener("abort", abort);
      process.off("SIGINT", onInterrupt); process.off("SIGTERM", onInterrupt);
      const duration_ms = performance.now() - started;
      const status = termination === "timeout" ? 124 : termination ? 1 : code ?? 1;
      if (progress) process.stderr.write(`[${status === 0 ? "完成" : "失败"}] ${command} (${Math.round(duration_ms)}ms, exit=${status}${termination ? `, ${termination}` : ""})\n`);
      resolve({ status, stdout: stdout.end(), stderr: stderr.end() + (errorMessage || ""), signal: exitSignal, termination, duration_ms });
    });
  });
}

// Synchronous API compatibility for existing generators/cache consumers. The worker
// owns the process group and streams logs; it never updates project metadata.
export function runCommandSync(command, args, options = {}) {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--worker"], {
    input: JSON.stringify({ command, args, options }), encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", "inherit"], env: options.env ?? process.env,
  });
  if (result.error || result.status !== 0) throw new TypeError(result.error?.message || "command worker failed");
  return JSON.parse(result.stdout);
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "--worker") {
  const parent = process.ppid;
  let input = "";
  for await (const bytes of process.stdin) input += bytes;
  const { command, args, options } = JSON.parse(input);
  const controller = new AbortController();
  const watchParent = setInterval(() => {
    if (process.ppid !== parent) controller.abort();
    else {
      try { process.kill(parent, 0); } catch (error) { if (error.code === "ESRCH") controller.abort(); }
    }
  }, 100);
  try {
    const result = await runCommand(command, args, { ...options, signal: controller.signal });
    if (result.status !== 0) {
      // Only caller-created temporary resources are supplied here. The worker
      // also owns this cleanup when a terminated synchronous caller cannot run finally.
      for (const directory of options.cleanupPathsOnFailure || []) rmSync(directory, { recursive: true, force: true });
    }
    if (process.ppid === parent) process.stdout.write(JSON.stringify(result));
  } finally { clearInterval(watchParent); }
}
