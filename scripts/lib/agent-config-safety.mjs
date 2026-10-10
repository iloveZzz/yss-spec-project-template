import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

/** 会关闭 Codex 沙箱或审批的配置值；只检查被 Git 追踪的项目级文件，用户级配置不在范围内。 */
export const RISKY_CODEX_SETTINGS = [
  { key: "sandbox_mode", value: "danger-full-access", pattern: /^\s*sandbox_mode\s*=\s*(["'])danger-full-access\1/ },
  { key: "approval_policy", value: "never", pattern: /^\s*approval_policy\s*=\s*(["'])never\1/ },
];

export function candidateCodexConfigs(root) {
  const candidates = [".codex/config.toml"];
  const submodules = path.join(root, "submodules");
  if (existsSync(submodules)) {
    for (const entry of readdirSync(submodules, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(`submodules/${entry.name}/.codex/config.toml`);
    }
  }
  return candidates.filter((relative) => existsSync(path.join(root, relative)));
}

export function isTracked(root, relative) {
  const absolute = path.join(root, relative);
  const result = spawnSync("git", ["-C", path.dirname(absolute), "ls-files", "--error-unmatch", "--", path.basename(absolute)], { encoding: "utf8" });
  return result.status === 0;
}

export function findRiskyCodexConfigs(root, { tracked = (relative) => isTracked(root, relative) } = {}) {
  const findings = [];
  for (const relative of candidateCodexConfigs(root)) {
    if (!tracked(relative)) continue;
    const lines = readFileSync(path.join(root, relative), "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const setting of RISKY_CODEX_SETTINGS) {
        if (setting.pattern.test(line)) findings.push({ file: relative, line: index + 1, key: setting.key, value: setting.value });
      }
    });
  }
  return findings;
}

export function formatFindings(findings) {
  const lines = findings.map((item) => `  ${item.file}:${item.line}  ${item.key} = "${item.value}"`);
  return [
    "发现被 Git 追踪的 Codex 配置关闭了沙箱或审批：",
    ...lines,
    "修复：从仓库删除该配置；本机需要的偏好放在用户级 ~/.codex/config.toml。工具权限确认不等于生命周期批准。",
  ].join("\n");
}
