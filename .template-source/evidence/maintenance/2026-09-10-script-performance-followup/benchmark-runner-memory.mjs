#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCommandToFiles } from "../../../../scripts/lib/template-verification-runner.mjs";

const mode = process.argv[2];
if (!new Set(["capture", "spool"]).has(mode)) throw new TypeError("用法: benchmark-runner-memory.mjs capture|spool");
const root = path.resolve(import.meta.dirname, "../../../..");
const bytes = Number(process.env.YSS_BENCH_BYTES || 32 * 1024 * 1024);
if (!Number.isSafeInteger(bytes) || bytes < 0) throw new TypeError("YSS_BENCH_BYTES 必须是非负安全整数");
const command = `${JSON.stringify(process.execPath)} -e "process.stdout.write('x'.repeat(${bytes}))"`;
const logRoot = mkdtempSync(path.join(os.tmpdir(), "yss-runner-memory-"));

function capture(sequence) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: root, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ sequence, code, stdout, stderr }));
  });
}

try {
  const started = performance.now();
  const results = await Promise.all(Array.from({ length: 4 }, (_, sequence) => mode === "capture"
    ? capture(sequence)
    : runCommandToFiles(command, { cwd: root, logRoot, sequence })));
  if (results.some((result) => result.code !== 0)) throw new TypeError("benchmark 子进程失败");
  process.stdout.write(`${JSON.stringify({ mode, bytes_per_command: bytes, duration_ms: Math.round(performance.now() - started), commands: results.length })}\n`);
} finally {
  rmSync(logRoot, { recursive: true, force: true });
}
