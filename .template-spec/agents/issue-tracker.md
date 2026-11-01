---
tracker:
  platform: github
  repository: ""
  root: .work
---

# Ticket tracker

新项目默认使用 GitHub；`repository` 留空表示目标尚未配置，远程操作前明确 `owner/repo`，不能把模板仓或登录默认仓当作目标。GitLab 是用户显式选择的次级平台，Local Markdown 仍可明确选择；`.work` 仅供已授权本地资料使用，不是自动发布回退。已有项目复用已确认的平台配置。

上方 frontmatter 是持久平台配置；当前请求未明确目标时沿用。用户当前明确的 URL、仓库或实例用于本次动作，与配置不同时说明差异即可，不重复确认、不改持久配置或扩大动作授权；多个候选确实无法消歧时才问。访问失败不回退到默认目标找同号条目，也不从 Git remote 静默切换平台。旧 lifecycle/business 版本字段可供历史材料解释，不作为普通工作或新写入的资格门槛。

- `local-markdown` 使用 `tracker.root`，新项目示例 `.work`；Spec 按授权保存规格、原型及说明，明确拆票时才保存业务票；地图按相应请求处理，保留已有 ID/目录。历史根只读诊断，冲突仅暂停受影响写入。
- `github` 明确 `repository: owner/repo`，企业实例需明确 host；`gitlab` 明确 HTTPS `host` 与完整 `project`。fork、多个 remote 或默认登录实例不能替代目标选择。
- 远程不可用时，当前对话可以继续分析；已授权保存草稿才写到约定 root，标明目标与未发布状态，不自动改投或写镜像。
- 正文、评论、标签分别完整读取；分页列表不足以证明全量状态。凭据不可用不表示条目不存在。
- 创建、更新、认领、标签、评论和关闭使用对应授权；只读分析不写入。超时先核实结果，不盲目重试创建；更新前复读并发变化，写后回读。

平台操作方法按需读取安装的 `setup-matt-pocock-skills` 包内 `issue-tracker-local.md`、`issue-tracker-github.md` 或 `issue-tracker-gitlab.md`；未安装时按当前连接器能力与 CLI 帮助执行，不虚构参数或下载前置。GitHub 命令明确 repo/API host；GitLab 列表使用经帮助核对的 `--output json`，API 明确实例和项目 ID。

Spec 的 to-tickets 只组织业务票，不增加完整交付条件；实现 Slice 由研发任务承接，不能由确认规格或准备交付自动触发。无需先新建集合 YAML、阶段记录或批准包。Wayfinder 的 claimed/resolved 描述决策工作，不等于实现交付。分诊分类见 [标签表](triage-labels.md)。旧镜像元数据保留；当前 yss CLI 未提供的 tracker/capabilities 命令不作为操作步骤。
