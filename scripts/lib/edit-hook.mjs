// 编辑即时校验：Claude Code PostToolUse 在写入单个文件后调用，只对该文件运行 `yss check`。
// 校验语义全部归 yss；本模块只选文件、转述结论。CLI 缺失或不支持 check 时静默放行，不以工具缺口阻断编辑。
import { spawnSync } from "node:child_process";
import path from "node:path";

export const SKIP_ENV = "YSS_EDIT_HOOK";
const TIMEOUT_MS = 20_000;
const PREVIEW = 5;
const ASSET = /\.(?:ya?ml|json)$/i;

/** 从 hook 输入取被写入的文件；返回项目根内的相对路径，不相关时返回 null。 */
export function editedFile(payload, root) {
  const file = payload?.tool_input?.file_path ?? payload?.tool_input?.path;
  if (typeof file !== "string" || !file || !ASSET.test(file)) return null;
  const relative = path.relative(root, path.resolve(root, file));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join("/");
}

function envelope(stdout) {
  try {
    const value = JSON.parse(stdout);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function findingLines(findings) {
  const lines = findings.slice(0, PREVIEW).map((f) => `- ${f.file}${f.pointer ? `#${f.pointer}` : ""} ${f.code}：${f.fix}${f.command ? `\n  复现：${f.command}` : ""}`);
  if (findings.length > PREVIEW) lines.push(`- …另有 ${findings.length - PREVIEW} 条，见 yss check --json`);
  return lines.join("\n");
}

/**
 * 返回 { exitCode, stdout, stderr }：
 * - 无关文件、跳过、CLI 不可用或不支持 check：0，无输出。
 * - 检查失败（CHECK_FAILED）：2，发现写 stderr，Claude Code 把它交给 agent 继续修复。
 * - 有未评估项（incomplete）：0，以 additionalContext 提示需要的上下文，不算通过也不阻断。
 */
export function runEditHook({ root, payload = {}, env = process.env, run = spawnSync }) {
  if (env[SKIP_ENV] === "off") return { exitCode: 0, stdout: "", stderr: "" };
  const file = editedFile(payload, root);
  if (!file) return { exitCode: 0, stdout: "", stderr: "" };
  const binary = env.YSS_BIN || "yss";
  const result = run(binary, ["check", file, "--root", root, "--json"], { cwd: root, encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) return { exitCode: 0, stdout: "", stderr: "" };
  const report = envelope(result.stdout ?? "");
  if (!report || report.command !== "check") return { exitCode: 0, stdout: "", stderr: "" }; // 旧 CLI 不认识 check
  const body = report.result ?? {};
  if (report.code === "CHECK_FAILED") {
    return { exitCode: 2, stdout: "", stderr: `yss check 未通过（${file}）：\n${findingLines(body.findings ?? [])}\n临时关闭：${SKIP_ENV}=off。\n` };
  }
  if (report.status === "ok" && body.status === "incomplete") {
    const pending = (body.items ?? []).filter((item) => item.status === "not-evaluated").map((item) => `${item.file}：${item.reason}${item.command ? `（补充上下文后运行 ${item.command}）` : ""}`);
    return { exitCode: 0, stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `yss check 未完成，以下资产未评估（不代表通过）：\n${pending.join("\n")}` } })}\n`, stderr: "" };
  }
  return { exitCode: 0, stdout: "", stderr: "" };
}
