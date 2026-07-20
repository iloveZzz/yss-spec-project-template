# Ticket 追踪平台：GitLab / GitHub

> 本文规定项目的 Spec、功能父 Ticket、垂直切片 Ticket 和 triage 结果必须支持 GitLab Issues 与 GitHub Issues。Agent 不得把 tracker 写死为 GitHub 或 GitLab；应按用户明确选择、当前仓库主远端和可用凭据决定发布平台。

## 平台选择规则

按以下优先级选择 Ticket tracker：

1. 用户明确指定平台时，使用用户指定的平台。
2. 用户未指定时，优先使用当前仓库主远端 `origin` 对应的平台。
3. 如果当前目录不是目标仓库，或远端同时存在 GitLab / GitHub 且无法判断主平台，先询问用户。
4. 如果目标平台凭据不可用，先生成本地 markdown 草案，并说明需要配置的 CLI / token，不要自动改发到另一平台。

## 规格流程状态同步

规格、生命周期和交付任务状态必须同步到当前选定 Ticket tracker。同步平台仍按“平台选择规则”确定：用户定 GitLab 就同步 GitLab，用户定 GitHub 就同步 GitHub；用户未指定时，以主远端对应平台为准。

必须同步的节点：

- Spec 初稿形成时创建或更新功能父 Ticket，并使用 `ready-for-human` 记录本地资产路径与待审查项。
- 需求冻结和 OpenAPI Freeze 完成后，在功能父 Ticket 汇总冻结证据，再创建垂直切片子 Ticket。
- 垂直切片进入实现前，必须在对应平台存在可追踪 Ticket；其范围、阻塞关系、验收标准、测试 seam 和人工审查点必须完整。只有解除阻塞且可直接执行的前沿切片可标记 `ready-for-agent`。
- 每个切片或生命周期阶段完成时，更新对应平台对象的评论、标签、状态或里程碑，说明完成范围、验证命令、fresh verification 结果、剩余风险和下一步。
- 阶段性议程、里程碑或 sprint planning 已存在时，将同一功能的父 Ticket 和垂直切片子 Ticket 归入同一议程，避免只在本地文档记录进度。
- 存在需要人工确认的风险时，必须在对应 Ticket 中写明范围、责任人、结论或待补齐事项。

同步证据要求：

1. 本地生命周期文档应记录目标平台、Ticket 编号 / URL、发布时间或最近同步时间。
2. Git checkpoint 报告应说明 Ticket 同步状态：已同步、暂缓同步或平台不可用。
3. 不得把“完成 / 可合并 / 可发布”只写在本地文件里；必须同步到目标平台，并附 fresh verification 证据或明确阻断项。
4. 若同步平台不可用，本地草案必须标记“待发布平台”，恢复后优先补同步。

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

## Triage Surface

Ticket 是默认 triage surface。MR / PR 是否纳入 triage 取决于当前平台和用户请求：

- GitLab 项目：可按需读取 GitLab Issues、Merge Requests 和 Pipeline 状态。
- GitHub 项目：可按需读取 GitHub Issues、Pull Requests 和 Actions 状态。
- 用户只要求 issue triage 时，不主动扩展到 MR / PR。

## Publishing

当 skill 说 “publish to the issue tracker” 时：

1. 先按“平台选择规则”确定 GitLab 或 GitHub。
2. 在目标平台创建或更新对应 Ticket 对象。
3. 在本地对应文档中记录平台、URL / 编号和发布时间。
4. 若目标平台不可用，生成 `docs/requirements/tickets/` 下的本地草案，并标注“待发布平台”。

当 skill 说 “fetch the relevant ticket” 时：

- GitLab：使用 `glab issue view <iid> --comments`。
- GitHub：使用 `gh issue view <number> --comments`。
