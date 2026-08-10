---
tracker:
  platform: local-markdown
  root: docs/.scratch
  legacy_roots:
    - .scratch
    - docs/requirements/tickets
  remote_mirror: false
---

# Ticket 追踪平台：Local Markdown / GitHub / GitLab

> 本文是项目 Ticket tracker 的单一事实来源。当前模板默认使用 `local-markdown`；GitHub / GitLab 只有在项目明确选择时才作为主 tracker。Git remote 是代码托管信息，不会自动覆盖显式 tracker 配置。

## 当前项目配置

| 字段 | 值 |
|---|---|
| `platform` | `local-markdown` |
| `root` | `docs/.scratch/` |
| `feature_layout` | 完整功能包 |
| `remote_mirror` | 可选，默认关闭 |
| `legacy_roots` | `.scratch/`、`docs/requirements/tickets/`（只读迁移来源） |

上方 front matter 是机器可读的持久化配置；表格用于人和 Agent 阅读。初始化或迁移到 GitHub / GitLab 时，必须同时更新两处，并保留迁移记录。

## 平台选择规则

按以下优先级确定 Ticket tracker：

1. 已写入本文件的项目配置优先；本模板默认配置为 `local-markdown`。
2. 初始化或迁移时用户明确选择 GitHub / GitLab，则更新本文件后使用所选平台。
3. Git remote 只用于代码托管、分支、PR / MR 和 CI；不能单独把 Ticket tracker 改成远程平台。
4. 多个持久化配置声明不同平台时返回 `conflict`，暂停并要求迁移，不覆盖任何配置。
5. 选定 GitHub / GitLab 但凭据或平台暂不可用时，先在 `docs/.scratch/<feature>/` 生成“待发布平台”草案；`parent-ticket.md` 保留目标平台、标记 `publication: pending` 和 `pending_publication_to`；不得自动改投另一远程平台。

## Local Markdown 主 tracker

Local 主 tracker 的完整功能包结构如下：

```text
docs/.scratch/<feature>/
├── map.md
├── discovery/
├── spec.md
├── spec-delta/
├── parent-ticket.md
├── design/
├── api/
├── architecture/
├── gates/
├── verification/
└── issues/01-<slug>.md
```

- `parent-ticket.md` 汇总 Spec、设计、契约、门禁、阻塞边和阶段证据。
- `issues/01-<slug>.md` 等文件是垂直切片或 Wayfinder 子 Ticket；不得把多个 Ticket 合并成一个文件。
- 每个 Ticket 在顶部附近使用 `Status:` 记录 Matt 五态之一：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。
- 评论和对话追加在 `## Comments` 下；状态变化必须保留原因、证据引用和下一步。
- Wayfinder 的临时子问题可以沿用 Matt 的 `Status: claimed/resolved` 工作状态；它不是交付 Ticket 的五态角色，进入正式切片前必须转换为上述五态之一。
- Local 主 tracker 不要求远程 Ticket 存在；`ready-for-agent` 仍必须满足生命周期门禁、阻塞边关闭、实现上下文和 Slice Implementation Contract 要求。
- GitHub / GitLab 可以作为显式开启的镜像，在功能包中记录 URL、编号和最近同步时间；镜像失败不改变 Local 主 tracker 的权威性。
- 根目录 `.scratch/` 与 `docs/requirements/tickets/` 是旧路径，只允许用于只读迁移检查；不再作为新 Ticket 或阶段证据的写入目录。
- 仅发现旧路径资产时，readiness 不得进入 `ready`，必须保留 `migration_ref` 并先完成迁移；新旧路径同时存在时返回 `conflict`，不得静默覆盖或合并。

## 生命周期状态同步

Spec、生命周期和交付任务状态必须同步到当前主 tracker：

- `local-markdown`：写入 `docs/.scratch/<feature>/`，本地文件即 Ticket 和阶段证据的权威载体。
- `github`：使用 GitHub Issues，并在本地功能包记录 URL / 编号和最近同步时间；平台不可用时保留 `tracker: github`、`publication: pending`、`pending_publication_to: github`。
- `gitlab`：使用 GitLab Issues，并在本地功能包记录 URL / IID 和最近同步时间；平台不可用时保留 `tracker: gitlab`、`publication: pending`、`pending_publication_to: gitlab`。

所有平台都保留相同的父 Ticket、垂直切片、阻塞关系、验收标准、测试 seam、人工审查点和 `ready-for-agent` 语义。平台差异只影响存储和操作方式，不改变生命周期阶段或门禁。

Git checkpoint 必须说明主 tracker、同步状态、验证命令、剩余风险和下一步。Local 主 tracker 的“已同步”表示本地功能包已更新；远程镜像只有明确启用时才需要同步。

## GitLab Issues

当平台为 GitLab 时，优先使用 `glab` 或项目快捷入口 `scripts/gitworks`。

常用命令：

- Create an issue: `glab issue create --title "..." --description "..."`
- Read an issue: `glab issue view <iid> --comments`
- List issues: `glab issue list --state opened`
- Comment on an issue: `glab issue note <iid> --message "..."`
- Apply labels: `glab issue update <iid> --label "ready-for-agent"`
- Close an issue: `glab issue close <iid>`

GitLab 相关配置和 MR / CI 工作流见 `docs/agents/gitlab-workflow-skills.md`。

## GitHub Issues

当平台为 GitHub 时，使用 `gh` CLI。

常用命令：

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

## Local Markdown 操作

- 创建或发布 Ticket：创建 `docs/.scratch/<feature>/`，按上述结构写入 `parent-ticket.md`、`spec.md` 或 `issues/NN-<slug>.md`。
- 读取 Ticket：优先读取用户提供的 `docs/.scratch/<feature>/` 或具体 Ticket 路径；如果引用旧路径，进入迁移检查，不把旧路径当作新写入目标。
- 更新状态：修改文件顶部的 `Status:`，并在 `## Comments` 追加原因和证据。
- Wayfinder map：使用 `docs/.scratch/<feature>/map.md`，子 Ticket 放在 `issues/`。

## Triage Surface

Ticket 是默认 triage surface。MR / PR 是否纳入 triage 取决于当前平台和用户请求：

- GitLab 项目：可按需读取 GitLab Issues、Merge Requests 和 Pipeline 状态。
- GitHub 项目：可按需读取 GitHub Issues、Pull Requests 和 Actions 状态。
- 用户只要求 issue triage 时，不主动扩展到 MR / PR。

## Publishing

当 skill 说 “publish to the issue tracker” 时：

1. 读取本文件的 `platform` 配置。
2. `local-markdown` 直接在 `docs/.scratch/<feature>/` 创建或更新 Ticket。
3. `github` / `gitlab` 在对应平台创建或更新 Ticket，并在本地功能包记录 URL / 编号和最近同步时间。
4. 选定远程平台不可用时，在 `docs/.scratch/<feature>/` 创建并标注“待发布平台”的草案；在 `parent-ticket.md` 写入 `publication: pending` 和 `pending_publication_to`，恢复后优先补同步。

当 skill 说 “fetch the relevant ticket” 时：

- Local Markdown：读取引用的 `docs/.scratch/<feature>/...` 文件；旧路径引用必须先经过迁移检查。
- GitLab：使用 `glab issue view <iid> --comments`。
- GitHub：使用 `gh issue view <number> --comments`。
