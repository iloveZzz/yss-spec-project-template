---
name: git-commit-core
description: Internal shared commit safety and message contract consumed by frontend-commit and java-backend-commit.
disable-model-invocation: true
---

# 提交公共合同

仅供专项提交入口读取，不作为默认发现或自动提交入口。

1. 仓库 AGENTS、贡献指南、hooks、解析后的 commitlint 配置优先于通用规则；读取近期相关历史确认语言与 scope。
2. 同时检查 `git status --short --branch`、暂存与未暂存的完整 diff、未跟踪文件。只为实际且属于用户意图的单一逻辑变更生成消息；不明确的拆分先说明，不猜测修改暂存区。
3. 只有用户明确要求提交才暂存明确路径或安全 hunks 并执行 commit。禁止默认 `git add -A`、`git add .`、`git commit -a`、`--no-verify`，不自动 amend、rebase、push。保留既有暂存和无关工作。
4. 遇到密钥、私钥、令牌、真实环境凭据或意外大文件停止提交并只报告路径。manifest 与 lockfile 一起处理；排除缓存与未授权生成物。
5. 消息采用仓库 type/scope/语言；无配置时使用英文 type/scope、ASCII 冒号和中文行为摘要，header 默认不超过 72 字符。正文解释原因、兼容性和验证。只标记真实 BREAKING CHANGE，不编造工单或签署。fixup 仅限显式授权流程；revert 保留原 SHA。
6. 运行专项入口要求的最小充分检查。仓库实际采用 commitlint 时通过 stdin 校验完整消息且退出 0，否则执行已有 hook/贡献规范，不临时安装工具。
7. 提交前重新检查 `git diff --cached --check`、name-status 和完整暂存差异；正常执行 hooks，拒绝时修复，不绕过。hook 改文件后核对实际差异。
8. 提交后检查 `git show --stat --oneline --decorate HEAD` 和 `git status --short`，报告 hash、消息、验证和剩余工作。生成消息或审查任务不执行提交。
