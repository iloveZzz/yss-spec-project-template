---
name: setup-matt-pocock-skills
description: Configure or update a repo's issue tracker, triage labels and business-document navigation when requested.
disable-model-invocation: true
---

# 工程技能配置

配置 tracker、标签与业务文档导航。新项目默认优先 GitHub，GitLab 作为显式选择的次级平台；已有合法配置及本次明确目标优先。普通分析不以运行 setup 为前置。

先读现有 `.template-spec/agents/issue-tracker.md`、相关 AGENTS 区块和标签表，复用用户已给的目标。Git remote 仅作代码托管背景；fork 或多个 remote 不决定 tracker。`.work/` 是新项目示例，已有项目沿用 `tracker.root`。历史根只读查找，不自动搬迁或覆盖。

缺少真实决定时读 [配置决定](references/configuration-decisions.md)，只问影响本次写入的缺口；目标、标签和位置已明确时直接处理。缺 CONTEXT 不阻断 tracker 配置，不为 setup 自动创建业务词汇或 ADR。

在当前请求授权范围内按 [配置写入](references/write-configuration.md) 更新受管区块，保留周围用户内容。只读检查返回建议；安装技能或配置 tracker 不等于授权创建远程条目、标签或评论。

操作方法按所选平台读取：[GitHub](issue-tracker-github.md)、[GitLab](issue-tracker-gitlab.md)、[Local Markdown](issue-tracker-local.md)。完成后说明实际修改和仍未配置的部分，不宣称仅凭文件存在就已验证远程访问。
