# YSS 源码与业务工程协作

YSS CLI 与模板源码默认在 GitHub 管理代码、Issue、PR 和发行。这两类源码仓库默认通过指向 GitHub 的 `origin` 拉取和推送。GitLab remote 保留为显式选择的次级入口，不自动推送镜像、创建 MR 或触发 Pipeline。

业务 Spec、Ticket 和 triage 使用目标工程的 [tracker 配置](issue-tracker.md)。沿用已有配置，用户明确提供的目标用于本次操作。完整新工程尚无 tracker 且已核实唯一 GitHub 或 GitLab 托管项目时，使用该项目的 Issues。Local Markdown 按用户明确选择配置。

GitHub 操作优先已连接工具，其次使用 `gh` 并明确 `--repo owner/repo`。只有当前目标是 GitLab 时使用对应连接器或 `glab`，先核对实际帮助和实例地址。不要调用已移除的 workflow 脚本或假定某个旧插件已安装。

查询和差异检查保持只读；提交、推送、创建或合并 PR/MR、发行和 CI 触发使用各自真实授权。写入前核对目标、分支和已有内容，写入后回读。访问失败时报告所选平台的问题，保留可审阅成果，不转到另一个平台发布同号条目。

GitLab 凭据只保存在用户选定的凭据存储中，不写进仓库、URL、日志或 Issue/MR。自托管实例使用 HTTPS 和明确受信 CA，不关闭 TLS 校验；不把 GitLab token 发送到 GitHub。权限或连接问题按实际帮助排查，不把认证失败当成项目不存在。
