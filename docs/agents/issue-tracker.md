# Issue Tracker: GitLab / GitHub

> 中文说明：本文规定项目的 PRD、垂直切片 Issue 和 triage 结果必须支持 GitLab Issues 与 GitHub Issues。Agent 不得把 issue tracker 写死为 GitHub 或 GitLab；应按用户明确选择、当前仓库主远端和可用凭据决定发布平台。

## 平台选择规则

按以下优先级选择 issue tracker：

1. 用户明确指定平台时，使用用户指定的平台。
2. 用户未指定时，优先使用当前仓库主远端对应的平台。
3. 如果当前目录不是目标仓库，或远端同时存在 GitLab / GitHub 且无法判断主平台，先询问用户。
4. 如果目标平台凭据不可用，先生成本地 markdown 草案，并说明需要配置的 CLI / token，不要自动改发到另一平台。

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

Issue 是默认 triage surface。MR / PR 是否纳入 triage 取决于当前平台和用户请求：

- GitLab 项目：可按需读取 GitLab Issues、Merge Requests 和 Pipeline 状态。
- GitHub 项目：可按需读取 GitHub Issues、Pull Requests 和 Actions 状态。
- 用户只要求 issue triage 时，不主动扩展到 MR / PR。

## Publishing

当 skill 说 “publish to the issue tracker” 时：

1. 先按“平台选择规则”确定 GitLab 或 GitHub。
2. 在目标平台创建或更新 Issue。
3. 在本地对应文档中记录平台、URL / 编号和发布时间。
4. 若目标平台不可用，生成 `docs/requirements/issues/` 下的本地草案，并标注“待发布平台”。

当 skill 说 “fetch the relevant ticket” 时：

- GitLab：使用 `glab issue view <iid> --comments`。
- GitHub：使用 `gh issue view <number> --comments`。
