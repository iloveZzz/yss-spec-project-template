# 审查候选范围

按用户目标解析真实仓库与基线。明确给定 commit、分支、PR 或现有上下文能无歧义确定时直接采用；只有真实歧义才问。先确认引用可读、目标正确，不修改分支、暂存区或工作树来方便审查。

- **Committed**：分支/PR 审查使用实际 base 与 head；本地 head 为 HEAD 时，`git diff --no-ext-diff BASE...HEAD` 与 `git log BASE..HEAD --oneline` 表示相应范围。远程 PR 未检出时使用真实 PR head，不能混用本地 HEAD。
- **Worktree**：当前未提交改动通常以 HEAD 为基线；包含分支累计改动时用 `git merge-base BASE HEAD`。`git diff --no-ext-diff --binary --full-index MERGE_BASE` 覆盖当前已暂存/未暂存的受跟踪内容；用 `git diff --cached` 和 `git diff` 按需分辨暂存状态。
- 另用 `git ls-files -z --others --exclude-standard` 读取相关未跟踪文件，NUL 分隔路径。需要 diff 表示时使用 `git diff --no-index --no-ext-diff --binary --full-index -- /dev/null PATH`，退出 1 表示发现差异。不要用只看 HEAD 的方式遗漏新文件。

范围以当前任务为准；二进制、不可读内容和明确排除项说明限制，避免把无关日志/凭据纳入报告。大文件按相关内容读取，子模块作为独立仓库引用处理，不当普通目录递归修改。

在报告说明实际 base/head 或工作树时点、覆盖文件及限制即可，无需候选 manifest、冻结包或额外提交。空范围报告无可审内容；引用无效只暂停依赖它的判断。审查期间变化时重读受影响部分，不拿旧快照对新内容作结论。
