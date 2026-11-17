---
name: setup-matt-pocock-skills
description: Configure or update a repo's issue tracker, triage labels and business-document navigation when requested.
disable-model-invocation: true
---

# 工程技能配置

配置 tracker、标签与业务文档导航。已有合法配置及本次明确目标优先；完整新工程且已核实唯一代码托管项目时按该项目初始化 Issues，无工程目标且无偏好时才推荐 GitHub。普通分析不以运行 setup 为前置。

先读现有 `.template-spec/agents/issue-tracker.md`、相关 AGENTS 区块和标签表，复用用户已给的目标。核实过的唯一代码项目可以用于完整新工程的首次配置，fork、多个 remote 或 remote 变更均不自动决定或迁移已有 tracker。`.work/` 是新项目示例，已有项目沿用 `tracker.root`。历史根只读查找，不自动搬迁或覆盖。

缺少真实决定时读 [配置决定](references/configuration-decisions.md)，只问影响本次写入的缺口；目标、标签和位置已明确时直接处理。缺 CONTEXT 不阻断 tracker 配置，不为 setup 自动创建业务词汇或 ADR。

在当前请求授权范围内按 [配置写入](references/write-configuration.md) 更新受管区块，保留周围用户内容。只读检查返回建议；安装技能或配置 tracker 不等于授权创建远程条目、标签或评论。

配置文件仅保存项目选择与入口；按项目根读取 `.template-spec/agents/issue-tracker-operations.md` 获得共享操作方法，普通接票和研发不要求安装本技能。所选平台的配置与能力参考按需读取：[GitHub](issue-tracker-github.md)、[GitLab](issue-tracker-gitlab.md)、[Local Markdown](issue-tracker-local.md)。完成后说明实际修改和仍未配置的部分，不宣称仅凭文件存在就已验证远程访问。
